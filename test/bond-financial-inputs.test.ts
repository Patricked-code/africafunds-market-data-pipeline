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

test('extreme but finite curve interpolation retains finite valuation', () => {
  const result = priceCashflows(
    [{ timeYears: 2, amount: 100 }],
    [{ timeYears: 1, zeroRate: 0 }, { timeYears: 3, zeroRate: Number.MAX_VALUE }],
  );
  assert.ok(Number.isFinite(result));
  assert.ok(result >= 0);
});


test('finite discounted cashflows whose aggregate overflows are rejected', () => {
  // Each discounted cashflow is finite; the accumulated valuation is not.
  assert.throws(() => priceCashflows(
    [{ timeYears: 1, amount: Number.MAX_VALUE }, { timeYears: 1, amount: Number.MAX_VALUE }],
    [{ timeYears: 1, zeroRate: 0 }],
  ), /Valorisation obligataire non finie/);
});


test('interpolated discounting preserves inputs and the reference formula', () => {
  const cashflows = [{ timeYears: 2, amount: 121 }];
  const curve = [{ timeYears: 3, zeroRate: 0.2 }, { timeYears: 1, zeroRate: 0 }];
  const originalCurve = curve.map((point) => ({ ...point }));
  const expected = 121 / (1.1 ** 2);
  assert.ok(Math.abs(priceCashflows(cashflows, curve) - expected) < 1e-10);
  assert.deepEqual(curve, originalCurve, 'interpolation must not reorder caller-owned curve points');
  assert.deepEqual(cashflows, [{ timeYears: 2, amount: 121 }]);
});


test('conflicting zero rates at the same tenor fail closed without mutating the curve', () => {
  const curve = [{ timeYears: 1, zeroRate: 0.03 }, { timeYears: 1, zeroRate: 0.08 }];
  const snapshot = curve.map((point) => ({ ...point }));
  assert.throws(() => priceCashflows([{ timeYears: 1, amount: 100 }], curve), /Taux contradictoires/);
  assert.deepEqual(curve, snapshot);
  assert.ok(Math.abs(priceCashflows([{ timeYears: 1, amount: 105 }], [
    { timeYears: 1, zeroRate: 0.05 }, { timeYears: 1, zeroRate: 0.05 },
  ]) - 100) < 1e-10);
});


test('identical tenor duplicates preserve interior interpolation and boundary extrapolation', () => {
  // Repeated identical observations must not introduce a zero-width interpolation interval.
  const curve = [
    { timeYears: 3, zeroRate: 0.2 },
    { timeYears: 1, zeroRate: 0 },
    { timeYears: 1, zeroRate: 0 },
    { timeYears: 3, zeroRate: 0.2 },
  ];
  const original = curve.map((point) => ({ ...point }));
  assert.ok(Math.abs(priceCashflows([{ timeYears: 2, amount: 121 }], curve) - 100) < 1e-10);
  assert.ok(Math.abs(priceCashflows([{ timeYears: 0.5, amount: 100 }], curve) - 100) < 1e-10);
  assert.ok(Math.abs(priceCashflows([{ timeYears: 4, amount: 100 * (1.2 ** 4) }], curve) - 100) < 1e-10);
  assert.deepEqual(curve, original);
});


test('mixed-sign cashflows retain algebraic valuation and caller ordering', () => {
  // Net cashflows can be signed; rejecting negative amounts would break valid net valuation.
  const cashflows = [
    { timeYears: 2, amount: 121 },
    { timeYears: 1, amount: -55 },
    { timeYears: 0, amount: 10 },
  ];
  const curve = [{ timeYears: 1, zeroRate: 0.1 }, { timeYears: 2, zeroRate: 0.1 }];
  const cashflowSnapshot = cashflows.map((point) => ({ ...point }));
  const curveSnapshot = curve.map((point) => ({ ...point }));
  // 121 / 1.1^2 - 55 / 1.1 + 10 = 60.
  assert.ok(Math.abs(priceCashflows(cashflows, curve) - 60) < 1e-10);
  assert.deepEqual(cashflows, cashflowSnapshot);
  assert.deepEqual(curve, curveSnapshot);
});
