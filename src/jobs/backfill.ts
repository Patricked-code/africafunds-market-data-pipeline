import { pool } from '../db/pool.js';
import { listEndpoints } from '../config/registry.js';
import { env } from '../config/env.js';
import { toIsoDate } from '../utils/dates.js';
import { logger } from '../config/logger.js';
import { loadRegistry } from '../config/registry.js';
import { runIngestion } from './ingest.js';

export async function enqueueBackfill(input: { market?: string; family?: string; from: string; to: string }): Promise<number> {
  const endpoints = await listEndpoints({ market: input.market, family: input.family });
  const start = new Date(`${toIsoDate(input.from)}T00:00:00Z`);
  const end = new Date(`${toIsoDate(input.to)}T00:00:00Z`);
  if (start > end) throw new Error('La date de début doit précéder la date de fin');
  let count = 0;
  for (const endpoint of endpoints) {
    for (let cursor = new Date(start); cursor <= end;) {
      const batchStart = new Date(cursor);
      const batchEnd = new Date(Math.min(
        end.getTime(),
        batchStart.getTime() + (env.BACKFILL_BATCH_DAYS - 1) * 86_400_000,
      ));
      await pool.query(
        `INSERT INTO ops.backfill_jobs(endpoint_code, window_from, window_to, status)
         VALUES ($1,$2,$3,'PENDING')
         ON CONFLICT(endpoint_code, window_from, window_to) DO NOTHING`,
        [endpoint.id, toIsoDate(batchStart), toIsoDate(batchEnd)],
      );
      count += 1;
      cursor = new Date(batchEnd.getTime() + 86_400_000);
    }
  }
  logger.info({ jobs: count, ...input }, 'Fenêtres de rattrapage historique créées');
  return count;
}

export async function listPendingBackfills(limit = 100): Promise<void> {
  const result = await pool.query(
    `SELECT endpoint_code, window_from, window_to, status, attempts
       FROM ops.backfill_jobs
      WHERE status IN ('PENDING','RETRY')
      ORDER BY window_from, endpoint_code
      LIMIT $1`,
    [limit],
  );
  console.table(result.rows);
}


export async function processBackfillJobs(limit = 10): Promise<void> {
  const registry = await loadRegistry();
  const collectors = new Map(registry.markets.flatMap((market) => market.endpoints.map((endpoint) => [endpoint.id, endpoint.collector] as const)));
  const jobs = await pool.query<{
    backfill_job_id: string;
    endpoint_code: string;
    window_from: string;
    window_to: string;
    attempts: number;
  }>(
    `SELECT backfill_job_id, endpoint_code, window_from::text, window_to::text, attempts
       FROM ops.backfill_jobs
      WHERE status IN ('PENDING','RETRY')
      ORDER BY window_from, endpoint_code
      FOR UPDATE SKIP LOCKED
      LIMIT $1`,
    [limit],
  );

  for (const job of jobs.rows) {
    const collector = collectors.get(job.endpoint_code);
    if (collector === 'MANUAL_API_DISCOVERY') {
      await pool.query(
        `UPDATE ops.backfill_jobs
            SET status='BLOCKED_ADAPTER', finished_at=now(), last_error='Adaptateur API spécifique requis'
          WHERE backfill_job_id=$1`,
        [job.backfill_job_id],
      );
      continue;
    }
    await pool.query(
      `UPDATE ops.backfill_jobs
          SET status='RUNNING', locked_at=now(), started_at=now(), attempts=attempts+1
        WHERE backfill_job_id=$1`,
      [job.backfill_job_id],
    );
    try {
      await runIngestion({ endpointCode: job.endpoint_code, mode: 'discover' });
      await pool.query(
        `UPDATE ops.backfill_jobs SET status='SUCCESS', finished_at=now(), last_error=NULL WHERE backfill_job_id=$1`,
        [job.backfill_job_id],
      );
    } catch (error) {
      const attempts = job.attempts + 1;
      await pool.query(
        `UPDATE ops.backfill_jobs
            SET status=$2, finished_at=now(), last_error=$3
          WHERE backfill_job_id=$1`,
        [job.backfill_job_id, attempts >= 4 ? 'FAILED' : 'RETRY', error instanceof Error ? error.message : String(error)],
      );
    }
  }
}
