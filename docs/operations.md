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
- `SCRAPERAPI_KEY`

### Troubleshooting

- If scheduled runs stop, check the workflow is enabled in GitHub Actions.
- If runs fail quickly, it’s often missing/invalid secrets or the target site blocked the scrape.

