#!/usr/bin/env node
/**
 * Enroll only safely configured PRs in native GitHub auto-merge.
 * Never makes a direct merge call. Run only from a trusted main checkout.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const REQUIRED_CHECKS = ['validate', 'Build, boot, migrate and verify persistent PostgreSQL'];
const INTENT_LABEL = 'automerge-eligible';

const TRUSTED_WORKFLOWS = new Set([
  'CI — AfricaFunds Market Data Pipeline',
  'SadiaAF — isolated Docker runtime and PostgreSQL persistence smoke'
]);

/**
 * Workflow-run webhooks are emitted from the trusted default branch and
 * carry the actual PR head SHA. Ignore fork runs, stale events, non-PR runs,
 * failed checks, or ambiguous PR inventories. Do not ingest run artifacts.
 *
 * A privileged PR issue-comment is an explicit, SHA-bound recheck/revoke
 * signal for cases where a readiness label changed after the last CI run.
 */
export function resolveTrustedPrSignal(event, repositoryName) {
  if (event?.repository?.full_name !== repositoryName) return null;
  if (event?.workflow_run) {
    const run = event.workflow_run;
    const matches = run.pull_requests;
    if (event.action !== 'completed' || run.event !== 'pull_request' ||
        run.status !== 'completed' || run.conclusion !== 'success' ||
        run.head_repository?.full_name !== repositoryName ||
        !TRUSTED_WORKFLOWS.has(run.name) ||
        !Array.isArray(matches) || matches.length !== 1) return null;
    const pr = matches[0];
    if (!Number.isInteger(pr?.number) || !/^[a-f0-9]{40}$/.test(pr?.head?.sha ?? '') ||
        pr.head.sha !== run.head_sha || pr.base?.ref !== 'main') return null;
    return { number: pr.number, headSha: pr.head.sha, revoke: false };
  }
  if (event?.issue?.pull_request && event?.comment && event.action === 'created') {
    const association = event.comment.author_association;
    if (!['OWNER', 'MEMBER', 'COLLABORATOR'].includes(association)) return null;
    const body = (event.comment.body ?? '').trim();
    const match = /^\/(sadiaaf-automerge|sadiaaf-revoke-automerge) ([a-f0-9]{40})$/.exec(body);
    if (!match || !Number.isInteger(event.issue.number)) return null;
    return { number: event.issue.number, headSha: match[2],
      revoke: match[1] === 'sadiaaf-revoke-automerge' };
  }
  return null;
}


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


/**
 * Auto-merge is a routine-code path, NEVER an authorization for changes to
 * GitHub governance, secrets, data-source licensing, SQL, or deployments.
 * A missing/truncated PR file list fails closed.
 */
export function isSensitiveChangePath(path) {
  if (typeof path !== 'string' || path.length < 1 || path.includes('\\') ||
      path.startsWith('/') || path.split('/').includes('..')) return true;
  return /^(?:\.github\/|deploy\/|sql\/|config\/|scripts\/ci\/|src\/(?:auth\/|identity\/|security\/|config\/)|AGENTS\.md$|Dockerfile(?:\..*)?$|docker-compose(?:\..*)?\.ya?ml$|package(?:-lock)?\.json$|docs\/(?:08_DECISION_LOG|10_DEPLOYMENT_GATES|15_AUTONOMOUS_AGENT_EXECUTION)\.md$)/i.test(path) ||
    /(^|[\/._-])(?:secrets?|credentials?|private.?keys?|tokens?)(?:$|[\/._-])/i.test(path) ||
    /^\.env(?:$|\.)/.test(path);
}

export function checkPullRequestFileScope({ files, changedFiles }) {
  if (!Number.isSafeInteger(changedFiles) || changedFiles < 1 || changedFiles > 500 ||
      !Array.isArray(files) || files.length !== changedFiles) {
    return 'changed-file inventory missing, empty, truncated, or exceeds safe limit';
  }
  const seen = new Set();
  for (const entry of files) {
    if (!entry || !['added','modified','removed','renamed','copied','changed','unchanged'].includes(entry.status) ||
        typeof entry.filename !== 'string' || seen.has(entry.filename)) {
      return 'invalid or duplicate changed-file inventory entry';
    }
    seen.add(entry.filename);
    if (isSensitiveChangePath(entry.filename) ||
        (entry.status === 'renamed' &&
         (typeof entry.previous_filename !== 'string' ||
          isSensitiveChangePath(entry.previous_filename)))) {
      return 'sensitive or unverified file path requires separate authorization';
    }
  }
  return null;
}

async function readAllPrFiles(api, number, changedFiles, token) {
  if (!Number.isSafeInteger(changedFiles) || changedFiles < 1 || changedFiles > 500) return null;
  const files = [];
  for (let page = 1; page <= Math.ceil(changedFiles / 100); page += 1) {
    const batch = await githubRequest(api + '/pulls/' + number + '/files?per_page=100&page=' + page, token);
    if (!Array.isArray(batch) || batch.length < 1) return null;
    files.push(...batch);
    if (files.length > changedFiles) return null;
  }
  return files;
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
  const signal = resolveTrustedPrSignal(event, repositoryName);
  if (!signal) {
    console.log('SKIP: no trusted workflow completion or authorized SHA-bound PR comment');
    return 'SKIPPED';
  }
  const api = 'https://api.github.com/repos/' + repositoryName;
  const [repository, branch, pullRequest] = await Promise.all([
    githubRequest(api, token),
    githubRequest(api + '/branches/main', token),
    githubRequest(api + '/pulls/' + signal.number, token)
  ]);
  if (pullRequest?.head?.sha !== signal.headSha) {
    console.log('SKIP: event SHA is stale relative to live PR');
    return 'SKIPPED';
  }
  if (signal.revoke) {
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
  // A readiness label cannot authorize security-sensitive changes.
  // Fetch the complete GitHub PR diff inventory; no labels or PR body
  // can override a missing inventory or the protected path policy.
  const prFiles = await readAllPrFiles(api, pullRequest.number, pullRequest.changed_files, token);
  const fileScopeBlock = checkPullRequestFileScope({
    files: prFiles, changedFiles: pullRequest.changed_files
  });
  const problem = fileScopeBlock || evaluateEnrollment({
    repository, branch, protection, pullRequest,
    eventSha: signal.headSha
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
