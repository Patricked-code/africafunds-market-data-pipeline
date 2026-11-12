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
