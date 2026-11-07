import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyEvidence } from '../scripts/verify-source-audit-evidence.mjs';

function fixture() {
  const endpoints = Array.from({ length: 44 }, (_, i) => ({
    endpointId: 'fixture-' + i, market: 'MAR',
    url: 'https://www.bkam.ma/test/' + i, configured: true,
    rightsStatus: 'NOT_VERIFIED', historicalCoverage: 'NOT_VERIFIED',
    publicationEligible: false, response: null,
  }));
  const inventory = { schema: 'africafunds-source-qualification-v1', registryVersion: '0.2.0',
    registeredMarkets: 11, registeredEndpoints: 44, endpoints };
  const live = { ...inventory, endpoints: endpoints.map(e => ({ ...e,
    response: { status: 'NOT_PROBED', reason: 'ROBOTS_HTTP_403' },
  })), audit: { startedAt: '2026-11-07T14:31:54.162Z', endedAt: '2026-11-07T14:33:17.587Z' },
    summary: { byProbeStatus: { NOT_PROBED: 44 } },
  };
  return { inventory, live };
}

test('accepts a complete read-only 44-source artifact with no false publication', () => {
  const { inventory, live } = fixture();
  assert.deepEqual(verifyEvidence(inventory, live), {
    markets: 11, endpoints: 44, byProbeStatus: { NOT_PROBED: 44 },
  });
});

test('rejects missing, duplicated and unexpected endpoints', () => {
  for (const mutation of [
    l => l.endpoints.pop(),
    l => { l.endpoints[0].endpointId = l.endpoints[1].endpointId; },
    l => { l.endpoints[0].endpointId = 'unregistered-999'; },
  ]) {
    const { inventory, live } = fixture(); mutation(live);
    assert.throws(() => verifyEvidence(inventory, live));
  }
});

test('rejects changed rights, coverage, publication eligibility or source URL', () => {
  for (const [key, value] of [
    ['rightsStatus', 'APPROVED'], ['historicalCoverage', 'VALIDATED'],
    ['publicationEligible', true], ['url', 'https://untrusted.example/'],
  ]) {
    const { inventory, live } = fixture(); live.endpoints[0][key] = value;
    assert.throws(() => verifyEvidence(inventory, live), /altered metadata/);
  }
});

test('rejects falsely summarized positive probes, unrecognized statuses and missing responses', () => {
  for (const mutation of [
    l => { l.summary.byProbeStatus = { HTTP_OK_UNVERIFIED_CONTENT: 44 }; },
    l => { l.endpoints[0].response.status = 'HISTORY_COMPLETE'; },
    l => { l.endpoints[0].response = null; },
  ]) {
    const { inventory, live } = fixture(); mutation(live);
    assert.throws(() => verifyEvidence(inventory, live));
  }
});

test('rejects non-matching source registry and invalid audit timestamps', () => {
  for (const mutation of [
    l => { l.registryVersion = 'other'; },
    l => { l.audit.startedAt = 'not-a-time'; },
    l => { l.audit.endedAt = '2026-11-06T14:00:00.000Z'; },
  ]) {
    const { inventory, live } = fixture(); mutation(live);
    assert.throws(() => verifyEvidence(inventory, live));
  }
});
