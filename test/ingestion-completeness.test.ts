import test from 'node:test';
import assert from 'node:assert/strict';
import { assertUsableIngestion } from '../src/jobs/ingestionCompleteness.js';

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
