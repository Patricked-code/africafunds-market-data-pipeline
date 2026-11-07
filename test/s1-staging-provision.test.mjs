import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const script = new URL('../deploy/s1/staging-provision.sh', import.meta.url).pathname;

test('staging installer plan is read-only and names distinct private services', () => {
  const r = spawnSync('bash', [script, '--plan'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /NO MUTATION/);
  assert.match(r.stdout, /sadiaaf-market-data-staging/);
  assert.match(r.stdout, /127\.0\.0\.1:18991/);
  assert.match(r.stdout, /127\.0\.0\.1:18992/);
  assert.match(r.stdout, /NOT wealthtech-mcp-ssh-bridge/);
});

test('staging installer refuses application before explicit authorization', () => {
  const r = spawnSync('bash', [script, '--apply'], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH ?? '/usr/bin:/bin',
      SADIAAF_STAGING_FIRST_INSTALL_APPROVED: 'NO' },
  });
  assert.equal(r.status, 3, r.stderr);
  assert.match(r.stderr, /approval required/i);
});

test('staging installer refuses missing exact Git revision without writes', () => {
  const r = spawnSync('bash', [script, '--apply'], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH ?? '/usr/bin:/bin',
      SADIAAF_STAGING_FIRST_INSTALL_APPROVED: 'YES',
      SADIAAF_EXPECTED_GIT_SHA: 'invalid' },
  });
  assert.equal(r.status, 3, r.stderr);
  assert.match(r.stderr, /40-character Git commit SHA/);
});

test('staging installer blocks any existing PostgreSQL volume and project', async () => {
  const c = await read('deploy/s1/staging-provision.sh');
  assert.match(c, /docker volume inspect "\$VOLUME"/);
  assert.match(c, /docker ps -aq --filter/);
  assert.match(c, /PostgreSQL staging volume already exists/);
  assert.match(c, /staging root already exists/);
  assert.match(c, /SADIAAF_STAGING_FIRST_INSTALL_APPROVED/);
  assert.match(c, /SADIAAF_EXPECTED_GIT_SHA/);
});

test('staging installer never modifies MCP, public domains or Plesk', async () => {
  const c = await read('deploy/s1/staging-provision.sh');
  assert.doesNotMatch(c, /\bplesk\s+(?:sbin|bin|httpdmng)/);
  assert.doesNotMatch(c, /\b(?:docker\s+system\s+prune|docker\s+volume\s+rm|docker\s+compose\s+down\s+-v|rm\s+-rf)\b/);
  assert.doesNotMatch(c, /\/var\/www\/vhosts\//);
  assert.doesNotMatch(c, /\bcontainer_name:/);
  assert.match(c, /PROJECT="sadiaaf-market-data-staging"/);
  assert.match(c, /COMPOSE_PROFILES=""/);
});

test('PostgreSQL volume and raw archives survive independent code releases', async () => {
  const compose = await read('docker-compose.yml');
  const deploy = await read('deploy/s1/deploy.sh');
  const stage = await read('deploy/s1/staging-provision.sh');
  assert.match(compose, /postgres_data:\/var\/lib\/postgresql\/data/);
  assert.match(compose, /\$\{SADIAAF_RAW_HOST_DIR:-\.\/data\/raw\}:\/app\/data\/raw/);
  assert.match(stage, /export SADIAAF_RAW_HOST_DIR="\$RAW_HOST_DIR"/);
  assert.match(stage, /RAW_HOST_DIR="\$ROOT\/shared\/raw"/);
  assert.match(deploy, /export SADIAAF_RAW_HOST_DIR="\$APP_ROOT\/shared\/raw"/);
  assert.doesNotMatch(deploy, /ln -sfn "\$APP_ROOT\/shared\/raw" "\$RELEASE_DIR\/data\/raw"/);
});

test('first install requires strict S1 preflight, secrets and no accidental collection', async () => {
  const c = await read('deploy/s1/staging-provision.sh');
  const env = await read('src/config/schedulerEnabled.ts');
  assert.match(c, /staging-preflight\.sh" --check-only/);
  assert.match(c, /stat -c '%a'/);
  assert.match(c, /ENABLE_SCHEDULER=\(false\|0\|no\|off\)/);
  assert.match(c, /config --services \| grep -qx collector/);
  assert.match(c, /"\$\{COMPOSE\[@\]\}" run --rm migrate/);
  assert.match(c, /"\$\{COMPOSE\[@\]\}" up -d api web/);
  assert.match(env, /default\(false\)/);
});

test('runtime workflow uses only disposable GitHub-hosted runner, not S1', async () => {
  const workflow = await read('.github/workflows/staging-runtime-smoke.yml');
  assert.match(workflow, /runs-on: ubuntu-latest/);
  assert.match(workflow, /docker compose down --remove-orphans --volumes/);
  assert.doesNotMatch(workflow, /runs-on: self-hosted/);
});

test('staging credential generator is read-only by default and refuses unapproved writes', () => {
  const secretScript = new URL('../deploy/s1/staging-secrets-init.sh', import.meta.url).pathname;
  const plan = spawnSync('bash', [secretScript, '--plan'], { encoding: 'utf8' });
  assert.equal(plan.status, 0, plan.stderr);
  assert.match(plan.stdout, /PLAN ONLY/);
  const denied = spawnSync('bash', [secretScript, '--apply'], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH ?? '/usr/bin:/bin', SADIAAF_STAGING_SECRETS_APPROVED: 'NO' },
  });
  assert.equal(denied.status, 3, denied.stderr);
  assert.match(denied.stderr, /approval required/i);
});

test('credential initializer writes only new root-owned staging secrets with no process-list leak', async () => {
  const c = await read('deploy/s1/staging-secrets-init.sh');
  assert.match(c, /openssl rand -hex 32/);
  assert.match(c, /ln -- "\$TMP" "\$ENV_FILE"/);
  assert.match(c, /umask 077/);
  assert.match(c, /chmod 600 "\$TMP"/);
  assert.doesNotMatch(c, /sed "s\/REPLACE_WITH_64_LOWERCASE_HEX_CHARACTERS\/\$PASSWORD/);
  assert.doesNotMatch(c, /\/var\/www\/vhosts\//);
  assert.doesNotMatch(c, /\b(?:docker compose|plesk sbin|docker volume rm)\b/);
});
