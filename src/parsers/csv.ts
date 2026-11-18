export function parseDelimited(text: string, delimiter?: string): string[][] {
  const normalized = text.replace(/^\uFEFF/, '');
  const firstLine = normalized.split(/\r?\n/, 1)[0] ?? '';
  // Count only unquoted delimiters: institutional CSV headers can contain
  // semicolons or tabs inside quoted column labels.
  const counts = new Map<string, number>([[',', 0], [';', 0], ['\t', 0]]);
  let inQuotes = false;
  for (let i = 0; i < firstLine.length; i += 1) {
    const char = firstLine[i];
    if (char === '"') {
      if (inQuotes && firstLine[i + 1] === '"') i += 1;
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

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    const next = normalized[i + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === sep && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell.length || row.length) {
    row.push(cell.trim());
    if (row.some(Boolean)) rows.push(row);
  }
  return rows;
}

export function rowsToObjects(rows: string[][]): Array<Record<string, string>> {
  const headers = rows[0] ?? [];
  return rows.slice(1).map((row) => Object.fromEntries(headers.map((header, i) => [header || `column_${i + 1}`, row[i] ?? ''])));
}
