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
- Exposes `entries`, `saveEntry()`, `deleteEntry()`, `retryArt()`, `clearAll()` via context
- Exposes account upgrade helpers that link the active anonymous user to Google or email without changing the synced `user_id`
- Watches for entries with `art.status === "queued"` and POSTs them to `/api/art/generate`
- Aborts in-flight art requests when an entry is edited, deleted, retried, or cleared
- Debounces remote diary upserts after local state changes

Every page consumes this context. There is no server-side page data fetching for diary entries; sync happens entirely from the client provider.

`lib/supabase-browser.ts` creates the browser Supabase client when `NEXT_PUBLIC_SUPABASE_URL` and either `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are present.

`lib/guest-diary-db.ts` handles:
- anonymous guest auth
- fetch/upsert for the `guest_diaries` table
- normalization of the remote store to the authenticated guest id

`/settings` is now a real upgrade surface:
- guest sessions can call `linkIdentity()` for Google
- guest sessions can call `updateUser({ email })` to attach an email identity
- `/auth/callback` waits for the redirected auth state, then returns to settings with a success flag

`/api/art/generate` (`app/api/art/generate/route.ts`) is the only server route currently in active use. It validates the request body and delegates to `lib/openai-art.ts`, which:
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
| `/auth/callback` | Handles Google/email auth redirects and sends users back to settings |

### Design Constraints

- Mobile-first: max-width `430px`, safe-area-inset respected
- Custom Tailwind palette: `cream`, `butter`, `peach`, `rose`, `moss`, `ink`, `cocoa`, `shell`
- Three Google Fonts: `Plus Jakarta Sans` (sans), `Fraunces` (display), `Nanum Myeongjo` (headline)
- `AppShell` (`components/app-shell.tsx`) handles header, FAB, and bottom nav — wrap new pages in it

### Planned (not yet implemented)

- Standalone sign-in / recovery UI for returning saved-account users on new devices
- Replace local cache + JSON diary blob with normalized DB rows + object storage; current browser storage use will grow quickly with generated art
- Move art generation off the request path if durable jobs / rate limiting / retries are needed
- Recap sharing (currently SVG download only)

## Environment Variables

```bash
OPENAI_API_KEY               # Required for illustrated art generation
NEXT_PUBLIC_SUPABASE_URL     # Required for anonymous guest sync
NEXT_PUBLIC_SUPABASE_ANON_KEY # Optional if you use the legacy key name
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY # Optional if your Vercel integration uses the newer key name
```

## Database

- The guest persistence table lives in `supabase/migrations/20260320_guest_diaries.sql`
- Current schema is intentionally simple: one `guest_diaries` row per authenticated guest user, with the full diary stored as JSONB
- RLS policies restrict reads and writes to `auth.uid() = user_id`
- Guest-to-user upgrades do not migrate rows; the same auth user id remains attached after Google/email is linked
