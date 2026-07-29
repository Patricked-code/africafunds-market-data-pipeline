import { listEndpoints } from '../config/registry.js';
import { fetchWithRetry } from '../http/fetcher.js';
import { pool } from '../db/pool.js';
import { logger } from '../config/logger.js';

export async function auditSources(): Promise<void> {
  const endpoints = await listEndpoints();
  for (const endpoint of endpoints) {
    const started = Date.now();
    try {
      const result = await fetchWithRetry(endpoint.url, { method: 'GET' });
      const latency = Date.now() - started;
      await pool.query(
        `INSERT INTO quality.source_health_checks(endpoint_code, checked_at, http_status, latency_ms, final_url, content_type, is_available)
         VALUES ($1,now(),$2,$3,$4,$5,$6)`,
        [endpoint.id, result.status, latency, result.url, result.headers['content-type'] ?? null, result.status >= 200 && result.status < 400],
      );
      logger.info({ endpoint: endpoint.id, status: result.status, latency }, 'Source contrôlée');
    } catch (error) {
      await pool.query(
        `INSERT INTO quality.source_health_checks(endpoint_code, checked_at, is_available, error_message)
         VALUES ($1,now(),false,$2)`,
        [endpoint.id, error instanceof Error ? error.message : String(error)],
      );
      logger.warn({ endpoint: endpoint.id, error }, 'Source indisponible');
    }
  }
}
