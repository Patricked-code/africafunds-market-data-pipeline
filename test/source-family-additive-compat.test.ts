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
  const originalFirstMarket = markets[0];
  const extendedFirstMarket = extended[0];
  assert.ok(originalFirstMarket, 'expected at least one original market');
  assert.ok(extendedFirstMarket, 'expected at least one extended market');
  assert.deepEqual(extendedFirstMarket.endpoints.slice(0, originalFirstMarket.endpoints.length), originalFirstMarket.endpoints);
  assert.deepEqual(extendedFirstMarket.endpoints.slice(-3).map((endpoint) => endpoint.dataFamily), extraFamilies);
});

test('issue #16: additive catalog preserves every market and detects synthetic ID collisions', () => {
  const original = loadExisting();
  const legacyById = new Map(original.flatMap((market) => market.endpoints.map((endpoint) => [endpoint.id, JSON.stringify(endpoint)] as const)));
  const added: Endpoint[] = [
    { id: 'synthetic-fx', url: 'https://example.invalid/fx', dataFamily: 'FX', collector: 'MANUAL_API_DISCOVERY', frequency: 'DAILY' },
    { id: 'synthetic-inflation', url: 'https://example.invalid/inflation', dataFamily: 'INFLATION', collector: 'MANUAL_API_DISCOVERY', frequency: 'MONTHLY' },
    { id: 'synthetic-nav', url: 'https://example.invalid/nav', dataFamily: 'FUND_NAV', collector: 'MANUAL_API_DISCOVERY', frequency: 'DAILY' },
  ];
  const extended = original.map((market, index) => ({
    ...market,
    endpoints: index === original.length - 1 ? [...market.endpoints, ...added] : [...market.endpoints],
  }));
  assert.deepEqual(extended.map((market) => market.code), original.map((market) => market.code));
  const all = extended.flatMap((market) => market.endpoints);
  assert.equal(all.length, 47);
  assert.equal(new Set(all.map((endpoint) => endpoint.id)).size, all.length, 'extension IDs must be globally unique');
  for (const [id, serialized] of legacyById) {
    const current = all.find((endpoint) => endpoint.id === id);
    assert.ok(current, `missing legacy endpoint ${id}`);
    assert.equal(JSON.stringify(current), serialized, `legacy endpoint changed: ${id}`);
  }
  const colliding = [...all, { ...added[0], id: original[0]?.endpoints[0]?.id ?? 'synthetic-fx' }];
  assert.notEqual(new Set(colliding.map((endpoint) => endpoint.id)).size, colliding.length, 'collision fixture must be detected');
});


test('issue #16: catalogue extension preserves restrictive access policies', () => {
  const catalog = readJson<Catalog & { defaultPolicies: {
    respectRobotsTxt: boolean;
    doNotBypassCaptcha: boolean;
    doNotBypassAuthentication: boolean;
    requestsPerSecond: number;
  } }>('sources.json');
  assert.equal(catalog.defaultPolicies.respectRobotsTxt, true);
  assert.equal(catalog.defaultPolicies.doNotBypassCaptcha, true);
  assert.equal(catalog.defaultPolicies.doNotBypassAuthentication, true);
  assert.ok(Number.isFinite(catalog.defaultPolicies.requestsPerSecond));
  assert.ok(catalog.defaultPolicies.requestsPerSecond > 0);
  assert.ok(catalog.defaultPolicies.requestsPerSecond <= 1, 'catalogue access rate must remain conservative');
  const before = JSON.stringify(catalog.defaultPolicies);
  const syntheticExtension = { ...catalog, marketFiles: [...catalog.marketFiles, 'sources/SYNTHETIC.json'] };
  assert.equal(JSON.stringify(syntheticExtension.defaultPolicies), before, 'additive registration must not weaken access controls');
  assert.equal(JSON.stringify(catalog.defaultPolicies), before, 'original policy must remain unchanged');
});

test('issue #16: runtime registry rejects cross-market source ID collisions', async () => {
  // Import after supplying the minimal environment required by the existing config module.
  process.env.DATABASE_URL ??= 'postgresql://localhost:5432/registry_test';
  const { assertUniqueSourceIds } = await import('../src/config/registry.js');
  const markets = loadExisting();
  assert.doesNotThrow(() => assertUniqueSourceIds(markets));
  const first = markets[0]?.endpoints[0];
  assert.ok(first, 'expected a legacy source');
  const collision = [...markets, { code: 'SYNTHETIC', endpoints: [{ ...first }] }];
  assert.throws(() => assertUniqueSourceIds(collision), /DUPLICATE_SOURCE_ID/);
  assert.doesNotThrow(() => assertUniqueSourceIds([...markets, {
    code: 'SYNTHETIC', endpoints: [{ ...first, id: 'synthetic-unique-nav', dataFamily: 'FUND_NAV' }],
  }]));
});

test('issue #16: runtime registry rejects duplicate market codes even with distinct source IDs', async () => {
  process.env.DATABASE_URL ??= 'postgresql://localhost:5432/registry_test';
  const { assertUniqueSourceIds } = await import('../src/config/registry.js');
  const markets = loadExisting();
  assert.doesNotThrow(() => assertUniqueSourceIds(markets));
  const firstMarket = markets[0];
  assert.ok(firstMarket, 'expected a legacy market');
  const duplicateMarket = {
    code: firstMarket.code,
    endpoints: [{
      id: 'synthetic-distinct-source',
      url: 'https://example.invalid/market-duplicate',
      dataFamily: 'FUND_NAV',
      collector: 'MANUAL_API_DISCOVERY',
      frequency: 'DAILY',
    }],
  };
  assert.throws(() => assertUniqueSourceIds([...markets, duplicateMarket]), /DUPLICATE_MARKET_CODE/);
  assert.doesNotThrow(() => assertUniqueSourceIds([...markets, { ...duplicateMarket, code: 'SYNTHETIC' }]));
});


test('issue #16: runtime registry rejects duplicate IDs within one market and empty-market duplicates', async () => {
  process.env.DATABASE_URL ??= 'postgresql://localhost:5432/registry_test';
  const { assertUniqueSourceIds } = await import('../src/config/registry.js');
  const markets = loadExisting();
  const firstMarket = markets[0];
  assert.ok(firstMarket, 'expected a legacy market');
  const firstSource = firstMarket.endpoints[0];
  assert.ok(firstSource, 'expected a legacy endpoint');
  const duplicatedWithinMarket = markets.map((market, index) => index === 0
    ? { ...market, endpoints: [...market.endpoints, { ...firstSource }] }
    : market);
  assert.throws(() => assertUniqueSourceIds(duplicatedWithinMarket), /DUPLICATE_SOURCE_ID/);
  assert.throws(() => assertUniqueSourceIds([
    ...markets,
    { code: firstMarket.code, endpoints: [] },
  ]), /DUPLICATE_MARKET_CODE/);
  assert.doesNotThrow(() => assertUniqueSourceIds([
    ...markets,
    { code: 'SYNTHETIC_EMPTY', endpoints: [] },
  ]));
});


test('issue #16: runtime schema rejects blank source IDs and market codes', async () => {
  process.env.DATABASE_URL ??= 'postgresql://localhost:5432/registry_test';
  const { parseRegistry } = await import('../src/config/registry.js');
  const markets = loadExisting();
  const base = { version: 'test', generatedAt: '2026-11-13', defaultPolicies: {}, markets };
  assert.doesNotThrow(() => parseRegistry(base));
  const firstMarket = markets[0];
  assert.ok(firstMarket, 'expected an original market');
  const firstEndpoint = firstMarket.endpoints[0];
  assert.ok(firstEndpoint, 'expected an original source');
  for (const invalidId of ['', '   ']) {
    const invalidMarkets = markets.map((market, index) => index === 0
      ? { ...market, endpoints: [{ ...firstEndpoint, id: invalidId }, ...market.endpoints.slice(1)] }
      : market);
    assert.throws(() => parseRegistry({ ...base, markets: invalidMarkets }), /too_small|Too small|String must contain|expected/i);
  }
  for (const invalidCode of ['', '   ']) {
    const invalidMarkets = markets.map((market, index) => index === 0
      ? { ...market, code: invalidCode }
      : market);
    assert.throws(() => parseRegistry({ ...base, markets: invalidMarkets }), /too_small|Too small|String must contain|expected/i);
  }
  const duplicateCodeAfterTrim = markets.map((market, index) => index === 1
    ? { ...market, code: ` ${firstMarket.code} ` }
    : market);
  assert.throws(() => parseRegistry({ ...base, markets: duplicateCodeAfterTrim }), /DUPLICATE_MARKET_CODE/);
});
