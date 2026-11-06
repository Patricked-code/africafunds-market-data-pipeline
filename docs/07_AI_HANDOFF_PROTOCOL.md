# 07 — Protocole de reprise par une IA

## Au démarrage

Pour l'agent codeur Claude ou ChatGPT : suivre la boucle de travail et les contrôles de `docs/15_AUTONOMOUS_AGENT_EXECUTION.md` ; conserver les autorités et les lots existants.

1. Lire `AGENTS.md` et tous les fichiers `docs/00` à `docs/10`.
2. Lire l'entrée la plus récente de `docs/09_CHANGELOG_WORKLOG.md` et le checkpoint daté qui y est référencé (actuellement `docs/CONTINUITY_CHECKPOINT_2026-11-06.md`).
3. Vérifier la branche, le dernier commit, les PR et issues ouvertes ; réconcilier le checkpoint avec GitHub.
4. Vérifier l’état réel du code et des tests ; ne pas se fier uniquement au statut écrit.
5. Lire les migrations et le dictionnaire avant de modifier les données.
6. Identifier les secrets, serveurs et connecteurs disponibles sans les exposer.
7. Récupérer la tâche admissible, sa dépendance, sa branche/PR éventuelle et le `NEXT_ACTION` : reprendre avant de créer de nouveaux travaux ; s'il n'y a pas de runner autonome, ne pas prétendre exécuter les tâches après la fin de la session.

## Avant de coder

Documenter :

- objectif précis ;
- fichiers concernés ;
- tables et API touchées ;
- risques de régression ;
- données de test ;
- critères d’acceptation ;
- stratégie de rollback.

## Pendant le travail

- une branche par lot cohérent ;
- commits lisibles ;
- migrations additives autant que possible ;
- aucun changement de méthode sans nouvelle version ;
- aucune correction de données sans provenance et motif ;
- conserver les résultats bruts et les erreurs ;
- ajouter des tests de non-régression.

## Avant la PR

- lancer formatage, typecheck, tests et migrations de test ;
- vérifier les secrets ;
- mettre à jour statut, roadmap et worklog ;
- décrire précisément ce qui est terminé et ce qui ne l’est pas ;
- joindre exemples d’entrée/sortie et résultats de tests.

## Format de transmission obligatoire

```markdown
## Contexte
## Objectif du lot
## Changements réalisés
## Tables/migrations
## API/UI
## Tests exécutés
## Résultats
## Limites connues
## Risques
## Étapes suivantes
## Rollback
```

## Interdictions

- pas de commit direct sur `main` pour un changement substantiel ;
- pas de déploiement automatique implicite ;
- pas de suppression de données ou vhost sans sauvegarde validée ;
- pas de réécriture d’historique Git ;
- pas de statut `DONE` sur simple génération de code ;
- pas d’utilisation de valeurs fictives en production.

## Enchaînement entre deux travaux

Une fois une tâche validée, documentée et intégrée conformément aux gates, inscrire immédiatement son résultat dans GitHub, puis reprendre à l'étape `RECONCILIATION` du contrat continu pour sélectionner la tâche suivante sans nouveau prompt. Si une PR attend une validation non délégable, passer à une autre tâche indépendante et conserver l'attente, sans fusion forcée.

## Mise à jour de la mémoire

À la fin de chaque session, ajouter une entrée dans `docs/09_CHANGELOG_WORKLOG.md` avec date, branche, commit/PR, actions, tests, blocages et prochaine étape (`NEXT_ACTION`). Référencer un checkpoint daté lorsque la session change la phase du projet ou ferme une longue interruption. Une parenthèse ne remplace pas le `NEXT_ACTION` déjà acté ; la reprise doit vérifier l'actualité des preuves.
