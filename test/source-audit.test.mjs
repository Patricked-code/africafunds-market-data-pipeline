import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APPROVED_HOSTS, buildInventory, probeInventory,
  robotsDecision, summarise, validateEndpointUrl,
} from '../scripts/audit-source-registry.mjs';

test('the historic source registry retains exactly 11 markets and 44 distinct endpoints', async () => {
  const inventory = await buildInventory();
  assert.equal(inventory.registeredMarkets, 11);
  assert.equal(inventory.registeredEndpoints, 44);
  assert.equal(new Set(inventory.endpoints.map((e) => e.endpointId)).size, 44);
  assert.deepEqual(summarise(inventory).byMarket, {
    MAR: 5, GHA: 4, UEMOA: 4, TUN: 4, EGY: 6, NGA: 4,
    KEN: 4, CEMAC: 3, BWA: 3, NAM: 5, ETH: 2,
  });
  assert.equal(inventory.endpoints.filter((e) => e.collector === 'MANUAL_API_DISCOVERY').length, 6);
  assert.equal(inventory.endpoints.filter((e) => e.historicalCoverage !== 'NOT_VERIFIED').length, 0);
  assert.ok(inventory.endpoints.every((e) => e.qualification === 'REGISTERED_ONLY'));
});

test('the live auditor restricts hosts and forbids credentials, plain HTTP and local addresses', () => {
  assert.ok(APPROVED_HOSTS.has('www.brvm.org'));
  assert.equal(validateEndpointUrl('https://www.brvm.org/fr/indices').valid, true);
  assert.equal(validateEndpointUrl('http://www.brvm.org/fr/indices').valid, false);
  assert.equal(validateEndpointUrl('https://localhost/admin').valid, false);
  assert.equal(validateEndpointUrl('https://127.0.0.1/').valid, false);
  assert.equal(validateEndpointUrl('https://internal.example.org/').valid, false);
  assert.equal(validateEndpointUrl('https://user:secret@www.brvm.org/').valid, false);
  assert.equal(validateEndpointUrl('https://www.brvm.org:8443/').valid, false);
});

test('robots disallow is respected with longest matching allow override', () => {
  const robots = [
    'User-agent: *', 'Disallow: /private', 'Allow: /private/public',
    'Disallow: /restricted', '',
  ].join('\n');
  assert.deepEqual(robotsDecision(robots, '/private/secret'), {
    allowed: false, reason: 'ROBOTS_DISALLOW',
  });
  assert.equal(robotsDecision(robots, '/private/public/abc').allowed, true);
  assert.equal(robotsDecision(robots, '/other').allowed, true);
  assert.equal(robotsDecision('User-agent: *\nDisallow: /*/private', '/anything').allowed, false);
});

test('a successful HEAD is not evidence of complete historical coverage', async () => {
  const only = {
    schema: 'test', registeredMarkets: 1, registeredEndpoints: 1,
    endpoints: [{
      endpointId: 'uemoa-brvm-indices', market: 'UEMOA', family: 'EQUITY_INDEX',
      collector: 'HTML_TABLE', frequency: 'DAILY',
      url: 'https://www.brvm.org/fr/indices', configured: true,
      qualification: 'REGISTERED_ONLY', urlPolicy: 'APPROVED_HOST',
      historicalCoverage: 'NOT_VERIFIED', firstDate: null, lastDate: null,
      response: null,
    }],
  };
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url, method: init.method, redirect: init.redirect });
    if (url.endsWith('/robots.txt')) return new Response('', { status: 404 });
    return new Response(null, { status: 200, headers: { 'content-type': 'text/html' } });
  };
  const result = await probeInventory(only, fetcher);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].method, 'HEAD');
  assert.equal(calls[1].redirect, 'manual');
  assert.equal(result.endpoints[0].response.status, 'HTTP_OK_UNVERIFIED_CONTENT');
  assert.equal(result.endpoints[0].historicalCoverage, 'NOT_VERIFIED');
  assert.equal(result.endpoints[0].qualification, 'REGISTERED_ONLY');
});

test('robots denial prevents endpoint probes', async () => {
  const inventory = {
    registeredMarkets: 1, registeredEndpoints: 1,
    endpoints: [{
      endpointId: 'blocked-test', url: 'https://www.brvm.org/fr/indices',
      urlPolicy: 'APPROVED_HOST', qualification: 'REGISTERED_ONLY',
      historicalCoverage: 'NOT_VERIFIED',
    }],
  };
  const calls = [];
  const result = await probeInventory(inventory, async (url, init) => {
    calls.push(init.method);
    return new Response('User-agent: *\nDisallow: /', { status: 200 });
  });
  assert.deepEqual(calls, ['GET']);
  assert.equal(result.endpoints[0].response.reason, 'ROBOTS_DISALLOW');
  assert.equal(result.endpoints[0].response.status, 'NOT_PROBED');
});
