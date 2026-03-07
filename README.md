# Social Automation — Content Research Tool

Content aggregation tool that scrapes AI news from multiple sources and stores structured JSON for AI agents to consume.

## What It Does

- Scrapes **17 RSS feeds** (TechCrunch, OpenAI, Anthropic, Claude Blog, Google AI, DeepMind, HuggingFace, arXiv, and more)
- Scrapes **Reddit** (7 AI subreddits, top posts with 100+ upvotes)
- Scrapes **Hacker News** (AI-related stories with 50+ points)
- Scrapes **LinkedIn KOL posts** via BrightData SERP (top 20 KOLs from your list)
- Outputs a `trending.json` with the top 20 ranked items
- Everything saved as structured JSON for AI agents

## Quick Start

```bash
cd /home/vankhoa/projects/social-automation
npm install
npm run scrape
```

## The Only Command You Need

```bash
npm run scrape
```

Output saved to `data/YYYY-MM-DD/`:

| File | Contents |
|------|----------|
| `all.json` | All items from all sources combined |
| `trending.json` | Top 20 items ranked by engagement score |
| `rss.json` | All RSS feed items |
| `reddit.json` | All Reddit posts |
| `hackernews.json` | All Hacker News stories |
| `linkedin.json` | LinkedIn KOL posts via BrightData |

## Project Structure

```
social-automation/
├── src/
│   ├── fetchers/
│   │   ├── rss.js          # 17 RSS feeds
│   │   ├── reddit.js       # 7 AI subreddits
│   │   ├── hackernews.js   # HN top stories
│   │   └── linkedin.js     # LinkedIn KOL posts via BrightData SERP
│   ├── utils/
│   │   └── logger.js
│   ├── cli.js
│   └── index.js            # Main scraper
├── config/
│   └── sources.json        # All source configuration
├── data/
│   └── YYYY-MM-DD/         # Daily scraped output
├── .env                    # API keys
└── package.json
```

## Configuration

### Environment Variables (`.env`)

Already configured. Key variables:

```bash
BRIGHTDATA_API_KEY=...        # Used for LinkedIn KOL scraping
BRIGHTDATA_ZONE=mcp_unlocker  # BrightData zone
ANTHROPIC_API_KEY=...         # Claude API (for future AI processing)
```

### Sources (`config/sources.json`)

**RSS Feeds (17 sources):**
- TechCrunch AI, The Gradient, MIT Technology Review AI
- OpenAI Blog, Anthropic Blog, **Claude Blog**
- Google AI Blog, DeepMind Blog, Hugging Face Blog
- Meta Engineering, Netflix Tech Blog, AWS ML Blog
- Microsoft AI Blog, NVIDIA Blog, LinkedIn Engineering
- arXiv AI (cs.AI), arXiv Machine Learning (cs.LG)

**Reddit:** MachineLearning, artificial, ArtificialIntelligence, deeplearning, OpenAI, LocalLLaMA, singularity

**Hacker News:** keyword-filtered (AI, LLM, GPT, Anthropic, etc.), 50+ points

**LinkedIn:** top 20 KOLs from `workspace/marketing/linkedin_kol_clean.json`, scraped via BrightData SERP

### Adding an RSS Feed

Edit `config/sources.json`:

```json
{
  "rssFeeds": [
    {
      "name": "My Blog",
      "url": "https://example.com/feed.xml",
      "category": "ai-news",
      "enabled": true
    }
  ]
}
```

### Adjusting LinkedIn KOL Limit

Edit `config/sources.json`:

```json
{
  "linkedin": {
    "limit": 20
  }
}
```

## Reading the Data

```bash
# View today's trending items
cat data/$(date +%Y-%m-%d)/trending.json | jq '.items[] | {rank, title, score}'

# View all items from a specific source
cat data/$(date +%Y-%m-%d)/all.json | jq '[.items[] | select(.source == "reddit")]'

# Search by keyword
cat data/$(date +%Y-%m-%d)/all.json | jq '[.items[] | select(.title | contains("GPT"))]'

# View LinkedIn KOL posts
cat data/$(date +%Y-%m-%d)/linkedin.json | jq '.items[]'
```

## Using with AI Agents

Point the agent at today's data folder:

```
Read data/$(date +%Y-%m-%d)/trending.json and create a LinkedIn post about the top trending AI story.
```

Or for deeper research:

```
Read data/$(date +%Y-%m-%d)/all.json and summarize the most important AI developments from the last 24 hours.
```

## Troubleshooting

**LinkedIn returns 0 items:**
- Check logs for BrightData errors: `cat logs/*.log | grep -i linkedin`
- Confirm the KOL file exists: `ls /home/vankhoa/projects/aikeytake/workspace/marketing/linkedin_kol_clean.json`
- The BrightData zone `mcp_unlocker` must exist in your BrightData account

**RSS feed fails:**
- Some feeds go down temporarily — the scraper skips them and continues
- Check logs in `logs/` for specific feed errors

**No data for today:**
```bash
# Run the scraper
npm run scrape

# Check if data folder was created
ls data/$(date +%Y-%m-%d)/
```
