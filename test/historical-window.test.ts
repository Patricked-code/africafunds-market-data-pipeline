import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findHistoricalWindowAdapter,
  assertHistoricalWindowEvidence,
  type HistoricalWindow,
  type HistoricalWindowEvidence,
  type HistoricalWindowAdapter,
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


test('historical adapter contract accepts cooperative cancellation without requiring legacy adapters to change', async () => {
  const controller = new AbortController();
  const cooperative: HistoricalWindowAdapter = {
    endpointCode: window.endpointCode,
    async ingestWindow(requested, signal) {
      assert.equal(requested, window);
      assert.equal(signal, controller.signal);
      if (signal?.aborted) throw new Error('Historical ingestion aborted');
      return evidence;
    },
  };
  assert.deepEqual(await cooperative.ingestWindow(window, controller.signal), evidence);
  controller.abort();
  await assert.rejects(cooperative.ingestWindow(window, controller.signal), /aborted/);
  const legacy: HistoricalWindowAdapter = {
    endpointCode: window.endpointCode,
    async ingestWindow() { return evidence; },
  };
  assert.deepEqual(await legacy.ingestWindow(window), evidence);
});


test('cooperative historical adapter rejects an in-flight request when its lease signal is aborted', async () => {
  const controller = new AbortController();
  let started = false;
  const cooperative: HistoricalWindowAdapter = {
    endpointCode: window.endpointCode,
    async ingestWindow(_requested, signal) {
      assert.equal(signal, controller.signal);
      started = true;
      await new Promise<void>((_resolve, reject) => {
        if (signal?.aborted) {
          reject(signal.reason);
          return;
        }
        signal?.addEventListener('abort', () => reject(signal.reason), { once: true });
      });
      return evidence;
    },
  };
  const pending = cooperative.ingestWindow(window, controller.signal);
  assert.equal(started, true);
  controller.abort(new Error('Backfill lease ownership lost'));
  await assert.rejects(pending, /Backfill lease ownership lost/);
});
