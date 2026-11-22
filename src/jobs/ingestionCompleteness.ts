/** Fail closed: an archived response alone is not a successfully ingested financial observation. */
export function assertUsableIngestion(result: { rows: number; failedChildren: number }): void {
  if (!Number.isSafeInteger(result.rows) || result.rows <= 0 || !Number.isSafeInteger(result.failedChildren) || result.failedChildren !== 0) {
    throw new Error(`Ingestion incomplete: rows=${result.rows}, failedChildren=${result.failedChildren}`);
  }
}

/** An empty registry selection is not evidence of a successful collection. */
export function assertEndpointsSelected(count: number): void {
  if (!Number.isSafeInteger(count) || count <= 0) {
    throw new Error(`Ingestion has no selected endpoints: count=${count}`);
  }
}
