# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Content research and aggregation tool that scrapes AI/tech news from multiple sources and stores structured JSON for AI agents to consume. The project has three main components:

1. **Content Scraping** - Scrapes RSS feeds, Reddit, Hacker News, and LinkedIn
2. **Newsletter System** - Email newsletter management with subscriber tracking
3. **Writing Agents** - AI-powered iterative writing using LangChain and Claude API

---

## Common Commands

### Content Scraping

```bash
# Scrape all sources (RSS, Reddit, Hacker News, LinkedIn)
npm run scrape

# Alternative:
node src/index.js scrape
```

Output saved to `data/YYYY-MM-DD/`:
- `trending.json` - Top 20 trending items ranked by engagement
- `all.json` - All items combined from all sources
- `rss.json`, `reddit.json`, `hackernews.json`, `linkedin.json` - Per-source data

### Newsletter Management

```bash
# Show newsletter statistics
npm run newsletter:stats

# Add a subscriber
npm run newsletter:add user@example.com "John Doe"

# List all newsletters
npm run newsletter

# Generate newsletter from trending data (basic)
npm run newsletter:generate 2026-03-22

# Generate AI-enhanced newsletter (using writing agents)
npm run newsletter:generate:enhanced 2026-03-22

# Send newsletter
npm run newsletter:send <newsletter-id>

# Test send to a single email
npm run newsletter:test <newsletter-id> test@example.com
```

### Query Data

```bash
# Interactive query mode
npm run query
```

---

## Architecture

### Content Scraping Flow

```
config/sources.json (configuration)
        ↓
src/index.js (ContentScraper orchestrator)
        ↓
src/fetchers/
├── rss.js          # 17 RSS feeds (OpenAI, Anthropic, Claude Blog, arXiv, etc.)
├── reddit.js       # 7 AI subreddits (min 100 upvotes)
├── hackernews.js   # AI-filtered stories (min 50 points)
└── linkedin.js     # LinkedIn KOL posts via BrightData SERP
        ↓
data/YYYY-MM-DD/*.json (daily output)
```

### Newsletter System

```
src/newsletter/
├── api/newsletter-service.js    # Main service class
├── models/
│   ├── subscriber.js             # Subscriber data model
│   └── newsletter.js             # Newsletter model with generateIterative()
├── utils/
│   ├── email-sender.js           # SMTP/SendGrid email sending
│   └── helpers.js                # Helper functions
├── cli.js                         # CLI interface
└── data/
    ├── subscribers.json           # Subscriber storage
    └── newsletters.json           # Newsletter storage
```

### Writing Agents (LangChain + Claude API)

```
src/writing-agents/
├── core/
│   └── iterative-workflow.js     # Writer ↔ Critic orchestration loop
├── agents/
│   ├── writer-agent.js           # Generates/revises newsletter content
│   └── critic-agent.js           # Reviews content with 1-10 quality scoring
├── models/
│   ├── draft.js                  # Tracks newsletter versions and history
│   └── critique.js               # Stores feedback and quality metrics
├── utils/
│   ├── prompt-templates.js       # Current agent prompts
│   ├── prompt-templates-improved.js  # Improved prompts (ready for testing)
│   └── cache-manager.js          # Response caching for cost reduction
└── config/
    └── agent-config.js           # Configuration & cost estimation
```

**Writing Agent Workflow:**
```
Articles (from trending.json)
    ↓
Writer Agent → Initial Draft
    ↓
Critic Agent → Review & Score (6 criteria: accuracy, clarity, value, completeness, voice, citations)
    ↓
Quality Check → Is score ≥ threshold? (default: 8/10)
    ↓ if NO:  Writer Agent → Revise based on critique → loop back to Critic
    ↓ if YES: Finalize → Newsletter created
```

---

## Configuration

### Source Configuration (`config/sources.json`)

- **rssFeeds**: 17 RSS sources with categories (ai-news, ai-research, company-news, etc.)
- **trendingSources.reddit**: 7 AI subreddits with minScore and maxAge filters
- **trendingSources.hackernews**: AI keyword filtering with minPoints threshold
- **linkedin**: KOL profiles file path, batch size, enrichment settings

### Environment Variables (`.env`)

```bash
# Content scraping
BRIGHTDATA_API_KEY=...         # Required for LinkedIn scraping
BRIGHTDATA_ZONE=mcp_unlocker   # BrightData zone name

# Newsletter
EMAIL_PROVIDER=smtp            # smtp, sendgrid, or console
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Writing Agents
WRITING_AGENTS_ENABLED=true
WRITING_AGENTS_MAX_ITERATIONS=3
WRITING_AGENTS_QUALITY_THRESHOLD=8
WRITING_AGENTS_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_API_KEY=sk-ant-...   # Required for writing agents
```

---

## Data Models

### Scraped Item Structure

```json
{
  "id": "unique_id",
  "source": "rss|reddit|hackernews|linkedin",
  "sourceName": "Source Name",
  "category": "ai-news|company-news|research",
  "title": "Article Title",
  "url": "https://...",
  "summary": "Content summary...",
  "content": "Full content...",
  "pubDate": "2026-03-22T10:00:00Z",
  "age_hours": 24,
  "engagement": {
    "upvotes": 4500,
    "comments": 823
  },
  "scraped_at": "2026-03-22T10:00:00Z"
}
```

### Trending Item Structure

```json
{
  "rank": 1,
  "score": 4750,
  "sources": ["reddit", "hackernews"],
  "title": "Article Title",
  "url": "https://...",
  "summary": "...",
  "keywords": ["AI", "GPT"],
  "engagement": { "upvotes": 4500, "comments": 823 }
}
```

---

## Important Design Decisions

1. **No Vercel Deployment** - This is a Node.js CLI tool, not a web application. Uses `dotenv` for config, not Vercel env vars.

2. **Daily Data Organization** - Each scrape run creates a new `data/YYYY-MM-DD/` folder. Output files are overwritten on re-scrape for the same date.

3. **Quality Threshold for Writing Agents** - Default is 8/10. Agent loop terminates early when threshold is met to save API costs. Max iterations: 3.

4. **BrightData for LinkedIn** - LinkedIn scraping requires BrightData SERP API with zone `mcp_unlocker`. KOL profiles loaded from external path.

5. **Cache Manager** - Writing agents cache LLM responses for 7 days (TTL) to reduce API costs. ~70% cache hit rate expected.

6. **ES Modules** - Project uses `"type": "module"` in package.json. All imports use `.js` extensions.

---

## Testing Writing Agents

The project has two prompt template sets for writing agents:

1. **Current**: `prompt-templates.js` - Basic prompts
2. **Improved**: `prompt-templates-improved.js` - Enhanced with examples, rubrics, anti-patterns

To test improved prompts, update the import in agents/writer-agent.js and agents/critic-agent.js from `'./prompt-templates.js'` to `'./prompt-templates-improved.js'`.

---

## Key Dependencies

- `rss-parser` - RSS feed parsing
- `axios` - HTTP requests
- `cheerio` - HTML parsing
- `nodemailer` - Email sending
- `@langchain/anthropic` - LangChain integration with Claude
- `@langchain/langgraph` - Agent workflow orchestration

---

## LinkedIn KOL Configuration

LinkedIn KOL (Key Opinion Leader) profiles are stored in an external file:
```
/home/vankhoa/projects/aikeytake/workspace/marketing/linkedin_kol_clean.json
```

This path is configured in `config/sources.json` under `linkedin.profilesFile`.
