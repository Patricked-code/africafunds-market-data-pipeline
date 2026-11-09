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

test('concurrent terminal writes admit exactly one winner and preserve its summary', async () => {
  assert.ok(process.env.DATABASE_URL, 'DATABASE_URL must point to an isolated test database');
  const runId = await startRun({ jobType: 'INGEST', scope: { test: 'concurrent-terminal-fencing' } });
  try {
    const outcomes = await Promise.allSettled([
      finishRun(runId, 'SUCCESS', { writer: 'success' }),
      finishRun(runId, 'FAILED', { writer: 'failed' }),
    ]);
    const fulfilled = outcomes.filter((outcome) => outcome.status === 'fulfilled');
    const rejected = outcomes.filter((outcome) => outcome.status === 'rejected');
    assert.equal(fulfilled.length, 1, 'only one concurrent writer may finalize a RUNNING row');
    assert.equal(rejected.length, 1, 'the losing writer must be rejected');
    assert.match(String((rejected[0] as PromiseRejectedResult).reason), /TERMINAL_WRITE_CONFLICT/);

    const persisted = await pool.query<{ status: string; summary: { writer: string } }>(
      'SELECT status, summary FROM ops.ingestion_runs WHERE ingestion_run_id=$1',
      [runId],
    );
    assert.equal(persisted.rowCount, 1);
    const expectedStatus = outcomes[0]?.status === 'fulfilled' ? 'SUCCESS' : 'FAILED';
    assert.equal(persisted.rows[0]?.status, expectedStatus);
    assert.equal(persisted.rows[0]?.summary.writer, expectedStatus === 'SUCCESS' ? 'success' : 'failed');
  } finally {
    await pool.query('DELETE FROM ops.ingestion_runs WHERE ingestion_run_id=$1', [runId]);
  }
});


test('a serialization failure cannot finalize a run and permits a later valid finalization', async () => {
  assert.ok(process.env.DATABASE_URL, 'DATABASE_URL must point to an isolated test database');
  const runId = await startRun({ jobType: 'INGEST', scope: { test: 'terminal-serialization-rejection' } });
  try {
    // JSON.stringify rejects BigInt before the UPDATE can be sent to PostgreSQL.
    // This verifies fail-closed behavior, not a PostgreSQL constraint or network outage.
    await assert.rejects(
      finishRun(runId, 'SUCCESS', { writer: BigInt(1) }),
      /BigInt|serialize/i,
    );
    const afterRejection = await pool.query<{ status: string; finished_at: Date | null; summary: unknown }>(
      'SELECT status, finished_at, summary FROM ops.ingestion_runs WHERE ingestion_run_id=$1',
      [runId],
    );
    assert.equal(afterRejection.rows[0]?.status, 'RUNNING');
    assert.equal(afterRejection.rows[0]?.finished_at, null);
    assert.deepEqual(afterRejection.rows[0]?.summary, {}, 'RUNNING row retains its initial empty JSONB summary');

    await finishRun(runId, 'FAILED', { writer: 'recovery' });
    const afterRecovery = await pool.query<{ status: string; summary: { writer: string } }>(
      'SELECT status, summary FROM ops.ingestion_runs WHERE ingestion_run_id=$1',
      [runId],
    );
    assert.equal(afterRecovery.rows[0]?.status, 'FAILED');
    assert.equal(afterRecovery.rows[0]?.summary.writer, 'recovery');
  } finally {
    await pool.query('DELETE FROM ops.ingestion_runs WHERE ingestion_run_id=$1', [runId]);
  }
});


test('invalid terminal status is rejected before SQL and leaves RUNNING row intact', async () => {
  assert.ok(process.env.DATABASE_URL, 'DATABASE_URL must point to an isolated test database');
  const runId = await startRun({ jobType: 'INGEST', scope: { test: 'invalid-terminal-status' } });
  try {
    await assert.rejects(
      finishRun(runId, 'INVALID_TERMINAL_STATUS' as 'SUCCESS', { writer: 'invalid' }),
      /INVALID_TERMINAL_STATUS/,
    );
    const untouched = await pool.query<{ status: string; finished_at: Date | null; summary: unknown }>(
      'SELECT status, finished_at, summary FROM ops.ingestion_runs WHERE ingestion_run_id=$1',
      [runId],
    );
    assert.equal(untouched.rows[0]?.status, 'RUNNING');
    assert.equal(untouched.rows[0]?.finished_at, null);
    assert.deepEqual(untouched.rows[0]?.summary, {});
    await finishRun(runId, 'FAILED', { writer: 'valid' });
    const persisted = await pool.query<{ status: string; summary: { writer: string } }>(
      'SELECT status, summary FROM ops.ingestion_runs WHERE ingestion_run_id=$1',
      [runId],
    );
    assert.equal(persisted.rows[0]?.status, 'FAILED');
    assert.equal(persisted.rows[0]?.summary.writer, 'valid');
  } finally {
    await pool.query('DELETE FROM ops.ingestion_runs WHERE ingestion_run_id=$1', [runId]);
  }
});


test('PostgreSQL rejects malformed run UUID without changing an unrelated RUNNING run', async () => {
  assert.ok(process.env.DATABASE_URL, 'DATABASE_URL must point to an isolated test database');
  const runId = await startRun({ jobType: 'INGEST', scope: { test: 'terminal-sql-rejection' } });
  try {
    // The malformed UUID reaches PostgreSQL as an UPDATE parameter and fails with SQLSTATE 22P02.
    // This is a deterministic SQL rejection, not a driver disconnect or server crash.
    await assert.rejects(
      finishRun('not-a-uuid', 'SUCCESS', { writer: 'invalid-uuid' }),
      (error: unknown) => {
        assert.equal((error as { code?: string }).code, '22P02');
        return true;
      },
    );
    const untouched = await pool.query<{ status: string; finished_at: Date | null; summary: unknown }>(
      'SELECT status, finished_at, summary FROM ops.ingestion_runs WHERE ingestion_run_id=$1',
      [runId],
    );
    assert.equal(untouched.rows[0]?.status, 'RUNNING');
    assert.equal(untouched.rows[0]?.finished_at, null);
    assert.deepEqual(untouched.rows[0]?.summary, {});

    await finishRun(runId, 'FAILED', { writer: 'recovered-after-sql-error' });
    const persisted = await pool.query<{ status: string; summary: { writer: string } }>(
      'SELECT status, summary FROM ops.ingestion_runs WHERE ingestion_run_id=$1',
      [runId],
    );
    assert.equal(persisted.rows[0]?.status, 'FAILED');
    assert.equal(persisted.rows[0]?.summary.writer, 'recovered-after-sql-error');
  } finally {
    await pool.query('DELETE FROM ops.ingestion_runs WHERE ingestion_run_id=$1', [runId]);
  }
});


test('PARTIAL terminal status persists its error and cannot be overwritten', async () => {
  assert.ok(process.env.DATABASE_URL, 'DATABASE_URL must point to an isolated test database');
  const runId = await startRun({ jobType: 'INGEST', scope: { test: 'partial-terminal-fencing' } });
  try {
    await finishRun(runId, 'PARTIAL', { endpoints: 2, success: 1, failed: 1 }, new Error('one endpoint failed'));
    const persisted = await pool.query<{ status: string; finished_at: Date | null; summary: { failed: number }; error_message: string | null }>(
      'SELECT status, finished_at, summary, error_message FROM ops.ingestion_runs WHERE ingestion_run_id=$1',
      [runId],
    );
    assert.equal(persisted.rows[0]?.status, 'PARTIAL');
    assert.ok(persisted.rows[0]?.finished_at, 'terminal timestamp must be persisted');
    assert.equal(persisted.rows[0]?.summary.failed, 1);
    assert.equal(persisted.rows[0]?.error_message, 'one endpoint failed');
    await assert.rejects(
      finishRun(runId, 'SUCCESS', { endpoints: 2, success: 2, failed: 0 }),
      /TERMINAL_WRITE_CONFLICT/,
    );
    const afterConflict = await pool.query<{ status: string; summary: { failed: number }; error_message: string | null }>(
      'SELECT status, summary, error_message FROM ops.ingestion_runs WHERE ingestion_run_id=$1',
      [runId],
    );
    assert.equal(afterConflict.rows[0]?.status, 'PARTIAL');
    assert.equal(afterConflict.rows[0]?.summary.failed, 1);
    assert.equal(afterConflict.rows[0]?.error_message, 'one endpoint failed');
  } finally {
    await pool.query('DELETE FROM ops.ingestion_runs WHERE ingestion_run_id=$1', [runId]);
  }
});


test('FAILED terminal status persists diagnostic and rejects a later PARTIAL overwrite', async () => {
  assert.ok(process.env.DATABASE_URL, 'DATABASE_URL must point to an isolated test database');
  const runId = await startRun({ jobType: 'INGEST', scope: { test: 'failed-terminal-diagnostic' } });
  try {
    await finishRun(runId, 'FAILED', { endpoints: 1, success: 0, failed: 1 }, new Error('collector unavailable'));
    const before = await pool.query<{ status: string; finished_at: Date | null; summary: { failed: number }; error_message: string | null }>(
      'SELECT status, finished_at, summary, error_message FROM ops.ingestion_runs WHERE ingestion_run_id=$1',
      [runId],
    );
    assert.equal(before.rows[0]?.status, 'FAILED');
    assert.ok(before.rows[0]?.finished_at);
    assert.equal(before.rows[0]?.summary.failed, 1);
    assert.equal(before.rows[0]?.error_message, 'collector unavailable');

    await assert.rejects(
      finishRun(runId, 'PARTIAL', { endpoints: 1, success: 1, failed: 0 }),
      /TERMINAL_WRITE_CONFLICT/,
    );
    const after = await pool.query<{ status: string; finished_at: Date | null; summary: { failed: number }; error_message: string | null }>(
      'SELECT status, finished_at, summary, error_message FROM ops.ingestion_runs WHERE ingestion_run_id=$1',
      [runId],
    );
    assert.deepEqual(after.rows[0], before.rows[0], 'failed terminal diagnostics must remain immutable');
  } finally {
    await pool.query('DELETE FROM ops.ingestion_runs WHERE ingestion_run_id=$1', [runId]);
  }
});
