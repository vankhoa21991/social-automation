import axios from 'axios';
import crypto from 'crypto';
import createLogger from '../utils/logger.js';

const logger = createLogger('APIFetcher');

// --- Auth ---

async function resolveAuthHeaders(auth) {
  if (!auth) return {};

  if (auth.type === 'bearer') {
    const token = process.env[auth.tokenEnv];
    if (!token) { logger.warn(`Env var ${auth.tokenEnv} not set`); return {}; }
    return { Authorization: `Bearer ${token}` };
  }

  if (auth.type === 'oauth2_client_credentials') {
    const clientId = process.env[auth.clientIdEnv];
    const clientSecret = process.env[auth.clientSecretEnv];
    if (!clientId || !clientSecret) {
      logger.warn(`Env vars ${auth.clientIdEnv} or ${auth.clientSecretEnv} not set`);
      return {};
    }
    const res = await axios.post(auth.tokenUrl, {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    });
    return { Authorization: `Bearer ${res.data.access_token}` };
  }

  return {};
}

// --- Computed variables (runtime values injected into request params/variables) ---
// Supported types:
//   { "type": "daysAgo", "days": 7 } → ISO timestamp N days in the past

function resolveComputedVariables(computedVars) {
  if (!computedVars) return {};
  const resolved = {};
  for (const [key, spec] of Object.entries(computedVars)) {
    if (spec.type === 'daysAgo') {
      resolved[key] = new Date(Date.now() - spec.days * 86400000).toISOString();
    }
  }
  return resolved;
}

// --- Value resolution ---
// Mapping spec types:
//   "fieldName"                               → direct field lookup
//   "https://example.com/{field}"             → template string
//   ["field1", "field2"]                      → join with \n\n
//   { "path": "a.b.c" }                       → deep dot-notation path
//   { "path": "arr", "map": "node.name" }     → map over array, extract subpath
//   { "path": "arr", "map": "node.name", "index": 0 } → take one element
//   { "field": "x", "split": ",", "index": 0 } → split string, take element
//   { "field": "x", "split": "," }            → split string into array
//   null                                      → skip (keep default)

function getPath(obj, dotPath) {
  return dotPath.split('.').reduce((acc, key) => acc?.[key], obj);
}

function resolveValue(item, spec) {
  if (spec === null || spec === undefined) return undefined;

  if (typeof spec === 'string') {
    if (spec.includes('{')) {
      return spec.replace(/\{(\w+)\}/g, (_, key) => item[key] ?? '');
    }
    const val = item[spec];
    return val !== undefined ? val : undefined;
  }

  if (Array.isArray(spec)) {
    const parts = spec.map(f => item[f]).filter(v => v !== null && v !== undefined && v !== '');
    return parts.length ? parts.join('\n\n') : undefined;
  }

  if (typeof spec === 'object') {
    if (spec.path !== undefined) {
      const val = getPath(item, spec.path);
      if (spec.map !== undefined) {
        if (!Array.isArray(val)) return undefined;
        const mapped = val.map(v => getPath(v, spec.map)).filter(Boolean);
        return spec.index !== undefined ? mapped[spec.index] : mapped;
      }
      return val !== undefined ? val : undefined;
    }

    if (spec.field !== undefined) {
      const val = item[spec.field];
      if (val === null || val === undefined) return spec.index !== undefined ? undefined : [];
      const parts = String(val).split(spec.split || ',').map(s => s.trim()).filter(Boolean);
      return spec.index !== undefined ? (parts[spec.index] ?? undefined) : parts;
    }
  }

  return undefined;
}

function setPath(obj, dotPath, value) {
  const keys = dotPath.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cur[keys[i]]) cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

// --- Map one raw API item to the standard pipeline shape ---

function mapItem(raw, source) {
  const item = {
    source: source.id,
    sourceName: source.name,
    scraped_at: new Date().toISOString(),
    age_hours: 0,
    tags: [],
    engagement: { upvotes: 0, comments: 0 },
    metadata: { score: 0 },
  };

  for (const [outputPath, spec] of Object.entries(source.mapping)) {
    const value = resolveValue(raw, spec);
    if (value !== undefined) setPath(item, outputPath, value);
  }

  // Keep link and url in sync
  if (item.link && !item.url) item.url = item.link;
  if (item.url && !item.link) item.link = item.url;

  // Stable ID from link
  item.id = crypto.createHash('md5')
    .update(item.link || item.title || String(Math.random()))
    .digest('hex');

  // Normalise pubDate to ISO
  if (item.pubDate && !String(item.pubDate).includes('T')) {
    item.pubDate = new Date(item.pubDate).toISOString();
  }
  if (!item.pubDate) item.pubDate = new Date().toISOString();

  // Source weight for trending score normalisation (default 1)
  item.metadata.weight = source.weight ?? 1;

  // Store weighted score for display
  if (!item.metadata.score) {
    item.metadata.score = Math.round((item.engagement.upvotes || 0) * item.metadata.weight);
  }

  return item;
}

// --- Main entry point ---

export default async function apiFetch(source) {
  const { request, response, filter, auth } = source;

  let authHeaders;
  try {
    authHeaders = await resolveAuthHeaders(auth);
  } catch (err) {
    logger.error(`[${source.id}] Auth failed: ${err.message}`);
    return [];
  }

  const headers = {
    'User-Agent': 'social-automation-scraper/1.0',
    ...authHeaders,
    ...(request.headers || {}),
  };

  const computedVars = resolveComputedVariables(request.computedVariables);

  let rawItems;
  try {
    let data;

    if (request.graphql) {
      const variables = { ...request.graphql.variables, ...computedVars };
      const res = await axios.post(
        request.url,
        { query: request.graphql.query, variables },
        { headers, timeout: 30000 }
      );
      data = res.data;
    } else if (request.method === 'POST') {
      const res = await axios.post(request.url, request.body || {}, {
        headers,
        params: { ...request.params, ...computedVars },
        timeout: 15000,
      });
      data = res.data;
    } else {
      const res = await axios.get(request.url, {
        headers,
        params: { ...request.params, ...computedVars },
        timeout: 15000,
      });
      data = res.data;
    }

    rawItems = response?.itemsPath ? getPath(data, response.itemsPath) : data;
    if (!Array.isArray(rawItems)) rawItems = [];

    if (response?.itemUnwrap) {
      rawItems = rawItems.map(i => i[response.itemUnwrap]).filter(Boolean);
    }
  } catch (err) {
    logger.error(`[${source.id}] Request failed: ${err.message}`);
    return [];
  }

  // Apply optional filter
  let filtered = rawItems;
  if (filter) {
    filtered = rawItems.filter(item => {
      const val = getPath(item, filter.field) ?? 0;
      return (filter.min === undefined || val >= filter.min) &&
             (filter.max === undefined || val <= filter.max);
    });
  }

  const items = filtered.map(raw => mapItem(raw, source));
  logger.success(`[${source.id}] Fetched ${items.length} items`);
  return items;
}
