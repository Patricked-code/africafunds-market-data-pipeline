import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateEnrollment, isExplicitRevocation } from '../scripts/ci/governed-native-automerge.mjs';

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
