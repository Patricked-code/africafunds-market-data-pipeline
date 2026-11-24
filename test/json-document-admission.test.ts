import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFinancialJsonDocument } from '../src/parsers/json.js';

test('accepts an array of simple flat observations without asserting source coverage', () => {
  const parsed = parseFinancialJsonDocument(
    '[{"date":"2026-01-01","rate":"2.5000","count":2,"official":false,"flag":null}]'
  );
  assert.equal(parsed.envelope, 'array');
  assert.deepEqual({...parsed.rows[0]}, {
    date:'2026-01-01',rate:'2.5000',count:2,official:false,flag:null
  });
});
test('admits a single recognized data or records array', () => {
  assert.equal(parseFinancialJsonDocument('{"data":[{"code":"ABC"}]}').envelope, 'data');
  assert.equal(parseFinancialJsonDocument('{"records":[{"code":"ABC"}]}').envelope, 'records');
});
test('empty rows remain empty: this parser cannot imply ingestion SUCCESS', () => {
  assert.deepEqual(parseFinancialJsonDocument('{"data":[]}').rows, []);
});
test('rejects invalid JSON and shape ambiguities', () => {
  for (const input of [
    '', '{', 'null', '42', '"text"', '{}', '{"data":{}}',
    '{"data":[{"a":"x"}],"records":[{"a":"y"}]}',
    '{"other":[{"a":"x"}]}',
  ]) assert.throws(() => parseFinancialJsonDocument(input));
});
test('rejects nested financial mappings and malformed rows', () => {
  for (const input of [
    '[[]]', '[null]', '[2]', '[{}]', '[{"a":[1]}]', '[{"a":{"b":1}}]'
  ]) assert.throws(() => parseFinancialJsonDocument(input));
});
test('financial numbers that can silently lose precision fail closed', () => {
  for (const input of [
    '[{"rate":2.5}]', '[{"amount":9007199254740993}]',
    '[{"rate":1e309}]', '[{"rate":1e-100}]'
  ]) assert.throws(() => parseFinancialJsonDocument(input), /lossless/);
});
test('rejects prototype pollution field names', () => {
  for (const k of ['__proto__', 'constructor', 'prototype', '']) {
    const input = JSON.stringify([{[k]:'x'}]);
    // JS computed property syntax ensures __proto__ is serialized as an own key.
    assert.throws(() => parseFinancialJsonDocument(input));
  }
});
test('rejects excessive row count, field count and document size', () => {
  const hugeRows = JSON.stringify(Array.from({length:10_001}, () => ({a:1})));
  assert.throws(() => parseFinancialJsonDocument(hugeRows), /row limit/);
  const row = Object.fromEntries(Array.from({length:151}, (_,i) => ['k'+i, 'x']));
  assert.throws(() => parseFinancialJsonDocument(JSON.stringify([row])), /fields/);
  assert.throws(() => parseFinancialJsonDocument(' '.repeat(2_000_001)), /size/);
});

test('rejects original non-integral tokens even when they round to safe integers', () => {
  for (const token of [
    '1.0000000000000001', '1e-400', '-1e-400',
    '9007199254740990.5', '-9007199254740990.5',
    '0.999999999999999999999', '1e-999999999999999999999'
  ]) {
    assert.throws(() => parseFinancialJsonDocument('[{"rate":' + token + '}]'), /lossless/);
  }
});

test('preserves exactly representable safe integers and decimal strings', () => {
  const result = parseFinancialJsonDocument(
    '[{"max":9007199254740991,"min":-9007199254740991,"exponent":1e3,"integralDecimal":1.0,"zero":0e-9999,"rate":"1.0000000000000001"}]'
  );
  assert.deepEqual({...result.rows[0]}, {
    max:9007199254740991, min:-9007199254740991, exponent:1000,
    integralDecimal:1, zero:0, rate:'1.0000000000000001'
  });
});

test('rejects duplicate object keys including escaped equivalent names and envelopes', () => {
  for (const input of [
    '[{"rate":"2.5","rate":"9.5"}]',
    '{"data":[{"code":"A"}],"data":[{"code":"B"}]}',
    '[{"rate":1,"\\u0072ate":2}]',
    '{"data":[],"\\u0064ata":[]}',
    '{"data":[],"meta":{"version":1,"version":2}}',
  ]) {
    assert.throws(() => parseFinancialJsonDocument(input), /duplicate object key/);
  }
});

test('does not confuse independent object keys or JSON-looking string contents with tokens', () => {
  const rows = [
    {rate:'1e-400', note:'{"rate":1.0000000000000001,"rate":2}', escape:'a\\"b'},
    {rate:'9.5', note:'braces { } and quotes "', escape:'\\u0072ate'}
  ];
  const result = parseFinancialJsonDocument(JSON.stringify({data:rows, meta:{version:1.5}}));
  assert.deepEqual(result.rows.map(row => ({...row})), rows);
});
