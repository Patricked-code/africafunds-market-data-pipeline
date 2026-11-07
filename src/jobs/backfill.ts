import { pool } from '../db/pool.js';
import { listEndpoints } from '../config/registry.js';
import { env } from '../config/env.js';
import { toIsoDate } from '../utils/dates.js';
import { logger } from '../config/logger.js';
import { loadRegistry } from '../config/registry.js';
import { assertHistoricalWindowEvidence, findHistoricalWindowAdapter } from './historicalWindowAdapter.js';
import { CLAIM_PENDING_BACKFILLS_SQL, RECOVER_EXPIRED_BACKFILLS_SQL } from './backfillClaim.js';

export async function enqueueBackfill(input: { market?: string; family?: string; from: string; to: string }): Promise<number> {
  const endpoints = await listEndpoints({
    ...(input.market !== undefined ? { market: input.market } : {}),
    ...(input.family !== undefined ? { family: input.family } : {}),
  });
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
  // Recover only expired RUNNING claims before selecting new work. Recovery and
  // claim each use bounded, atomic SKIP LOCKED statements; never mark SUCCESS.
  // Keep the lease conservative until periodic renewal and cancellation are wired.
  const recovery = await pool.query(RECOVER_EXPIRED_BACKFILLS_SQL, [900, Math.max(0, Math.min(limit, 100))]);
  if (recovery.rowCount) {
    logger.warn({ recoveredJobs: recovery.rowCount }, 'Expired backfill claims requeued');
  }
  // Atomic claim: row locks and RUNNING transitions occur in the same SQL statement.
  // A plain SELECT ... FOR UPDATE through pool.query releases its lock before
  // the subsequent UPDATE, allowing two workers to process the same job.
  const jobs = await pool.query<{
    backfill_job_id: string;
    endpoint_code: string;
    window_from: string;
    window_to: string;
    attempts: number;
    claim_attempt: number;
    claim_locked_at: string;
  }>(CLAIM_PENDING_BACKFILLS_SQL, [limit]);

  for (const job of jobs.rows) {
    const collector = collectors.get(job.endpoint_code);
    // Generic discover/ingest reads the present page; it DOES NOT honour
    // window_from/window_to. Prevent a historical false SUCCESS for all
    // unqualified sources (including those not marked MANUAL_API_DISCOVERY).
    const adapter = findHistoricalWindowAdapter(job.endpoint_code);
    if (!adapter) {
      await pool.query(
        `UPDATE ops.backfill_jobs
            SET status='BLOCKED_ADAPTER', finished_at=now(), last_error=$4
          WHERE backfill_job_id=$1 AND status='RUNNING'
            AND attempts=$2 AND locked_at::text=$3`,
        [job.backfill_job_id, job.claim_attempt, job.claim_locked_at,
          `No qualified date-bounded adapter for ${job.endpoint_code} (collector=${collector ?? 'UNKNOWN'}, window=${job.window_from}..${job.window_to})`],
      );
      continue;
    }
    try {
      const window = { endpointCode: job.endpoint_code, from: job.window_from, to: job.window_to };
      const evidence = await adapter.ingestWindow(window);
      assertHistoricalWindowEvidence(window, evidence);
      await pool.query(
        `UPDATE ops.backfill_jobs SET status='SUCCESS', finished_at=now(), last_error=NULL
          WHERE backfill_job_id=$1 AND status='RUNNING'
            AND attempts=$2 AND locked_at::text=$3`,
        [job.backfill_job_id, job.claim_attempt, job.claim_locked_at],
      );
    } catch (error) {
      const attempts = job.attempts + 1;
      await pool.query(
        `UPDATE ops.backfill_jobs
            SET status=$4, finished_at=now(), last_error=$5
          WHERE backfill_job_id=$1 AND status='RUNNING'
            AND attempts=$2 AND locked_at::text=$3`,
        [job.backfill_job_id, job.claim_attempt, job.claim_locked_at,
          attempts >= 4 ? 'FAILED' : 'RETRY', error instanceof Error ? error.message : String(error)],
      );
    }
  }
}
