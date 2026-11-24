import type pg from 'pg';
import { pool } from '../db/pool.js';

export async function startRun(input: { jobType: string; scope: Record<string, unknown> }): Promise<string> {
  const result = await pool.query<{ ingestion_run_id: string }>(
    `INSERT INTO ops.ingestion_runs(job_type, scope, status)
     VALUES ($1, $2::jsonb, 'RUNNING') RETURNING ingestion_run_id`,
    [input.jobType, JSON.stringify(input.scope)],
  );
  return result.rows[0]!.ingestion_run_id;
}

export async function finishRun(runId: string, status: 'SUCCESS' | 'PARTIAL' | 'FAILED', summary: Record<string, unknown>, error?: unknown): Promise<void> {
  // TypeScript unions do not validate callers at runtime (e.g. JavaScript or unsafe casts).
  // Reject invalid terminal statuses before any SQL is sent, preserving the RUNNING row.
  if (status !== 'SUCCESS' && status !== 'PARTIAL' && status !== 'FAILED') {
    throw new Error(`INVALID_TERMINAL_STATUS: ${String(status)}`);
  }
  const result = await pool.query(
    `UPDATE ops.ingestion_runs
       SET status=$2, finished_at=now(), summary=$3::jsonb, error_message=$4
     WHERE ingestion_run_id=$1 AND status='RUNNING'`,
    [runId, status, JSON.stringify(summary), error instanceof Error ? error.message : error ? String(error) : null],
  );
  if (result.rowCount !== 1) {
    throw new Error(`TERMINAL_WRITE_CONFLICT: ingestion run ${runId} is missing or already finalized`);
  }
}

export async function upsertEndpoint(client: pg.PoolClient, endpoint: {
  id: string; marketCode: string; label: string; url: string; dataFamily: string; collector: string; frequency: string;
}): Promise<void> {
  await client.query(
    `INSERT INTO source.source_endpoints(endpoint_code, market_code, label, url, data_family, collector_type, frequency, enabled)
     VALUES ($1,$2,$3,$4,$5,$6,$7,true)
     ON CONFLICT(endpoint_code) DO UPDATE SET
       market_code=EXCLUDED.market_code, label=EXCLUDED.label, url=EXCLUDED.url,
       data_family=EXCLUDED.data_family, collector_type=EXCLUDED.collector_type,
       frequency=EXCLUDED.frequency, updated_at=now()`,
    [endpoint.id, endpoint.marketCode, endpoint.label, endpoint.url, endpoint.dataFamily, endpoint.collector, endpoint.frequency],
  );
}
