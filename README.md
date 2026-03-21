# Yumoo

Yumoo is a mobile-first PWA food diary that turns your meals into a beautiful, illustrated calendar — one entry at a time.

## What is in this first scaffold

- Next.js App Router + TypeScript + Tailwind setup
- Mobile-first routes from the product brief
- Guest diary sync backed by local cache plus optional Supabase persistence
- Photo upload with client-side compression
- OpenAI-backed image edit pipeline that turns saved meal photos into illustrated art
- Month calendar, day detail, entry edit/delete, recap export, and settings screens
- PWA manifest and a simple service worker

## Routes

- `/` landing and onboarding
- `/calendar` calendar-first home
- `/entry/new` add meal flow
- `/day/[localDate]` day detail
- `/entry/[id]` entry detail and edit
- `/recap/[yearMonth]` monthly recap preview/export
- `/settings` account and storage settings
- `/auth/callback` completes Google/email upgrade redirects and sends the user back to settings

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `OPENAI_API_KEY` in `.env.local` (and in Vercel for deploys) to enable art generation.

To enable persistent guest diaries with Supabase:

1. Set `NEXT_PUBLIC_SUPABASE_URL` and either `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
2. Enable anonymous sign-ins in Supabase Auth.
3. Add your local and deployed `/auth/callback` URLs to Supabase Auth redirect URLs.
4. If you want Google upgrades, enable the Google provider and manual linking in Supabase Auth.
5. Apply `supabase/migrations/20260320_guest_diaries.sql`.

## Current tradeoffs

- The app keeps a local browser cache even when Supabase sync is enabled, so heavy image usage can still grow storage quickly.
- Guest sync currently stores the whole diary as one JSON row, so simultaneous edits across multiple devices are last-write-wins.
- Original photos should move to private Supabase Storage for production.
- Art generation sends a compressed copy of the meal photo through the app's server route to OpenAI.
- Guest persistence depends on the Supabase anonymous session surviving in the browser; clearing site data will lose access to that guest diary.
- Settings can now upgrade the active anonymous guest into Google or email, but a separate sign-in screen for returning users is still not built.
- Recap export is currently an SVG download, which is fast and private but not yet a richer image pipeline.

## Next build steps

1. Replace local photo/art data URLs with private object storage while keeping the diary rows slim.
2. Normalize the diary schema from one JSON blob into entry rows if you want stronger multi-device conflict handling.
3. Add a standalone sign-in / account recovery flow for users returning on a new device or after clearing their session.
4. Add optimistic upload progress, better quota handling, and signed recap sharing.
