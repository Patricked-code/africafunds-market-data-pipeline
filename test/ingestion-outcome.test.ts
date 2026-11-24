import test from 'node:test';
import assert from 'node:assert/strict';
import { accountForEndpointResult, assertCollectorImplemented, assertIngestionSucceeded, assertStructuredIngestionRows, ingestionRunStatus } from '../src/jobs/ingestionOutcome.js';

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

test('ingest mode rejects empty, invalid or fractional row counts before counting success', () => {
  for (const rows of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => assertStructuredIngestionRows(rows, 'ingest'), /NO_STRUCTURED_ROWS/);
  }
  assert.doesNotThrow(() => assertStructuredIngestionRows(1, 'ingest'));
  assert.doesNotThrow(() => assertStructuredIngestionRows(0, 'discover'));
});

test('collection counters remain true when zero-row financial ingestion is rejected', () => {
  const summary = { endpoints: 1, success: 0, failed: 0, artifacts: 0, rows: 0, links: 0 };
  assert.throws(
    () => accountForEndpointResult(summary, { artifacts: 2, rows: 0, links: 3 }, 'ingest'),
    /NO_STRUCTURED_ROWS/,
  );
  assert.deepEqual(summary, {
    endpoints: 1, success: 0, failed: 0, artifacts: 2, rows: 0, links: 3
  });
});
test('successful financial observations increment counters exactly once', () => {
  const summary = { success: 0, artifacts: 0, rows: 0, links: 0 };
  accountForEndpointResult(summary, { artifacts: 2, rows: 5, links: 1 }, 'ingest');
  assert.deepEqual(summary, { success: 1, artifacts: 2, rows: 5, links: 1 });
});
test('discovery-only collection remains auditable with zero financial rows', () => {
  const summary = { success: 0, artifacts: 0, rows: 0, links: 0 };
  accountForEndpointResult(summary, { artifacts: 1, rows: 0, links: 2 }, 'discover');
  assert.deepEqual(summary, { success: 1, artifacts: 1, rows: 0, links: 2 });
});

test('failed child leaves archived evidence visible without counting financial success', () => {
  const summary = { success: 0, artifacts: 0, rows: 0, links: 0 };
  assert.throws(
    () => accountForEndpointResult(summary, { artifacts: 2, rows: 5, links: 2, failedChildren: 1 }, 'ingest'),
    /failedChildren=1/,
  );
  assert.deepEqual(summary, { success: 0, artifacts: 2, rows: 5, links: 2 });
});
test('discovery mode accepts empty observations but rejects a failed child', () => {
  const clean = { success: 0, artifacts: 0, rows: 0, links: 0 };
  accountForEndpointResult(clean, { artifacts: 1, rows: 0, links: 2, failedChildren: 0 }, 'discover');
  assert.deepEqual(clean, { success: 1, artifacts: 1, rows: 0, links: 2 });
  const failed = { success: 0, artifacts: 0, rows: 0, links: 0 };
  assert.throws(
    () => accountForEndpointResult(failed, { artifacts: 1, rows: 0, links: 2, failedChildren: 1 }, 'discover'),
    /failedChildren=1/,
  );
  assert.deepEqual(failed, { success: 0, artifacts: 1, rows: 0, links: 2 });
});
