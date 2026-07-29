import { setTimeout as delay } from 'node:timers/promises';
import { env } from '../config/env.js';

export interface FetchResult {
  url: string;
  status: number;
  headers: Record<string, string>;
  body: Uint8Array;
  fetchedAt: string;
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
      const body = new Uint8Array(await response.arrayBuffer());
      if (!response.ok && response.status >= 500 && attempt < env.HTTP_MAX_RETRIES) {
        await delay(500 * (2 ** attempt));
        continue;
      }
      return {
        url: response.url,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body,
        fetchedAt: new Date().toISOString(),
      };
    } catch (error) {
      lastError = error;
      if (attempt >= env.HTTP_MAX_RETRIES) break;
      await delay(500 * (2 ** attempt));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Échec HTTP: ${url}`);
}
