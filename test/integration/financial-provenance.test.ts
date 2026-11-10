import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { assertRawRecordProvenance } from '../../src/quality/rawRecordProvenance.js';

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

/**
 * RED/GREEN integration: the reusable guard must accept a consistent chain,
 * reject a market mismatch, and reject an unknown raw record. All fixtures
 * are synthetic and rolled back; no canonical observation is published.
 */
test('raw record provenance guard admits only consistent registry chains', async () => {
  assert.ok(process.env.DATABASE_URL, 'isolated test DATABASE_URL required');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    const endpoints = await client.query<{ endpoint_code: string; market_code: string; data_family: string }>(
      'SELECT endpoint_code, market_code, data_family FROM source.source_endpoints LIMIT 1',
    );
    const endpoint = endpoints.rows[0];
    assert.ok(endpoint, 'seeded endpoint required');
    const alternate = await client.query<{ market_code: string }>(
      'SELECT market_code FROM ref.markets WHERE market_code <> $1 LIMIT 1',
      [endpoint.market_code],
    );
    assert.ok(alternate.rows[0], 'two markets required');
    const artifact = await client.query<{ raw_artifact_id: string }>(
      `INSERT INTO source.raw_artifacts
         (endpoint_code, source_url, final_url, fetched_at, http_status, sha256, byte_size, archive_path)
       VALUES ($1, 'https://example.invalid/guard', 'https://example.invalid/guard',
               now(), 200, $2, 0, 'ci/synthetic-rollback-only')
       RETURNING raw_artifact_id`,
      [endpoint.endpoint_code, randomBytes(32).toString('hex')],
    );
    const artifactId = artifact.rows[0]!.raw_artifact_id;
    const valid = await client.query<{ raw_record_id: string }>(
      `INSERT INTO market.raw_records
         (raw_artifact_id, endpoint_code, market_code, data_family, row_number, payload)
       VALUES ($1,$2,$3,$4,1,'{}'::jsonb) RETURNING raw_record_id`,
      [artifactId, endpoint.endpoint_code, endpoint.market_code, endpoint.data_family],
    );
    await assertRawRecordProvenance(client, valid.rows[0]!.raw_record_id, endpoint.endpoint_code, artifactId);
    const invalid = await client.query<{ raw_record_id: string }>(
      `INSERT INTO market.raw_records
         (raw_artifact_id, endpoint_code, market_code, data_family, row_number, payload)
       VALUES ($1,$2,$3,$4,2,'{}'::jsonb) RETURNING raw_record_id`,
      [artifactId, endpoint.endpoint_code, alternate.rows[0]!.market_code, endpoint.data_family],
    );
    await assert.rejects(
      assertRawRecordProvenance(client, invalid.rows[0]!.raw_record_id, endpoint.endpoint_code, artifactId),
      /PROVENANCE_MISMATCH/,
    );
    await assert.rejects(
      assertRawRecordProvenance(client, '00000000-0000-0000-0000-000000000000', endpoint.endpoint_code, artifactId),
      /PROVENANCE_MISMATCH/,
    );
    await assert.rejects(
      assertRawRecordProvenance(client, valid.rows[0]!.raw_record_id, 'WRONG_ENDPOINT', artifactId),
      /PROVENANCE_MISMATCH/,
    );
    await assert.rejects(
      assertRawRecordProvenance(client, valid.rows[0]!.raw_record_id, endpoint.endpoint_code,
        '00000000-0000-0000-0000-000000000000'),
      /PROVENANCE_MISMATCH/,
    );
    await assert.rejects(
      assertRawRecordProvenance(client, '', endpoint.endpoint_code, artifactId),
      /PROVENANCE_MISSING_REFERENCE/,
    );
    await assert.rejects(
      assertRawRecordProvenance(client, valid.rows[0]!.raw_record_id, '', artifactId),
      /PROVENANCE_MISSING_REFERENCE/,
    );
    await assert.rejects(
      assertRawRecordProvenance(client, valid.rows[0]!.raw_record_id, endpoint.endpoint_code, ''),
      /PROVENANCE_MISSING_REFERENCE/,
    );
    // Runtime adapter payloads can violate static TypeScript contracts.
    // Reject before invoking SQL; even Symbol must never throw a native TypeError.
    await assert.rejects(
      assertRawRecordProvenance(client, Symbol('raw-id') as unknown as string, endpoint.endpoint_code, artifactId),
      /PROVENANCE_INVALID_REFERENCE/,
    );
    await assert.rejects(
      assertRawRecordProvenance(client, valid.rows[0]!.raw_record_id, 42 as unknown as string, artifactId),
      /PROVENANCE_INVALID_REFERENCE/,
    );
    await assert.rejects(
      assertRawRecordProvenance(client, valid.rows[0]!.raw_record_id, endpoint.endpoint_code, Symbol('artifact') as unknown as string),
      /PROVENANCE_INVALID_REFERENCE/,
    );
    await assert.rejects(
      assertRawRecordProvenance(client, 'not-a-uuid', endpoint.endpoint_code, artifactId),
      /PROVENANCE_INVALID_REFERENCE/,
    );
    await assert.rejects(
      assertRawRecordProvenance(client, valid.rows[0]!.raw_record_id, endpoint.endpoint_code, 'not-a-uuid'),
      /PROVENANCE_INVALID_REFERENCE/,
    );
  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
});


/**
 * Issue #15: PostgreSQL integration for the existing transaction-boundary helper.
 * A TEMP table represents a synthetic future writer, NOT a canonical financial table.
 * The same transaction owns fixture, admission and write; everything is rolled back.
 */
test('verified raw record callback inserts only after consistent provenance in PostgreSQL', async () => {
  assert.ok(process.env.DATABASE_URL, 'isolated test DATABASE_URL required');
  const { withVerifiedRawRecord } = await import('../../src/quality/withVerifiedRawRecord.js');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query('CREATE TEMP TABLE synthetic_admitted_observations (raw_record_id uuid NOT NULL) ON COMMIT DROP');
    const endpointResult = await client.query<{ endpoint_code: string; market_code: string; data_family: string }>(
      'SELECT endpoint_code, market_code, data_family FROM source.source_endpoints LIMIT 1',
    );
    const endpoint = endpointResult.rows[0];
    assert.ok(endpoint, 'seeded endpoint required');
    const alternate = await client.query<{ market_code: string }>(
      'SELECT market_code FROM ref.markets WHERE market_code <> $1 LIMIT 1',
      [endpoint.market_code],
    );
    assert.ok(alternate.rows[0], 'second seeded market required');
    const artifact = await client.query<{ raw_artifact_id: string }>(
      `INSERT INTO source.raw_artifacts
         (endpoint_code, source_url, final_url, fetched_at, http_status, sha256, byte_size, archive_path)
       VALUES ($1, 'https://example.invalid/verified-writer', 'https://example.invalid/verified-writer',
               now(), 200, $2, 0, 'ci/synthetic-rollback-only')
       RETURNING raw_artifact_id`,
      [endpoint.endpoint_code, randomBytes(32).toString('hex')],
    );
    const artifactId = artifact.rows[0]!.raw_artifact_id;
    const valid = await client.query<{ raw_record_id: string }>(
      `INSERT INTO market.raw_records
         (raw_artifact_id, endpoint_code, market_code, data_family, row_number, payload)
       VALUES ($1,$2,$3,$4,1,'{}'::jsonb) RETURNING raw_record_id`,
      [artifactId, endpoint.endpoint_code, endpoint.market_code, endpoint.data_family],
    );
    const invalid = await client.query<{ raw_record_id: string }>(
      `INSERT INTO market.raw_records
         (raw_artifact_id, endpoint_code, market_code, data_family, row_number, payload)
       VALUES ($1,$2,$3,$4,2,'{}'::jsonb) RETURNING raw_record_id`,
      [artifactId, endpoint.endpoint_code, alternate.rows[0]!.market_code, endpoint.data_family],
    );
    // A matching market alone is insufficient: the data family must also
    // match the registered endpoint. This remains a synthetic rollback-only fixture.
    const wrongFamily = await client.query<{ raw_record_id: string }>(
      `INSERT INTO market.raw_records
         (raw_artifact_id, endpoint_code, market_code, data_family, row_number, payload)
       VALUES ($1,$2,$3,$4,3,'{}'::jsonb) RETURNING raw_record_id`,
      [artifactId, endpoint.endpoint_code, endpoint.market_code,
        endpoint.data_family === 'SYNTHETIC_MISMATCH' ? 'SYNTHETIC_OTHER' : 'SYNTHETIC_MISMATCH'],
    );
    const writer = async (transaction: Pick<pg.Client, 'query'>, recordId: string) => {
      assert.equal(transaction, client, 'guard and writer must share transaction client');
      await transaction.query(
        'INSERT INTO synthetic_admitted_observations (raw_record_id) VALUES ($1::uuid)',
        [recordId],
      );
    };
    await assert.rejects(
      withVerifiedRawRecord(client, {
        rawRecordId: invalid.rows[0]!.raw_record_id, endpointCode: endpoint.endpoint_code, artifactId,
      }, (transaction) => writer(transaction, invalid.rows[0]!.raw_record_id)),
      /PROVENANCE_MISMATCH/,
    );
    await assert.rejects(
      withVerifiedRawRecord(client, {
        rawRecordId: wrongFamily.rows[0]!.raw_record_id,
        endpointCode: endpoint.endpoint_code, artifactId,
      }, (transaction) => writer(transaction, wrongFamily.rows[0]!.raw_record_id)),
      /PROVENANCE_MISMATCH/,
      'matching market with mismatched data family must not invoke the writer',
    );
    const rejectedCount = await client.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM synthetic_admitted_observations',
    );
    assert.equal(rejectedCount.rows[0]!.count, '0', 'mismatch must never reach INSERT');
    await withVerifiedRawRecord(client, {
      rawRecordId: valid.rows[0]!.raw_record_id, endpointCode: endpoint.endpoint_code, artifactId,
    }, (transaction) => writer(transaction, valid.rows[0]!.raw_record_id));
    const accepted = await client.query<{ raw_record_id: string }>(
      'SELECT raw_record_id FROM synthetic_admitted_observations',
    );
    assert.deepEqual(accepted.rows.map((row) => row.raw_record_id), [valid.rows[0]!.raw_record_id]);
    // The callback is not the transaction owner: a failed write must be rolled
    // back by the caller. Verify this with a real PostgreSQL SAVEPOINT rather
    // than treating a propagated callback error as automatic rollback.
    await client.query('SAVEPOINT before_failing_writer');
    await assert.rejects(
      withVerifiedRawRecord(client, {
        rawRecordId: valid.rows[0]!.raw_record_id, endpointCode: endpoint.endpoint_code, artifactId,
      }, async (transaction) => {
        await writer(transaction, valid.rows[0]!.raw_record_id);
        throw new Error('SYNTHETIC_WRITER_FAILURE');
      }),
      /SYNTHETIC_WRITER_FAILURE/,
    );
    const beforeRollback = await client.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM synthetic_admitted_observations',
    );
    assert.equal(beforeRollback.rows[0]!.count, '2', 'callback error alone must not imply rollback');
    await client.query('ROLLBACK TO SAVEPOINT before_failing_writer');
    const afterRollback = await client.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM synthetic_admitted_observations',
    );
    assert.equal(afterRollback.rows[0]!.count, '1', 'caller rollback removes failed writer insertion');
    await client.query('RELEASE SAVEPOINT before_failing_writer');
  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
});


/**
 * Issue #15: demonstrate real PostgreSQL row-lock behavior, not merely SQL text.
 * Requires an isolated seeded test database. No permanent writes or production use.
 * The admission client holds its transaction open while a competing client attempts
 * to update the same registry row; PostgreSQL must reject that update on lock timeout.
 */
test('provenance admission holds registry row against concurrent update until rollback', async () => {
  assert.ok(process.env.DATABASE_URL, 'isolated test DATABASE_URL required');
  const admission = new pg.Client({ connectionString: process.env.DATABASE_URL });
  const competitor = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await admission.connect();
  try {
    await competitor.connect();
    await admission.query('BEGIN');
    const endpoints = await admission.query<{ endpoint_code: string; market_code: string; data_family: string }>(
      'SELECT endpoint_code, market_code, data_family FROM source.source_endpoints LIMIT 1',
    );
    const endpoint = endpoints.rows[0];
    assert.ok(endpoint, 'seeded endpoint required');
    const artifact = await admission.query<{ raw_artifact_id: string }>(
      `INSERT INTO source.raw_artifacts
         (endpoint_code, source_url, final_url, fetched_at, http_status, sha256, byte_size, archive_path)
       VALUES ($1, 'https://example.invalid/lock-proof', 'https://example.invalid/lock-proof',
               now(), 200, $2, 0, 'ci/synthetic-rollback-only')
       RETURNING raw_artifact_id`,
      [endpoint.endpoint_code, randomBytes(32).toString('hex')],
    );
    const artifactId = artifact.rows[0]!.raw_artifact_id;
    const record = await admission.query<{ raw_record_id: string }>(
      `INSERT INTO market.raw_records
         (raw_artifact_id, endpoint_code, market_code, data_family, row_number, payload)
       VALUES ($1,$2,$3,$4,1,'{}'::jsonb) RETURNING raw_record_id`,
      [artifactId, endpoint.endpoint_code, endpoint.market_code, endpoint.data_family],
    );
    await assertRawRecordProvenance(admission, record.rows[0]!.raw_record_id, endpoint.endpoint_code, artifactId);
    await competitor.query('BEGIN');
    await competitor.query("SET LOCAL lock_timeout = '300ms'");
    await assert.rejects(
      competitor.query(
        'UPDATE source.source_endpoints SET market_code = market_code WHERE endpoint_code = $1',
        [endpoint.endpoint_code],
      ),
      (error: unknown) => (error as { code?: string }).code === '55P03',
      'concurrent registry UPDATE must time out while the admission transaction holds FOR SHARE',
    );
    // A lock timeout aborts the competing transaction. Release both transactions
    // and prove a fresh transaction can update the same row after the guard exits.
    await competitor.query('ROLLBACK');
    await admission.query('ROLLBACK');
    await competitor.query('BEGIN');
    await competitor.query("SET LOCAL lock_timeout = '300ms'");
    const unlocked = await competitor.query(
      'UPDATE source.source_endpoints SET market_code = market_code WHERE endpoint_code = $1',
      [endpoint.endpoint_code],
    );
    assert.equal(unlocked.rowCount, 1, 'registry lock must be released after admission rollback');
    await competitor.query('ROLLBACK');
  } finally {
    // Cleanup is best-effort even when a prior assertion fails.
    await Promise.allSettled([competitor.query('ROLLBACK'), admission.query('ROLLBACK')]);
    await Promise.allSettled([competitor.end(), admission.end()]);
  }
});
