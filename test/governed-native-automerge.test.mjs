import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateEnrollment, isExplicitRevocation, normalizeActiveRulesetPolicy, isSensitiveChangePath, checkPullRequestFileScope, resolveTrustedPrSignal, evaluateRequiredScopeGate } from '../scripts/ci/governed-native-automerge.mjs';

function fixture() {
  return {
    repository: {
      full_name: 'Patricked-code/africafunds-market-data-pipeline',
      allow_auto_merge: true
    },
    branch: { name: 'main', protected: true },
    protection: {
      requiresPullRequest: true,
      requiredApprovingReviewCount: 0,
      hasRequiredReviewers: false,
      requiresCodeOwnerReview: false,
      requiresExtraUnattributedApproval: false,
      requiresLastPushApproval: false,
      requiresStatusChecks: true,
      requiredStatusCheckContexts: ['validate', 'Build, boot, migrate and verify persistent PostgreSQL'],
      requiresStrictStatusChecks: true,
      dismissesStaleReviews: true,
      requiresConversationResolution: true,
      isAdminEnforced: true
    },
    pullRequest: {
      state: 'open',
      draft: false,
      base: {
        ref: 'main',
        repo: { full_name: 'Patricked-code/africafunds-market-data-pipeline' }
      },
      head: {
        sha: 'def123',
        repo: { full_name: 'Patricked-code/africafunds-market-data-pipeline' }
      },
      labels: [{ name: 'automerge-eligible' }]
    },
    eventSha: 'def123'
  };
}

test('enrollment is eligible only when every governed prerequisite exists', () => {
  assert.equal(evaluateEnrollment(fixture()), null);
});

const refusals = [
  ['disabled repository setting', d => { d.repository.allow_auto_merge = false; }],
  ['repo identity mismatch', d => { d.repository.full_name = 'other/repo'; }],
  ['unprotected main', d => { d.branch.protected = false; }],
  ['missing classic branch rule', d => { d.protection = null; }],
  ['no PR requirement', d => { d.protection.requiresPullRequest = false; }],
  ['human approvals still required', d => { d.protection.requiredApprovingReviewCount = 1; }],
  ['required reviewer teams present', d => { d.protection.hasRequiredReviewers = true; }],
  ['CODEOWNERS review required', d => { d.protection.requiresCodeOwnerReview = true; }],
  ['extra review required', d => { d.protection.requiresExtraUnattributedApproval = true; }],
  ['latest push approval required', d => { d.protection.requiresLastPushApproval = true; }],
  ['non-strict stale base branch', d => { d.protection.requiresStrictStatusChecks = false; }],
  ['missing Docker smoke check', d => { d.protection.requiredStatusCheckContexts = ['validate']; }],
  ['no status-check enforcement', d => { d.protection.requiresStatusChecks = false; }],
  ['missing mandatory validate check', d => { d.protection.requiredStatusCheckContexts = ['lint']; }],
  ['unresolved threads permitted', d => { d.protection.requiresConversationResolution = false; }],
  ['admin bypass', d => { d.protection.isAdminEnforced = false; }],
  ['draft PR', d => { d.pullRequest.draft = true; }],
  ['closed PR', d => { d.pullRequest.state = 'closed'; }],
  ['wrong base branch', d => { d.pullRequest.base.ref = 'dev'; }],
  ['fork head', d => { d.pullRequest.head.repo.full_name = 'external/fork'; }],
  ['readiness label missing', d => { d.pullRequest.labels = []; }],
  ['stale head SHA', d => { d.eventSha = 'old456'; }]
];
for (const [name, change] of refusals) {
  test('fail closed: ' + name, () => {
    const input = fixture();
    change(input);
    assert.equal(typeof evaluateEnrollment(input), 'string');
  });
}

test('withdrawal of readiness label is a revocation', () => {
  assert.equal(isExplicitRevocation({ action: 'unlabeled', label: { name: 'automerge-eligible' } }), true);
});
test('turning a PR into Draft revokes readiness', () => {
  assert.equal(isExplicitRevocation({ action: 'converted_to_draft' }), true);
});
test('removing another label does not revoke auto-merge', () => {
  assert.equal(isExplicitRevocation({ action: 'unlabeled', label: { name: 'other-label' } }), false);
});
test('synchronize alone is not explicit revocation', () => {
  assert.equal(isExplicitRevocation({ action: 'synchronize' }), false);
});

function rulesetFixture() {
  return {
    id: 123,
    target: 'branch', enforcement: 'active', bypass_actors: [], current_user_can_bypass: 'never',
    conditions: { ref_name: { include: ['refs/heads/main'], exclude: [] } },
    rules: [
      { type: 'deletion' }, { type: 'non_fast_forward' },
      { type: 'pull_request', parameters: {
        required_approving_review_count: 0,
        required_reviewers: [],
        require_code_owner_review: false,
        require_extra_approval_for_unattributed_changes: false,
        dismiss_stale_reviews_on_push: false,
        require_last_push_approval: false,
        required_review_thread_resolution: true
      } },
      { type: 'required_status_checks', parameters: {
        strict_required_status_checks_policy: true,
        required_status_checks: [
          { context: 'validate' },
          { context: 'Build, boot, migrate and verify persistent PostgreSQL' }
        ]
      } }
    ]
  };
}
test('a fully audited active ruleset can protect main even without classic API branch protection', () => {
  const d = fixture();
  d.branch.protected = false;
  d.protection = normalizeActiveRulesetPolicy(rulesetFixture());
  assert.equal(evaluateEnrollment(d), null);
});
test('an unauditable ruleset bypass list must never be silently treated as empty', () => {
  const d = fixture();
  d.branch.protected = false;
  const rs = rulesetFixture();
  delete rs.bypass_actors;
  delete rs.current_user_can_bypass;
  d.protection = normalizeActiveRulesetPolicy(rs);
  assert.match(evaluateEnrollment(d), /bypass/);
});
const rulesetRefusals = [
  ['ruleset inactive', rs => { rs.enforcement = 'disabled'; }],
  ['ruleset points to another branch', rs => { rs.conditions.ref_name.include = ['refs/heads/dev']; }],
  ['ruleset excludes main', rs => { rs.conditions.ref_name.exclude = ['refs/heads/main']; }],
  ['ruleset bypass actor present', rs => { rs.bypass_actors.push({ actor_type: 'RepositoryRole', actor_id: 5 }); }],
  ['ruleset missing PR gate', rs => { rs.rules = rs.rules.filter(r => r.type !== 'pull_request'); }],
  ['ruleset missing Docker check', rs => { rs.rules.find(r => r.type === 'required_status_checks').parameters.required_status_checks.pop(); }],
  ['ruleset allows stale base', rs => { rs.rules.find(r => r.type === 'required_status_checks').parameters.strict_required_status_checks_policy = false; }],
  ['ruleset still requires last-push review', rs => { rs.rules.find(r => r.type === 'pull_request').parameters.require_last_push_approval = true; }],
  ['ruleset still requires an approval', rs => { rs.rules.find(r => r.type === 'pull_request').parameters.required_approving_review_count = 1; }],
  ['ruleset requires CODEOWNERS', rs => { rs.rules.find(r => r.type === 'pull_request').parameters.require_code_owner_review = true; }],
  ['ruleset requires extra approval', rs => { rs.rules.find(r => r.type === 'pull_request').parameters.require_extra_approval_for_unattributed_changes = true; }],
  ['ruleset has required reviewers', rs => { rs.rules.find(r => r.type === 'pull_request').parameters.required_reviewers = [{ reviewer: { type: 'Team', id: 1 }, file_patterns: ['*'], minimum_approvals: 1 }]; }],
  ['ruleset token can bypass', rs => { rs.current_user_can_bypass = 'always'; }],
  ['ruleset allows force push', rs => { rs.rules = rs.rules.filter(r => r.type !== 'non_fast_forward'); }],
  ['ruleset allows deletion', rs => { rs.rules = rs.rules.filter(r => r.type !== 'deletion'); }]
];
for (const [name, change] of rulesetRefusals) {
  test('ruleset fail closed: ' + name, () => {
    const rs = rulesetFixture();
    change(rs);
    const d = fixture();
    d.branch.protected = false;
    d.protection = normalizeActiveRulesetPolicy(rs);
    assert.equal(typeof evaluateEnrollment(d), 'string');
  });
}

test('a ruleset can hide the bypass list only if it explicitly proves this token cannot bypass', () => {
  const d = fixture();
  d.branch.protected = false;
  const rs = rulesetFixture();
  delete rs.bypass_actors;
  d.protection = normalizeActiveRulesetPolicy(rs);
  assert.equal(evaluateEnrollment(d), null);
});


// describePrScopeCases: an explicit label is not an authorization to change
// security/governance/deployment/credentials, even when CI is green.
const routinePaths = [
  'src/parsers/csv.ts',
  'src/jobs/ingest.ts',
  'test/integration/ingestion-html-csv.test.ts',
  'docs/09_CHANGELOG_WORKLOG.md',
  'docs/06_CURRENT_STATUS_AND_GAPS.md'
];
for (const path of routinePaths) {
  test('routine PR path can be considered for auto-merge: ' + path, () => {
    assert.equal(isSensitiveChangePath(path), false);
  });
}
const protectedPaths = [
  '.github/workflows/ci.yml',
  '.github/CODEOWNERS',
  'deploy/s1/deploy.sh',
  'sql/002-migration.sql',
  'config/sources.json',
  'config/sources/egypt.json',
  'scripts/ci/governed-native-automerge.mjs',
  'src/auth/session.ts',
  'src/config/env.ts',
  'AGENTS.md',
  'Dockerfile',
  'Dockerfile.production',
  'docker-compose.yml',
  'package.json',
  'package-lock.json',
  'docs/08_DECISION_LOG.md',
  'docs/10_DEPLOYMENT_GATES.md',
  'docs/15_AUTONOMOUS_AGENT_EXECUTION.md',
  '.env',
  '.env.production',
  'scripts/credentials-init.sh',
  'web/private-key.pem',
  '../deploy/s1/deploy.sh',
  '/etc/passwd',
  'src\\jobs\\ingest.ts'
];
for (const path of protectedPaths) {
  test('sensitive PR path cannot auto-merge: ' + path, () => {
    assert.equal(isSensitiveChangePath(path), true);
  });
}
test('complete routine changed-file list is eligible for path gate', () => {
  const files = [
    { filename: 'src/jobs/ingest.ts', status: 'modified' },
    { filename: 'test/integration/ingestion-html-csv.test.ts', status: 'added' }
  ];
  assert.equal(checkPullRequestFileScope({ files, changedFiles: 2 }), null);
});
test('scope gate refuses missing, zero, or truncated file inventories', () => {
  for (const [files, changedFiles] of [[null, 1], [[], 0], [[], 1], [[], 501]]) {
    assert.equal(typeof checkPullRequestFileScope({ files, changedFiles }), 'string');
  }
});
test('scope gate refuses invalid entries and repeated filenames', () => {
  assert.equal(typeof checkPullRequestFileScope({
    files: [{ filename: 'src/jobs/ingest.ts', status: 'unexpected' }], changedFiles: 1
  }), 'string');
  assert.equal(typeof checkPullRequestFileScope({
    files: [
      { filename: 'src/jobs/ingest.ts', status: 'modified' },
      { filename: 'src/jobs/ingest.ts', status: 'modified' }
    ], changedFiles: 2
  }), 'string');
});
test('scope gate refuses renaming a sensitive path to a routine path', () => {
  assert.equal(typeof checkPullRequestFileScope({
    files: [{filename:'src/jobs/ingest.ts',previous_filename:'deploy/s1/deploy.sh', status:'renamed'}],
    changedFiles:1
  }), 'string');
});
test('scope gate refuses renaming a routine path to a sensitive path', () => {
  assert.equal(typeof checkPullRequestFileScope({
    files: [{filename:'deploy/s1/deploy.sh',previous_filename:'src/jobs/ingest.ts', status:'renamed'}],
    changedFiles:1
  }), 'string');
});
test('scope gate refuses file modifications in protected policy scope', () => {
  assert.equal(typeof checkPullRequestFileScope({
    files: [{ filename:'.github/workflows/ci.yml', status:'modified'}], changedFiles:1
  }), 'string');
});

function trustedWorkflowRunFixture() {
  const sha = 'abc123abc123abc123abc123abc123abc123abcd';
  return {
    action: 'completed',
    repository: { full_name: 'Patricked-code/africafunds-market-data-pipeline' },
    workflow_run: {
      event: 'pull_request', name: 'CI — AfricaFunds Market Data Pipeline',
      status: 'completed', conclusion: 'success',
      head_repository: { full_name: 'Patricked-code/africafunds-market-data-pipeline' },
      head_sha: sha, pull_requests: [
        { number: 38, head: { sha }, base: { ref: 'main' } }
      ]
    }
  };
}
test('trusted completed CI run resolves exactly one same-repo PR and exact SHA', () => {
  const f = trustedWorkflowRunFixture();
  assert.deepEqual(resolveTrustedPrSignal(f, f.repository.full_name),
    { number: 38, headSha: f.workflow_run.head_sha, revoke: false });
});
test('trusted Docker/PostgreSQL completion resolves same PR', () => {
  const f = trustedWorkflowRunFixture();
  f.workflow_run.name = 'SadiaAF — isolated Docker runtime and PostgreSQL persistence smoke';
  assert.equal(resolveTrustedPrSignal(f, f.repository.full_name)?.number, 38);
});
const untrustedWorkflowRuns = [
  ['untrusted repository', x => { x.repository.full_name = 'external/repo'; }],
  ['fork run', x => { x.workflow_run.head_repository.full_name = 'attacker/repo'; }],
  ['failed CI', x => { x.workflow_run.conclusion = 'failure'; }],
  ['pending CI', x => { x.workflow_run.status = 'in_progress'; }],
  ['non-PR run', x => { x.workflow_run.event = 'push'; }],
  ['missing PR inventory', x => { x.workflow_run.pull_requests = []; }],
  ['ambiguous two-PR run', x => { x.workflow_run.pull_requests.push(x.workflow_run.pull_requests[0]); }],
  ['changed run SHA', x => { x.workflow_run.head_sha = '0000000000000000000000000000000000000000'; }],
  ['different PR base', x => { x.workflow_run.pull_requests[0].base.ref = 'dev'; }],
  ['unknown workflow', x => { x.workflow_run.name = 'attacker test'; }],
  ['incomplete webhook action', x => { x.action = 'requested'; }],
  ['short SHA', x => { x.workflow_run.pull_requests[0].head.sha = 'abc'; }]
];
for (const [name, mutate] of untrustedWorkflowRuns) {
  test('fail closed trusted workflow completion: ' + name, () => {
    const f = trustedWorkflowRunFixture();
    mutate(f);
    assert.equal(resolveTrustedPrSignal(f, 'Patricked-code/africafunds-market-data-pipeline'), null);
  });
}
test('privileged comment requires exact SHA and a recognized command', () => {
  const sha = 'abc123abc123abc123abc123abc123abc123abcd';
  const f = {
    action: 'created',
    repository: { full_name: 'Patricked-code/africafunds-market-data-pipeline' },
    issue: { number: 38, pull_request: { url: 'https://api.github.com/repos/owner/repo/pulls/38' } },
    comment: { author_association: 'OWNER', body: '/sadiaaf-automerge ' + sha }
  };
  assert.deepEqual(resolveTrustedPrSignal(f, f.repository.full_name),
    {number:38,headSha:sha,revoke:false});
  f.comment.body = '/sadiaaf-revoke-automerge ' + sha;
  assert.equal(resolveTrustedPrSignal(f, f.repository.full_name)?.revoke, true);
  f.comment.author_association = 'NONE';
  assert.equal(resolveTrustedPrSignal(f, f.repository.full_name), null);
});
test('unknown PR comment, issue-only comment, and non-SHA-bound signal are rejected', () => {
  const f = {
    action: 'created',
    repository: { full_name: 'Patricked-code/africafunds-market-data-pipeline' },
    issue: { number: 38, pull_request: {} },
    comment: { author_association: 'OWNER', body: '/sadiaaf-automerge' }
  };
  assert.equal(resolveTrustedPrSignal(f, f.repository.full_name), null);
  f.comment.body = '/sadiaaf-automerge abc123abc123abc123abc123abc123abc123abcd';
  delete f.issue.pull_request;
  assert.equal(resolveTrustedPrSignal(f, f.repository.full_name), null);
});

test('required HEAD guard denies sensitive changes while labeled for auto-merge', () => {
  const pr = {changed_files:1, labels:[{name:'automerge-eligible'}], auto_merge:null};
  assert.match(evaluateRequiredScopeGate({
    pullRequest:pr, files:[{filename:'sql/migrations/009.sql',status:'added'}]
  }), /sensitive PR/);
});
test('required HEAD guard denies sensitive changes while native auto-merge remains enrolled after label removal', () => {
  const pr = {changed_files:1, labels:[], auto_merge:{enabled_at:'2026-11-24T00:00:00Z'}};
  assert.match(evaluateRequiredScopeGate({
    pullRequest:pr, files:[{filename:'.github/workflows/ci.yml',status:'modified'}]
  }), /sensitive PR/);
});
test('required HEAD guard allows an authorized manually integrated sensitive PR not enrolled in auto-merge', () => {
  const pr = {changed_files:1, labels:[], auto_merge:null};
  assert.equal(evaluateRequiredScopeGate({
    pullRequest:pr, files:[{filename:'.github/workflows/ci.yml',status:'modified'}]
  }), null);
});
test('required HEAD guard allows ordinary PR with label to pass', () => {
  const pr = {changed_files:1, labels:[{name:'automerge-eligible'}], auto_merge:null};
  assert.equal(evaluateRequiredScopeGate({
    pullRequest:pr, files:[{filename:'src/parsers/csv.ts',status:'modified'}]
  }), null);
});
test('required HEAD guard rejects incomplete file inventories even without label', () => {
  const pr = {changed_files:2, labels:[], auto_merge:null};
  assert.equal(typeof evaluateRequiredScopeGate({
    pullRequest:pr, files:[{filename:'docs/06_CURRENT_STATUS_AND_GAPS.md',status:'modified'}]
  }), 'string');
});
test('required HEAD guard rejects missing PR data or changed-file metadata', () => {
  assert.equal(typeof evaluateRequiredScopeGate({pullRequest:null,files:[]}), 'string');
  assert.equal(typeof evaluateRequiredScopeGate({pullRequest:{},files:[]}), 'string');
});

test('stacked PR targets another feature branch and retains ordinary CI validation', async () => {
  const sha = 'abc123abc123abc123abc123abc123abc123abcd';
  const event = {
    repository: { full_name: 'Patricked-code/africafunds-market-data-pipeline' },
    pull_request: { number: 99, head: { sha } }
  };
  const fetchBefore = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return {ok: true, json: async () => ({
      state: 'open', head: {sha}, base: {ref: 'feature/parent'},
      changed_files: 1
    })};
  };
  try {
    const { validateGovernedHead } = await import('../scripts/ci/validate-governed-head.mjs');
    assert.equal(await validateGovernedHead({
      eventName: 'pull_request', event, token: 'ci-read-test-only',
      repositoryName: 'Patricked-code/africafunds-market-data-pipeline'
    }), 'NOT_APPLICABLE_STACKED_PR');
    assert.equal(calls, 1, 'stacked PR must not require main-only files gate');
  } finally {
    globalThis.fetch = fetchBefore;
  }
});
