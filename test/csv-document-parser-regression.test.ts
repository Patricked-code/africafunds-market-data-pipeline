import assert from 'node:assert/strict';
import test from 'node:test';
import { parseDelimited, rowsToObjects } from '../src/parsers/csv.js';

// Lot 4 / issue #14: deterministic document-parser regression fixtures.
// These synthetic records do not assert institutional formats, rights or history.
test('CSV: BOM, quoted delimiters, escaped quotes and multiline fields survive parsing', () => {
  const text = '\uFEFFdate,description,value\r\n2026-01-02,"Treasury, 91 days",12.5\r\n2026-01-03,"Quoted ""rate""\ncontinued",13.0\r\n';
  const rows = parseDelimited(text);
  assert.deepEqual(rows, [
    ['date', 'description', 'value'],
    ['2026-01-02', 'Treasury, 91 days', '12.5'],
    ['2026-01-03', 'Quoted "rate"\ncontinued', '13.0'],
  ]);
  assert.deepEqual(rowsToObjects(rows), [
    { date: '2026-01-02', description: 'Treasury, 91 days', value: '12.5' },
    { date: '2026-01-03', description: 'Quoted "rate"\ncontinued', value: '13.0' },
  ]);
});

test('Delimited: semicolon autodetection does not split quoted semicolons', () => {
  const rows = parseDelimited('date;instrument;rate\n2026-01-02;"Bill; 91d";5.25\n');
  assert.deepEqual(rows, [
    ['date', 'instrument', 'rate'],
    ['2026-01-02', 'Bill; 91d', '5.25'],
  ]);
});

test('Delimited: explicit tab delimiter retains empty financial cells', () => {
  const rows = parseDelimited('date\trate\tunit\n2026-01-02\t\tpercent\n', '\t');
  assert.deepEqual(rows, [
    ['date', 'rate', 'unit'],
    ['2026-01-02', '', 'percent'],
  ]);
  assert.equal(rowsToObjects(rows)[0]?.rate, '');
});

test('Delimited: blank physical lines are ignored without inventing observations', () => {
  assert.deepEqual(parseDelimited('date,rate\n\n2026-01-02,0\n\n'), [
    ['date', 'rate'],
    ['2026-01-02', '0'],
  ]);
});

// A quoted field may contain more semicolons than the number of CSV separators.
// Delimiter selection must count only separators outside quoted fields.
test('Delimited: autodetection ignores semicolons inside a quoted CSV header', () => {
  const rows = parseDelimited('date,"metric;a;b;c",rate\n2026-01-02,"bond;a;b;c",5.25\n');
  assert.deepEqual(rows, [
    ['date', 'metric;a;b;c', 'rate'],
    ['2026-01-02', 'bond;a;b;c', '5.25'],
  ]);
});
