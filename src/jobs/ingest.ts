import { Buffer } from 'node:buffer';
import { fetchWithRetry } from '../http/fetcher.js';
import { archiveRaw } from '../archive/rawStore.js';
import { discoverLinks, parseHtmlTables } from '../parsers/html.js';
import { parseDelimited, rowsToObjects } from '../parsers/csv.js';
import { parseWorkbook } from '../parsers/xlsx.js';
import { validateRows } from '../quality/validate.js';
import { listEndpoints, type SourceEndpoint } from '../config/registry.js';
import { logger } from '../config/logger.js';
import { pool, withTransaction } from '../db/pool.js';
import { finishRun, startRun, upsertEndpoint } from './runStore.js';

function contentType(headers: Record<string, string>): string {
  return headers['content-type']?.toLowerCase() ?? 'application/octet-stream';
}

async function saveArtifact(endpoint: SourceEndpoint, result: Awaited<ReturnType<typeof fetchWithRetry>>, parentArtifactId?: string): Promise<string> {
  const archived = await archiveRaw({
    marketCode: endpoint.marketCode,
    endpointId: endpoint.id,
    sourceUrl: result.url,
    fetchedAt: result.fetchedAt,
    body: result.body,
    contentType: contentType(result.headers),
  });
  const db = await pool.query<{ raw_artifact_id: string }>(
    `INSERT INTO source.raw_artifacts(endpoint_code, parent_artifact_id, source_url, final_url, fetched_at,
      http_status, content_type, etag, last_modified, sha256, byte_size, archive_path, response_headers)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb)
     ON CONFLICT(endpoint_code, sha256) DO UPDATE SET last_seen_at=now()
     RETURNING raw_artifact_id`,
    [endpoint.id, parentArtifactId ?? null, endpoint.url, result.url, result.fetchedAt, result.status,
      contentType(result.headers), result.headers.etag ?? null, result.headers['last-modified'] ?? null,
      archived.sha256, archived.byteSize, archived.relativePath, JSON.stringify(result.headers)],
  );
  return db.rows[0]!.raw_artifact_id;
}

async function persistRows(endpoint: SourceEndpoint, artifactId: string, sheetName: string | null, rows: Array<Record<string, unknown>>): Promise<void> {
  const quality = validateRows(rows);
  if (!rows.length) {
    await pool.query(
      `INSERT INTO quality.assessments(object_type, object_id, assessment_date, overall_score, quality_status, warnings)
       VALUES ('RAW_ARTIFACT',$1,current_date,$2,$3,$4::jsonb)`,
      [artifactId, quality.score, quality.status, JSON.stringify(quality.warnings)],
    );
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let index = 0; index < rows.length; index += 1) {
      await client.query(
        `INSERT INTO market.raw_records(raw_artifact_id, endpoint_code, market_code, data_family, sheet_name, row_number, payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
         ON CONFLICT(raw_artifact_id, sheet_name, row_number) DO UPDATE SET payload=EXCLUDED.payload`,
        [artifactId, endpoint.id, endpoint.marketCode, endpoint.dataFamily, sheetName, index + 1, JSON.stringify(rows[index])],
      );
    }
    await client.query(
      `INSERT INTO quality.assessments(object_type, object_id, assessment_date, coverage_score, overall_score, quality_status, warnings)
       VALUES ('RAW_ARTIFACT',$1,current_date,$2,$3,$4,$5::jsonb)`,
      [artifactId, rows.length ? 100 : 0, quality.score, quality.status, JSON.stringify(quality.warnings)],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function parseAndPersist(endpoint: SourceEndpoint, artifactId: string, body: Uint8Array, type: string): Promise<number> {
  if (type.includes('text/html')) {
    const html = Buffer.from(body).toString('utf8');
    const rows = parseHtmlTables(html);
    await persistRows(endpoint, artifactId, null, rows);
    return rows.length;
  }
  if (type.includes('csv') || type.includes('text/plain')) {
    const rows = rowsToObjects(parseDelimited(Buffer.from(body).toString('utf8')));
    await persistRows(endpoint, artifactId, null, rows);
    return rows.length;
  }
  if (type.includes('spreadsheet') || type.includes('excel')) {
    const sheets = parseWorkbook(body);
    for (const sheet of sheets) await persistRows(endpoint, artifactId, sheet.sheetName, sheet.rows);
    return sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0);
  }
  await persistRows(endpoint, artifactId, null, []);
  return 0;
}

async function ingestEndpoint(endpoint: SourceEndpoint, mode: 'ingest' | 'discover'): Promise<{ artifacts: number; rows: number; links: number }> {
  await withTransaction((client) => upsertEndpoint(client, endpoint));
  const page = await fetchWithRetry(endpoint.url);
  const pageArtifactId = await saveArtifact(endpoint, page);
  let rows = await parseAndPersist(endpoint, pageArtifactId, page.body, contentType(page.headers));
  let artifacts = 1;
  let linksCount = 0;

  const shouldDiscover = endpoint.collector.includes('LINK_INDEX') || endpoint.collector === 'HTML_TABLE_CSV' || mode === 'discover';
  if (shouldDiscover && contentType(page.headers).includes('html')) {
    const links = discoverLinks(Buffer.from(page.body).toString('utf8'), page.url)
      .filter((link) => link.extension || /csv|excel|xlsx|xls|pdf|histor|download|télécharg/i.test(`${link.label} ${link.url}`))
      .slice(0, 100);
    linksCount = links.length;
    for (const link of links) {
      try {
        const child = await fetchWithRetry(link.url);
        const childId = await saveArtifact({ ...endpoint, url: link.url }, child, pageArtifactId);
        artifacts += 1;
        rows += await parseAndPersist(endpoint, childId, child.body, contentType(child.headers));
      } catch (error) {
        logger.warn({ endpoint: endpoint.id, url: link.url, error }, 'Téléchargement lié impossible');
      }
    }
  }
  return { artifacts, rows, links: linksCount };
}

export async function runIngestion(input: { market?: string; family?: string; endpointCode?: string; mode?: 'ingest' | 'discover' } = {}): Promise<void> {
  const mode = input.mode ?? 'ingest';
  const endpoints = (await listEndpoints({ market: input.market, family: input.family }))
    .filter((endpoint) => !input.endpointCode || endpoint.id === input.endpointCode);
  const runId = await startRun({ jobType: mode.toUpperCase(), scope: input });
  const summary = { endpoints: endpoints.length, success: 0, failed: 0, artifacts: 0, rows: 0, links: 0 };
  try {
    for (const endpoint of endpoints) {
      try {
        const result = await ingestEndpoint(endpoint, mode);
        summary.success += 1;
        summary.artifacts += result.artifacts;
        summary.rows += result.rows;
        summary.links += result.links;
        logger.info({ endpoint: endpoint.id, ...result }, 'Source ingérée');
      } catch (error) {
        summary.failed += 1;
        logger.error({ endpoint: endpoint.id, error }, 'Échec de source');
      }
    }
    await finishRun(runId, summary.failed === 0 ? 'SUCCESS' : summary.success ? 'PARTIAL' : 'FAILED', summary);
  } catch (error) {
    await finishRun(runId, 'FAILED', summary, error);
    throw error;
  }
}
