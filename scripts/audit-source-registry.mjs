/**
 * Read-only source qualification. No downloads, no authenticated access, no redirects.
 * A positive HEAD does not establish series or historical coverage.
 * Host allowlist is intentionally independent of registry (untrusted PRs).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';

export const APPROVED_HOSTS = new Set([
  'esx.et','gosdmx.bct.gov.tn','gse.com.gh','nbe.gov.et','ngxgroup.com',
  'nsx.com.na','pdmo.treasury.go.ke','www.bankofbotswana.bw',
  'www.bceao.int','www.beac.int','www.bkam.ma','www.bog.gov.gh',
  'www.bon.com.na','www.brvm.org','www.bse.co.bw','www.bvm-ac.org',
  'www.casablanca-bourse.com','www.cbe.org.eg','www.cbn.gov.ng',
  'www.centralbank.go.ke','www.cmf.tn','www.dmo.gov.ng',
  'www.egx.com.eg','www.finances.gov.tn','www.nse.co.ke',
  'www.tunis-stockexchange.com','www.umoatitres.org',
]);
const AGENT = 'AfricaFundsMarketCollector/0.1';
const INTERVAL_MS = 2200;
const TIMEOUT_MS = 10000;
const delay = (ms) => new Promise((done) => setTimeout(done, ms));

export function validateEndpointUrl(value) {
  let url;
  try { url = new URL(value); }
  catch { return { valid: false, reason: 'INVALID_URL' }; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) {
    return { valid: false, reason: 'HTTPS_ONLY_NO_CREDENTIALS_OR_CUSTOM_PORT' };
  }
  if (!APPROVED_HOSTS.has(url.hostname)) return { valid: false, reason: 'UNAPPROVED_HOST' };
  return { valid: true, url };
}

export async function buildInventory(manifestPath = 'config/sources.json') {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (!Array.isArray(manifest.marketFiles)) throw new Error('Invalid marketFiles manifest');
  const base = dirname(resolve(manifestPath));
  const markets = [];
  const ids = new Set();
  const marketCodes = new Set();
  for (const file of manifest.marketFiles) {
    if (!/^sources\/[A-Z]+\.json$/.test(file)) throw new Error('Unexpected market file: ' + file);
    const market = JSON.parse(await readFile(resolve(base, file), 'utf8'));
    if (!market.code || marketCodes.has(market.code)) throw new Error('Duplicate or missing market code');
    marketCodes.add(market.code);
    if (!Array.isArray(market.endpoints)) throw new Error('Invalid endpoints for ' + market.code);
    for (const endpoint of market.endpoints) {
      if (!endpoint.id || ids.has(endpoint.id)) throw new Error('Duplicate or missing endpoint: ' + endpoint.id);
      ids.add(endpoint.id);
      if (!endpoint.dataFamily || !endpoint.collector || !endpoint.frequency) {
        throw new Error('Endpoint metadata incomplete: ' + endpoint.id);
      }
    }
    markets.push({ ...market, manifestFile: file });
  }
  const endpoints = markets.flatMap((market) => market.endpoints.map((e) => {
    const validation = validateEndpointUrl(e.url);
    return {
      endpointId: e.id, market: market.code, family: e.dataFamily,
      collector: e.collector, frequency: e.frequency, url: e.url,
      configured: e.enabled !== false, qualification: 'REGISTERED_ONLY',
      urlPolicy: validation.valid ? 'APPROVED_HOST' : validation.reason,
      historicalCoverage: 'NOT_VERIFIED', firstDate: null, lastDate: null,
      // Access to a public page does not establish rights to archive or redistribute data.
      rightsStatus: 'NOT_VERIFIED',
      sourceFormatStatus: 'NOT_VERIFIED',
      normalizationStatus: 'NOT_VERIFIED',
      historicalAdapterStatus: e.collector === 'MANUAL_API_DISCOVERY' ? 'BLOCKED_ADAPTER' : 'NOT_VERIFIED',
      publicationEligible: false,
      response: null,
    };
  }));
  return {
    schema: 'africafunds-source-qualification-v1', registryVersion: manifest.version,
    registeredMarkets: markets.length, registeredEndpoints: endpoints.length,
    endpoints,
  };
}

export function robotsDecision(content, path, agent = AGENT) {
  const groups = [];
  let agents = []; let rules = [];
  const flush = () => { if (agents.length) groups.push({ agents, rules }); agents = []; rules = []; };
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.split('#', 1)[0].trim();
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === 'user-agent') {
      if (rules.length) flush();
      agents.push(value.toLowerCase());
    } else if (key === 'allow' || key === 'disallow') {
      if (agents.length) rules.push({ key, value });
    }
  }
  flush();
  const userAgent = agent.toLowerCase().split('/')[0];
  // Match the most specific product token, not arbitrary substrings.
  // A short unrelated token must not override a matching wildcard group.
  const specific = groups.map((g) => ({
    group: g,
    specificity: Math.max(0, ...g.agents.filter((a) =>
      a !== '*' && userAgent.startsWith(a)).map((a) => a.length)),
  })).filter((entry) => entry.specificity > 0);
  const longest = Math.max(0, ...specific.map((entry) => entry.specificity));
  const applicable = longest
    ? specific.filter((entry) => entry.specificity === longest).map((entry) => entry.group)
    : groups.filter((g) => g.agents.includes('*'));
  const matches = applicable.flatMap((g) => g.rules).filter((r) => r.value);
  if (matches.some((r) => r.value.includes('*') || r.value.includes('$'))) {
    return { allowed: false, reason: 'ROBOTS_COMPLEX_RULE_UNVERIFIED' };
  }
  const relevant = matches.filter((r) => path.startsWith(r.value)).sort((a,b) =>
    b.value.length - a.value.length || (a.key === 'allow' ? -1 : 1));
  if (relevant[0]?.key === 'disallow') return { allowed: false, reason: 'ROBOTS_DISALLOW' };
  return { allowed: true, reason: 'ROBOTS_PERMIT' };
}

async function limitedFetch(url, method, hostTimes, fetcher) {
  const host = new URL(url).hostname;
  const previous = hostTimes.get(host) || 0;
  const wait = Math.max(0, INTERVAL_MS - (Date.now() - previous));
  if (wait) await delay(wait);
  hostTimes.set(host, Date.now());
  return fetcher(url, {
    method, headers: { 'user-agent': AGENT, accept: method === 'HEAD' ? '*/*' : 'text/plain' },
    redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

export async function probeInventory(inventory, fetcher = fetch) {
  const robotsCache = new Map();
  const hostTimes = new Map();
  const checkedAt = new Date().toISOString();
  const checked = [];
  for (const e of inventory.endpoints) {
    const record = { ...e };
    // A disabled registry endpoint is inventory-only. Never send even a robots
    // request for a source deliberately disabled by the source owner.
    if (e.configured !== true) {
      record.response = { status: 'NOT_PROBED', reason: 'ENDPOINT_NOT_ENABLED' };
      checked.push(record);
      continue;
    }
    // Revalidate the actual URL at the network boundary. The cached
    // urlPolicy label is audit metadata, not a security authority: an imported
    // or stale inventory could claim APPROVED_HOST for an unsafe URL.
    const checkedUrl = validateEndpointUrl(e.url);
    if (e.urlPolicy !== 'APPROVED_HOST' || !checkedUrl.valid) {
      record.response = {
        status: 'BLOCKED_BY_URL_POLICY',
        reason: checkedUrl.valid ? 'URL_POLICY_NOT_APPROVED' : checkedUrl.reason,
      };
      checked.push(record);
      continue;
    }
    const url = checkedUrl.url;
    const host = url.hostname;
    if (!robotsCache.has(host)) {
      try {
        const robots = await limitedFetch('https://' + host + '/robots.txt', 'GET', hostTimes, fetcher);
        if (robots.status === 404 || robots.status === 410) {
          robotsCache.set(host, { text: '', valid: true, reason: 'ROBOTS_NOT_PRESENT' });
        } else if (robots.status === 200) {
          const contentType = robots.headers?.get?.('content-type') || '';
          const body = await robots.text();
          // An HTML challenge/login page is not a valid robots policy.
          // Fail closed rather than treating an unrelated 200 as permission.
          if ((contentType && !/^text\/plain(?:\s*;|\s*$)/i.test(contentType)) ||
              /^\s*(?:<!doctype\s+html\b|<html(?:\s|>))/i.test(body)) {
            robotsCache.set(host, { valid: false, reason: 'ROBOTS_UNEXPECTED_CONTENT_TYPE' });
          } else robotsCache.set(host, body.length <= 100000
            ? { text: body, valid: true, reason: 'ROBOTS_RECEIVED' }
            : { valid: false, reason: 'ROBOTS_TOO_LARGE' });
        } else {
          robotsCache.set(host, { valid: false, reason: 'ROBOTS_HTTP_' + robots.status });
        }
      } catch {
        robotsCache.set(host, { valid: false, reason: 'ROBOTS_NETWORK_UNVERIFIED' });
      }
    }
    const robots = robotsCache.get(host);
    if (!robots.valid) {
      record.response = { status: 'NOT_PROBED', reason: robots.reason };
      checked.push(record);
      continue;
    }
    const decision = robotsDecision(robots.text, url.pathname + url.search);
    if (!decision.allowed) {
      record.response = { status: 'NOT_PROBED', reason: decision.reason };
      checked.push(record);
      continue;
    }
    try {
      const start = Date.now();
      const result = await limitedFetch(url.toString(), 'HEAD', hostTimes, fetcher);
      const status = result.status;
      record.response = {
        status: status >= 200 && status < 300 ? 'HTTP_OK_UNVERIFIED_CONTENT' :
          status >= 300 && status < 400 ? 'REDIRECT_NOT_FOLLOWED' :
          status === 401 || status === 403 ? 'RESTRICTED' :
          status === 404 ? 'NOT_FOUND' :
          status === 405 || status === 501 ? 'HEAD_UNSUPPORTED' : 'HTTP_OTHER',
        httpStatus: status, method: 'HEAD', elapsedMs: Date.now() - start,
        contentType: result.headers.get('content-type'), checkedAt,
      };
    } catch (error) {
      record.response = {
        status: 'NETWORK_ERROR', method: 'HEAD', checkedAt,
        error: error instanceof Error ? error.name : 'Unknown',
      };
    }
    checked.push(record);
  }
  return {
    ...inventory, audit: {
      startedAt: checkedAt, endedAt: new Date().toISOString(),
      method: 'robots-gated HTTPS HEAD, no redirect, no file download',
      limitation: 'HEAD reachability does NOT prove historical data, mapping or ingest readiness',
    }, endpoints: checked,
  };
}

/**
 * Fail closed: a successful HTTP HEAD is not proof of source certification.
 * This is an audit classification, not a permission grant or production publish gate.
 */
export function sourceReadiness(endpoint) {
  const blockers = [];
  // Explicitly disabled endpoints and endpoints failing URL policy are never
  // publishable, even when stale external metadata says other gates passed.
  // Missing fields are not approval. A partial/stale fixture must not bypass
  // an explicit enabled state or the validated HTTPS host policy.
  if (endpoint.configured !== true) blockers.push('ENDPOINT_NOT_ENABLED');
  // A cached approval label alone is not sufficient for publication. Recheck
  // the actual URL when present, just as the live network boundary does.
  // Missing URLs are also unverified: metadata must never grant access.
  if (endpoint.urlPolicy !== 'APPROVED_HOST' || !validateEndpointUrl(endpoint.url).valid) {
    blockers.push('URL_POLICY_NOT_APPROVED');
  }
  if (endpoint.rightsStatus !== 'APPROVED') blockers.push('RIGHTS_NOT_APPROVED');
  if (endpoint.sourceFormatStatus !== 'VALIDATED') blockers.push('SOURCE_FORMAT_NOT_VALIDATED');
  if (endpoint.historicalAdapterStatus !== 'TESTED') blockers.push('ADAPTER_NOT_TESTED');
  if (endpoint.historicalCoverage !== 'VALIDATED') blockers.push('HISTORY_NOT_VALIDATED');
  if (endpoint.normalizationStatus !== 'VALIDATED') blockers.push('NORMALIZATION_NOT_VALIDATED');
  if (!Array.isArray(endpoint.evidenceReferences) || endpoint.evidenceReferences.length === 0) {
    blockers.push('MISSING_REPRODUCIBLE_EVIDENCE');
  }
  // Explicit publication approval is separate from access rights.
  if (endpoint.publicationStatus !== 'APPROVED') blockers.push('PUBLICATION_NOT_APPROVED');
  return {
    eligibleForPublication: blockers.length === 0,
    blockers,
  };
}

export function summarise(inventory) {
  const count = (field) => inventory.endpoints.reduce((acc, e) => {
    const value = field(e);
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
  return {
    markets: inventory.registeredMarkets, endpoints: inventory.registeredEndpoints,
    byMarket: count((e) => e.market), byFamily: count((e) => e.family),
    byCollector: count((e) => e.collector),
    byProbeStatus: count((e) => e.response?.status || 'NOT_TESTED'),
    byRightsStatus: count((e) => e.rightsStatus || 'NOT_VERIFIED'),
    byPublicationEligibility: count((e) =>
      sourceReadiness(e).eligibleForPublication ? 'ELIGIBLE_ON_EVIDENCE' : 'NOT_ELIGIBLE'),
  };
}

if (process.argv[1] && import.meta.url === new URL('file://' + resolve(process.argv[1])).href) {
  const live = process.argv.includes('--live');
  const outputIndex = process.argv.indexOf('--output');
  const output = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;
  const inventory = await buildInventory();
  if (inventory.registeredEndpoints !== 44 || inventory.registeredMarkets !== 11) {
    throw new Error('Unexpected source registry cardinality, inspect changes before audit');
  }
  const result = live ? await probeInventory(inventory) : inventory;
  const payload = JSON.stringify({ ...result, summary: summarise(result) }, null, 2) + '\n';
  if (output) {
    await mkdir(dirname(resolve(output)), { recursive: true });
    await writeFile(output, payload);
    process.stdout.write('Evidence written to ' + output + '\n');
  } else process.stdout.write(payload);
}
