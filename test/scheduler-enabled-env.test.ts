import test from 'node:test';
import assert from 'node:assert/strict';
import { schedulerEnabledSchema } from '../src/config/schedulerEnabled.js';

test('ENABLE_SCHEDULER=false must NEVER enable scheduled data collection', () => {
  for (const raw of ['false', 'FALSE', '0', 'no', 'off', false]) {
    assert.equal(schedulerEnabledSchema.parse(raw), false, String(raw));
  }
});

test('scheduler opt-in requires explicit accepted true value', () => {
  for (const raw of ['true', 'TRUE', '1', 'yes', 'on', true]) {
    assert.equal(schedulerEnabledSchema.parse(raw), true, String(raw));
  }
});

test('missing scheduler switch defaults to disabled', () => {
  assert.equal(schedulerEnabledSchema.parse(undefined), false);
});

test('malformed scheduler switch fails closed', () => {
  for (const raw of ['enabled', 'disable', 'maybe', '', 2, -1, null, {}]) {
    assert.throws(() => schedulerEnabledSchema.parse(raw), undefined, String(raw));
  }
});
