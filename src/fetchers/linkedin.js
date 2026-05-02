import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import createLogger from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';

const logger = createLogger('LinkedInFetcher');

const BRIGHTDATA_API_URL = 'https://api.brightdata.com/request';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(__dirname, '../../data/kol-state.json');

// Defaults (overridable via config/sources.json linkedin section)
const DEFAULTS = {
  batchSize: 8,          // KOLs per SERP query
  budgetPerRun: 25,      // Max SERP API calls per run (25 × 8 = 200 KOLs per run)
  checkIntervalHours: 24, // Re-check each KOL every 24h
  timeRange: 'w',        // w=week, d=day, m=month
  resultsPerBatch: 10,   // Google results per batch query
  enrichContent: true,   // Scrape each post URL for full content + engagement
  enrichConcurrency: 5,  // Parallel enrichment requests
};

export default async function linkedinFetch(config) {
  if (!config.linkedin?.enabled) return [];

  const BRIGHTDATA_API_KEY = process.env.BRIGHTDATA_API_KEY;
  const BRIGHTDATA_ZONE = process.env.BRIGHTDATA_ZONE || 'mcp_unlocker';

  if (!BRIGHTDATA_API_KEY) {
    logger.warn('BRIGHTDATA_API_KEY not set, skipping LinkedIn scraping');
    return [];
  }

  const profilesFile = config.linkedin.profilesFile;
  if (!fs.existsSync(profilesFile)) {
    logger.error(`LinkedIn profiles file not found: ${profilesFile}`);
    return [];
  }

  let profiles;
  try {
    profiles = JSON.parse(fs.readFileSync(profilesFile, 'utf-8'));
  } catch (err) {
    logger.error(`Failed to parse LinkedIn profiles file: ${err.message}`);
    return [];
  }

  const cfg = { ...DEFAULTS, ...config.linkedin };
  const state = loadState();
  const now = new Date();
  const cutoffMs = cfg.checkIntervalHours * 3600 * 1000;

  // Select only KOLs not checked recently
  const dueKols = profiles.filter(p => {
    const last = state[p.name]?.lastChecked;
    return !last || (now - new Date(last)) >= cutoffMs;
  });

  const maxKols = cfg.budgetPerRun * cfg.batchSize;
  const selectedKols = dueKols.slice(0, maxKols);

  if (selectedKols.length === 0) {
    logger.info(`LinkedIn: all ${profiles.length} KOLs recently checked, nothing due`);
    return [];
  }

  const numBatches = Math.ceil(selectedKols.length / cfg.batchSize);
  logger.info(`LinkedIn: checking ${selectedKols.length}/${profiles.length} KOLs in ${numBatches} batches...`);

  const allPosts = [];
  const batches = chunk(selectedKols, cfg.batchSize);

  for (const batch of batches) {
    try {
      let posts = await withRetry(
        () => fetchBatch(batch, state, cfg, BRIGHTDATA_API_KEY, BRIGHTDATA_ZONE),
        { retries: 3, baseDelay: 2000, maxDelay: 15000, onRetry: (a, t) => logger.warn(`Batch retry ${a}/${t}`) }
      );

      // Enrich posts with full content + engagement by scraping each post URL
      if (cfg.enrichContent && posts.length > 0) {
        posts = await enrichPosts(posts, cfg, BRIGHTDATA_API_KEY, BRIGHTDATA_ZONE);
      }

      allPosts.push(...posts);

      // Update state: mark all KOLs in batch as checked, record seen post IDs
      for (const kol of batch) {
        if (!state[kol.name]) state[kol.name] = { seenPostIds: [] };
        state[kol.name].lastChecked = now.toISOString();
        const newIds = posts.filter(p => p.sourceName === kol.name).map(p => p.id);
        state[kol.name].seenPostIds = [
          ...new Set([...newIds, ...(state[kol.name].seenPostIds || [])]),
        ].slice(0, 100); // keep last 100 seen post IDs per KOL
      }

      await new Promise(r => setTimeout(r, 600));
    } catch (err) {
      logger.error(`Batch failed: ${err.message}`);
    }
  }

  saveState(state);

  const checked = selectedKols.length;
  const remaining = dueKols.length - checked;
  logger.success(`LinkedIn: ${allPosts.length} new posts (${checked} KOLs checked, ${remaining} still due)`);
  return allPosts;
}

async function fetchBatch(batch, state, cfg, apiKey, zone) {
  // Batch multiple KOL names into one SERP query
  const nameList = batch.map(k => `"${k.name}"`).join(' OR ');
  const searchQuery = `site:linkedin.com/posts (${nameList})`;
  const googleUrl = [
    'https://www.google.com/search',
    `?q=${encodeURIComponent(searchQuery)}`,
    `&num=${cfg.resultsPerBatch}`,
    `&tbs=qdr:${cfg.timeRange}`, // time filter: recent posts only
    '&brd_json=1',
  ].join('');

  const response = await axios.post(
    BRIGHTDATA_API_URL,
    { zone, url: googleUrl, format: 'raw', data_format: 'parsed_light' },
    {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      timeout: 40000,
    }
  );

  const organicResults = response.data?.organic || [];
  const posts = [];

  for (const item of organicResults) {
    try {
      if (!item.link?.includes('linkedin.com/posts')) continue;

      // Match result back to a specific KOL from this batch
      const kol = matchKol(item, batch);
      if (!kol) continue;

      // Skip boilerplate / profile-bio-only snippets — these have no post content
      const rawContent = item.description || item.snippet || '';
      if (!isUsefulContent(rawContent)) continue;

      const id = crypto.createHash('md5').update(item.link).digest('hex');

      // Skip posts we've already seen for this KOL
      if (state[kol.name]?.seenPostIds?.includes(id)) continue;

      posts.push({
        id,
        source: 'linkedin',
        sourceName: kol.name,
        category: 'linkedin-kol',
        title: cleanTitle(item.title || '', kol.name),
        link: item.link,
        url: item.link,
        content: cleanContent(rawContent),
        summary: cleanContent(rawContent).substring(0, 200),
        author: kol.name,
        role: kol.role || '',
        pubDate: extractDate(item) || new Date().toISOString(),
        scraped_at: new Date().toISOString(),
        age_hours: 0,
        engagement: { upvotes: 0, comments: 0 },
        metadata: { score: 0 },
      });
    } catch (err) {
      logger.debug(`fetchBatch: item error: ${err.message}`);
    }
  }

  return posts;
}

// Scrape each post URL for full content + engagement, with concurrency limit
async function enrichPosts(posts, cfg, apiKey, zone) {
  const concurrency = cfg.enrichConcurrency || 5;
  const enriched = [];

  for (let i = 0; i < posts.length; i += concurrency) {
    const batch = posts.slice(i, i + concurrency);
    const results = await Promise.all(batch.map(p => enrichPost(p, apiKey, zone)));
    enriched.push(...results);
  }

  return enriched;
}

async function enrichPost(post, apiKey, zone) {
  try {
    const response = await withRetry(
      () => axios.post(
        BRIGHTDATA_API_URL,
        { zone, url: post.url, format: 'raw', data_format: 'markdown' },
        { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 40000 }
      ),
      { retries: 2, baseDelay: 2000, onRetry: (a, t) => logger.debug(`Enrich retry ${a}/${t} for ${post.sourceName}`) }
    );

    const markdown = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    const fullContent = extractPostContent(markdown);
    const engagement = extractEngagement(markdown);
    const pubDate = extractDateFromPage(markdown) || post.pubDate;

    if (fullContent) {
      post.content = fullContent;
      post.summary = fullContent.substring(0, 200);
    }
    post.engagement = engagement;
    post.pubDate = pubDate;
  } catch (err) {
    // Best-effort — keep SERP snippet if scraping fails
    logger.debug(`Enrich failed for ${post.sourceName}: ${err.message}`);
  }
  return post;
}

// Extract full post content from LinkedIn page markdown.
// LinkedIn page structure (logged-out view):
//   [Author] [Job] [N followers]
//   [Nd/w/h ago] •
//   [Full post text here]
//   Like Comment Repost Send
//   [N reactions] • [N comments]
function extractPostContent(markdown) {
  const lines = markdown.split('\n');
  let start = -1;
  let end = lines.length;

  // Find the line after the date indicator (e.g. "3d •", "2w •", "1mo •")
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^\d+[dwm]\s*[•·]/.test(line) || /\d+\s+(hour|day|week|month)s?\s+ago/i.test(line)) {
      start = i + 1;
      break;
    }
  }

  if (start === -1) return null;

  // Find where content ends: engagement buttons or reaction counts
  for (let i = start; i < lines.length; i++) {
    const line = lines[i].trim().toLowerCase();
    if (
      line === 'like comment repost send' ||
      line.startsWith('like') && line.includes('comment') ||
      /^\d[\d,]*\s*reaction/.test(line) ||
      line === 'reactions' ||
      line.includes('sign in') ||
      line.includes('join now')
    ) {
      end = i;
      break;
    }
  }

  const content = lines
    .slice(start, end)
    .join('\n')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // collapse markdown links to text
    .replace(/^#+\s/gm, '')                   // strip heading markers
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return content.length > 30 ? content : null;
}

// Extract like/comment/repost counts from LinkedIn page markdown
function extractEngagement(markdown) {
  const parse = (pattern) => {
    const m = markdown.match(pattern);
    return m ? parseInt(m[1].replace(/,/g, '')) : 0;
  };
  return {
    upvotes: parse(/(\d[\d,]*)\s*reaction/i),
    comments: parse(/(\d[\d,]*)\s*comment/i),
    reposts: parse(/(\d[\d,]*)\s*repost/i),
  };
}

// Extract post date from LinkedIn page markdown (more accurate than SERP snippet)
function extractDateFromPage(markdown) {
  const ago = markdown.match(/(\d+)\s*(hour|day|week|month)s?\s*ago/i) ||
              markdown.match(/(\d+)(h|d|w|mo)\s*[•·]/);
  if (!ago) return null;
  const n = parseInt(ago[1]);
  const unitRaw = ago[2].toLowerCase();
  const unit = { h: 'hour', d: 'day', w: 'week', mo: 'month' }[unitRaw] || unitRaw;
  const ms = { hour: 3600000, day: 86400000, week: 604800000, month: 2592000000 }[unit] || 0;
  return ms ? new Date(Date.now() - n * ms).toISOString() : null;
}

// Match a search result to a KOL in the batch.
// We use two signals, in order of reliability:
//  1. URL username contains BOTH first+last name parts of the KOL → post is by them
//  2. Title is "[KOL Name]'s Post" format → LinkedIn's own-post title format
// Anything else (posts merely mentioning the KOL) is rejected.
function matchKol(item, batch) {
  const urlUsername = extractUrlUsername(item.link || '');
  const titleAuthor = (item.title || '').match(/^(.+?)'s Post/i)?.[1]?.toLowerCase().trim() || '';

  for (const kol of batch) {
    const parts = sanitizeName(kol.name).split(' ').filter(Boolean);
    if (parts.length < 2) continue;
    const [first, ...rest] = parts;
    const last = rest[rest.length - 1];

    // Signal 1: URL username contains both first AND last name → reliable authorship
    if (urlUsername && urlUsername.includes(first) && urlUsername.includes(last)) return kol;

    // Signal 2: Title's "Name's Post" format matches this KOL
    if (titleAuthor && titleAuthor.includes(first) && titleAuthor.includes(last)) return kol;
  }

  return null;
}

// Extract the author username from a LinkedIn post URL
// linkedin.com/posts/USERNAME_post-title-activity-ID
function extractUrlUsername(url) {
  const m = url.match(/linkedin\.com\/posts\/([^_/]+)/);
  return m?.[1]?.toLowerCase() || '';
}

function sanitizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

// Returns false for snippets that are just LinkedIn profile bios / boilerplate
function isUsefulContent(content) {
  if (!content || content.length < 40) return false;
  const lower = content.toLowerCase();
  // Common boilerplate patterns from LinkedIn search results
  const boilerplate = [
    'view profile for',
    'report this comment',
    'close menu',
    'like · reply',
    '1 reaction',
  ];
  return !boilerplate.some(b => lower.includes(b));
}

// Remove LinkedIn UI chrome from content
function cleanContent(text) {
  return text
    .replace(/\.\.\.Read more$/i, '')
    .replace(/View profile for [^.]+\./gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Remove "Name's Post" boilerplate from title
function cleanTitle(title, authorName) {
  const cleaned = title
    .replace(new RegExp(`^${authorName}'s Post\\s*[-–]?\\s*`, 'i'), '')
    .trim();
  return cleaned || title;
}

// Parse relative date strings from Google snippets into ISO dates
function extractDate(item) {
  const text = `${item.description || ''} ${item.date || ''}`;
  const ago = text.match(/(\d+)\s*(hour|day|week|month)s?\s*ago/i);
  if (!ago) return null;
  const n = parseInt(ago[1]);
  const unit = ago[2].toLowerCase();
  const ms = { hour: 3600000, day: 86400000, week: 604800000, month: 2592000000 }[unit] || 0;
  return new Date(Date.now() - n * ms).toISOString();
}

function chunk(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  } catch { /* start fresh */ }
  return {};
}

function saveState(state) {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}
