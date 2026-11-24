import assert from 'node:assert/strict';
import test from 'node:test';
import pg from 'pg';
import { FAIL_EXHAUSTED_BACKFILLS_SQL } from '../../src/jobs/backfillClaim.js';

/**
 * Integration regression: two independent PostgreSQL sessions cannot retire
 * the same exhausted job twice. Requires an isolated, seeded DATABASE_URL.
 */
test('concurrent exhausted-job retirement claims each row at most once', async () => {
  assert.ok(process.env.DATABASE_URL, 'Use an isolated PostgreSQL test database');
  const first = new pg.Client({ connectionString: process.env.DATABASE_URL });
  const second = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await first.connect();
  try {
    await second.connect();
  } catch (error) {
    await first.end();
    throw error;
  }
  let jobId: string | undefined;
  try {
    const endpoint = await first.query<{ endpoint_code: string }>(
      'SELECT endpoint_code FROM source.source_endpoints ORDER BY endpoint_code LIMIT 1',
    );
    assert.ok(endpoint.rows[0], 'source registry must be seeded');
    const created = await first.query<{ backfill_job_id: string }>(
      `INSERT INTO ops.backfill_jobs(endpoint_code, window_from, window_to, status, attempts, locked_at)
       VALUES ($1, '1687-01-01', '1687-01-02', 'RETRY', 4, NULL)
       ON CONFLICT(endpoint_code, window_from, window_to)
       DO UPDATE SET status='RETRY', attempts=4, locked_at=NULL, finished_at=NULL
       RETURNING backfill_job_id`,
      [endpoint.rows[0]!.endpoint_code],
    );
    jobId = created.rows[0]!.backfill_job_id;

    const [a, b] = await Promise.all([
      first.query<{ backfill_job_id: string }>(FAIL_EXHAUSTED_BACKFILLS_SQL, [100]),
      second.query<{ backfill_job_id: string }>(FAIL_EXHAUSTED_BACKFILLS_SQL, [100]),
    ]);
    const observed = [...a.rows, ...b.rows].filter(row => row.backfill_job_id === jobId);
    assert.equal(observed.length, 1, 'the same exhausted job must not be retired twice');

    const state = await first.query<{ status: string; attempts: number; finished_at: Date | null }>(
      'SELECT status, attempts, finished_at FROM ops.backfill_jobs WHERE backfill_job_id=$1',
      [jobId],
    );
    assert.equal(state.rows[0]!.status, 'FAILED');
    assert.equal(state.rows[0]!.attempts, 4);
    assert.ok(state.rows[0]!.finished_at);
  } finally {
    if (jobId) await first.query('DELETE FROM ops.backfill_jobs WHERE backfill_job_id=$1', [jobId]);
    await Promise.all([first.end(), second.end()]);
  }
});
