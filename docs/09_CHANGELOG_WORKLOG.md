# 09 — Journal de travail et continuité

Ce journal décrit les travaux réellement effectués. Ajouter les nouvelles entrées en tête.

## 2026-11-06 23:38 Europe/Paris — P0 #5 : claim atomique PostgreSQL dans PR #12

- **RECONCILIATION** : branche `main` SHA `fb7ec155fc748b133a771564bbd4510e1546fc68`, `protected=false`. PR #1/#2/#4/#10/#11/#12 ouvertes, pas de fusion. Issues ouvertes #3/#5/#6/#7/#8/#9. CI précédente PR #12 run [42297570871](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42297570871) SUCCESS pour SHA `73da818a44ef4942d845f3a0d0aa0848be200e20` (preuve valable pour cet ancien SHA uniquement).
- **ACTION_EFFECTIVE** : poursuite sur la PR [#12](https://github.com/Patricked-code/africafunds-market-data-pipeline/pull/12) et sa branche existante `fix/backfill-failure-propagation-20261106` ; remplacement de la séquence dangereuse SELECT FOR UPDATE puis UPDATE via pool.query (verrou relâché entre deux appels) par une instruction atomique `WITH candidates ... FOR UPDATE SKIP LOCKED ... UPDATE ... RETURNING` dans `src/jobs/backfillClaim.ts`. `src/jobs/backfill.ts` utilise le claim atomique et ne répète plus la mise à jour RUNNING. Le compteur `attempts` est incrémenté une seule fois ; la valeur antérieure est retournée pour conserver le seuil de retry existant.
- **TESTS** : `test/backfill-claim.test.ts` contient deux tests de contrat SQL (sélection et transition atomique). Il s'agit de vérifications de structure, **pas d'une preuve de concurrence multi-workers PostgreSQL**. CI du nouveau HEAD `e75fb6927be4e4d101d1b51c2bf6c30b8715ce6b` : [run 42306338209](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42306338209) PENDING au dernier contrôle ; résultat final non encore attesté. Commits intermédiaires `be8a55ce123d18df5da6eecff1af71daffa0c9db`, `338bcd35da73d9bbd9a7b4623180d4378a334dae`, `2c78e03015df0311b1a2073ac4bc6ab81b407814`.
- **BLOCK_REASON** : protection main #3 non résolue ; CI du HEAD actuel à vérifier ; aucune recette de concurrence PostgreSQL réelle ; aucun mécanisme de récupération des RUNNING abandonnés ; fenêtres historiques `window_from/window_to` non utilisées pour découvrir les données de la période ; runner codeur hébergé #9 non attesté. PR #12 demeure PARTIAL/Draft, pas de merge ni déploiement S1.
- **NEXT_ACTION** : vérifier le run CI 42306338209 sur SHA exact ; ajouter un test d'intégration PostgreSQL à deux connexions prouvant l'exclusion atomique, puis reprise des RUNNING expirés avec bail et tests, sans récupérer des travaux encore actifs. Ensuite traiter la propagation effective des fenêtres historiques et les protections HTTP #7, en conservant les gates de #3. Ne jamais déclarer l'issue #5 DONE avant ces preuves.
- **Rollback** : modifications limitées à la branche de PR #12, sans migration, sans écriture serveur et sans modification de `main`.

---

## 2026-11-06 — Règle fondamentale confirmée : achever en faisant évoluer le socle réel

- **Mandat propriétaire confirmé** : partir du socle industriel existant AfricaFunds Market Data Pipeline, y ajouter les fonctions manquantes, compléter ce qui était prévu, corriger les faiblesses et sélectionner les meilleures évolutions utiles **sans destruction, duplication ni refonte injustifiée**.
- **Socle vérifié** : `src/jobs/scheduler.ts`, `ingest.ts`, `backfill.ts`, `src/http/fetcher.ts`, `src/archive/rawStore.ts`, parseurs, PostgreSQL, `src/quality/validate.ts`, fonctions `src/calc`, API et `docker-compose.yml`. Enchaînement initial collecte/archivage/ingestion réel dans le code ; normalisation→calculs complets→publication et reprise historique robuste encore incomplets. Ne pas confondre présence de code et fonctionnement attesté en production.
- **Conservation dans GitHub** : ajout d'ADR-012 au registre de décisions et renforcement d'`AGENTS.md` avec méthode INVENTORIER → CARTOGRAPHIER → PRÉSERVER → COMPLÉTER → ÉVALUER → VALIDER. Aucune modification métier, aucun merge, aucun déploiement.
- **Continuité inchangée** : dernière PR technique connue #12 (`fix/backfill-failure-propagation-20261106`, SHA historique `73da818a44ef4942d845f3a0d0aa0848be200e20`), CI [run 42297570871](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42297570871) `SUCCESS` observé. Protection `main` #3 non résolue au dernier contrôle ; revérifier le dépôt à la reprise.
- **NEXT_ACTION** : reprendre les PR/CI et le dernier `NEXT_ACTION` effectivement actifs ; terminer le backfill #5 (fenêtres, claim et récupération) et protections HTTP #7, traiter les gates et le raccordement de l'exécuteur #9 sans nouvel orchestrateur concurrent, conformément aux 14 lots. Continuer à préserver l'industrialisation de données existante.

---

## 2026-11-06 22:31 Europe/Paris — Exécution autonome : correctif backfill partiel PR #12

- **RECONCILIATION** : `main` `fb7ec155fc748b133a771564bbd4510e1546fc68`, `protected=false`; PR #1/#2/#4/#10/#11 Draft non fusionnées à la lecture ; CI #4 run 42290548842 SUCCESS pour `b307202921e66c395f7d0454868a462cc36c6158`, CI #11 run 42292780013 SUCCESS pour `15fa74875ea91dfccc50dc238d9bb57a37e9b5f3`. Aucun nouveau merge S1.
- **ACTION EFFECTIVE** : nouvelle branche `fix/backfill-failure-propagation-20261106` depuis `fix/ci-baseline-20261106` ; PR [#12](https://github.com/Patricked-code/africafunds-market-data-pipeline/pull/12) Draft, HEAD initial `73da818a44ef4942d845f3a0d0aa0848be200e20`. Ajout `src/jobs/ingestionOutcome.ts`, `test/ingestion-outcome.test.ts`, modification `src/jobs/ingest.ts` et `src/jobs/backfill.ts`. Un backfill active `failOnEndpointError` : les échecs ou zéro endpoint déclenchent une exception après sauvegarde du statut du run, afin que le job prenne la voie RETRY/FAILED au lieu d'un faux SUCCESS. L'ingestion ordinaire conserve son comportement antérieur.
- **TEST_EVIDENCE** : quatre tests ajoutés ; exécution CI sur le HEAD de PR #12 **à vérifier**. Aucun PASS revendiqué pour ces nouveaux tests avant preuve GitHub.
- **BLOCK_REASON** : protection `main` indisponible (#3, rulesets 403) ; les fenêtres historiques `window_from/window_to` ne sont toujours pas propagées à la découverte ; claim/lease concurrent atomique non prouvé ; exécuteur hébergé Claude/ChatGPT 24/7 non attesté (#9). PR #12 est une tranche **PARTIAL**, pas une clôture de l'issue #5.
- **NEXT_ACTION** : vérifier le dernier run CI de PR #12 et corriger si nécessaire ; poursuivre #5 par la sélection des liens selon fenêtres et le claim atomique/reprise crash, avec tests ; préparer intégration seulement après #4, protection et revues. Poursuivre en parallèle #7 si #5 est bloqué. Aucun push main, aucun déploiement S1.
- **Rollback** : branche PR #12 indépendante, aucune migration ni écriture sur serveur.

---

## 2026-11-06 — Reprise immédiate exercée, sécurité HTTP étendue, borne runtime documentée

- **Exécution immédiate** : l'automatisation `Automation_a523352a7c448191a41080097ce8b01f` a été relue (`is_enabled=true`, RRULE horaire, timezone Europe/Paris) puis déclenchée en mode `run_now`. Résultat de l'outil : **`inline_run` — « Ready to run in this conversation »**. Cela ne confirme **aucun worker autonome hébergé** ni démarrage autonome hors session ; premier run planifié séparé non attesté.
- **PR #11 / issue #7** : deuxième tranche HTTP `HTTP_MAX_RESPONSE_BYTES` (100 MiB par défaut), lecture limitée des réponses en flux, taille `Content-Length` et flux sans taille, `HttpBodyTooLargeError`, nouveaux tests, `.env.example`. Preuve : [run 42292780013](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42292780013) **SUCCESS** pour SHA `15fa74875ea91dfccc50dc238d9bb57a37e9b5f3`. PR reste Draft ; blocage SSRF/redirects/allowlists et conformité aux sources non résolu.
- **README de la PR #1** : transformé en entrée documentaire pour tout agent Claude/ChatGPT, corrige les 44 endpoints configurés (au lieu de l'estimation 45+) et souligne la différence **socle/pipeline vs application AfricaFunds vs cible SadiaAF**. Correction des avertissements sur les fenêtres historiques et sur le déploiement S1, commit `de7f7faa80ea4a3c59b0f6e1cb91259e7ecf7400`.
- **Chaîne de gouvernance** : code et preuves enregistrés sur GitHub ; aucun commit sur `main`, pas de merge ni d'activation S1. PR #1/#2/#4/#10/#11 ouvertes Draft à la dernière réconciliation, `main` `fb7ec155fc748b133a771564bbd4510e1546fc68` non protégée.
- **NEXT_ACTION** : protéger `main` (issue #3, blocage GitHub plan/permission), examiner et valider les PR documentaires et la CI actuelle, réconcilier les branches empilées #10/#11 avec la branche CI lorsque les gates seront satisfaits, corriger le backfill historique #5 sans faux SUCCESS, terminer les protections HTTP #7, et raccorder un véritable agent codeur hébergé #9 en réutilisant les autorités existantes, avec preuve de deux tâches consécutives sans prompt.
- **Définition du DONE** : les runs verts démontrent uniquement les tests de ces commits, pas la production, la complétude des lots ni un exécuteur autonome 24 h/24.
- **Rollback** : changements documentaires GitHub sur PR #1 ; aucune action serveur.

---

## 2026-11-06 — CI reproductible et deuxième correctif P0 validés ; agent hébergé à raccorder

- **Référence autoritative** : le dépôt GitHub, ses branches et ses preuves ; cette entrée est un checkpoint daté, pas une attestation future. **Aucun merge dans `main` et aucun déploiement S1 exécutés.**
- **CI reproductible** : PR [#4](https://github.com/Patricked-code/africafunds-market-data-pipeline/pull/4) ; lockfile `package-lock.json` v3 réellement généré sur GitHub Actions puis commité, racines de dépendances recoupées (118 packages) ; `npm ci` sur la CI et dans le Dockerfile, suppression du workflow de génération temporaire à permission écriture ; [run CI 42290548842](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42290548842) **SUCCESS** pour HEAD exact `b307202921e66c395f7d0454868a462cc36c6158`. PR encore Draft, pas de fusion.
- **Idempotence SQL** : PR [#10](https://github.com/Patricked-code/africafunds-market-data-pipeline/pull/10) `UNIQUE NULLS NOT DISTINCT` + UPSERT + test d'intégration PostgreSQL ; [run 42289453883](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42289453883) **SUCCESS** SHA `ec4b8d33b709514479b3eef29880c66917efcf49`. PR empilée sur #4, pas de base réelle S1 testée.
- **HTTP/P0 tranche 1** : PR [#11](https://github.com/Patricked-code/africafunds-market-data-pipeline/pull/11) ajout de `HttpResponseError`, rejet des pages 4xx/5xx, retry borné 429/5xx ; tests unitaires simulés 200, 404, 429, 503 ; [run 42291180598](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42291180598) **SUCCESS** pour SHA `f2516761ec3250a366fddbc4b179f91468f567b7`. Issue [#7](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/7) reste **PARTIAL** (redirections, SSRF, limites, politiques de sources non terminées).
- **PR #1 vs #2** : import complet de la mémoire PR #2 dans `docs/PROJECT_MEMORY.md` comme annexe historique de la PR #1 ; `docs/00_PROJECT_MEMORY.md` point d'entrée, ADR-011. PR #2 laissée ouverte Draft, commentaire expliquant la convergence ; aucune information supprimée par cet arbitrage.
- **Protection** : `main` vérifiée privée et non protégée, rulesets 403 ; issue [#3](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/3) **BLOCKED** par fonctionnalité/paramétrage GitHub. Aucune fusion autorisée comme substitut.
- **Vérification de réutilisation d'exécuteurs** : le MCP WealthTech SSH Bridge répond et son runtime est sain, mais sa file de tâches actuelle concerne `Patricked-code/MCP` ; le dépôt UAES public se décrit toujours comme sans runtime hébergé/GitHub App/mandat externe opérationnels. Rien n'atteste aujourd'hui un agent Claude/ChatGPT 24 h/24 pour AfricaFunds. **Ne pas fusionner les autorités MCP/UAES/AfricaFunds.**
- **Planification ChatGPT** : automatisation horaire `Automation_a523352a7c448191a41080097ce8b01f` activée ; résultat du premier run, environnement et éventuel code continu **non attestés**. Ne pas la présenter comme exécuteur autonome permanent.
- **État d'intégration** : PR #1/#2/#4/#10/#11 **Draft et non fusionnées** lors de cette séance ; seules les branches portent ces changements. Les assertions de tests concernent les commits et runs précis ci-dessus.
- **NEXT_ACTION — reprise obligatoire** : vérifier d'abord les derniers HEAD/CI/PR ; résoudre la protection `main` issue #3 sans rendre le repo public ; obtenir la revue/gates des PR #1 et #4, puis les corrections P0 PR #10 et #11 selon leurs dépendances ; continuer [#5](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/5) backfill et la fin de #7 ; industrialiser le vrai codeur autonome [#9](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/9) seulement en raccordant un exécuteur hébergé réellement attesté, avec claims/reprise et fournisseur modèle autorisé.
- **Règle de reprise** : ne jamais considérer ce checkpoint historique comme preuve de statut GitHub courant ; un agent doit toujours réconcilier les SHAs/CI/PR et mettre à jour le journal après travail.
- **Rollback** : les changements sont sur branches/PR non fusionnées ; aucun rollback production requis.

---

## 2026-11-06 — Exécution concrète : CI, défaut P0, continuité planifiée

- Dépôt : `Patricked-code/africafunds-market-data-pipeline` ; `main` reste `fb7ec155fc748b133a771564bbd4510e1546fc68` lors du contrôle initial de cette intervention. **Revalider avant toute nouvelle action**.
- Documentaires : PR #1 (`docs/persistent-project-memory-20260731`) reçoit l'intégralité de `docs/PROJECT_MEMORY.md` de PR #2 comme annexe historique ; `docs/00_PROJECT_MEMORY.md` reste l'entrée canonique ; ADR-011 traite la coexistence. **PR #1 et #2 conservées Draft, non fusionnées**.
- Sécurité : issue [#3](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/3) ouverte pour protection réelle de `main` : branche privée non protégée et rulesets refusés HTTP 403 (offre GitHub). Pas de fusion autonome tant que protection/gates manquent.
- CI : [PR #4](https://github.com/Patricked-code/africafunds-market-data-pipeline/pull/4) branche `fix/ci-baseline-20261106`, Node 22, PostgreSQL 16, typecheck, 3 fichiers de tests unitaires, build, 6 migrations, réexécution, seed. Les premiers runs ont révélé une option Docker incorrecte et 7 erreurs TypeScript historiques ; corrections apportées.
- **Preuve CI #4** : run [42288784384](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42288784384), `SUCCESS`, commit `f4051ba3ed3e0464abbe95de80924c839b0628d7`. Second run [42289248428](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42289248428) `SUCCESS`, commit `8620e4564980835bed574d955cb97132c2961b48` (déclencheur PR étendu). Un run ultérieur est requis pour tout nouveau HEAD.
- **Correction P0 issue #6** : [PR #10](https://github.com/Patricked-code/africafunds-market-data-pipeline/pull/10) empilée sur PR #4, migration additive `006_raw_records_nullsafe.sql`, nouvelle contrainte `UNIQUE NULLS NOT DISTINCT`, UPSERT explicite, test PostgreSQL transactionnel `test/integration/raw-records.test.ts` avec ROLLBACK. Preuve run [42289453883](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42289453883), `SUCCESS`, commit `ec4b8d33b709514479b3eef29880c66917efcf49`. **Aucune migration sur S1 ni fusion**, doublons historiques bloquants plutôt qu'effacés.
- Backlog canonique GitHub : issues [#5](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/5) backfill/fenêtres/concurrence, [#6](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/6) idempotence, [#7](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/7) HTTP et sûreté, [#8](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/8) lockfile/CI reproductible, [#9](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/9) vrai exécuteur codeur Claude/ChatGPT. Toutes reliées aux lots 0–13 existants ; aucun programme parallèle.
- Continuité récurrente : automatisation ChatGPT horaire `Automation_a523352a7c448191a41080097ce8b01f`, créée et activée le 06/11. **Planification seulement** : premier run et environnement effectif non vérifiés ; elle ne prouve pas un moteur codeur 24 h/24. Autorité demeure GitHub.
- Ongoing à la rédaction : tentative de création d'un `package-lock.json` vérifié via artefact GitHub Actions, puis `npm ci` ; contrôle CI sur le HEAD suivant nécessaire.
- **NEXT_ACTION** : (1) confirmer dernier run CI PR #4 après modification, récupérer l'artefact lockfile et verrouiller les dépendances, (2) stabiliser les PR #4/#10, (3) résoudre la protection GitHub de #3, (4) implémenter #5/#7, (5) raccorder un exécuteur de codage réellement opérationnel sur #9 sans duplication des autorités et sans Codex. Relire les preuves actuelles avant toute modification.
- Rollback : commits Git de branches Draft, aucun serveur ni donnée réelle modifiés.

---



## 2026-11-06 — Mandat de finalisation complète et contrat d'exécution continue Claude/ChatGPT

- Branche : `docs/persistent-project-memory-20260731` (PR #1, Draft).
- Objectif validé : **achever intégralement AfricaFunds Market Data Pipeline/SadiaAF** ; enchaîner sans nouvelle demande humaine les tâches admissibles d'un agent codeur Claude ou ChatGPT, dans le périmètre des outils et permissions disponibles.
- Réalisé : spécification du cycle continu dans `docs/15_AUTONOMOUS_AGENT_EXECUTION.md`, pointeur obligatoire `AGENTS.md`, protocole de handoff complété, décision `ADR-010` inscrite.
- Nature : **documentation/contrat**, sans orchestration autonome réelle déployée, sans modification du code métier, sans tests CI/PostgreSQL ni déploiement S1.
- Exigences permanentes : RESUME FIRST, réconciliation GitHub réelle, tâche admissible, claim anti-collision à implémenter, TDD RED/GREEN, validation, PR/revue/CI, checkpoint et reprise automatique ; refus de contourner les gates.
- Limites : la continuité 24 h/24 nécessite un runner/scheduler actif avec credentials et capacité d'invoquer Claude ou ChatGPT. Aucun tel dispositif n'est attesté dans ce dépôt.
- **NEXT_ACTION du chantier principal conservé** : réconcilier PR #1 et PR #2 et leurs mémoires, valider les documents/gates, puis préparer CI et corrections P0. **Travail supplémentaire à planifier dans les lots existants** : implémenter et démontrer le runner et le claim multi-agent selon la recette du contrat, sans créer de programme concurrent.
- Rollback : restauration documentaire de ces ajouts via la PR ; aucune opération production à annuler.

---

## 2026-11-06 — Audit GitHub, distinction des périmètres et checkpoint de reprise

- Branche : `docs/persistent-project-memory-20260731` (PR brouillon #1).
- Objet : conserver **dans GitHub**, plutôt que dans une conversation ou un fichier local uniquement, l'audit statique du 06/11/2026 et le prochain point de travail.
- Checkpoint complet : [`docs/CONTINUITY_CHECKPOINT_2026-11-06.md`](CONTINUITY_CHECKPOINT_2026-11-06.md).
- Commit de création du checkpoint : `8d548e42289ef66d587e34ff2e9e6d1e808cdc78`. Les commits des mises à jour du protocole et du journal sont traçables dans la PR #1.
- SHA `main` observé pendant l'audit : `fb7ec155fc748b133a771564bbd4510e1546fc68` (snapshot, à recontrôler).
- Réalisé : audit du dépôt, structure, migrations, 44 endpoints configurés/11 marchés, deux PR Draft ouvertes, défauts potentiels P0 de backfill, idempotence SQL, HTTP, sécurité, concurrence et procédure S1 ; séparation explicite AfricaFunds (application), pipeline (moteur) et SadiaAF (plateforme cible).
- Nature des preuves : lecture statique du code et des métadonnées GitHub. **Aucun test métier, migration, CI ni attestation S1 exécuté.**
- Fichiers modifiés pour la continuité : checkpoint daté, `AGENTS.md`, `docs/07_AI_HANDOFF_PROTOCOL.md`, le présent journal. **Aucun code de service modifié, aucun déploiement.**
- Décisions : reprise obligatoire depuis le worklog et le dernier checkpoint, avec réconciliation GitHub. Les arbitrages entre les documents des PR #1 et #2 restent **à valider**.
- Blocages : absence de preuve runtime S1, de collecte historique et de tests PostgreSQL/CI pendant cet audit ; documents PR #1/#2 non fusionnés.
- **NEXT_ACTION** : réconcilier la mémoire de la PR #1 et `docs/PROJECT_MEMORY.md` de la PR #2, faire valider les autorités documentaires et les gates, puis traiter CI/tests et défauts P0 dans les lots existants.
- Limite de disponibilité : ce checkpoint existe d'abord **sur la branche de la PR #1**, et ne fait partie de `main` qu'après fusion gouvernée.
- Rollback documentaire : restaurer les versions précédentes sur la branche ou fermer la PR après revue ; aucune opération serveur à annuler.

---



## 2026-07-31 — Cahier de conception, architecture et mode de réalisation

- Branche : `docs/persistent-project-memory-20260731`
- Nature : consolidation documentaire exhaustive, aucune mise en production.
- Objectif : transformer l’ensemble du cadrage de la conversation en documents maîtres directement exploitables par une équipe ou une IA.
- Réalisé :
  - ajout de `docs/11_CAHIER_DE_CONCEPTION_MASTER.md` ;
  - ajout de `docs/12_ARCHITECTURE_DE_CONCEPTION_DETAILLEE.md` ;
  - ajout de `docs/13_MODE_DE_REALISATION_ET_PLAN_DE_LOTS.md` ;
  - ajout de `docs/14_MATRICE_EXIGENCES_RECETTE.md` ;
  - mise à jour de `AGENTS.md` avec le nouvel ordre de lecture et les obligations de maintenance ;
  - consolidation des besoins de collecte, calculs, Super Administration, API, interopérabilité, sécurité, PostHog, staging et production ;
  - formalisation de 25 exigences fonctionnelles, 15 exigences non fonctionnelles et des cas de recette par domaine ;
  - planification en lots depuis la documentation jusqu’à la production S1.
- Sources : conversation complète, mémoire persistante existante et trois PDF méthodologiques AfricaFunds.
- Tests : contrôle de cohérence documentaire ; aucune modification de code ou de base.
- GitHub : les documents sont ajoutés à la PR brouillon #1.
- Bridge S1 : non utilisé ; aucune action serveur.
- Prochaine étape : revue du cahier, validation des décisions ouvertes, puis démarrage du Lot 1 Sécurité/Identité et du Lot 2 Modèle canonique sur une branche fonctionnelle distincte.
- Rollback : suppression des quatre nouveaux fichiers et restauration de la version précédente de `AGENTS.md` si la PR est rejetée.

---

## 2026-07-31 — Mémoire persistante du projet

- Branche : `docs/persistent-project-memory-20260731`
- Nature : documentation et gouvernance, aucune mise en production.
- Réalisé :
  - ajout de `AGENTS.md` ;
  - mémoire projet ;
  - vision produit ;
  - architecture cible ;
  - gouvernance et interopérabilité ;
  - méthodologies financières ;
  - roadmap ;
  - registre de statut ;
  - protocole de reprise IA ;
  - journal de décisions ;
  - gates de déploiement.
- Sources de conception relues :
  - Mécanisme de calcul journalier AfricaFunds ;
  - Registre des indices et séries de taux nationaux ;
  - Méthodologie des indices obligataires AfricaFunds.
- GitHub : connexion et droits admin/push confirmés sur le dépôt.
- Bridge S1 : indisponible dans la conversation ; aucune action serveur.
- Tests : non applicables, lot documentaire.
- Prochaine étape : revue et fusion de la PR, puis création d’une branche Phase 1/2 pour sécurité, RBAC, audit, modèle canonique et interopérabilité.

---

## Modèle à recopier

```markdown
## YYYY-MM-DD — Titre
- Branche :
- Commit / PR :
- Objectif :
- Réalisé :
- Fichiers/tables/API :
- Tests exécutés :
- Résultats :
- Limites :
- Blocages :
- Prochaine étape :
- Rollback :
```
