import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pool } from '../../src/db/pool.js';
import { startRun, finishRun } from '../../src/jobs/runStore.js';

test('terminal run persistence is fenced and cannot overwrite a completed run', async () => {
  assert.ok(process.env.DATABASE_URL, 'DATABASE_URL must point to an isolated test database');
  const runId = await startRun({ jobType: 'INGEST', scope: { test: 'terminal-fencing' } });
  try {
    await finishRun(runId, 'SUCCESS', { endpoints: 1, success: 1, failed: 0 });
    await assert.rejects(
      finishRun(runId, 'FAILED', { endpoints: 1, success: 0, failed: 1 }),
      /TERMINAL_WRITE_CONFLICT/,
    );
    const result = await pool.query<{ status: string; summary: { success: number } }>(
      'SELECT status, summary FROM ops.ingestion_runs WHERE ingestion_run_id=$1',
      [runId],
    );
    assert.equal(result.rows[0]?.status, 'SUCCESS');
    assert.equal(result.rows[0]?.summary.success, 1);
    await assert.rejects(
      finishRun(randomUUID(), 'SUCCESS', { endpoints: 1, success: 1, failed: 0 }),
      /TERMINAL_WRITE_CONFLICT/,
    );
  } finally {
    await pool.query('DELETE FROM ops.ingestion_runs WHERE ingestion_run_id=$1', [runId]);
  }
});
