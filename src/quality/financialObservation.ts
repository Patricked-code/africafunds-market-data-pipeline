/**
 * Issue #15 — pre-normalization gate for a typed financial observation.
 * This does not infer financial meaning from generic JSONB extraction.
 * Callers must supply explicit source/field mappings before publication.
 */
export interface FinancialObservationCandidate {
  sourceEndpointCode: string;
  rawArtifactId: string;
  economicDate: string;
  publicationDate: string;
  observedValue: number;
  unit: string;
  methodVersion: string;
}

function validCalendarDate(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00.000Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateFinancialObservationCandidate(
  candidate: FinancialObservationCandidate | null | undefined,
): { admissible: boolean; reasons: string[] } {
  const reasons: string[] = [];
  // Runtime inputs can bypass TypeScript (JSON, external adapters). Fail closed.
  if (candidate === null || candidate === undefined || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return { admissible: false, reasons: ['INVALID_CANDIDATE'] };
  }
  for (const field of ['sourceEndpointCode', 'rawArtifactId', 'unit', 'methodVersion'] as const) {
    if (typeof candidate[field] !== 'string' || !candidate[field].trim()) {
      reasons.push('MISSING_' + field.toUpperCase());
    }
  }
  if (!validCalendarDate(candidate.economicDate)) reasons.push('INVALID_ECONOMIC_DATE');
  if (!validCalendarDate(candidate.publicationDate)) reasons.push('INVALID_PUBLICATION_DATE');
  if (validCalendarDate(candidate.economicDate) && validCalendarDate(candidate.publicationDate)
      && candidate.publicationDate < candidate.economicDate) {
    reasons.push('PUBLICATION_BEFORE_ECONOMIC_DATE');
  }
  if (typeof candidate.observedValue !== 'number' || !Number.isFinite(candidate.observedValue)) {
    reasons.push('NON_FINITE_VALUE');
  }
  return { admissible: reasons.length === 0, reasons };
}
