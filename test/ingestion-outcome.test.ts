import test from 'node:test';
import assert from 'node:assert/strict';
import { assertIngestionSucceeded } from '../src/jobs/ingestionOutcome.js';

test('successful endpoint run is accepted', () => {
  assert.doesNotThrow(() => assertIngestionSucceeded({ endpoints: 1, success: 1, failed: 0 }));
});
test('partial endpoint failure cannot mark backfill successful', () => {
  assert.throws(() => assertIngestionSucceeded({ endpoints: 2, success: 1, failed: 1 }), /Ingestion incomplete/);
});
test('all failed endpoints cannot mark backfill successful', () => {
  assert.throws(() => assertIngestionSucceeded({ endpoints: 1, success: 0, failed: 1 }), /Ingestion incomplete/);
});
test('unknown endpoint cannot mark backfill successful', () => {
  assert.throws(() => assertIngestionSucceeded({ endpoints: 0, success: 0, failed: 0 }), /Ingestion incomplete/);
});
