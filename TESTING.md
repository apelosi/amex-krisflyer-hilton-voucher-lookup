# Integration Testing Guide

This document describes how to run integration tests for the Hotel Availability function.

## Overview

The integration tests validate that the `check-hotel-availability` function correctly:
1. Scrapes Hilton's booking website using ScraperAPI
2. Parses HTML to detect voucher rates and room availability
3. Returns accurate availability data

## Test Cases

### Test 1: SINGI Hotel - Expected 2 rooms available
- **Input**: Singapore Hilton (SINGI), October 15, 2025
- **Expected**: 2 rooms available with voucher rates

### Test 2: SINOR Hotel - Expected 0 rooms available  
- **Input**: Singapore Hilton (SINOR), October 15, 2025
- **Expected**: 0 rooms available (unavailable rates)

## Running Tests

### Local Testing

1. **Set up environment variables**:
   ```bash
   export SUPABASE_URL="https://ynlnrvuqypmwpevabtdc.supabase.co"
   export SUPABASE_ANON_KEY="your_anon_key_here"
   ```

2. **Run integration tests**:
   ```bash
   npm run test:integration
   ```

3. **Deploy and test** (deploys test function first):
   ```bash
   npm run test:deploy
   ```

### Manual Testing via Supabase Dashboard

1. Go to [Supabase Functions Dashboard](https://supabase.com/dashboard/project/ynlnrvuqypmwpevabtdc/functions)
2. Click on `test-hotel-availability` function
3. Use the "Invoke function" feature with an empty body `{}`
4. Check the response for test results

### GitHub Actions

Tests run automatically on:
- Every push to `main` or `develop` branches
- Every pull request to `main`
- Daily at 2 AM UTC (scheduled)

## Test Function Details

The `test-hotel-availability` function:
1. Calls the actual `check-hotel-availability` function with test data
2. Validates response structure and data accuracy
3. Compares actual results with expected outcomes
4. Returns comprehensive test results with timing information

## Expected Test Output

```json
{
  "success": true,
  "summary": {
    "total": 2,
    "passed": 2,
    "failed": 0,
    "duration": 15420
  },
  "results": [
    {
      "testName": "Test 1: SINGI Hotel - Expected 2 rooms available",
      "passed": true,
      "actual": {
        "available": true,
        "roomCount": 2
      },
      "expected": {
        "available": true,
        "roomCount": 2
      },
      "duration": 8200
    },
    {
      "testName": "Test 2: SINOR Hotel - Expected 0 rooms available",
      "passed": true,
      "actual": {
        "available": false,
        "roomCount": 0
      },
      "expected": {
        "available": false,
        "roomCount": 0
      },
      "duration": 7220
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Troubleshooting

### Common Issues

1. **ScraperAPI Key Missing**: Ensure `SCRAPERAPI_KEY` is set in Supabase secrets
2. **Function Timeout**: Tests may timeout if ScraperAPI is slow - this is normal
3. **Rate Limiting**: ScraperAPI may rate limit requests - wait and retry
4. **Hotel Data Missing**: Ensure `fetch-hotel-data` function is working

### Debug Mode

To see detailed logs:
1. Check Supabase function logs in the dashboard
2. Look for console.log output in the test function
3. Verify ScraperAPI is returning valid HTML content

## Adding New Test Cases

To add new test cases:

1. Edit `supabase/functions/test-hotel-availability/index.ts`
2. Add new test case to the `testCases` array
3. Deploy the updated function: `supabase functions deploy test-hotel-availability`
4. Run tests: `npm run test:integration`

## Test Data Requirements

Test cases should include:
- Valid credit card numbers
- Valid voucher codes
- Real hotel codes from the hotel data
- Future dates (at least 6 months ahead)
- Valid group codes

## Performance Expectations

- Each test should complete within 30 seconds
- ScraperAPI requests typically take 10-20 seconds
- Total test suite should complete within 60 seconds
