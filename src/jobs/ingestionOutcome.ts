/** Backfill must never turn a failed endpoint run into a successful job. */
export function assertIngestionSucceeded(summary: { endpoints: number; success: number; failed: number }): void {
  if (summary.endpoints === 0 || summary.failed > 0 || summary.success !== summary.endpoints) {
    throw new Error(`Ingestion incomplete: endpoints=${summary.endpoints}, success=${summary.success}, failed=${summary.failed}`);
  }
}
