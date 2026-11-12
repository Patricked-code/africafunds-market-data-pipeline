export interface QualityResult {
  status: 'VALID' | 'PROVISIONAL' | 'REJECTED';
  score: number;
  warnings: string[];
}

export function validateRows(rows: Array<Record<string, unknown>>): QualityResult {
  const warnings: string[] = [];
  if (rows.length === 0) warnings.push('Aucune ligne structurée extraite');
  const populated = rows.filter((row) =>
    Object.values(row).some((value) =>
      value !== null &&
      value !== undefined &&
      (typeof value !== 'string' || value.trim().length > 0) &&
      (typeof value !== 'number' || Number.isFinite(value)) &&
      (!(value instanceof Date) || Number.isFinite(value.getTime())) &&
      (!(value instanceof Map) || value.size > 0) &&
      (!(value instanceof Set) || value.size > 0) &&
      (!Array.isArray(value) || value.length > 0) &&
      (typeof value !== 'object' || Array.isArray(value) || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) || Object.keys(value).length > 0),
    ),
  ).length;
  const coverage = rows.length ? populated / rows.length : 0;
  const score = Math.round(Math.max(0, Math.min(100, coverage * 80 + (rows.length ? 20 : 0))));
  return {
    status: rows.length === 0 ? 'PROVISIONAL' : score >= 80 ? 'VALID' : 'PROVISIONAL',
    score,
    warnings,
  };
}
