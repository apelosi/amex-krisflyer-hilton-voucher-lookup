# Amex KrisFlyer ↔ Hilton voucher availability checker

This is a small web app that helps check **hotel availability** for Amex KrisFlyer / Hilton voucher-related rates.

It’s built as:

- **Frontend**: Vite + React (`src/`)
- **Backend**: Supabase Edge Functions (`supabase/functions/`)

## What it does (high level)

- Accepts voucher inputs (e.g., voucher code / hotel code / date)
- Calls a Supabase Edge Function that constructs a Hilton booking URL and attempts to determine whether voucher-rate availability exists for the requested date(s)

## Nightly integration tests

There is a scheduled GitHub Actions workflow (`.github/workflows/integration-tests.yml`) that deploys the test function and runs integration tests nightly.

## Where this runs

- **Frontend:** not tied to Lovable. You build static assets with `npm run build` and host the `dist/` folder anywhere (Vercel, Netlify, Cloudflare Pages, S3+CDN, etc.). This repo does not configure a host for you.
- **Backend:** [Supabase](https://supabase.com) — Edge Functions + DB for your project (see `supabase/functions/`).

If you still have an old Lovable project URL, it is unrelated unless you chose to deploy there.

## Supabase CLI install (global npm is not supported)

`npm install -g supabase` is intentionally blocked by the CLI. Use one of the [official install methods](https://github.com/supabase/cli#install-the-cli), for example on macOS:

```bash
brew install supabase/tap/supabase
```

Then: `supabase login` and `supabase link --project-ref <your-ref>`.

## Developer docs

- `docs/development.md`
- `docs/testing.md`
- `docs/operations.md`