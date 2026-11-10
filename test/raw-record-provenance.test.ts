import test from 'node:test';
import assert from 'node:assert/strict';
import { assertRawRecordProvenance } from '../src/quality/rawRecordProvenance.js';

/**
 * No database is required: untrusted references must be rejected before
 * any SQL is issued, including when runtime values violate TypeScript types.
 */
test('provenance guard rejects malformed references without querying PostgreSQL', async () => {
  let queries = 0;
  const client = {
    query: async () => {
      queries += 1;
      throw new Error('UNEXPECTED_DATABASE_QUERY');
    },
  } as unknown as Parameters<typeof assertRawRecordProvenance>[0];

  const validId = '00000000-0000-0000-0000-000000000001';
  const cases: Array<{ label: string; record: string; endpoint: string; artifact: string; reason: string }> = [
    { label: 'missing record', record: '', endpoint: 'OFFICIAL', artifact: validId, reason: 'PROVENANCE_MISSING_REFERENCE' },
    { label: 'missing endpoint', record: validId, endpoint: '', artifact: validId, reason: 'PROVENANCE_MISSING_REFERENCE' },
    { label: 'missing artifact', record: validId, endpoint: 'OFFICIAL', artifact: '', reason: 'PROVENANCE_MISSING_REFERENCE' },
    { label: 'invalid record UUID', record: 'not-a-uuid', endpoint: 'OFFICIAL', artifact: validId, reason: 'PROVENANCE_INVALID_REFERENCE' },
    { label: 'invalid artifact UUID', record: validId, endpoint: 'OFFICIAL', artifact: 'not-a-uuid', reason: 'PROVENANCE_INVALID_REFERENCE' },
    { label: 'symbol record', record: Symbol('record') as unknown as string, endpoint: 'OFFICIAL', artifact: validId, reason: 'PROVENANCE_INVALID_REFERENCE' },
    { label: 'numeric endpoint', record: validId, endpoint: 42 as unknown as string, artifact: validId, reason: 'PROVENANCE_INVALID_REFERENCE' },
    { label: 'symbol artifact', record: validId, endpoint: 'OFFICIAL', artifact: Symbol('artifact') as unknown as string, reason: 'PROVENANCE_INVALID_REFERENCE' },
  ];
  for (const entry of cases) {
    await assert.rejects(
      assertRawRecordProvenance(client, entry.record, entry.endpoint, entry.artifact),
      (error: unknown) => error instanceof Error && error.message === entry.reason,
      entry.label,
    );
  }
  assert.equal(queries, 0, 'invalid adapter inputs must not reach the database');
});


/**
 * Exercise the valid-reference SQL admission path without inventing an
 * official financial observation or touching a database.
 */
test('provenance guard parameterizes references and admits only an explicit true', async () => {
  const record = '00000000-0000-0000-0000-000000000001';
  const artifact = '00000000-0000-0000-0000-000000000002';
  const endpoint = "OFFICIAL' OR TRUE --";
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  let admissible: unknown = true;
  const client = {
    query: async (sql: string, params: unknown[]) => {
      calls.push({ sql, params });
      return { rowCount: 1, rows: [{ admissible }] };
    },
  } as unknown as Parameters<typeof assertRawRecordProvenance>[0];

  await assert.doesNotReject(assertRawRecordProvenance(client, record, endpoint, artifact));
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0]?.params, [record, endpoint, artifact]);
  assert.ok(!calls[0]?.sql.includes(endpoint), 'endpoint must remain a bound parameter');

  for (const value of [false, null, undefined, 1, 'true']) {
    admissible = value;
    await assert.rejects(
      assertRawRecordProvenance(client, record, endpoint, artifact),
      /PROVENANCE_MISMATCH/,
      `non-boolean SQL admission must fail closed: ${String(value)}`,
    );
  }
  assert.equal(calls.length, 6);
});
