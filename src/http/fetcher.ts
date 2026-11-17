import { setTimeout as delay } from 'node:timers/promises';
import { env } from '../config/env.js';

export interface FetchResult {
  url: string;
  status: number;
  headers: Record<string, string>;
  body: Uint8Array;
  fetchedAt: string;
}

/** A non-2xx response must never be archived as a successful source artifact. */
export class HttpResponseError extends Error {
  constructor(public readonly status: number) {
    super(`Réponse HTTP non valide (statut ${status})`);
    this.name = 'HttpResponseError';
  }
}

/** Large or infinite responses are rejected before they can exhaust worker memory. */
export class HttpBodyTooLargeError extends Error {
  constructor(public readonly maxBytes: number) {
    super(`Réponse HTTP trop volumineuse (limite ${maxBytes} octets)`);
    this.name = 'HttpBodyTooLargeError';
  }
}

async function readLimitedBody(response: Response, maxBytes: number): Promise<Uint8Array> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    try {
      await response.body?.cancel();
    } catch {
      // Preserve the size-limit error even when stream cancellation fails.
    }
    throw new HttpBodyTooLargeError(maxBytes);
  }
  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      if (!next.value) continue;
      total += next.value.byteLength;
      if (total > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // Preserve the size-limit error even when stream cancellation fails.
        }
        throw new HttpBodyTooLargeError(maxBytes);
      }
      chunks.push(next.value);
    }
  } catch (error) {
    // A failed read must not leave a response stream held by the retry loop.
    // Cancellation errors must not replace the original network/body failure.
    try {
      await reader.cancel();
    } catch {
      // Preserve the original read error.
    }
    throw error;
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function fetchWithRetry(url: string, init: RequestInit = {}): Promise<FetchResult> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= env.HTTP_MAX_RETRIES; attempt += 1) {
    // Respect explicit caller cancellation, including before the first attempt.
    if (init.signal?.aborted) throw init.signal.reason ?? new DOMException('Aborted', 'AbortError');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.HTTP_TIMEOUT_MS);
    try {
      // RequestInit.headers also accepts Headers and [name, value][]; object
      // spread silently discards those representations.
      const headers = new Headers(init.headers);
      if (!headers.has('user-agent')) headers.set('user-agent', env.HTTP_USER_AGENT);
      if (!headers.has('accept')) headers.set('accept', '*/*');
      const response = await fetch(url, {
        ...init,
        headers,
        redirect: 'follow',
        signal: init.signal ? AbortSignal.any([controller.signal, init.signal]) : controller.signal,
      });
      if (!response.ok) {
        // Release the response stream on terminal and retryable errors alike.
        // Otherwise repeated 429/5xx responses can retain HTTP connections.
        // A cancellation failure must not hide the original HTTP status.
        try {
          await response.body?.cancel();
        } catch {
          // Preserve the authoritative HTTP error below.
        }
        // 4xx fails immediately, except retryable 429; 5xx retries within policy.
        // Do not read or persist error bodies as market data.
        throw new HttpResponseError(response.status);
      }
      return {
        url: response.url,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: await readLimitedBody(response, env.HTTP_MAX_RESPONSE_BYTES),
        fetchedAt: new Date().toISOString(),
      };
    } catch (error) {
      lastError = error;
      // Caller cancellation is terminal; never retry a request it has withdrawn.
      if (init.signal?.aborted) throw init.signal.reason ?? new DOMException('Aborted', 'AbortError');
      const isTerminalClientError = error instanceof HttpResponseError
        && error.status >= 400 && error.status < 500 && error.status !== 429;
      if (isTerminalClientError || error instanceof HttpBodyTooLargeError || attempt >= env.HTTP_MAX_RETRIES) break;
      // An aborted caller must not remain blocked in exponential retry backoff.
      await delay(500 * (2 ** attempt), undefined, { signal: init.signal ?? undefined });
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Échec HTTP');
}
