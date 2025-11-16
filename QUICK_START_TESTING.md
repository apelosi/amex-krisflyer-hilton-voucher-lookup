# Quick Start: Testing JigsawStack and Firecrawl

## Prerequisites
- Supabase CLI installed
- Project configured locally

## Step 1: Sign Up for Services (15 minutes)

### JigsawStack
1. Visit https://jigsawstack.com
2. Click "Start for free"
3. Sign up with email
4. Go to Dashboard → API Keys
5. Copy your API key
6. Free tier: 1 million tokens/month

### Firecrawl
1. Visit https://firecrawl.dev
2. Click "Get Started"
3. Sign up with email
4. Go to Dashboard → API Keys
5. Copy your API key
6. Free tier: 500 credits (100 with stealth mode)

## Step 2: Add API Keys to Supabase (5 minutes)

```bash
# Add JigsawStack API key
supabase secrets set JIGSAWSTACK_API_KEY=your_jigsawstack_key_here

# Add Firecrawl API key
supabase secrets set FIRECRAWL_API_KEY=your_firecrawl_key_here

# Verify secrets are set
supabase secrets list
```

## Step 3: Deploy Test Functions (2 minutes)

```bash
# Deploy both test functions
supabase functions deploy test-jigsawstack
supabase functions deploy test-firecrawl
```

## Step 4: Run Tests (5 minutes)

### Test JigsawStack

```bash
curl -X POST \
  'https://ynlnrvuqypmwpevabtdc.supabase.co/functions/v1/test-jigsawstack' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlubG5ydnVxeXBtd3BldmFidGRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1NzM0NjQsImV4cCI6MjA2ODE0OTQ2NH0.dvRTW9S7ZRCcjYJgEx-Adw1QnRV2Gv6jqCpAhPt-qoE' \
  -H 'Content-Type: application/json' \
  -d '{
    "hotelCode": "SINGI",
    "date": "2025-12-15"
  }'
```

### Test Firecrawl

```bash
curl -X POST \
  'https://ynlnrvuqypmwpevabtdc.supabase.co/functions/v1/test-firecrawl' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlubG5ydnVxeXBtd3BldmFidGRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1NzM0NjQsImV4cCI6MjA2ODE0OTQ2NH0.dvRTW9S7ZRCcjYJgEx-Adw1QnRV2Gv6jqCpAhPt-qoE' \
  -H 'Content-Type: application/json' \
  -d '{
    "hotelCode": "SINGI",
    "date": "2025-12-15"
  }'
```

## Step 5: Interpret Results (5 minutes)

### Success Indicators

Look for these in the JSON response:

```json
{
  "verdict": {
    "test_passed": true,  // ✅ Bypassed bot detection
    "recommendation": "PROMISING - Proceed to Phase 2 testing"
  },
  "analysis": {
    "likely_bypassed_bot_detection": true,
    "is_error_page": false,
    "has_voucher_text": true,
    "content_length": 200000  // Should be > 50000
  }
}
```

### Failure Indicators

```json
{
  "verdict": {
    "test_passed": false,  // ❌ Bot detection triggered
    "recommendation": "FAILED - Bot detection not bypassed"
  },
  "analysis": {
    "is_error_page": true,
    "page_title": "Hilton Page Reference Code",  // ❌ Error page
    "content_length": 50000  // Too small
  }
}
```

## Step 6: Manual Verification (3 minutes)

Open the test URL in your browser to verify expected results:

```
https://www.hilton.com/en/book/reservation/rooms/?ctyhocn=SINGI&arrivalDate=2025-12-15&departureDate=2025-12-16&groupCode=ZKFA25&room1NumAdults=1&cid=OH,MB,APACAMEXKrisFlyerComplimentaryNight,MULTIBR,OfferCTA,Offer,Book
```

Check:
- [ ] Page loads successfully (not error page)
- [ ] See "Amex Krisflyer" or "voucher" text
- [ ] Can see room availability
- [ ] Note if rooms are available or not

## Step 7: Compare Results

| Metric | Manual Browser | JigsawStack | Firecrawl |
|--------|---------------|-------------|-----------|
| Page loads? | ✅ | ? | ? |
| Has voucher text? | ✅ | ? | ? |
| Shows availability? | ✅ | ? | ? |
| Matches reality? | ✅ | ? | ? |

## Decision Matrix

### If JigsawStack Passes ✅
→ Proceed to Phase 2: Test with 20-30 URLs
→ Measure success rate over larger sample
→ Expected cost: $5-20/month

### If Firecrawl Passes ✅
→ Proceed to Phase 2: Test with 20-30 URLs
→ Track credit usage (5 credits per request with stealth)
→ Expected cost: $16/month (Hobby plan for 3000 credits = 600 stealth scrapes)

### If Both Pass ✅✅
→ Run Phase 2 with both
→ Compare: success rate, speed, cost, ease of parsing
→ Choose winner for production

### If Both Fail ❌❌
→ Document findings in TEST_RESULTS.md
→ Consider Bright Data ($50-200/month) if critical
→ Otherwise: Keep manual verification, wait for Hilton API

## Common Issues

### "JIGSAWSTACK_API_KEY not configured"
- Make sure you ran `supabase secrets set`
- Secrets may take 1-2 minutes to propagate
- Redeploy function after setting secrets

### "403 Forbidden" or "429 Too Many Requests"
- Check API key is valid
- Verify you're within free tier limits
- Wait 1-2 minutes and retry

### "Timeout" errors
- Increase timeout in function code (currently 30s)
- Some Hilton pages take 20-30s to fully render
- This is expected on first request

### Function deployment fails
- Check syntax: `deno check supabase/functions/test-jigsawstack/index.ts`
- Ensure Supabase CLI is up to date
- Check function logs: `supabase functions logs test-jigsawstack`

## Next Steps After Testing

### If Tests Succeed
1. Document results in TEST_RESULTS.md
2. Run Phase 2 (20-30 URLs)
3. Implement in production if success rate > 60%
4. Set up cost monitoring

### If Tests Fail
1. Document results in TEST_RESULTS.md
2. Review TESTING_PLAN.md for alternative approaches
3. Consider waiting for Hilton API response
4. Keep current manual verification

## Estimated Time

| Task | Time |
|------|------|
| Sign up for services | 15 min |
| Configure API keys | 5 min |
| Deploy functions | 2 min |
| Run tests | 5 min |
| Interpret results | 5 min |
| Manual verification | 3 min |
| **Total** | **35 min** |

## Support

- **JigsawStack Docs**: https://jigsawstack.com/docs
- **Firecrawl Docs**: https://docs.firecrawl.dev
- **Supabase Secrets**: https://supabase.com/docs/guides/functions/secrets

---

**Ready to start?** Begin with Step 1: Sign up for services!
