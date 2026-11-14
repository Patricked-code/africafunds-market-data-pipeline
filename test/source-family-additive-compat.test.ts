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

test('issue #16: parsed synthetic financial families preserve the original 44-source registry', async () => {
  process.env.DATABASE_URL ??= 'postgresql://localhost:5432/registry_test';
  const { parseRegistry } = await import('../src/config/registry.js');
  const original = loadExisting();
  const originalSnapshot = JSON.stringify(original);
  const firstMarket = original[0];
  const firstSource = firstMarket?.endpoints[0];
  assert.ok(firstMarket && firstSource, 'expected the historical catalog');
  const added = (['FX', 'INFLATION', 'FUND_NAV'] as const).map((dataFamily, index) => ({
    ...firstSource,
    id: `synthetic-runtime-family-${index}`,
    url: `https://example.invalid/financial-fixture/${index}`,
    dataFamily,
    collector: 'MANUAL_API_DISCOVERY' as const,
  }));
  const extended = original.map((market, index) => index === 0
    ? { ...market, endpoints: [...market.endpoints, ...added] }
    : market);
  const parsed = parseRegistry({
    version: 'test', generatedAt: '2026-11-13', defaultPolicies: {}, markets: extended,
  });
  assert.equal(parsed.markets.flatMap((market) => market.endpoints).length, 47);
  assert.deepEqual(parsed.markets[0]?.endpoints.slice(-3).map((source) => source.dataFamily),
    ['FX', 'INFLATION', 'FUND_NAV']);
  assert.equal(JSON.stringify(original), originalSnapshot, 'historical fixtures must not mutate');
  const trimmedCollision = extended.map((market, index) => index === 0
    ? { ...market, endpoints: [...market.endpoints, { ...added[0]!, id: ` ${firstSource.id} ` }] }
    : market);
  assert.throws(() => parseRegistry({
    version: 'test', generatedAt: '2026-11-13', defaultPolicies: {}, markets: trimmedCollision,
  }), /DUPLICATE_SOURCE_ID/);
});


test('issue #16: runtime schema fails closed for unregistered financial families and malformed URLs', async () => {
  process.env.DATABASE_URL ??= 'postgresql://localhost:5432/registry_test';
  const { parseRegistry } = await import('../src/config/registry.js');
  const original = loadExisting();
  const first = original[0]?.endpoints[0];
  assert.ok(first, 'expected an existing endpoint');
  const snapshot = JSON.stringify(original);
  const base = { version: 'test', generatedAt: '2026-11-13', defaultPolicies: {}, markets: original };
  assert.doesNotThrow(() => parseRegistry(base));
  for (const override of [
    { dataFamily: 'UNREVIEWED_FINANCIAL_FAMILY' },
    { url: 'not-an-official-url' },
  ]) {
    const markets = original.map((market, index) => index === 0
      ? { ...market, endpoints: [{ ...first, ...override }, ...market.endpoints.slice(1)] }
      : market);
    assert.throws(() => parseRegistry({ ...base, markets }), 'unregistered family or malformed URL must be rejected');
  }
  assert.equal(JSON.stringify(original), snapshot, 'invalid fixtures must not mutate the 44 historical sources');
});

test('issue #16: manifest paths cannot escape the source registry directory', async () => {
  process.env.DATABASE_URL ??= 'postgresql://localhost:5432/registry_test';
  const { resolveMarketFile } = await import('../src/config/registry.js');
  const { resolve } = await import('node:path');
  const base = resolve('config');
  assert.equal(resolveMarketFile(base, 'sources/MAR.json'), resolve(base, 'sources/MAR.json'));
  for (const invalid of ['../package.json', 'sources/../../package.json', '.', '/etc/passwd', '..\\\\package.json', 'C:\\\\Windows\\\\system.ini', 'sources\\\\MAR.json', `sources/MA${String.fromCharCode(0)}R.json`]) {
    assert.throws(() => resolveMarketFile(base, invalid), /INVALID_MARKET_FILE_PATH/, invalid);
  }
});

test('issue #16: manifest realpath validation rejects symlink escapes', async () => {
  process.env.DATABASE_URL ??= 'postgresql://localhost:5432/registry_test';
  const { resolveMarketFileSafe } = await import('../src/config/registry.js');
  const { mkdtemp, mkdir, writeFile, symlink, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const root = await mkdtemp(join(tmpdir(), 'sadia-registry-'));
  try {
    const base = join(root, 'registry');
    await mkdir(base);
    await writeFile(join(base, 'valid.json'), '{}');
    await writeFile(join(root, 'outside.json'), '{}');
    await symlink(join(root, 'outside.json'), join(base, 'escape.json'));
    await symlink(join(base, 'valid.json'), join(base, 'inside.json'));
    await mkdir(join(base, 'nested'));
    await symlink(root, join(base, 'nested', 'outside-dir'));
    await symlink(join(base, 'missing.json'), join(base, 'dangling.json'));
    // A directory symlink resolving to the registry root is not a market JSON file.
    await symlink(base, join(base, 'root-alias'));
    await mkdir(join(base, 'nested', 'directory-entry'));
    await symlink(join(base, 'nested', 'directory-entry'), join(base, 'directory-alias'));
    assert.equal(await resolveMarketFileSafe(base, 'valid.json'), join(base, 'valid.json'));
    assert.equal(await resolveMarketFileSafe(base, 'inside.json'), join(base, 'valid.json'));
    await assert.rejects(resolveMarketFileSafe(base, 'escape.json'), /INVALID_MARKET_FILE_PATH/);
    await assert.rejects(resolveMarketFileSafe(base, 'nested/outside-dir/outside.json'), /INVALID_MARKET_FILE_PATH/);
    await assert.rejects(resolveMarketFileSafe(base, 'dangling.json'), /ENOENT/);
    await assert.rejects(resolveMarketFileSafe(base, 'root-alias'), /INVALID_MARKET_FILE_PATH/);
    await assert.rejects(resolveMarketFileSafe(base, 'nested/directory-entry'), /INVALID_MARKET_FILE_TYPE/);
    await assert.rejects(resolveMarketFileSafe(base, 'directory-alias'), /INVALID_MARKET_FILE_TYPE/);
    await assert.rejects(resolveMarketFileSafe(base, '../outside.json'), /INVALID_MARKET_FILE_PATH/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});


test('issue #16: existing Bank Al-Maghrib FX source is retained without duplicate registration', () => {
  const markets = loadExisting();
  const morocco = markets.find((market) => market.code === 'MAR');
  assert.ok(morocco, 'Morocco must remain registered');
  const existing = morocco.endpoints.filter((endpoint) => endpoint.id === 'mar-bam-fx');
  assert.equal(existing.length, 1, 'canonical Bank Al-Maghrib FX ID must be unique');
  assert.equal(existing[0]?.dataFamily, 'FX');
  assert.equal(existing[0]?.collector, 'HTML_TABLE_CSV');
  assert.equal(existing[0]?.frequency, 'DAILY');
  assert.equal(existing[0]?.url, 'https://www.bkam.ma/Marches/Principaux-indicateurs/Marche-des-changes/Cours-de-change/Cours-de-reference');
  const all = markets.flatMap((market) => market.endpoints);
  assert.equal(all.filter((endpoint) => endpoint.id === 'mar-bam-fx').length, 1);
  assert.equal(all.length, 44, 'qualification must not silently register a second FX endpoint');
});


test('issue #16: registry refuses insecure or non-HTTP source transports without altering historical sources', async () => {
  process.env.DATABASE_URL ??= 'postgresql://localhost:5432/registry_test';
  const { parseRegistry } = await import('../src/config/registry.js');
  const original = loadExisting();
  const snapshot = JSON.stringify(original);
  const first = original[0]?.endpoints[0];
  assert.ok(first, 'expected an original source');
  for (const url of ['http://example.invalid/rates', 'ftp://example.invalid/rates', 'file:///etc/passwd']) {
    const markets = original.map((market, index) => index === 0
      ? { ...market, endpoints: [{ ...first, url }, ...market.endpoints.slice(1)] }
      : market);
    assert.throws(() => parseRegistry({
      version: 'test', generatedAt: '2026-11-14', defaultPolicies: {}, markets,
    }), 'non-HTTPS source URL must be rejected');
  }
  assert.equal(JSON.stringify(original), snapshot, 'legacy sources must remain unchanged');
});

test('issue #16: source URLs never embed credentials or fragments in the registry', async () => {
  process.env.DATABASE_URL ??= 'postgresql://localhost:5432/registry_test';
  const { parseRegistry } = await import('../src/config/registry.js');
  const original = loadExisting();
  const first = original[0]?.endpoints[0];
  assert.ok(first, 'expected historical source');
  const snapshot = JSON.stringify(original);
  for (const url of [
    'https://username:password@example.invalid/rates',
    'https://username@example.invalid/rates',
    'https://example.invalid/rates#private-token',
  ]) {
    const markets = original.map((market, index) => index === 0
      ? { ...market, endpoints: [{ ...first, url }, ...market.endpoints.slice(1)] }
      : market);
    assert.throws(() => parseRegistry({
      version: 'test', generatedAt: '2026-11-14', defaultPolicies: {}, markets,
    }), 'embedded credentials and fragments must be rejected');
  }
  assert.equal(JSON.stringify(original), snapshot, 'legacy registry must not mutate');
});


test('issue #16: production manifest loader retains the 11 real markets and 44 original endpoints', async () => {
  // Exercise the actual manifest and per-market file loader, not only synthetic parseRegistry fixtures.
  process.env.DATABASE_URL ??= 'postgresql://localhost:5432/registry_test';
  const { loadRegistry, listEndpoints } = await import('../src/config/registry.js');
  const registry = await loadRegistry();
  const endpoints = registry.markets.flatMap((market) => market.endpoints);
  const expected = loadExisting();
  assert.equal(registry.markets.length, 11);
  assert.equal(endpoints.length, 44);
  assert.deepEqual(registry.markets.map((market) => market.code), expected.map((market) => market.code));
  assert.deepEqual(endpoints.map((endpoint) => endpoint.id),
    expected.flatMap((market) => market.endpoints.map((endpoint) => endpoint.id)));
  const listed = await listEndpoints();
  assert.equal(listed.length, 44);
  assert.equal(new Set(listed.map((endpoint) => endpoint.id)).size, 44);
  assert.equal(listed.filter((endpoint) => endpoint.id === 'mar-bam-fx').length, 1);
  // A passing test demonstrates configuration loading only, never a successful financial ingestion.
});
