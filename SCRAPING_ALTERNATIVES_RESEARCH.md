# Scraping Alternatives Research Summary

**Date**: 2025-01-21
**Status**: Research complete, ready for testing
**Next Action**: Follow QUICK_START_TESTING.md

---

## Executive Summary

After exhaustive research into alternatives to ScraperAPI and Browserless (both blocked by Hilton), I've identified **two promising services** worth testing:

1. **JigsawStack** - AI-powered scraper with auto-unblocker (most promising)
2. **Firecrawl** - Stealth proxy with 96% site coverage claim

Both offer free tiers for testing before financial commitment.

---

## What's Already Been Tried (100% Failure Rate)

| Service | Method | Result | Why It Failed |
|---------|--------|--------|---------------|
| ScraperAPI | Basic scraping | ❌ 403 Forbidden | Datacenter IP detected |
| ScraperAPI | JS rendering + waits | ❌ 0 rooms found | Bot detection via TLS fingerprint |
| Browserless.io | Standard mode | ❌ Error page | Browser fingerprinting |
| Browserless.io | Stealth mode | ❌ Error page | Advanced detection (Canvas/WebGL) |
| Custom Puppeteer | navigator.webdriver override | ❌ Blocked | Incomplete stealth |

**Root Cause**: Hilton uses enterprise-grade bot detection (TLS fingerprinting, behavioral analysis, Canvas/WebGL checks, IP reputation)

---

## New Services Researched

### 🌟 1. JigsawStack (RECOMMENDED FOR TESTING)

**Overview**:
- AI-powered web scraper
- Built-in auto-unblocker for Cloudflare, CAPTCHA, bot protection
- Intelligent IP rotation
- No CSS selectors needed (AI extraction)

**Key Features**:
- `proxy: true` - Automatic proxy rotation
- `wait_for: "networkidle"` - Dynamic content support
- AI-powered extraction via prompts
- 160+ language support
- Auto-scrolling for lazy-loaded content

**Pricing**:
- Free: 1M tokens/month (~1000-5000 scrapes estimated)
- Pro: $27/month for 8M tokens
- Token calculation: 1ms = 1 token
- Estimated cost: $10-30/month for your use case

**Why It Might Work**:
- Specifically designed to bypass bot detection
- Uses residential proxies and advanced fingerprinting
- AI understands page semantically (no fragile selectors)
- Automatic error handling

**Docs**: https://jigsawstack.com/docs/api-reference/ai/scrape

---

### 🔥 2. Firecrawl (SOLID ALTERNATIVE)

**Overview**:
- Web scraping API built for LLM/AI workflows
- Claims 96% coverage on "JS-heavy and protected pages"
- Stealth proxy mode for anti-bot
- Fast (<1 second results)

**Key Features**:
- `proxy: "stealth"` - Advanced anti-bot protection
- Ad blocking by default
- Multiple output formats (Markdown, HTML, JSON)
- Actions support (wait, click, scroll)
- Mobile device emulation

**Pricing**:
- Free: 500 credits (100 stealth scrapes)
- Hobby: $16/month for 3,000 credits (600 stealth scrapes)
- Standard: $83/month for 100,000 credits
- Stealth mode: 5 credits per request (vs 1 for basic)

**Why It Might Work**:
- Explicit stealth mode for protected sites
- Used by 5,000+ companies
- Open-source option available
- Designed for modern SPA/React sites (like Hilton)

**Docs**: https://docs.firecrawl.dev/api-reference/endpoint/scrape

---

## Other Services Evaluated

### 3. Exa.ai (LOW PRIORITY)

**Type**: AI search engine / crawl API

**Pros**:
- Real-time data retrieval
- Free tier available
- Zero data retention option

**Cons**:
- Not explicitly a scraping tool (more search-focused)
- No mention of anti-bot features
- Unclear if handles dynamic booking pages

**Verdict**: ⚠️ Not ideal for your use case

---

### 4. Bright Data Web Unlocker (PROVEN BUT EXPENSIVE)

**Type**: Enterprise scraping infrastructure

**Features**:
- Near 100% CAPTCHA success rate (their claim)
- Residential proxy network
- Advanced fingerprint bypass at all levels

**Pricing**:
- $1.50/1,000 requests (pay-as-you-go)
- $1.30-$1.00/1,000 at scale
- For 365 dates: ~$16-22/month minimum

**Verdict**: ✅ Will likely work, but expensive for side project. Use as fallback if JigsawStack/Firecrawl fail.

**Docs**: https://brightdata.com/products/web-unlocker

---

### 5. Cloud Desktop Automation (NUCLEAR OPTION)

**Approaches**:
- Playwright/Puppeteer on dedicated VPS with residential proxy
- BrowserStack/AWS Device Farm (real device testing)
- Windows/Mac VM in cloud with VNC

**Pros**:
- Maximum stealth (real browser on real OS)
- Full control over execution
- Can simulate human behavior

**Cons**:
- Complex setup (2-4 weeks)
- Ongoing maintenance burden
- VM costs: $20-100/month
- Slow (30-60s per check)
- Still might get blocked if datacenter IP

**Verdict**: ⚠️ Only if all other options fail. Too complex for side project.

---

### 6. Claude Desktop Use / AI Agent (EXPERIMENTAL)

**Concept**: Use Claude's computer use capabilities

**How**:
1. Claude Desktop with computer use enabled
2. Automate opening Hilton URLs
3. Extract data from screen via vision
4. Return structured results

**Pros**:
- Real browser (perfect stealth)
- Can handle any UI changes
- Hilton can't detect as bot

**Cons**:
- Requires 24/7 local/cloud machine
- Very slow (minutes per check)
- Expensive (Claude API costs per action)
- Experimental feature
- Not truly "automated"

**Verdict**: ❌ Not practical for production use

---

## Comparison Matrix

| Service | Setup | Monthly Cost | Est. Success | Speed | Maintenance | Recommendation |
|---------|-------|--------------|--------------|-------|-------------|----------------|
| **JigsawStack** | 1 hour | $10-30 | 60-80%? | Fast | Low | ⭐⭐⭐⭐⭐ TEST FIRST |
| **Firecrawl** | 2 hours | $16-50 | 50-70%? | Fast | Low | ⭐⭐⭐⭐ TEST SECOND |
| **Bright Data** | 1 week | $50-200 | 80-95% | Fast | Low | ⭐⭐⭐ IF OTHERS FAIL |
| **Exa.ai** | 1 hour | $10-30 | 20-40%? | Fast | Low | ⭐⭐ LOW PRIORITY |
| **Cloud Desktop** | 4 weeks | $20-100 | 70-90% | Slow | High | ⭐ LAST RESORT |
| **Claude Agent** | 2 weeks | $50-200 | 95%+ | Very Slow | Very High | ❌ NOT PRACTICAL |
| **Current Manual** | 0 | $0 | 100% | Instant | None | ✅ KEEP AS FALLBACK |

---

## Key Research Findings

1. **AI-powered scrapers are the new wave** - JigsawStack and Firecrawl specifically advertise bot detection bypass

2. **No 100% solution exists** - Even enterprise services claim 80-95% success rates

3. **Residential proxies are key** - Datacenter IPs get flagged immediately

4. **Cost scales with reliability**:
   - $0 = Manual only
   - $10-30 = Decent automation (60-70% success)
   - $50-200 = Enterprise-grade (80-95% success)

5. **Hilton's detection is sophisticated** - Requires multiple layers:
   - Residential proxies
   - Browser fingerprint randomization
   - Human-like timing
   - TLS fingerprint spoofing
   - Canvas/WebGL consistency

6. **Your current manual approach is viable** - For personal use at your scale, manual verification is totally acceptable

---

## Recommended Testing Strategy

### Phase 1: Free Tier Testing (1-2 hours)
1. Sign up for JigsawStack (free)
2. Sign up for Firecrawl (free)
3. Test with 5-10 Hilton URLs
4. Measure success rate

### Phase 2: Extended Testing (If Phase 1 shows >50% success)
1. Test with 20-30 URLs
2. Various hotels and dates
3. Track success rate, speed, cost
4. Compare both services

### Phase 3: Production Implementation (If success rate >60%)
1. Implement winner in production
2. Add fallback to manual verification
3. Monitor costs and success rates
4. Adjust based on data

### Fallback Plan (If all fail)
1. Keep current manual verification
2. Wait for Hilton API response (you already applied)
3. Consider Bright Data if automation becomes critical
4. Alternatively: Build browser extension for passive data capture

---

## Cost-Benefit Analysis

For your use case (personal voucher checking):

**Low Volume** (check 10 dates once):
- Manual: Free, 5 minutes total
- **Verdict**: Manual is fine

**Medium Volume** (check 50 dates monthly):
- Manual: Free, 25 minutes/month
- Automated: $10-30/month, instant
- **Verdict**: Automation nice-to-have

**High Volume** (check 365 dates daily):
- Manual: Not practical
- Automated: $50-200/month required
- **Verdict**: Automation essential

**Your situation**: Likely medium volume → Test JigsawStack/Firecrawl, but manual is acceptable fallback

---

## Files Created

1. ✅ **TESTING_PLAN.md** - Detailed testing methodology
2. ✅ **QUICK_START_TESTING.md** - Step-by-step testing guide
3. ✅ **supabase/functions/test-jigsawstack/index.ts** - JigsawStack test function
4. ✅ **supabase/functions/test-firecrawl/index.ts** - Firecrawl test function
5. ✅ **SCRAPING_ALTERNATIVES_RESEARCH.md** - This document

---

## Next Steps

### Immediate (This Week):
1. Follow QUICK_START_TESTING.md
2. Sign up for both services (15 min)
3. Run test functions (10 min)
4. Document results in TEST_RESULTS.md (create this file)

### If Tests Succeed:
1. Run Phase 2 with larger sample
2. Implement in production
3. Set up cost monitoring
4. Monitor success rates

### If Tests Fail:
1. Document findings
2. Keep manual verification
3. Wait for Hilton API response
4. Consider Bright Data if automation becomes critical

---

## Additional Resources

- **JigsawStack**: https://jigsawstack.com
- **Firecrawl**: https://firecrawl.dev
- **Bright Data**: https://brightdata.com
- **Playwright Stealth**: https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin-stealth

---

## Important Notes

1. **Free tiers are for testing only** - Don't rely on them for production
2. **Success rates are estimates** - Actual results may vary
3. **Hilton may update defenses** - Monitor success rates over time
4. **Terms of Service** - Check Hilton's ToS regarding automated access
5. **Official API is always better** - Continue pursuing Hilton partnership

---

**Conclusion**: JigsawStack and Firecrawl are worth 1-2 hours of testing. If they work, you'll save significant manual effort. If they don't, your current manual approach is perfectly fine for a personal side project.

Ready to test? → Start with **QUICK_START_TESTING.md**
