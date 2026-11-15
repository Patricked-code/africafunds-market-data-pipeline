import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Regression for PR #31: post-deployment evidence must not be a circular
// prerequisite to the first S1 deployment, and must remain mandatory for success.
const gates = readFileSync('docs/10_DEPLOYMENT_GATES.md', 'utf8');
const matrix = readFileSync('docs/14_MATRICE_EXIGENCES_RECETTE.md', 'utf8');
const headings = [...gates.matchAll(/^## (.+)$/gm)];
const preflightNames = ['Cadrage', 'Sécurité', 'Données', 'Calculs financiers', 'API et cockpit', 'Tests et observabilité', 'Staging', 'S1'];

test('S1 preflight and post-deployment gates are separate and ordered', () => {
  assert.deepEqual(headings.map((match) => match[1]), [...preflightNames, 'Après déploiement']);
  const postStart = gates.indexOf('## Après déploiement');
  const before = gates.slice(0, postStart);
  const after = gates.slice(postStart);
  assert.ok(postStart > 0);
  assert.match(before, /Validation humaine explicite de mise en production/);
  assert.doesNotMatch(before, /^- \[ \] \/health API et web en 200$/m);
  assert.match(after, /^- \[ \] \/health API et web en 200$/m);
  assert.match(after, /^- \[ \] Premier login Super Admin réussi$/m);
  assert.match(after, /^- \[ \] Sauvegarde post-déploiement créée$/m);
  assert.match(after, /^- \[ \] Rapport de déploiement ajouté au dépôt$/m);
});

test('production matrix preserves approval and forbids success before postflight', () => {
  const section = matrix.split('## 9. Gate de production')[1];
  assert.ok(section, 'production gate section missing');
  assert.match(section, /approbation humaine explicite/);
  assert.match(section, /gates préalables/);
  assert.match(section, /Après déploiement/);
  assert.match(section, /avant toute déclaration de succès/);
  assert.match(section, /contrôle non exécuté = succès interdit/);
});

test('all preflight and postflight gates remain unchecked pending real evidence', () => {
  const items = gates.match(/^- \[[ xX]\] /gm) ?? [];
  assert.ok(items.length >= 50, 'unexpected loss of gate checklist items');
  assert.equal(items.filter((item) => item !== '- [ ] ').length, 0);
});
