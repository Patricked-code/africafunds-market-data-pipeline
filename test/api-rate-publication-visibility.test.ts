import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// Static contract only: PostgreSQL fixture coverage and publication policy approval remain separate gates.
const source = readFileSync(new URL('../src/api/queries.ts', import.meta.url), 'utf8');
const ratesSql = source.split('export async function rates(')[1] ?? '';

test('issue #17: public rates require an actual, non-future publication and economic date', () => {
  assert.match(ratesSql, /o\.publication_date\s+IS\s+NOT\s+NULL/i);
  assert.match(ratesSql, /o\.publication_date\s*<=\s*CURRENT_DATE/i);
  assert.match(ratesSql, /o\.observation_date\s*<=\s*CURRENT_DATE/i);
  assert.match(ratesSql, /WHERE\s+\$\{clauses\.join\(' AND '\)\}/);
});

test('issue #17: rate market/family filters and LIMIT remain parameterized', () => {
  assert.match(ratesSql, /s\.market_code=\$\$\{values\.length\}/);
  assert.match(ratesSql, /s\.rate_family=\$\$\{values\.length\}/);
  assert.match(ratesSql, /LIMIT \$\$\{values\.length\}/);
});
