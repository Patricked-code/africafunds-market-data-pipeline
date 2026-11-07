/**
 * Explicit historical backfill capability boundary (SadiaAF lot 4).
 *
 * The existing generic ingest/discover path does not accept date windows.
 * It must NEVER be reused to mark a requested historical range SUCCESS.
 * Historical adapters are registered only after official contract, rights,
 * date mapping, source evidence and fixture tests are documented.
 * No such adapter is currently implemented/qualified.
 */
export interface HistoricalWindow {
  endpointCode: string;
  from: string;
  to: string;
}

export interface HistoricalWindowEvidence {
  endpointCode: string;
  from: string;
  to: string;
  sourceEvidenceReferences: string[];
  observedRecords: number;
  coverageVerified: boolean;
}

export interface HistoricalWindowAdapter {
  readonly endpointCode: string;
  ingestWindow(window: HistoricalWindow): Promise<HistoricalWindowEvidence>;
}

// Deliberately empty until actual date-bounded official adapters have passed
// fixture, rights, no-look-ahead and data-coverage tests. No silent fallback.
const qualifiedAdapters: ReadonlyMap<string, HistoricalWindowAdapter> = new Map();

export function findHistoricalWindowAdapter(endpointCode: string): HistoricalWindowAdapter | undefined {
  return qualifiedAdapters.get(endpointCode);
}

/**
 * Required before declaring a backfill window SUCCESS. An adapter must provide
 * explicit auditable evidence about the exact requested range.
 */
export function assertHistoricalWindowEvidence(
  expected: HistoricalWindow,
  evidence: HistoricalWindowEvidence,
): void {
  if (evidence.endpointCode !== expected.endpointCode ||
      evidence.from !== expected.from ||
      evidence.to !== expected.to) {
    throw new Error('Historical window evidence does not match the claimed endpoint and dates');
  }
  if (evidence.coverageVerified !== true || !Number.isSafeInteger(evidence.observedRecords) ||
      evidence.observedRecords < 1 ||
      !Array.isArray(evidence.sourceEvidenceReferences) ||
      !evidence.sourceEvidenceReferences.some((ref) => typeof ref === 'string' && ref.trim().length > 0)) {
    throw new Error('Missing verified historical coverage or reproducible source evidence');
  }
}
