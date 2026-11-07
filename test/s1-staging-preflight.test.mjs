import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Docker build context excludes local secrets, raw archive, Git, dependencies and backups', async () => {
  const ignore = await read('.dockerignore');
  const rules = new Set(ignore.split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#')));
  for (const pattern of [
    '.git', '.env', '.env.*', '**/.env', '**/.env.*',
    'node_modules', '**/node_modules', 'data/raw', 'data/raw/**',
    '*.pem', '*.key', '*.dump', 'dist', 'coverage',
  ]) {
    assert.ok(rules.has(pattern), `Missing Docker context exclusion: ${pattern}`);
  }
  assert.ok(!rules.has('sql') && !rules.has('config') && !rules.has('src'),
    'Required SQL migrations, registry and source code must remain in the image context');
});

test('the staging readiness audit cannot modify live domains, containers or files', async () => {
  const script = await read('deploy/s1/staging-preflight.sh');
  assert.match(script, /SADIAAF_STAGING_READ_ONLY_PRECHECK/);
  assert.match(script, /--check-only/);
  for (const prohibited of [
    /\bdocker\s+compose\s+(?:up|down|run|build)\b/,
    /\b(?:rm\s+-rf|rsync\s|mkfs\s|docker\s+volume\s+rm)\b/,
    /\b(?:plesk\s+sbin|mkdir\s+-p|git\s+checkout|git\s+reset)\b/,
    /SADIAAF_PRODUCTION_CUTOVER_APPROVED=YES/,
  ]) {
    assert.doesNotMatch(script, prohibited);
  }
});

test('staging readiness requires exact code identity and real local prerequisites', async () => {
  const script = await read('deploy/s1/staging-preflight.sh');
  for (const required of [
    /SADIAAF_EXPECTED_GIT_SHA/,
    /git rev-parse HEAD/,
    /git status --porcelain/,
    /docker compose version/,
    /docker info/,
    /df -Pk/,
    /MemAvailable/,
    /ss -ltn/,
    /18991/,
    /18992/,
    /sadiaaf\.wealthtechinnovations\.com/,
    /api\.sadiaaf\.wealthtechinnovations\.com/,
  ]) {
    assert.match(script, required);
  }
});

test('Compose continues to retain PostgreSQL data and disables collector by default', async () => {
  const compose = await read('docker-compose.yml');
  const env = await read('.env.production.example');
  assert.match(compose, /postgres_data: \/var\/lib\/postgresql\/data/);
  assert.match(compose, /collector:[\s\S]*?profiles:\s*\n\s+- collection/);
  assert.match(env, /^ENABLE_SCHEDULER=false$/m);
  assert.doesNotMatch(compose, /5432:5432/);
});
