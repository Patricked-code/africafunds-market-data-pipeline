/** Fail closed: an archived response alone is not a successfully ingested financial observation. */
export function assertUsableIngestion(result: { rows: number; failedChildren: number }): void {
  if (!Number.isSafeInteger(result.rows) || result.rows <= 0 || !Number.isSafeInteger(result.failedChildren) || result.failedChildren !== 0) {
    throw new Error(`Ingestion incomplete: rows=${result.rows}, failedChildren=${result.failedChildren}`);
  }
}
