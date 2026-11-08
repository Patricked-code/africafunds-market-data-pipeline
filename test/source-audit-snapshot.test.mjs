import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('the historical 44-endpoint audit snapshot reconciles exactly with the original registry', () => {
  const manifest = JSON.parse(read('../config/sources.json'));
  assert.equal(manifest.marketFiles.length, 11, 'original market-file count changed');
  const expected = new Map();
  for (const file of manifest.marketFiles) {
    assert.match(file, /^sources\/[A-Z]+\.json$/, 'unexpected registry path');
    const market = JSON.parse(read('../config/' + file));
    for (const endpoint of market.endpoints) {
      assert.ok(!expected.has(endpoint.id), 'duplicate registry endpoint: ' + endpoint.id);
      expected.set(endpoint.id, market.code);
    }
  }
  assert.equal(expected.size, 44, 'original endpoint inventory changed');

  const report = read('../docs/SOURCE_AUDIT_RUN_42314547906.md');
  const rows = report.split('\n').filter(line => /^\| [A-Z]+ \| `[^\x60]+` \|/.test(line));
  const observed = new Map();
  const allowed = new Set(['NOT_PROBED', 'RESTRICTED', 'NOT_FOUND', 'HTTP_OK_UNVERIFIED_CONTENT']);
  for (const row of rows) {
    const cells = row.split('|').slice(1, -1).map(cell => cell.trim());
    assert.equal(cells.length, 4, 'malformed audit row: ' + row);
    const [market, endpointCell, statusCell] = cells;
    assert.match(statusCell, /^`[A-Z_]+`$/, 'malformed status cell for ' + endpointCell);
    const status = statusCell.slice(1, -1);
    const id = endpointCell.slice(1, -1);
    assert.ok(expected.has(id), 'unregistered endpoint in report: ' + id);
    assert.equal(market, expected.get(id), 'wrong market for ' + id);
    assert.ok(!observed.has(id), 'duplicate audit row: ' + id);
    assert.ok(allowed.has(status), 'unknown status for ' + id);
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
