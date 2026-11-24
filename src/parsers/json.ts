/**
 * SadiaAF lot 4 — preliminary JSON document admission.
 *
 * This is NOT an official endpoint adapter, JSON-SDMX mapper, canonical
 * financial normalization, nor evidence of verified market coverage.
 * An adapter must separately validate source rights, dates, field mapping,
 * decimal precision and publication eligibility before persisting data.
 */
export type JsonPrimitive = string | number | boolean | null;
export type JsonDocumentRow = Record<string, JsonPrimitive>;

export interface JsonDocumentAdmission {
  rows: JsonDocumentRow[];
  envelope: 'array' | 'data' | 'records';
}

const MAX_BYTES = 2_000_000;
const MAX_ROWS = 10_000;
const MAX_FIELDS = 150;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * JSON.parse may turn a non-integral token into a safe integer (including
 * underflow to zero). Check the decimal significand and exponent as text,
 * without expanding an attacker-controlled exponent or rounding the value.
 */
function representsExactInteger(token: string): boolean {
  const parts = /^-?(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(token);
  if (!parts) return false;
  const fraction = parts[2] ?? '';
  const digits = parts[1]! + fraction;
  if (!/[1-9]/.test(digits)) return true;
  const exponent = Number(parts[3] ?? '0');
  if (!Number.isSafeInteger(exponent)) return false;
  const shift = exponent - fraction.length;
  if (shift >= 0) return true;
  if (-shift >= digits.length) return false;
  return !/[1-9]/.test(digits.slice(shift));
}

/**
 * Inspect original tokens before whole-document JSON.parse. JSON.parse
 * subsequently validates the complete grammar. Each object has its own
 * key set; key decoding detects equivalent escaped and unescaped names.
 * Ignore numeric-looking text inside strings. The existing row validation
 * still rejects all non-safe numbers, nested values and unsafe field names.
 */
function validateOriginalJsonTokens(input: string): void {
  const objectKeys: Set<string>[] = [];
  const numberToken = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
  let i = 0;
  while (i < input.length) {
    const ch = input.charAt(i);
    if (ch === '"') {
      const start = i++;
      let closed = false;
      while (i < input.length) {
        const c = input.charAt(i++);
        if (c === '\\') {
          i++;
        } else if (c === '"') {
          closed = true;
          break;
        }
      }
      if (!closed) throw new Error('Invalid JSON document');
      let next = i;
      while (next < input.length && /[ \t\r\n]/.test(input.charAt(next))) next++;
      if (input.charAt(next) === ':') {
        const keys = objectKeys[objectKeys.length - 1];
        if (!keys) throw new Error('Invalid JSON document');
        let key: string;
        try {
          key = JSON.parse(input.slice(start, i)) as string;
        } catch {
          throw new Error('Invalid JSON document');
        }
        if (keys.has(key)) throw new Error('JSON document contains a duplicate object key');
        keys.add(key);
      }
      continue;
    }
    if (ch === '{') {
      objectKeys.push(new Set<string>());
    } else if (ch === '}') {
      objectKeys.pop();
    } else if (ch === '-' || (ch >= '0' && ch <= '9')) {
      numberToken.lastIndex = i;
      const match = numberToken.exec(input);
      if (!match) throw new Error('Invalid JSON document');
      const token = match[0];
      if (Number.isSafeInteger(Number(token)) && !representsExactInteger(token)) {
        throw new Error('JSON numeric value requires a lossless source-specific decimal mapping');
      }
      i = numberToken.lastIndex;
      continue;
    }
    i++;
  }
}

/**
 * Only flat unambiguous arrays of records are admissible. JSON decimals are
 * refused until a *source-specific* lossless decimal strategy is approved:
 * JSON.parse would otherwise round monetary rates and amounts silently.
 */
export function parseFinancialJsonDocument(input: string): JsonDocumentAdmission {
  if (Buffer.byteLength(input, 'utf8') > MAX_BYTES) {
    throw new Error('JSON document exceeds safe parser size limit');
  }
  validateOriginalJsonTokens(input);
  let value: unknown;
  try {
    value = JSON.parse(input) as unknown;
  } catch {
    throw new Error('Invalid JSON document');
  }
  let data: unknown;
  let envelope: JsonDocumentAdmission['envelope'];
  if (Array.isArray(value)) {
    data = value;
    envelope = 'array';
  } else if (isPlainRecord(value)) {
    const own = Object.keys(value);
    const candidates = own.filter(key => key === 'data' || key === 'records');
    if (candidates.length !== 1 || !Array.isArray(value[candidates[0]!])) {
      throw new Error('JSON document requires one unambiguous data or records array');
    }
    envelope = candidates[0] as 'data' | 'records';
    data = value[envelope];
  } else {
    throw new Error('JSON document must be a record array or recognized envelope');
  }
  const rows = data as unknown[];
  if (rows.length > MAX_ROWS) throw new Error('JSON document row limit exceeded');

  const parsed: JsonDocumentRow[] = [];
  for (const row of rows) {
    if (!isPlainRecord(row)) throw new Error('JSON row must be a flat object');
    const keys = Object.keys(row);
    if (keys.length === 0 || keys.length > MAX_FIELDS) {
      throw new Error('JSON row has an invalid number of fields');
    }
    const record: JsonDocumentRow = Object.create(null) as JsonDocumentRow;
    for (const key of keys) {
      if (!key.trim() || FORBIDDEN_KEYS.has(key)) {
        throw new Error('JSON row has an unsafe or empty field name');
      }
      const field = row[key];
      if (typeof field === 'number') {
        if (!Number.isSafeInteger(field)) {
          throw new Error('JSON numeric value requires a lossless source-specific decimal mapping');
        }
      } else if (field !== null && typeof field !== 'string' && typeof field !== 'boolean') {
        throw new Error('JSON nested object or array requires a source-specific mapper');
      }
      record[key] = field;
    }
    parsed.push(record);
  }
  return { rows: parsed, envelope };
}
