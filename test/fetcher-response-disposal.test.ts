import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchWithRetry, HttpResponseError } from '../src/http/fetcher.js';
import { env } from '../src/config/env.js';

test('HTTP 404 disposes its unconsumed response body before failing', async () => {
  const originalFetch = globalThis.fetch;
  let cancelled = 0;
  globalThis.fetch = async () => new Response(new ReadableStream<Uint8Array>({
    cancel() { cancelled += 1; },
  }), { status: 404 });
  try {
    await assert.rejects(fetchWithRetry('https://example.invalid/not-found'),
      (error: unknown) => error instanceof HttpResponseError && error.status === 404);
    assert.equal(cancelled, 1, 'terminal HTTP error must release the response stream');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('HTTP 503 disposes each response stream before retrying', async () => {
  const originalFetch = globalThis.fetch;
  const originalRetries = env.HTTP_MAX_RETRIES;
  let cancelled = 0;
  let calls = 0;
  env.HTTP_MAX_RETRIES = 1;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(new ReadableStream<Uint8Array>({
      cancel() { cancelled += 1; },
    }), { status: 503 });
  };
  try {
    await assert.rejects(fetchWithRetry('https://example.invalid/unavailable'),
      (error: unknown) => error instanceof HttpResponseError && error.status === 503);
    assert.equal(calls, 2);
    assert.equal(cancelled, 2, 'every rejected response must release its stream');
  } finally {
    env.HTTP_MAX_RETRIES = originalRetries;
    globalThis.fetch = originalFetch;
  }
});

test('oversized Content-Length releases the response stream and preserves the size error', async () => {
  const originalFetch = globalThis.fetch;
  let cancelled = 0;
  globalThis.fetch = async () => new Response(new ReadableStream<Uint8Array>({
    cancel() { cancelled += 1; },
  }), { status: 200, headers: { 'content-length': String(env.HTTP_MAX_RESPONSE_BYTES + 1) } });
  try {
    await assert.rejects(fetchWithRetry('https://example.invalid/oversized'), (error: unknown) =>
      error instanceof Error && error.name === 'HttpBodyTooLargeError');
    assert.equal(cancelled, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('oversized streamed response keeps size error when cancellation rejects', async () => {
  const originalFetch = globalThis.fetch;
  const originalLimit = env.HTTP_MAX_RESPONSE_BYTES;
  env.HTTP_MAX_RESPONSE_BYTES = 1;
  globalThis.fetch = async () => new Response(new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new Uint8Array([1, 2])); },
    cancel() { throw new Error('cancel failed'); },
  }), { status: 200 });
  try {
    await assert.rejects(fetchWithRetry('https://example.invalid/stream-oversized'), (error: unknown) =>
      error instanceof Error && error.name === 'HttpBodyTooLargeError');
  } finally {
    env.HTTP_MAX_RESPONSE_BYTES = originalLimit;
    globalThis.fetch = originalFetch;
  }
});


test('HTTP request preserves Headers instance and tuple header inputs', async () => {
  const originalFetch = globalThis.fetch;
  const observed: Array<Headers> = [];
  globalThis.fetch = async (_url, init) => {
    observed.push(new Headers(init?.headers));
    return new Response('ok', { status: 200 });
  };
  try {
    await fetchWithRetry('https://example.invalid/headers-instance', {
      headers: new Headers({ 'x-source-token': 'instance-value' }),
    });
    await fetchWithRetry('https://example.invalid/headers-tuples', {
      headers: [['x-source-token', 'tuple-value']],
    });
    assert.equal(observed[0]?.get('x-source-token'), 'instance-value');
    assert.equal(observed[1]?.get('x-source-token'), 'tuple-value');
    assert.equal(observed[0]?.get('user-agent'), env.HTTP_USER_AGENT);
    assert.equal(observed[1]?.get('user-agent'), env.HTTP_USER_AGENT);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
