import test from 'node:test';
import assert from 'node:assert/strict';
import { assertEndpointsSelected, assertUsableIngestion } from '../src/jobs/ingestionCompleteness.js';

test('financial observations without child errors are complete', () => {
  assert.doesNotThrow(() => assertUsableIngestion({ rows: 3, failedChildren: 0 }));
});

test('archiving an unsupported document without extracted observations is not success', () => {
  assert.throws(() => assertUsableIngestion({ rows: 0, failedChildren: 0 }), /Ingestion incomplete/);
});

test('a failed child download cannot be hidden by successful sibling extraction', () => {
  assert.throws(() => assertUsableIngestion({ rows: 5, failedChildren: 1 }), /failedChildren=1/);
});

test('all failed child downloads cannot become a successful endpoint', () => {
  assert.throws(() => assertUsableIngestion({ rows: 0, failedChildren: 2 }), /Ingestion incomplete/);
});

test('an HTML link index with zero parent rows succeeds when child files yield observations', () => {
  // The endpoint-wide guard must run after child extraction, not after the index page.
  assert.doesNotThrow(() => assertUsableIngestion({ rows: 2, failedChildren: 0 }));
});

test('an HTML link index with no usable child observations is not a successful ingestion', () => {
  assert.throws(() => assertUsableIngestion({ rows: 0, failedChildren: 0 }), /rows=0/);
});

test('invalid counters never certify an ingestion as complete', () => {
  for (const rows of [-1, NaN, Infinity, 1.5]) {
    assert.throws(() => assertUsableIngestion({ rows, failedChildren: 0 }), /Ingestion incomplete/);
  }
  for (const failedChildren of [-1, NaN, Infinity, 0.5]) {
    assert.throws(() => assertUsableIngestion({ rows: 3, failedChildren }), /Ingestion incomplete/);
  }
});


test('unsafe integer counters cannot certify a successful ingestion', () => {
  for (const rows of [Number.MAX_SAFE_INTEGER + 1, Number.MIN_SAFE_INTEGER - 1]) {
    assert.throws(() => assertUsableIngestion({ rows, failedChildren: 0 }), /Ingestion incomplete/);
  }
  for (const failedChildren of [Number.MAX_SAFE_INTEGER + 1, Number.MIN_SAFE_INTEGER - 1]) {
    assert.throws(() => assertUsableIngestion({ rows: 1, failedChildren }), /Ingestion incomplete/);
  }
});

test('empty endpoint filters never record a successful ingestion run', () => {
  for (const count of [0, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => assertEndpointsSelected(count), /no selected endpoints/);
  }
  assert.doesNotThrow(() => assertEndpointsSelected(1));
  assert.doesNotThrow(() => assertEndpointsSelected(44));
});
