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
