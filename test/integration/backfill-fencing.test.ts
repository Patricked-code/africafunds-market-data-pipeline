import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { CLAIM_PENDING_BACKFILLS_SQL, RENEW_BACKFILL_LEASE_SQL, RECOVER_EXPIRED_BACKFILLS_SQL } from '../../src/jobs/backfillClaim.js';

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

test('expired RUNNING lease is recovered, but a live lease is not stolen', async () => {
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
      `INSERT INTO ops.backfill_jobs(endpoint_code, window_from, window_to, status, attempts, locked_at)
       VALUES ($1, '1838-01-01', '1838-01-02', 'RUNNING', 1, now())
       ON CONFLICT(endpoint_code, window_from, window_to)
       DO UPDATE SET status='RUNNING', attempts=1, locked_at=now()
       RETURNING backfill_job_id`,
      [endpoint.rows[0]!.endpoint_code],
    );
    jobId = created.rows[0]!.backfill_job_id;
    const live = await client.query(RECOVER_EXPIRED_BACKFILLS_SQL, [900, 10]);
    assert.ok(!live.rows.some(row => row.backfill_job_id === jobId), 'live lease must not be stolen');
    await client.query(
      "UPDATE ops.backfill_jobs SET locked_at=now()-interval '20 minutes' WHERE backfill_job_id=$1",
      [jobId],
    );
    const disabled = await client.query(RECOVER_EXPIRED_BACKFILLS_SQL, [0, 10]);
    assert.ok(!disabled.rows.some(row => row.backfill_job_id === jobId), 'zero TTL must not recover a job');
    const recovered = await client.query(RECOVER_EXPIRED_BACKFILLS_SQL, [900, 10]);
    assert.ok(recovered.rows.some(row => row.backfill_job_id === jobId), 'expired lease must be recovered');
    const state = await client.query<{ status: string; locked_at: Date | null }>(
      'SELECT status, locked_at FROM ops.backfill_jobs WHERE backfill_job_id=$1', [jobId],
    );
    assert.equal(state.rows[0]!.status, 'RETRY');
    assert.equal(state.rows[0]!.locked_at, null);
    const duplicate = await client.query(RECOVER_EXPIRED_BACKFILLS_SQL, [900, 10]);
    assert.ok(!duplicate.rows.some(row => row.backfill_job_id === jobId), 'recovery must be idempotent');
  } finally {
    if (jobId) await client.query('DELETE FROM ops.backfill_jobs WHERE backfill_job_id=$1', [jobId]);
    await client.end();
  }
});


test('expired owner cannot finalize after recovery and a fresh claim', async () => {
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
      `INSERT INTO ops.backfill_jobs(endpoint_code, window_from, window_to, status, attempts, locked_at)
       VALUES ($1, '1837-01-01', '1837-01-02', 'RUNNING', 1, now()-interval '20 minutes')
       ON CONFLICT(endpoint_code, window_from, window_to)
       DO UPDATE SET status='RUNNING', attempts=1, locked_at=now()-interval '20 minutes'
       RETURNING backfill_job_id`,
      [endpoint.rows[0]!.endpoint_code],
    );
    jobId = created.rows[0]!.backfill_job_id;
    const stale = await client.query<{ attempts: number; locked_at: string }>(
      'SELECT attempts, locked_at::text FROM ops.backfill_jobs WHERE backfill_job_id=$1', [jobId],
    );
    const recovered = await client.query(RECOVER_EXPIRED_BACKFILLS_SQL, [900, 10]);
    assert.ok(recovered.rows.some(row => row.backfill_job_id === jobId));
    const oldSuccess = await client.query(
      `UPDATE ops.backfill_jobs SET status='SUCCESS'
        WHERE backfill_job_id=$1 AND status='RUNNING'
          AND attempts=$2 AND locked_at::text=$3`,
      [jobId, stale.rows[0]!.attempts, stale.rows[0]!.locked_at],
    );
    assert.equal(oldSuccess.rowCount, 0, 'recovered claim must reject stale SUCCESS');
    const current = await client.query<{ status: string; attempts: number }>(
      'SELECT status, attempts FROM ops.backfill_jobs WHERE backfill_job_id=$1', [jobId],
    );
    assert.equal(current.rows[0]!.status, 'RETRY');
    assert.equal(current.rows[0]!.attempts, 1, 'recovery must not consume another attempt');
  } finally {
    if (jobId) await client.query('DELETE FROM ops.backfill_jobs WHERE backfill_job_id=$1', [jobId]);
    await client.end();
  }
});


test('heartbeat refresh prevents premature recovery and stale timestamp renewal', async () => {
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
      `INSERT INTO ops.backfill_jobs(endpoint_code, window_from, window_to, status, attempts, locked_at)
       VALUES ($1, '1836-01-01', '1836-01-02', 'RUNNING', 1, now()-interval '20 minutes')
       ON CONFLICT(endpoint_code, window_from, window_to)
       DO UPDATE SET status='RUNNING', attempts=1, locked_at=now()-interval '20 minutes'
       RETURNING backfill_job_id`,
      [endpoint.rows[0]!.endpoint_code],
    );
    jobId = created.rows[0]!.backfill_job_id;
    const before = await client.query<{ locked_at: string }>(
      'SELECT locked_at::text FROM ops.backfill_jobs WHERE backfill_job_id=$1', [jobId],
    );
    const heartbeat = await client.query<{ claim_locked_at: string }>(
      RENEW_BACKFILL_LEASE_SQL, [jobId, 1, before.rows[0]!.locked_at],
    );
    assert.equal(heartbeat.rowCount, 1, 'the current owner renews an expired timestamp before recovery');
    const stale = await client.query(
      RENEW_BACKFILL_LEASE_SQL, [jobId, 1, before.rows[0]!.locked_at],
    );
    assert.equal(stale.rowCount, 0, 'old heartbeat token must not renew again');
    const recovered = await client.query(RECOVER_EXPIRED_BACKFILLS_SQL, [900, 10]);
    assert.ok(!recovered.rows.some(row => row.backfill_job_id === jobId),
      'recovery must not steal a freshly renewed lease');
    const terminal = await client.query(
      `UPDATE ops.backfill_jobs SET status='SUCCESS'
        WHERE backfill_job_id=$1 AND status='RUNNING'
          AND attempts=$2 AND locked_at::text=$3`,
      [jobId, 1, heartbeat.rows[0]!.claim_locked_at],
    );
    assert.equal(terminal.rowCount, 1, 'renewed owner can finalize with latest token');
  } finally {
    if (jobId) await client.query('DELETE FROM ops.backfill_jobs WHERE backfill_job_id=$1', [jobId]);
    await client.end();
  }
});


test('two concurrent recovery workers cannot both recover the same expired job', async () => {
  assert.ok(process.env.DATABASE_URL, 'Use an isolated PostgreSQL test database');
  const a = new pg.Client({ connectionString: process.env.DATABASE_URL });
  const b = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await Promise.all([a.connect(), b.connect()]);
  let jobId: string | undefined;
  try {
    const endpoint = await a.query<{ endpoint_code: string }>(
      'SELECT endpoint_code FROM source.source_endpoints ORDER BY endpoint_code LIMIT 1',
    );
    assert.ok(endpoint.rows[0], 'source registry must be seeded');
    const created = await a.query<{ backfill_job_id: string }>(
      `INSERT INTO ops.backfill_jobs(endpoint_code, window_from, window_to, status, attempts, locked_at)
       VALUES ($1, '1835-01-01', '1835-01-02', 'RUNNING', 1, now()-interval '20 minutes')
       ON CONFLICT(endpoint_code, window_from, window_to)
       DO UPDATE SET status='RUNNING', attempts=1, locked_at=now()-interval '20 minutes'
       RETURNING backfill_job_id`,
      [endpoint.rows[0]!.endpoint_code],
    );
    jobId = created.rows[0]!.backfill_job_id;
    // The two statements run through independent connections, competing for the same row.
    const [left, right] = await Promise.all([
      a.query<{ backfill_job_id: string }>(RECOVER_EXPIRED_BACKFILLS_SQL, [900, 100]),
      b.query<{ backfill_job_id: string }>(RECOVER_EXPIRED_BACKFILLS_SQL, [900, 100]),
    ]);
    const recoveries = [...left.rows, ...right.rows].filter(row => row.backfill_job_id === jobId);
    assert.equal(recoveries.length, 1, 'exactly one recovery worker may claim the expired row');
    const state = await a.query<{ status: string; locked_at: Date | null; attempts: number }>(
      'SELECT status, locked_at, attempts FROM ops.backfill_jobs WHERE backfill_job_id=$1', [jobId],
    );
    assert.equal(state.rows[0]!.status, 'RETRY');
    assert.equal(state.rows[0]!.locked_at, null);
    assert.equal(state.rows[0]!.attempts, 1, 'recovery must not increment the attempt generation');
  } finally {
    if (jobId) await a.query('DELETE FROM ops.backfill_jobs WHERE backfill_job_id=$1', [jobId]);
    await Promise.all([a.end(), b.end()]);
  }
});
