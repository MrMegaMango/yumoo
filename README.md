# Yumoo

Yumoo is a mobile-first PWA food diary that turns your meals into a beautiful, illustrated calendar — one entry at a time.

## What is in this first scaffold

- Next.js App Router + TypeScript + Tailwind setup
- Mobile-first routes from the product brief
- Guest-mode diary storage backed by `localStorage`
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
- `/auth/callback` reserved auth redirect route

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `OPENAI_API_KEY` in `.env.local` (and in Vercel for deploys) to enable art generation.

## Current tradeoffs

- The app stores guest entries locally, including generated art images, so browser storage can fill up with heavy usage.
- Original photos should move to private Supabase Storage for production.
- Art generation sends a compressed copy of the meal photo through the app's server route to OpenAI.
- Google sign-in and email OTP are intentionally left as the next integration pass once Supabase env vars are available.
- Recap export is currently an SVG download, which is fast and private but not yet a richer image pipeline.

## Next build steps

1. Wire Supabase anonymous auth, Google OAuth, and email OTP.
2. Replace local image persistence with private object storage.
3. Add optimistic upload progress, better quota handling, and signed recap sharing.
4. Move generation jobs off the request path if you want retries and rate limits to survive reloads cleanly.
