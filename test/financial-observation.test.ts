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

test('fails closed on null or undefined runtime observation envelopes', () => {
  for (const candidate of [null, undefined]) {
    assert.deepEqual(validateFinancialObservationCandidate(candidate), {
      admissible: false, reasons: ['INVALID_CANDIDATE'],
    });
  }
});

test('rejects malformed dates supplied by an untyped adapter without throwing', () => {
  const malformed = { ...valid, economicDate: null } as unknown as typeof valid;
  assert.deepEqual(validateFinancialObservationCandidate(malformed).reasons, ['INVALID_ECONOMIC_DATE']);
});


test('rejects non-string runtime dates including symbols without throwing', () => {
  for (const date of [42, {}, [], Symbol('date')]) {
    const malformed = { ...valid, economicDate: date } as unknown as typeof valid;
    assert.deepEqual(validateFinancialObservationCandidate(malformed).reasons, ['INVALID_ECONOMIC_DATE']);
  }
});


test('rejects malformed publication dates and primitive runtime envelopes without throwing', () => {
  for (const publicationDate of [null, 17, {}, [], Symbol('publication')]) {
    const candidate = { ...valid, publicationDate } as unknown as typeof valid;
    assert.deepEqual(validateFinancialObservationCandidate(candidate).reasons, ['INVALID_PUBLICATION_DATE']);
  }
  for (const candidate of [false, 17, 'observation', Symbol('observation')]) {
    assert.deepEqual(validateFinancialObservationCandidate(candidate as unknown as typeof valid), {
      admissible: false, reasons: ['INVALID_CANDIDATE'],
    });
  }
});

test('enforces leap-year calendar dates and allows same-day official publication', () => {
  assert.deepEqual(validateFinancialObservationCandidate({ ...valid, economicDate: '2024-02-29', publicationDate: '2024-02-29' }), { admissible: true, reasons: [] });
  assert.ok(validateFinancialObservationCandidate({ ...valid, economicDate: '2025-02-29' }).reasons.includes('INVALID_ECONOMIC_DATE'));
  assert.ok(validateFinancialObservationCandidate({ ...valid, publicationDate: '2026-04-31' }).reasons.includes('INVALID_PUBLICATION_DATE'));
});

test('rejects numeric strings and missing official mapping fields from runtime adapters', () => {
  const candidate = { ...valid, sourceEndpointCode: '  ', unit: '', observedValue: '0' } as unknown as typeof valid;
  assert.deepEqual(validateFinancialObservationCandidate(candidate).reasons, [
    'MISSING_SOURCEENDPOINTCODE', 'MISSING_UNIT', 'NON_FINITE_VALUE',
  ]);
});


test('rejects ISO year zero before PostgreSQL DATE admission', () => {
  for (const field of ['economicDate', 'publicationDate'] as const) {
    const result = validateFinancialObservationCandidate({ ...valid, [field]: '0000-01-01' });
    assert.ok(result.reasons.includes(field === 'economicDate' ? 'INVALID_ECONOMIC_DATE' : 'INVALID_PUBLICATION_DATE'));
  }
});


test('fails closed when an untrusted adapter supplies throwing property accessors', () => {
  const candidate = { ...valid } as Record<string, unknown>;
  Object.defineProperty(candidate, 'observedValue', {
    get() { throw new Error('adapter accessor failure'); },
  });
  assert.doesNotThrow(() => validateFinancialObservationCandidate(candidate as unknown as typeof valid));
  assert.deepEqual(validateFinancialObservationCandidate(candidate as unknown as typeof valid), {
    admissible: false, reasons: ['INVALID_CANDIDATE'],
  });
});
