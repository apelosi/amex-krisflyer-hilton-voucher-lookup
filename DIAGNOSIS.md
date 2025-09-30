# Hotel Availability Scraping Diagnosis

## Problem Summary

The `check-hotel-availability` Supabase function is returning `available: false` for the SINGI hotel test case, even though the test expects 2 rooms to be available.

## Test Configuration

**Test 1 (FAILING):**
- Hotel: SINGI (Singapore Hilton)
- Date: October 15, 2025
- Group Code: ZKFA25
- Expected: 2 rooms available
- **Actual: 0 rooms available**

**Test 2 (PASSING):**
- Hotel: SINOR (Singapore Orchard)
- Date: October 15, 2025
- Group Code: ZKFA25
- Expected: 0 rooms available
- **Actual: 0 rooms available ✓**

## Possible Root Causes

### 1. **Test Data is Outdated** (Most Likely)
The test assumes October 15, 2025 will have availability, but:
- Hotel inventory changes daily
- Group code ZKFA25 may have expired or changed
- Voucher rates may not be offered for that specific date
- **Solution**: Verify manually that the test date actually has availability

### 2. **ScraperAPI Still Not Capturing Dynamic Content**
Even with 10-second waits and `wait_for_selector`, the page content may:
- Load via multiple sequential API calls
- Require user interaction (scroll, click)
- Use shadow DOM or iframes
- **Solution**: Try Browserless.io or manual browser inspection

### 3. **Hilton Bot Detection**
Hilton's servers may be:
- Detecting and blocking ScraperAPI requests
- Returning empty/unavailable results for automated requests
- Requiring cookies or session state
- **Solution**: Test with different user agents, proxy rotation, or Browserless

### 4. **HTML Parsing Logic Issues**
The `parseAvailability()` function may not be finding the correct indicators because:
- Hilton changed their HTML structure
- Text strings are in different formats
- Content is in JSON/JavaScript blocks, not HTML text
- **Solution**: Capture and inspect actual HTML returned

## Recommended Next Steps

###Step 1: Manual Verification
Visit this URL in a browser:
```
https://www.hilton.com/en/book/reservation/rooms/?ctyhocn=SINGI&arrivalDate=2025-10-15&departureDate=2025-10-16&groupCode=ZKFA25&room1NumAdults=1&cid=OH,MB,APACAMEXKrisFlyerComplimentaryNight,MULTIBR,OfferCTA,Offer,Book
```

Check:
- [ ] Does the page load successfully?
- [ ] Do you see "Amex Krisflyer Ascend Voucher rates"?
- [ ] Are there actually rooms available?
- [ ] What is the exact text/HTML structure for availability?

### Step 2: Update Test Data
If manual check shows NO availability for October 15, 2025:
1. Find a date that DOES have availability
2. Update test-integration.js with the correct date
3. Re-run tests

### Step 3: Capture Real HTML
Deploy a debug version that saves HTML to Supabase Storage:
```typescript
// Save failed HTML for inspection
if (!indicators.hasVoucherText) {
  const { data, error } = await supabase.storage
    .from('debug-html')
    .upload(`failed-${Date.now()}.html`, html);
}
```

### Step 4: Try Browserless.io
Sign up for free trial:
1. Go to https://browserless.io
2. Get API token
3. Add to Supabase secrets: `BROWSERLESS_API_KEY`
4. Re-run tests (will automatically use as fallback)

### Step 5: Consider Alternative Approaches
- **Direct API calls**: Reverse engineer Hilton's availability API
- **Official API**: Apply for Hilton Partner API access
- **Different scraping service**: Try Apify, ScrapingBee, or BrightData

## Current Implementation Status

✅ Implemented:
- Enhanced `parseAvailability()` with flexible text matching
- Increased wait times to 10 seconds
- Added `wait_for_selector` for room elements
- Added Browserless.io fallback support
- Comprehensive logging for debugging

❌ Not Yet Done:
- Manual verification of test data validity
- HTML capture and inspection
- Browserless.io account setup
- Direct API investigation

## Cost Analysis

Current costs per request:
- ScraperAPI (10s wait): ~$0.005-0.010
- Browserless.io: ~$0.010-0.020
- **Total per failed then fallback**: ~$0.015-0.030

For 1000 checks/day:
- If 50% fail to ScraperAPI: $5-10/day
- If all succeed with ScraperAPI: $5/day
- If all use Browserless: $10-20/day

## Action Items

**PRIORITY 1** (Do this first):
1. [ ] Manually visit the test URL and verify availability
2. [ ] If no rooms available, find a valid test date
3. [ ] Update integration tests with valid data

**PRIORITY 2** (If test data is valid):
1. [ ] Sign up for Browserless.io free trial
2. [ ] Add `BROWSERLESS_API_KEY` to Supabase secrets
3. [ ] Re-run tests to use fallback

**PRIORITY 3** (For long-term reliability):
1. [ ] Use browser DevTools to capture Hilton's API calls
2. [ ] Document API endpoint structure
3. [ ] Test direct API calls
4. [ ] Consider official Hilton Partner API

## Logs to Check

View function logs at:
```
https://supabase.com/dashboard/project/ynlnrvuqypmwpevabtdc/logs/edge-functions?s=check-hotel-availability
```

Look for:
- "Found terms:" - what search terms were found in HTML
- "JS parsing result:" - what parseAvailability returned
- Any error messages about timeouts or API failures

## Conclusion

The most likely issue is **invalid test data**. Before investing time in more complex solutions, we need to verify that the test expectations are based on actual, current availability at Hilton hotels.

**Next immediate action**: Manually check the Hilton URL and verify if rooms are actually available for the test date.