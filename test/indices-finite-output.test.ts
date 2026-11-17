import test from 'node:test';
import assert from 'node:assert/strict';
import { capitaliseAnnualRate, convertReturn, nextIndexLevel, realReturn } from '../src/calc/indices.js';

// Issue #17 / lots 5-7: invalid or overflowing arithmetic must never reach the API as a financial observation.
test('index level rejects finite inputs whose multiplication overflows', () => {
  assert.throws(() => nextIndexLevel(Number.MAX_VALUE, 1), /invalide|fini|finie/i);
});

test('annual capitalisation rejects non-finite inputs and output overflow', () => {
  assert.throws(() => capitaliseAnnualRate({ previousLevel: 100, annualRate: Number.NaN, elapsedDays: 1 }), /invalide|fini|finie/i);
  assert.throws(() => capitaliseAnnualRate({ previousLevel: 100, annualRate: 0.05, elapsedDays: Number.POSITIVE_INFINITY }), /invalide|fini|finie/i);
  assert.throws(() => capitaliseAnnualRate({ previousLevel: Number.MAX_VALUE, annualRate: 1, elapsedDays: 360 }), /invalide|fini|finie/i);
});

test('real return rejects invalid nominal and inflation values and overflow', () => {
  assert.throws(() => realReturn(Number.NaN, 0.02), /invalide|fini|finie/i);
  assert.throws(() => realReturn(0.01, Number.POSITIVE_INFINITY), /invalide|fini|finie/i);
  assert.throws(() => realReturn(Number.MAX_VALUE, -0.5), /invalide|fini|finie/i);
});

test('FX converted return rejects invalid inputs and output overflow', () => {
  assert.throws(() => convertReturn({ localReturn: Number.NaN, fxToday: 1, fxPrevious: 1 }), /invalide|fini|finie/i);
  assert.throws(() => convertReturn({ localReturn: 0.01, fxToday: Number.POSITIVE_INFINITY, fxPrevious: 1 }), /invalide|fini|finie/i);
  assert.throws(() => convertReturn({ localReturn: 1, fxToday: Number.MAX_VALUE, fxPrevious: 0.5 }), /invalide|fini|finie/i);
});
