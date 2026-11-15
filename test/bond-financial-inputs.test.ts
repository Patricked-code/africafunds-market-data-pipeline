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
  assert.ok(Math.abs(bondTotalReturn({ previousDirtyPrice: 100, currentDirtyPrice: 102, cashflowsReceived: 3 }) - 0.05) < 1e-12);
});


test('finite inputs that overflow the financial result are rejected', () => {
  // A finite cashflow and valid near-minus-one discount rate can overflow.
  assert.throws(() => priceCashflows(
    [{ timeYears: 2, amount: Number.MAX_VALUE }],
    [{ timeYears: 2, zeroRate: -0.9999999999999999 }],
  ), /Valorisation obligataire non finie/);

  // A strictly positive but subnormal previous price can overflow the ratio.
  assert.throws(() => bondTotalReturn({
    previousDirtyPrice: Number.MIN_VALUE,
    currentDirtyPrice: 1,
  }), /Rendement obligataire non fini/);
});

test('interpolation overflow must not silently turn a valid cashflow into zero', () => {
  // Both curve rates are finite and greater than -1; their difference can overflow.
  assert.throws(() => priceCashflows(
    [{ timeYears: 2, amount: 100 }],
    [{ timeYears: 1, zeroRate: 0 }, { timeYears: 3, zeroRate: Number.MAX_VALUE }],
  ), /Taux interpolé invalide|Valorisation obligataire non finie/);
});
