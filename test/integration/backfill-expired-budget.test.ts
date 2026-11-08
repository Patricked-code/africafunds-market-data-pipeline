import assert from 'node:assert/strict';
import test from 'node:test';
import pg from 'pg';
import { CLAIM_PENDING_BACKFILLS_SQL, FAIL_EXHAUSTED_BACKFILLS_SQL, RECOVER_EXPIRED_BACKFILLS_SQL } from '../../src/jobs/backfillClaim.js';

test('expired lease with exhausted retry budget is FAILED, never requeued', async () => {
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
       VALUES ($1, '1834-01-01', '1834-01-02', 'RUNNING', 4, now()-interval '20 minutes')
       ON CONFLICT(endpoint_code, window_from, window_to)
       DO UPDATE SET status='RUNNING', attempts=4, locked_at=now()-interval '20 minutes'
       RETURNING backfill_job_id`,
      [endpoint.rows[0]!.endpoint_code],
    );
    jobId = created.rows[0]!.backfill_job_id;
    const recovered = await client.query<{ backfill_job_id: string }>(
      RECOVER_EXPIRED_BACKFILLS_SQL, [900, 100],
    );
    assert.ok(recovered.rows.some(row => row.backfill_job_id === jobId));
    const state = await client.query<{
      status: string; attempts: number; locked_at: Date | null;
      finished_at: Date | null; last_error: string | null;
    }>('SELECT status, attempts, locked_at, finished_at, last_error FROM ops.backfill_jobs WHERE backfill_job_id=$1', [jobId]);
    assert.equal(state.rows[0]!.status, 'FAILED');
    assert.equal(state.rows[0]!.attempts, 4);
    assert.equal(state.rows[0]!.locked_at, null);
    assert.ok(state.rows[0]!.finished_at);
    assert.match(state.rows[0]!.last_error ?? '', /retry budget exhausted/);
    const again = await client.query(RECOVER_EXPIRED_BACKFILLS_SQL, [900, 100]);
    assert.ok(!again.rows.some(row => row.backfill_job_id === jobId));
  } finally {
    if (jobId) await client.query('DELETE FROM ops.backfill_jobs WHERE backfill_job_id=$1', [jobId]);
    await client.end();
  }
});

test('expired lease with remaining retry budget is requeued exactly once', async () => {
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
      `INSERT INTO ops.backfill_jobs(endpoint_code, window_from, window_to, status, attempts, locked_at, finished_at)
       VALUES ($1, '1835-01-01', '1835-01-02', 'RUNNING', 3, now()-interval '20 minutes', NULL)
       ON CONFLICT(endpoint_code, window_from, window_to)
       DO UPDATE SET status='RUNNING', attempts=3, locked_at=now()-interval '20 minutes', finished_at=NULL
       RETURNING backfill_job_id`,
      [endpoint.rows[0]!.endpoint_code],
    );
    jobId = created.rows[0]!.backfill_job_id;
    const recovered = await client.query<{ backfill_job_id: string }>(
      RECOVER_EXPIRED_BACKFILLS_SQL, [900, 100],
    );
    assert.equal(recovered.rows.filter(row => row.backfill_job_id === jobId).length, 1);
    const state = await client.query<{
      status: string; attempts: number; locked_at: Date | null;
      finished_at: Date | null; last_error: string | null;
    }>(
      'SELECT status, attempts, locked_at, finished_at, last_error FROM ops.backfill_jobs WHERE backfill_job_id=$1',
      [jobId],
    );
    assert.equal(state.rows[0]!.status, 'RETRY');
    assert.equal(state.rows[0]!.attempts, 3);
    assert.equal(state.rows[0]!.locked_at, null);
    assert.equal(state.rows[0]!.finished_at, null);
    assert.match(state.rows[0]!.last_error ?? '', /awaiting a new atomic claim/);
    const again = await client.query<{ backfill_job_id: string }>(
      RECOVER_EXPIRED_BACKFILLS_SQL, [900, 100],
    );
    assert.ok(!again.rows.some(row => row.backfill_job_id === jobId));
  } finally {
    if (jobId) await client.query('DELETE FROM ops.backfill_jobs WHERE backfill_job_id=$1', [jobId]);
    await client.end();
  }
});


test('atomic claim skips legacy RETRY jobs whose four attempts are exhausted', async () => {
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
       VALUES ($1, '1701-01-01', '1701-01-02', 'RETRY', 4, NULL)
       ON CONFLICT(endpoint_code, window_from, window_to)
       DO UPDATE SET status='RETRY', attempts=4, locked_at=NULL
       RETURNING backfill_job_id`,
      [endpoint.rows[0]!.endpoint_code],
    );
    jobId = created.rows[0]!.backfill_job_id;
    const claims = await client.query<{ backfill_job_id: string }>(CLAIM_PENDING_BACKFILLS_SQL, [1]);
    assert.ok(!claims.rows.some(row => row.backfill_job_id === jobId),
      'an exhausted RETRY must never receive a fifth claim');
    const state = await client.query<{ status: string; attempts: number }>(
      'SELECT status, attempts FROM ops.backfill_jobs WHERE backfill_job_id=$1', [jobId],
    );
    assert.equal(state.rows[0]!.status, 'RETRY');
    assert.equal(state.rows[0]!.attempts, 4);
  } finally {
    if (jobId) await client.query('DELETE FROM ops.backfill_jobs WHERE backfill_job_id=$1', [jobId]);
    await client.end();
  }
});


test('legacy exhausted RETRY is atomically FAILED and never reclaimed', async () => {
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
      `INSERT INTO ops.backfill_jobs(endpoint_code, window_from, window_to, status, attempts, locked_at, finished_at)
       VALUES ($1, '1702-01-01', '1702-01-02', 'RETRY', 4, NULL, NULL)
       ON CONFLICT(endpoint_code, window_from, window_to)
       DO UPDATE SET status='RETRY', attempts=4, locked_at=NULL, finished_at=NULL
       RETURNING backfill_job_id`,
      [endpoint.rows[0]!.endpoint_code],
    );
    jobId = created.rows[0]!.backfill_job_id;
    const retired = await client.query<{ backfill_job_id: string }>(FAIL_EXHAUSTED_BACKFILLS_SQL, [100]);
    assert.equal(retired.rows.filter(row => row.backfill_job_id === jobId).length, 1);
    const state = await client.query<{
      status: string; attempts: number; locked_at: Date | null;
      finished_at: Date | null; last_error: string | null;
    }>('SELECT status, attempts, locked_at, finished_at, last_error FROM ops.backfill_jobs WHERE backfill_job_id=$1', [jobId]);
    assert.equal(state.rows[0]!.status, 'FAILED');
    assert.equal(state.rows[0]!.attempts, 4);
    assert.equal(state.rows[0]!.locked_at, null);
    assert.ok(state.rows[0]!.finished_at);
    assert.match(state.rows[0]!.last_error ?? '', /Retry budget exhausted/);
    const again = await client.query<{ backfill_job_id: string }>(FAIL_EXHAUSTED_BACKFILLS_SQL, [100]);
    assert.ok(!again.rows.some(row => row.backfill_job_id === jobId));
    const claims = await client.query<{ backfill_job_id: string }>(CLAIM_PENDING_BACKFILLS_SQL, [1]);
    assert.ok(!claims.rows.some(row => row.backfill_job_id === jobId));
  } finally {
    if (jobId) await client.query('DELETE FROM ops.backfill_jobs WHERE backfill_job_id=$1', [jobId]);
    await client.end();
  }
});


test('exhausted-job retirement excludes active RUNNING and eligible RETRY jobs', async () => {
  assert.ok(process.env.DATABASE_URL, 'Use an isolated PostgreSQL test database');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const ids: string[] = [];
  try {
    const endpoint = await client.query<{ endpoint_code: string }>(
      'SELECT endpoint_code FROM source.source_endpoints ORDER BY endpoint_code LIMIT 1',
    );
    assert.ok(endpoint.rows[0], 'source registry must be seeded');
    const fixtures = [
      { year: '1691', status: 'PENDING', attempts: 4 },
      { year: '1692', status: 'RUNNING', attempts: 4 },
      { year: '1693', status: 'RETRY', attempts: 3 },
    ] as const;
    for (const fixture of fixtures) {
      const created = await client.query<{ backfill_job_id: string }>(
        `INSERT INTO ops.backfill_jobs(endpoint_code, window_from, window_to, status, attempts, locked_at, finished_at)
         VALUES ($1, $2::date, $3::date, $4, $5, CASE WHEN $4='RUNNING' THEN now() ELSE NULL END, NULL)
         ON CONFLICT(endpoint_code, window_from, window_to)
         DO UPDATE SET status=EXCLUDED.status, attempts=EXCLUDED.attempts,
                       locked_at=EXCLUDED.locked_at, finished_at=NULL
         RETURNING backfill_job_id`,
        [endpoint.rows[0]!.endpoint_code, `${fixture.year}-01-01`, `${fixture.year}-01-02`,
          fixture.status, fixture.attempts],
      );
      ids.push(created.rows[0]!.backfill_job_id);
    }
    const zero = await client.query<{ backfill_job_id: string }>(FAIL_EXHAUSTED_BACKFILLS_SQL, [0]);
    assert.equal(zero.rows.length, 0, 'zero limit must not mutate any row');
    const retired = await client.query<{ backfill_job_id: string }>(FAIL_EXHAUSTED_BACKFILLS_SQL, [100]);
    assert.equal(retired.rows.filter(row => ids.includes(row.backfill_job_id)).length, 1);
    assert.equal(retired.rows.find(row => ids.includes(row.backfill_job_id))?.backfill_job_id, ids[0]);
    const states = await client.query<{ backfill_job_id: string; status: string; attempts: number }>(
      'SELECT backfill_job_id, status, attempts FROM ops.backfill_jobs WHERE backfill_job_id = ANY($1::uuid[])',
      [ids],
    );
    const byId = new Map(states.rows.map(row => [row.backfill_job_id, row]));
    assert.equal(byId.get(ids[0]!)?.status, 'FAILED');
    assert.equal(byId.get(ids[1]!)?.status, 'RUNNING', 'an active claim must not be retired');
    assert.equal(byId.get(ids[2]!)?.status, 'RETRY', 'remaining budget must be preserved');
    assert.deepEqual(ids.map(id => byId.get(id)?.attempts), [4, 4, 3]);
  } finally {
    if (ids.length) await client.query('DELETE FROM ops.backfill_jobs WHERE backfill_job_id = ANY($1::uuid[])', [ids]);
    await client.end();
  }
});
