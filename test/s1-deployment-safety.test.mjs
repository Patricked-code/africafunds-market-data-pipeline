import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('S1 deployment cannot cut over Plesk without explicit production and gate approval', async () => {
  const script = await read('deploy/s1/deploy.sh');
  assert.match(script, /SADIAAF_PRODUCTION_CUTOVER_APPROVED/);
  assert.match(script, /SADIAAF_PRODUCTION_GATES_ATTESTED/);
  assert.match(script, /exit 3/);
});

test('S1 releases keep one stable Docker project and hence one PostgreSQL named volume', async () => {
  const deploy = await read('deploy/s1/deploy.sh');
  const rollback = await read('deploy/s1/rollback.sh');
  const compose = await read('docker-compose.yml');
  assert.match(deploy, /export COMPOSE_PROJECT_NAME=/);
  assert.match(rollback, /export COMPOSE_PROJECT_NAME=/);
  assert.match(compose, /postgres_data:\/var\/lib\/postgresql\/data/);
  assert.doesNotMatch(deploy, /COMPOSE_PROJECT_NAME=.*RELEASE_ID/);
});

test('existing SadiaAF vhost contents are preserved in deploy and rollback', async () => {
  const deploy = await read('deploy/s1/deploy.sh');
  const rollback = await read('deploy/s1/rollback.sh');
  for (const [name, script] of [['deploy', deploy], ['rollback', rollback]]) {
    assert.doesNotMatch(script, /rm\s+-rf/, `${name} must not recursively delete vhost content`);
    assert.doesNotMatch(script, /find\s+"\$target"[^\n]*-exec\s+rm/, `${name} must not purge old vhost files`);
  }
  assert.match(deploy, /frontend-content\.tar\.gz/);
  assert.match(deploy, /api-content\.tar\.gz/);
});

test('unauthorized collection cannot start as part of deployment', async () => {
  const deploy = await read('deploy/s1/deploy.sh');
  const compose = await read('docker-compose.yml');
  const env = await read('.env.production.example');
  assert.match(deploy, /docker compose up -d api web/);
  assert.doesNotMatch(deploy, /docker compose up -d api collector web/);
  assert.match(compose, /collector:[\s\S]*?profiles:\s*\n\s+- collection/);
  assert.match(env, /^ENABLE_SCHEDULER=false$/m);
});

test('deployment keeps public PostgreSQL port closed and HTTP local to the server', async () => {
  const compose = await read('docker-compose.yml');
  assert.doesNotMatch(compose, /5432:5432/);
  assert.match(compose, /127\.0\.0\.1:\$\{API_BIND_PORT:-8891\}:8080/);
  assert.match(compose, /127\.0\.0\.1:\$\{WEB_BIND_PORT:-8892\}:80/);
});
