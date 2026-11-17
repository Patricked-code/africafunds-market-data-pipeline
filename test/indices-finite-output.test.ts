import test from 'node:test';
import assert from 'node:assert/strict';
import { capitaliseAnnualRate, convertReturn, nextIndexLevel, realReturn, meanReturn, weightedReturn } from '../src/calc/indices.js';

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

test('mean return rejects arithmetic overflow instead of emitting Infinity', () => {
  assert.throws(() => meanReturn([Number.MAX_VALUE, Number.MAX_VALUE]), /invalide|fini|finie/i);
  assert.equal(meanReturn([0.1, 0.2]), 0.15000000000000002);
});

test('weighted return rejects overflowing weight totals and weighted numerators', () => {
  assert.throws(() => weightedReturn([
    { value: 0.1, weight: Number.MAX_VALUE },
    { value: 0.2, weight: Number.MAX_VALUE },
  ]), /invalide|fini|finie/i);
  assert.throws(() => weightedReturn([
    { value: Number.MAX_VALUE, weight: 2 },
    { value: 1, weight: 1 },
  ]), /invalide|fini|finie/i);
  assert.equal(weightedReturn([{ value: 0.1, weight: 1 }, { value: 0.2, weight: 1 }]), 0.15000000000000002);
});


test('index level rejects positive finite inputs that underflow to zero', () => {
  // The published index level must remain strictly positive, including at IEEE-754 boundaries.
  assert.throws(() => nextIndexLevel(Number.MIN_VALUE, -0.5), /invalide|positif|nul/i);
  assert.equal(nextIndexLevel(100, 0.01), 101);
});


test('annual capitalisation rejects a non-positive computed index level', () => {
  // A finite annual rate below -100% must not produce a publishable negative index.
  assert.throws(() => capitaliseAnnualRate({ previousLevel: 100, annualRate: -2, elapsedDays: 360 }), /invalide|positif|nul/i);
  assert.throws(() => capitaliseAnnualRate({ previousLevel: 100, annualRate: -1, elapsedDays: 360 }), /invalide|positif|nul/i);
  assert.equal(capitaliseAnnualRate({ previousLevel: 100, annualRate: 0.05, elapsedDays: 360 }), 105);
});


test('annual capitalisation rejects positive levels that underflow to zero while preserving zero-day identity', () => {
  // Same strictly-positive publication invariant as nextIndexLevel at the IEEE-754 boundary.
  assert.throws(() => capitaliseAnnualRate({ previousLevel: Number.MIN_VALUE, annualRate: -0.5, elapsedDays: 360 }), /invalide|positif|nul/i);
  assert.equal(capitaliseAnnualRate({ previousLevel: 100, annualRate: 0.05, elapsedDays: 0 }), 100);
});


test('annual capitalisation preserves the smallest positive index on a zero-day window', () => {
  // Zero elapsed days is an identity operation even at the IEEE-754 subnormal boundary.
  assert.equal(capitaliseAnnualRate({ previousLevel: Number.MIN_VALUE, annualRate: -0.5, elapsedDays: 0 }), Number.MIN_VALUE);
  assert.throws(() => capitaliseAnnualRate({ previousLevel: Number.MIN_VALUE, annualRate: -0.5, elapsedDays: -1 }), /invalide/i);
});


test('FX conversion rejects an underflowed positive exchange-rate ratio', () => {
  // A strictly positive economic FX ratio must not silently round to zero and publish -100%.
  assert.throws(() => convertReturn({ localReturn: 0, fxToday: Number.MIN_VALUE, fxPrevious: 2 }), /invalide|fini|taux|rapport/i);
  assert.equal(convertReturn({ localReturn: 0, fxToday: 1, fxPrevious: 1 }), 0);
});


test('FX conversion rejects an overflowing exchange-rate ratio without changing ordinary conversion', () => {
  // Both quoted FX rates are positive and finite; the quotient itself overflows IEEE-754.
  assert.throws(() => convertReturn({ localReturn: 0, fxToday: Number.MAX_VALUE, fxPrevious: Number.MIN_VALUE }), /invalide|fini|rapport/i);
  assert.equal(convertReturn({ localReturn: 0.1, fxToday: 2, fxPrevious: 2 }), 0.10000000000000009);
});
