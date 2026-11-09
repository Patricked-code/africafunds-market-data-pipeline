import test from 'node:test';
import assert from 'node:assert/strict';
import { assertCollectorImplemented, assertIngestionSucceeded, ingestionRunStatus } from '../src/jobs/ingestionOutcome.js';

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

test('empty endpoint selection cannot be recorded as SUCCESS', () => {
  assert.equal(ingestionRunStatus({ endpoints: 0, success: 0, failed: 0 }), 'FAILED');
});
test('ingestion status preserves success, partial and total failure semantics', () => {
  assert.equal(ingestionRunStatus({ endpoints: 2, success: 2, failed: 0 }), 'SUCCESS');
  assert.equal(ingestionRunStatus({ endpoints: 2, success: 1, failed: 1 }), 'PARTIAL');
  assert.equal(ingestionRunStatus({ endpoints: 2, success: 0, failed: 2 }), 'FAILED');
  assert.equal(ingestionRunStatus({ endpoints: 2, success: 1, failed: 0 }), 'FAILED');
});


test('invalid ingestion counters fail closed and cannot certify backfill', () => {
  const invalid = [
    { endpoints: -1, success: -1, failed: 0 },
    { endpoints: 2, success: 3, failed: 0 },
    { endpoints: 2, success: 1, failed: 2 },
    { endpoints: 2, success: -1, failed: 0 },
    { endpoints: 2, success: 1.5, failed: 0 },
    { endpoints: Number.NaN, success: 0, failed: 0 },
    { endpoints: Number.POSITIVE_INFINITY, success: 0, failed: 0 },
  ];
  for (const summary of invalid) {
    assert.equal(ingestionRunStatus(summary), 'FAILED');
    assert.throws(() => assertIngestionSucceeded(summary), /Ingestion incomplete/);
  }
});

test('strict backfill rejects an unaccounted endpoint even when failed counter is zero', () => {
  const incomplete = { endpoints: 3, success: 2, failed: 0 };
  assert.equal(ingestionRunStatus(incomplete), 'FAILED');
  assert.throws(() => assertIngestionSucceeded(incomplete), /Ingestion incomplete/);
  assert.doesNotThrow(() => assertIngestionSucceeded({ endpoints: 3, success: 3, failed: 0 }));
});
