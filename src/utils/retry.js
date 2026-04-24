const NETWORK_CODES = new Set([
  'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ECONNABORTED',
  'EHOSTUNREACH', 'EAI_AGAIN', 'ENOTFOUND',
]);

function isRetryable(err) {
  if (err.code && NETWORK_CODES.has(err.code)) return true;
  if (err.response?.status === 429) return true;
  if (err.response?.status >= 500) return true;
  if (/timeout|ETIMEDOUT/i.test(err.message)) return true;
  return false;
}

/**
 * @param {() => Promise<any>} fn
 * @param {{ retries?: number, baseDelay?: number, maxDelay?: number, onRetry?: (attempt, total, delayMs, err) => void }} opts
 */
export async function withRetry(fn, { retries = 3, baseDelay = 1000, maxDelay = 15000, onRetry } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!isRetryable(err) || attempt === retries) throw err;
      const delay = Math.min(baseDelay * 2 ** attempt + Math.random() * 500, maxDelay);
      onRetry?.(attempt + 1, retries, Math.round(delay), err);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
