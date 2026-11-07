import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../src/db/pool.js';
import { processBackfillJobs } from '../../src/jobs/backfill.js';

test('a historical backfill cannot succeed without a proven window adapter or fetch current data', async () => {
  assert.ok(process.env.DATABASE_URL, 'Use an isolated PostgreSQL test database');
  let jobId: string | undefined;
  const initialFetch = globalThis.fetch;
  let calls = 0;
  try {
    const endpoint = await pool.query<{ endpoint_code: string }>(
      "SELECT endpoint_code FROM source.source_endpoints WHERE collector_type != 'MANUAL_API_DISCOVERY' ORDER BY endpoint_code LIMIT 1",
    );
    assert.ok(endpoint.rows[0], 'source registry must be seeded');
    const created = await pool.query<{ backfill_job_id: string }>(
      `INSERT INTO ops.backfill_jobs(endpoint_code, window_from, window_to, status)
       VALUES ($1, '1840-01-01', '1840-01-04', 'PENDING')
       ON CONFLICT(endpoint_code, window_from, window_to)
       DO UPDATE SET status='PENDING', attempts=0, last_error=NULL
       RETURNING backfill_job_id`,
      [endpoint.rows[0]!.endpoint_code],
    );
    jobId = created.rows[0]!.backfill_job_id;

    const beforeRuns = await pool.query<{ n: string }>('SELECT count(*)::text AS n FROM ops.ingestion_runs');
    const beforeArtifacts = await pool.query<{ n: string }>('SELECT count(*)::text AS n FROM source.raw_artifacts');
    globalThis.fetch = async () => {
      calls += 1;
      throw new Error('Network was forbidden for unqualified historical source');
    };

    await processBackfillJobs(1);

    const result = await pool.query<{
      status: string; attempts: number; last_error: string | null;
    }>('SELECT status, attempts, last_error FROM ops.backfill_jobs WHERE backfill_job_id=$1', [jobId]);
    assert.equal(result.rows[0]?.status, 'BLOCKED_ADAPTER');
    assert.equal(result.rows[0]?.attempts, 1);
    assert.match(result.rows[0]?.last_error ?? '', /No qualified date-bounded adapter/);
    assert.match(result.rows[0]?.last_error ?? '', /1840-01-01\.\.1840-01-04/);
    assert.equal(calls, 0, 'generic current-page discovery must not run');
    const afterRuns = await pool.query<{ n: string }>('SELECT count(*)::text AS n FROM ops.ingestion_runs');
    const afterArtifacts = await pool.query<{ n: string }>('SELECT count(*)::text AS n FROM source.raw_artifacts');
    assert.equal(afterRuns.rows[0]!.n, beforeRuns.rows[0]!.n);
    assert.equal(afterArtifacts.rows[0]!.n, beforeArtifacts.rows[0]!.n);
  } finally {
    globalThis.fetch = initialFetch;
    if (jobId) await pool.query('DELETE FROM ops.backfill_jobs WHERE backfill_job_id=$1', [jobId]);
    await pool.end();
  }
});
