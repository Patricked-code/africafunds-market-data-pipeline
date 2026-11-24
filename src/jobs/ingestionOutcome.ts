/** Counters must represent a consistent, non-empty set of attempted endpoints. */
function validIngestionCounters(summary: { endpoints: number; success: number; failed: number }): boolean {
  const { endpoints, success, failed } = summary;
  return [endpoints, success, failed].every(Number.isSafeInteger)
    && endpoints > 0 && success >= 0 && failed >= 0
    && success + failed <= endpoints;
}

/** Backfill must never turn a failed endpoint run into a successful job. */
export function assertIngestionSucceeded(summary: { endpoints: number; success: number; failed: number }): void {
  if (!validIngestionCounters(summary) || summary.failed > 0 || summary.success !== summary.endpoints) {
    throw new Error(`Ingestion incomplete: endpoints=${summary.endpoints}, success=${summary.success}, failed=${summary.failed}`);
  }
}

/** A discovery-only URL is not an implemented, licensed data adapter. */
export function assertCollectorImplemented(endpoint: { id: string; collector: string }): void {
  if (endpoint.collector === 'MANUAL_API_DISCOVERY') {
    throw new Error(`BLOCKED_ADAPTER: ${endpoint.id} requires an authorized API contract and parser`);
  }
}

/** An empty selection is not a successful ingestion, even without endpoint errors. */
export function ingestionRunStatus(summary: { endpoints: number; success: number; failed: number }): 'SUCCESS' | 'PARTIAL' | 'FAILED' {
  if (!validIngestionCounters(summary)) return 'FAILED';
  if (summary.failed > 0) return summary.success > 0 ? 'PARTIAL' : 'FAILED';
  return summary.success === summary.endpoints ? 'SUCCESS' : 'FAILED';
}

/** Archiving an HTTP response without structured rows is not successful financial ingestion. */
export function assertStructuredIngestionRows(rows: number, mode: 'ingest' | 'discover'): void {
  if (mode === 'ingest' && (!Number.isSafeInteger(rows) || rows <= 0)) {
    throw new Error(`NO_STRUCTURED_ROWS: financial ingestion extracted ${rows} rows`);
  }
}

/**
 * Collection may succeed even when it has not yielded usable financial rows.
 * Keep the actually archived artifacts and discovered links in the run audit
 * BEFORE rejecting the endpoint as a financial ingestion success.
 * This is intentionally non-transactional with persisted raw archives.
 */
export function accountForEndpointResult(
  summary: { success: number; artifacts: number; rows: number; links: number },
  result: { artifacts: number; rows: number; links: number },
  mode: 'ingest' | 'discover',
): void {
  summary.artifacts += result.artifacts;
  summary.rows += result.rows;
  summary.links += result.links;
  assertStructuredIngestionRows(result.rows, mode);
  summary.success += 1;
}
