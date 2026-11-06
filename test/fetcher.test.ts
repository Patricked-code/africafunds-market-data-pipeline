import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchWithRetry, HttpResponseError } from '../src/http/fetcher.js';
import { env } from '../src/config/env.js';

test('HTTP 200 returns a valid body without changing source content', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response('Date;Value\n2026-01-02;1', { status: 200, headers: { 'content-type': 'text/csv' } });
  };
  try {
    const result = await fetchWithRetry('https://example.invalid/market.csv');
    assert.equal(result.status, 200);
    assert.equal(result.headers['content-type'], 'text/csv');
    assert.equal(Buffer.from(result.body).toString('utf8'), 'Date;Value\n2026-01-02;1');
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test('HTTP 404 is terminal and cannot be archived as a successful fetch', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response('Not Found', { status: 404 });
  };
  try {
    await assert.rejects(
      fetchWithRetry('https://example.invalid/missing'),
      (error: unknown) => {
        assert.ok(error instanceof HttpResponseError);
        assert.equal(error.status, 404);
        return true;
      },
    );
    assert.equal(calls, 1, 'non-retryable 404 must not be requested repeatedly');
  } finally {
    globalThis.fetch = original;
  }
});

test('HTTP 503 and 429 retry within policy but never return an error page', async () => {
  const original = globalThis.fetch;
  const retries = env.HTTP_MAX_RETRIES;
  try {
    env.HTTP_MAX_RETRIES = 1;
    for (const status of [503, 429]) {
      let calls = 0;
      globalThis.fetch = async () => {
        calls += 1;
        return new Response('Unavailable', { status });
      };
      await assert.rejects(
        fetchWithRetry('https://example.invalid/temporary'),
        (error: unknown) => {
          assert.ok(error instanceof HttpResponseError);
          assert.equal(error.status, status);
          return true;
        },
      );
      assert.equal(calls, 2, 'one initial attempt and one bounded retry');
    }
  } finally {
    env.HTTP_MAX_RETRIES = retries;
    globalThis.fetch = original;
  }
});
