import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateRows } from '../src/quality/validate.js';

// Lot 11 / issue #15: guard the legacy structural quality contract.
// These checks do NOT qualify financial semantics or publication.
test('empty extraction cannot be reported as structurally valid', () => {
  const result = validateRows([]);
  assert.equal(result.status, 'PROVISIONAL');
  assert.equal(result.score, 0);
  assert.ok(result.warnings.includes('Aucune ligne structurée extraite'));
});

test('numeric zero is a present value rather than a missing observation', () => {
  const result = validateRows([{ value: 0 }]);
  assert.equal(result.status, 'VALID');
  assert.equal(result.score, 100);
  assert.deepEqual(result.warnings, []);
});

test('all-null and empty-string rows remain provisional', () => {
  const result = validateRows([{ value: null }, { value: '' }]);
  assert.equal(result.status, 'PROVISIONAL');
  assert.equal(result.score, 20);
});

test('partially populated rows preserve the bounded legacy score', () => {
  const result = validateRows([{ value: 0 }, { value: null }]);
  assert.equal(result.status, 'PROVISIONAL');
  assert.equal(result.score, 60);
});

test('empty objects have no populated fields and remain provisional', () => {
  const result = validateRows([{}, {}]);
  assert.equal(result.status, 'PROVISIONAL');
  assert.equal(result.score, 20);
});

test('boolean false is a present structural value', () => {
  const result = validateRows([{ active: false }]);
  assert.equal(result.status, 'VALID');
  assert.equal(result.score, 100);
});

test('structural scoring does not mutate caller-owned rows', () => {
  const rows = Object.freeze([Object.freeze({ value: 0 }), Object.freeze({ value: null })]);
  const result = validateRows(rows.map((row) => row));
  assert.equal(result.score, 60);
  assert.equal(rows.at(0)?.value, 0);
  assert.equal(rows.at(1)?.value, null);
});

// An explicit undefined field is absent, not a populated observation.
test('undefined-only rows are provisional rather than structurally valid', () => {
  const result = validateRows([{ value: undefined }]);
  assert.equal(result.status, 'PROVISIONAL');
  assert.equal(result.score, 20);
});

test('undefined fields do not inflate mixed-row coverage', () => {
  const result = validateRows([{ value: 0 }, { value: undefined }]);
  assert.equal(result.status, 'PROVISIONAL');
  assert.equal(result.score, 60);
});

// Mixed fields must be scored per row, not by the presence of a field name.
test('an undefined sibling does not hide a populated false value', () => {
  const result = validateRows([{ missing: undefined, active: false }]);
  assert.equal(result.status, 'VALID');
  assert.equal(result.score, 100);
});

test('multiple absent field representations do not inflate coverage', () => {
  const result = validateRows([{ a: undefined, b: null, c: '' }, { value: 0 }]);
  assert.equal(result.status, 'PROVISIONAL');
  assert.equal(result.score, 60);
});

// Non-finite numeric sentinels are not actual financial observations.
test('NaN-only rows are not structurally populated', () => {
  const result = validateRows([{ value: Number.NaN }]);
  assert.equal(result.status, 'PROVISIONAL');
  assert.equal(result.score, 20);
});

test('infinite numeric sentinels do not inflate mixed-row coverage', () => {
  const result = validateRows([{ value: 0 }, { value: Number.POSITIVE_INFINITY }, { value: Number.NEGATIVE_INFINITY }]);
  assert.equal(result.status, 'PROVISIONAL');
  assert.equal(result.score, 47);
});

// Whitespace-only text is not a meaningful extracted field.
test('whitespace-only text does not count as a populated row', () => {
  const result = validateRows([{ value: '  \t\n ' }]);
  assert.equal(result.status, 'PROVISIONAL');
  assert.equal(result.score, 20);
});

test('whitespace siblings do not hide a valid numeric zero', () => {
  const result = validateRows([{ note: '  ', value: 0 }, { note: '\t' }]);
  assert.equal(result.status, 'PROVISIONAL');
  assert.equal(result.score, 60);
});

test('empty nested containers cannot inflate structural coverage', () => {
  const result = validateRows([{ value: [] }, { value: {} }]);
  assert.equal(result.status, 'PROVISIONAL');
  assert.equal(result.score, 20);
});

test('nonempty nested containers preserve existing structural admission', () => {
  const result = validateRows([{ value: [0] }, { value: { amount: 0 } }]);
  assert.equal(result.status, 'VALID');
  assert.equal(result.score, 100);
});

test('date objects remain populated under the legacy structural contract', () => {
  const result = validateRows([{ economicDate: new Date('2026-11-12T00:00:00Z') }]);
  assert.equal(result.status, 'VALID');
  assert.equal(result.score, 100);
});

// Invalid Date instances must not masquerade as populated economic dates.
test('invalid date objects do not inflate structural coverage', () => {
  const result = validateRows([{ economicDate: new Date(Number.NaN) }]);
  assert.equal(result.status, 'PROVISIONAL');
  assert.equal(result.score, 20);
});
