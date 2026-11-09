/** Backfill must never turn a failed endpoint run into a successful job. */
export function assertIngestionSucceeded(summary: { endpoints: number; success: number; failed: number }): void {
  if (summary.endpoints === 0 || summary.failed > 0 || summary.success !== summary.endpoints) {
    throw new Error(`Ingestion incomplete: endpoints=${summary.endpoints}, success=${summary.success}, failed=${summary.failed}`);
  }
}

/** A discovery-only URL is not an implemented, licensed data adapter. */
export function assertCollectorImplemented(endpoint: { id: string; collector: string }): void {
  if (endpoint.collector === 'MANUAL_API_DISCOVERY') {
    throw new Error(`BLOCKED_ADAPTER: ${endpoint.id} requires an authorized API contract and parser`);
  }
}
