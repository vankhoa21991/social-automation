/**
 * Unit tests for src/utils/retry.js
 * Run: node src/test/retry.js
 */

import assert from 'assert/strict';
import { withRetry } from '../utils/retry.js';

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// --- helpers ---

const FAST = { baseDelay: 1, maxDelay: 10 };

function makeNetworkErr(code) {
  const e = new Error(code);
  e.code = code;
  return e;
}

function makeHttpErr(status) {
  const e = new Error(`HTTP ${status}`);
  e.response = { status };
  return e;
}

// --- tests ---

console.log('\nwithRetry');

await test('resolves immediately on success', async () => {
  let calls = 0;
  const result = await withRetry(() => { calls++; return Promise.resolve('ok'); }, FAST);
  assert.equal(result, 'ok');
  assert.equal(calls, 1);
});

await test('retries and resolves after transient failure', async () => {
  let calls = 0;
  const result = await withRetry(() => {
    calls++;
    if (calls < 3) throw makeNetworkErr('ECONNRESET');
    return Promise.resolve('done');
  }, { ...FAST, retries: 3 });
  assert.equal(result, 'done');
  assert.equal(calls, 3);
});

await test('throws immediately for non-retryable 4xx error', async () => {
  let calls = 0;
  await assert.rejects(
    () => withRetry(() => { calls++; throw makeHttpErr(404); }, { ...FAST, retries: 3 }),
    /HTTP 404/
  );
  assert.equal(calls, 1, 'must not retry on 4xx');
});

await test('retries on 429 (rate limit)', async () => {
  let calls = 0;
  const result = await withRetry(() => {
    calls++;
    if (calls === 1) throw makeHttpErr(429);
    return Promise.resolve('ok');
  }, { ...FAST, retries: 3 });
  assert.equal(result, 'ok');
  assert.equal(calls, 2);
});

await test('retries on 5xx server error', async () => {
  let calls = 0;
  const result = await withRetry(() => {
    calls++;
    if (calls === 1) throw makeHttpErr(503);
    return Promise.resolve('ok');
  }, { ...FAST, retries: 3 });
  assert.equal(result, 'ok');
  assert.equal(calls, 2);
});

await test('retries on timeout message', async () => {
  let calls = 0;
  const result = await withRetry(() => {
    calls++;
    if (calls === 1) throw new Error('timeout of 5000ms exceeded');
    return Promise.resolve('ok');
  }, { ...FAST, retries: 3 });
  assert.equal(result, 'ok');
  assert.equal(calls, 2);
});

await test('retries on all retryable network codes', async () => {
  const codes = ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ECONNABORTED', 'EHOSTUNREACH', 'EAI_AGAIN', 'ENOTFOUND'];
  for (const code of codes) {
    let calls = 0;
    const result = await withRetry(() => {
      calls++;
      if (calls === 1) throw makeNetworkErr(code);
      return Promise.resolve('ok');
    }, { ...FAST, retries: 1 });
    assert.equal(result, 'ok', `should retry on ${code}`);
  }
});

await test('exhausts retries and throws last error', async () => {
  let calls = 0;
  await assert.rejects(
    () => withRetry(() => { calls++; throw makeNetworkErr('ETIMEDOUT'); }, { ...FAST, retries: 2 }),
    /ETIMEDOUT/
  );
  assert.equal(calls, 3, 'retries=2 means 3 total attempts');
});

await test('retries=0 means exactly 1 attempt', async () => {
  let calls = 0;
  await assert.rejects(
    () => withRetry(() => { calls++; throw makeNetworkErr('ECONNRESET'); }, { ...FAST, retries: 0 }),
    /ECONNRESET/
  );
  assert.equal(calls, 1);
});

await test('onRetry callback fires correct number of times', async () => {
  const log = [];
  await assert.rejects(
    () => withRetry(
      () => { throw makeNetworkErr('ECONNRESET'); },
      { ...FAST, retries: 3, onRetry: (a, t) => log.push({ a, t }) }
    )
  );
  assert.equal(log.length, 3, 'onRetry called once per retry (not on final throw)');
  assert.deepEqual(log.map(l => l.a), [1, 2, 3]);
  assert.equal(log[0].t, 3);
});

await test('delay is capped by maxDelay', async () => {
  const delays = [];
  const realSetTimeout = global.setTimeout;
  // Patch setTimeout to capture delays without actually waiting
  global.setTimeout = (fn, ms) => { delays.push(ms); fn(); return 0; };
  try {
    await assert.rejects(
      () => withRetry(
        () => { throw makeNetworkErr('ECONNRESET'); },
        { retries: 3, baseDelay: 10000, maxDelay: 50 }
      )
    );
  } finally {
    global.setTimeout = realSetTimeout;
  }
  assert.ok(delays.every(d => d <= 50), `all delays must be ≤ maxDelay=50, got: ${delays}`);
});

// --- summary ---

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
