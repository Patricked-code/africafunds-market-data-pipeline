import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { CLAIM_PENDING_BACKFILLS_SQL } from '../../src/jobs/backfillClaim.js';

test('two PostgreSQL workers cannot claim the same pending backfill', async () => {
  assert.ok(process.env.DATABASE_URL, 'DATABASE_URL must point to an isolated test database');
  const first = new pg.Client({ connectionString: process.env.DATABASE_URL });
  const second = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await first.connect();
  try {
    await second.connect();
    try {
      await first.query('BEGIN');
      const endpointResult = await first.query<{ endpoint_code: string }>(
        'SELECT endpoint_code FROM source.source_endpoints ORDER BY endpoint_code LIMIT 1',
      );
      const endpoint = endpointResult.rows[0];
      assert.ok(endpoint, 'source registry must be seeded');
      const created = await first.query<{ backfill_job_id: string }>(
        `INSERT INTO ops.backfill_jobs(endpoint_code, window_from, window_to, status)
         VALUES ($1, '1900-01-01', '1900-01-02', 'PENDING')
         ON CONFLICT(endpoint_code, window_from, window_to)
         DO UPDATE SET status='PENDING', attempts=0
         RETURNING backfill_job_id`,
        [endpoint.endpoint_code],
      );
      const jobId = created.rows[0]!.backfill_job_id;
      await first.query('COMMIT');

      // Hold the first claim transaction open so the second worker must SKIP LOCKED.
      await first.query('BEGIN');
      const claimA = await first.query<{ backfill_job_id: string; attempts: number }>(
        CLAIM_PENDING_BACKFILLS_SQL, [1],
      );
      assert.ok(claimA.rows.some(row => row.backfill_job_id === jobId));
      assert.equal(claimA.rows.find(row => row.backfill_job_id === jobId)!.attempts, 0);

      await second.query('BEGIN');
      await second.query('SET LOCAL lock_timeout = 1000');
      const claimB = await second.query<{ backfill_job_id: string }>(CLAIM_PENDING_BACKFILLS_SQL, [1]);
      assert.ok(!claimB.rows.some(row => row.backfill_job_id === jobId),
        'second worker must skip the row locked by the first worker');
      await second.query('ROLLBACK');

      await first.query('COMMIT');
      const result = await second.query<{ status: string; attempts: number }>(
        'SELECT status, attempts FROM ops.backfill_jobs WHERE backfill_job_id=$1', [jobId],
      );
      assert.equal(result.rows[0]!.status, 'RUNNING');
      assert.equal(result.rows[0]!.attempts, 1);
      await second.query('DELETE FROM ops.backfill_jobs WHERE backfill_job_id=$1', [jobId]);
    } finally {
      await second.query('ROLLBACK').catch(() => {});
      await second.end();
    }
  } finally {
    await first.query('ROLLBACK').catch(() => {});
    await first.end();
  }
});
