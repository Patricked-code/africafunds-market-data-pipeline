import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import pg from 'pg';

test('market.raw_records is idempotent for NULL sheet_name and preserves separate sheets', async () => {
  assert.ok(process.env.DATABASE_URL, 'DATABASE_URL must point to an isolated test database');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    const endpoints = await client.query<{
      endpoint_code: string;
      market_code: string;
      data_family: string;
    }>('SELECT endpoint_code, market_code, data_family FROM source.source_endpoints LIMIT 1');
    const endpoint = endpoints.rows[0];
    assert.ok(endpoint, 'source registry must be seeded before the integration test');

    const digest = randomBytes(32).toString('hex');
    const artifact = await client.query<{ raw_artifact_id: string }>(
      `INSERT INTO source.raw_artifacts
          (endpoint_code, source_url, final_url, fetched_at, http_status, sha256, byte_size, archive_path)
        VALUES ($1, 'https://example.invalid/ci-test', 'https://example.invalid/ci-test',
                now(), 200, $2, 0, 'ci/transaction-only')
        RETURNING raw_artifact_id`,
      [endpoint.endpoint_code, digest],
    );
    const artifactId = artifact.rows[0]!.raw_artifact_id;

    async function upsert(sheetName: string | null, value: number): Promise<string> {
      const result = await client.query<{ raw_record_id: string }>(
        `INSERT INTO market.raw_records
          (raw_artifact_id, endpoint_code, market_code, data_family, sheet_name, row_number, payload)
         VALUES ($1,$2,$3,$4,$5,1,$6::jsonb)
         ON CONFLICT ON CONSTRAINT raw_records_identity_nullsafe
         DO UPDATE SET payload=EXCLUDED.payload
         RETURNING raw_record_id`,
        [artifactId, endpoint!.endpoint_code, endpoint!.market_code, endpoint!.data_family, sheetName,
          JSON.stringify({ value })],
      );
      return result.rows[0]!.raw_record_id;
    }

    const before = await upsert(null, 1);
    const after = await upsert(null, 2);
    assert.equal(after, before, 'NULL sheet keys must UPSERT the existing record');
    await upsert('A', 3);
    await upsert('A', 4);
    await upsert('B', 5);
    const check = await client.query<{ count: string; null_value: number; a_value: number }>(
      `SELECT count(*)::text AS count,
              max(CASE WHEN sheet_name IS NULL THEN (payload->>'value')::int END) AS null_value,
              max(CASE WHEN sheet_name='A' THEN (payload->>'value')::int END) AS a_value
         FROM market.raw_records WHERE raw_artifact_id=$1`,
      [artifactId],
    );
    assert.equal(check.rows[0]!.count, '3');
    assert.equal(check.rows[0]!.null_value, 2, 'latest NULL-sheet payload must be retained');
    assert.equal(check.rows[0]!.a_value, 4, 'named-sheet UPSERT must still work');
  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
});
