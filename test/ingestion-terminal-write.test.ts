import test from 'node:test';
import assert from 'node:assert/strict';
import { writeTerminalOnce } from '../src/jobs/terminalWrite.js';

test('terminal persistence failure is propagated without retry', async () => {
  let attempts = 0;
  const failure = new Error('injected finishRun PostgreSQL failure');
  await assert.rejects(
    writeTerminalOnce(async () => { attempts += 1; throw failure; }),
    (error) => error === failure,
  );
  assert.equal(attempts, 1);
});

test('successful terminal persistence is invoked once and returns its result', async () => {
  let attempts = 0;
  const result = await writeTerminalOnce(async () => { attempts += 1; return 'persisted'; });
  assert.equal(result, 'persisted');
  assert.equal(attempts, 1);
});
