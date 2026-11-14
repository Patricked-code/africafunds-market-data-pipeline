import assert from 'node:assert/strict';
import test from 'node:test';
import pg from 'pg';
import { pool } from '../../src/db/pool.js';
import { rates } from '../../src/api/queries.js';

// Real PostgreSQL query with uncommitted synthetic fixtures; no financial data is published.
test('issue #17: public rates exclude undated/future publications and future economic dates', async () => {
  assert.ok(process.env.DATABASE_URL, 'isolated DATABASE_URL required');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const originalQuery = pool.query;
  let transactionStarted = false;
  try {
    await client.query('BEGIN');
    transactionStarted = true;
    const seeded = await client.query<{ market_code: string; currency_code: string }>(
      'SELECT market_code,currency_code FROM ref.markets WHERE active=true AND currency_code IS NOT NULL LIMIT 1',
    );
    const market = seeded.rows[0];
    assert.ok(market, 'seeded market and currency required');
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const series = await client.query<{ rate_series_id: string }>(
      `INSERT INTO market.official_rate_series
       (market_code,series_code,series_name,currency_code,rate_family,rate_type,frequency)
       VALUES ($1,$2,$2,$3,$4,'TEST','DAILY') RETURNING rate_series_id`,
      [market.market_code, `CI_PUBLIC_RATE_${suffix}`, market.currency_code, `CI_FAMILY_${suffix}`],
    );
    const seriesId = series.rows[0]!.rate_series_id;
    for (const [observationOffset, publicationOffset, value] of [
      [-4, -1, 101], [-3, 1, 102], [-2, null, 103], [1, -1, 104],
    ] as const) {
      await client.query(
        `INSERT INTO market.official_rate_observations
         (rate_series_id,observation_date,publication_date,rate_value)
         VALUES ($1,CURRENT_DATE + $2::integer,
           CASE WHEN $3::integer IS NULL THEN NULL ELSE CURRENT_DATE + $3::integer END,$4)`,
        [seriesId, observationOffset, publicationOffset, value],
      );
    }
    (pool as unknown as { query: typeof client.query }).query = client.query.bind(client);
    const base = `http://localhost/api/v1/rates?market=${encodeURIComponent(market.market_code)}&family=CI_FAMILY_${suffix}`;
    const rows = await rates(new URL(base), 1000) as Array<{ selected_rate: string }>;
    assert.deepEqual(rows.map(row => Number(row.selected_rate)), [101], 'only published historical observation is visible');
    assert.deepEqual(await rates(new URL(`http://localhost/api/v1/rates?market=NONEXISTENT_${suffix}&family=CI_FAMILY_${suffix}`), 1000), [], 'market filter is applied');
    assert.deepEqual(await rates(new URL(`http://localhost/api/v1/rates?market=${encodeURIComponent(market.market_code)}&family=OTHER_${suffix}`), 1000), [], 'family filter is applied');
  } finally {
    (pool as unknown as { query: typeof client.query }).query = originalQuery as typeof client.query;
    try { if (transactionStarted) await client.query('ROLLBACK'); } finally { await client.end(); }
  }
});
