import axios from 'axios';
import crypto from 'crypto';
import createLogger from '../utils/logger.js';

const logger = createLogger('ProductHuntFetcher');
const PH_API_URL = 'https://api.producthunt.com/v2/api/graphql';
const TOKEN_URL = 'https://api.producthunt.com/v2/oauth/token';

async function getAccessToken(clientId, clientSecret) {
  const response = await axios.post(TOKEN_URL, {
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
  });
  return response.data.access_token;
}

const POSTS_QUERY = `
  query($first: Int!, $order: PostsOrder!, $postedAfter: DateTime!) {
    posts(first: $first, order: $order, postedAfter: $postedAfter) {
      edges {
        node {
          id
          name
          tagline
          description
          url
          website
          votesCount
          commentsCount
          createdAt
          topics {
            edges { node { name } }
          }
          user {
            name
          }
        }
      }
    }
  }
`;

export default async function productHuntFetch(config) {
  const phConfig = config.producthunt;
  if (!phConfig?.enabled) return [];

  const clientId = process.env.PRODUCT_HUNT_API_KEY;
  const clientSecret = process.env.PRODUCT_HUNT_API_SECRET;

  if (!clientId || !clientSecret) {
    logger.warn('PRODUCT_HUNT_API_KEY or PRODUCT_HUNT_API_SECRET not set, skipping');
    return [];
  }

  const limit = phConfig.limit || 30;
  const minVotes = phConfig.minVotes || 0;
  const daysBack = phConfig.daysBack || 1;
  const postedAfter = new Date(Date.now() - daysBack * 86400000).toISOString();

  let token;
  try {
    token = await getAccessToken(clientId, clientSecret);
  } catch (err) {
    logger.error(`Failed to get Product Hunt access token: ${err.message}`);
    return [];
  }

  let posts;
  try {
    const response = await axios.post(
      PH_API_URL,
      { query: POSTS_QUERY, variables: { first: limit, order: 'VOTES', postedAfter } },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    posts = response.data?.data?.posts?.edges || [];
  } catch (err) {
    logger.error(`Product Hunt GraphQL request failed: ${err.message}`);
    return [];
  }

  const items = [];

  for (const { node } of posts) {
    if (node.votesCount < minVotes) continue;

    const topics = node.topics?.edges?.map(e => e.node.name) || [];
    const content = [node.tagline, node.description].filter(Boolean).join('\n\n');

    items.push({
      id: crypto.createHash('md5').update(node.url).digest('hex'),
      source: 'producthunt',
      sourceName: 'Product Hunt',
      category: topics[0] || 'product-launch',
      title: node.name,
      link: node.url,
      url: node.url,
      content,
      summary: content.substring(0, 200),
      author: node.user?.name || '',
      pubDate: node.createdAt,
      scraped_at: new Date().toISOString(),
      age_hours: Math.floor((Date.now() - new Date(node.createdAt).getTime()) / (1000 * 60 * 60)),
      tags: topics,
      engagement: {
        upvotes: node.votesCount,
        comments: node.commentsCount,
      },
      metadata: {
        score: node.votesCount,
        website: node.website,
      },
    });
  }

  logger.success(`Fetched ${items.length} posts from Product Hunt`);
  return items;
}
