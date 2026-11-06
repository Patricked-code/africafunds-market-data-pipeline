import test from 'node:test';
import assert from 'node:assert/strict';
import { CLAIM_PENDING_BACKFILLS_SQL } from '../src/jobs/backfillClaim.js';

test('backfill claim selects only pending or retry jobs and skips locked rows', () => {
  assert.match(CLAIM_PENDING_BACKFILLS_SQL, /status IN \('PENDING', 'RETRY'\)/);
  assert.match(CLAIM_PENDING_BACKFILLS_SQL, /FOR UPDATE SKIP LOCKED/);
  assert.match(CLAIM_PENDING_BACKFILLS_SQL, /LIMIT \$1/);
});

test('claim transitions to RUNNING in the same statement and returns old attempt count', () => {
  assert.match(CLAIM_PENDING_BACKFILLS_SQL, /UPDATE ops\.backfill_jobs AS jobs/);
  assert.match(CLAIM_PENDING_BACKFILLS_SQL, /SET status='RUNNING'/);
  assert.match(CLAIM_PENDING_BACKFILLS_SQL, /attempts=jobs\.attempts\+1/);
  assert.match(CLAIM_PENDING_BACKFILLS_SQL, /RETURNING[\s\S]*candidates\.attempts/);
});
