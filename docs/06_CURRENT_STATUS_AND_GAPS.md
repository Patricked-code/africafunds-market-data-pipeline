# 06 — État réel et écarts

## 2026-11-24 — Lot 4 / PR #41 : durcissement des tokens JSON d'origine

- **CONTINUITY_ID** : SADIAAF-CONTINUITY-20261124-01. PR #37–#40 intégrées ; main ff23886d78f42a17656df88ab4a65d682b957833 protégée. Deux fusions documentaires natives démontrées, autonomie codeur complète non attestée.
- **CORRECTION CANDIDATE** : sur la branche existante PR #41, contrôle des représentations numériques avant admission par JSON.parse (refus d'un token mathématiquement non entier arrondi à un entier sûr, y compris sous-flux vers zéro), détection des clés objet dupliquées après décodage des échappements. Validation de lignes existante conservée, pas de nouvelle dépendance ni de modification ingestion. Quatre groupes de tests de régression ajoutés.
- **PREUVES / LIMITES** : CI #740 et Docker #603 SUCCESS sur l'ancien HEAD 070411cb2ff7cdc2416ce5e49fdad5fc92736034 uniquement ; tests ajoutés non exécutés au moment du commit, RED/GREEN séparés non attestés. Deux discussions doivent rester ouvertes jusqu'à vérification des corrections et checks du nouveau SHA. Pas de source officielle ni licence certifiée ; FR-004 et issue #14 restent PARTIAL.
- **NEXT_ACTION** : CI/Docker du nouveau SHA, correction si rouge, résolution argumentée des deux fils après preuve, fusion native si admissible ; poursuivre PR #36 et les autres travaux indépendants, issue #9 et six chantiers sans collision, aucun S1.


## 2026-11-24 — Lot 4 / chantier #14 : admission JSON structurée sans source officiellement qualifiée

- **BASE RÉCONCILIÉE** : `main` protégée au commit ff23886d78f42a17656df88ab4a65d682b957833 ; CI #738 SUCCESS ; PR fonctionnelles #22 et #25–#36 ouvertes, dont #35 sur CSV et #36 sur ingestion, non modifiées. Programme 14 lots 0–13 et 6 chantiers issues #5/#13–#17 maintenu.
- **LACUNE CONSTATÉE** : les parseurs déjà présents couvrent `src/parsers/html.ts`, `csv.ts`, `xlsx.ts`. Aucun parseur JSON générique ne figure dans `src/parsers` sur ce SHA. Le cahier de conception prévoit JSON/XML-SDMX/PDF, sous qualification des droits et champs sources.
- **MODIFICATION ISOLÉE** : ajout de `src/parsers/json.ts` avec `parseFinancialJsonDocument` pour tableaux d'objets plats ou enveloppes `data`/`records`, limites de taille/lignes/colonnes, refus des documents ambigus, champs dangereux, structures imbriquées, entiers non sûrs ou nombres décimaux JSON potentiellement arrondis par `JSON.parse`. Les valeurs financières décimales doivent être fournies comme chaînes ou attendre un mapping lossless source-spécifique ; aucune transformation de date, devise, maturité ou qualité n'est supposée.
- **TESTS** : `test/json-document-admission.test.ts` vérifie tableaux, enveloppes, cas vides, champs, sécurité, taille et précision ; CI et Docker sur HEAD de la PR à vérifier avant READY. Aucun endpoint officiel contacté, aucune licence supposée, aucun changement de `src/jobs/ingest.ts`, aucune écriture DB/S1.
- **STATUT** : `PARTIAL` — composant de parsing disponible en branche candidate, **pas** un adaptateur CBE/GOSDMX pleinement fonctionnel, ni une qualification des 44 sources, ni une recette de données financières. Aucun faux `SUCCESS` ni `HISTORY_COMPLETE`.
- **BLOCK_REASON** : schémas JSON spécifiques, endpoints officiels, mappings dates/valeurs/droits et formats JSON-SDMX non encore attestés. PR à tester/intégrer ; les opérations d'ingestion globales sont occupées par PR #26/#36.
- **NEXT_ACTION** : vérifier tests exact SHA, faire qualifier cette PR ordinaire sous auto-merge gouverné ; poursuivre l'issue #14 par contrats de chaque source, témoins officiels autorisés, mapping économique et intégration dans un adaptateur qualifié, sans collision avec les branches CSV/ingestion.


## 2026-11-24 — Lot 11 : intégration automatique native démontrée sur première PR pilote

- **PROUVÉ** : PR #37 fusionnée dans main, squash ed78d253fbce9b5f94b9ef4d9a38803c6b63d417, CI #733 SUCCESS, Docker #597 SUCCESS, 4/4 fils résolus ; ruleset GitHub #27937019, approvals ordinaires 0 et checks validate/Docker obligatoires préservés.
- **PREMIER PILOTE E2E DU MERGE NATIF** : PR #38 READY, seul docs/09, label automerge-eligible ; CI #735 et Docker #599 SUCCESS ; workflow_run auto-merge #5 SUCCESS depuis code main ; GitHub API auto_merge enabled_by github-actions[bot] puis PR #38 merged=true avec SHA ffdf04a6fcb534fa1c807cafb867d9de998320d2. Aucune fusion directe de la PR #38 effectuée par le connecteur.
- **RESTE À PROUVER** : second cycle pilote de la mise à jour documentaire présente ; recrutement/installation réelle d'un exécuteur codeur auto-géré si déjà disponible, 2 tâches de développement distinctes enchaînées, claims atomiques inter-agent, retour après panne, gestion CI rouge et licences/données sources ; aucun agent 24h/24 ni plateforme S1 en production ne sont certifiés par la recette GitHub.
- **RISQUES** : l'auto-merge natif doit rester limité aux PR internes non sensibles qualifiées, SHA exact, workflow_run authentique, diffusion du label par propriétaire ; les PR sensibles et les opérations S1 relèvent des autorisations gouvernées.
- **NEXT_ACTION** : valider cette seconde PR documentaire et le mécanisme de merge natif via CI/Docker ; puis poursuivre PR métier #36, les six chantiers #5/#13–#17 et les 14 lots selon dépendances et gates, sans refaire GitHub ruleset ni créer de seconde autorité.

## 2026-11-23 — Lot 11 : sécurisation de l'admission auto-merge, protections et CI partagée

- **État GitHub actuel vérifié** : dépôt public, `main=73256f48d81d38ce8ff6f51be9e024b25cf5dadb`, protected=true, ruleset #27937019 ACTIF, zéro revue obligatoire, `validate` et Docker/PostgreSQL requis strictement, `allow_auto_merge=true`. Les anciens diagnostics `main` non protégée / auto-merge désactivé sont historiques et remplacés.
- **PR #37** : workflow d'enrôlement natif sécurisé et distinct du développement métier, toujours OPEN/Draft et non fusionné. CI #708 et Docker #572 SUCCESS sur checkpoint précédent `7fdebb49`. Aucun test de fusion native en production GitHub encore effectué ; pas de déclaration d'autonomie intégrale.
- **Protection complémentaire ajoutée** : code `scripts/ci/governed-native-automerge.mjs` refuse désormais une PR qui modifierait `.github/**`, `deploy/**`, `sql/**`, `config/**`, la configuration de sécurité, les secrets, contrats de déploiement, règles d'agent ou des dépendances. Une liste de fichiers GitHub incomplète, dupliquée, anormale ou dépassant 500 éléments bloque l'enrôlement. Les renames sont inspectés sur les anciens ET nouveaux chemins. Test de non-régression ajouté.
- **Preuve de correction réelle** : la CI #710 a fait échouer 1/81 tests de politique sur `scripts/credentials-init.sh` : le filtre n'identifiait pas `credentials` au pluriel. Commit `022ade7eb238bc59a9b4c52ed6fc2539ac089544` corrige cette classe de chemins. Aucune affirmation de PASS avant la conclusion des runs plus récents.
- **Risque de CI intermittente** : `test/integration/backfill-claim.test.ts` et `test/integration/backfill-window.test.ts` partagent PostgreSQL CI et revendiquent globalement le premier job disponible ; exécution simultanée des fichiers peut les perturber. Le script npm `test:integration` est maintenant paramétré `--test-concurrency=1` (commit `c76bd26406a7bb4325d8f31f829a18b6052390ef`), sérialisant les fichiers sans supprimer la véritable concurrence entre workers testée dans un fichier. Hypothèse de cause encore à confirmer par passages répétés ; issue #5 renseignée sans modifier la PR #22.
- **BLOCK_REASON** : intégration PR #37 non effectuée, usage GITHUB_TOKEN réel pour lecture du ruleset/activation native non attesté, événement GitHub public `pull_request_target` à qualifier, PR pilote non exécutée, stabilité CI historique à confirmer. Les changements de sécurité/sources sous licence/production S1 ne sont PAS rendus auto-merge éligibles par une simple étiquette.
- **NEXT_ACTION** : vérifier CI #712 et Docker #576 sur le commit `c76bd264` ; corriger et retester chaque échec ; valider les nouveaux tests de périmètre, le contrat token et la sécurité de l'événement ; rendre la PR prête seulement sous ses propres gates, sans fusion implicite d'une PR de gouvernance sensible ; démontrer ensuite l'auto-merge natif sur une PR pilote non sensible. Poursuivre les lots 0–13 sur leurs branches propriétaires sans collision, puis staging S1 avant production autorisée.


## 2026-11-23 — Lot 11 / issues #3 et #9 : préparation de l'auto-merge natif GitHub

- **État GitHub vérifié :** dépôt public, `main=73256f48d81d38ce8ff6f51be9e024b25cf5dadb`, `protected=false`, rulesets `[]`, `allow_auto_merge=false` ; PR #36 Draft, sans review indépendante, HEAD `df0129b625798147eb1dc3f283fcbd7fd19fac99`. Aucun mécanisme de fusion autonome n'est actuellement activé.
- **Travail réalisé sur branche indépendante :** création d'un vérificateur fail-closed d'éligibilité `scripts/ci/governed-native-automerge.mjs`, ses 24 tests de politique, dont quatre scénarios de révocation, et d'un workflow GitHub Actions exploitant le code de `main` seulement. Extension additive de la CI existante pour les tests du vérificateur, et exécution du smoke Docker sur toute PR afin de le rendre réellement exigible. Pas de mutation de settings/admin, pas de fusion, pas de S1.
- **Gates :** exigence d'une protection réelle de `main` (checks `validate` et Docker obligatoires, branche à jour, revue indépendante requise, approbations obsolètes rejetées, fils résolus, admin inclus), de l'option native Allow auto-merge, d'une PR non Draft et d'un label de préparation posé après contrôles de l'agent. Le workflow ne fait jamais de merge direct ; il révoque également l'enrôlement natif lorsque le label de préparation est retiré, lorsque la PR repasse en Draft ou lorsque les gates deviennent non conformes lors d'un événement de PR.
- **État des tests :** code committé sur branche, CI GitHub de cette branche à observer à l'ouverture de PR. Pas de test déclaré PASS avant la fin de son workflow.
- **BLOCK_REASON :** protection et allow-auto-merge actuellement absents, accès d'administration non disponible dans le connecteur GitHub, acteur indépendant de revue automatique non attesté. L'outil GitHub ne peut pas activer la configuration du dépôt via les fonctions actuellement disponibles.
- **NEXT_ACTION :** contrôler la PR #37 ouverte en Draft, CI et Docker sur son HEAD exact ; appliquer et attester une fois la protection main et Allow auto-merge par un moyen admin autorisé ; intégrer la PR seulement après revue indépendante ; tester l'enrôlement auto-merge natif sur une PR pilote sans bypass, puis reprendre les lots 0–13. Aucun besoin d'intervention humaine à chaque développement si un reviewer indépendant automatisé effectivement habilité intervient.


## Audit S1 et sécurité de déploiement — 2026-11-07

- **PREUVE SERVEUR READ-ONLY** : les domaines `sadiaaf.wealthtechinnovations.com` et `api.sadiaaf.wealthtechinnovations.com` existent et répondent tous deux **HTTP 500** à `curl -I` depuis S1 ; aucun dépôt Git racine dans leurs vhosts ; le seul conteneur Docker actif observé est le bridge MCP. Cela n'atteste pas l'absence d'autres bases/service hors Docker.
- **CAPACITÉ STOCKAGE** : volume racine S1 77 Go dont environ 20 Go libres, 74 % utilisés ; capacité à dimensionner avant une archive historique en continu. Aucun stockage PostgreSQL SadiaAF ni backup/restauration de sa DB n'est attesté.
- **RISQUE DÉCOUVERT** : `deploy/s1/deploy.sh` en `main` permettait le purge des deux vhosts et ne fixait pas le nom Docker Compose entre releases (nouvelle base/volume possible). Il démarrait automatiquement le collecteur sans qualification des sources.
- **BRANCHE CORRECTIVE — PARTIAL tant que CI/PR non attestées** : `fix/sadiaaf-s1-stable-db-safe-rollout-20261107` ajoute protection explicite du cutover, préservation des vhosts, stabilité du projet Docker/volume PostgreSQL, démarrage opt-in du collecteur, scheduler false par défaut, rollback préservant les contenus et tests Node/shell intégrés à la CI. Preuves complètes : `docs/S1_DEPLOYMENT_READINESS_20261107.md`.
- **S1 PRODUCTION : BLOCKED** par `docs/10_DEPLOYMENT_GATES.md`. Aucun déploiement ni création de base exécuté par cette branche ; l'API métier n'a pas encore les contrôles RBAC attendus.
- **NEXT_ACTION** : PR + CI exactes de la sécurité de déploiement, qualification d'un staging S1 isolé puis PostgreSQL/seed/API en loopback et une collecte de source autorisée ; enfin sauvegarde/restauration DB/raw et tests avant basculement de domaine.

---

## Intégration vérifiée sur main — 2026-11-07

- **GitHub : DONE pour cinq intégrations de code**, avec [branche de sauvegarde](https://github.com/Patricked-code/africafunds-market-data-pipeline/tree/backup/main-before-pr-integration-20261107). `main` a reçu, par PR fusionnées et contrôlées, #4 (CI), #11 (HTTP), #12 (backfill fail-closed), #18 (44 sources et preuve), #10 (lignes brutes idempotentes). HEAD attesté après la 5e fusion `6401c282b8905db7b817eafee704f6e963b554de` ; [CI sur ce SHA #42386577024](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42386577024) **SUCCESS**. Ne jamais appliquer sur base existante la migration #10 sans audit des doublons, backup/restore.
- **Documentation : PARTIAL tant que PR #1 n'est pas fusionnée** ; ses fichiers couvrent les 14 lots, la mémoire canonique, les ADR, le worklog et l'annexe de PR #2. Le corps de l'ancienne mémoire PR #2 est préservé ; pas de fusion redondante ni perte d'origine.
- **Backfill historique : PARTIAL**. Le code pour bloquer les faux succès est sur `main`, mais **0 adaptateur historique date-bounded officiellement prouvé** n'est déclaré prêt ; la reprise de tâches RUNNING expirées, les leases/fencing et l'ingestion historique légale restent à construire.
- **Données financières : PARTIAL / non certifiées**. 44 endpoints sont dans l'inventaire, aucun historique complet/licence publication prouvé ; six adaptateurs CBE/BCT bloqués faute de contrat et d'exemple, et les familles fonds/VL, inflation, FX manquent de couverture validée.
- **Publication S1 : NOT_STARTED** ; le merge GitHub n'a pas déclenché la production ni une migration sur les bases réelles. Les gates de `docs/10_DEPLOYMENT_GATES.md` restent applicables.
- **Gouvernance : DONE pour la décision** de dépôt privé et `main` sans protection sur demande propriétaire (ADR-014), **pas** pour une protection serveur enforced.
- **NEXT_ACTION** : fusionner la PR #1 après CI exacte, clore #2 seulement après vérification de l'annexe, puis développer la vraie reprise du backfill et les adaptateurs officiels via PR/CI, sans nouveau projet parallèle.

---

## État vérifié le 2026-11-07 — gouvernance GitHub, qualification et backfill

- **Confidentialité** : dépôt `Patricked-code/africafunds-market-data-pipeline` vérifié `private` sur l'API GitHub. Le propriétaire a explicitement demandé le retrait de la protection : `main.protected=false` est **volontaire** ; ne pas réactiver automatiquement. Les contrôles GitHub de branche ne sont pas enforced ; branches Draft, CI, revue des différences, preuve et rollback restent nécessaires avant intégration.
- **Lot 11, CI** : la PR Draft #4 fournit Node 22/PostgreSQL 16, typecheck, tests, build, migrations/seed ; les PR empilées ne sont pas fusionnées. La PR #12 a une CI [#42384942885](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42384942885) **SUCCESS** sur HEAD exact `bff304dbfe76a6ea38e8d3d3b7fca24319ef3450`, y compris tests PostgreSQL concurrents et historique.
- **Lot 4, issue #5** : claim atomique existant `FOR UPDATE SKIP LOCKED` conservé. Une ancienne erreur permettait de marquer une fenêtre d'historique `SUCCESS` via la découverte générique sans appliquer ses dates. Correctif additif sur PR #12 : l'ingestion historique non couverte explicitement passe désormais `BLOCKED_ADAPTER` **sans appel réseau**, avec fenêtres et raison tracées. Cela corrige une **fausse certification**, pas le backfill historique lui-même ; `RUNNING` expirés et leases/fencing restent à faire.
- **Lot 4, issues #13 et #14** : PR #18 [audit source #42383683377](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42383683377) **SUCCESS** sur `cc05846f59254ec5ee9ac15e4d6303b4fcfdd96b`. Artifact 44 endpoints : 14 HEAD 200 non certifiés, 27 non sondés, 2 HTTP 403, 1 HTTP 404, **0 historique complet/0 publiable** ; les six adaptateurs CBE/GOSDMX sont toujours non qualifiés.
- **Dépendances** : sources et droits (#13/#14) → adapter date/format/fixtures (#14) → backfill fiable fenêtres et lease (#5) → normalisation/qualité (#15) → sources FX/inflation/fonds/VL (#16) → recettes marché par marché (#17). Un statut `BLOCKED_ADAPTER` n'est pas une panne prouvée d'institution et ne peut pas être confondu avec un historique certifié.
- **Gates** : aucun fichier de registre brut, archive historique, migration de prod, fusion `main` ou déploiement S1 modifié par cette reprise. Sécurité effective, licence, données témoins, sauvegarde, tests, preuves et rollback restent requis.
- **NEXT_ACTION** : qualifier un premier vrai adaptateur borné `ingestWindow` à partir de sources officielles autorisées et d'échantillons avec dates, puis reprendre récupération atomique sûre des jobs RUNNING expirés avec tests de concurrence et absence de faux succès.

---

Dernière mise à jour : 2026-07-31.

## Statuts autorisés

- `DONE` : code, tests, documentation et contrôle réel terminés.
- `PARTIAL` : socle présent, couverture incomplète.
- `DESIGNED` : spécifié mais non implémenté.
- `BLOCKED` : dépendance ou accès manquant.
- `NOT_STARTED` : non commencé.

## État actuel

| Domaine | Statut | Preuve / limite |
|---|---|---|
| Dépôt GitHub | DONE | Dépôt privé accessible, branche `main` existante |
| Registre des marchés/sources | PARTIAL | 11 marchés et endpoints initiaux ; audit source par source restant |
| Collecteur HTTP générique | PARTIAL | Téléchargement, retries et découverte ; adaptateurs spécifiques incomplets |
| Archive brute SHA-256 | PARTIAL | Socle présent ; stockage objet/retention production à définir |
| Parseurs HTML/CSV/Excel | PARTIAL | Génériques présents ; PDF et formats dynamiques incomplets |
| PostgreSQL et migrations | PARTIAL | DDL présent ; validation réelle complète à faire |
| Backfill et scheduler | PARTIAL | Mécanisme présent ; historiques non exécutés/contrôlés intégralement |
| API de lecture | PARTIAL | Endpoints de supervision ; API métier complète absente |
| Dashboard | PARTIAL | Supervision en lecture seule ; pas de Super Admin |
| Authentification/RBAC/MFA | NOT_STARTED | À construire |
| Modèle canonique exécutable | DESIGNED | Dictionnaire partiel, pas de registre complet de champs |
| Interopérabilité multi-bases | DESIGNED | Schéma et mappings à implémenter |
| Adaptateurs Égypte | BLOCKED/PARTIAL | APIs dynamiques CBE/EGX à finaliser |
| Adaptateurs Tunisie | BLOCKED/PARTIAL | GOSDMX/SDMX à finaliser |
| Adaptateurs Kenya | PARTIAL | CBK/NSE/PDMO à auditer et tester |
| PDF UMOA-Titres/BEAC | NOT_STARTED/PARTIAL | Normalisation détaillée manquante |
| Courbes de taux | DESIGNED/PARTIAL | Tables/fonctions de base ; moteur complet non validé |
| Classification CT/MT/LT | DESIGNED/PARTIAL | Règles définies ; moteur quotidien complet à tester |
| Total Return obligataire | DESIGNED/PARTIAL | Fonctions de base ; moteur industriel incomplet |
| Indices catégories de fonds | DESIGNED | Non finalisés |
| Benchmarks plateforme | DESIGNED | Méthodologies/pondérations finales à valider |
| PostHog | NOT_STARTED | Projet accessible mais aucun événement AfricaFunds confirmé |
| CI et tests complets | PARTIAL | Tests limités ; PostgreSQL, sécurité, charge et restauration à ajouter |
| Staging | NOT_STARTED | À créer |
| Production S1 | BLOCKED/VOLONTAIRE | Ne pas déployer avant validation des gates |
| Bridge S1 | BLOCKED | Connecteur indisponible dans la conversation au 2026-07-31 |

## Risques principaux

- déclarer un historique complet alors que des pages dynamiques restent inconnues ;
- confondre taux, prix, rendement et niveau d’indice ;
- compter plusieurs classes d’un même portefeuille ;
- utiliser des données futures dans une reconstruction historique ;
- publier une vue EUR/USD avec un FX obsolète ;
- synchroniser vers une base externe avec un mapping non validé ;
- déployer avant la sécurité, les tests et le rollback.

## Prochaine tâche recommandée

Commencer Phase 1 et Phase 2 sur une branche fonctionnelle : identité/RBAC/audit, modèle canonique, tables d’intégration et contrats de données. Aucun déploiement production.


## Vérification complémentaire du 2026-11-07 — qualification des sources

- **Inventaire confirmé sur `main`** : 11 marchés/zones, 44 endpoints, 6 familles activement configurées, dont 6 `MANUAL_API_DISCOVERY` (5 CBE Égypte, 1 GOSDMX Tunisie). Les 44 URL sont des valeurs de registre, pas des accès réussis.
- **Catalogue de familles insuffisant pour la cible** : FX = 1 source (Maroc) ; 0 endpoint `INFLATION` ; 0 endpoint dédié fonds/VL. Candidatures officielles identifiées pour FX et inflation CBE mais pas encore intégrées ni certifiées ; issue #16.
- **Qualification en cours** : issue #13, PR #18, matrice `docs/SOURCE_QUALIFICATION_BASELINE_20261107.md` sur la branche PR #18 ; workflow indépendant de contrôle read-only HTTPS/robots, tests Node.js et artefacts de résultats. **Aucune source n'a été qualifiée HISTORY_COMPLETE sur cette base.**
- **Adaptateurs** : issue #14 (CBE/GOSDMX, PDF/JSON/SDMX), les pages officielles sont identifiées, mais protocoles et fixtures historiques restent à confirmer ; statut `BLOCKED/PARTIAL`, aucune adaptation implémentée ou démontrée ici.
- **Backfill** : PR #12 contient des corrections P0, dernière CI du HEAD `ab45f3ffe175f69e45ba3f06ffe3b033185c6e3e` run 42313428780 SUCCESS vérifié, mais des fenêtres réelles et la reprise des RUNNING expirés restent incomplètes ; issue #5 non DONE.
- **Normalisation/recette** : issues #15/#17 ouvertes ; PostgreSQL et méthodes financières existants, chaîne raw→canonical→calc→publish non attestée pour 11 marchés.
- **Protection de main** : dernière vérification `protected=false` ; aucun merge/déploiement autorisé par ce checkpoint. Vérifier de nouveau à chaque reprise.
