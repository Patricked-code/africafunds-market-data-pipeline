import test from 'node:test';
import assert from 'node:assert/strict';
import { withVerifiedRawRecord } from '../src/quality/withVerifiedRawRecord.js';

const references = {
  rawRecordId: '00000000-0000-0000-0000-000000000001',
  endpointCode: 'OFFICIAL',
  artifactId: '00000000-0000-0000-0000-000000000002',
};

test('transactional admission never invokes writer after provenance mismatch', async () => {
  const statements: string[] = [];
  let writes = 0;
  const client = {
    query: async (sql: string) => {
      statements.push(sql);
      return { rowCount: 1, rows: [{ admissible: false }] };
    },
  } as unknown as Parameters<typeof withVerifiedRawRecord>[0];
  await assert.rejects(
    withVerifiedRawRecord(client, references, async () => { writes += 1; return 'inserted'; }),
    /PROVENANCE_MISMATCH/,
  );
  assert.equal(writes, 0);
  assert.equal(statements.length, 1);
  assert.match(statements[0]!, /SELECT/);
});

test('authorized callback uses exactly the same transaction client after admission', async () => {
  const statements: string[] = [];
  const client = {
    query: async (sql: string) => {
      statements.push(sql);
      return sql.startsWith('SELECT')
        ? { rowCount: 1, rows: [{ admissible: true }] }
        : { rowCount: 1, rows: [] };
    },
  } as unknown as Parameters<typeof withVerifiedRawRecord>[0];
  const result = await withVerifiedRawRecord(client, references, async (transaction) => {
    assert.equal(transaction, client);
    await transaction.query('SYNTHETIC_WRITE_ONLY');
    return 'accepted';
  });
  assert.equal(result, 'accepted');
  assert.equal(statements.length, 2);
  assert.match(statements[0]!, /SELECT/);
  assert.equal(statements[1], 'SYNTHETIC_WRITE_ONLY');
});

test('database failure propagates and writer is not invoked', async () => {
  const failure = new Error('DB_UNAVAILABLE');
  let writes = 0;
  const client = {
    query: async () => { throw failure; },
  } as unknown as Parameters<typeof withVerifiedRawRecord>[0];
  await assert.rejects(
    withVerifiedRawRecord(client, references, async () => { writes += 1; }),
    (error: unknown) => error === failure,
  );
  assert.equal(writes, 0);
});
