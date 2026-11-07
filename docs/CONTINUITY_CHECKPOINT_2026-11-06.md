# Checkpoint de continuité — Audit AfricaFunds Market Data / SadiaAF — 2026-11-06

> **Statut :** photographie documentaire vérifiée le 6 novembre 2026. Cette note n'atteste **aucune exécution, aucun test, aucun déploiement**. Elle complète le journal canonique `docs/09_CHANGELOG_WORKLOG.md`, le protocole `docs/07_AI_HANDOFF_PROTOCOL.md` et les décisions `docs/08_DECISION_LOG.md`. Elle ne crée ni orchestrateur ni registre concurrent.

## Identité, autorité et provenance

| Champ | Valeur constatée |
|---|---|
| Projet | AfricaFunds Market Data Pipeline / plateforme cible SadiaAF |
| Dépôt | `Patricked-code/africafunds-market-data-pipeline` (privé) |
| Date de vérification | 2026-11-06 (Europe/Paris) |
| Branche de production documentaire de référence | `main` |
| SHA `main` observé au début de l'audit | `fb7ec155fc748b133a771564bbd4510e1546fc68` |
| Version déclarée du package | `0.2.0` |
| Support des preuves | Lecture de métadonnées GitHub, sources, migrations, documentation et PR via le connecteur GitHub Patricked-code |
| Exécutions effectuées pendant l'audit | Aucune ; pas de tests npm, PostgreSQL, S1, CI ni publication |
| Modifications lors de l'audit initial | Aucune ; présent checkpoint ajouté ultérieurement pour sa conservation dans Git |
| Travail suspendu | Audit terminé ; consolidation de la mémoire documentaire puis correction des risques P0 |
| Prochaine action du chantier principal | Réconcilier les PR #1 et #2, désigner les documents maîtres, revoir et valider les gates, puis démarrer les tests/CI et les corrections P0 sur branche gouvernée |
| Règle de reprise | Relire ce fichier, `AGENTS.md`, `docs/09_CHANGELOG_WORKLOG.md`, puis revérifier l'état actuel de GitHub ; ne jamais considérer un snapshot comme l'état temps réel |

## 1. Distinction des responsabilités — ne pas confondre les repositories

- **AfricaFunds** : produit/application métier et ses interfaces pour les utilisateurs. **Le code de cette application n'a pas été audité** dans la présente intervention.
- **AfricaFunds Market Data Pipeline** : dépôt du moteur d'acquisition, archivage, extraction, normalisation, qualité, calcul et diffusion de données financières. Il doit rester indépendant du seul produit AfricaFunds.
- **SadiaAF** : plateforme de données cible, autonome et interopérable, destinée à plusieurs applications/consommateurs. Le socle actuel du dépôt n'est pas la preuve que la plateforme cible est achevée.

Conséquence : ne pas transférer les fonctions UI/métier de l'application AfricaFunds dans le moteur de données par défaut ; définir les contrats d'interopérabilité après audit de chaque consommateur.

## 2. État GitHub vérifié le 2026-11-06

- `main` : `fb7ec155fc748b133a771564bbd4510e1546fc68` ; ce SHA est **un point d'observation**, pas une hypothèse sur le prochain HEAD.
- Branches observées : `main`, `docs/persistent-project-memory-20260731`, `docs/project-memory-v1-20260731`.
- PR #1 : <https://github.com/Patricked-code/africafunds-market-data-pipeline/pull/1> ; **OPEN / DRAFT**, non fusionnée au début de cette intervention ; branche `docs/persistent-project-memory-20260731`, SHA alors observé `c9a2456922a1055a55a2089ea7649018b79dac4a`. Elle propose `AGENTS.md`, les mémoires et documents `docs/00` à `docs/14`, dont cahier de conception, plan de **14 lots (0 à 13)**, protocole de reprise, worklog et gates.
- PR #2 : <https://github.com/Patricked-code/africafunds-market-data-pipeline/pull/2> ; **OPEN / DRAFT**, non fusionnée ; branche `docs/project-memory-v1-20260731`, SHA `bd660055227f5585f10a419d44c50e28c7d5fff4`. Elle propose un autre document `docs/PROJECT_MEMORY.md`. **Collision documentaire à arbitrer**, pas une divergence automatiquement résolue.
- Arbre Git de `main` inspecté : 96 entrées **fichiers et dossiers confondus**. Aucun `.github/workflows` ni `package-lock.json` observé. Aucun run GitHub Actions constaté lors de l'audit. Ne pas en déduire qu'il n'existe aucun CI externe.
- Aucun ticket issue indépendant des PR observé dans les résultats consultés.

## 3. Architecture réellement présente sur `main`

| Domaine | Fichiers / composants observés | Limites de la preuve |
|---|---|---|
| Registre des sources | `config/sources/*.json` : 11 marchés, **44 endpoints activés** dans les fichiers | Configuration, non preuve de collecte réelle |
| Collecte | `src/http/fetcher.ts`, `src/jobs/ingest.ts` | Robustesse HTTP / sécurité à tester |
| Archives | `src/archive/rawStore.ts` (SHA-256) | Historisation opérationnelle non attestée |
| Parsing | `src/parsers` HTML/CSV/XLSX | Couverture des formats non exhaustive |
| Orchestration | `src/jobs` ingestion, backfill, audit, scheduler, seed | Reprise, fenêtre temporelle et concurrence à corriger |
| Qualité | `src/quality/validate.ts` | Contrôles financiers incomplets |
| Calculs | `src/calc/indices.ts`, `src/calc/bonds.ts` | Moteurs cibles courbes/obligations non terminés |
| Données | Six fichiers dans `sql/migrations` | Migrations réelles PostgreSQL non exécutées lors de l'audit |
| API | `src/api/server.ts`, `queries.ts` | Lecture initiale, sans sécurité d'administration cible |
| UI | `web/` | Tableau de consultation initial, pas le cockpit Super Admin final |
| Déploiement | `deploy/s1/preflight.sh`, `deploy.sh`, `rollback.sh` | Aucune attestation d'exécution S1 ni rollback de données testé |

Endpoints configurés par marché : **MAR 5, GHA 4, UEMOA 4, TUN 4, EGY 6, NGA 4, KEN 4, CEMAC 3, BWA 3, NAM 5, ETH 2** (total 44).

Six endpoints `MANUAL_API_DISCOVERY` : `tun-bct-gosdmx`, `egy-cbe-conia`, `egy-cbe-conia-index`, `egy-cbe-interbank`, `egy-cbe-tbills`, `egy-cbe-tbonds`.

Routes observées : `/health`, `/api/v1/status`, `/api/v1/markets`, `/api/v1/sources`, `/api/v1/runs`, `/api/v1/backfill`, `/api/v1/indices`, `/api/v1/rates`.

Six migrations : `001_core.sql`, `002_market.sql`, `002_market_calc.sql`, `003_ops_quality.sql`, `004_views.sql`, `005_funds_categories.sql`.

Le statut historique `PROJECT_STATUS.md` mentionne **sept tests autonomes réussis dans son environnement d'origine**, sans installation npm complète, vérification PostgreSQL/Docker ni déploiement S1 à cette date historique. Ce résultat **n'a pas été reproduit le 6 novembre 2026**.

## 4. Risques P0 détectés par lecture statique — à reproduire et corriger

1. **Backfill historique** — `src/jobs/backfill.ts` lit `window_from/window_to` mais lance `runIngestion({endpointCode,mode:'discover'})` sans transmettre ces fenêtres. Le traitement peut ainsi parcourir des pages contemporaines au lieu de reconstruire l'historique demandé.
2. **Propagation des échecs** — `runIngestion()` peut enregistrer un échec d'endpoint sans le relancer ; le backfill appelant risque de déclarer `SUCCESS` sans réussite réelle. Définir résultat contractuel et tests RED/GREEN.
3. **Concurrence backfill** — `FOR UPDATE SKIP LOCKED` ne suffit pas si la prise et le marquage ne sont pas atomiques dans une transaction ; prévoir claim atomique, lease, récupération après crash et tests de concurrence.
4. **Idempotence SQL** — `market.raw_records UNIQUE(raw_artifact_id,sheet_name,row_number)` avec `sheet_name` nullable accepte des doublons à `NULL` dans une contrainte `UNIQUE` PostgreSQL standard. Prévoir migration additive avec dédoublonnage contrôlé, stratégie null-safe et tests.
5. **Réponses HTTP** — `src/http/fetcher.ts` peut retourner des erreurs 4xx/5xx en sortie sans classification terminale suffisante ; des pages d'erreurs peuvent être archivées comme contenu. Tester statuts, redirections, bornes de taille, rythme/robots et limites réseau.
6. **Qualité métier** — `src/quality/validate.ts` ne valide pas encore substantiellement dates économiques, maturités, taux, devises, fraîcheur, unités et anomalies financières.
7. **Sécurité de l'API** — routes de lecture non authentifiées et CORS `*` par défaut : non suffisantes pour la future administration ou exposition de données protégées.
8. **Déploiement destructif potentiel** — `deploy/s1/deploy.sh` opère sur les contenus vhost ; le rollback ne démontre pas de sauvegarde et restauration PostgreSQL ni de l'archive brute. **Ne pas exécuter sur S1** avant staging, sauvegardes vérifiées, restauration testée et autorisation explicite.
9. **Chaîne de preuves production absente de l'audit** — pas de chaîne attestée `source SHA → CI → artifact → deploy → runtime SHA` observée. Ne pas déclarer la production alignée.

**Catégorie de ces constats :** défauts ou risques issus de l'inspection de code. Ils ne sont pas des incidents constatés sur un serveur ni des résultats de tests réels.

## 5. Lots de réalisation à respecter, sans plan parallèle

L'autorité proposée dans la PR #1 est `docs/13_MODE_DE_REALISATION_ET_PLAN_DE_LOTS.md`, complétée par `docs/14_MATRICE_EXIGENCES_RECETTE.md`.

| Lot | Objectif existant | Statut démontré par cet audit |
|---|---|---|
| 0 | Documentation, mémoire et arbitrages | PR #1/#2 Draft ; convergence non validée |
| 1 | Sécurité, identité, MFA, RBAC, audit et bootstrap | Non démontré terminé |
| 2 | Dictionnaire et modèle canonique exécutable | Non démontré terminé |
| 3 | Interopérabilité multi-bases, mapping, drift, dry-run | Non démontré terminé |
| 4 | Adaptateurs officiels et historiques réels | Registre initial présent, couverture non attestée |
| 5 | Courbes et construction de taux | Non démontré terminé |
| 6 | Calculs obligataires et Total Return | Socle partiel, résultat final non attesté |
| 7 | Fonds, VL, catégories et benchmarks | Schéma partiel, résultats métier non attestés |
| 8 | Cockpit Super Admin | Non démontré terminé |
| 9 | API sécurisée, exports et webhooks | API initiale partielle |
| 10 | PostHog et observabilité | Non démontré terminé |
| 11 | CI, tests intégration, qualité, sécurité et reprise | Pas de CI ni de batterie complète vérifiés |
| 12 | Staging isolé, recette et rollback | Non attesté |
| 13 | Production S1 gouvernée | **Interdite** tant que les gates ne sont pas validés |

Le document `docs/10_DEPLOYMENT_GATES.md` impose des vérifications explicites avant toute production. **Aucune tâche n'est `DONE` par seule existence d'un document, code ou migration.**

## 6. Décisions, blocages et point de reprise

### Confirmé par les règles existantes

- Le dépôt Git doit être la **mémoire durable du projet** : `docs/08_DECISION_LOG.md`, **ADR-001 ACCEPTED** (31 juillet 2026).
- Pas de déploiement S1 avant les gates ; aucune écriture directe sur `main`, pas de Codex, pas de régression connue, pas de destruction sans sauvegarde et rollback.
- Une intervention se clôt avec sa branche, ses commits/PR, ses tests, ses preuves, ses limites et sa **prochaine étape** documentés dans le worklog.

### Reste à arbitrer

- Définir l'autorité de contenu entre la mémoire `docs/00_PROJECT_MEMORY.md` de la PR #1 et `docs/PROJECT_MEMORY.md` de la PR #2, sans écraser leurs informations.
- Revoir puis fusionner les PR documentaires après approbation ; ne pas confondre **fichier existant sur branche Draft** et **fichier fusionné dans `main`**.
- Prioriser le plan de correction P0, la CI et les tests de non-régression, avec des critères acceptés et un plan de rollback.

### Blocages prouvés / limites de vérification

- État runtime S1 et PostgreSQL **non consulté**.
- Couverture de l'historique réel **non attestée**.
- Aucune exécution locale ni CI effectuée dans l'audit.
- Absence de constat permettant de déclarer la production prête, déployée ou alignée.

### NEXT_ACTION — action unique du chantier principal

**Réconcilier les documents maîtres des PR #1 et #2, valider les décisions et les gates, puis établir les cas de tests pour corriger les risques P0 backfill/idempotence/concurrence/HTTP/déploiement, en suivant les lots existants.** Ne pas sauter directement au déploiement S1.

### Politique de checkpoint pour les futures sessions

Avant toute intervention :

1. Lire `AGENTS.md`, `docs/09_CHANGELOG_WORKLOG.md`, ce checkpoint et les documents maîtres ; identifier la **dernière entrée datée** et les PR encore ouvertes.
2. Relire `main`, la branche active, les commits, tests, workflows, issues et gates **au moment de la reprise** ; distinguer « vérifié à l'époque » de « vérifié maintenant ».
3. Préserver `NEXT_ACTION` durant les parenthèses. Une parenthèse n'autorise pas à changer le chantier principal.
4. Écrire sur une branche autorisée, PR, revue et tests ; actualiser **le worklog canonique**, les décisions et le statut. Créer un nouveau checkpoint daté si une bascule de phase ou une longue interruption le justifie.
5. Pour chaque fait indiquer : **observé**, **déduit du code**, **à tester**, **décidé**, **proposé** ou **attesté** ; conserver liens PR, commit SHA, logs CI, preuves de déploiement lorsqu'ils existent.
6. Ne jamais recopier automatiquement les statuts de ce fichier comme des vérités actuelles sans réconciliation GitHub.

## 7. Références GitHub à reprendre

- Dépôt : <https://github.com/Patricked-code/africafunds-market-data-pipeline>
- PR #1 — documentation/mémoire : <https://github.com/Patricked-code/africafunds-market-data-pipeline/pull/1>
- PR #2 — mémoire alternative : <https://github.com/Patricked-code/africafunds-market-data-pipeline/pull/2>
- Branches : `docs/persistent-project-memory-20260731` et `docs/project-memory-v1-20260731`.
- Autorités documentaires proposées (PR #1) : `AGENTS.md`, `docs/06_CURRENT_STATUS_AND_GAPS.md`, `docs/07_AI_HANDOFF_PROTOCOL.md`, `docs/08_DECISION_LOG.md`, `docs/09_CHANGELOG_WORKLOG.md`, `docs/10_DEPLOYMENT_GATES.md`, `docs/13_MODE_DE_REALISATION_ET_PLAN_DE_LOTS.md`, `docs/14_MATRICE_EXIGENCES_RECETTE.md`.

**Nature de ce document :** conservation des preuves et de la reprise, pas autorisation de déploiement ni déclaration de fin de chantier.
