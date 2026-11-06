import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchWithRetry, HttpResponseError, HttpBodyTooLargeError } from '../src/http/fetcher.js';
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

test('content-length larger than the configured limit is rejected without retry', async () => {
  const original = globalThis.fetch;
  const originalLimit = env.HTTP_MAX_RESPONSE_BYTES;
  let calls = 0;
  try {
    env.HTTP_MAX_RESPONSE_BYTES = 8;
    globalThis.fetch = async () => {
      calls += 1;
      return new Response('1234567890', { status: 200, headers: { 'content-length': '10' } });
    };
    await assert.rejects(
      fetchWithRetry('https://example.invalid/big.csv'),
      (error: unknown) => {
        assert.ok(error instanceof HttpBodyTooLargeError);
        assert.equal(error.maxBytes, 8);
        return true;
      },
    );
    assert.equal(calls, 1);
  } finally {
    env.HTTP_MAX_RESPONSE_BYTES = originalLimit;
    globalThis.fetch = original;
  }
});

test('chunked response without content-length is stopped at the byte cap', async () => {
  const original = globalThis.fetch;
  const originalLimit = env.HTTP_MAX_RESPONSE_BYTES;
  let calls = 0;
  try {
    env.HTTP_MAX_RESPONSE_BYTES = 8;
    globalThis.fetch = async () => {
      calls += 1;
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('1234'));
          controller.enqueue(new TextEncoder().encode('56789'));
          controller.close();
        },
      });
      return new Response(stream, { status: 200 });
    };
    await assert.rejects(fetchWithRetry('https://example.invalid/stream'),
      (error: unknown) => error instanceof HttpBodyTooLargeError && error.maxBytes === 8);
    assert.equal(calls, 1);
  } finally {
    env.HTTP_MAX_RESPONSE_BYTES = originalLimit;
    globalThis.fetch = original;
  }
});
