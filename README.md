# Yumoo

Yumoo is a mobile-first PWA food diary that turns your meals into a beautiful, illustrated calendar — one entry at a time.

## What is in this first scaffold

- Next.js App Router + TypeScript + Tailwind setup
- Mobile-first routes from the product brief
- Guest diary sync backed by local cache plus optional Supabase persistence
- Invisible Turnstile support for new guest creation when Supabase CAPTCHA is enabled
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
- `/auth/callback` completes Google upgrade redirects and sends the user back to settings

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `OPENAI_API_KEY` in `.env.local` (and in Vercel for deploys) to enable art generation.

To enable persistent guest diaries with Supabase:

1. Set `NEXT_PUBLIC_SUPABASE_URL` and either `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
2. Enable anonymous sign-ins and manual linking in Supabase Auth.
3. Add your local and deployed `/auth/callback` URLs to Supabase Auth redirect URLs for Google linking.
4. If you want Google upgrades, enable the Google provider.
5. Apply `supabase/migrations/20260320_guest_diaries.sql`.
6. Apply `supabase/migrations/20260320_guest_security_hardening.sql`.
7. Tune Supabase Auth rate limits in the dashboard for anonymous sign-ins and other auth endpoints.
8. If you want email-code upgrades, customize Supabase's "Change email address" template to show `{{ .Token }}` and copy that reads like "save your Yumoo diary" instead of the default change-email wording.

To enable low-friction bot protection for new guests:

1. Create a Cloudflare Turnstile widget and keep the Turnstile **secret** in Supabase Auth CAPTCHA settings.
2. Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in the app so the browser can request a token.
3. Leave the secret out of Vercel and the repo; Supabase verifies the token during anonymous sign-in.

To enable credit top-ups and tips with Stripe:

1. Set `STRIPE_SECRET_KEY` for the environment you are deploying.
2. Set `STRIPE_WEBHOOK_SECRET` after creating a Stripe webhook that points to `/api/stripe/webhook`.
3. Set `NEXT_PUBLIC_APP_URL` so Checkout can return to the correct `/settings` URL after success or cancel.
4. Either set `STRIPE_PRICE_10_CREDITS`, `STRIPE_PRICE_50_CREDITS`, and `STRIPE_PRICE_TIP`, or keep active Stripe products named `10 Yumoo Credits`, `50 Yumoo Credits`, and `tipping jar`.
5. If the `STRIPE_PRICE_*` IDs are missing or stale, the app falls back to the current active default price for those product names in the account behind `STRIPE_SECRET_KEY`.

To tighten app-side art quotas:

- `ART_MAX_REQUESTS_PER_IP_PER_HOUR` limits bursts from one connection.
- `ART_MAX_REQUESTS_PER_USER_PER_DAY` caps daily art generations for one diary.
- `ART_MAX_REQUESTS_PER_ENTRY_PER_HOUR` caps repeated retries on the same entry.
- `ART_MAX_PHOTO_BYTES` rejects oversized base64 uploads before they hit OpenAI.
- `ART_MAX_CAPTION_LENGTH` bounds prompt text length.

## Current tradeoffs

- The app keeps a local browser cache even when Supabase sync is enabled, so heavy image usage can still grow storage quickly.
- Guest sync currently stores the whole diary as one JSON row, so simultaneous edits across multiple devices are last-write-wins.
- Original photos should move to private Supabase Storage for production.
- Art generation sends a compressed copy of the meal photo through the app's server route to OpenAI.
- Guest persistence depends on the Supabase anonymous session surviving in the browser; clearing site data will lose access to that guest diary.
- Settings can now upgrade the active anonymous guest into Google or email. Google uses a redirect, while email upgrade uses a 6-digit code from Supabase's change-email template on the same screen.
- The app-side art limits are in-memory, so they are best-effort on serverless instances until you add a shared rate-limit store.
- Recap export is currently an SVG download, which is fast and private but not yet a richer image pipeline.

## Next build steps

1. Replace local photo/art data URLs with private object storage while keeping the diary rows slim.
2. Normalize the diary schema from one JSON blob into entry rows if you want stronger multi-device conflict handling.
3. Add a standalone sign-in / account recovery flow for users returning on a new device or after clearing their session.
4. Move app-side art quotas to a shared store if you need strict cross-instance enforcement.
5. Add optimistic upload progress, better quota handling, and signed recap sharing.
