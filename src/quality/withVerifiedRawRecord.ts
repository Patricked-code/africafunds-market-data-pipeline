import type pg from 'pg';
import { assertRawRecordProvenance } from './rawRecordProvenance.js';

/**
 * Issue #15: transaction boundary for a future, explicitly authorized canonical writer.
 * This helper does not choose a financial mapping, insert observations or commit.
 * The caller must supply an already-open transaction and its client; both the
 * provenance check and any permitted write run on that SAME client.
 * A failed check prevents invoking the writer callback.
 */
export async function withVerifiedRawRecord<T>(
  client: Pick<pg.Client, 'query'>,
  references: { rawRecordId: string; endpointCode: string; artifactId: string },
  write: (client: Pick<pg.Client, 'query'>) => Promise<T>,
): Promise<T> {
  await assertRawRecordProvenance(
    client,
    references.rawRecordId,
    references.endpointCode,
    references.artifactId,
  );
  return write(client);
}
