import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { CLAIM_PENDING_BACKFILLS_SQL, RENEW_BACKFILL_LEASE_SQL } from '../../src/jobs/backfillClaim.js';

// Exercise the same attempt + locked_at ownership predicate as backfill.ts.
test('a stale backfill worker cannot finalize after another worker owns the job', async () => {
  assert.ok(process.env.DATABASE_URL, 'Use an isolated PostgreSQL test database');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  let jobId: string | undefined;
  try {
    const endpoint = await client.query<{ endpoint_code: string }>(
      'SELECT endpoint_code FROM source.source_endpoints ORDER BY endpoint_code LIMIT 1',
    );
    assert.ok(endpoint.rows[0], 'source registry must be seeded');
    const created = await client.query<{ backfill_job_id: string }>(
      `INSERT INTO ops.backfill_jobs(endpoint_code, window_from, window_to, status)
       VALUES ($1, '1839-01-01', '1839-01-02', 'PENDING')
       ON CONFLICT(endpoint_code, window_from, window_to)
       DO UPDATE SET status='PENDING', attempts=0, locked_at=NULL
       RETURNING backfill_job_id`,
      [endpoint.rows[0]!.endpoint_code],
    );
    jobId = created.rows[0]!.backfill_job_id;
    const first = await client.query<{
      backfill_job_id: string; claim_attempt: number; claim_locked_at: string;
    }>(CLAIM_PENDING_BACKFILLS_SQL, [1]);
    const a = first.rows.find(row => row.backfill_job_id === jobId);
    assert.ok(a, 'first worker must own the test job');

    // The current owner may renew its lease, while an obsolete timestamp may not.
    const renewed = await client.query<{ claim_locked_at: string }>(
      RENEW_BACKFILL_LEASE_SQL, [jobId, a.claim_attempt, a.claim_locked_at],
    );
    assert.equal(renewed.rowCount, 1);
    const oldLease = await client.query(
      RENEW_BACKFILL_LEASE_SQL, [jobId, a.claim_attempt - 1, a.claim_locked_at],
    );
    assert.equal(oldLease.rowCount, 0, 'a stale generation cannot renew');

    // Simulate a recovery that explicitly revokes A and increments the generation.
    await client.query(
      `UPDATE ops.backfill_jobs
          SET attempts=attempts+1, locked_at=now()+interval '1 second', status='RUNNING'
        WHERE backfill_job_id=$1`, [jobId],
    );
    const staleRenew = await client.query(
      RENEW_BACKFILL_LEASE_SQL, [jobId, a.claim_attempt, renewed.rows[0]!.claim_locked_at],
    );
    assert.equal(staleRenew.rowCount, 0, 'A cannot renew after B takes ownership');
    const staleSuccess = await client.query(
      `UPDATE ops.backfill_jobs SET status='SUCCESS'
        WHERE backfill_job_id=$1 AND status='RUNNING'
          AND attempts=$2 AND locked_at::text=$3`,
      [jobId, a.claim_attempt, a.claim_locked_at],
    );
    assert.equal(staleSuccess.rowCount, 0, 'A must not write SUCCESS');
    const staleFailure = await client.query(
      `UPDATE ops.backfill_jobs SET status='FAILED'
        WHERE backfill_job_id=$1 AND status='RUNNING'
          AND attempts=$2 AND locked_at::text=$3`,
      [jobId, a.claim_attempt, a.claim_locked_at],
    );
    assert.equal(staleFailure.rowCount, 0, 'A must not write FAILED');

    const b = await client.query<{ attempts: number; locked_at: string }>(
      'SELECT attempts, locked_at::text FROM ops.backfill_jobs WHERE backfill_job_id=$1', [jobId],
    );
    const ownerSuccess = await client.query(
      `UPDATE ops.backfill_jobs SET status='SUCCESS'
        WHERE backfill_job_id=$1 AND status='RUNNING'
          AND attempts=$2 AND locked_at::text=$3`,
      [jobId, b.rows[0]!.attempts, b.rows[0]!.locked_at],
    );
    assert.equal(ownerSuccess.rowCount, 1, 'B alone can finalize');
    const final = await client.query<{ status: string }>(
      'SELECT status FROM ops.backfill_jobs WHERE backfill_job_id=$1', [jobId],
    );
    assert.equal(final.rows[0]!.status, 'SUCCESS');
  } finally {
    if (jobId) await client.query('DELETE FROM ops.backfill_jobs WHERE backfill_job_id=$1', [jobId]);
    await client.end();
  }
});
