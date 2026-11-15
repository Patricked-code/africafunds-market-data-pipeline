import assert from 'node:assert/strict';
import test from 'node:test';
import { bondTotalReturn, priceCashflows } from '../src/calc/bonds.js';

test('bond valuation rejects non-finite curve, tenor and cashflow inputs', () => {
  const goodCurve = [{ timeYears: 1, zeroRate: 0.05 }];
  for (const amount of [NaN, Infinity, -Infinity]) {
    assert.throws(() => priceCashflows([{ timeYears: 1, amount }], goodCurve));
  }
  for (const timeYears of [NaN, Infinity, -Infinity]) {
    assert.throws(() => priceCashflows([{ timeYears, amount: 100 }], goodCurve));
  }
  for (const zeroRate of [NaN, Infinity, -Infinity, -1, -2]) {
    assert.throws(() => priceCashflows([{ timeYears: 1, amount: 100 }], [{ timeYears: 1, zeroRate }]));
  }
  assert.throws(() => priceCashflows([{ timeYears: 1, amount: 100 }], [{ timeYears: NaN, zeroRate: 0.05 }]));
});

test('bond total return rejects non-finite prices and distributions', () => {
  for (const bad of [NaN, Infinity, -Infinity]) {
    assert.throws(() => bondTotalReturn({ previousDirtyPrice: bad, currentDirtyPrice: 100 }));
    assert.throws(() => bondTotalReturn({ previousDirtyPrice: 100, currentDirtyPrice: bad }));
    assert.throws(() => bondTotalReturn({ previousDirtyPrice: 100, currentDirtyPrice: 100, cashflowsReceived: bad }));
  }
  assert.throws(() => bondTotalReturn({ previousDirtyPrice: 100, currentDirtyPrice: -1 }));
});

test('valid bond calculations preserve existing financial formulas', () => {
  assert.equal(priceCashflows([{ timeYears: 1, amount: 105 }], [{ timeYears: 1, zeroRate: 0.05 }]), 100);
  assert.equal(bondTotalReturn({ previousDirtyPrice: 100, currentDirtyPrice: 102, cashflowsReceived: 3 }), 0.05);
});
