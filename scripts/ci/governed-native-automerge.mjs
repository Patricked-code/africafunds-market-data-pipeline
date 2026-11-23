#!/usr/bin/env node
/**
 * Enroll only safely configured PRs in native GitHub auto-merge.
 * Never makes a direct merge call. Run only from a trusted main checkout.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const REQUIRED_CHECKS = ['validate', 'Build, boot, migrate and verify persistent PostgreSQL'];
const INTENT_LABEL = 'automerge-eligible';

export function evaluateEnrollment({ repository, branch, protection, pullRequest, eventSha }) {
  if (repository?.allow_auto_merge !== true) return 'repository auto-merge is disabled';
  if (repository?.full_name !== pullRequest?.base?.repo?.full_name) return 'repository identity mismatch';
  if (branch?.name !== 'main' || branch?.protected !== true) return 'main is not protected';
  if (protection?.requiresApprovingReviews !== true || protection?.requiredApprovingReviewCount < 1) {
    return 'an independent approving review is not required';
  }
  if (protection?.requiresStatusChecks !== true ||
      !Array.isArray(protection?.requiredStatusCheckContexts) ||
      !REQUIRED_CHECKS.every(check => protection.requiredStatusCheckContexts.includes(check))) {
    return 'the CI and Docker status checks are not both required';
  }
  if (protection?.requiresStrictStatusChecks !== true) return 'strict up-to-date checks are not required';
  if (protection?.dismissesStaleReviews !== true) return 'stale approvals are not dismissed';
  if (protection?.requiresConversationResolution !== true) return 'review-thread resolution is not required';
  if (protection?.isAdminEnforced !== true) return 'branch protection does not apply to administrators';
  if (pullRequest?.state !== 'open' || pullRequest?.draft !== false) return 'pull request is not open and ready';
  if (pullRequest?.base?.ref !== 'main') return 'pull request does not target main';
  if (pullRequest?.head?.repo?.full_name !== repository.full_name) return 'pull request originates from a fork';
  if (!Array.isArray(pullRequest?.labels) ||
      !pullRequest.labels.some(label => label.name === INTENT_LABEL)) {
    return 'no explicit agent readiness label';
  }
  if (!pullRequest?.head?.sha || pullRequest.head.sha !== eventSha) return 'stale pull-request event';
  return null;
}

async function githubRequest(url, token, { method = 'GET', body } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + token,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    const errors = payload.errors?.map(x => x.message).join('; ') || payload.message || 'unknown error';
    throw new Error('GitHub API ' + response.status + ': ' + errors);
  }
  return payload;
}

export async function enrollNativeAutoMerge({ repositoryName, token, event }) {
  const prFromEvent = event?.pull_request;
  if (!prFromEvent || !Number.isInteger(prFromEvent.number)) {
    console.log('SKIP: event is not a pull request');
    return 'SKIPPED';
  }
  if (event?.repository?.full_name !== repositoryName) {
    console.log('SKIP: event repository mismatch');
    return 'SKIPPED';
  }
  const api = 'https://api.github.com/repos/' + repositoryName;
  const [repository, branch, pullRequest] = await Promise.all([
    githubRequest(api, token),
    githubRequest(api + '/branches/main', token),
    githubRequest(api + '/pulls/' + prFromEvent.number, token)
  ]);
  if (repository.allow_auto_merge !== true || branch.protected !== true) {
    console.log('SKIP: repository auto-merge or main protection is not enabled');
    return 'SKIPPED';
  }
  const [owner, name] = repositoryName.split('/');
  const query = 'query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { ref(qualifiedName: "refs/heads/main") { branchProtectionRule { requiresApprovingReviews requiredApprovingReviewCount requiresStatusChecks requiredStatusCheckContexts requiresStrictStatusChecks dismissesStaleReviews requiresConversationResolution isAdminEnforced } } } }';
  const result = await githubRequest('https://api.github.com/graphql', token, {
    method: 'POST',
    body: { query, variables: { owner, name } }
  });
  const protection = result.data?.repository?.ref?.branchProtectionRule;
  const problem = evaluateEnrollment({
    repository, branch, protection, pullRequest,
    eventSha: prFromEvent.head?.sha
  });
  if (problem) {
    console.log('SKIP: ' + problem);
    return 'SKIPPED';
  }
  if (pullRequest.auto_merge) {
    console.log('Already enrolled in native GitHub auto-merge');
    return 'ALREADY_ENROLLED';
  }
  // Native auto-merge honors required checks, reviews, and protected branch rules.
  // Never use a direct merge endpoint, bypass or force-push.
  const mutation = 'mutation($id: ID!) { enablePullRequestAutoMerge(input: {pullRequestId: $id, mergeMethod: SQUASH}) { pullRequest { number autoMergeRequest { enabledAt } } } }';
  await githubRequest('https://api.github.com/graphql', token, {
    method: 'POST',
    body: { query: mutation, variables: { id: pullRequest.node_id } }
  });
  console.log('ENROLLED: PR #' + pullRequest.number + ' (' + pullRequest.head.sha + ')');
  return 'ENROLLED';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const token = process.env.GITHUB_TOKEN;
  const repositoryName = process.env.GITHUB_REPOSITORY;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!token || !repositoryName || !eventPath) {
    console.error('Missing GitHub Actions context; no action taken');
    process.exitCode = 1;
  } else {
    enrollNativeAutoMerge({
      token, repositoryName, event: JSON.parse(readFileSync(eventPath, 'utf8'))
    }).catch(error => { console.error(error.message); process.exitCode = 1; });
  }
}
