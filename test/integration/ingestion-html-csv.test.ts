import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Integration test: actual ingestion code and isolated PostgreSQL; no outbound HTTP.
test('HTML index -> CSV child -> SHA archive -> PostgreSQL -> SUCCESS; failed child -> FAILED', async () => {
  assert.ok(process.env.DATABASE_URL, 'DATABASE_URL must be an isolated integration database');
  const root = await mkdtemp(join(tmpdir(), 'sadia-ingest-'));
  const registryPath = join(root, 'registry.json');
  const endpointCode = 'ci-html-csv-' + randomUUID();
  const indexUrl = 'https://fixtures.invalid/' + endpointCode + '/';
  const childUrl = indexUrl + 'rates.csv';
  const failingEndpointCode = 'ci-html-csv-failing-' + randomUUID();
  const failingIndexUrl = 'https://fixtures.invalid/' + failingEndpointCode + '/';
  const html = '<html><body><a href="rates.csv">Historical rates</a></body></html>';
  const csv = 'date;rate\n2026-01-02;4.25\n2026-01-03;4.50\n';
  const originalFetch = globalThis.fetch;
  const previousRegistry = process.env.SOURCE_REGISTRY_PATH;
  const previousArchive = process.env.RAW_ARCHIVE_DIR;
  const previousRetries = process.env.HTTP_MAX_RETRIES;
  process.env.SOURCE_REGISTRY_PATH = registryPath;
  process.env.RAW_ARCHIVE_DIR = join(root, 'archive');
  process.env.HTTP_MAX_RETRIES = '0';
  let pool: typeof import('../../src/db/pool.js').pool | undefined;
  let mixedRunId: string | undefined;
  try {
    await writeFile(registryPath, JSON.stringify({
      version: 'ci', generatedAt: '2026-11-22', defaultPolicies: {},
      markets: [{
        code: 'MAR', name: 'Synthetic CI', currency: 'MAD', allShareIndex: null,
        institutions: {},
        endpoints: [{ id: endpointCode, label: 'Synthetic HTML CSV', url: indexUrl,
          dataFamily: 'MONEY_MARKET_RATE', collector: 'HTML_LINK_INDEX',
          frequency: 'DAILY', enabled: true },
          { id: failingEndpointCode, label: 'Synthetic failing endpoint', url: failingIndexUrl,
            dataFamily: 'MONEY_MARKET_RATE', collector: 'HTML_LINK_INDEX',
            frequency: 'DAILY', enabled: true }],
      }],
    }));
    const db = await import('../../src/db/pool.js');
    pool = db.pool;
    const { runIngestion } = await import('../../src/jobs/ingest.js');
    let failChild = false;
    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url === failingIndexUrl) return new Response('unavailable', { status: 404 });
      if (url !== indexUrl && url !== childUrl) throw new Error('Unexpected outbound URL: ' + url);
      const response = url === childUrl && failChild
        ? new Response('unavailable', { status: 404 })
        : new Response(url === indexUrl ? html : csv, {
            status: 200,
            headers: { 'content-type': url === indexUrl ? 'text/html' : 'text/csv' },
          });
      Object.defineProperty(response, 'url', { value: url });
      return response;
    };
    await runIngestion({ endpointCode, failOnEndpointError: true });
    const runs = await pool.query<{ status: string; summary: { rows: number; success: number } }>(
      "SELECT status, summary, error_message FROM ops.ingestion_runs WHERE scope->>'endpointCode'=$1 ORDER BY started_at DESC",
      [endpointCode],
    );
    assert.equal(runs.rows[0]?.status, 'SUCCESS');
    assert.equal(runs.rows[0]?.summary.rows, 2);
    assert.equal(runs.rows[0]?.summary.success, 1);
    const artifacts = await pool.query<{ raw_artifact_id: string; sha256: string; archive_path: string; parent_artifact_id: string | null }>(
      'SELECT raw_artifact_id, sha256, archive_path, parent_artifact_id FROM source.raw_artifacts WHERE endpoint_code=$1',
      [endpointCode],
    );
    assert.equal(artifacts.rowCount, 2);
    const child = artifacts.rows.find((row) => row.parent_artifact_id !== null);
    assert.ok(child);
    assert.equal(child.sha256.trim(), createHash('sha256').update(csv).digest('hex'));
    assert.equal((await readFile(join(process.env.RAW_ARCHIVE_DIR!, child.archive_path))).toString(), csv);
    const persisted = await pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM market.raw_records WHERE endpoint_code=$1', [endpointCode],
    );
    assert.equal(persisted.rows[0]?.count, '2');

    failChild = true;
    await assert.rejects(runIngestion({ endpointCode, failOnEndpointError: true }));
    const failed = await pool.query<{ status: string; summary: { failed: number }; error_message: string | null }>(
      "SELECT status, summary, error_message FROM ops.ingestion_runs WHERE scope->>'endpointCode'=$1 ORDER BY started_at DESC",
      [endpointCode],
    );
    assert.equal(failed.rows[0]?.status, 'FAILED');
    assert.equal(failed.rows[0]?.summary.failed, 1);
    // An expected strict-mode rejection must not finalize an already FAILED run twice.
    assert.equal(failed.rows[0]?.error_message, null);
    // A rejected child must not erase or duplicate previously committed observations.
    const retained = await pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM market.raw_records WHERE endpoint_code=$1',
      [endpointCode],
    );
    assert.equal(retained.rows[0]?.count, '2');
    const retainedArtifacts = await pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM source.raw_artifacts WHERE endpoint_code=$1',
      [endpointCode],
    );
    assert.equal(retainedArtifacts.rows[0]?.count, '2');
    // A subsequent healthy retry must recover without duplicating raw data or archives.
    failChild = false;
    await runIngestion({ endpointCode, failOnEndpointError: true });
    const recovered = await pool.query<{ status: string; summary: { rows: number; success: number } }>(
      "SELECT status, summary FROM ops.ingestion_runs WHERE scope->>'endpointCode'=$1 ORDER BY started_at DESC",
      [endpointCode],
    );
    assert.equal(recovered.rows[0]?.status, 'SUCCESS');
    assert.equal(recovered.rows[0]?.summary.rows, 2);
    const afterRecovery = await pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM market.raw_records WHERE endpoint_code=$1',
      [endpointCode],
    );
    assert.equal(afterRecovery.rows[0]?.count, '2');
    const artifactsAfterRecovery = await pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM source.raw_artifacts WHERE endpoint_code=$1',
      [endpointCode],
    );
    assert.equal(artifactsAfterRecovery.rows[0]?.count, '2');
    // Recovery must not rewrite the failed attempt into a false SUCCESS.
    const history = await pool.query<{ status: string; count: string }>(
      "SELECT status, count(*)::text AS count FROM ops.ingestion_runs WHERE scope->>'endpointCode'=$1 GROUP BY status",
      [endpointCode],
    );
    const counts = new Map(history.rows.map(({ status, count }) => [status, Number(count)]));
    assert.equal(counts.get('SUCCESS'), 2);
    assert.equal(counts.get('FAILED'), 1);
    assert.equal(history.rows.reduce((total, row) => total + Number(row.count), 0), 3);

    // Mixed endpoint outcomes must remain PARTIAL even when strict mode rejects.
    await assert.rejects(runIngestion({ market: 'MAR', failOnEndpointError: true }));
    const mixed = await pool.query<{
      ingestion_run_id: string;
      status: string;
      summary: { endpoints: number; success: number; failed: number };
      error_message: string | null;
    }>(
      "SELECT ingestion_run_id, status, summary, error_message FROM ops.ingestion_runs WHERE scope->>'market'='MAR' ORDER BY started_at DESC LIMIT 1",
    );
    mixedRunId = mixed.rows[0]?.ingestion_run_id;
    assert.equal(mixed.rows[0]?.status, 'PARTIAL');
    assert.equal(mixed.rows[0]?.summary.endpoints, 2);
    assert.equal(mixed.rows[0]?.summary.success, 1);
    assert.equal(mixed.rows[0]?.summary.failed, 1);
    assert.equal(mixed.rows[0]?.error_message, null);
    // A rejected sibling endpoint must not create successful raw data or artifacts.
    const rejectedArtifacts = await pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM source.raw_artifacts WHERE endpoint_code=$1',
      [failingEndpointCode],
    );
    assert.equal(rejectedArtifacts.rows[0]?.count, '0');
    const rejectedRows = await pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM market.raw_records WHERE endpoint_code=$1',
      [failingEndpointCode],
    );
    assert.equal(rejectedRows.rows[0]?.count, '0');
    const survivingRows = await pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM market.raw_records WHERE endpoint_code=$1',
      [endpointCode],
    );
    assert.equal(survivingRows.rows[0]?.count, '2');
    // A repeated mixed run must not turn the failed sibling into a false success
    // or duplicate observations already committed by the healthy sibling.
    await assert.rejects(runIngestion({ market: 'MAR', failOnEndpointError: true }));
    const repeatedMixed = await pool.query<{
      ingestion_run_id: string;
      status: string;
      summary: { endpoints: number; success: number; failed: number };
    }>(
      "SELECT ingestion_run_id, status, summary FROM ops.ingestion_runs WHERE scope->>'market'='MAR' ORDER BY started_at DESC LIMIT 1",
    );
    assert.equal(repeatedMixed.rows[0]?.status, 'PARTIAL');
    assert.equal(repeatedMixed.rows[0]?.summary.endpoints, 2);
    assert.equal(repeatedMixed.rows[0]?.summary.success, 1);
    assert.equal(repeatedMixed.rows[0]?.summary.failed, 1);
    const repeatedRows = await pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM market.raw_records WHERE endpoint_code=$1',
      [endpointCode],
    );
    assert.equal(repeatedRows.rows[0]?.count, '2');
    const repeatedRejectedRows = await pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM market.raw_records WHERE endpoint_code=$1',
      [failingEndpointCode],
    );
    assert.equal(repeatedRejectedRows.rows[0]?.count, '0');
    if (repeatedMixed.rows[0]?.ingestion_run_id) {
      await pool.query('DELETE FROM ops.ingestion_runs WHERE ingestion_run_id=$1', [repeatedMixed.rows[0].ingestion_run_id]);
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (pool) {
      // Only synthetic records with a unique endpoint code, in the isolated CI database.
      await pool.query("DELETE FROM ops.ingestion_runs WHERE scope->>'endpointCode'=$1", [endpointCode]);
      if (mixedRunId) await pool.query('DELETE FROM ops.ingestion_runs WHERE ingestion_run_id=$1', [mixedRunId]);
      await pool.query(
        'DELETE FROM quality.assessments WHERE object_type=$1 AND object_id IN (SELECT raw_artifact_id FROM source.raw_artifacts WHERE endpoint_code=$2)',
        ['RAW_ARTIFACT', endpointCode],
      );
      await pool.query('DELETE FROM market.raw_records WHERE endpoint_code=$1', [endpointCode]);
      await pool.query('DELETE FROM source.raw_artifacts WHERE endpoint_code=$1 AND parent_artifact_id IS NOT NULL', [endpointCode]);
      await pool.query('DELETE FROM source.raw_artifacts WHERE endpoint_code=$1', [endpointCode]);
      await pool.query('DELETE FROM source.source_endpoints WHERE endpoint_code=$1', [endpointCode]);
      await pool.query('DELETE FROM source.source_endpoints WHERE endpoint_code=$1', [failingEndpointCode]);
    }
    if (previousRegistry === undefined) delete process.env.SOURCE_REGISTRY_PATH;
    else process.env.SOURCE_REGISTRY_PATH = previousRegistry;
    if (previousArchive === undefined) delete process.env.RAW_ARCHIVE_DIR;
    else process.env.RAW_ARCHIVE_DIR = previousArchive;
    if (previousRetries === undefined) delete process.env.HTTP_MAX_RETRIES;
    else process.env.HTTP_MAX_RETRIES = previousRetries;
    await rm(root, { recursive: true, force: true });
  }
});
