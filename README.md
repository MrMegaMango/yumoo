# Yumoo

Yumoo is a mobile-first PWA food diary that turns your meals into a beautiful, illustrated calendar — one entry at a time.

## What is in this first scaffold

- Next.js App Router + TypeScript + Tailwind setup
- Mobile-first routes from the product brief
- Guest-mode diary storage backed by `localStorage`
- Photo upload with client-side compression
- Async placeholder art pipeline that upgrades entries after save
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
npm run dev
```

## Current tradeoffs

- The app currently stores guest entries locally so the core loop works without backend setup.
- Original photos should move to private Supabase Storage for production.
- Google sign-in and email OTP are intentionally left as the next integration pass once Supabase env vars are available.
- Recap export is currently an SVG download, which is fast and private but not yet a richer image pipeline.

## Next build steps

1. Wire Supabase anonymous auth, Google OAuth, and email OTP.
2. Replace local image persistence with private object storage.
3. Add a real art job pipeline behind the existing async placeholder interface.
4. Add optimistic upload progress, retry states, and signed recap sharing.
