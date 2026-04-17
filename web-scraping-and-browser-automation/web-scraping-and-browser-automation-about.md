# Web Scraping & Browser Automation Testing Project

## Primary Project Goal

This project is focused on **testing, evaluating, and selecting web scraping and browser automation tools** that can reliably bypass Cloudflare protection and handle complex browser automation tasks across multiple real-world projects.

## Essential Context Files

**Before starting any task, read these files to understand the project:**

1. `**WEB_SCRAPING_TOOLS_CONTEXT.md`** - Comprehensive guide to all web scraping tools, MCP installation, tool comparison matrix, deployment options, and research findings
2. `**MCP_INSTALLATION_COMMANDS.md`** - User-level MCP server installation instructions and troubleshooting
3. `**TESTING_PLAN.md`** - Detailed testing strategy, priority order, test procedures, and success criteria
4. `**TEST_RESULTS.md**` - Test results tracking document (update this as tests are completed)

**Key Context:**

- Multiple MCP servers are configured at user-level in `~/.claude.json`
- Testing focuses on 3 real-world projects: PropertyGuru (Singapore rentals), Hilton voucher lookup, and Folsom utility billing
- Goal is to identify reliable tools for Cloudflare bypass and complex browser automation
- All tools should be tested via MCP when possible (unified pricing, better AI integration)

## Project Structure

- `my-files/` - User's input files (data, documents, browser tasks)
- `output/` - Save ALL generated files here (reports/, pdfs/, images/)
- `examples/` - Reference samples (don't modify)

## Important Rules

1. Always save generated files to output/ folder
2. Use plain language - no technical jargon
3. When errors occur, explain in simple terms with solutions
4. Reference files with @ syntax when explaining to users
5. **For web scraping tasks:** Always check `WEB_SCRAPING_TOOLS_CONTEXT.md` first to understand available tools and their capabilities
6. **For MCP testing:** Follow the test procedures in `TESTING_PLAN.md` and update `TEST_RESULTS.md` with results

## Python Scripts & Environment Variables

- **Always use `uv`** - prefer `uv add` over `uv pip install`
- Use `uvx` to run CLI tools (e.g., `uvx ruff check`)
- **For scripts using API keys or secrets:**
  - `uv run` does NOT auto-load `.env` files
  - Always add `from dotenv import load_dotenv` and call `load_dotenv()` at the start
  - Ensure `python-dotenv` is installed: `uv add python-dotenv`

## MCP Servers Available for Testing

The following user-level MCP servers are configured and should be available for testing:

**Scraping APIs:**

- `scraperapi` - High-success Cloudflare bypass (99.99%)
- `scrapingbee` - API scraping with proxy rotation
- `jigsawstack` - AI-powered structured extraction
- `firecrawl` - LLM-ready markdown conversion
- `oxylabs` - Enterprise unblocking browser

**Cloud Browsers:**

- `browserbase` - Cloud browser with stealth (95%+ CF bypass)
- `hyperbrowser` - Cloud browser on-demand
- `browser-use` - AI browser agent
- `airtop` - AI browser platform (multi-tab support)

**Local Browsers:**

- `playwright` - Local browser automation
- `puppeteer` - Local browser automation

**Other Tools:**

- `exa` - Semantic web search (not for scraping, but for research)
- `context7` - Context/memory storage
- `airtable` - Data app integration
- `google-docs-mcp` - Google Docs integration

**Testing Instructions:**

- See `TESTING_PLAN.md` for detailed test procedures
- Update `TEST_RESULTS.md` after each test
- Test URLs and target data are documented in `TESTING_PLAN.md`

## Tool Usage Guidelines

- Always use `WebSearch` tool for web search
- If links are provided, always use the `WebFetch` tool for fetching contents from links
- Always use `AskUserQuestion` tool when you need clarifying questions answered
- **For web scraping:** Use MCP servers directly (they're configured at user-level)
- **For API-based tools without MCP:** Use HTTP calls or SDKs as documented in `WEB_SCRAPING_TOOLS_CONTEXT.md`

## Claude Code Questions

For questions about Claude Code features (hooks, commands, skills, MCP, settings, etc.), use `Task` with `subagent_type='claude-code-guide'` to look up official docs before answering.