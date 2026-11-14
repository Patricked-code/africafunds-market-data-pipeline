import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveCorsOrigin } from '../src/api/cors.js';

test('issue #17: an explicit origin allowlist never reflects an untrusted origin', () => {
  assert.equal(resolveCorsOrigin('https://untrusted.invalid', ['https://dashboard.example.org']), undefined);
  assert.equal(resolveCorsOrigin('https://dashboard.example.org', ['https://dashboard.example.org']), 'https://dashboard.example.org');
  assert.equal(resolveCorsOrigin(undefined, ['https://dashboard.example.org']), undefined);
});

test('issue #17: wildcard preserves historical public-read CORS behavior', () => {
  assert.equal(resolveCorsOrigin('https://any.example.org', ['*']), '*');
  assert.equal(resolveCorsOrigin(undefined, ['*']), '*');
});

test('issue #17: empty allowlist does not grant cross-origin access', () => {
  assert.equal(resolveCorsOrigin('https://any.example.org', []), undefined);
});
