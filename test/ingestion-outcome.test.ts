import test from 'node:test';
import assert from 'node:assert/strict';
import { assertCollectorImplemented, assertIngestionSucceeded } from '../src/jobs/ingestionOutcome.js';

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

test('discovery-only adapter fails closed before ingestion can count success', () => {
  for (const id of ['egy-cbe-conia', 'egy-cbe-conia-index', 'egy-cbe-interbank', 'egy-cbe-tbills', 'egy-cbe-tbonds', 'tun-bct-gosdmx']) {
    assert.throws(() => assertCollectorImplemented({ id, collector: 'MANUAL_API_DISCOVERY' }), /BLOCKED_ADAPTER/);
  }
});
test('implemented collectors remain eligible for existing ingestion behavior', () => {
  assert.doesNotThrow(() => assertCollectorImplemented({ id: 'fixture-html', collector: 'HTML_TABLE' }));
});
