import test from 'node:test';
import assert from 'node:assert/strict';
import { capitaliseAnnualRate, convertReturn, meanReturn, nextIndexLevel, realReturn } from '../src/calc/indices.js';
import { bondTotalReturn, priceCashflows } from '../src/calc/bonds.js';

test('indice de catégorie', () => {
  const daily = meanReturn([0.004, 0.002, -0.001, 0.003]);
  assert.equal(daily, 0.002);
  assert.equal(nextIndexLevel(125, daily), 125.25);
});

test('capitalisation monétaire', () => {
  assert.equal(capitaliseAnnualRate({ previousLevel: 100, annualRate: 0.05, elapsedDays: 1, dayCountBasis: 365 }), 100 * (1 + 0.05 / 365));
});

test('rendement réel et conversion', () => {
  assert.ok(realReturn(0.01, 0.002) < 0.01);
  assert.equal(convertReturn({ localReturn: 0.01, fxToday: 0.091, fxPrevious: 0.09 }), 1.01 * (0.091 / 0.09) - 1);
});

test('prix et rendement obligataire', () => {
  const price = priceCashflows([{ timeYears: 1, amount: 5 }, { timeYears: 2, amount: 105 }], [{ timeYears: 1, zeroRate: 0.04 }, { timeYears: 2, zeroRate: 0.05 }]);
  assert.ok(price > 90 && price < 110);
  assert.ok(Math.abs(bondTotalReturn({ previousDirtyPrice: 100, currentDirtyPrice: 99, cashflowsReceived: 2 }) - 0.01) < 1e-12);
});
