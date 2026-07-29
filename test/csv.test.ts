import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDelimited, rowsToObjects } from '../src/parsers/csv.js';

test('CSV point-virgule et guillemets', () => {
  const rows = parseDelimited('Date;Taux;Volume\n2026-01-01;"2,50";1000\n');
  assert.deepEqual(rowsToObjects(rows), [{ Date: '2026-01-01', Taux: '2,50', Volume: '1000' }]);
});
