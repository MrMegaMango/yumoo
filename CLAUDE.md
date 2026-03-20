# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run typecheck  # TypeScript type check (no test suite exists)
```

## Architecture

**Yumoo** is a mobile-first PWA food diary built with Next.js 15 App Router, React 19, TypeScript, and Tailwind CSS. It's currently a **guest-mode only** app — all data lives in `localStorage` under key `yumoo.v1`. No backend is wired up yet.

### Data Flow

`DiaryProvider` (`components/diary-provider.tsx`) is the single source of truth. It wraps the entire app and:
- Hydrates from `localStorage` on mount
- Exposes `entries`, `saveEntry()`, `deleteEntry()`, `retryArt()`, `clearAll()` via context
- Watches for entries with `art.status === "queued"` and simulates art generation after ~1.4s delay

Every page consumes this context — there is no server-side data fetching for diary entries.

### Entry Lifecycle

1. User submits `entry-form.tsx` → photo compressed client-side via `lib/image.ts` (max 1600px, JPEG 0.84) → stored as base64 data URL
2. Entry saved with `art.status: "queued"` and a deterministic palette from `lib/art.ts` (6 palettes, selected by entry ID hash)
3. `DiaryProvider` upgrades status to `"ready"` after delay (simulating an async art pipeline)

### Key Types (`lib/types.ts`)

```typescript
MealEntry { id, userId, caption, mood?, mealType?, takenAt, localDate, photoDataUrl, art: { status, palette, ... } }
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
| `/settings` | Storage info, auth placeholder, clear data |

### Design Constraints

- Mobile-first: max-width `430px`, safe-area-inset respected
- Custom Tailwind palette: `cream`, `butter`, `peach`, `rose`, `moss`, `ink`, `cocoa`, `shell`
- Three Google Fonts: `Plus Jakarta Sans` (sans), `Fraunces` (display), `Nanum Myeongjo` (headline)
- `AppShell` (`components/app-shell.tsx`) handles header, FAB, and bottom nav — wrap new pages in it

### Planned (not yet implemented)

- Supabase auth (anonymous → Google OAuth / email OTP) — env vars `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are expected
- Replace localStorage + data URLs with Supabase DB + object storage
- Real art generation pipeline
- Recap sharing (currently SVG download only)
