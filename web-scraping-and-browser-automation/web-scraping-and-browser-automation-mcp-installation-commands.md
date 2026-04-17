# MCP Server Installation Commands (User-Level)

**⚠️ SECURITY: All API keys are stored in `.env` file (not committed to git)**

---

## Quick Start - RECOMMENDED APPROACH

### Run the Automated Script

This script loads API keys from `.env` and properly installs all web scraping MCP servers:

```bash
cd "/Users/apelosi/Library/Mobile Documents/com~apple~CloudDocs/Development/VS Code and Claude Code/web-scraping-and-browser-automation"
chmod +x reinstall-mcp-servers.sh
./reinstall-mcp-servers.sh
```

**What it does:**

1. Loads API keys from `.env` file
2. Verifies all required keys are present
3. Removes existing web scraping MCP servers
4. Reinstalls all 10 servers properly with `claude mcp add --scope user`
5. Verifies installation

**Servers installed:**

- Puppeteer (no key needed)
- Playwright (no key needed)
- Hyperbrowser
- Browserbase + Gemini
- Exa
- Browser Use
- Oxylabs (8 tools total: 4 Unblocking Browser + 4 Browser Agent)
- ScrapingBee
- Firecrawl
- Airtop

**NOT modified:** context7, airtable, google-docs-mcp (other projects)

---

## Manual Installation (NOT RECOMMENDED)

⚠️ **Warning:** Do NOT copy these commands with your real API keys into this file!

All credentials should be stored in `.env` file. The automated script above is the recommended approach.

If you need to manually install a specific server, follow this pattern:

```bash
# Example pattern (replace with your actual .env values)
source .env  # Load environment variables
claude mcp add <server-name> --scope user \
  -e API_KEY_VAR="$API_KEY_VAR" \
  -- npx -y <package-name>
```

---

## Setup Instructions

### 1. Create .env File

Copy the example file:

```bash
cp .env.example .env
```

Then edit `.env` and add your real API keys.

### 2. Verify .env File

Required environment variables:

- `EXA_API_KEY`
- `BROWSER_USE_API_KEY`
- `HYPERBROWSER_API_KEY`
- `BROWSERBASE_PROJECT_ID`
- `BROWSERBASE_API_KEY`
- `GEMINI_API_KEY`
- `AIRTOP_API_KEY`
- `OXYLABS_API_USERNAME` (for Unblocking Browser product)
- `OXYLABS_API_PASSWORD` (for Unblocking Browser product)
- `OXYLABS_API_KEY` (for Browser Agent product)
- `SCRAPINGBEE_API_KEY`
- `FIRECRAWL_API_KEY`

The script will verify all keys are present before installation.

### 3. Run the Script

```bash
chmod +x reinstall-mcp-servers.sh
./reinstall-mcp-servers.sh
```

### 4. Restart Claude Code

Press `Cmd+Shift+P` → Type `Developer: Reload Window` → Press Enter

### 5. Verify Installation

```bash
claude mcp list
```

Should show all 10 web scraping MCPs + your other MCPs (context7, airtable, google-docs-mcp).

---

## Where to Get API Keys


| Service                        | Signup URL                                                                                   | Free Tier          |
| ------------------------------ | -------------------------------------------------------------------------------------------- | ------------------ |
| **Exa**                        | [https://exa.ai/](https://exa.ai/)                                                           | 1,000 credits      |
| **Browser Use**                | [https://browser-use.com/](https://browser-use.com/)                                         | Free (+ LLM cost)  |
| **Hyperbrowser**               | [https://www.hyperbrowser.ai/](https://www.hyperbrowser.ai/)                                 | TBD                |
| **Browserbase**                | [https://www.browserbase.com/](https://www.browserbase.com/)                                 | 1 hour/mo          |
| **Airtop**                     | [https://www.airtop.ai/](https://www.airtop.ai/)                                             | 1,000 credits      |
| **Oxylabs Unblocking Browser** | [https://dashboard.oxylabs.io/](https://dashboard.oxylabs.io/)                               | 1-week free trial  |
| **Oxylabs Browser Agent**      | [https://aistudio.oxylabs.io/settings/api-key](https://aistudio.oxylabs.io/settings/api-key) | 1,000 free credits |
| **ScrapingBee**                | [https://www.scrapingbee.com/](https://www.scrapingbee.com/)                                 | 1,000 credits      |
| **Firecrawl**                  | [https://www.firecrawl.dev/](https://www.firecrawl.dev/)                                     | 500 credits/mo     |


---

## Troubleshooting

### Script fails with "Missing required environment variables"

- Check that `.env` file exists
- Verify all required keys are in `.env`
- Make sure there are no typos in variable names

### Script fails with ".env file not found"

- Run from the correct directory
- Copy `.env.example` to `.env` first

### If a server install fails:

1. Check Node.js: `node --version`
2. Check npm: `npm --version`
3. For Oxylabs: check `uv --version`
4. Try removing first: `claude mcp remove <server> --scope user`
5. Then retry installation

### Oxylabs specific issues:

**Oxylabs provides TWO products requiring THREE credentials:**

- **Unblocking Browser**: Requires `OXYLABS_API_USERNAME` + `OXYLABS_API_PASSWORD`
  - Get credentials at [https://dashboard.oxylabs.io/](https://dashboard.oxylabs.io/)
  - Provides: `universal_scraper`, `google_search_scraper`, `amazon_search_scraper`, `amazon_product_scraper`
- **Browser Agent**: Requires `OXYLABS_API_KEY`
  - Get API key at [https://aistudio.oxylabs.io/settings/api-key](https://aistudio.oxylabs.io/settings/api-key)
  - Provides: `ai_scraper`, `ai_crawler`, `ai_browser_agent`, `ai_search`

**Installation with ALL credentials (provides access to all 8 tools):**

```bash
claude mcp add oxylabs --scope user \
  -e OXYLABS_USERNAME=your_username \
  -e OXYLABS_PASSWORD=your_password \
  -e OXYLABS_AI_STUDIO_API_KEY=your_api_key \
  -- uvx oxylabs-mcp
```

**Troubleshooting Oxylabs:**

- If tools fail with empty responses: verify trial hasn't expired at dashboard.oxylabs.io
- If `ai_`* tools say "API key not set": verify OXYLABS_AI_STUDIO_API_KEY is configured
- If `*_scraper` tools fail: verify username/password at dashboard.oxylabs.io
- Both products can be used simultaneously with all 3 credentials

### Servers don't show up after restart:

1. Verify: `claude mcp list`
2. Check `~/.claude.json` has servers in `mcpServers` section
3. Restart Claude Code completely (quit and reopen)

---

## Security Notes

✅ **Good practices:**

- All credentials in `.env` file
- `.env` is in `.gitignore` (never committed)
- `.env.example` has placeholders only

❌ **Never do this:**

- Don't put real API keys in scripts
- Don't put real API keys in markdown files
- Don't commit `.env` to git
- Don't share your `.env` file

