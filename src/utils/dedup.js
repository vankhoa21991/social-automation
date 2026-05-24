const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'utm_id', 'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic',
  'ref', 'source', 'via', 'from',
  'fbclid', 'gclid', 'msclkid', 'dclid',
  'mc_cid', 'mc_eid',
  '_ga', '_gl',
]);

/**
 * Return a normalized URL string used as a dedup key.
 * - Forces https
 * - Strips www.
 * - Removes tracking query params
 * - Sorts remaining params
 * - Strips fragment and trailing slash
 */
export function canonicalUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  try {
    const u = new URL(rawUrl);
    u.protocol = 'https:';
    u.hostname = u.hostname.replace(/^www\./, '').toLowerCase();
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        u.searchParams.delete(key);
      }
    }
    u.searchParams.sort();
    u.hash = '';
    u.pathname = u.pathname.replace(/\/+$/, '') || '/';
    return u.toString();
  } catch {
    return rawUrl;
  }
}

/**
 * Return the "real" article URL for an item (not the discussion/post URL).
 * Reddit link posts: external_url points to the article.
 * HN: url already points to the article.
 * RSS: uses link field.
 */
export function getArticleUrl(item) {
  if (item.source === 'reddit') {
    const ext = item.external_url;
    if (ext && !ext.includes('reddit.com') && !ext.includes('redd.it')) {
      return ext;
    }
    return item.url;
  }
  return item.link || item.url;
}

function scoreItem(item) {
  let score = 0;
  if (item.engagement?.upvotes) score += item.engagement.upvotes;
  if (item.engagement?.points) score += item.engagement.points * 2;
  if (item.engagement?.comments) score += item.engagement.comments * 0.5;
  if (item.metadata?.score) score += item.metadata.score;
  if (item.source === 'rss' && score === 0) {
    const text = item.summary || item.content || '';
    score = Math.min(text.length * 2, 500);
  }
  return score;
}

/**
 * Deduplicate items across sources by canonical article URL.
 * Within each duplicate group: keep highest-scored item, record all sources.
 * Items with no resolvable URL pass through unchanged.
 */
export function deduplicateItems(items) {
  const groups = new Map();
  const noUrl = [];

  for (const item of items) {
    const articleUrl = getArticleUrl(item);
    const key = canonicalUrl(articleUrl);
    if (!key) {
      noUrl.push(item);
      continue;
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const deduped = [];
  let dupCount = 0;

  for (const group of groups.values()) {
    if (group.length === 1) {
      deduped.push(group[0]);
      continue;
    }

    dupCount += group.length - 1;
    group.sort((a, b) => scoreItem(b) - scoreItem(a));
    const winner = { ...group[0] };

    const allSources = [...new Set(group.map(i => i.source))];
    const allSourceNames = [...new Set(group.map(i => i.sourceName).filter(Boolean))];
    winner._dedup_sources = allSources;
    winner._dedup_source_names = allSourceNames;

    deduped.push(winner);
  }

  deduped._dupCount = dupCount;
  return [...deduped, ...noUrl];
}
