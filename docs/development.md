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

- **Browser (automated, no `.env` in Node):** `npx playwright install chromium` once, then `npm run test:e2e:smoke`. Playwright builds the app, serves it, opens `/?demo=1`, and clicks **Check Availability**. Supabase calls use the **anon key embedded in the built app** (`client.ts` fallbacks / `VITE_*` at build time), so the test runner does **not** need `SUPABASE_ANON_KEY` in the shell. Against a deployed site: `E2E_BASE_URL=https://your-site.example npm run test:e2e:smoke`.

- **Browser (manual):** `npm run dev` then open `http://localhost:5173/?demo=1` — same prefilled golden path.

- **CLI (needs anon in env):** `npm run test:smoke` — two direct HTTPS calls to Edge Functions. Use when you want to assert exact room counts without a browser.

### GitHub Actions

Manual **Run workflow** defaults to **smoke only** (checkbox “Run full integration suite” off). Nightly `schedule`, `push`, and `pull_request` still run the **full** 12-test suite.

## Environment variables

See root `.env.example`.

- **Vite** only exposes variables prefixed with `VITE_`. The Supabase client can use `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` if you wire `client.ts` to `import.meta.env`.
- **Integration tests** (`npm run test:integration`) load `.env` automatically via `dotenv`. Set at least `SUPABASE_ANON_KEY` (same value as the anon / publishable key). Optional: `SUPABASE_URL` if not using the default project URL in the script.
- **Supabase CLI** (deploy, `secrets list`, etc.) uses a **personal access token** on your machine: set `SUPABASE_ACCESS_TOKEN` in `.env` or run `supabase login`. That is separate from the anon key; agents in CI use GitHub secrets instead.

Do **not** put the **service_role** (secret) key in `VITE_*` or commit it. Edge Function secrets (`SCRAPERAPI_KEY`, `BROWSERLESS_API_KEY`) stay in the Supabase project dashboard, not in `.env`, unless you are only debugging locally.

