import assert from 'node:assert/strict';
import test from 'node:test';
import pg from 'pg';
import { pool } from '../../src/db/pool.js';
import { indices } from '../../src/api/queries.js';

// Transactional PostgreSQL recipe: invoke the actual API query against isolated CI database.
// No financial observations or publication decisions are persisted.
test('issue #17: public indices omit DRAFT, future and undated values', async () => {
  assert.ok(process.env.DATABASE_URL, 'isolated DATABASE_URL required');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const originalQuery = pool.query;
  try {
    await client.query('BEGIN');
    const seeded = await client.query<{ market_code: string; currency_code: string }>(
      'SELECT market_code,currency_code FROM ref.markets WHERE active=true AND currency_code IS NOT NULL LIMIT 1',
    );
    const market = seeded.rows[0];
    assert.ok(market, 'seeded market and currency required');
    const ids: Record<string, string> = {};
    for (const status of ['DRAFT', 'PUBLISHED']) {
      const definition = await client.query<{ index_id: string }>(
        `INSERT INTO calc.index_definitions
         (index_code,index_name,index_family,market_code,base_currency_code,base_date,return_type,calculation_method,publication_status)
         VALUES ($1,$1,'TEST',$2,$3,CURRENT_DATE,'PRICE','TEST',$4)
         RETURNING index_id`,
        [`CI_VISIBILITY_${status}_${Date.now()}`, market.market_code, market.currency_code, status],
      );
      ids[status] = definition.rows[0]!.index_id;
    }
    for (const [status, observationOffset, offset, level] of [
      ['DRAFT', -3, -1, 101], ['PUBLISHED', -2, -1, 102],
      ['PUBLISHED', -1, 1, 103], ['PUBLISHED', 0, null, 104],
    ] as const) {
      await client.query(
        `INSERT INTO calc.index_daily_values
         (index_id,observation_date,calculation_date,publication_date,currency_code,currency_context,index_level)
         VALUES ($1,CURRENT_DATE + $2::integer,CURRENT_DATE,
                 CASE WHEN $3::integer IS NULL THEN NULL ELSE CURRENT_DATE + $3::integer END,
                 $4,'LOCAL',$5)`,
        [ids[status], observationOffset, offset, market.currency_code, level],
      );
    }
    // Keep all SELECTs on the same transaction connection, including uncommitted fixtures.
    (pool as unknown as { query: typeof client.query }).query = client.query.bind(client);
    const rows = await indices(
      new URL(`http://localhost/api/v1/indices?market=${encodeURIComponent(market.market_code)}&currency=${market.currency_code}`),
      1000,
    ) as Array<{ index_level: string }>;
    const levels = rows.map(row => Number(row.index_level));
    assert.ok(levels.includes(102), 'published historical value must remain visible');
    for (const forbidden of [101, 103, 104]) {
      assert.ok(!levels.includes(forbidden), `unpublished fixture ${forbidden} must be hidden`);
    }
  } finally {
    (pool as unknown as { query: typeof client.query }).query = originalQuery as typeof client.query;
    await client.query('ROLLBACK');
    await client.end();
  }
});
