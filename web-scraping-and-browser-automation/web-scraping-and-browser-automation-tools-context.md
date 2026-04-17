# Web Scraping & Browser Automation Tools

This document provides comprehensive guidance for **user-level** web scraping and browser automation capabilities, including setup, tool comparison, and testing procedures.

---

## Table of Contents

1. [Purpose & Goals](#purpose--goals)
2. [MCP Installation (User-Level)](#mcp-installation-user-level)
3. [Tool Comparison Matrix](#tool-comparison-matrix)
4. [Tool Details](#tool-details)
5. [Background: Original Problems](#background-original-problems)
6. [Testing Plan](#testing-plan)
7. [Evaluation Criteria](#evaluation-criteria)
8. [Desired End State](#desired-end-state)
9. [Troubleshooting](#troubleshooting)

---

## Purpose & Goals

### What We're Building

1. **User-level configuration** in `~/.claude.json` (MCP servers available across all projects)
2. **Smart skill(s)** that know when/how to use which tool
3. **Tested, reliable solutions** for bypassing bot detection (Cloudflare, etc.)

### Why This Matters

Multiple projects need to access websites protected by Cloudflare or Recaptcha, navigate websites, sometimes login, and scrape minimal data for research, accessing data in lieu of an available API, downloading files, or performing actions. While tasks may be project-specific, the **tooling should be generic and reusable** across all projects.

### Research Summary (January 2026)

**Key Findings:**

1. **Pricing is Mostly Unified:** Most providers (Browserbase, Exa, ScrapingBee) charge the same whether you use MCP, API, or SDK
2. **MCP is Optimal for AI Workflows:** Use MCP for Claude Code/AI agents - no cost penalty, better integration
3. **Cloudflare Bypass Hierarchy:** ScraperAPI (99.99%) > Oxylabs (97%) > Browserbase (95%+) > Others
4. **Skip These Tools:** FlareSolverr (broken), Browser Use (poor CF success)
5. **ScraperAPI & JigsawStack:** No MCP servers - use API/SDK via HTTP calls or Python/Node scripts
6. **Airtop Best for Multi-tab + Auth:** Project 3 (PAWA Utility) benefits from Airtop's multi-tab navigation and authentication handling

---

## MCP Installation (User-Level)

### Preferred Method: `claude mcp add --scope user`

**Always use the CLI command with `--scope user`** to install MCP servers at the user level. This automatically updates `~/.claude.json` without manual JSON editing.

```bash
# Generic syntax
claude mcp add <server-name> --scope user -- <command> [args...]

# With environment variables
claude mcp add <server-name> --scope user -e VAR_NAME=value -- <command> [args...]
```

### Installation Commands by Tool

**Note:** ScraperAPI and JigsawStack do not have MCP servers. They will be tested via their REST APIs or SDKs.

#### ScraperAPI

**No MCP server available** - Use REST API or SDK for testing:

- **API:** [https://scraperapi.com/documentation](https://scraperapi.com/documentation)
- **Node SDK:** `npm install scraperapi-sdk`
- **Python SDK:** `pip install scraperapi-python`

#### JigsawStack

**No MCP server available** - Use REST API or SDK for testing:

- **API:** [https://jigsawstack.com/docs/api-reference/ai/scrape](https://jigsawstack.com/docs/api-reference/ai/scrape)
- **Node SDK:** `npm install jigsawstack`
- **Python SDK:** `pip install jigsawstack`

#### Firecrawl

```bash
claude mcp add firecrawl --scope user \
  -e FIRECRAWL_API_KEY=your_api_key_here \
  -- npx -y firecrawl-mcp
```

#### Browserbase

```bash
claude mcp add browserbase --scope user \
  -e BROWSERBASE_API_KEY=your_api_key_here \
  -e BROWSERBASE_PROJECT_ID=your_project_id \
  -- npx -y @anthropic/browserbase-mcp
```

#### Hyperbrowser

```bash
claude mcp add hyperbrowser --scope user \
  -e HYPERBROWSER_API_KEY=your_api_key_here \
  -- npx -y @anthropic/hyperbrowser-mcp
```

#### Oxylabs (THREE Products)

**Oxylabs provides THREE separate products via ONE MCP server:**

1. **Web Scraper API** (username/password) - AVAILABLE ✅
  - Tools: universal_scraper, google_search_scraper, amazon_search_scraper, amazon_product_scraper
  - Free trial available
  - Dashboard: [https://dashboard.oxylabs.io/](https://dashboard.oxylabs.io/)
2. **Browser Agent** (API key) - AVAILABLE ✅
  - Tools: ai_scraper, ai_crawler, ai_browser_agent, ai_search
  - 1000 free credits
  - Dashboard: [https://aistudio.oxylabs.io/](https://aistudio.oxylabs.io/)
3. **Unblocking Browser** (username/password) - NOT AVAILABLE ❌
  - Requires sales enablement (enterprise product)
  - Not accessible via free trial

**Installation with Web Scraper API + Browser Agent (provides 8 tools):**

```bash
claude mcp add oxylabs --scope user \
  -e OXYLABS_USERNAME=your_username \
  -e OXYLABS_PASSWORD=your_password \
  -e OXYLABS_AI_STUDIO_API_KEY=your_api_key \
  -- uvx oxylabs-mcp
```

**Get credentials:**

- Web Scraper API: [https://dashboard.oxylabs.io/](https://dashboard.oxylabs.io/) (free trial)
- Browser Agent: [https://aistudio.oxylabs.io/settings/api-key](https://aistudio.oxylabs.io/settings/api-key) (1000 free credits)

**Documentation:**

- MCP Setup: [https://github.com/oxylabs/oxylabs-mcp](https://github.com/oxylabs/oxylabs-mcp)
- Web Scraper API: [https://developers.oxylabs.io/scraper-apis/web-scraper-api](https://developers.oxylabs.io/scraper-apis/web-scraper-api)
- Browser Agent: [https://aistudio.oxylabs.io/apps/browser_agent](https://aistudio.oxylabs.io/apps/browser_agent)

#### ScrapingBee

```bash
# ScrapingBee uses a remote MCP server with API key in URL
claude mcp add scrapingbee --scope user \
  -- npx -y mcp-remote "https://mcp.scrapingbee.com/mcp?api_key=YOUR_API_KEY"
```

#### Exa

```bash
claude mcp add exa --scope user \
  -e EXA_API_KEY=your_api_key_here \
  -- npx -y @anthropic/exa-mcp
```

#### Browser-Use

```bash
claude mcp add browser-use --scope user \
  -e OPENAI_API_KEY=your_openai_key \
  -- npx -y @anthropic/browser-use-mcp
```

#### Playwright (local browser automation)

```bash
claude mcp add playwright --scope user -- npx -y @anthropic/playwright-mcp
```

#### Puppeteer (local browser automation)

```bash
claude mcp add puppeteer --scope user -- npx -y @anthropic/puppeteer-mcp
```

### Verify Installation

After adding MCP servers, restart Claude Code and verify:

```bash
# List all configured MCP servers
claude mcp list

# Or in Claude Code chat:
# "What MCP tools do you have access to?"
```

### Remove an MCP Server

```bash
claude mcp remove <server-name> --scope user
```

---

## Comprehensive Tool Comparison Matrix

### Deployment Options Overview

**Key:** ✅ Available | ❌ Not Available | 🔶 Same pricing across all methods | 💰 Different pricing


| Tool Provider             | MCP | API | SDK          | Self-Hosted | Cloud Browser    | Pricing Model      | CF Bypass  |
| ------------------------- | --- | --- | ------------ | ----------- | ---------------- | ------------------ | ---------- |
| **ScraperAPI**            | ❌   | ✅   | ✅            | ❌           | ❌                | 🔶 Unified credits | 99.99%     |
| **Browserbase**           | ✅   | ✅   | ✅ (PW/PP/SH) | ❌           | ✅                | 🔶 Session-based   | 95%+       |
| **Hyperbrowser**          | ✅   | ✅   | ✅ (Py)       | ❌           | ✅                | 🔶 Unified         | TBD        |
| **Oxylabs Web Scraper**   | ✅   | ✅   | ❌            | ❌           | ✅                | 🔶 Unified         | TBD        |
| **Oxylabs Browser Agent** | ✅   | ❌   | ❌            | ❌           | ✅                | Credit-based       | TBD        |
| **Oxylabs Unblocking**    | ❌   | ✅   | ❌            | ❌           | ✅                | Enterprise         | 97%+ (N/A) |
| **ScrapingBee**           | ✅   | ✅   | ❌            | ❌           | ❌                | 🔶 Unified credits | 95%+       |
| **Firecrawl**             | ✅   | ✅   | ❌            | ✅ (Docker)  | ✅                | 💰 Cloud vs Self   | TBD        |
| **Browser Use**           | ✅   | ❌   | ✅ (Py)       | ✅ (Free)    | ✅ (Paid)         | 💰 Cloud vs Self   | Poor       |
| **JigsawStack**           | ❌   | ✅   | ✅            | ❌           | ❌                | 🔶 Token-based     | TBD        |
| **Exa**                   | ✅   | ✅   | ✅ (TS/Py)    | ❌           | ❌                | 🔶 Credit-based    | N/A        |
| **Playwright**            | ✅   | ✅   | ✅ (Multi)    | ✅           | ✅ (via services) | Free + Cloud       | Low        |
| **Puppeteer**             | ✅   | ✅   | ✅ (Node)     | ✅           | ✅ (via services) | Free + Cloud       | Low        |
| **Browserless**           | ❌   | ✅   | ✅ (PW/PP)    | ✅ (Docker)  | ✅                | 💰 Cloud vs Docker | 95%+       |
| **Airtop**                | ✅   | ✅   | ✅ (Py/TS)    | ❌           | ✅                | Credit-based       | ~90%       |
| **FlareSolverr**          | ❌   | ✅   | ❌            | ✅ (Docker)  | ❌                | Free               | 60-75%     |
| **Agent Browser**         | ❌   | ✅   | ✅ (CLI)      | ✅           | ❌                | Free               | Low        |


**Legend:** PW=Playwright, PP=Puppeteer, SH=Stagehand, Py=Python, TS=TypeScript

---

### Detailed Deployment Options by Tool

#### 1. ScraperAPI

**[Pricing Source](https://www.scraperapi.com/pricing/)** | **[API Docs](https://scraperapi.com/documentation)**


| Option  | Language    | Setup           | Pros                 | Cons                  | Cost    |
| ------- | ----------- | --------------- | -------------------- | --------------------- | ------- |
| **MCP** | N/A         | ❌ Not available | N/A                  | No MCP server exists  | N/A     |
| **API** | Any         | REST calls      | Universal, simple    | Manual implementation | 🔶 Same |
| **SDK** | Node/Python | npm/pip install | Type safety, helpers | Language-locked       | 🔶 Same |


**Unified Pricing:** All options use same credit pool

- Free: 1,000 credits (7-day trial: 5,000)
- Hobby: $49/mo - 100K credits
- Startup: $149/mo - 1M credits
- Business: $299/mo - 3M credits

**Recommendation:** Use **API** for AI workflows (direct HTTP calls), **SDK** for production apps

---

#### 2. Browserbase

**[Docs](https://docs.browserbase.com/)** | **[MCP GitHub](https://github.com/browserbase/mcp-server-browserbase)** | **[Blog](https://www.browserbase.com/blog/recommending-playwright)**


| Option               | Language | Setup           | Pros                        | Cons               | Cost    |
| -------------------- | -------- | --------------- | --------------------------- | ------------------ | ------- |
| **MCP + Stagehand**  | N/A      | Remote or stdio | AI-native, best for LLMs    | MCP learning curve | 🔶 Same |
| **API + Playwright** | Multi    | SDK + API key   | Industry standard, mature   | More code          | 🔶 Same |
| **API + Puppeteer**  | Node     | SDK + API key   | Node-native                 | Node-only          | 🔶 Same |
| **API + Stagehand**  | TS/Py    | Framework + API | AI primitives (act/extract) | Newer framework    | 🔶 Same |


**Unified Pricing:** Session-based (all options)

- Free: 1 hour/month
- Hobby: $39/mo - included features
- **CF Partnership:** Built-in stealth, 95%+ success

**Recommendation:** Use **MCP + Stagehand** for AI agents, **API + Playwright** for traditional automation

---

#### 3. Hyperbrowser

**[Website](https://www.hyperbrowser.ai)** | **[MCP](https://www.pulsemcp.com/servers/hyperbrowserai-hyperbrowser)** | **[Python SDK](https://github.com/hyperbrowserai/python-sdk)**


| Option                     | Language | Setup               | Pros                             | Cons               | Cost    |
| -------------------------- | -------- | ------------------- | -------------------------------- | ------------------ | ------- |
| **MCP**                    | N/A      | `claude mcp add`    | Scrape/crawl/extract tools       | MCP-only access    | 🔶 Same |
| **Python SDK**             | Python   | pip install         | Native Python, LangChain support | Python-only        | 🔶 Same |
| **API**                    | Any      | REST calls          | Universal                        | Manual integration | 🔶 Same |
| **+ Playwright/Puppeteer** | Multi    | Connect to sessions | Full browser control             | More complex       | 🔶 Same |


**Unified Pricing:** TBD (check website for current rates)

- Cloud browsers on-demand
- AI agent support (Claude, OpenAI)

**Recommendation:** Use **MCP** for simple tasks, **Python SDK** for LangChain workflows

---

#### 4. Oxylabs - THREE Products, ONE MCP Server

**[Oxylabs Main](https://oxylabs.io)** | **[MCP Integration](https://github.com/oxylabs/oxylabs-mcp)**

**IMPORTANT:** Oxylabs offers THREE separate products with different credentials:

##### Product 1: Web Scraper API (username/password) - ✅ AVAILABLE

**[Web Scraper API](https://oxylabs.io/products/scraper-api/web)** | **[API Docs](https://developers.oxylabs.io/scraping-solutions/web-scraper-api)**

**Description:** Effortlessly bypass anti-scraping systems and extract large volumes of data from even the most complex websites.


| MCP Tools                | Description                      | Credentials       |
| ------------------------ | -------------------------------- | ----------------- |
| `universal_scraper`      | Scrape any URL with JS rendering | Username/Password |
| `google_search_scraper`  | Google search results            | Username/Password |
| `amazon_search_scraper`  | Amazon product search            | Username/Password |
| `amazon_product_scraper` | Amazon product details           | Username/Password |


**Get Credentials:** [https://dashboard.oxylabs.io/](https://dashboard.oxylabs.io/) (free trial)
**CF Bypass:** TBD (to be tested)
**Status:** Available for testing

##### Product 2: Browser Agent (API key) - ✅ AVAILABLE

**[Browser Agent](https://aistudio.oxylabs.io/apps/browser_agent)** | **[AI Studio](https://aistudio.oxylabs.io/)**


| MCP Tools          | Description                                 | Credentials |
| ------------------ | ------------------------------------------- | ----------- |
| `ai_scraper`       | Natural language → structured JSON/Markdown | API Key     |
| `ai_crawler`       | Multi-page crawling with AI extraction      | API Key     |
| `ai_browser_agent` | AI-controlled browser automation            | API Key     |
| `ai_search`        | Web search with content extraction          | API Key     |


**Get API Key:** [https://aistudio.oxylabs.io/settings/api-key](https://aistudio.oxylabs.io/settings/api-key) (1000 free credits)
**Pricing:** $12/mo minimum for AI Studio
**Status:** 18/1000 credits used, API key verified but MCP failing

##### Product 3: Unblocking Browser (username/password) - ❌ NOT AVAILABLE

**[Unblocking Browser](https://oxylabs.io/products/unblocking-browser)**

**Status:** Requires sales enablement (enterprise product), not accessible via free trial

---

##### MCP Configuration (All Available Tools)

```bash
# Install with credentials for Web Scraper API + Browser Agent (8 tools total)
claude mcp add oxylabs --scope user \
  -e OXYLABS_USERNAME=your_username \
  -e OXYLABS_PASSWORD=your_password \
  -e OXYLABS_AI_STUDIO_API_KEY=your_api_key \
  -- uvx oxylabs-mcp
```

**Recommendation:**

- Use **Web Scraper API tools** for traditional scraping (universal_scraper, google/amazon scrapers)
- Use **Browser Agent tools** for AI-native extraction with natural language prompts
- Skip **Unblocking Browser** (not available without enterprise sales)

---

#### 5. ScrapingBee

**[Pricing](https://www.scrapingbee.com/pricing/)** | **[MCP Server](https://mcp.scrapingbee.com/)**


| Option  | Language | Setup             | Pros                | Cons          | Cost    |
| ------- | -------- | ----------------- | ------------------- | ------------- | ------- |
| **MCP** | N/A      | Remote server URL | LLM-ready, no setup | Remote only   | 🔶 Same |
| **API** | Any      | REST calls        | Universal, flexible | Manual coding | 🔶 Same |


**Unified Pricing:** Credit-based (multipliers apply)

- Free: 1,000 credits
- Freelance: $49/mo - 250K credits
- Business: $249/mo - 3M credits
- **Stealth proxy:** 75x credits (Business+ only)

**Proxy Cost Multipliers:**

- Basic: 1x | JS rendering: 5x | Premium: 10x | Premium+JS: 25x | **Stealth: 75x**

**Recommendation:** Use **MCP** for AI, start without premium, escalate to stealth only if blocked

---

#### 6. Firecrawl

**[Open Source](https://github.com/firecrawl/firecrawl)** | **[Cloud API](https://www.firecrawl.dev/)** | **[MCP Server](https://docs.firecrawl.dev/mcp-server)**


| Option          | Language | Setup          | Pros                    | Cons                     | Cost          |
| --------------- | -------- | -------------- | ----------------------- | ------------------------ | ------------- |
| **MCP (Cloud)** | N/A      | HTTP transport | Managed, fast           | Requires API key         | Cloud pricing |
| **MCP (Self)**  | N/A      | Stdio local    | Your LLM, no API limits | Setup complexity         | Free          |
| **Cloud API**   | Any      | REST + API key | Managed, enterprise     | Monthly fees             | 💰 Paid       |
| **Self-Hosted** | Any      | Docker         | Free, full control      | **Not production-ready** | Free          |


**Pricing:**

- **Cloud:** 500 credits/mo free, then $20/mo
- **Self-Hosted:** Free (AGPL-3.0 license)
- **Note:** Self-hosted uses your configured LLM, cloud uses managed LLM

**Recommendation:** Use **Cloud** for production, **Self-hosted** for development/testing

---

#### 7. Browser Use

**[Cloud](https://docs.browser-use.com/)** | **[Self-Hosted](https://github.com/browser-use/browser-use)** | **[MCP](https://docs.browser-use.com/customize/integrations/mcp-server)**


| Option         | Language | Setup        | Pros               | Cons                          | Cost       |
| -------------- | -------- | ------------ | ------------------ | ----------------------------- | ---------- |
| **MCP Cloud**  | N/A      | Remote URL   | Hosted, no infra   | API key required              | 💰 Cloud   |
| **MCP Self**   | Python   | Local server | Free, customizable | Local compute                 | Free + LLM |
| **Python SDK** | Python   | pip install  | Full control       | Requires OpenAI/Anthropic key | Free + LLM |


**Pricing:**

- **Self-Hosted:** Free (+ your LLM costs)
- **Cloud:** TBD pricing tiers
- **Note:** Poor CF bypass (documented), not recommended for protected sites

**Recommendation:** Use **Self-hosted** for development, avoid for CF-protected sites

---

#### 8. JigsawStack

**[Pricing](https://jigsawstack.com/pricing)** | **[API Docs](https://jigsawstack.com/docs/api-reference/ai/scrape)**


| Option  | Language | Setup           | Pros             | Cons                 | Cost    |
| ------- | -------- | --------------- | ---------------- | -------------------- | ------- |
| **MCP** | N/A      | ❌ Not available | N/A              | No MCP server exists | N/A     |
| **API** | Any      | REST            | Universal access | Manual coding        | 🔶 Same |
| **SDK** | JS/Py    | npm/pip         | Type safety      | Language-locked      | 🔶 Same |


**Unified Pricing:** Token-based (all models)

- **$1.40 per million tokens** (2.5x-36x cheaper than old pricing)
- Free tier available
- AI scraper: Natural language → structured JSON

**Recommendation:** Use **API** for AI workflows (direct HTTP calls), **SDK** for production

---

#### 9. Exa

**[Pricing](https://exa.ai/pricing)** | **[MCP](https://docs.exa.ai/reference/exa-mcp)** | **[API](https://exa.ai/)**


| Option         | Language | Setup                           | Pros              | Cons            | Cost    |
| -------------- | -------- | ------------------------------- | ----------------- | --------------- | ------- |
| **MCP Hosted** | N/A      | Remote `https://mcp.exa.ai/mcp` | No setup          | Remote only     | 🔶 Same |
| **API**        | Any      | REST                            | Universal         | Manual          | 🔶 Same |
| **SDK**        | TS/Py    | npm/pip                         | Type safety, docs | Language-locked | 🔶 Same |


**Unified Pricing:** Credit-based

- Free: 1,000 credits
- Then: $49 for 8,000 credits
- **Special:** `get_code_context_exa` for programming docs

**Recommendation:** Use **MCP** for AI search, **get_code_context_exa** for programming help

---

#### 10. Playwright

**[Official](https://playwright.dev/)** | **[MCP](https://github.com/modelcontextprotocol/servers/tree/main/src/playwright)**


| Option            | Language              | Setup             | Pros                 | Cons          | Cost                |
| ----------------- | --------------------- | ----------------- | -------------------- | ------------- | ------------------- |
| **MCP Local**     | Python/Node           | `claude mcp add`  | AI automation        | Local browser | Free                |
| **Direct SDK**    | Multi (Py/JS/Java/C#) | Language package  | Full control, mature | More code     | Free                |
| **+ Browserbase** | Multi                 | Remote connection | Cloud + CF bypass    | Monthly fee   | Browserbase pricing |
| **+ Browserless** | Multi                 | Remote/Docker     | Self-host or cloud   | Setup         | Browserless pricing |


**Pricing:**

- **Local:** Free
- **Cloud options:** See Browserbase/Browserless pricing

**Recommendation:** Use **Local** for development, **+ Browserbase** for CF bypass in production

---

#### 11. Puppeteer

**[Official](https://pptr.dev/)** | **[MCP](https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer)**


| Option            | Language | Setup             | Pros                | Cons             | Cost                |
| ----------------- | -------- | ----------------- | ------------------- | ---------------- | ------------------- |
| **MCP Local**     | Node     | `claude mcp add`  | AI automation       | Node-only, local | Free                |
| **Direct SDK**    | Node     | npm install       | Mature, widely used | Node-only        | Free                |
| **+ Browserbase** | Node     | Remote connection | Cloud + CF bypass   | Monthly fee      | Browserbase pricing |
| **+ Browserless** | Node     | Remote/Docker     | Self-host or cloud  | Setup            | Browserless pricing |


**Pricing:**

- **Local:** Free
- **Cloud options:** See Browserbase/Browserless pricing

**Recommendation:** Use **Playwright instead** (multi-language, better features)

---

#### 12. Browserless

**[GitHub](https://github.com/browserless/browserless)** | **[Cloud](https://www.browserless.io/)**


| Option          | Language | Setup            | Pros               | Cons         | Cost    |
| --------------- | -------- | ---------------- | ------------------ | ------------ | ------- |
| **Docker Self** | PW/PP    | Docker container | Free, 100% control | Self-managed | Free    |
| **Cloud**       | PW/PP    | API connection   | Managed, stealth   | Monthly fees | 💰 Paid |


**Pricing:**

- **Docker:** Free (SSPL license for commercial)
- **Cloud:**
  - Free: 1,000 units
  - Starter: $50/mo - 5,000 units
  - Scale: $200/mo - 25,000 units
- **Performance:** 5x faster, 1/3 cost vs local (reported)
- **95%+ CF bypass** with stealth

**Recommendation:** Use **Docker** for cost-conscious projects, **Cloud** for managed stealth

---

#### 13. Airtop

**[Website](https://developers.airtop.ai/)** | **[SDK](https://github.com/airtop-ai/airtop-python-sdk)**


| Option             | Language | Setup       | Pros        | Cons        | Cost         |
| ------------------ | -------- | ----------- | ----------- | ----------- | ------------ |
| **API**            | Any      | REST        | Universal   | Manual      | Credit-based |
| **Python SDK**     | Python   | pip install | Pythonic    | Python-only | Credit-based |
| **TypeScript SDK** | TS       | npm install | Type safety | TS-only     | Credit-based |


**Pricing:** Credit-based

- Free: 1,000 credits, 3 sessions
- Starter: $26/mo
- Professional: $80/mo
- Enterprise: $342/mo
- **~90% CF bypass** with multi-tab support

**Recommendation:** Good for multi-tab workflows, but expensive for simple scraping

---

#### 14. FlareSolverr

**[GitHub](https://github.com/FlareSolverr/FlareSolverr)** | **[Guide](https://www.zenrows.com/blog/flaresolverr)**


| Option     | Language | Setup            | Pros              | Cons                       | Cost |
| ---------- | -------- | ---------------- | ----------------- | -------------------------- | ---- |
| **Docker** | Any      | Docker container | Free, open source | **CAPTCHA solvers broken** | Free |


**Pricing:** Free

- **Critical Issue (Jan 2026):** CAPTCHA solvers nonfunctional
- **60-75% CF bypass** (declining)
- Can't keep up with Cloudflare updates
- 100-200MB RAM per instance

**Recommendation:** **Not recommended** for production (broken solvers, declining success rate)

---

#### 15. Agent Browser

**[GitHub](https://github.com/vercel-labs/agent-browser)** | **[Website](https://agent-browser.dev/)**


| Option  | Language | Setup          | Pros                   | Cons         | Cost |
| ------- | -------- | -------------- | ---------------------- | ------------ | ---- |
| **CLI** | Any      | npm install -g | Free, 93% less context | No CF bypass | Free |


**Pricing:** Free (open source)

- Rust CLI + Node.js daemon
- Snapshot-based refs (efficient)
- 50+ commands
- **Low CF bypass** (no stealth)

**Recommendation:** Use for **non-CF sites** with AI agents (context efficiency)

---

## Tool Selection Guide

### Quick Decision Tree

**1. What's your primary use case?**

- **CF Bypass Critical** → ScraperAPI (99.99%) → Browserbase (95%+) → Oxylabs Web Scraper (TBD)
- **Multi-tab + Authentication** → Airtop → Browserbase → Hyperbrowser
- **Simple Scraping (no CF)** → Playwright/Puppeteer (free) → ScrapingBee
- **AI-Powered Extraction** → JigsawStack → ScraperAPI
- **Code/Documentation Search** → Exa (get_code_context_exa)

**2. Are you using AI agents (Claude/GPT)?**

- **YES with MCP available** → Use MCP (no cost penalty, better integration)
- **YES without MCP** → Use API via curl/HTTP or SDK
- **NO** → Use SDK for production apps, API for flexibility

**3. What's your budget?**

- **Free** → Playwright/Puppeteer local, Browserless Docker, Firecrawl self-hosted
- **Low (<$50/mo)** → ScraperAPI, Browserbase, ScrapingBee free tiers
- **Enterprise** → Oxylabs Web Scraper, Browserbase Pro, ScraperAPI Business

### Deployment Decision Matrix


| Scenario                  | Recommended Approach | Tools                                                                             |
| ------------------------- | -------------------- | --------------------------------------------------------------------------------- |
| **AI Agent (Claude/GPT)** | MCP or API           | Browserbase (MCP), Exa (MCP), ScraperAPI (API), JigsawStack (API)                 |
| **Production App**        | SDK/API              | ScraperAPI (SDK), JigsawStack (SDK), Oxylabs Web Scraper (MCP), Browserbase (SDK) |
| **CF Bypass Critical**    | Premium Cloud        | ScraperAPI (API/SDK), Browserbase (MCP), Oxylabs Web Scraper (MCP)                |
| **Cost-Conscious**        | Self-Hosted          | Firecrawl (MCP/Self), Browserless (Docker), Playwright (MCP)                      |
| **Rapid Prototyping**     | MCP or API           | Any with MCP support, or ScraperAPI/JigsawStack via API                           |
| **Complex Navigation**    | Cloud Browser        | Browserbase (MCP), Hyperbrowser (MCP), Oxylabs Web Scraper (MCP)                  |
| **Multi-Tab + Auth**      | AI Browser           | Airtop (MCP), Browserbase (MCP), Hyperbrowser (MCP)                               |
| **Simple Data**           | API                  | ScrapingBee (MCP), JigsawStack (API), ScraperAPI (API)                            |
| **Code Search**           | Specialized          | Exa (MCP: get_code_context_exa)                                                   |


### MCP vs API vs SDK Pros/Cons


| Aspect             | MCP          | API       | SDK         | Self-Hosted |
| ------------------ | ------------ | --------- | ----------- | ----------- |
| **Setup**          | Easy (1 cmd) | Medium    | Medium      | Hard        |
| **AI Integration** | Native       | Manual    | Manual      | Manual      |
| **Flexibility**    | Limited      | High      | High        | Highest     |
| **Maintenance**    | Auto         | Manual    | Auto (deps) | Self        |
| **Cost**           | Same*        | Same*     | Same*       | Free/Infra  |
| **Best For**       | AI agents    | Universal | Production  | Control     |


*For most providers, pricing is unified across access methods

### When to Use Each Deployment Method

**Use MCP When:**

- Building AI agents (Claude, GPT)
- Want simplest setup (1 command)
- Don't need custom code logic
- Provider has unified pricing (most do)

**Use API When:**

- No MCP server available (ScraperAPI, JigsawStack)
- Need universal compatibility
- Using language without SDK
- Want maximum flexibility

**Use SDK When:**

- Building production applications
- Need type safety and IDE support
- Want helper functions and error handling
- Can accept language lock-in

**Use Self-Hosted When:**

- Cost is primary concern
- Need full control over infrastructure
- Have DevOps resources
- Don't need premium CF bypass

---

## Tool Details

### Exa Web Search

**Description:** The web search API for AI Agents. Search and crawl with unmatched control, accuracy, and speed.


|              |                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------- |
| **Website**  | [https://exa.ai/exa-api](https://exa.ai/exa-api)                                               |
| **API Docs** | [https://exa.ai/docs/reference/getting-started](https://exa.ai/docs/reference/getting-started) |
| **MCP**      | [https://exa.ai/docs/reference/exa-mcp](https://exa.ai/docs/reference/exa-mcp)                 |
| **Category** | AI-Powered Semantic Search                                                                     |
| **Best For** | Searching for content rather than scraping specific pages                                      |


---

### Browser Use

**Description:** The AI browser agent. Control browsers using LLM for autonomous web tasks.


|                        |                                                                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Website**            | [https://browser-use.com/](https://browser-use.com/)                                                                               |
| **Docs (Cloud)**       | [https://docs.cloud.browser-use.com/get-started/human-quickstart](https://docs.cloud.browser-use.com/get-started/human-quickstart) |
| **GitHub (Self-host)** | [https://github.com/browser-use/browser-use](https://github.com/browser-use/browser-use)                                           |
| **Category**           | AI Browser Agent                                                                                                                   |
| **Best For**           | AI-driven browser automation tasks                                                                                                 |


---

### Agent Browser

**Description:** Headless browser automation CLI for AI agents by Vercel. Fast Rust CLI with Node.js fallback.


|                  |                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------- |
| **Website**      | [https://agent-browser.dev](https://agent-browser.dev)                                       |
| **GitHub (CLI)** | [https://github.com/vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser) |
| **Category**     | CLI Tool                                                                                     |
| **Best For**     | Fast, lightweight browser automation for AI agents                                           |


---

### Hyperbrowser

**Description:** Cloud browsers on-demand via API. Plug and play Puppeteer, Playwright, or AI agents and scale your scraping, testing, and automation without infrastructure headaches.


|                  |                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------- |
| **Website**      | [https://www.hyperbrowser.ai](https://www.hyperbrowser.ai)                                   |
| **GitHub**       | [https://github.com/hyperbrowserai](https://github.com/hyperbrowserai)                       |
| **SDK (Python)** | [https://github.com/hyperbrowserai/python-sdk](https://github.com/hyperbrowserai/python-sdk) |
| **MCP**          | [https://github.com/hyperbrowserai/mcp](https://github.com/hyperbrowserai/mcp)               |
| **Category**     | Cloud Browser Service                                                                        |
| **Best For**     | Scalable browser automation without infrastructure                                           |


---

### Browserbase

**Description:** We help AI use the web. Autonomously read, write, and perform tasks on the web with a serverless browser.


|              |                                                                                                            |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| **Website**  | [https://www.browserbase.com](https://www.browserbase.com)                                                 |
| **MCP**      | [https://docs.browserbase.com/integrations/mcp/setup](https://docs.browserbase.com/integrations/mcp/setup) |
| **Category** | Cloud Browser Service                                                                                      |
| **Best For** | AI agents needing full browser sessions with Cloudflare partnership                                        |


---

### Browserless

**Description:** Build reliable browser automation without fighting bots. Built for stealth, scale, and reliability. Run automations, scrape data, empower AI agents. Deploy headless browsers in Docker. Run on our cloud or bring your own. Free for non-commercial uses.


|                          |                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| **Website**              | [https://www.browserless.io](https://www.browserless.io)                                 |
| **GitHub**               | [https://github.com/browserless/](https://github.com/browserless/)                       |
| **GitHub (Headless)**    | [https://github.com/browserless/browserless](https://github.com/browserless/browserless) |
| **GitHub (Browser-Use)** | [https://github.com/browserless/browser-use](https://github.com/browserless/browser-use) |
| **Category**             | Cloud Browser Service                                                                    |
| **Best For**             | Stealth scraping with CAPTCHA solving, self-host option                                  |


---

### ScraperAPI

**Description:** Collect data from any public website with our web scraping API, without worrying about proxies, browsers, or CAPTCHA handling.


|              |                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------- |
| **Website**  | [https://scraperapi.com](https://scraperapi.com)                                             |
| **MCP**      | [https://github.com/scraperapi/scraperapi-mcp](https://github.com/scraperapi/scraperapi-mcp) |
| **Category** | Scraping API Service                                                                         |
| **Best For** | High-success Cloudflare bypass via simple API proxy                                          |


---

### Airtop

**Description:** Airtop is a cloud browser platform that allows you, your AI Agent, or your automation tools to control a web browser in the cloud. Airtop solves all browser automation problems by offering you a simple, scalable, and cost-effective service to run large numbers of browser sessions in the cloud and automate actions via natural language, all through a powerful, yet simple API.


|                  |                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| **Website**      | [https://www.airtop.ai](https://www.airtop.ai)                                                   |
| **SDK (Python)** | [https://github.com/airtop-ai/airtop-python-sdk](https://github.com/airtop-ai/airtop-python-sdk) |
| **Category**     | AI Browser Platform                                                                              |
| **Best For**     | Natural language browser control, multi-tab navigation                                           |


---

### Oxylabs Unblocking Browser

**Description:** Unblocking Browser for AI Agents & Advanced Automation.


|              |                                                                                                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Website**  | [https://oxylabs.io/products/unblocking-browser](https://oxylabs.io/products/unblocking-browser)                                                                                     |
| **MCP**      | [https://developers.oxylabs.io/scraping-solutions/unblocking-browser/integration-with-mcp](https://developers.oxylabs.io/scraping-solutions/unblocking-browser/integration-with-mcp) |
| **Category** | Proxy Network / Unblocking Service                                                                                                                                                   |
| **Best For** | Residential proxies, geo-specific scraping                                                                                                                                           |


---

### ScrapingBee

**Description:** The Best Web Scraping API to Avoid Getting Blocked. The ScrapingBee web scraping API handles headless browsers, rotates proxies for you, and offers AI-powered data extraction.


|              |                                                            |
| ------------ | ---------------------------------------------------------- |
| **Website**  | [https://www.scrapingbee.com](https://www.scrapingbee.com) |
| **MCP**      | [https://mcp.scrapingbee.com](https://mcp.scrapingbee.com) |
| **Category** | Scraping API Service                                       |
| **Best For** | API-based scraping with proxy rotation and AI extraction   |


---

### JigsawStack

**Description:** AI Web Scraper for dynamic websites. Scrape any website instantly and get consistent structured data in seconds without writing any CSS selector code.


|              |                                                                                                                |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| **Website**  | [https://jigsawstack.com/ai-web-scraper](https://jigsawstack.com/ai-web-scraper)                               |
| **MCP**      | [https://github.com/JigsawStack/jigsawstack-mcp-server](https://github.com/JigsawStack/jigsawstack-mcp-server) |
| **API Docs** | [https://jigsawstack.com/docs/api-reference/ai/scrape](https://jigsawstack.com/docs/api-reference/ai/scrape)   |
| **Category** | AI-Powered Scraper                                                                                             |
| **Best For** | Structured data extraction without CSS selectors                                                               |


---

### Firecrawl

**Description:** Turn websites into LLM-ready data. Power your AI apps with clean web data from any website. It's also open source.


|              |                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| **Website**  | [https://www.firecrawl.dev](https://www.firecrawl.dev)                                                 |
| **GitHub**   | [https://github.com/firecrawl/firecrawl](https://github.com/firecrawl/firecrawl)                       |
| **MCP**      | [https://github.com/firecrawl/firecrawl-mcp-server](https://github.com/firecrawl/firecrawl-mcp-server) |
| **Category** | LLM Data Extraction                                                                                    |
| **Best For** | Converting web pages to clean markdown for LLMs                                                        |


---

### FlareSolverr

**Description:** Proxy server to bypass Cloudflare and DDoS-GUARD protection. Self-hosted Docker solution.


|              |                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------- |
| **GitHub**   | [https://github.com/FlareSolverr/FlareSolverr](https://github.com/FlareSolverr/FlareSolverr) |
| **Category** | Self-Hosted Proxy                                                                            |
| **Best For** | Free, self-hosted Cloudflare bypass (requires Docker)                                        |


---

## Background: Original Problems

### Project 1: Singapore Rental Search

**Project:** Singapore rental search (PropertyGuru scraping)
**Issue:** PropertyGuru uses aggressive Cloudflare bot protection that blocks Playwright/Puppeteer
**Goal:** Find reliable, autonomous web scraping solutions that work across various anti-bot protections

**Original test URL:** `https://www.propertyguru.com.sg/listing/for-rent-st-patrick-s-residences-60219284`

**Previous failures:**

- Puppeteer: FAILED (Cloudflare detects automation)
- Playwright + stealth plugin: FAILED (Cloudflare detects automation)
- Playwright with `--disable-blink-features=AutomationControlled`: FAILED
- Manual checkbox clicking: FAILED (deeper fingerprint detection)
- Chrome CDP: FAILED (complex setup)

### Project 2: AMEX Krisflyer Hilton Voucher Lookup

**Project:** AMEX Krisflyer Hilton Voucher Lookup
**Issue:** I can manually access the Test URL but tools I have tried cannot, and there is not even any authentication necessary
**Goal:** Vibe coded a website [https://amex-krisflyer-hilton-voucher-lookup.lovable.app](https://amex-krisflyer-hilton-voucher-lookup.lovable.app) to streamline hote room availability across multiple dates for a single hotel with a specific Hilton hotel voucher and need to access Hilton website using get params and scrape a small amount of data on the webpage (have requested API access but never heard back)

Find reliable, autonomous browser tool that can access, navigate include opening up and navigating to new tabs, logging in, and scraping small amounts of data such as last invoice data and amount owed and downloading a PDF invoice.

**Original test URL:** `https://www.hilton.com/en/book/reservation/rooms/?ctyhocn=SINGI&arrivalDate=2026-02-19&departureDate=2026-02-20&groupCode=ZKFA25&room1NumAdults=1&cid=OH%2CMB%2CAPACAMEXKrisFlyerComplimentaryNight%2CMULTIBR%2COfferCTA%2COffer%2CBook`

**Previous failures:**

- Puppeteer: FAILED (Cloudflare detects automation)
- Playwright: FAILED (Cloudflare detects automation)
- Browserless: FAILED (Cloudflare detects automation)
- ScraperAPI: FAILED (Cloudflare detects automation)
- Jigsawstack: FAILED (Cloudflare detects automation)
- Firecrawl: FAILED (Cloudflare detects automation)

### Project 3: Personal Administrative Workflow Assistant

**Project:** Personal Administrative Workflow Assistant
**Issue:** Many websites have bot detection (Cloudflare, Recaptcha) and MFA when conducting login/authentication that browser access tools struggle to overcome.
**Goal:** Find reliable, autonomous browser tool that can access, navigate include opening up and navigating to new tabs, logging in, and scraping small amounts of data such as last invoice data and amount owed and downloading a PDF invoice.

**Original test URL:** `https://www.folsom.ca.us/government/finance/utility-billing`

**Previous failures:**

- Puppeteer: FAILED (Cloudflare detects automation)
- Airtop: FAILED (still promising however as it can navigate to new tabs and bypass some bot detection but test URL often fails even when being clicked by a human)

---

## Testing Plan

### Phase 1: Research & Documentation

- Research all tools listed above
- Document API key requirements for each
- Document free tiers and pricing
- Add any additional tools discovered

### Phase 2: Setup & Testing

For each tool:

- Sign up for free tier (if applicable)
- Get API keys
- Install MCP using `claude mcp add --scope user` (if MCP available)
- For tools without MCP (ScraperAPI, JigsawStack): Install SDK or use API directly
- Test with project Test URLs
- Document success/failure and response time
- Record cost used

### Phase 3: Comparison & Selection

- Create comparison table with all results
- Identify top 3-5 tools for different use cases
- Document recommended default strategy

### Phase 4: Implementation

- Create user-level configuration file
- Create user-level skill(s)
- Document usage examples
- Test across multiple projects

---

## Evaluation Criteria

For each tool, test and document:

### 1. Cloudflare Bypass Success

- Can it fetch pages protected by Cloudflare?
- Success rate percentage
- Does it require manual intervention?
- Test with the Test URLs provided in project examples

### 2. Data Quality

1. Test with PropertyGuru listing Test URL to extract:

- Building name
- Price (S$/month)
- Bedrooms (including +1 bonus rooms)
- Bathrooms
- Square footage
- Agent name
- MRT proximity
- Unit number (if available)
- District

1. Test with AMEX Krisflyer Hilton Voucher Lookup Test URL to extract:

- Room availability
- Room rates

1. Test with Personal Administrative Workflow Assistant Test URL to navigate to the log in page (note: it will open a new tab in a website with domain [https://www.invoicecloud.com](https://www.invoicecloud.com)) and successfully perform a login with the email "[apelosi@alu.mit.edu](mailto:apelosi@alu.mit.edu)" and password "HXtB$iyu9QWY".

### 3. Performance

- Response time (< 60 seconds ideal)
- Reliability (does it work consistently?)

### 4. Cost

- Free tier limits
- Cost per request/session
- Monthly pricing tiers

### 5. Ease of Integration

- Setup complexity (Docker, API key, etc.)
- Code required
- Maintenance burden

### 6. Execution Burden

- Does this run in a remote cloud not self-hosted or managed? This is least execution burden.
- Does this run locally in a container that does not disrupt user's ability to operate their machine? This is medium execution burden.
- Does this run as browser use on the user's machine and impede their ability to use their machine for other tasks? This is very high execution burden.

---

## Desired End State

### User-Level Configuration (~/.claude/claude.md or ~/.claude/web-scraping.md)

```markdown
## Web Scraping & Browser Automation

### Configured Tools

| Tool | Purpose | Access Method | API Key Env Var | Free Tier |
|------|---------|---------------|----------------|-----------|
| ScraperAPI | High-success Cloudflare bypass | API/SDK (no MCP) | SCRAPERAPI_API_KEY | 1,000 credits |
| Browserbase | Cloud browser with stealth | MCP | BROWSERBASE_API_KEY | 1 hour/mo |
| JigsawStack | AI-powered structured extraction | API/SDK (no MCP) | JIGSAWSTACK_API_KEY | Free tier |
| Oxylabs | Residential proxies | MCP | OXYLABS_USERNAME/PASSWORD | Trial |
| ScrapingBee | API scraping with proxy rotation | MCP | SCRAPINGBEE_API_KEY | 1,000 credits |
| Firecrawl | LLM-ready data | MCP | FIRECRAWL_API_KEY | 500 credits/mo |
| FlareSolverr | Self-hosted fallback | Docker/API | N/A | Unlimited |

### Default Strategy (Tiered Fallback)

1. **ScraperAPI** (highest success, API-based - use via HTTP calls or SDK)
2. **Browserbase** (cloud browser with stealth - MCP)
3. **JigsawStack** (AI extraction - use via HTTP calls or SDK)
4. **ScrapingBee** (proxy rotation - MCP)
5. **FlareSolverr** (self-hosted, free)
6. **Manual fallback** (clipboard paste)

### When to Use Each Tool

- **ScraperAPI**: Default for most web scraping, especially sites with bot protection (API/SDK)
- **JigsawStack**: When you need AI-powered structured data extraction (API/SDK)
- **Browserbase**: When you need browser sessions or complex navigation (MCP)
- **Oxylabs**: When you need specific geo-location or residential IPs (MCP)
- **ScrapingBee**: When you need proxy rotation and rendering (MCP)
- **Firecrawl**: When you need LLM-ready markdown output (MCP)
- **FlareSolverr**: Cost-conscious projects, lower success tolerance
- **Exa.ai**: When searching for content rather than scraping specific pages (MCP)
```

### User-Level Skill (/scrape or /web-fetch)

A skill that:

1. Accepts a URL or list of URLs
2. Optionally accepts data fields to extract
3. Optionally accepts login credentials for authentication (MFA can be user intervention for now)
4. Optionally accepts actions to perform (eg, "download latest invoice")
5. Automatically chooses the best tool based on:
  - URL domain (known difficult sites use premium tools)
  - User's available API keys
  - Cost preferences
6. Handles fallbacks automatically
7. Returns extracted data in structured format
8. **For tools without MCP** (ScraperAPI, JigsawStack):
  - Makes direct HTTP API calls using Bash/curl or Python scripts
  - Or uses their SDKs via Python/Node.js scripts

**Example usage:**

```
/scrape https://www.propertyguru.com.sg/listing/... --extract price,beds,sqft
```

The skill would:

- Detect PropertyGuru = known Cloudflare protection
- Try ScraperAPI first (if key configured) - makes API call via HTTP
- Fall back to Browserbase (MCP) if ScraperAPI fails
- Fall back to JigsawStack (API) if Browserbase fails
- Parse and return: `{"price": "S$6,500", "beds": "3+1", "sqft": "1,399"}`

**Implementation Notes:**

- ScraperAPI: `curl "http://api.scraperapi.com/?api_key=$SCRAPERAPI_API_KEY&url=<target_url>"`
- JigsawStack: `curl -X POST https://api.jigsawstack.com/v1/ai/scrape -H "x-api-key: $JIGSAWSTACK_API_KEY" -d '{"url": "<target_url>"}'`

---

## Troubleshooting

### MCP servers not showing up?

1. Verify installation: `claude mcp list`
2. Check `~/.claude.json` has the server entry
3. Check Node.js is installed: `node --version`
4. Restart Claude Code completely (Cmd+Shift+P → "Developer: Reload Window")

### API calls failing?

1. Verify env vars are set in the MCP config
2. Check API key validity at provider dashboard
3. Check API usage/limits

### Permission errors with npx?

```bash
# Make sure npx can run without sudo
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

### Remove and re-add an MCP server

```bash
claude mcp remove <server-name> --scope user
claude mcp add <server-name> --scope user -- <command> [args...]
```

---

## Additional Tools to Research

Tools mentioned but not yet detailed:

1. **Apify** - Actor-based scraping (1500+ pre-built actors)
2. **Zyte** - Enterprise scraping (may be overkill)
3. **Bright Data** - Residential proxy network (expensive but effective)
4. **Selenium Grid** - Self-hosted browser grid (complexity?)
5. **Puppeteer Stealth** - Open source plugin (already tested as failed)
6. **Undetected Chromedriver** - Python library for Chrome automation

---

## Success Metrics

The final solution should achieve:

- **>90% success rate** on Cloudflare-protected sites
- **<60 second response time** for most requests
- **<$50/month cost** for typical personal project usage (~500 requests/month)
- **Zero manual intervention** required (fully autonomous)
- **Easy to use** across all projects (one skill or simple function call)
- **Multiple fallback options** configured

---

## Additional Context

**User preference:** Test free options first, skip failed URLs, no partial action completion

**Docker Setup Status:**

- Docker is running on the machine
- The following MCPs are installed in Docker: Browserbase, Cloudflare Browser Rendering, Hyperbrowser, Playwright, Puppeteer
- FlareSolverr setup is NOT complete
- For testing purposes, only use Docker when it is a necessity (like FlareSolverr)
- For projects with high number of automations, Docker (local or remote) may make sense, but for testing, prefer user-level MCP installations

---

## Testing Tools Without MCP Servers

### ScraperAPI (No MCP - Use API/SDK)

**Quick Test (API via curl):**

```bash
# Store API key
export SCRAPERAPI_API_KEY="your_key_here"

# Test with PropertyGuru URL
curl "http://api.scraperapi.com/?api_key=$SCRAPERAPI_API_KEY&url=https://www.propertyguru.com.sg/listing/for-rent-st-patrick-s-residences-60219284"
```

**Using Node.js SDK:**

```bash
npm install scraperapi-sdk
```

```javascript
const scraperapiClient = require('scraperapi-sdk')('YOUR_API_KEY');
scraperapiClient.get('https://www.propertyguru.com.sg/listing/...')
  .then(response => console.log(response))
  .catch(error => console.log(error));
```

**Using Python SDK:**

```bash
pip install scraperapi-python
```

```python
from scraperapi import ScraperAPIClient
client = ScraperAPIClient('YOUR_API_KEY')
result = client.get('https://www.propertyguru.com.sg/listing/...')
print(result.text)
```

### JigsawStack (No MCP - Use API/SDK)

**Quick Test (API via curl):**

```bash
# Store API key
export JIGSAWSTACK_API_KEY="your_key_here"

# Test with PropertyGuru URL
curl -X POST https://api.jigsawstack.com/v1/ai/scrape \
  -H "x-api-key: $JIGSAWSTACK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.propertyguru.com.sg/listing/for-rent-st-patrick-s-residences-60219284"
  }'
```

**Using Node.js SDK:**

```bash
npm install jigsawstack
```

```javascript
const JigsawStack = require('jigsawstack');
const jigsaw = JigsawStack({ apiKey: 'YOUR_API_KEY' });
const result = await jigsaw.ai.scrape({ url: 'https://www.propertyguru.com.sg/listing/...' });
console.log(result);
```

**Using Python SDK:**

```bash
pip install jigsawstack
```

```python
from jigsawstack import JigsawStack
jigsaw = JigsawStack(api_key='YOUR_API_KEY')
result = jigsaw.ai.scrape(url='https://www.propertyguru.com.sg/listing/...')
print(result)
```

### Integration with Claude Code

When testing these tools in Claude Code, use Python/Node.js scripts with the SDKs, or make direct API calls via curl in Bash commands. Example:

```python
# scrape_with_scraperapi.py
import os
from scraperapi import ScraperAPIClient
from dotenv import load_dotenv

load_dotenv()
client = ScraperAPIClient(os.getenv('SCRAPERAPI_API_KEY'))

url = "https://www.propertyguru.com.sg/listing/for-rent-st-patrick-s-residences-60219284"
result = client.get(url)

# Parse and extract data from result.text
print(result.text)
```

Then run with: `uv run scrape_with_scraperapi.py`