import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// Contract regression: this is a SQL source guard, not a PostgreSQL runtime recipe.
const sql = readFileSync(new URL('../src/api/queries.ts', import.meta.url), 'utf8');
const indicesSql = sql.split('export async function indices(')[1]?.split('export async function rates(')[0] ?? '';

test('issue #17: index API cannot expose draft definitions or future/unpublished values', () => {
  assert.match(indicesSql, /d\.publication_status\s*=\s*'PUBLISHED'/);
  assert.match(indicesSql, /v\.publication_date\s+IS\s+NOT\s+NULL/i);
  assert.match(indicesSql, /v\.publication_date\s*<=\s*CURRENT_DATE/i);
  assert.match(indicesSql, /v\.observation_date\s*<=\s*CURRENT_DATE/i);
  assert.match(indicesSql, /WHERE\s+\$\{clauses\.join\(' AND '\)\}/);
});

test('issue #17: optional market and currency predicates remain parameterized', () => {
  assert.match(indicesSql, /d\.market_code=\$\$\{values\.length\}/);
  assert.match(indicesSql, /v\.currency_code=\$\$\{values\.length\}/);
  assert.match(indicesSql, /LIMIT \$\$\{values\.length\}/);
});
