import axios from 'axios';
import fs from 'fs';
import crypto from 'crypto';
import createLogger from '../utils/logger.js';

const logger = createLogger('LinkedInFetcher');

const BRIGHTDATA_API_URL = 'https://api.brightdata.com/request';

export default async function linkedinFetch(config) {
  if (!config.linkedin?.enabled) {
    return [];
  }

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

  const limit = config.linkedin?.limit || 20;
  const selectedProfiles = profiles.slice(0, limit);

  logger.info(`Fetching LinkedIn posts for ${selectedProfiles.length} KOLs via BrightData SERP...`);

  const allPosts = [];

  for (const profile of selectedProfiles) {
    try {
      const posts = await fetchProfilePosts(profile, BRIGHTDATA_API_KEY, BRIGHTDATA_ZONE);
      allPosts.push(...posts);
      await new Promise(r => setTimeout(r, 800));
    } catch (error) {
      logger.error(`Failed LinkedIn fetch for ${profile.name}: ${error.message}`);
    }
  }

  logger.success(`LinkedIn: fetched ${allPosts.length} posts from ${selectedProfiles.length} KOLs`);
  return allPosts;
}

async function fetchProfilePosts(profile, BRIGHTDATA_API_KEY, BRIGHTDATA_ZONE) {
  const searchQuery = `site:linkedin.com/posts "${profile.name}" AI`;
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=5&brd_json=1`;

  try {
    const response = await axios.post(
      BRIGHTDATA_API_URL,
      {
        zone: BRIGHTDATA_ZONE,
        url: googleUrl,
        format: 'raw',
        data_format: 'parsed_light',
      },
      {
        headers: {
          Authorization: `Bearer ${BRIGHTDATA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      }
    );

    const organicResults = response.data?.organic || [];

    return organicResults
      .filter(item => item.link?.includes('linkedin.com'))
      .map(item => ({
        id: crypto.createHash('md5').update(item.link || item.title || '').digest('hex'),
        source: 'linkedin',
        sourceName: profile.name,
        category: 'linkedin-kol',
        title: item.title || '',
        link: item.link || '',
        url: item.link || '',
        content: item.description || item.snippet || '',
        summary: (item.description || item.snippet || '').substring(0, 200),
        author: profile.name,
        role: profile.role || '',
        pubDate: new Date().toISOString(),
        scraped_at: new Date().toISOString(),
        age_hours: 0,
        engagement: {
          upvotes: 0,
          comments: 0,
        },
        metadata: {
          score: 0,
          search_query: searchQuery,
        },
      }));
  } catch (error) {
    logger.error(`BrightData SERP error for ${profile.name}: ${error.response?.data?.message || error.message}`);
    return [];
  }
}
