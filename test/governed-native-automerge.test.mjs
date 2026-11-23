import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateEnrollment, isExplicitRevocation, normalizeActiveRulesetPolicy } from '../scripts/ci/governed-native-automerge.mjs';

function fixture() {
  return {
    repository: {
      full_name: 'Patricked-code/africafunds-market-data-pipeline',
      allow_auto_merge: true
    },
    branch: { name: 'main', protected: true },
    protection: {
      requiresApprovingReviews: true,
      requiredApprovingReviewCount: 1,
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
  ['no review policy', d => { d.protection.requiresApprovingReviews = false; }],
  ['zero required reviews', d => { d.protection.requiredApprovingReviewCount = 0; }],
  ['non-strict stale base branch', d => { d.protection.requiresStrictStatusChecks = false; }],
  ['missing Docker smoke check', d => { d.protection.requiredStatusCheckContexts = ['validate']; }],
  ['no status-check enforcement', d => { d.protection.requiresStatusChecks = false; }],
  ['missing mandatory validate check', d => { d.protection.requiredStatusCheckContexts = ['lint']; }],
  ['stale reviews permitted', d => { d.protection.dismissesStaleReviews = false; }],
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
    target: 'branch', enforcement: 'active', bypass_actors: [],
    conditions: { ref_name: { include: ['refs/heads/main'], exclude: [] } },
    rules: [
      { type: 'deletion' }, { type: 'non_fast_forward' },
      { type: 'pull_request', parameters: {
        required_approving_review_count: 1,
        dismiss_stale_reviews_on_push: true,
        require_last_push_approval: true,
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
  ['ruleset does not require last-push review', rs => { rs.rules.find(r => r.type === 'pull_request').parameters.require_last_push_approval = false; }],
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
