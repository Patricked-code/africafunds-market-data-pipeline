import assert from 'node:assert/strict';
import test from 'node:test';
import pg from 'pg';
import { RENEW_BACKFILL_LEASE_SQL, RECOVER_EXPIRED_BACKFILLS_SQL } from '../../src/jobs/backfillClaim.js';

/**
 * Deterministic PostgreSQL lock-order regression. A heartbeat owns the row
 * lock while recovery uses SKIP LOCKED, then the renewed lease is fresh.
 * Run only against the isolated, migrated and seeded integration database.
 */
test('heartbeat transaction excludes concurrent recovery and preserves ownership', async () => {
  assert.ok(process.env.DATABASE_URL, 'Use an isolated PostgreSQL test database');
  const owner = new pg.Client({ connectionString: process.env.DATABASE_URL });
  const recovery = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await Promise.all([owner.connect(), recovery.connect()]);
  let jobId: string | undefined;
  let transactionOpen = false;
  try {
    const endpoint = await owner.query<{ endpoint_code: string }>(
      'SELECT endpoint_code FROM source.source_endpoints ORDER BY endpoint_code LIMIT 1',
    );
    assert.ok(endpoint.rows[0], 'source registry must be seeded');
    const fixture = await owner.query<{ backfill_job_id: string }>(
      `INSERT INTO ops.backfill_jobs(endpoint_code, window_from, window_to, status, attempts, locked_at)
       VALUES ($1, '1627-01-01', '1627-01-02', 'RUNNING', 1, now()-interval '20 minutes')
       ON CONFLICT(endpoint_code, window_from, window_to) DO NOTHING
       RETURNING backfill_job_id`,
      [endpoint.rows[0]!.endpoint_code],
    );
    assert.equal(fixture.rowCount, 1, 'fixture date window must be unused; never overwrite an existing job');
    jobId = fixture.rows[0]!.backfill_job_id;
    const old = await owner.query<{ locked_at: string }>(
      'SELECT locked_at::text FROM ops.backfill_jobs WHERE backfill_job_id=$1', [jobId],
    );
    await owner.query('BEGIN');
    transactionOpen = true;
    const renewed = await owner.query<{ claim_locked_at: string }>(
      RENEW_BACKFILL_LEASE_SQL, [jobId, 1, old.rows[0]!.locked_at],
    );
    assert.equal(renewed.rowCount, 1, 'owner must renew while holding the row lock');

    // SKIP LOCKED must not wait for, or steal, the uncommitted heartbeat.
    await recovery.query("SET statement_timeout = '3000ms'");
    const raced = await recovery.query<{ backfill_job_id: string }>(
      RECOVER_EXPIRED_BACKFILLS_SQL, [900, 100],
    );
    assert.ok(!raced.rows.some(row => row.backfill_job_id === jobId),
      'recovery must skip the row locked by the heartbeat');
    await owner.query('COMMIT');
    transactionOpen = false;

    const afterCommit = await recovery.query<{ backfill_job_id: string }>(
      RECOVER_EXPIRED_BACKFILLS_SQL, [900, 100],
    );
    assert.ok(!afterCommit.rows.some(row => row.backfill_job_id === jobId),
      'committed heartbeat must prevent expiry-based recovery');
    const oldToken = await recovery.query(
      RENEW_BACKFILL_LEASE_SQL, [jobId, 1, old.rows[0]!.locked_at],
    );
    assert.equal(oldToken.rowCount, 0, 'obsolete timestamp must not renew');
    const final = await owner.query<{ status: string; attempts: number; locked_at: string }>(
      'SELECT status, attempts, locked_at::text FROM ops.backfill_jobs WHERE backfill_job_id=$1', [jobId],
    );
    assert.equal(final.rows[0]!.status, 'RUNNING');
    assert.equal(final.rows[0]!.attempts, 1);
    assert.equal(final.rows[0]!.locked_at, renewed.rows[0]!.claim_locked_at);
  } finally {
    if (transactionOpen) await owner.query('ROLLBACK');
    if (jobId) await owner.query('DELETE FROM ops.backfill_jobs WHERE backfill_job_id=$1', [jobId]);
    await Promise.all([owner.end(), recovery.end()]);
  }
});
