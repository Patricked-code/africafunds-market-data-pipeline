import assert from 'node:assert/strict';
import test from 'node:test';
import pg from 'pg';
import { enqueueBackfill } from '../../src/jobs/backfill.js';
import { listEndpoints } from '../../src/config/registry.js';

/**
 * The returned count is newly inserted windows, not attempted windows.
 * Requires an isolated migrated/seeded PostgreSQL database.
 */
test('enqueueBackfill reports only newly created windows on repeat calls', async () => {
  assert.ok(process.env.DATABASE_URL, 'Use an isolated PostgreSQL test database');
  const endpoints = await listEndpoints();
  assert.ok(endpoints.length > 0, 'registry must contain enabled endpoints');
  const first = endpoints[0]!;
  const matching = endpoints.filter(e => e.marketCode === first.marketCode && e.dataFamily === first.dataFamily);
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const ids: string[] = [];
  const from = '1691-02-03';
  // One day guarantees one window per endpoint for any BACKFILL_BATCH_DAYS.
  const to = '1691-02-03';
  try {
    const preexisting = await client.query(
      'SELECT backfill_job_id FROM ops.backfill_jobs WHERE window_from=$1 AND window_to=$2 AND endpoint_code=ANY($3::text[])',
      [from, to, matching.map(e => e.id)],
    );
    assert.equal(preexisting.rowCount, 0, 'fixture windows must be unused; never alter another job');

    const filter = { market: first.marketCode, family: first.dataFamily, from, to };
    const inserted = await enqueueBackfill(filter);
    const rows = await client.query<{ backfill_job_id: string }>(
      'SELECT backfill_job_id FROM ops.backfill_jobs WHERE window_from=$1 AND window_to=$2 AND endpoint_code=ANY($3::text[])',
      [from, to, matching.map(e => e.id)],
    );
    ids.push(...rows.rows.map(row => row.backfill_job_id));
    assert.equal(inserted, matching.length, 'first call must report actual inserted rows');
    assert.equal(rows.rowCount, matching.length);
    const repeated = await enqueueBackfill(filter);
    assert.equal(repeated, 0, 'idempotent retry must not count existing windows as created');
    const final = await client.query(
      'SELECT backfill_job_id FROM ops.backfill_jobs WHERE window_from=$1 AND window_to=$2 AND endpoint_code=ANY($3::text[])',
      [from, to, matching.map(e => e.id)],
    );
    assert.equal(final.rowCount, matching.length, 'retry must not duplicate or mutate windows');
  } finally {
    if (ids.length) {
      await client.query('DELETE FROM ops.backfill_jobs WHERE backfill_job_id=ANY($1::uuid[])', [ids]);
    }
    await client.end();
  }
});
