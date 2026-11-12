# 06 — État réel et écarts

## 2026-11-12 20:35 Europe/Paris — PR #28 : espaces blancs exclus du score (PARTIAL)

- 15 tests de régression dans `test/quality-rows-regression.test.ts` (13 précédents + 2 nouveaux). Commits `831b0cd8e2d2d3d196ffc93f3793895b23b938e8` (tests) et `99ba82ee086f8e25fa3b2c82d25bab3d40bea41a` (correctif) : une chaîne ne contenant que des espaces/tabulations/retours ligne n'est plus considérée comme une donnée structurelle. `0` et `false` restent présents ; aucune modification des sources ou schémas.
- CI du précédent HEAD `8f2560a05b798ccae519cce087d4afc667e81f22` : deux runs `43281484881` et `43281484696`, completed/success. **Les deux nouveaux tests et le correctif ne sont pas encore attestés par CI** ; RED non exécuté séparément.
- BLOCK_REASON : PR Draft sans revue indépendante ; CI du nouveau HEAD à contrôler ; licences, adaptateurs officiels, normalisation et historiques réels non certifiés.
- NEXT_ACTION : contrôler CI exact-HEAD, corriger les échecs éventuels, solliciter revue habilitée et reprendre un lot fonctionnel indépendant après réconciliation des claims. Aucune fusion ni S1.

---


## 2026-11-12 15:40 Europe/Paris — PR #28 : deux tests mixtes supplémentaires (PARTIAL)

- Onze tests de régression dans `test/quality-rows-regression.test.ts` sur branche Draft, dont deux cas limites mixtes ajoutés au commit `955e01d39cbb85c294cf71d1cd7022d9f36c9548`. Le correctif de production `undefined` préexistant est conservé, sans autre modification de production.
- Sur le HEAD précédent `92a6ada2fa2e5f460ad8809a1b3e80449722f8b1`, CI [43228457956](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/43228457956) et Docker/PostgreSQL [43228457736](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/43228457736) : completed/success. Les deux nouveaux tests ne sont **pas** validés par ces runs ; CI du nouveau HEAD NOT_YET_ATTESTED.
- BLOCK_REASON : PR Draft sans revue indépendante, gates de fusion non attestés ; contrats/licences/fixtures et données financières réelles non certifiés.
- NEXT_ACTION : contrôler CI exact-HEAD et revue ; poursuivre issue #15 ou #14 seulement sur périmètre indépendant et après vérification des claims. Aucun HISTORY_COMPLETE ni S1.

---


## 2026-11-12 14:31 Europe/Paris — PR #28, qualité structurelle : correction de statut et preuve CI (PARTIAL)

- Neuf tests de régression sur la branche Draft, et correction minimale de production dans `src/quality/validate.ts` : `undefined` est absent pour la couverture ; zéro numérique et `false` restent présents. Cette entrée corrige le statut antérieur obsolète (« quatre tests, aucun changement de production »).
- CI exact-HEAD du commit documentaire `46d4e66090968273432529a03eb824e1289e4ae9` : [CI 43218891785](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/43218891785) et [Docker/PostgreSQL 43218891794](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/43218891794), toutes deux completed/success. Job CI `131185054175` completed/success (typecheck, unit, build, migrations, intégration PostgreSQL, backfill). Ce résultat ne certifie pas les données financières réelles.
- Revue indépendante : `reviews=[]` au contrôle ; PR #28 Draft, aucune fusion. Dépôt private selon GitHub. Les PR #22/#25/#26/#27 restent ouvertes.
- **BLOCK_REASON** : revue/gates de fusion non attestés ; contrats et fixtures CBE/GOSDMX, licences, normalisation SQL et HISTORY_COMPLETE non certifiés.
- **NEXT_ACTION** : demander revue indépendante habilitée, maintenir Draft sans merge, puis poursuivre les adaptateurs/normalisation sur périmètre non revendiqué après réconciliation des claims. CI du commit de cette documentation à contrôler séparément.

---


## 2026-11-12 — Lot 11 / issue #15 / PR #28 : invariants de qualité structurelle (PARTIAL)

- Quatre tests additifs pour `validateRows` sur branche Draft : zéro numérique présent, extraction vide, valeurs nulles/vides et score de couverture partielle. Pas de changement du code de production.
- Preuve GitHub sur HEAD initial `ca9c208c002be229486bcae5de71dde56e4ea9b1` : CI run [43149453473](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/43149453473), job validate 130954914950 completed/success, tests unitaires et PostgreSQL inclus. Tests locaux NOT_RUN. La CI du nouveau HEAD documentaire reste à vérifier.
- **PARTIAL / BLOCK_REASON** : aucune validation sémantique financière, source officielle/licence/fixture, mapping par endpoint, writer normalisé, revue indépendante ou autorisation de fusion attestés. Ne pas confondre qualité de structure et observation financière publiable.
- **NEXT_ACTION** : vérifier CI finale de PR #28, obtenir revue indépendante, puis poursuivre mapping financier autorisé et intégration dans les tables existantes sans collision avec les PR concurrentes. Aucun HISTORY_COMPLETE ni S1.

---


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
