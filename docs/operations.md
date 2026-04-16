# Operations

## Nightly integration tests (GitHub Actions)

This repo has a scheduled GitHub Actions workflow in `.github/workflows/integration-tests.yml` that:

- installs dependencies
- deploys the `test-hotel-availability` Edge Function
- runs `npm run test:integration` (which executes `integration-testing.js`)

### Required GitHub secrets

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_ANON_KEY`
- `SCRAPERAPI_KEY` (needed for `fetch-hotel-data` / `validate-voucher` and ScraperAPI fallback)

### Recommended (hotel availability)

- `BROWSERLESS_API_KEY` — `check-hotel-availability` uses Browserless `/function` (real Chrome) when this is set; it is the most reliable path against Hilton's bot checks.

### Troubleshooting

- If scheduled runs stop, check the workflow is enabled in GitHub Actions.
- If runs fail quickly, it’s often missing/invalid secrets or the target site blocked the scrape.

