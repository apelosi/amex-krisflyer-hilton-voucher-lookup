# Testing

## Integration tests

Integration tests are implemented in `integration-testing.js` and run against deployed Supabase Edge Functions.

### Run locally

```bash
export SUPABASE_URL="https://<your-project-ref>.supabase.co"
export SUPABASE_ANON_KEY="<anon key>"
export SCRAPERAPI_KEY="<scraperapi key>"

npm run test:integration
```

### Deploy the test function + run tests

```bash
supabase functions deploy test-hotel-availability
npm run test:integration
```

## Test case data

The hotel availability test cases and voucher validation test cases live in `integration-testing.js`.

