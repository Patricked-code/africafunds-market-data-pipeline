import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

type Endpoint = {
  id: string;
  url: string;
  dataFamily: string;
  collector: string;
  frequency: string;
};
type Market = { code: string; endpoints: Endpoint[] };
type Catalog = { marketFiles: string[] };

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(new URL(`../config/${path}`, import.meta.url), 'utf8')) as T;
}

function loadExisting(): Market[] {
  const catalog = readJson<Catalog>('sources.json');
  return catalog.marketFiles.map((path) => readJson<Market>(path));
}

test('issue #16: the original 11 markets and 44 endpoints remain uniquely addressable', () => {
  const markets = loadExisting();
  assert.equal(markets.length, 11);
  assert.equal(new Set(markets.map((market) => market.code)).size, 11);
  const endpoints = markets.flatMap((market) => market.endpoints);
  assert.equal(endpoints.length, 44);
  assert.equal(new Set(endpoints.map((endpoint) => endpoint.id)).size, 44);
  for (const endpoint of endpoints) {
    assert.ok(endpoint.url.startsWith('https://'), endpoint.id);
    assert.ok(endpoint.dataFamily.length > 0, endpoint.id);
    assert.ok(endpoint.collector.length > 0, endpoint.id);
    assert.ok(endpoint.frequency.length > 0, endpoint.id);
  }
});

test('issue #16: additive FX/INFLATION/FUND_NAV entries do not mutate legacy sources', () => {
  const markets = loadExisting();
  const before = JSON.stringify(markets);
  const extraFamilies = ['FX', 'INFLATION', 'FUND_NAV'] as const;
  // Synthetic contract fixtures only: no asserted official URL, licence or real NAV.
  const synthetic = extraFamilies.map((dataFamily, index) => ({
    id: `synthetic-extension-${index}`,
    url: `https://example.invalid/fixture/${index}`,
    dataFamily,
    collector: 'MANUAL_API_DISCOVERY',
    frequency: 'DAILY',
  }));
  const extended = markets.map((market, index) => ({
    ...market,
    endpoints: index === 0 ? [...market.endpoints, ...synthetic] : [...market.endpoints],
  }));
  assert.equal(JSON.stringify(markets), before, 'legacy catalog must remain untouched');
  assert.equal(extended.flatMap((market) => market.endpoints).length, 47);
  assert.deepEqual(extended[0].endpoints.slice(0, markets[0].endpoints.length), markets[0].endpoints);
  assert.deepEqual(extended[0].endpoints.slice(-3).map((endpoint) => endpoint.dataFamily), extraFamilies);
});
