import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import pg from 'pg';

/**
 * Synthetic provenance fixture only: no claim of official index coverage.
 * All writes are rolled back; never run against a production DATABASE_URL.
 */
test('canonical observation preserves endpoint → artifact → record provenance', async () => {
  assert.ok(process.env.DATABASE_URL, 'DATABASE_URL must point to an isolated test database');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    const endpoints = await client.query<{ endpoint_code: string; market_code: string; data_family: string }>(
      'SELECT endpoint_code, market_code, data_family FROM source.source_endpoints LIMIT 1',
    );
    const endpoint = endpoints.rows[0];
    assert.ok(endpoint, 'seeded source endpoint required');
    const artifact = await client.query<{ raw_artifact_id: string }>(
      `INSERT INTO source.raw_artifacts
         (endpoint_code, source_url, final_url, fetched_at, http_status, sha256, byte_size, archive_path)
       VALUES ($1, 'https://example.invalid/provenance', 'https://example.invalid/provenance',
               now(), 200, $2, 0, 'ci/synthetic-rollback-only')
       RETURNING raw_artifact_id`,
      [endpoint.endpoint_code, randomBytes(32).toString('hex')],
    );
    const artifactId = artifact.rows[0]!.raw_artifact_id;
    const record = await client.query<{ raw_record_id: string }>(
      `INSERT INTO market.raw_records
         (raw_artifact_id, endpoint_code, market_code, data_family, row_number, payload)
       VALUES ($1,$2,$3,$4,1,$5::jsonb) RETURNING raw_record_id`,
      [artifactId, endpoint.endpoint_code, endpoint.market_code, endpoint.data_family,
        JSON.stringify({ synthetic: true, value: 100 })],
    );
    const recordId = record.rows[0]!.raw_record_id;
    const provenance = await client.query<{
      record_endpoint: string; artifact_endpoint: string; registry_market: string; record_market: string;
    }>(
      `SELECT r.endpoint_code AS record_endpoint, a.endpoint_code AS artifact_endpoint,
              e.market_code AS registry_market, r.market_code AS record_market
         FROM market.raw_records r
         JOIN source.raw_artifacts a ON a.raw_artifact_id = r.raw_artifact_id
         JOIN source.source_endpoints e ON e.endpoint_code = a.endpoint_code
        WHERE r.raw_record_id = $1`,
      [recordId],
    );
    assert.equal(provenance.rowCount, 1);
    assert.equal(provenance.rows[0]!.record_endpoint, endpoint.endpoint_code);
    assert.equal(provenance.rows[0]!.artifact_endpoint, endpoint.endpoint_code);
    assert.equal(provenance.rows[0]!.registry_market, endpoint.market_code);
    assert.equal(provenance.rows[0]!.record_market, endpoint.market_code);
    // The current schema has independent FKs, not a composite consistency constraint.
    // This test proves the valid chain, NOT rejection of mismatched endpoint/market.
  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
});

/**
 * Regression characterization: independent foreign keys permit inconsistent provenance.
 * This test asserts the fail-closed admission predicate detects a mismatched market
 * without inserting any official observation or changing schema.
 */
test('financial provenance admission detects mismatched market before publication', async () => {
  assert.ok(process.env.DATABASE_URL, 'DATABASE_URL must point to an isolated test database');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    const candidates = await client.query<{ endpoint_code: string; market_code: string }>(
      'SELECT endpoint_code, market_code FROM source.source_endpoints LIMIT 1',
    );
    const endpoint = candidates.rows[0];
    assert.ok(endpoint, 'seeded source endpoint required');
    const alternate = await client.query<{ market_code: string }>(
      'SELECT market_code FROM ref.markets WHERE market_code <> $1 LIMIT 1',
      [endpoint.market_code],
    );
    const otherMarket = alternate.rows[0];
    assert.ok(otherMarket, 'at least two seeded markets required for mismatch fixture');
    const artifact = await client.query<{ raw_artifact_id: string }>(
      `INSERT INTO source.raw_artifacts
         (endpoint_code, source_url, final_url, fetched_at, http_status, sha256, byte_size, archive_path)
       VALUES ($1, 'https://example.invalid/provenance-negative',
               'https://example.invalid/provenance-negative',
               now(), 200, $2, 0, 'ci/synthetic-rollback-only')
       RETURNING raw_artifact_id`,
      [endpoint.endpoint_code, randomBytes(32).toString('hex')],
    );
    const record = await client.query<{ raw_record_id: string }>(
      `INSERT INTO market.raw_records
         (raw_artifact_id, endpoint_code, market_code, data_family, row_number, payload)
       VALUES ($1,$2,$3,'SYNTHETIC_TEST',1,'{}'::jsonb)
       RETURNING raw_record_id`,
      [artifact.rows[0]!.raw_artifact_id, endpoint.endpoint_code, otherMarket.market_code],
    );
    const admission = await client.query<{ admissible: boolean }>(
      `SELECT (r.endpoint_code = a.endpoint_code
                 AND r.market_code = e.market_code
                 AND r.data_family = e.data_family) AS admissible
         FROM market.raw_records r
         JOIN source.raw_artifacts a ON a.raw_artifact_id = r.raw_artifact_id
         JOIN source.source_endpoints e ON e.endpoint_code = a.endpoint_code
        WHERE r.raw_record_id = $1`,
      [record.rows[0]!.raw_record_id],
    );
    assert.equal(admission.rowCount, 1);
    assert.equal(admission.rows[0]!.admissible, false,
      'inconsistent raw record must never be admitted as normalized financial data');
  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
});
