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


test('stream read failure releases the reader lock and preserves the original error', async () => {
  const originalFetch = globalThis.fetch;
  const originalRetries = env.HTTP_MAX_RETRIES;
  env.HTTP_MAX_RETRIES = 0;
  const readFailure = new Error('source stream failed');
  const stream = new ReadableStream<Uint8Array>({
    pull() { throw readFailure; },
  });
  globalThis.fetch = async () => new Response(stream, { status: 200 });
  try {
    await assert.rejects(fetchWithRetry('https://example.invalid/read-failure'),
      (error: unknown) => error === readFailure);
    // An errored ReadableStream rejects cancel() without invoking its underlying
    // source cancel callback. The observable cleanup guarantee is lock release.
    assert.equal(stream.locked, false, 'failed body reads must release the reader lock');
  } finally {
    env.HTTP_MAX_RETRIES = originalRetries;
    globalThis.fetch = originalFetch;
  }
});

test('HTTP 429 retries even when response cancellation fails, preserving the final status', async () => {
  const originalFetch = globalThis.fetch;
  const originalRetries = env.HTTP_MAX_RETRIES;
  env.HTTP_MAX_RETRIES = 1;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(new ReadableStream<Uint8Array>({
      cancel() { throw new Error('cancellation failed'); },
    }), { status: 429 });
  };
  try {
    await assert.rejects(fetchWithRetry('https://example.invalid/rate-limited'),
      (error: unknown) => error instanceof HttpResponseError && error.status === 429);
    assert.equal(calls, 2, 'retryable 429 must honor the configured retry limit');
  } finally {
    env.HTTP_MAX_RETRIES = originalRetries;
    globalThis.fetch = originalFetch;
  }
});


test('caller-aborted requests do not start a fetch or retry', async () => {
  const originalFetch = globalThis.fetch;
  const controller = new AbortController();
  controller.abort(new DOMException('caller cancelled', 'AbortError'));
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response('unexpected', { status: 200 });
  };
  try {
    await assert.rejects(fetchWithRetry('https://example.invalid/cancelled', {
      signal: controller.signal,
    }), (error: unknown) => error instanceof Error && error.name === 'AbortError');
    assert.equal(calls, 0, 'a cancelled caller must not start or retry an HTTP request');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('in-flight caller abort propagates without retrying', async () => {
  const originalFetch = globalThis.fetch;
  const originalRetries = env.HTTP_MAX_RETRIES;
  env.HTTP_MAX_RETRIES = 2;
  const controller = new AbortController();
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls += 1;
    controller.abort(new DOMException('cancelled in flight', 'AbortError'));
    if (init?.signal?.aborted) throw init.signal.reason;
    return new Response('unexpected', { status: 200 });
  };
  try {
    await assert.rejects(fetchWithRetry('https://example.invalid/inflight', {
      signal: controller.signal,
    }), (error: unknown) => error instanceof Error && error.name === 'AbortError');
    assert.equal(calls, 1, 'caller abort must stop the retry loop');
  } finally {
    env.HTTP_MAX_RETRIES = originalRetries;
    globalThis.fetch = originalFetch;
  }
});


test('caller abort during retry backoff stops promptly without another fetch', async () => {
  const originalFetch = globalThis.fetch;
  const originalRetries = env.HTTP_MAX_RETRIES;
  env.HTTP_MAX_RETRIES = 2;
  const controller = new AbortController();
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    queueMicrotask(() => controller.abort(new DOMException('cancelled during backoff', 'AbortError')));
    return new Response(null, { status: 503 });
  };
  try {
    const startedAt = Date.now();
    await assert.rejects(fetchWithRetry('https://example.invalid/backoff-cancel', {
      signal: controller.signal,
    }), (error: unknown) => error instanceof Error && error.name === 'AbortError');
    assert.ok(Date.now() - startedAt < 400, 'caller abort must interrupt the 500ms retry backoff');
    assert.equal(calls, 1, 'abort during backoff must prevent the next attempt');
  } finally {
    env.HTTP_MAX_RETRIES = originalRetries;
    globalThis.fetch = originalFetch;
  }
});


test('nullable RequestInit.signal retains retry behavior without a caller abort signal', async () => {
  const originalFetch = globalThis.fetch;
  const originalRetries = env.HTTP_MAX_RETRIES;
  env.HTTP_MAX_RETRIES = 1;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(null, { status: calls === 1 ? 503 : 200 });
  };
  try {
    const result = await fetchWithRetry('https://example.invalid/nullable-signal', { signal: null });
    assert.equal(result.status, 200);
    assert.equal(calls, 2, 'null signal must preserve retry after a transient 503');
  } finally {
    env.HTTP_MAX_RETRIES = originalRetries;
    globalThis.fetch = originalFetch;
  }
});
