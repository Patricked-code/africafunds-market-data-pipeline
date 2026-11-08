import assert from 'node:assert/strict';
import test from 'node:test';
import pg from 'pg';
import {
  CLAIM_PENDING_BACKFILLS_SQL,
  RECOVER_EXPIRED_BACKFILLS_SQL,
} from '../../src/jobs/backfillClaim.js';

/**
 * SQL safety regression: invalid negative batch limits must not raise a
 * PostgreSQL LIMIT error or claim/recover any jobs. Uses the existing
 * isolated DATABASE_URL integration-test contract; no fixture writes.
 */
test('negative claim and recovery batch limits are safe no-ops', async () => {
  assert.ok(process.env.DATABASE_URL, 'Use an isolated PostgreSQL test database');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const claims = await client.query(CLAIM_PENDING_BACKFILLS_SQL, [-1]);
    assert.equal(claims.rowCount, 0, 'negative claim limit must not claim work');
    const recovered = await client.query(RECOVER_EXPIRED_BACKFILLS_SQL, [900, -1]);
    assert.equal(recovered.rowCount, 0, 'negative recovery limit must not recover work');
    const zeroClaims = await client.query(CLAIM_PENDING_BACKFILLS_SQL, [0]);
    assert.equal(zeroClaims.rowCount, 0);
    const zeroRecovered = await client.query(RECOVER_EXPIRED_BACKFILLS_SQL, [900, 0]);
    assert.equal(zeroRecovered.rowCount, 0);
  } finally {
    await client.end();
  }
});
