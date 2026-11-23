#!/usr/bin/env node
/**
 * Required CI guard on every PR HEAD. Never mutates GitHub.
 * Protects against a writer pushing a sensitive revision after a prior
 * native auto-merge enrollment. Uses a read-only GITHUB_TOKEN.
 */
import { readFileSync } from 'node:fs';
import { evaluateRequiredScopeGate } from './governed-native-automerge.mjs';

async function json(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + token,
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  if (!response.ok) throw new Error('GitHub read failed with HTTP ' + response.status);
  return response.json();
}

export async function validateGovernedHead({ eventName, event, repositoryName, token }) {
  if (eventName !== 'pull_request') return 'NOT_APPLICABLE';
  const expectedSha = event?.pull_request?.head?.sha;
  const number = event?.pull_request?.number;
  if (event?.repository?.full_name !== repositoryName ||
      !Number.isInteger(number) || !/^[a-f0-9]{40}$/.test(expectedSha ?? '') ||
      !token) throw new Error('missing trusted PR execution context');
  const api = 'https://api.github.com/repos/' + repositoryName;
  const pr = await json(api + '/pulls/' + number, token);
  if (pr?.state !== 'open' || pr?.head?.sha !== expectedSha ||
      pr?.base?.ref !== 'main') throw new Error('PR changed or no longer targets main');
  if (!Number.isSafeInteger(pr.changed_files) || pr.changed_files < 1 ||
      pr.changed_files > 500) throw new Error('unverifiable PR file count');
  const files = [];
  for (let page = 1; page <= Math.ceil(pr.changed_files / 100); page++) {
    const batch = await json(api + '/pulls/' + number + '/files?per_page=100&page=' + page, token);
    if (!Array.isArray(batch)) throw new Error('invalid PR file inventory');
    files.push(...batch);
  }
  const problem = evaluateRequiredScopeGate({ pullRequest: pr, files });
  if (problem) throw new Error('governed head gate denied: ' + problem);
  return 'PASS';
}

if (process.argv[1]?.endsWith('validate-governed-head.mjs')) {
  const token = process.env.GITHUB_TOKEN;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!token || !eventPath) {
    console.error('Missing GitHub Actions metadata/token for PR guard');
    process.exitCode = 1;
  } else {
    validateGovernedHead({
      eventName: process.env.GITHUB_EVENT_NAME,
      event: JSON.parse(readFileSync(eventPath, 'utf8')),
      repositoryName: process.env.GITHUB_REPOSITORY,
      token
    }).then(x => console.log('Governed head gate: ' + x))
      .catch(e => { console.error(e.message); process.exitCode = 1; });
  }
}
