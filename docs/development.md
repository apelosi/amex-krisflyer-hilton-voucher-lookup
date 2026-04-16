# Development

## Prereqs

- Node.js 18+
- Supabase CLI (only needed to deploy Edge Functions). **Do not** `npm install -g supabase` (unsupported). On macOS: `brew install supabase/tap/supabase`. See [CLI install](https://github.com/supabase/cli#install-the-cli).

## Install

```bash
npm ci
```

## Run the web app

```bash
npm run dev
```

The app is a Vite + React frontend in `src/` that talks to **hosted** Supabase Edge Functions (`supabase.functions.invoke`). With `npm run dev`, the UI runs locally but availability checks still execute on Supabase (Browserless/ScraperAPI secrets live there).

After changing Edge Function code, deploy with the CLI (or your CI workflow) so production and local dev hit updated logic.

### Quick E2E check (without the full 12-test suite)

- **Browser (dev only):** open `http://localhost:5173/?demo=1` — prefills the same values as **Voucher Test 1** + **Hotel Availability Test 3** (Singapore / SINGI, etc.). Submit once to exercise `validate-voucher` + one `check-hotel-availability` path (the full calendar still scans many dates; see below if you want to shorten that later).

- **CLI:** `npm run test:smoke` — hits hosted functions with **two** API calls (voucher #1 + hotel #3). Needs `.env` with anon/publishable key like `npm run test:integration`.

### GitHub Actions

Manual **Run workflow** defaults to **smoke only** (checkbox “Run full integration suite” off). Nightly `schedule`, `push`, and `pull_request` still run the **full** 12-test suite.

## Environment variables

See root `.env.example`.

- **Vite** only exposes variables prefixed with `VITE_`. The Supabase client can use `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` if you wire `client.ts` to `import.meta.env`.
- **Integration tests** (`npm run test:integration`) load `.env` automatically via `dotenv`. Set at least `SUPABASE_ANON_KEY` (same value as the anon / publishable key). Optional: `SUPABASE_URL` if not using the default project URL in the script.
- **Supabase CLI** (deploy, `secrets list`, etc.) uses a **personal access token** on your machine: set `SUPABASE_ACCESS_TOKEN` in `.env` or run `supabase login`. That is separate from the anon key; agents in CI use GitHub secrets instead.

Do **not** put the **service_role** (secret) key in `VITE_*` or commit it. Edge Function secrets (`SCRAPERAPI_KEY`, `BROWSERLESS_API_KEY`) stay in the Supabase project dashboard, not in `.env`, unless you are only debugging locally.

