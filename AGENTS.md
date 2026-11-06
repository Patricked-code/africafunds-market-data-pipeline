# AGENTS.md — Règles de continuité pour toute IA

Ce dépôt est la mémoire technique et fonctionnelle du projet **AfricaFunds Market Data / SadiaAF**.

## Lecture obligatoire avant toute modification

Lire dans cet ordre :

1. `docs/00_PROJECT_MEMORY.md`
2. `docs/01_PRODUCT_VISION_SCOPE.md`
3. `docs/11_CAHIER_DE_CONCEPTION_MASTER.md`
4. `docs/02_ARCHITECTURE_TARGET.md`
5. `docs/12_ARCHITECTURE_DE_CONCEPTION_DETAILLEE.md`
6. `docs/03_DATA_GOVERNANCE_INTEROPERABILITY.md`
7. `docs/04_FINANCIAL_METHODOLOGIES.md`
8. `docs/13_MODE_DE_REALISATION_ET_PLAN_DE_LOTS.md`
9. `docs/14_MATRICE_EXIGENCES_RECETTE.md`
10. `docs/05_IMPLEMENTATION_ROADMAP.md`
11. `docs/06_CURRENT_STATUS_AND_GAPS.md`
12. `docs/07_AI_HANDOFF_PROTOCOL.md`
13. `docs/08_DECISION_LOG.md`
14. `docs/10_DEPLOYMENT_GATES.md`
15. `docs/09_CHANGELOG_WORKLOG.md` (commencer par l'entrée la plus récente et suivre le lien vers le dernier checkpoint de continuité)

Avant toute reprise après interruption ou parenthèse, consulter le **dernier checkpoint daté référencé par `docs/09_CHANGELOG_WORKLOG.md`** et vérifier l'état réel de GitHub (branches, SHAs, PR, CI). Les snapshots ne remplacent jamais cette vérification.

## Règles impératives

- Ne jamais prétendre qu’une fonction, un historique, un adaptateur ou un déploiement est terminé sans preuve reproductible.
- Ne jamais modifier directement la production ni supprimer un ancien service sans sauvegarde, précontrôle, recette et rollback.
- Ne jamais écraser une donnée brute, une observation publiée ou une méthodologie historique.
- Séparer strictement : source brute, extraction, normalisation, calcul, publication.
- Distinguer toujours un indice officiel importé d’un indice propriétaire AfricaFunds.
- Toute donnée calculée doit conserver la version méthodologique, le run, la provenance et le score de qualité.
- Toute modification de schéma, de mapping ou de méthode doit être versionnée et datée.
- Aucun secret, mot de passe, token, clé API ou fichier `.env` réel ne doit être committé.
- Travailler sur une branche dédiée, exécuter les tests, documenter les écarts, puis ouvrir une PR.
- Ne jamais déployer sur S1 tant que les critères de `docs/10_DEPLOYMENT_GATES.md` ne sont pas tous satisfaits et validés.

## Mise à jour documentaire obligatoire

Chaque PR fonctionnelle doit mettre à jour au minimum :

- `docs/06_CURRENT_STATUS_AND_GAPS.md` ;
- `docs/09_CHANGELOG_WORKLOG.md` ;
- `docs/08_DECISION_LOG.md` si une décision d’architecture ou de méthodologie change ;
- `docs/05_IMPLEMENTATION_ROADMAP.md` si le périmètre ou l’ordre des travaux change ;
- `docs/11_CAHIER_DE_CONCEPTION_MASTER.md`, `docs/12_ARCHITECTURE_DE_CONCEPTION_DETAILLEE.md`, `docs/13_MODE_DE_REALISATION_ET_PLAN_DE_LOTS.md` ou `docs/14_MATRICE_EXIGENCES_RECETTE.md` lorsque le cadrage maître concerné évolue.

## Définition de « terminé »

Une tâche est `DONE` uniquement si :

- le code est présent ;
- les migrations éventuelles sont présentes ;
- les tests sont présents et réussissent ;
- la documentation est mise à jour ;
- les données ou résultats sont contrôlés sur des cas réels ;
- aucune régression connue n’est introduite ;
- le statut est traçable dans le dépôt.
