import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverLinks, parseHtmlTables } from '../src/parsers/html.js';
import { parseDelimited, rowsToObjects } from '../src/parsers/csv.js';
import { assertUsableIngestion } from '../src/jobs/ingestionCompleteness.js';

// Synthetic fixtures only: parser/discovery/endpoint guard contract, no HTTP, DB or official sources.
const indexUrl = 'https://fixtures.invalid/market/history/';
const htmlIndex = '<html><body><a href="rates.csv">Historical rates</a></body></html>';
const childCsv = 'date;rate\n2026-01-02;4.25\n2026-01-03;4.50\n';

test('HTML index -> discovered CSV child -> parsed observations -> endpoint completeness', () => {
  const parentRows = parseHtmlTables(htmlIndex);
  assert.equal(parentRows.length, 0);
  const links = discoverLinks(htmlIndex, indexUrl);
  assert.equal(links.length, 1);
  assert.equal(links[0]?.url, 'https://fixtures.invalid/market/history/rates.csv');
  assert.equal(links[0]?.extension, 'csv');
  const observations = rowsToObjects(parseDelimited(childCsv));
  assert.deepEqual(observations, [
    { date: '2026-01-02', rate: '4.25' },
    { date: '2026-01-03', rate: '4.50' },
  ]);
  assert.doesNotThrow(() => assertUsableIngestion({ rows: parentRows.length + observations.length, failedChildren: 0 }));
});

test('HTML index with a failed child cannot be certified despite a valid sibling CSV', () => {
  const observations = rowsToObjects(parseDelimited(childCsv));
  assert.throws(
    () => assertUsableIngestion({ rows: observations.length, failedChildren: 1 }),
    /Ingestion incomplete.*failedChildren=1/,
  );
});

test('HTML index with an empty CSV child cannot certify financial observations', () => {
  const observations = rowsToObjects(parseDelimited('date;rate\n'));
  assert.equal(observations.length, 0);
  assert.throws(() => assertUsableIngestion({ rows: observations.length, failedChildren: 0 }), /rows=0/);
});
