import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { env } from '../config/env.js';
import { sha256 } from '../utils/hash.js';

export interface ArchivedArtifact {
  sha256: string;
  relativePath: string;
  byteSize: number;
}

function extensionFromContentType(contentType?: string): string {
  if (!contentType) return '.bin';
  if (contentType.includes('text/html')) return '.html';
  if (contentType.includes('text/csv')) return '.csv';
  if (contentType.includes('application/json')) return '.json';
  if (contentType.includes('spreadsheetml')) return '.xlsx';
  if (contentType.includes('application/vnd.ms-excel')) return '.xls';
  if (contentType.includes('application/pdf')) return '.pdf';
  return '.bin';
}

export async function archiveRaw(input: {
  marketCode: string;
  endpointId: string;
  sourceUrl: string;
  fetchedAt: string;
  body: Uint8Array;
  contentType?: string;
}): Promise<ArchivedArtifact> {
  const digest = sha256(input.body);
  const date = input.fetchedAt.slice(0, 10);
  const pathExt = extname(new URL(input.sourceUrl).pathname);
  const extension = pathExt && pathExt.length <= 8 ? pathExt : extensionFromContentType(input.contentType);
  const relativePath = join(input.marketCode, input.endpointId, date, `${digest}${extension}`);
  const fullPath = join(env.RAW_ARCHIVE_DIR, relativePath);
  await mkdir(join(env.RAW_ARCHIVE_DIR, input.marketCode, input.endpointId, date), { recursive: true });
  await writeFile(fullPath, input.body);
  return { sha256: digest, relativePath, byteSize: input.body.byteLength };
}
