import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findHistoricalWindowAdapter,
  assertHistoricalWindowEvidence,
  type HistoricalWindow,
  type HistoricalWindowEvidence,
} from '../src/jobs/historicalWindowAdapter.js';

const window: HistoricalWindow = {
  endpointCode: 'egy-cbe-conia',
  from: '2001-01-01', to: '2001-03-31',
};
const evidence: HistoricalWindowEvidence = {
  ...window,
  sourceEvidenceReferences: ['official-source-archive:fixture-sha-256'],
  observedRecords: 62,
  coverageVerified: true,
};

test('registered endpoint does not imply a date-bounded historical adapter', () => {
  for (const id of [
    'egy-cbe-conia', 'egy-cbe-conia-index', 'egy-cbe-interbank',
    'egy-cbe-tbills', 'egy-cbe-tbonds', 'tun-bct-gosdmx',
    'gha-gse-market', 'uemoa-brvm-indices',
  ]) {
    assert.equal(findHistoricalWindowAdapter(id), undefined, id);
  }
});

test('historical evidence must identify the claimed endpoint and exact window', () => {
  assert.doesNotThrow(() => assertHistoricalWindowEvidence(window, evidence));
  assert.throws(
    () => assertHistoricalWindowEvidence(window, { ...evidence, endpointCode: 'different' }),
    /does not match/,
  );
  assert.throws(
    () => assertHistoricalWindowEvidence(window, { ...evidence, from: '2001-02-01' }),
    /does not match/,
  );
  assert.throws(
    () => assertHistoricalWindowEvidence(window, { ...evidence, to: '2001-04-01' }),
    /does not match/,
  );
});

test('historical evidence rejects unverified coverage, empty source evidence and zero observations', () => {
  for (const invalid of [
    { ...evidence, coverageVerified: false },
    { ...evidence, sourceEvidenceReferences: [] },
    { ...evidence, sourceEvidenceReferences: ['   '] },
    { ...evidence, observedRecords: 0 },
    { ...evidence, observedRecords: -1 },
    { ...evidence, observedRecords: Number.NaN },
    { ...evidence, observedRecords: 1.5 },
  ]) {
    assert.throws(() => assertHistoricalWindowEvidence(window, invalid), /Missing verified historical/);
  }
});

test('faked generic-page date range never satisfies historical evidence contract', () => {
  const genericCurrentPage = {
    ...evidence, from: '2026-11-07', to: '2026-11-07',
    sourceEvidenceReferences: ['html-current-page'],
  };
  assert.throws(
    () => assertHistoricalWindowEvidence(window, genericCurrentPage),
    /does not match/,
  );
});
