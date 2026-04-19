// Sources configuration - bundled directly, no filesystem access needed
export default {
  rssFeeds: [
    { name: "TechCrunch AI", url: "https://techcrunch.com/category/artificial-intelligence/feed/", category: "ai-news", enabled: true },
    { name: "The Gradient", url: "https://thegradient.pub/rss/", category: "ai-research", enabled: true },
    { name: "MIT Technology Review AI", url: "https://www.technologyreview.com/feed/", category: "tech-news", enabled: true },
    { name: "OpenAI Blog", url: "https://openai.com/blog/rss.xml", category: "company-news", enabled: true },
    { name: "Anthropic Blog", url: "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic.xml", category: "company-news", enabled: true },
    { name: "Claude Blog", url: "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_claude.xml", category: "company-news", enabled: true },
    { name: "Google AI Blog", url: "https://blog.google/technology/ai/rss/", category: "company-news", enabled: true },
    { name: "DeepMind Blog", url: "https://deepmind.google/blog/rss.xml", category: "research", enabled: true },
    { name: "Hugging Face Blog", url: "https://huggingface.co/blog/feed.xml", category: "ml-frameworks", enabled: true },
    { name: "Meta Engineering", url: "https://engineering.fb.com/feed/", category: "company-engineering", enabled: true },
    { name: "Netflix Tech Blog", url: "https://medium.com/feed/netflix-techblog", category: "company-engineering", enabled: true },
    { name: "AWS Machine Learning Blog", url: "https://aws.amazon.com/blogs/machine-learning/feed/", category: "cloud-ai", enabled: true },
    { name: "Microsoft AI Blog", url: "https://blogs.microsoft.com/ai/feed/", category: "company-news", enabled: true },
    { name: "NVIDIA Technical Blog", url: "https://blogs.nvidia.com/feed/", category: "company-engineering", enabled: true },
    { name: "LinkedIn Engineering", url: "https://engineering.linkedin.com/blog.rss", category: "company-engineering", enabled: true },
    { name: "arXiv AI", url: "https://rss.arxiv.org/rss/cs.AI", category: "research-papers", enabled: true },
    { name: "arXiv Machine Learning", url: "https://rss.arxiv.org/rss/cs.LG", category: "research-papers", enabled: true }
  ],
  linkedin_browser: { enabled: true, accounts: ["julienchaumond"], maxPostsPerAccount: 5, maxAgeHours: 48, delayBetweenAccountsMs: 10000 },
  apiSources: [
    {
      id: "goodailist", name: "Good AI List", enabled: true, weight: 0.5,
      request: { url: "https://goodailist.com/api/repos", method: "GET", params: { page: 1, limit: 100, sort: "star_1d", order: "desc" } },
      response: { itemsPath: "repos" },
      mapping: {
        title: "repo", link: "https://github.com/{repo}", summary: "description", content: "description",
        author: { field: "repo", split: "/", index: 0 }, pubDate: "created_at", category: "category",
        tags: { field: "keywords", split: "," }, "engagement.upvotes": "star_1d",
        "metadata.stars": "stars", "metadata.star_7d": "star_7d", "metadata.forks": "forks", "metadata.language": "language"
      }
    },
    {
      id: "producthunt", name: "Product Hunt", enabled: true,
      auth: { type: "oauth2_client_credentials", tokenUrl: "https://api.producthunt.com/v2/oauth/token", clientIdEnv: "PRODUCT_HUNT_API_KEY", clientSecretEnv: "PRODUCT_HUNT_API_SECRET" },
      request: {
        url: "https://api.producthunt.com/v2/api/graphql", method: "POST",
        graphql: { query: "query($first: Int!, $order: PostsOrder!, $postedAfter: DateTime!) { posts(first: $first, order: $order, postedAfter: $postedAfter) { edges { node { name tagline description url website votesCount commentsCount createdAt topics { edges { node { name } } } user { name } } } } }", variables: { first: 30, order: "VOTES" } },
        computedVariables: { postedAfter: { type: "daysAgo", days: 7 } }
      },
      response: { itemsPath: "data.posts.edges", itemUnwrap: "node" },
      filter: { field: "votesCount", min: 50 },
      mapping: {
        title: "name", link: "url", summary: "tagline", content: ["tagline", "description"],
        author: { path: "user.name" }, pubDate: "createdAt",
        category: { path: "topics.edges", map: "node.name", index: 0 },
        tags: { path: "topics.edges", map: "node.name" },
        "engagement.upvotes": "votesCount", "engagement.comments": "commentsCount", "metadata.website": "website"
      }
    }
  ],
  linkedin: { profilesFile: process.env.LINKEDIN_KOL_PROFILES_FILE || "./data/linkedin_kol_sample.json", enabled: true, batchSize: 8, budgetPerRun: 25, checkIntervalHours: 24, timeRange: "w", resultsPerBatch: 10, enrichContent: true, enrichConcurrency: 5 },
  youtube: { channels: [{ name: "Andrej Karpathy", channelId: "UC之以A5_BH8q-8v6Fn4qF5A", enabled: false }, { name: "Yannic Kilcher", channelId: "UC媒介ucH6r6tiKnM2LTC1cw", enabled: false }], enabled: false },
  keywords: {
    primary: ["artificial intelligence", "machine learning", "deep learning", "LLM", "GPT", "Claude", "transformer", "neural network", "AGI", "AI research"],
    secondary: ["computer vision", "NLP", "reinforcement learning", "diffusion model", "multimodal", "fine-tuning", "RAG", "agent", "LangChain", "vector database"]
  },
  filtering: { minEngagementScore: 10, maxAgeHours: 48, deduplicationWindow: 72 },
  trendingSources: {
    reddit: { enabled: true, subreddits: ["MachineLearning", "artificial", "ArtificialIntelligence", "deeplearning", "OpenAI", "LocalLLaMA", "singularity"], minScore: 100, maxAge: "24h" },
    hackernews: { enabled: true, keywords: ["AI", "artificial intelligence", "machine learning", "deep learning", "GPT", "LLM", "OpenAI", "Anthropic", "Google AI", "neural network"], minPoints: 50 },
    twitter: { enabled: false, accounts: ["AndrewYNg", "ylecun", "OpenAI", "AnthropicAI", "GoogleAI"], minLikes: 100, maxTweetsPerAccount: 5, maxAgeHours: 24, delayBetweenAccountsMs: 3000 }
  },
  trendAnalysis: { minTrendScore: 70, sourceDiversity: true, engagementWeight: 0.6, recencyWeight: 0.4 }
};
