# 🎯 Current Capabilities: AI Agent Research Tool

**Project:** Content Research & Aggregation Tool
**Purpose:** Feed AI agents with organized, scraped content
**Date:** 2025-03-06
**Status:** Scraping Works, Agent Interface To Build

---

## ✅ What This Tool Does Right Now

### 1. 📥 Data Scraping (FULLY FUNCTIONAL)

The tool can automatically scrape content from multiple sources:

#### RSS Feeds (10+ sources)
- ✅ TechCrunch AI
- ✅ OpenAI Blog
- ✅ Anthropic News
- ✅ Google AI Blog
- ✅ arXiv AI/ML papers
- ✅ And more...

**Use case:** Get official announcements and blog posts

#### Reddit (7 subreddits)
- ✅ r/MachineLearning
- ✅ r/artificial
- ✅ r/ArtificialIntelligence
- ✅ r/deeplearning
- ✅ r/OpenAI
- ✅ r/LocalLLaMA
- ✅ r/singularity

**Data collected:**
- Upvotes, comments, awards
- Post titles and content
- Engagement metrics
- Age tracking

**Use case:** Find what the AI community is discussing

#### Hacker News
- ✅ Top AI-related stories
- ✅ Best stories (filtered by keywords)

**Keywords tracked:**
AI, machine learning, GPT, LLM, OpenAI, Anthropic, Google AI

**Use case:** Discover tech industry trends

#### LinkedIn (Optional)
- ✅ KOL (Key Opinion Leader) tracking
- ⚠️ Requires BrightData configuration

---

### 2. 🔄 Data Organization (MOSTLY FUNCTIONAL)

The tool organizes scraped data:

#### Automatic Processing
- ✅ **Deduplication**: Same story across sources → one entry
- ✅ **Scoring**: By engagement (upvotes, points, comments)
- ✅ **Filtering**: By age and relevance
- ✅ **Timestamping**: Track when content was created

#### Data Storage
- ✅ JSON format (easy to read/query)
- ✅ Structured data model
- ✅ Source tracking

---

### 3. 🔍 Query Interface (PARTIALLY FUNCTIONAL)

#### Current Status
- ✅ Raw data is saved to JSON files
- ✅ Can read files directly
- ❌ No CLI query interface yet
- ❌ No MCP server yet

#### Manual Query (Current Workflow)
```bash
# 1. Scrape data
npm run fetch

# 2. Read the JSON files
cat data/queue/*.json | jq '.[] | select(.score > 100)'

# 3. Or write a simple script
node -e "const data = require('./data/queue/latest.json'); console.log(data.filter(item => item.score > 100));"
```

---

## ❌ What This Tool Does NOT Do (By Design)

### NOT a Content Generator
- ❌ Does NOT write posts
- ❌ Does NOT create content
- ❌ Does NOT generate images
- ❌ Does NOT translate languages

**Why?** AI agents (like Claude) are better at this. The tool just feeds data to agents.

### NOT a Publisher
- ❌ Does NOT post to LinkedIn
- ❌ Does NOT post to Twitter
- ❌ Does NOT post to Facebook
- ❌ Does NOT schedule posts

**Why?** Human oversight is important for quality control.

### NOT an Automator
- ❌ Does NOT run on schedules
- ❌ Does NOT auto-post anything
- ❌ Does NOT have workflows

**Why?** You run it when you need data. Simple and on-demand.

---

## 🎯 How to Use This Tool (Right Now)

### For AI Agents

**Step 1: Scrape Data**
```bash
cd /home/vankhoa/projects/social-automation
npm run fetch
```

**Step 2: Access Data**
```bash
# View latest data
cat data/queue/*.json | jq

# Or read programmatically
const fs = require('fs');
const data = fs.readFileSync('data/queue/latest.json', 'utf8');
const items = JSON.parse(data);
```

**Step 3: AI Agent Creates Content**
```
Agent: "I'll read the scraped data and create engaging posts"
- Reads JSON files
- Identifies trending topics
- Writes creative content
- Adds business angle
- Generates translations
```

### For Humans

**Step 1: Scrape Data**
```bash
npm run fetch
```

**Step 2: Review Data**
```bash
# View what was scraped
ls -la data/queue/

# Read specific file
cat data/queue/1772813421296-1jiel2fs7.json | jq
```

**Step 3: Share with AI**
```
"Here's the scraped data. Can you write a LinkedIn post about the GPT-5 rumors with a French translation?"
```

---

## 📊 Data Structure

### What You Get

```json
{
  "id": "1772813421296-1jiel2fs7",
  "source": "reddit",
  "sourceName": "r/MachineLearning",
  "title": "GPT-5 Release Confirmed by OpenAI",
  "link": "https://reddit.com/r/MachineLearning/comments/...",
  "content": "Full post content here...",
  "pubDate": "2025-03-06T10:00:00Z",
  "queuedAt": "2025-03-06T10:05:00Z",
  "status": "queued",
  "metadata": {
    "upvotes": 4500,
    "comments": 823,
    "score": 95
  }
}
```

### Fields Available

- `id`: Unique identifier
- `source`: Where it came from (rss, reddit, hackernews)
- `sourceName`: Specific source name
- `title`: Headline
- `link`: Original URL
- `content`: Full content or excerpt
- `pubDate`: When published
- `metadata`: Engagement metrics
- `status`: Processing status

---

## 🚀 Example Workflow

### Complete Workflow Example

**Scenario:** You want to create a LinkedIn post about trending AI news

**Step 1: Scrape**
```bash
npm run fetch

# Output:
# 📰 Fetching from RSS feeds...
# ✅ RSS: 25 items
# 📱 Fetching from Reddit...
# ✅ Reddit: 47 items
# 📰 Fetching from Hacker News...
# ✅ Hacker News: 12 items
# ✅ Total: 84 items queued
```

**Step 2: Review**
```bash
# View high-score items
cat data/queue/*.json | jq '[.[] | select(.metadata.score > 80)] | sort_by(.metadata.score) | reverse | .[0:5]'
```

**Step 3: Feed to AI Agent**
```
"Here are the top 5 trending AI stories from the last 24 hours:

1. GPT-5 Release Confirmed (4500 upvotes)
   [content from JSON]

2. Google's New Gemini Model (3200 upvotes)
   [content from JSON]

...

Please create:
1. An engaging LinkedIn post about the #1 story
2. Add a business angle for local companies
3. Include a French translation
4. Add relevant hashtags"
```

**Step 4: AI Agent Creates**
```
Agent generates:
- Compelling hook
- Key insights
- Business implications
- Call-to-action
- French translation
- Hashtags
```

**Step 5: Human Reviews & Posts**
- Review the AI-generated content
- Make edits if needed
- Post manually to LinkedIn
- Engage with comments

---

## 🎯 What Makes This Tool Useful

### 1. Time Saving
- No more manual browsing of 10+ sources
- All data in one place
- Already scored by engagement

### 2. Quality Focus
- High-engagement content surfaced first
- Multiple sources for verification
- Community-curated (Reddit upvotes)

### 3. Agent-Friendly
- Clean JSON structure
- Easy to parse programmatically
- Rich metadata for filtering

### 4. Flexibility
- Run when you need data
- Query what you want
- Feed to any AI agent

---

## 📋 Current Commands

### Scraping Commands
```bash
# Fetch from all sources
npm run fetch

# Original command (still works)
node src/cli.js fetch
```

### Viewing Data
```bash
# View queue (basic)
npm run queue

# View specific file
cat data/queue/FILE_ID.json | jq

# View all queued items
ls -la data/queue/
```

---

## 🛠️ Configuration

### Edit Sources
```bash
nano config/sources.json
```

### Add RSS Feed
```json
{
  "rssFeeds": [
    {
      "name": "My AI Blog",
      "url": "https://example.com/feed.xml",
      "category": "ai-news",
      "enabled": true
    }
  ]
}
```

### Add Subreddit
```json
{
  "trendingSources": {
    "reddit": {
      "subreddits": [
        "MachineLearning",
        "artificial",
        "MyNewSubreddit"
      ]
    }
  }
}
```

---

## 🎯 Next Steps to Build

### To Make This Tool Complete:

1. **Simple Query CLI** (Priority)
   ```bash
   npm run query --trending
   npm run query --topic=GPT
   npm run query --fresh=6h
   ```

2. **MCP Server** (For AI Agents)
   - Expose scraping tools
   - Expose query tools
   - Standard interface for agents

3. **Better Query Interface**
   - Filter by score
   - Filter by topic
   - Filter by age
   - Sort options

4. **Documentation for Agents**
   - How to query data
   - Data structure reference
   - Example workflows

---

## 📊 What the Tool Provides

### Input (What You Give)
- ⚙️ Configuration (sources, filters)
- 📝 List of sources to scrape

### Output (What You Get)
- 📦 JSON files with structured data
- 🎯 Scored by engagement
- 🏷️ Categorized by source
- ⏰ Timestamped for freshness

### The Middle (What the Tool Does)
- 🔍 Scrapes multiple sources
- 🔄 Deduplicates content
- 📊 Scores by engagement
- 💾 Saves as JSON

### NOT Included (By Design)
- ❌ Content writing (AI agents do this)
- ❌ Publishing (humans do this)
- ❌ Scheduling (run on-demand)

---

## 🎯 Real-World Use Cases

### Use Case 1: Daily Social Media
```
1. Run: npm run fetch
2. Review: Check top 5 stories
3. Ask AI: "Write a post about story #3"
4. Post: Manual publish to LinkedIn
```

### Use Case 2: Newsletter
```
1. Run: npm run fetch
2. Query: Get all stories from last week
3. Ask AI: "Create a roundup newsletter"
4. Send: Manual email to list
```

### Use Case 3: Research
```
1. Run: npm run fetch
2. Query: Find all GPT-related stories
3. Ask AI: "Summarize GPT developments"
4. Use: Inform strategy or clients
```

---

## 🚀 Quick Start

```bash
# 1. Install
cd /home/vankhoa/projects/social-automation
npm install

# 2. Configure (optional)
nano config/sources.json

# 3. Scrape
npm run fetch

# 4. View data
ls data/queue/
cat data/queue/*.json | jq

# 5. Use with AI agent
"Read the scraped data and create a post about..."
```

---

## 📝 Summary

**This tool = Data scraper + organizer**

**What it does:**
- ✅ Scrapes content from multiple sources
- ✅ Organizes and scores it
- ✅ Saves as structured JSON
- ✅ Ready for AI agents to consume

**What you do:**
- Run the scraper when needed
- Feed data to AI agents
- Let agents create content
- Review and publish manually

**Simple, focused, effective.**

---

**Status:** ✅ Scraping Works | 🔨 Query Interface To Build
**Focus:** Research Tool, Not Publishing Platform
**Perfect for:** AI agents who need fresh, organized content data
