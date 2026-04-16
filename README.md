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

## Developer docs

- `docs/development.md`
- `docs/testing.md`
- `docs/operations.md`
