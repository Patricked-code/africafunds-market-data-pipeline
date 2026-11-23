#!/usr/bin/env node
/**
 * Enroll only safely configured PRs in native GitHub auto-merge.
 * Never makes a direct merge call. Run only from a trusted main checkout.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const REQUIRED_CHECKS = ['validate', 'Build, boot, migrate and verify persistent PostgreSQL'];
const INTENT_LABEL = 'automerge-eligible';

/** Normalize only a fully active ruleset for the exact main branch.
 * GitHub omits bypass_actors for callers without ruleset write access.
 * Missing bypass information must NOT be treated as an empty bypass list.
 */
export function normalizeActiveRulesetPolicy(rs) {
  if (rs?.enforcement !== 'active' || rs?.target !== 'branch') return null;
  const refs = rs?.conditions?.ref_name;
  if (!Array.isArray(refs?.include) || !refs.include.includes('refs/heads/main') ||
      !Array.isArray(refs.exclude) || refs.exclude.length > 0) return null;
  if (!Array.isArray(rs.rules)) return null;
  const pull = rs.rules.find(r => r.type === 'pull_request')?.parameters;
  const status = rs.rules.find(r => r.type === 'required_status_checks')?.parameters;
  const checks = Array.isArray(status?.required_status_checks)
    ? status.required_status_checks.map(c => c.context) : [];
  const hasNoBypass = Array.isArray(rs.bypass_actors) && rs.bypass_actors.length === 0;
  return {
    isEnforcedRuleset: true,
    requiresPullRequest: !!pull,
    requiredApprovingReviewCount: pull?.required_approving_review_count,
    hasRequiredReviewers: Array.isArray(pull?.required_reviewers) ? pull.required_reviewers.length > 0 : true,
    requiresCodeOwnerReview: pull?.require_code_owner_review !== false,
    requiresExtraUnattributedApproval: pull?.require_extra_approval_for_unattributed_changes !== false,
    requiresStatusChecks: !!status,
    requiredStatusCheckContexts: checks,
    requiresStrictStatusChecks: status?.strict_required_status_checks_policy === true,
    dismissesStaleReviews: pull?.dismiss_stale_reviews_on_push === true,
    requiresConversationResolution: pull?.required_review_thread_resolution === true,
    // GitHub omits bypass_actors for a non-admin token. Refuse enrollment
    // unless this workflow's own token is explicitly confirmed non-bypassing.
    isAdminEnforced: rs.current_user_can_bypass === 'never' &&
      (rs.bypass_actors === undefined || hasNoBypass),
    requiresLastPushApproval: pull?.require_last_push_approval === true,
    blocksForcePushes: rs.rules.some(r => r.type === 'non_fast_forward'),
    blocksDeletions: rs.rules.some(r => r.type === 'deletion')
  };
}

export function evaluateEnrollment({ repository, branch, protection, pullRequest, eventSha }) {
  if (repository?.allow_auto_merge !== true) return 'repository auto-merge is disabled';
  if (repository?.full_name !== pullRequest?.base?.repo?.full_name) return 'repository identity mismatch';
  if (branch?.name !== 'main' || (branch?.protected !== true && protection?.isEnforcedRuleset !== true)) return 'main is not protected';
  if (protection?.requiresPullRequest !== true) return 'a pull request is not required';
  if (protection?.requiredApprovingReviewCount !== 0) return 'manual approvals remain required';
  if (protection?.hasRequiredReviewers !== false ||
      protection?.requiresCodeOwnerReview !== false ||
      protection?.requiresExtraUnattributedApproval !== false ||
      protection?.requiresLastPushApproval === true) {
    return 'a mandatory reviewer gate still exists';
  }
  if (protection?.requiresStatusChecks !== true ||
      !Array.isArray(protection?.requiredStatusCheckContexts) ||
      !REQUIRED_CHECKS.every(check => protection.requiredStatusCheckContexts.includes(check))) {
    return 'the CI and Docker status checks are not both required';
  }
  if (protection?.requiresStrictStatusChecks !== true) return 'strict up-to-date checks are not required';
  // Dismissal of approvals is irrelevant when no approval is required.
  if (protection?.requiresConversationResolution !== true) return 'review-thread resolution is not required';
  if (protection?.isAdminEnforced !== true) return 'the workflow token bypass status is not certified';
  if (protection?.isEnforcedRuleset === true &&
      (protection.requiresLastPushApproval !== false || protection.blocksForcePushes !== true || protection.blocksDeletions !== true)) {
    return 'active ruleset still requires a last-push approval or permits unsafe branch operations';
  }
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

export function isExplicitRevocation(event) {
  return event?.action === 'converted_to_draft' ||
    (event?.action === 'unlabeled' && event?.label?.name === INTENT_LABEL);
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

async function disableIfEnrolled(pullRequest, token) {
  if (!pullRequest.auto_merge) return false;
  const query = 'mutation($id: ID!) { disablePullRequestAutoMerge(input: {pullRequestId: $id}) { pullRequest { number } } }';
  await githubRequest('https://api.github.com/graphql', token, {
    method: 'POST', body: { query, variables: { id: pullRequest.node_id } }
  });
  console.log('DISABLED: native auto-merge for PR #' + pullRequest.number);
  return true;
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
  if (isExplicitRevocation(event)) {
    await disableIfEnrolled(pullRequest, token);
    return 'REVOKED';
  }
  if (repository.allow_auto_merge !== true) {
    if (pullRequest.labels?.some(label => label.name === INTENT_LABEL)) {
      await disableIfEnrolled(pullRequest, token);
    }
    console.log('SKIP: repository auto-merge or main protection is not enabled');
    return 'SKIPPED';
  }
  let protection = null;
  // API rulesets can enforce main even when classic /branches/main/protection is disabled.
  // This path never trusts an omitted bypass_actors field as an empty list.
  const rulesets = await githubRequest(api + '/rulesets', token);
  if (!Array.isArray(rulesets)) throw new Error('Rulesets API returned non-array');
  const candidates = rulesets.filter(rs => rs.target === 'branch' && rs.enforcement === 'active');
  for (const rs of candidates) {
    const full = await githubRequest(api + '/rulesets/' + rs.id, token);
    const normalized = normalizeActiveRulesetPolicy(full);
    if (normalized) {
      protection = normalized;
      break;
    }
  }
  if (!protection) {
    // Legacy classic branch protection is still supported.
    const [owner, name] = repositoryName.split('/');
    const query = 'query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { ref(qualifiedName: "refs/heads/main") { branchProtectionRule { requiresApprovingReviews requiredApprovingReviewCount requiresStatusChecks requiredStatusCheckContexts requiresStrictStatusChecks dismissesStaleReviews requiresConversationResolution isAdminEnforced } } } }';
    const result = await githubRequest('https://api.github.com/graphql', token, {
      method: 'POST', body: { query, variables: { owner, name } }
    });
    protection = result.data?.repository?.ref?.branchProtectionRule;
  }
  const problem = evaluateEnrollment({
    repository, branch, protection, pullRequest,
    eventSha: prFromEvent.head?.sha
  });
  if (problem) {
    if (pullRequest.labels?.some(label => label.name === INTENT_LABEL)) {
      await disableIfEnrolled(pullRequest, token);
    }
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
