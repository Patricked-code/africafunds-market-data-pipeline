import test from 'node:test';
import assert from 'node:assert/strict';
import { maturityBucket, daysBetween } from '../src/utils/dates.js';

test('segmentation des maturités', () => {
  assert.equal(maturityBucket(0), 'MONEY_MARKET');
  assert.equal(maturityBucket(365), 'MONEY_MARKET');
  assert.equal(maturityBucket(366), 'BOND_CT');
  assert.equal(maturityBucket(1_095), 'BOND_CT');
  assert.equal(maturityBucket(1_096), 'BOND_MT');
  assert.equal(maturityBucket(2_555), 'BOND_MT');
  assert.equal(maturityBucket(2_556), 'BOND_LT');
});

test('écart entre deux dates', () => {
  assert.equal(daysBetween('2026-01-01', '2026-01-31'), 30);
});
