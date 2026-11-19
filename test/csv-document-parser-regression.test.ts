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

// The header record, not its first physical line, determines the delimiter.
test('Delimited: semicolon autodetection supports a multiline quoted header', () => {
  const rows = parseDelimited('"metric\nlabel";date;rate\n"Bill\n91d";2026-01-02;5.25\n');
  assert.deepEqual(rows, [
    ['metric\nlabel', 'date', 'rate'],
    ['Bill\n91d', '2026-01-02', '5.25'],
  ]);
});

// Blank preamble lines must not bias delimiter detection toward the comma fallback.
test('Delimited: leading blank lines do not hide a semicolon header', () => {
  const rows = parseDelimited('\n\r\ndate;rate;unit\n2026-01-02;5.25;percent\n');
  assert.deepEqual(rows, [
    ['date', 'rate', 'unit'],
    ['2026-01-02', '5.25', 'percent'],
  ]);
});

// Whitespace-only preamble lines are discarded by the parser and must not
// prevent detection of the delimiter in the first meaningful header record.
test('Delimited: whitespace-only preamble lines do not hide a semicolon header', () => {
  const rows = parseDelimited('  \r\n\t\n date;rate;unit\n2026-01-02;5.25;percent\n');
  assert.deepEqual(rows, [
    ['date', 'rate', 'unit'],
    ['2026-01-02', '5.25', 'percent'],
  ]);
});

// Tabs in discarded preamble lines must not compete with the real header separator.
test('Delimited: tab-heavy blank preamble cannot override a semicolon header', () => {
  const rows = parseDelimited('\t\t\t\t\r\n\t\t\t\n date;rate;unit\n2026-01-02;5.25;percent\n');
  assert.deepEqual(rows, [
    ['date', 'rate', 'unit'],
    ['2026-01-02', '5.25', 'percent'],
  ]);
});

// Large discarded preambles must not affect the actual financial header.
// This also exercises linear preamble scanning without timing-dependent assertions.
test('Delimited: long whitespace preamble preserves semicolon header detection', () => {
  const preamble = (' \t\t\r\n').repeat(12000);
  assert.deepEqual(parseDelimited(preamble + 'date;rate;unit\n2026-01-02;5.25;percent\n'), [
    ['date', 'rate', 'unit'],
    ['2026-01-02', '5.25', 'percent'],
  ]);
});

// Fail closed on malformed institutional documents instead of silently publishing partial rows.
test('Delimited: unterminated quoted field is rejected', () => {
  assert.throws(() => parseDelimited('date,rate\n2026-01-02,"5.25\n'), /unterminated|unclosed|quote/i);
});

test('Delimited: duplicate header names cannot silently overwrite financial values', () => {
  const rows = parseDelimited('date,rate,rate\n2026-01-02,5.25,6.25\n');
  assert.throws(() => rowsToObjects(rows), /duplicate|header/i);
});

// A short or over-wide row must not silently shift or discard financial columns.
test('Delimited: row width mismatch is rejected before object mapping', () => {
  assert.throws(() => rowsToObjects(parseDelimited('date,rate\n2026-01-02,5.25,unexpected\n')), /column|width|field/i);
  assert.throws(() => rowsToObjects(parseDelimited('date,rate\n2026-01-02\n')), /column|width|field/i);
});

// Preserve explicit empty final cells while rejecting absent cells.
// This distinguishes an intentionally blank financial observation from a truncated record.
test('Delimited: explicit trailing empty cells preserve row width', () => {
  const rows = parseDelimited('date;rate;unit\n2026-01-02;;\n');
  assert.deepEqual(rows, [['date', 'rate', 'unit'], ['2026-01-02', '', '']]);
  assert.deepEqual(rowsToObjects(rows), [{ date: '2026-01-02', rate: '', unit: '' }]);
});

// Fallback header names must participate in the same uniqueness constraint.
test('Delimited: generated fallback header cannot collide with explicit header', () => {
  const rows = parseDelimited('column_2,\n5.25,6.25\n');
  assert.throws(() => rowsToObjects(rows), /duplicate|header/i);
});


// Preserve source line endings inside quoted documentary fields, while retaining
// signed rates and an explicit empty last column without numeric coercion.
test('Delimited: CRLF quoted descriptions preserve signed rates and empty final cells', () => {
  const rows = parseDelimited('date;description;rate;unit\r\n2026-01-02;"Bill\r\n91d";-0.25;\r\n');
  assert.deepEqual(rows, [
    ['date', 'description', 'rate', 'unit'],
    ['2026-01-02', 'Bill\r\n91d', '-0.25', ''],
  ]);
  assert.deepEqual(rowsToObjects(rows), [
    { date: '2026-01-02', description: 'Bill\r\n91d', rate: '-0.25', unit: '' },
  ]);
});

// A delimiter-bearing record with all empty values is not a blank physical line.
// Dropping it silently loses a source observation and its row position.
test('Delimited: fully empty explicit financial records are preserved', () => {
  const rows = parseDelimited('date;rate;unit\n;;\n\n2026-01-02;5.25;percent\n;;');
  assert.deepEqual(rows, [
    ['date', 'rate', 'unit'],
    ['', '', ''],
    ['2026-01-02', '5.25', 'percent'],
    ['', '', ''],
  ]);
  assert.deepEqual(rowsToObjects(rows)[0], { date: '', rate: '', unit: '' });
});

// An explicitly quoted empty single-column record is a real record, not a blank line.
// Preserve its position for downstream source-quality and provenance checks.
test('Delimited: quoted empty single-column record is preserved', () => {
  const rows = parseDelimited('rate\n""\n\n5.25\n""');
  assert.deepEqual(rows, [['rate'], [''], ['5.25'], ['']]);
  assert.deepEqual(rowsToObjects(rows), [{ rate: '' }, { rate: '5.25' }, { rate: '' }]);
});

// A stray quote embedded in an unquoted financial field must not silently
// disappear or turn the remainder of the record into quoted data.
test('Delimited: quote inside unquoted financial field is rejected', () => {
  assert.throws(() => parseDelimited('date,rate\n2026-01-02,5".25\n'), /quote|malformed|invalid/i);
});
