import assert from 'node:assert/strict';
import test from 'node:test';
import { validateFinancialObservationCandidate } from '../src/quality/financialObservation.js';

const valid = {
  sourceEndpointCode: 'source-a',
  rawArtifactId: 'artifact-a',
  economicDate: '2026-01-31',
  publicationDate: '2026-02-01',
  observedValue: 0,
  unit: 'PERCENT',
  methodVersion: 'v1',
};

test('typed observation preserves explicit provenance and accepts finite zero', () => {
  assert.deepEqual(validateFinancialObservationCandidate(valid), { admissible: true, reasons: [] });
});

test('rejects missing provenance and methodology without guessing from JSONB', () => {
  const result = validateFinancialObservationCandidate({ ...valid, rawArtifactId: '', methodVersion: ' ' });
  assert.equal(result.admissible, false);
  assert.deepEqual(result.reasons, ['MISSING_RAWARTIFACTID', 'MISSING_METHODVERSION']);
});

test('rejects impossible calendar dates and publication before economic date', () => {
  assert.ok(validateFinancialObservationCandidate({ ...valid, economicDate: '2026-02-30' }).reasons.includes('INVALID_ECONOMIC_DATE'));
  assert.ok(validateFinancialObservationCandidate({ ...valid, publicationDate: '2026-01-01' }).reasons.includes('PUBLICATION_BEFORE_ECONOMIC_DATE'));
});

test('rejects NaN and infinite financial values', () => {
  for (const observedValue of [Number.NaN, Infinity, -Infinity]) {
    assert.deepEqual(validateFinancialObservationCandidate({ ...valid, observedValue }).reasons, ['NON_FINITE_VALUE']);
  }
});
