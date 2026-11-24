import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('the historical 44-endpoint audit snapshot reconciles exactly with the original registry', () => {
  const manifest = JSON.parse(read('../config/sources.json'));
  assert.equal(manifest.marketFiles.length, 11, 'original market-file count changed');
  assert.equal(new Set(manifest.marketFiles).size, manifest.marketFiles.length, 'duplicate market-file reference');
  const expected = new Map();
  const marketCodes = new Set();
  for (const file of manifest.marketFiles) {
    assert.match(file, /^sources\/[A-Z]+\.json$/, 'unexpected registry path');
    const market = JSON.parse(read('../config/' + file));
    assert.equal(market.code, file.slice('sources/'.length, -'.json'.length), 'market code/file mismatch: ' + file);
    assert.ok(!marketCodes.has(market.code), 'duplicate market code: ' + market.code);
    marketCodes.add(market.code);
    for (const endpoint of market.endpoints) {
      assert.ok(!expected.has(endpoint.id), 'duplicate registry endpoint: ' + endpoint.id);
      expected.set(endpoint.id, market.code);
    }
  }
  assert.equal(expected.size, 44, 'original endpoint inventory changed');

  const report = read('../docs/SOURCE_AUDIT_RUN_42314547906.md');
  // Do not silently skip a malformed endpoint row: the historical table is evidence.
  const section = report.split('## Statuts observés pour chacun des 44 endpoints')[1]?.split('## Suites gouvernées à exécuter')[0];
  assert.ok(section, 'historical audit table section missing');
  // Parse the whole evidence table, including rows with missing spaces after pipes.
  const rows = section.split('\n').filter(line => line.trimStart().startsWith('|')
    && !/^\|\s*Marché\s*\|/.test(line.trimStart())
    && !/^\|\s*:?-{3,}/.test(line.trimStart()));
  assert.equal(rows.length, expected.size, 'historical audit table row count changed');
  const observed = new Map();
  const allowed = new Set(['NOT_PROBED', 'RESTRICTED', 'NOT_FOUND', 'HTTP_OK_UNVERIFIED_CONTENT']);
  for (const row of rows) {
    assert.match(row, /^\| [A-Z]+ \| `[a-z0-9-]+` \|/, 'malformed historical audit table row');
    const cells = row.split('|').slice(1, -1).map(cell => cell.trim());
    assert.equal(cells.length, 4, 'malformed audit row: ' + row);
    const [market, endpointCell, statusCell, reason] = cells;
    assert.match(endpointCell, /^`[a-z0-9-]+`$/, 'malformed endpoint cell: ' + endpointCell);
    assert.ok(reason.length > 0, 'missing historical audit reason for ' + endpointCell);
    const expectedReason = {
      RESTRICTED: /^HEAD 403$/,
      NOT_FOUND: /^HEAD 404$/,
      HTTP_OK_UNVERIFIED_CONTENT: /^HEAD 200$/,
      NOT_PROBED: /^ROBOTS_(NETWORK_UNVERIFIED|HTTP_403|COMPLEX_RULE_UNVERIFIED)$/,
    };
    assert.match(statusCell, /^`[A-Z_]+`$/, 'malformed status cell for ' + endpointCell);
    const status = statusCell.slice(1, -1);
    const id = endpointCell.slice(1, -1);
    assert.ok(expected.has(id), 'unregistered endpoint in report: ' + id);
    assert.equal(market, expected.get(id), 'wrong market for ' + id);
    assert.ok(!observed.has(id), 'duplicate audit row: ' + id);
    assert.ok(allowed.has(status), 'unknown status for ' + id);
    assert.match(reason, expectedReason[status], 'status/reason mismatch for ' + id);
    observed.set(id, status);
  }
  assert.equal(observed.size, expected.size, 'missing or additional audit rows');
  const counts = Object.fromEntries([...allowed].map(status => [status, [...observed.values()].filter(value => value === status).length]));
  assert.deepEqual(counts, {
    NOT_PROBED: 22,
    RESTRICTED: 7,
    NOT_FOUND: 1,
    HTTP_OK_UNVERIFIED_CONTENT: 14,
  }, 'historical snapshot counts changed: requalify with new evidence instead of rewriting the old run');
});
