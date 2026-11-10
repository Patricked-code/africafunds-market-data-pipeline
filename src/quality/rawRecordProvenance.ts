import type pg from 'pg';

/**
 * Issue #15: fail-closed provenance admission for an existing raw record.
 * The registry is authoritative for endpoint, market and data family.
 * This guard performs no writes and does not infer an official financial mapping.
 * Call before any canonical observation INSERT, using the same transaction/client.
 */
export async function assertRawRecordProvenance(
  client: Pick<pg.Client, 'query'>,
  rawRecordId: string,
  expectedEndpointCode: string,
  expectedArtifactId: string,
): Promise<void> {
  if (!rawRecordId || !expectedEndpointCode || !expectedArtifactId) {
    throw new Error('PROVENANCE_MISSING_REFERENCE');
  }
  // Untrusted adapter inputs must fail closed before PostgreSQL UUID casts.
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(rawRecordId) || !uuid.test(expectedArtifactId)) {
    throw new Error('PROVENANCE_INVALID_REFERENCE');
  }
  const result = await client.query<{ admissible: boolean }>(
    `SELECT (r.endpoint_code = a.endpoint_code
                 AND r.market_code = e.market_code
                 AND r.data_family = e.data_family
                 AND r.endpoint_code = $2
                 AND r.raw_artifact_id = $3::uuid) AS admissible
       FROM market.raw_records r
       JOIN source.raw_artifacts a ON a.raw_artifact_id = r.raw_artifact_id
       JOIN source.source_endpoints e ON e.endpoint_code = a.endpoint_code
      WHERE r.raw_record_id = $1::uuid`,
    [rawRecordId, expectedEndpointCode, expectedArtifactId],
  );
  if (result.rowCount !== 1 || result.rows[0]?.admissible !== true) {
    throw new Error('PROVENANCE_MISMATCH');
  }
}
