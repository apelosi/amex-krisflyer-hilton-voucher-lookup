# Testing Plan: JigsawStack and Firecrawl for Hilton Scraping

## Executive Summary

This plan tests two promising scraping services to bypass Hilton's bot detection:
1. **JigsawStack** - AI-powered scraper with auto-unblocker
2. **Firecrawl** - Stealth proxy with 96% site coverage claim

Both offer free tiers for testing before committing budget.

---

## Option 1: JigsawStack AI Scraper

### Overview
- AI-powered scraping without CSS selectors
- Auto-unblocker for Cloudflare, CAPTCHAs, and bot protection
- Intelligent IP rotation
- Automatic error handling

### Pricing
- **Free Tier**: 1 million tokens/month (generous for testing)
- **Pro Plan**: $27/month for 8M tokens + $1.40 per additional million
- **Token Calculation**: 1ms = 1 token (processing time-based)

### API Details

**Endpoint**: `https://api.jigsawstack.com/v1/ai/scrape`

**Authentication**:
```bash
x-api-key: YOUR_API_KEY
```

**Request Format**:
```json
{
  "url": "https://www.hilton.com/en/book/reservation/rooms/?ctyhocn=SINGI&arrivalDate=2025-10-15&departureDate=2025-10-16&groupCode=ZKFA25&room1NumAdults=1&cid=OH,MB,APACAMEXKrisFlyerComplimentaryNight,MULTIBR,OfferCTA,Offer,Book",
  "element_prompts": [
    "Extract hotel room availability status",
    "Extract number of rooms available",
    "Extract voucher rate information",
    "Extract Amex Krisflyer rate details"
  ],
  "proxy": true,
  "wait_for": "networkidle",
  "headers": {
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
  }
}
```

**Response Format**:
```json
{
  "success": true,
  "data": [
    {
      "element": "Extract hotel room availability status",
      "result": "Available"
    },
    {
      "element": "Extract number of rooms available",
      "result": "2 rooms"
    }
  ],
  "context": "Full page text...",
  "meta": {
    "title": "Hilton Singapore - Room Selection"
  },
  "_usage": {
    "tokens": 15000
  }
}
```

### Pros
- AI understands page content semantically
- No need to write/maintain CSS selectors
- Built-in proxy and anti-bot features
- Generous free tier (1M tokens = ~1000-5000 scrapes estimated)

### Cons
- Token-based pricing is hard to predict
- Newer service (less proven track record)
- Unknown success rate with Hilton specifically

---

## Option 2: Firecrawl

### Overview
- Designed for "JS-heavy and protected pages" (96% coverage claim)
- Stealth proxy mode for anti-bot protection
- Fast (<1 second results)
- Built for LLM/AI workflows

### Pricing
- **Free Tier**: 500 credits (500 pages)
- **Hobby Plan**: $16/month for 3,000 credits
- **Standard Plan**: $83/month for 100,000 credits
- **Credit Cost**: 1 credit per scrape, up to 5 credits with stealth proxy

### API Details

**Endpoint**: `https://api.firecrawl.dev/v1/scrape`

**Authentication**:
```bash
Authorization: Bearer YOUR_API_KEY
```

**Request Format**:
```json
{
  "url": "https://www.hilton.com/en/book/reservation/rooms/?ctyhocn=SINGI&arrivalDate=2025-10-15&departureDate=2025-10-16&groupCode=ZKFA25&room1NumAdults=1&cid=OH,MB,APACAMEXKrisFlyerComplimentaryNight,MULTIBR,OfferCTA,Offer,Book",
  "formats": ["markdown", "html"],
  "onlyMainContent": true,
  "proxy": "stealth",
  "mobile": false,
  "skipTlsVerification": false,
  "timeout": 30000,
  "actions": [
    {
      "type": "wait",
      "milliseconds": 3000
    }
  ]
}
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "markdown": "# Hilton Singapore\n\n## Amex Krisflyer Ascend Voucher Rates\n\n2 rooms available...",
    "html": "<html>...</html>",
    "metadata": {
      "title": "Hilton Singapore - Room Selection",
      "description": "...",
      "language": "en"
    },
    "links": ["..."]
  }
}
```

### Pros
- Explicit "stealth" proxy mode for anti-bot
- Claims 96% success on protected pages
- Simple credit-based pricing
- Free tier allows 500 tests
- Fast response times (<1s)

### Cons
- No AI-powered extraction (need to parse markdown/HTML)
- Stealth mode costs 5x more (5 credits vs 1)
- May still fail on Hilton (no guarantees)

---

## Testing Strategy

### Phase 1: Quick Validation (1-2 hours)

**Goal**: Determine if either service can bypass Hilton's bot detection

**Test URLs** (use these specific cases):
1. **Known Available**: SINGI, 2025-12-15 (manually verify rooms exist)
2. **Known Unavailable**: SINOR, 2025-10-15 (manually verify no rooms)
3. **Edge Case**: Weekend/holiday date (test dynamic pricing)

**Success Criteria**:
- ✅ Returns actual page content (not error page)
- ✅ Contains "Amex Krisflyer" or "voucher" text
- ✅ Can parse room availability accurately
- ✅ Matches manual browser check

**Failure Indicators**:
- ❌ Returns "Hilton Page Reference Code" (error page)
- ❌ Empty/blocked content
- ❌ Timeout errors
- ❌ 403/421/429 status codes

### Phase 2: Success Rate Testing (2-4 hours)

**If Phase 1 shows promise**, test with 20-30 URLs:
- 10 different hotels
- 3 dates each
- Mix of known available/unavailable

**Measure**:
- Success rate (% of non-blocked responses)
- Accuracy (% of correct availability detection)
- Speed (average response time)
- Cost (tokens/credits consumed)

### Phase 3: Integration (1-2 days)

**If success rate > 60%**, implement in production:
1. Create new Supabase function: `check-availability-jigsawstack` or `check-availability-firecrawl`
2. Add fallback chain: Primary service → Manual verification
3. Monitor success rates in production
4. Add cost tracking

---

## Implementation Plan

### Step 1: Sign Up for Services

**JigsawStack**:
1. Visit https://jigsawstack.com
2. Sign up for free account
3. Get API key from dashboard
4. Add to Supabase secrets: `JIGSAWSTACK_API_KEY`

**Firecrawl**:
1. Visit https://firecrawl.dev
2. Sign up for free account (500 credits)
3. Get API key from dashboard
4. Add to Supabase secrets: `FIRECRAWL_API_KEY`

### Step 2: Create Test Functions

Create two new Supabase Edge Functions for isolated testing:

**File**: `supabase/functions/test-jigsawstack/index.ts`
**File**: `supabase/functions/test-firecrawl/index.ts`

### Step 3: Run Tests

```bash
# Deploy test functions
supabase functions deploy test-jigsawstack
supabase functions deploy test-firecrawl

# Test JigsawStack
curl -X POST 'https://ynlnrvuqypmwpevabtdc.supabase.co/functions/v1/test-jigsawstack' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"hotelCode": "SINGI", "date": "2025-12-15"}'

# Test Firecrawl
curl -X POST 'https://ynlnrvuqypmwpevabtdc.supabase.co/functions/v1/test-firecrawl' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"hotelCode": "SINGI", "date": "2025-12-15"}'
```

### Step 4: Analyze Results

Compare outputs:
- Page title (should NOT be "Hilton Page Reference Code")
- Content length (should be 200KB+, not 50KB error page)
- Presence of "Amex Krisflyer" text
- Extracted availability data

### Step 5: Decision Tree

```
Did either service bypass bot detection?
├─ YES → Proceed to Phase 2 (Success Rate Testing)
│   └─ Success rate > 60%?
│       ├─ YES → Implement in production (Phase 3)
│       └─ NO → Keep manual verification, wait for Hilton API
└─ NO → Keep manual verification, consider Bright Data or wait for Hilton API
```

---

## Expected Outcomes

### Best Case Scenario
- One service achieves 70-90% success rate
- Average cost: $10-30/month
- Reduces manual checking by 70-90%
- Implementation time: 3-5 days

### Likely Scenario
- One service achieves 40-60% success rate
- Hybrid approach: Auto-check → Manual fallback
- Cost: $5-20/month
- Reduces manual checking by 40-60%

### Worst Case Scenario
- Both services fail (0-20% success rate)
- Keep current manual verification
- Wait for official Hilton API response
- Cost: $0/month

---

## Risk Mitigation

1. **Use free tiers first** - No financial commitment for testing
2. **Set spending limits** - Configure billing alerts at $10, $25, $50
3. **Implement cost tracking** - Log every API call with token/credit usage
4. **Keep manual fallback** - Never remove "Check on Hilton" links
5. **Monitor success rates** - Alert if drops below 50%

---

## Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| **Setup** | 30 min | API keys obtained and stored |
| **Phase 1: Validation** | 1-2 hours | Test results for both services |
| **Phase 2: Success Rate** | 2-4 hours | 20-30 URL test results |
| **Phase 3: Integration** | 1-2 days | Production implementation |
| **Total** | 2-3 days | Working automated scraping or clear "no-go" decision |

---

## Next Steps

1. ✅ Sign up for JigsawStack (get API key)
2. ✅ Sign up for Firecrawl (get API key)
3. ✅ Add API keys to Supabase secrets
4. ✅ Create test functions (provided in next files)
5. ✅ Run Phase 1 validation tests
6. ⏸️ Analyze results and decide next steps

---

## Files to Create

1. `supabase/functions/test-jigsawstack/index.ts` - JigsawStack test function
2. `supabase/functions/test-firecrawl/index.ts` - Firecrawl test function
3. `TEST_RESULTS.md` - Document test outcomes

---

**Last Updated**: 2025-01-21
**Status**: Ready to begin Phase 1 testing
**Decision Point**: After Phase 1 (1-2 hours of testing)
