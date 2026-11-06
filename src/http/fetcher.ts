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

export async function fetchWithRetry(url: string, init: RequestInit = {}): Promise<FetchResult> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= env.HTTP_MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.HTTP_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          'user-agent': env.HTTP_USER_AGENT,
          accept: '*/*',
          ...init.headers,
        },
        redirect: 'follow',
        signal: controller.signal,
      });
      if (!response.ok) {
        // 4xx fails immediately, except retryable 429; 5xx retries within policy.
        // Do not read or persist error bodies as market data.
        throw new HttpResponseError(response.status);
      }
      return {
        url: response.url,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: new Uint8Array(await response.arrayBuffer()),
        fetchedAt: new Date().toISOString(),
      };
    } catch (error) {
      lastError = error;
      const isTerminalClientError = error instanceof HttpResponseError
        && error.status >= 400 && error.status < 500 && error.status !== 429;
      if (isTerminalClientError || attempt >= env.HTTP_MAX_RETRIES) break;
      await delay(500 * (2 ** attempt));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Échec HTTP');
}
