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
  // PostgreSQL DATE has no year zero; never admit ISO 0000 as a financial date.
  if (value.startsWith('0000-')) return false;
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
  try {
    // Financial fields must be supplied by the candidate itself, never inherited
    // from an adapter-controlled prototype. This also rejects forged provenance.
    const requiredFields = ['sourceEndpointCode', 'rawArtifactId', 'unit', 'methodVersion',
      'economicDate', 'publicationDate', 'observedValue'] as const;
    if (!requiredFields.every((field) => Object.prototype.hasOwnProperty.call(candidate, field))) {
      return { admissible: false, reasons: ['INVALID_CANDIDATE'] };
    }
    // Snapshot each untrusted field exactly once. Accessors may return different
    // values on successive reads, otherwise bypassing date-order validation.
    const { sourceEndpointCode, rawArtifactId, unit, methodVersion,
      economicDate, publicationDate, observedValue } = candidate;
    const fields = { sourceEndpointCode, rawArtifactId, unit, methodVersion };
    for (const field of ['sourceEndpointCode', 'rawArtifactId', 'unit', 'methodVersion'] as const) {
      const value = fields[field];
      if (typeof value !== 'string' || !value.trim()) {
        reasons.push('MISSING_' + field.toUpperCase());
      }
    }
    const economicDateValid = validCalendarDate(economicDate);
    const publicationDateValid = validCalendarDate(publicationDate);
    if (!economicDateValid) reasons.push('INVALID_ECONOMIC_DATE');
    if (!publicationDateValid) reasons.push('INVALID_PUBLICATION_DATE');
    if (economicDateValid && publicationDateValid && publicationDate < economicDate) {
      reasons.push('PUBLICATION_BEFORE_ECONOMIC_DATE');
    }
    if (typeof observedValue !== 'number' || !Number.isFinite(observedValue)) {
      reasons.push('NON_FINITE_VALUE');
    }
    return { admissible: reasons.length === 0, reasons };
  } catch {
    // Untrusted adapters may supply getters or proxies that throw on property access.
    // Never let a malformed envelope crash the ingestion boundary.
    return { admissible: false, reasons: ['INVALID_CANDIDATE'] };
  }
}
