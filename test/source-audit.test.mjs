import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APPROVED_HOSTS, buildInventory, probeInventory,
  robotsDecision, summarise, validateEndpointUrl, sourceReadiness,
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
      urlPolicy: 'APPROVED_HOST', configured: true, qualification: 'REGISTERED_ONLY',
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

test('44 registered SadiaAF source endpoints remain unpublished without verified usage rights and data evidence', async () => {
  const inventory = await buildInventory();
  assert.equal(summarise(inventory).byRightsStatus.NOT_VERIFIED, 44);
  assert.equal(summarise(inventory).byPublicationEligibility.NOT_ELIGIBLE, 44);
  assert.equal(inventory.endpoints.filter(e => e.publicationEligible).length, 0);
  assert.equal(inventory.endpoints.filter(e => e.historicalAdapterStatus === 'BLOCKED_ADAPTER').length, 6);
  assert.ok(inventory.endpoints.every(e => sourceReadiness(e).blockers.includes('RIGHTS_NOT_APPROVED')));
});

test('an HTTP 200 cannot bypass license, adapter, backfill or publication gates', () => {
  const assessed = {
    endpointId: 'gha-gse-market',
    response: { status: 'HTTP_OK_UNVERIFIED_CONTENT', httpStatus: 200 },
    rightsStatus: 'NOT_VERIFIED', sourceFormatStatus: 'NOT_VERIFIED',
    historicalAdapterStatus: 'NOT_VERIFIED', historicalCoverage: 'NOT_VERIFIED',
    normalizationStatus: 'NOT_VERIFIED', publicationStatus: 'NOT_VERIFIED',
  };
  const r = sourceReadiness(assessed);
  assert.equal(r.eligibleForPublication, false);
  assert.ok(r.blockers.includes('RIGHTS_NOT_APPROVED'));
  assert.ok(r.blockers.includes('MISSING_REPRODUCIBLE_EVIDENCE'));
});

test('only explicit approval plus adapter, historical, financial and evidence gates makes a source audit-eligible', () => {
  const assessed = {
    endpointId: 'fixture', configured: true, urlPolicy: 'APPROVED_HOST',
    url: 'https://www.brvm.org/fr/indices', rightsStatus: 'APPROVED', sourceFormatStatus: 'VALIDATED',
    historicalAdapterStatus: 'TESTED', historicalCoverage: 'VALIDATED',
    normalizationStatus: 'VALIDATED', publicationStatus: 'APPROVED',
    evidenceReferences: ['fixture:reproducible-evidence'],
  };
  assert.deepEqual(sourceReadiness(assessed), { eligibleForPublication: true, blockers: [] });
  assert.equal(sourceReadiness({ ...assessed, publicationStatus: 'NOT_VERIFIED' }).eligibleForPublication, false);
  assert.equal(sourceReadiness({ ...assessed, evidenceReferences: [] }).eligibleForPublication, false);
  assert.equal(sourceReadiness({ ...assessed, historicalCoverage: 'NOT_VERIFIED' }).eligibleForPublication, false);
});

test('disabled source is inventoried but never contacted, even for robots.txt', async () => {
  const disabled = {
    endpointId: 'gha-gse-market',
    url: 'https://gse.com.gh/market-data/',
    urlPolicy: 'APPROVED_HOST',
    configured: false,
    qualification: 'REGISTERED_ONLY',
    historicalCoverage: 'NOT_VERIFIED',
  };
  let calls = 0;
  const result = await probeInventory({
    registeredMarkets: 1, registeredEndpoints: 1, endpoints: [disabled],
  }, async () => {
    calls += 1;
    throw new Error('Network must never be accessed for disabled source');
  });
  assert.equal(calls, 0);
  assert.equal(result.registeredEndpoints, 1);
  assert.equal(result.endpoints[0].response.status, 'NOT_PROBED');
  assert.equal(result.endpoints[0].response.reason, 'ENDPOINT_NOT_ENABLED');
  assert.equal(result.endpoints[0].configured, false);
  assert.equal(result.endpoints[0].historicalCoverage, 'NOT_VERIFIED');
  assert.equal(sourceReadiness(result.endpoints[0]).eligibleForPublication, false);
});

test('explicitly enabled endpoint still uses the original robots-gated probe', async () => {
  const enabled = {
    endpointId: 'uemoa-brvm-indices',
    url: 'https://www.brvm.org/fr/indices',
    urlPolicy: 'APPROVED_HOST', configured: true,
    historicalCoverage: 'NOT_VERIFIED',
  };
  const calls = [];
  const result = await probeInventory({
    registeredMarkets: 1, registeredEndpoints: 1, endpoints: [enabled],
  }, async (url, options) => {
    calls.push({ url, method: options.method });
    if (url.endsWith('/robots.txt')) return new Response('', { status: 404 });
    return new Response(null, { status: 200 });
  });
  assert.deepEqual(calls.map(c => c.method), ['GET', 'HEAD']);
  assert.equal(result.endpoints[0].response.status, 'HTTP_OK_UNVERIFIED_CONTENT');
  assert.equal(result.endpoints[0].historicalCoverage, 'NOT_VERIFIED');
});

test('robots groups use the longest matching product token, not an unrelated substring', () => {
  const robots = [
    'User-agent: *', 'Disallow: /blocked',
    'User-agent: market', 'Allow: /blocked',
    'User-agent: africafunds', 'Disallow: /blocked',
    'User-agent: africafundsmarketcollector', 'Allow: /blocked',
  ].join('\n');
  assert.deepEqual(robotsDecision(robots, '/blocked'), {
    allowed: true, reason: 'ROBOTS_PERMIT',
  });
  const unrelated = 'User-agent: *\nDisallow: /private\nUser-agent: market\nAllow: /private';
  assert.deepEqual(robotsDecision(unrelated, '/private'), {
    allowed: false, reason: 'ROBOTS_DISALLOW',
  });
});

test('robots equal-specificity groups combine rules conservatively', () => {
  const robots = [
    'User-agent: africafundsmarketcollector', 'Disallow: /restricted',
    'User-agent: africafundsmarketcollector', 'Allow: /public',
  ].join('\n');
  assert.equal(robotsDecision(robots, '/restricted').allowed, false);
  assert.equal(robotsDecision(robots, '/public').allowed, true);
});

test('publication readiness fails closed for disabled sources and unapproved URL policy', () => {
  const verified = {
    endpointId: 'test-official', configured: true, urlPolicy: 'APPROVED_HOST',
    url: 'https://www.brvm.org/fr/indices', rightsStatus: 'APPROVED', sourceFormatStatus: 'VALIDATED',
    historicalAdapterStatus: 'TESTED', historicalCoverage: 'VALIDATED',
    normalizationStatus: 'VALIDATED', publicationStatus: 'APPROVED',
    evidenceReferences: ['fixture:official-licensed-source'],
  };
  assert.equal(sourceReadiness(verified).eligibleForPublication, true);
  const disabled = sourceReadiness({ ...verified, configured: false });
  assert.equal(disabled.eligibleForPublication, false);
  assert.ok(disabled.blockers.includes('ENDPOINT_NOT_ENABLED'));
  const unsafe = sourceReadiness({ ...verified, urlPolicy: 'UNAPPROVED_HOST' });
  assert.equal(unsafe.eligibleForPublication, false);
  assert.ok(unsafe.blockers.includes('URL_POLICY_NOT_APPROVED'));
  const both = sourceReadiness({ ...verified, configured: false, urlPolicy: 'INVALID_URL' });
  assert.deepEqual(both.blockers, ['ENDPOINT_NOT_ENABLED', 'URL_POLICY_NOT_APPROVED']);
});

test('publication readiness rejects missing or ambiguous endpoint enablement and host approval', () => {
  const valid = {
    configured: true, urlPolicy: 'APPROVED_HOST',
    url: 'https://www.brvm.org/fr/indices', rightsStatus: 'APPROVED', sourceFormatStatus: 'VALIDATED',
    historicalAdapterStatus: 'TESTED', historicalCoverage: 'VALIDATED',
    normalizationStatus: 'VALIDATED', publicationStatus: 'APPROVED',
    evidenceReferences: ['fixture:reproducible-evidence'],
  };
  assert.equal(sourceReadiness(valid).eligibleForPublication, true);
  for (const configured of [undefined, null, false, 'true', 1]) {
    const readiness = sourceReadiness({ ...valid, configured });
    assert.equal(readiness.eligibleForPublication, false);
    assert.ok(readiness.blockers.includes('ENDPOINT_NOT_ENABLED'));
  }
  for (const urlPolicy of [undefined, null, '', 'UNAPPROVED_HOST']) {
    const readiness = sourceReadiness({ ...valid, urlPolicy });
    assert.equal(readiness.eligibleForPublication, false);
    assert.ok(readiness.blockers.includes('URL_POLICY_NOT_APPROVED'));
  }
  assert.deepEqual(sourceReadiness({ ...valid, configured: undefined, urlPolicy: undefined }).blockers,
    ['ENDPOINT_NOT_ENABLED', 'URL_POLICY_NOT_APPROVED']);
});

test('probe rejects absent, null and ambiguous enabled flags without any network call', async () => {
  for (const configured of [undefined, null, false, 'true', 1]) {
    let calls = 0;
    const result = await probeInventory({
      registeredMarkets: 1, registeredEndpoints: 1,
      endpoints: [{
        endpointId: 'fixture', url: 'https://www.brvm.org/fr/indices',
        urlPolicy: 'APPROVED_HOST', configured,
        historicalCoverage: 'NOT_VERIFIED',
      }],
    }, async () => { calls += 1; throw new Error('network must be blocked'); });
    assert.equal(calls, 0);
    assert.deepEqual(result.endpoints[0].response,
      { status: 'NOT_PROBED', reason: 'ENDPOINT_NOT_ENABLED' });
    assert.equal(result.endpoints[0].historicalCoverage, 'NOT_VERIFIED');
  }
});

test('network boundary rejects a forged APPROVED_HOST label on an unsafe endpoint URL', async () => {
  for (const url of [
    'http://www.brvm.org/fr/indices',
    'https://localhost/internal',
    'https://127.0.0.1/admin',
    'https://user:secret@www.brvm.org/fr/indices',
    'https://www.brvm.org:8443/fr/indices',
    'https://unapproved.example.net/indices',
    'not a URL',
  ]) {
    let calls = 0;
    const result = await probeInventory({
      registeredMarkets: 1, registeredEndpoints: 1,
      endpoints: [{
        endpointId: 'untrusted-import', configured: true,
        urlPolicy: 'APPROVED_HOST', url,
        historicalCoverage: 'NOT_VERIFIED',
      }],
    }, async () => {
      calls += 1;
      throw new Error('No request should be made to an unapproved URL');
    });
    assert.equal(calls, 0, `Unexpected network call for ${url}`);
    assert.equal(result.endpoints[0].response.status, 'BLOCKED_BY_URL_POLICY');
    assert.equal(result.endpoints[0].historicalCoverage, 'NOT_VERIFIED');
  }
});

test('network boundary preserves an explicitly approved HTTPS endpoint', async () => {
  const calls = [];
  const result = await probeInventory({
    registeredMarkets: 1, registeredEndpoints: 1,
    endpoints: [{
      endpointId: 'uemoa-brvm-indices', configured: true,
      urlPolicy: 'APPROVED_HOST', url: 'https://www.brvm.org/fr/indices',
      historicalCoverage: 'NOT_VERIFIED',
    }],
  }, async (url, init) => {
    calls.push([url, init.method]);
    if (url.endsWith('/robots.txt')) return new Response('', { status: 404 });
    return new Response(null, { status: 200 });
  });
  assert.deepEqual(calls.map(([, method]) => method), ['GET', 'HEAD']);
  assert.equal(result.endpoints[0].response.status, 'HTTP_OK_UNVERIFIED_CONTENT');
  assert.equal(result.endpoints[0].historicalCoverage, 'NOT_VERIFIED');
});


test('HTML challenge returned for robots.txt blocks HEAD without dropping endpoint', async () => {
  const inventory = { registeredMarkets: 1, registeredEndpoints: 1, endpoints: [{
    endpointId: 'fixture', configured: true, urlPolicy: 'APPROVED_HOST',
    url: 'https://www.brvm.org/fr/indices', historicalCoverage: 'NOT_VERIFIED',
  }] };
  const methods = [];
  const result = await probeInventory(inventory, async (_url, init) => {
    methods.push(init.method);
    return new Response('<html>Access challenge</html>', {
      status: 200, headers: { 'content-type': 'text/html' },
    });
  });
  assert.deepEqual(methods, ['GET']);
  assert.equal(result.endpoints.length, 1);
  assert.deepEqual(result.endpoints[0].response,
    { status: 'NOT_PROBED', reason: 'ROBOTS_UNEXPECTED_CONTENT_TYPE' });
  assert.equal(result.endpoints[0].historicalCoverage, 'NOT_VERIFIED');
});


test('publication readiness rejects a forged host approval label and missing URL', () => {
  const approved = {
    endpointId: 'fixture', configured: true, urlPolicy: 'APPROVED_HOST',
    url: 'https://www.brvm.org/fr/indices', rightsStatus: 'APPROVED',
    sourceFormatStatus: 'VALIDATED', historicalAdapterStatus: 'TESTED',
    historicalCoverage: 'VALIDATED', normalizationStatus: 'VALIDATED',
    publicationStatus: 'APPROVED', evidenceReferences: ['fixture:licensed'],
  };
  assert.equal(sourceReadiness(approved).eligibleForPublication, true);
  for (const url of [undefined, null, 'http://www.brvm.org/fr/indices',
    'https://localhost/private', 'https://www.brvm.org:8443/indices',
    'https://unapproved.example.org/indices', 'not a URL']) {
    const decision = sourceReadiness({ ...approved, url });
    assert.equal(decision.eligibleForPublication, false, String(url));
    assert.ok(decision.blockers.includes('URL_POLICY_NOT_APPROVED'));
  }
});

test('HTML robots challenge without Content-Type fails closed before HEAD', async () => {
  const inventory = {
    registeredMarkets: 1, registeredEndpoints: 1,
    endpoints: [{
      endpointId: 'fixture-robots-html', url: 'https://www.brvm.org/fr/indices',
      configured: true, urlPolicy: 'APPROVED_HOST',
      historicalCoverage: 'NOT_VERIFIED', qualification: 'REGISTERED_ONLY',
    }],
  };
  const methods = [];
  const result = await probeInventory(inventory, async (_url, init) => {
    methods.push(init.method);
    return new Response('<!DOCTYPE html><html><body>Challenge</body></html>', { status: 200 });
  });
  assert.deepEqual(methods, ['GET']);
  assert.deepEqual(result.endpoints[0].response, {
    status: 'NOT_PROBED', reason: 'ROBOTS_UNEXPECTED_CONTENT_TYPE',
  });
  assert.equal(result.endpoints[0].historicalCoverage, 'NOT_VERIFIED');
});


test('unparseable nonempty robots response cannot silently authorize a HEAD', async () => {
  const inventory = { registeredMarkets: 1, registeredEndpoints: 1, endpoints: [{
    endpointId: 'fixture-robots-garbage', configured: true,
    urlPolicy: 'APPROVED_HOST', url: 'https://www.brvm.org/fr/indices',
    historicalCoverage: 'NOT_VERIFIED',
  }] };
  const calls = [];
  const result = await probeInventory(inventory, async (_url, init) => {
    calls.push(init.method);
    return new Response('Please enable JavaScript to continue', {
      status: 200, headers: { 'content-type': 'text/plain' },
    });
  });
  assert.deepEqual(calls, ['GET']);
  assert.deepEqual(result.endpoints[0].response,
    { status: 'NOT_PROBED', reason: 'ROBOTS_UNPARSEABLE' });
  assert.equal(result.endpoints[0].historicalCoverage, 'NOT_VERIFIED');
});


test('valid plaintext robots directives are recognized with leading whitespace and still deny HEAD', async () => {
  const inventory = { registeredMarkets: 1, registeredEndpoints: 1, endpoints: [{
    endpointId: 'robots-valid-spaced', configured: true, urlPolicy: 'APPROVED_HOST',
    url: 'https://www.brvm.org/fr/indices', historicalCoverage: 'NOT_VERIFIED',
  }] };
  const calls = [];
  const result = await probeInventory(inventory, async (_url, init) => {
    calls.push(init.method);
    return new Response('  User-agent : *\n  Disallow: /', {
      status: 200, headers: { 'content-type': 'text/plain' },
    });
  });
  assert.deepEqual(calls, ['GET']);
  assert.deepEqual(result.endpoints[0].response,
    { status: 'NOT_PROBED', reason: 'ROBOTS_DISALLOW' });
  assert.equal(result.endpoints[0].historicalCoverage, 'NOT_VERIFIED');
});
