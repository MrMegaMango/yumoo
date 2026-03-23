# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run typecheck  # TypeScript type check (no test suite exists)
```

## Architecture

**Yumoo** is a mobile-first PWA food diary built with Next.js 15 App Router, React 19, TypeScript, and Tailwind CSS. It is still a **guest-mode first** app: the browser keeps a local cache under `localStorage` key `yumoo.v1`, and when Supabase env vars are present the app also signs the browser in anonymously and syncs one guest diary row to Postgres.

### Data Flow

`DiaryProvider` (`components/diary-provider.tsx`) is the single source of truth. It wraps the entire app and:
- Hydrates from `localStorage` on mount
- If Supabase is configured, signs in anonymously and merges local cache with the remote guest diary row
- When `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is present, requests an invisible Turnstile token before creating a brand-new anonymous guest
- Exposes `entries`, `saveEntry()`, `deleteEntry()`, `retryArt()`, `clearAll()` via context
- Exposes account upgrade helpers that link the active anonymous user to Google or email without changing the synced `user_id`
- Watches for entries with `art.status === "queued"` and POSTs them to `/api/art/generate`
- Aborts in-flight art requests when an entry is edited, deleted, retried, or cleared
- Debounces remote diary upserts after local state changes

Every page consumes this context. There is no server-side page data fetching for diary entries; sync happens entirely from the client provider.

`lib/supabase-browser.ts` creates the browser Supabase client when `NEXT_PUBLIC_SUPABASE_URL` and either `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are present.

`lib/guest-diary-db.ts` handles:
- anonymous guest auth
- fetch/upsert for the `diaries` table
- normalization of the remote store to the authenticated guest id

`lib/turnstile-browser.ts` loads Cloudflare Turnstile explicitly in the browser and exposes a hidden, execute-on-demand token flow for anonymous sign-in.

`/settings` is now a real upgrade surface:
- guest sessions can call `linkIdentity()` for Google
- guest sessions can call `updateUser({ email })`, then `verifyOtp({ type: "email_change" })` to attach an email identity with a 6-digit code
- `/auth/callback` waits for the redirected auth state for Google links (and still tolerates legacy email-link redirects), then returns to settings with a success flag

`/api/art/generate` (`app/api/art/generate/route.ts`) validates the request body and delegates to `lib/openai-art.ts`, which:
- verifies the attached Supabase session when an access token is present
- for authenticated users: atomically deducts one credit via `consume_art_credit()` DB function (returns 402 at 0)
- for unauthenticated requests: enforces per-IP and per-entry in-memory quotas from `lib/art-abuse.ts`
- Uses the official `openai` SDK
- Converts the stored meal `photoDataUrl` into a `File`
- Calls `images.edit` with `gpt-image-1-mini`
- Returns generated art as a base64 data URL that gets written back into the local entry

### Entry Lifecycle

1. User submits `entry-form.tsx` → photo compressed client-side via `lib/image.ts` (max 1600px, JPEG 0.84) → stored as base64 data URL
2. If Supabase is configured, the browser anonymously authenticates and merges cached entries with the remote guest diary row
3. Entry saved with `art.status: "queued"`, a deterministic fallback palette from `lib/art.ts`, and a `jobId`
4. `DiaryProvider` sends the entry photo plus mood/tag/caption context to `/api/art/generate`
5. The server route asks OpenAI to restyle the image into illustrated food art
6. Success writes `art.imageDataUrl`, `provider`, `model`, and metadata back into the entry with `status: "ready"`
7. The updated diary store is written back to `localStorage` and, when enabled, upserted to Supabase
8. Failure writes `status: "failed"` plus an error string; users can retry from the entry page

### Key Types (`lib/types.ts`)

```typescript
MealEntry {
  id, userId, caption, mood?, mealType?, takenAt, localDate, photoDataUrl,
  art: { jobId, status, palette, imageDataUrl?, provider?, model?, metadata?, error? }
}
```

### Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing/onboarding |
| `/calendar` | Main hub — scattered Polaroid tile gallery with month nav |
| `/entry/new` | Create meal entry |
| `/entry/[id]` | View/edit/delete entry |
| `/day/[localDate]` | All meals for a date |
| `/recap/[yearMonth]` | Monthly SVG poster — downloadable |
| `/settings` | Storage info, guest upgrade controls, clear data |
| `/auth/callback` | Handles Google auth redirects and sends users back to settings |

### Design Constraints

- Mobile-first: max-width `430px`, safe-area-inset respected
- Custom Tailwind palette: `cream`, `butter`, `peach`, `rose`, `moss`, `ink`, `cocoa`, `shell`
- Three Google Fonts: `Plus Jakarta Sans` (sans), `Fraunces` (display), `Nanum Myeongjo` (headline)
- `AppShell` (`components/app-shell.tsx`) handles header, FAB, and bottom nav — wrap new pages in it

### Planned (not yet implemented)

- Standalone sign-in / recovery UI for returning saved-account users on new devices
- Replace local cache + JSON diary blob with normalized DB rows + object storage; current browser storage use will grow quickly with generated art
- Move art generation off the request path if durable jobs / rate limiting / retries are needed
- Move in-memory art quotas to a shared backing store if strict serverless enforcement is required
- Recap sharing (currently SVG download only)

## Environment Variables

```bash
OPENAI_API_KEY               # Required for illustrated art generation
NEXT_PUBLIC_SUPABASE_URL     # Required for anonymous guest sync
NEXT_PUBLIC_SUPABASE_ANON_KEY # Optional if you use the legacy key name
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY # Optional if your Vercel integration uses the newer key name
NEXT_PUBLIC_TURNSTILE_SITE_KEY # Optional; enables invisible Turnstile before new guest creation
ART_MAX_REQUESTS_PER_IP_PER_HOUR # Optional app-side art burst limit
ART_MAX_REQUESTS_PER_USER_PER_DAY # Optional app-side daily art cap per diary
ART_MAX_REQUESTS_PER_ENTRY_PER_HOUR # Optional app-side retry cap per entry
ART_MAX_PHOTO_BYTES # Optional max accepted photo size after base64 encoding
ART_MAX_CAPTION_LENGTH # Optional max caption length for art generation
```

## Database

- Diary storage: `diaries` table (renamed from `guest_diaries` in `20260321_credits.sql`) — one JSONB row per auth user, shared by anonymous visitors and signed-in users alike
- Credit ledger: `user_credits` table — one row per auth user, `credits_remaining` integer (default 10), created lazily on first art generation
- Security hardening for stale anonymous-user cleanup lives in `supabase/migrations/20260320_guest_security_hardening.sql`
- RLS policies restrict reads and writes to `auth.uid() = user_id`
- `consume_art_credit(uuid)` is a `SECURITY DEFINER` function called via RPC from the art route; it verifies `auth.uid()` and atomically deducts one credit
- Guest-to-user upgrades do not migrate rows; the same auth user id remains attached after Google/email is linked, so credits carry over
- The Supabase "Change email address" template should use `{{ .Token }}` and copy that reads like "save your Yumoo diary" rather than a raw email-change notice
