/**
 * Verify a pair of read-only source-audit artifacts. Does not contact any source,
 * rewrite evidence, or grant any qualification/publication authority.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const PROBE_STATUSES = new Set([
  'NOT_PROBED', 'BLOCKED_BY_URL_POLICY', 'HTTP_OK_UNVERIFIED_CONTENT',
  'REDIRECT_NOT_FOLLOWED', 'RESTRICTED', 'NOT_FOUND', 'HEAD_UNSUPPORTED',
  'HTTP_OTHER', 'NETWORK_ERROR',
]);

export function verifyEvidence(inventory, live) {
  for (const [label, doc] of [['inventory', inventory], ['live', live]]) {
    assert.equal(doc?.schema, 'africafunds-source-qualification-v1', label + ' schema');
    assert.equal(doc.registeredMarkets, 11, label + ' market count');
    assert.equal(doc.registeredEndpoints, 44, label + ' endpoint count');
    assert.ok(Array.isArray(doc.endpoints), label + ' endpoint array');
    assert.equal(doc.endpoints.length, 44, label + ' endpoint rows');
    assert.equal(new Set(doc.endpoints.map(e => e.endpointId)).size, 44, label + ' unique endpoint IDs');
  }
  assert.equal(live.registryVersion, inventory.registryVersion, 'registry version changed');
  const baseline = new Map(inventory.endpoints.map(e => [e.endpointId, e]));
  const counts = {};
  for (const record of live.endpoints) {
    const original = baseline.get(record.endpointId);
    assert.ok(original, 'unexpected endpoint: ' + record.endpointId);
    const { response: _old, ...immutableBefore } = original;
    const { response, ...immutableAfter } = record;
    assert.deepEqual(immutableAfter, immutableBefore, 'auditor altered metadata: ' + record.endpointId);
    assert.ok(response && typeof response === 'object', 'missing probe result: ' + record.endpointId);
    assert.ok(PROBE_STATUSES.has(response.status), 'unknown probe result: ' + record.endpointId);
    counts[response.status] = (counts[response.status] || 0) + 1;
  }
  assert.deepEqual(live.summary?.byProbeStatus, counts, 'probe summary does not match 44 actual rows');
  assert.ok(Number.isFinite(Date.parse(live.audit?.startedAt)), 'audit start missing');
  assert.ok(Number.isFinite(Date.parse(live.audit?.endedAt)), 'audit end missing');
  assert.ok(Date.parse(live.audit.endedAt) >= Date.parse(live.audit.startedAt), 'audit dates reversed');
  return { markets: 11, endpoints: 44, byProbeStatus: counts };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length !== 4) {
    process.stderr.write('Usage: node scripts/verify-source-audit-evidence.mjs <inventory.json> <live-head-checks.json>\n');
    process.exitCode = 2;
  } else {
    const [inventory, live] = await Promise.all(process.argv.slice(2).map(async file =>
      JSON.parse(await readFile(file, 'utf8'))));
    const result = verifyEvidence(inventory, live);
    process.stdout.write('Audit artifact verified: ' + JSON.stringify(result) + '\n');
  }
}
