export function parseDelimited(text: string, delimiter?: string): string[][] {
  const normalized = text.replace(/^\uFEFF/, '');
  // Inspect the complete first logical record, including multiline quoted headers.
  // Only unquoted delimiters contribute to autodetection.
  const counts = new Map<string, number>([[',', 0], [';', 0], ['\t', 0]]);
  let inQuotes = false;
  // Track whether the first meaningful header has begun without repeatedly
  // slicing the entire preamble (quadratic on large whitespace-only inputs).
  let headerStarted = false;
  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    // Ignore empty or whitespace-only physical lines before the header.
    // The parser itself discards these rows, so autodetection must agree.
    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (!headerStarted) {
        // Discard separator counts from whitespace-only preamble lines.
        // Tabs in those ignored rows are not header delimiters.
        for (const candidate of counts.keys()) counts.set(candidate, 0);
        continue;
      }
      break;
    }
    if (char !== undefined && !/\s/.test(char)) headerStarted = true;
    if (char === '"') {
      if (inQuotes && normalized[i + 1] === '"') i += 1;
      else inQuotes = !inQuotes;
    } else if (char !== undefined && !inQuotes && counts.has(char)) {
      counts.set(char, (counts.get(char) ?? 0) + 1);
    }
  }
  const sep = delimiter ?? ([',', ';', '\t'].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))[0] ?? ',');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let explicitQuotedCell = false;
  let closedQuotedCell = false;

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    const next = normalized[i + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      // Quotes cannot begin inside an already populated unquoted value.
      // Reject rather than silently stripping a character from financial data.
      if (!quoted && cell.trim().length > 0) {
        throw new Error('Invalid quote inside unquoted delimited field');
      }
      explicitQuotedCell = true;
      quoted = !quoted;
      closedQuotedCell = !quoted;
    } else if (char === sep && !quoted) {
      row.push(cell.trim());
      cell = '';
      closedQuotedCell = false;
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cell.trim());
      if (row.some(Boolean) || row.length > 1 || explicitQuotedCell) rows.push(row);
      row = [];
      cell = '';
      explicitQuotedCell = false;
      closedQuotedCell = false;
    } else {
      if (closedQuotedCell && char !== undefined && !/\s/.test(char)) {
        throw new Error('Invalid characters after closing quote in delimited field');
      }
      cell += char;
    }
  }
  if (quoted) throw new Error('Unterminated quoted field in delimited document');
  if (cell.length || row.length || explicitQuotedCell) {
    row.push(cell.trim());
    if (row.some(Boolean) || row.length > 1 || explicitQuotedCell) rows.push(row);
  }
  return rows;
}

export function rowsToObjects(rows: string[][]): Array<Record<string, string>> {
  const headers = rows[0] ?? [];
  const names = headers.map((header, i) => header || `column_${i + 1}`);
  if (new Set(names).size !== names.length) {
    throw new Error('Duplicate header in delimited document');
  }
  return rows.slice(1).map((row, index) => {
    if (row.length !== names.length) {
      throw new Error(`Delimited document row ${index + 2} has ${row.length} fields; expected ${names.length}`);
    }
    return Object.fromEntries(names.map((name, i) => [name, row[i] ?? '']));
  });
}
