# 09 — Journal de travail et continuité

## 2026-11-23 — PR #36 : absence de faux audit SUCCESS sur deux échecs non stricts (lots 4/11)

- RECONCILIATION : dépôt private, PR #1 merged ; PR #36 OPEN/Draft, base main `73256f48d81d38ce8ff6f51be9e024b25cf5dadb`, HEAD initial `4714904c83177cbc0d218b3181eb3154cdc18552`. AGENTS.md, docs/15_AUTONOMOUS_AGENT_EXECUTION.md, journal actuel et checkpoint 2026-11-06 consultés ; PR et issues ouvertes recherchées. PR #22/#25/#26/#35 et autres branches concurrentes non modifiées.
- TEST_EVIDENCE : sur HEAD initial, [CI run 45195289642](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45195289642) = completed/failure, job validate 137763988912 sans steps/logs_url ; [Docker run 45195289725](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45195289725) = completed/failure, job 137763988826 sans steps/logs_url. Cause racine non déterminée, aucun test applicatif PASS attesté.
- ACTION_CODE : commit [93043b93c4a9d2c228a4cb12ce9d7b6c17faaa3a](https://github.com/Patricked-code/africafunds-market-data-pipeline/commit/93043b93c4a9d2c228a4cb12ce9d7b6c17faaa3a) dans test/integration/ingestion-html-csv.test.ts : après deux ingestions synthétiques HTTP 404 en mode non strict, assertion SQL explicite qu'aucun audit `ops.ingestion_runs` du endpoint échoué ne porte `SUCCESS`. Test additif, sans modification du moteur ni des données officielles.
- VALIDATION : commit créé ; tests locaux NOT_RUN ; CI sur le nouveau HEAD NON ATTESTÉ ; revue indépendante absente. Ne pas déduire un échec de ce test des runs antérieurs.
- BLOCK_REASON : GitHub Actions CI et Docker en failure sans étapes ni journaux accessibles ; diagnostic pré-job administratif/check-run indisponible ; revue et gates de fusion manquants. Couverture des sources, adaptateurs, historiques et recette #13–#17 non certifiée.
- NEXT_ACTION : vérifier CI/Docker sur le HEAD exact issu de cette entrée ; obtenir annotations/check-run et message d'allocation runner/quota/facturation depuis GitHub Actions, corriger uniquement la cause prouvée, exécuter les tests PostgreSQL et demander revue indépendante. Poursuivre une tâche indépendante uniquement après claim/réconciliation ; ne pas fusionner, ne pas déployer S1.
- ROLLBACK : revert ciblé du commit test 93043b93 et de cette entrée sur la branche Draft ; aucun changement main, secret, source officielle ou runtime.

---

## 2026-11-23 — PR #36 : garde de non-persistance après deux échecs non stricts (lots 4/11)

- RECONCILIATION : PR #1 merged, PR #36 OPEN/Draft, base main 73256f48d81d38ce8ff6f51be9e024b25cf5dadb, HEAD initial 75584e21ab628f8d70a925b6ae88f1ecf5db8867 ; AGENTS.md, docs/15_AUTONOMOUS_AGENT_EXECUTION.md, journal et checkpoint 2026-11-06 relus via GitHub ; PR/issues ouvertes consultées ; dépôt private. Aucune modification de PR concurrente.
- TEST_EVIDENCE : sur HEAD initial 75584e21ab628f8d70a925b6ae88f1ecf5db8867, CI [45185583886](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45185583886) et Docker [45185583785](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45185583785) = completed/failure. Job validate 137730201647 : steps=null, logs_url=null. Cause non déterminée, aucun test applicatif attesté.
- ACTION_CODE : commit [74338738d594fdb639081e5edd993a849bb4e56a](https://github.com/Patricked-code/africafunds-market-data-pipeline/commit/74338738d594fdb639081e5edd993a849bb4e56a) sur test/integration/ingestion-html-csv.test.ts : après deux tentatives HTTP 404 non strictes, assert zéro raw record et deux audits FAILED conservant error_message NULL. Assertions ajoutées sans modifier le moteur, la base, les sources officielles ou les secrets.
- VALIDATION : code committé, tests NOT_RUN localement ; CI sur ce commit et le HEAD documentaire suivant NON ATTESTÉ. Aucune recette métier réelle ni HISTORY_COMPLETE revendiquée.
- BLOCK_REASON : GitHub Actions CI/Docker échouent sans étapes exploitables ; diagnostic d'allocation runner/quota/facturation ou annotations administratives manquant ; revue indépendante #36 absente et gates de fusion non satisfaits.
- NEXT_ACTION : vérifier CI/Docker sur le nouveau HEAD exact, rechercher les annotations check-run/erreurs pré-job sans relance aveugle ; corriger uniquement une cause démontrée, valider le test PostgreSQL et obtenir revue indépendante. Si Actions reste bloqué, poursuivre un lot indépendant après claim ; ne pas fusionner, ne pas déployer S1.
- ROLLBACK : revert ciblé du commit test 74338738 et de cette entrée sur la branche Draft, sans modifier main.

---

## 2026-11-23 — PR #36 : réexécution FAILED non stricte, deux audits distincts (lots 4/11)

- RECONCILIATION : AGENTS.md, docs/15_AUTONOMOUS_AGENT_EXECUTION.md, journal courant et checkpoint 2026-11-06 relus via GitHub ; PR/issues ouvertes recherchées ; PR #36 OPEN/Draft. PR #1 documentaire fusionnée d'après réconciliation précédente, sans réouverture. Aucun travail sur les PR concurrentes.
- TEST_EVIDENCE : sur HEAD précédent `c4420a5d5390f00cdd87c532e031c78d890c6171`, [CI #673 / 45176352842](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45176352842) et [Docker #540 / 45176353722](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45176353722) = completed/failure ; jobs 137698497708 et 137698500318, steps/logs_url null. Aucune exécution de test applicatif prouvée, cause racine non établie.
- ACTION_CODE : commit [af21b5855c4f5a86ffc1fcc88e290802fcfbcd62](https://github.com/Patricked-code/africafunds-market-data-pipeline/commit/af21b5855c4f5a86ffc1fcc88e290802fcfbcd62) sur test/integration/ingestion-html-csv.test.ts : seconde ingestion HTTP 404 synthétique en mode non strict, vérification de deux UUID distincts, deux statuts FAILED et compteurs [1,0,1] pour chaque tentative. Préserve la vérification d'absence d'archive et le nettoyage ciblé existants. Aucun changement du moteur, des sources officielles, du schéma, des secrets ou de main.
- VALIDATION : test ajouté, NOT_RUN localement ; CI du nouveau HEAD non attestée. Ce test reste une hypothèse vérifiable, pas une recette PASS.
- BLOCK_REASON : GitHub Actions CI/Docker en échec avant étapes accessibles, origine inconnue ; revue indépendante et gates de fusion non attestés. Couverture des marchés et historique réel #13–#17 non certifiés.
- NEXT_ACTION : contrôler les runs sur le HEAD documentaire issu de cette entrée ; obtenir annotations/check-runs et diagnostic administratif Actions (runner/quota/facturation), corriger seulement la cause démontrée, exécuter les tests PostgreSQL et obtenir revue indépendante. En parallèle choisir une tâche indépendante des lots 0–13 après claim vérifié. Aucune fusion, aucun S1.
- ROLLBACK : revert ciblé du commit test af21b585 et de cette entrée sur la branche Draft.

---

## 2026-11-23 — PR #36 : identité audit FAILED non strict et CI toujours bloquée (lots 4/11)

- RECONCILIATION : PR #36 OPEN/Draft, HEAD précédent bf8bc3d13caecbc521bdaa84862c9537b9bd3fb8 ; AGENTS.md, docs/15_AUTONOMOUS_AGENT_EXECUTION.md, checkpoint historique et journal relus ; PR/issues ouvertes recherchées ; dépôt privé. PR #1 déjà fusionnée.
- TEST_EVIDENCE : sur HEAD bf8bc3d13caecbc521bdaa84862c9537b9bd3fb8, CI [45167071560](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45167071560) et Docker [45167071619](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45167071619) = completed/failure ; jobs 137666666756 et 137666667224 sans steps/logs_url. Aucune commande de test attestée.
- ACTION_CODE : ajout sur la branche de PR #36 d'assertions PostgreSQL vérifiant l'identité UUID, la persistance du statut FAILED et error_message NULL du run non strict entièrement échoué ; le test existant contrôle déjà les compteurs 1/0/1 et l'absence d'archives. Code métier inchangé, tests ajoutés NOT_RUN.
- BLOCK_REASON : échec pré-étapes observable de deux workflows ; cause non déterminée ; validation CI du nouveau HEAD et revue indépendante manquantes.
- NEXT_ACTION : obtenir annotations et message d'allocation des jobs via Actions et réglages administratifs ; vérifier quota/facturation/runner sans attribuer de cause sans preuve. Revalider CI/Docker et le test PostgreSQL sur HEAD exact après déblocage ; revue indépendante avant toute fusion. Continuer un lot indépendant seulement après claim. Aucun S1.
- ROLLBACK : revert ciblé du test et de cette entrée sur branche Draft ; main, secrets et sources officielles inchangés.

---


## 2026-11-23 — PR #36 : CI #671 et Docker #538 échoués, suivi issue #8 (lots 4/11)

- RECONCILIATION : PR #1 merged ; AGENTS.md, docs/15_AUTONOMOUS_AGENT_EXECUTION.md, présent journal et docs/CONTINUITY_CHECKPOINT_2026-11-06.md consultés ; recherche des PR/issues ouvertes ; dépôt privé selon get_repo. Branche Draft #36 conservée.
- TEST_EVIDENCE : sur commit `369bc6dbffd7ebe10a1e818d43febab025c81695`, [CI #671 / 45158263775](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45158263775) et [Docker #538 / 45158263830](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45158263830) `completed/failure`. Jobs 137636683518 et 137636683973 retournés `steps=null`, `logs_url=null`. Aucun test local exécuté ; nouveau test PostgreSQL non validé.
- ACTION : escalade factuelle dans [issue #8 commentaire 7099903998](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/8#issuecomment-7099903998), sans relance aveugle, sans modification du code ni autre branche.
- BLOCK_REASON : CI et Docker en échec sans trace d'étapes accessible ; cause inconnue, revue indépendante et gates de fusion non attestés. Ne pas attribuer les échecs au code sans preuve.
- NEXT_ACTION : obtenir annotations/check-runs et message d'allocation runner depuis Actions et paramètres admin/quota/facturation ; corriger seulement le défaut démontré et revalider SHA exact. Puis poursuivre lot indépendant après contrôle des claims ; aucune fusion ni S1.
- ROLLBACK : revert de cette entrée documentaire uniquement sur branche Draft.

---


## 2026-11-23 — PR #36 : régression non-strict FAILED et investigation CI #669 / Docker #536 (lots 4/11)

- RECONCILIATION : PR #1 merged ; AGENTS.md, contrat docs/15, checkpoint 2026-11-06 et présent journal relus sur main/branche #36. PR/issues ouvertes consultées ; branche #36 Draft, HEAD de départ c4d52f4537947d521500aff2642a690a0f617874. Dépôt retourné private ; aucune modification de visibilité.
- TEST_EVIDENCE : sur ce HEAD, [CI #669 / run 45148504260](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45148504260) completed/failure, job validate 137603643177 ; [Docker #536 / run 45148504150](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45148504150) completed/failure, job 137603643133. Jobs sans steps/logs_url accessibles. Cause racine inconnue ; aucun test local exécuté.
- ACTION_CODE : commit 3a8cd3519445a0410b4a6753ed379811e07ad125 sur test/integration/ingestion-html-csv.test.ts : scénario PostgreSQL synthétique d'un endpoint HTTP 404 seul en mode non strict ; la promesse doit se résoudre mais ops.ingestion_runs doit rester FAILED avec compteurs [1,0,1], sans archive ; nettoyage ciblé du run supplémentaire par endpointCode. Aucun changement moteur, source officielle, schéma ou secret.
- VALIDATION : assertions écrites, NOT_RUN localement ; CI du nouveau HEAD non attestée. L'échec pré-job sur le HEAD antérieur ne constitue pas un échec de ces nouvelles assertions.
- BLOCK_REASON : GitHub Actions CI/Docker échouent avant étapes observables ; vérifier annotations check-run, paramètres Actions, allocation runners, quotas/facturation par accès administrateur. Revue indépendante #36 absente ; recettes sources et marchés #13–#17 non certifiées.
- NEXT_ACTION : vérifier les runs sur le HEAD du présent checkpoint, obtenir diagnostic pré-job sans relance aveugle, corriger la cause prouvée et faire exécuter le nouveau test PostgreSQL ; demander revue indépendante avant tout merge. En parallèle poursuivre un travail indépendant admissible après contrôle des claims. Aucun S1.
- ROLLBACK : revert ciblé du test 3a8cd351 et de cette entrée documentaire sur la branche Draft ; préserver main et les PR concurrentes.

---

## 2026-11-23 — PR #36 : diagnostic transversal CI #668 / Docker #535 (lots 4/11, issue #8)

- RECONCILIATION : instructions AGENTS.md et docs/15_AUTONOMOUS_AGENT_EXECUTION.md, checkpoint 2026-11-06 et journal courant relus sur GitHub ; PR ouvertes et issues ouvertes recherchées. PR #36 demeure Draft ; comparaison main → branche : 60 commits ahead, 0 behind, base main 73256f48d81d38ce8ff6f51be9e024b25cf5dadb avant ce commit. Aucun claim concurrent modifié.
- TEST_EVIDENCE : sur HEAD précédent 3777a2d1adcf4b9a951827101d70f1630c161209, [CI #668 / run 45140247876](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45140247876) completed/failure (job validate 137576162705) ; [Docker #535 / run 45140247999](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45140247999) completed/failure (job 137576162683). Pour chacun, le connecteur retourne steps=null et logs_url=null. Workflow CI sur main examiné : job ubuntu-latest avec étapes checkout/npm/tests/PostgreSQL ; aucune de ces étapes n'est observable sur les runs en échec. Les deux workflows distincts échouent sans étapes accessibles : indice d'un blocage pré-exécution, **pas preuve de cause racine**. Tests locaux NOT_RUN.
- ACTION : rapprochement des deux nouveaux runs/jobs, lecture du workflow CI de référence et qualification de l'absence d'étapes. Ne pas modifier le code métier ni relancer aveuglément. Escalade via issue #8, sans registre ou orchestrateur secondaire.
- BLOCK_REASON : GitHub Actions renvoie failure pour deux workflows distincts sans étapes/logs accessibles ; vérifier annotations de check-runs, allocation runner, activation Actions, quotas et facturation avec accès administrateur. Aucune cause technique certaine ; CI exact-HEAD et revue indépendante #36 non satisfaites. Les recettes de données officielles #13–#17 restent non attestées.
- NEXT_ACTION : obtenir l'erreur pré-job depuis l'interface GitHub Actions ou les annotations check-run des runs 45140247876 et 45140247999 ; corriger seulement le défaut prouvé et valider sur SHA exact. Si le blocage persiste, choisir un correctif indépendant dans les lots 0–13 après contrôle des claims, sans créer de nouvelle autorité ; conserver Draft et ne pas fusionner/déployer S1.
- ROLLBACK : revert de cette seule entrée documentaire sur la branche Draft ; aucun changement main, secret, source officielle ou runtime.

---

## 2026-11-23 — PR #36 : CI #667 / Docker #534 échoués, investigation pré-étapes (lots 4/11)

- RECONCILIATION : dépôt GitHub Patricked-code ; PR #1 merged=true ; PR #36 OPEN/Draft, HEAD initial `3644eba3d5485c8e255bd958619b59cbee436bc7`. AGENTS.md, docs/15_AUTONOMOUS_AGENT_EXECUTION.md, journal et checkpoint docs/CONTINUITY_CHECKPOINT_2026-11-06.md relus ; PR et issues ouvertes consultées. Visibilité du dépôt retournée `private` par get_repo le 23/11 (différente du snapshot du 07/11), sans changement de visibilité.
- TEST_EVIDENCE : [CI #667 / run 45132502465](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45132502465) `completed/failure`, job validate `137550985998` ; [Docker #534 / run 45132502435](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45132502435) `completed/failure`, job `137550985779`. Jobs retournés sans steps ni logs_url ; récupération des logs non exploitable via le connecteur. Statuts commit combinés = [] (ne signifie pas réussite). Reviews #36 = []. Aucun test local exécuté.
- ACTION : lecture GitHub des runs/jobs et vérification de l'absence de revue ; pas de relance aveugle ni de modification métier car aucune cause racine n'est prouvée. Suivi technique à consigner dans l'issue #8, sans créer d'orchestrateur ni registre secondaire.
- BLOCK_REASON : deux workflows exact-HEAD échouent sans étapes/logs accessibles ; cause racine inconnue ; revue indépendante et gates de fusion manquants. Les recettes officielles #13/#14/#15/#17 restent non certifiées.
- NEXT_ACTION : inspecter dans l'interface GitHub les annotations et éventuels messages d'échec d'allocation du runner, les réglages Actions, quotas et facturation ; obtenir un diagnostic reproductible avant tout changement workflow/code. Corriger le défaut démontré, valider CI et Docker sur le SHA exact, obtenir revue indépendante #36. Reprendre en parallèle une tâche des lots 0–13 dont le claim est libre et les contrats/licences vérifiés.
- ROLLBACK : revert documentaire ciblé de cette entrée sur branche Draft ; aucun changement main, secrets, sources, migrations ou S1.

---


## 2026-11-23 — PR #36 : nouvel échec pré-étapes, diagnostic GitHub Actions confirmé (lots 4/11)

- RECONCILIATION : AGENTS.md, docs/15_AUTONOMOUS_AGENT_EXECUTION.md, journal actuel et checkpoint docs/CONTINUITY_CHECKPOINT_2026-11-06.md consultés via le connecteur Patricked-code ; recherche des PR/issues ouvertes et reviews #36 (reviews=[]). Travail limité à la branche Draft #36, sans modification des branches concurrentes.
- TEST_EVIDENCE : commit précédent 7228e26b0e25dd25b955cbf4624198a6b4ace038 ; [CI #666 run 45125135566](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45125135566) completed/failure, job validate 137527626753 ; [Docker #533 run 45125135560](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45125135560) completed/failure, job 137527626853. Les deux jobs retournent steps=[] et logs 404 BlobNotFound. Aucune commande de test observable ; ne pas conclure à un échec applicatif ni à une cause infrastructure spécifique.
- ACTION : lecture des runs, jobs, étapes et logs exacts, sans relance aveugle ; aucune modification métier ni exécution locale. La revue indépendante reste absente. Échecs successifs similaires aux runs 45112614755, 45112614698, 45119240423 et 45119240387.
- BLOCK_REASON : CI et Docker échouent avant toute étape accessible, journaux indisponibles ; cause racine non démontrée. Impossible de certifier la branche #36 ou de fusionner ; sources officielles et recettes réelles non attestées.
- NEXT_ACTION : consulter les annotations/check-runs et la page Actions des runs 45125135566/45125135560 ; vérifier les paramètres d'activation Actions, disponibilité des runners et éventuelles restrictions de facturation/quotas par une autorité ayant accès aux réglages. Corriger uniquement la cause prouvée, puis valider le nouveau HEAD. En parallèle, reprendre une tâche indépendante des lots 0–13 après contrôle des claims, sans toucher aux branches possédées.
- ROLLBACK : revert documentaire ciblé de cette entrée sur la branche Draft ; aucun secret, main, source officielle ni S1 modifié.

---


## 2026-11-23 — PR #36 : diagnostic CI élargi, échec avant étapes observables (lots 4/11)

- RECONCILIATION : AGENTS.md, docs/15_AUTONOMOUS_AGENT_EXECUTION.md, présent journal et docs/CONTINUITY_CHECKPOINT_2026-11-06.md relus via GitHub ; recherche des PR ouvertes (dont #36 Draft et branches concurrentes). Aucune modification de code ni des autres branches.
- TEST_EVIDENCE : sur le SHA a4404fb25908127c4e3b3e16cfbbb04f72181b38, nouvelles exécutions [CI 45119240423](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45119240423) et [Docker 45119240387](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45119240387) = completed/failure. Jobs respectifs 137508961137 (validate) et 137508960548 (Docker). Pour ces deux jobs et ceux des tentatives précédentes (137508814763 et 137508829477), l'API des steps renvoie [] ; téléchargement des logs = HTTP 404 BlobNotFound. Aucun échec de commande applicative identifié ; ne pas conclure à une régression ni à une panne de runner sans preuve.
- ACTION : contrôles additionnels GitHub Actions (nouveaux runs, jobs, steps, logs) ; aucune relance aveugle supplémentaire, car les relances antérieures ont reproduit l'échec et les logs restent absents. Aucun test local exécuté.
- BLOCK_REASON : CI et Docker échouent sur le SHA documentaire ci-dessus, sans steps ni logs récupérables via connecteur ; diagnostic de cause racine impossible à ce stade ; revue indépendante de #36 et gates de fusion non attestés ; couverture officielle des sources et recettes financières non certifiée.
- NEXT_ACTION : vérifier la page GitHub Actions et les annotations/check-runs des runs 45119240423 et 45119240387 ; examiner l'état du runner, les permissions et la facturation Actions si les jobs échouent avant toute étape ; dès qu'un log exploitable est disponible, isoler la cause démontrée et corriger code/workflow sur branche dédiée, puis CI exact-HEAD. Pendant le blocage, sélectionner un chantier indépendant des lots 0–13 après vérification des claims et contrats/licences ; aucune fusion ni S1.
- ROLLBACK : revert documentaire ciblé sur la branche Draft ; aucun secret, main ou production modifié.

---


## 2026-11-23 — PR #36 : échec CI exact-HEAD détecté, relances gouvernées (lots 4/11)

- RECONCILIATION : AGENTS.md, docs/15_AUTONOMOUS_AGENT_EXECUTION.md, worklog courant et docs/CONTINUITY_CHECKPOINT_2026-11-06.md relus ; PR #1 fermée (fusion mentionnée au journal), PR #36 ouverte Draft. Recherche des issues/PR ouvertes ; aucune branche concurrente modifiée.
- TEST_EVIDENCE : sur le HEAD documentaire antérieur e7262eaa4dc035e7056f90156e329188a02d0ec6, [CI run 45112614755](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45112614755) et [Docker/PostgreSQL run 45112614698](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45112614698) ont retourné completed/failure (première tentative). Jobs 137488152930 et 137488152679 en échec ; téléchargement des logs via connecteur : GitHub 404 BlobNotFound, et liste des steps vide. Cause technique non démontrée ; ne pas attribuer ces échecs au code sans logs.
- ACTION : relance ciblée des jobs échoués via GitHub Actions pour les deux runs, API success=true pour chaque demande. Contrôle après relance : les nouveaux jobs CI 137508814763 et Docker 137508829477 sont eux aussi completed/failure. Les logs ne sont pas exploitables via le connecteur lors de cette reprise ; cause non diagnostiquée. Aucun succès déclaré. Aucun code, secret, main ni S1 modifié.
- BLOCK_REASON : CI/Docker exact-HEAD en échec lors de la première tentative et logs indisponibles (BlobNotFound) ; seconde tentative également en échec, logs non exploitables ; revue indépendante #36 toujours non attestée ; compatibilité HTML index-only et qualifications officielles #13/#14/#15/#17 non certifiées.
- NEXT_ACTION : inspecter les logs et annotations des tentatives 1 et 2 des runs 45112614755 et 45112614698 par GitHub Actions dès disponibilité, déterminer si échec d'infrastructure ou régression ; si échec reproductible, isoler et corriger le défaut sur branche de PR #36 avec tests, sans micro-tests redondants. Vérifier la revue indépendante et les claims avant de reprendre les tâches indépendantes des lots 0–13. Aucune fusion ni déploiement S1.
- ROLLBACK : entrée documentaire réversible sur branche Draft ; relances GitHub Actions sans mutation de production.

---


## 2026-11-23 — PR #36 : validation CI exact-HEAD et passage en attente de revue (lots 4/11)

- RECONCILIATION : HEAD branche `fix/ingestion-false-success-20261122` = `808b30a6c6e865a764eeaa66e6cc5e1ec417527d` (comparaison GitHub identical). Lecture de AGENTS.md, docs/15_AUTONOMOUS_AGENT_EXECUTION.md, présent journal, checkpoint docs/CONTINUITY_CHECKPOINT_2026-11-06.md, tests et moteur d'ingestion ; recherche des PR/issues ouvertes ; reviews #36 = []. Aucun claim concurrent transféré.
- TEST_EVIDENCE exact-HEAD : [CI #662, run 45107139798](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45107139798) et [Docker/PostgreSQL #529, run 45107139876](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45107139876) : `completed/success` sur `808b30a6`. Ces runs valident les assertions précédentes, pas une recette officielle ni le présent commit documentaire.
- CONTRÔLE FONCTIONNEL : la branche contient les tests synthétiques strict/non-strict, trois runs PARTIAL distincts et compteurs 2/1/1 ; le code `src/jobs/ingest.ts` termine PARTIAL avant de signaler l'erreur stricte. Aucune nouvelle modification métier lors de ce contrôle ; éviter de multiplier les micro-tests sans lacune de recette démontrée.
- BLOCK_REASON : revue indépendante #36 absente ; compatibilité des index HTML légitimes sans ligne et qualifications de sources officielles #13/#14, normalisation #15 et recette financière #17 non certifiées. Gates de fusion non démontrés ; pas de S1.
- NEXT_ACTION : obtenir une revue indépendante du code et des scénarios HTML index-only de PR #36 ; traiter les observations de revue et revalider la CI exact-HEAD après toute correction. Puis qualifier un contrat officiel/fixture autorisée et coordonner les claims #26/#27 avant toute implémentation d'adaptateur ou recette financière. Aucune fusion sans gates, aucune déclaration HISTORY_COMPLETE.
- ROLLBACK : entrée documentaire réversible sur branche Draft ; aucune migration, source officielle, secret, main ni S1 modifié.

---


## 2026-11-23 — PR #36 : contrôle des compteurs pour chaque tentative PARTIAL (lots 4/11)

- RECONCILIATION : PR #1 merged=true ; PR #36 OPEN/Draft sur HEAD initial `c12a579de337799af81f2e338d34b9ff05495330` ; AGENTS.md, docs/15_AUTONOMOUS_AGENT_EXECUTION.md, journal canonique et checkpoint du 06/11 relus ; recherche PR/issues et reviews #36 (aucune revue enregistrée). Les branches concurrentes restent intactes.
- TEST_EVIDENCE HEAD initial : [CI 45100890397](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45100890397) et [Docker 45100890400](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45100890400) : completed/success pour `c12a579de337799af81f2e338d34b9ff05495330` seulement.
- CODE/TEST : commit `c4c2c60201d182d61b85e140b83c6fb6848f933c` ; `test/integration/ingestion-html-csv.test.ts` vérifie maintenant, sur les trois UUID distincts de tentatives mixtes (strict, strict répété, non strict), le statut PARTIAL, les compteurs persistés endpoints=2/success=1/failed=1 et error_message=NULL. Cela prévient un faux PARTIAL dont les compteurs masqueraient l'échec du sibling HTTP 404. Fixtures synthétiques uniquement ; aucun appel réseau officiel.
- TEST_EVIDENCE nouveau code : tests locaux NOT_RUN ; CI/Docker du HEAD après cette entrée NOT_YET_ATTESTED ; ne pas attribuer les succès antérieurs au nouveau code.
- BLOCK_REASON : CI exact-HEAD du nouveau test et revue indépendante #36 non attestées ; contrats/licences #13/#14, normalisation #15 et recette officielle #17 incomplètes ; aucune autorisation S1.
- NEXT_ACTION : contrôler CI/Docker du HEAD final, diagnostiquer/corriger tout échec, demander une revue indépendante de PR #36 ; puis sélectionner une tâche fonctionnelle indépendante des lots 0–13 après réconciliation des claims. Ne pas fusionner ni déclarer HISTORY_COMPLETE sans données réelles.
- ROLLBACK : revert ciblé du commit `c4c2c602` et de l'entrée documentaire sur la branche Draft ; aucune migration, secret, source officielle, main ou S1 modifié.

---


## 2026-11-23 — PR #36 : conserver les trois tentatives PARTIAL distinctes (lots 4/11)

- RECONCILIATION : AGENTS.md, docs/15_AUTONOMOUS_AGENT_EXECUTION.md, journal et docs/CONTINUITY_CHECKPOINT_2026-11-06.md relus sur GitHub ; recherches des 12 issues ouvertes et PR concurrentes ; aucun changement main, S1, secrets ou branches concurrentes.
- TEST_EVIDENCE HEAD précédent : `98d8a824c84690728058fb21bbcbe6a707a58482` ; [CI 45095619909](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45095619909) et [Docker 45095619921](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45095619921) retournés completed/success pour ce commit seulement.
- CODE/TEST : commit [d96283af](https://github.com/Patricked-code/africafunds-market-data-pipeline/commit/d96283afc4c727cf6ce2dfca74e2878a9d0c7de1) ; `test/integration/ingestion-html-csv.test.ts` conserve désormais la deuxième tentative stricte PARTIAL jusqu'à la fin du scénario et vérifie trois identifiants de runs distincts (strict, strict répété, non strict), trois lignes PARTIAL et nettoyage par UUID. Auparavant, le deuxième run était supprimé avant l'assertion finale, limitant la vérification à deux runs. Fixtures synthétiques, aucun appel officiel.
- TEST_EVIDENCE nouveau HEAD : tests locaux NOT_RUN ; CI/Docker exact-HEAD après les commits de cette entrée NOT_YET_ATTESTED. Ne pas transférer les succès précédents.
- BLOCK_REASON : validation CI exact-HEAD et revue indépendante #36 non attestées ; qualifications officielles #13/#14, normalisation #15 et recettes de données réelles #17 non certifiées.
- NEXT_ACTION : vérifier les nouveaux runs CI/Docker sur HEAD final de #36 ; corriger toute anomalie ; obtenir revue indépendante, sans fusion implicite. Ensuite sélectionner un travail indépendant des lots 0–13 après réconciliation des claims et contrats des sources.
- ROLLBACK : revert ciblé du commit de test et de cette entrée sur branche Draft ; aucune migration ni opération production.

---

## 2026-11-23 — Reprise PR #36 : isolation des runs PARTIAL strict/non-strict

- Branche : `fix/ingestion-false-success-20261122` ; PR #36 Draft ; lot 4/11, issue #14, sans toucher aux PR concurrentes #22/#25/#26/#35.
- Réconciliation : précédent HEAD `df08a352c9ac1d59acd8d7400575910101e39e63` ; CI run [45089238131](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45089238131) SUCCESS et Docker run [45089237903](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45089237903) SUCCESS, **uniquement pour ce HEAD précédent**. Aucune revue indépendante retournée pour PR #36.
- Code/test : commit [11456cf9](https://github.com/Patricked-code/africafunds-market-data-pipeline/commit/11456cf91814ccba689803067e412fc2c920001c) ; ajout d'assertions PostgreSQL confirmant deux identifiants distincts de runs, tous deux `PARTIAL`, entre l'exécution stricte et la non stricte ; fixtures synthétiques, aucun HTTP externe.
- Limites : nouveau test **non encore attesté CI exact-HEAD** ; aucune donnée réelle ni qualification officielle de sources ; revue et gates de fusion manquants.
- BLOCK_REASON : CI/Docker du nouveau HEAD et revue indépendante non attestés ; issues #13/#14/#15/#17 restent partiellement ouvertes ; aucune preuve d'un déploiement S1 ou de couverture historique complète.
- NEXT_ACTION : vérifier CI et Docker sur le HEAD final du présent journal, diagnostiquer/corriger tout échec ; solliciter revue indépendante de PR #36 ; sélectionner ensuite une tâche indépendante parmi les lots 0–13 après réconciliation des PR et claims.
- Rollback : revert des commits de test et journal sur branche PR #36 ; aucune migration ni modification production.

---

## 2026-11-23 — PR #36 : isolation des endpoints après PARTIAL non strict (lots 4/11)

- **RECONCILIATION** : lecture AGENTS.md, docs/15_AUTONOMOUS_AGENT_EXECUTION.md, journal courant et docs/CONTINUITY_CHECKPOINT_2026-11-06.md ; PR #1 CLOSED (fusion à confirmer par métadonnées de merge), PR #36 OPEN/Draft, recherches PR/issues ouvertes. Branche de travail #36 uniquement.
- **TEST_EVIDENCE HEAD précédent** : commit `1a3f0a9972b11d37ef0435ea5cf357a782a5d1e7` ; [CI run 45084230455](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45084230455) et [Docker run 45084230461](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45084230461) : completed/success, exact HEAD précédent uniquement.
- **CODE/TEST** : commit `ac7be693f12cfc622828f20e101948513653a279` ; assertions PostgreSQL supplémentaires après la troisième ingestion non stricte : zéro raw_records et zéro raw_artifacts pour le sibling HTTP 404, exactement deux archives pour le sibling sain, et statut PARTIAL du premier run strict inchangé. Fixtures synthétiques et suppression bornée, sans source officielle interrogée.
- **TEST_EVIDENCE nouveau HEAD** : tests locaux NOT_RUN ; CI/Docker du nouveau HEAD NOT_YET_ATTESTED, à contrôler sur le SHA exact après cette entrée.
- **BLOCK_REASON** : CI exact-HEAD et revue indépendante #36 non attestées pour les nouvelles assertions ; qualification officielle #13/#14, normalisation #15 et recette réelle #17 incomplètes. Aucun merge ni déploiement S1 autorisé.
- **NEXT_ACTION** : vérifier CI/Docker exact-HEAD de #36, corriger toute régression et obtenir une revue indépendante ; réconcilier les claims des PR concurrentes puis reprendre une tâche indépendante des lots 0–13. Ne pas déclarer HISTORY_COMPLETE sans données réelles.
- **ROLLBACK** : revert ciblé du commit `ac7be693` et de cette entrée documentaire sur la branche Draft ; aucun schéma, secret, main, source officielle ou S1 modifié.

---


## 2026-11-23 — PR #36 : comportement PARTIAL non strict après répétitions (lots 4/11)

- **RECONCILIATION** : AGENTS.md, docs/15_AUTONOMOUS_AGENT_EXECUTION.md, docs/09_CHANGELOG_WORKLOG.md et checkpoint docs/CONTINUITY_CHECKPOINT_2026-11-06.md relus ; 13 PR ouvertes dont #36 Draft, 12 issues ouvertes retrouvées. Branches concurrentes non modifiées ; aucune fusion ni S1.
- **TEST_EVIDENCE HEAD précédent** : commit `778155a07e9e2b54be823c0419818f197aae6163` ; [CI run 45078954063](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45078954063) et [Docker run 45078954056](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45078954056) : completed/success, exact-HEAD précédent uniquement. Reviews #36 : aucune.
- **CODE/TEST** : commit `d275612b4b9b706ba1a2a12a0e5fbbf8cc9c0724` étend `test/integration/ingestion-html-csv.test.ts` avec un troisième run multi-endpoints sans `failOnEndpointError` : promesse résolue, statut PostgreSQL `PARTIAL`, compteurs 2/1/1, `error_message=NULL` et absence de duplication des deux observations du sibling sain. Nettoyage borné au nouvel UUID de run. Fixtures synthétiques uniquement.
- **TEST_EVIDENCE nouveau HEAD** : tests locaux NOT_RUN ; CI/Docker exact-HEAD NOT_YET_ATTESTED après ce commit documentaire. Ne pas transférer les succès précédents.
- **BLOCK_REASON** : validation CI exact-HEAD du test non strict et revue indépendante #36 absentes ; qualifications officielles #13/#14, historiques #5 et recette réelle #17 non terminées. Aucune autorisation de fusion ou de déploiement S1.
- **NEXT_ACTION** : vérifier CI/Docker sur le nouveau HEAD et corriger toute régression ; demander revue indépendante #36, sans fusion implicite. Puis traiter une tâche indépendante des lots 0–13 après vérification des claims et contrats officiels, sans toucher aux PR concurrentes.
- **ROLLBACK** : revert ciblé du commit `d275612b` et de cette entrée documentaire sur la branche Draft ; aucun schéma, source officielle, secret, main ou S1 modifié.

---

## 2026-11-22 — PR #36 : preuve CI et contrôle d'historique PARTIAL réitéré (lots 4/11)

- **RECONCILIATION** : AGENTS.md, docs/15_AUTONOMOUS_AGENT_EXECUTION.md, journal et checkpoint docs/CONTINUITY_CHECKPOINT_2026-11-06.md consultés ; PR #36 OPEN/Draft, revues = [] ; recherche des PR/issues ouvertes ; branche initiale exactement b2fa95bcd01bbf132279a4d726117d027282c330 (comparaison GitHub identical). Aucune branche concurrente modifiée.
- **TEST_EVIDENCE** : commit initial b2fa95bcd01bbf132279a4d726117d027282c330 ; [CI run 45072540364](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45072540364) completed/success, job 137362527783 (typecheck, tests unitaires, migrations, intégration PostgreSQL, backfill) ; [Docker run 45072540400](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45072540400) completed/success, job 137362585727. Ces preuves ne certifient pas le nouveau commit.
- **CODE/TEST** : commit 00b82a6eaca31bdda85ea407c18c679309f44899 : assertions additives dans test/integration/ingestion-html-csv.test.ts. Après deux exécutions mixtes, vérifier deux lignes PARTIAL correspondant aux deux ingestion_run_id capturés, exactement deux archives saines conservées et zéro archive du sibling HTTP 404. Requête limitée aux UUID des runs synthétiques ; aucun endpoint officiel appelé.
- **TEST_EVIDENCE nouveau code** : NOT_RUN localement ; CI exact-HEAD NOT_YET_ATTESTED, à contrôler après le commit documentaire.
- **BLOCK_REASON** : revue indépendante #36 absente ; validation exact-HEAD des nouvelles assertions en attente ; contrats/licences #13/#14, normalisation #15 et recettes réelles #17 non certifiés.
- **NEXT_ACTION** : vérifier CI et Docker exact-HEAD après cette entrée ; corriger tout échec. Puis demander une revue indépendante de #36, sans fusion implicite ; sélectionner une tâche indépendante des lots 0–13 après vérification des claims. Ne pas déployer S1 ni déclarer HISTORY_COMPLETE.
- **ROLLBACK** : revert ciblé du commit 00b82a6e et de cette entrée sur la branche Draft ; aucune migration, secret, donnée réelle ni production touchés.

---

## 2026-11-22 — PR #36 : réexécution PARTIAL sans doublon (lots 4/11)

- **RECONCILIATION** : PR #1 MERGED ; PR #36 OPEN/DRAFT, base main `73256f48d81d38ce8ff6f51be9e024b25cf5dadb`, HEAD de départ `0fdae0a7bc8d9f485c0ce18917acedb7bb63ee41`. AGENTS.md, docs/15_AUTONOMOUS_AGENT_EXECUTION.md, présent journal et checkpoint historique 2026-11-06 relus ; 13 PR et 12 issues ouvertes recherchées ; reviews #36 = []. Aucun travail sur les branches concurrentes.
- **TEST_EVIDENCE précédent HEAD** : [CI run 45067707429](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45067707429) et [Docker run 45067707535](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45067707535) : completed/success pour `0fdae0a7bc8d9f485c0ce18917acedb7bb63ee41`, pas pour le nouveau code.
- **CODE/TEST** : commit `cc5c11ca7773ff23a718d8ac42e61fe301cdf9d6` ; extension additive de `test/integration/ingestion-html-csv.test.ts` pour réexécuter le marché synthétique avec un sibling sain et un sibling HTTP 404. Attendus : second run PARTIAL, summary 2/1/1, deux observations saines conservées, zéro observation du sibling rejeté. Nettoyage de l'ID de run supplémentaire ; aucune source réelle interrogée.
- **TEST_EVIDENCE nouveau code** : NOT_YET_ATTESTED ; tests locaux NOT_RUN ; attendre et inspecter CI/Docker sur le nouveau HEAD. Le succès des anciens runs n'est pas transférable.
- **BLOCK_REASON** : validation CI exact-HEAD et revue indépendante #36 absentes pour ce nouveau test ; qualifications officielles #13/#14, historique #5 et recettes #17 incomplètes ; aucune autorisation de merge ou de déploiement S1.
- **NEXT_ACTION** : contrôler CI/Docker exact-HEAD et corriger toute régression ; obtenir revue indépendante de #36. Puis reprendre une tâche libre des issues #13/#14/#15 après réconciliation/claim, sans toucher aux PR occupées ; ne certifier aucune donnée officielle sans preuve.
- **ROLLBACK** : revert ciblé du commit de test et de cette entrée sur la branche Draft ; aucune migration, secret, donnée officielle ou production modifiée.

---

## 2026-11-22 — PR #36 : non-persistance du sibling HTTP 404 en exécution PARTIAL (lots 4/11)

- **RECONCILIATION** : lecture AGENTS.md, docs/15_AUTONOMOUS_AGENT_EXECUTION.md, docs/09_CHANGELOG_WORKLOG.md et docs/CONTINUITY_CHECKPOINT_2026-11-06.md ; recherche des 13 PR et 12 issues ouvertes ; reviews #36 = []. PR #1 précédemment fusionnée selon historique documentaire ; aucune branche concurrente modifiée.
- **TEST_EVIDENCE HEAD précédent** : commit `300609f6250a493f0f523ecec96516c4a93a4846`, [CI run 45061311295](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45061311295) completed/success et [Docker run 45061311186](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45061311186) completed/success. Ces succès ne s'appliquent pas au nouveau commit.
- **CODE/TEST** : commit `b17330da123342b97e35b0ea3de11a1019075664` complète la recette PostgreSQL multi-endpoints : lorsque le sibling renvoie HTTP 404, aucune ligne dans `source.raw_artifacts` ni `market.raw_records` ne doit être persistée pour cet endpoint, tandis que les deux observations du sibling sain restent présentes. Le test conserve les assertions PARTIAL, le rejet strict et le nettoyage borné. Fixture synthétique, aucun accès réseau officiel.
- **TEST_EVIDENCE nouveau code** : NOT_YET_ATTESTED ; tests locaux NOT_RUN ; vérifier CI/Docker exact-HEAD après cette écriture.
- **BLOCK_REASON** : CI exact-HEAD du test additionnel et revue indépendante #36 non attestées ; sources officielles #13/#14, historique #5 et recettes métier #17 toujours incomplets. Aucun merge ni déploiement S1 admissible.
- **NEXT_ACTION** : contrôler CI/Docker du HEAD de #36 et corriger tout échec ; demander revue indépendante après validation. Puis qualifier les travaux libres des issues #13/#14/#15 sans collision avec les branches concurrentes, ni contournement de robots/licences.
- **ROLLBACK** : revert ciblé du commit de test et de cette entrée sur la branche Draft ; aucune migration, secret, source officielle ou production modifiée.

---


## 2026-11-22 — PR #36 : recette multi-endpoints PARTIAL en mode strict (lots 4/11)

- **RECONCILIATION** : lecture AGENTS.md, docs/15_AUTONOMOUS_AGENT_EXECUTION.md, journal canonique et checkpoint docs/CONTINUITY_CHECKPOINT_2026-11-06.md ; recherche des 13 PR et 12 issues ouvertes. Branche de travail #36 uniquement, aucun changement main, #22 ou autre PR.
- **TEST_EVIDENCE exact HEAD antérieur** : commit 819ed02a22a86233c53787530a20952a937a67e2 ; [Docker run 45056423703](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45056423703) et [CI run 45056423717](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45056423717) retournés completed/success. Ne pas attribuer ces réussites aux nouveaux commits.
- **CODE/TEST** : commits bac749abf94aa6fb760cff2d760cce6f035bfee9 et 79dff969ba5be4e28f990e506f81f4f17da79f01 ; extension additive de test/integration/ingestion-html-csv.test.ts : deux endpoints synthétiques dans le même marché, un succès HTML→CSV, un HTTP 404, rejet strict attendu, mais statut persistant PARTIAL avec summary endpoints=2, success=1, failed=1 et error_message NULL. Nettoyage du run mixte par ingestion_run_id capturé, sans suppression générique des runs du marché. Fixtures sans accès réseau réel, PostgreSQL CI isolé.
- **TEST_EVIDENCE nouveau code** : NOT_YET_ATTESTED ; tests locaux NOT_RUN ; vérifier CI et Docker du HEAD après ce checkpoint.
- **BLOCK_REASON** : validation exact-HEAD du scénario multi-endpoints et revue indépendante #36 encore non attestées ; qualification officielle des sources #13/#14 et recettes métier #17 non terminées.
- **NEXT_ACTION** : contrôler les nouveaux runs CI/Docker sur le HEAD de #36 ; diagnostiquer/corriger toute erreur de test ou de persistance ; solliciter revue indépendante avant fusion. Ensuite reprendre les lots libres #13/#14/#15 avec preuves et sans collision de branches, sans secrets ni S1.
- **ROLLBACK** : revert ciblé des deux commits de test et de cette entrée sur la PR Draft ; aucune migration ni production modifiée.

---

## 2026-11-22 — PR #36 : correction du test strict-mode après CI rouge (lots 4/11)

- RECONCILIATION : PR #36 ouverte Draft ; PR #1 précédemment fusionnée ; AGENTS.md, docs/15_AUTONOMOUS_AGENT_EXECUTION.md et worklog relus ; PR/issues ouvertes recherchées. Aucune branche concurrente modifiée.
- TEST_EVIDENCE : [CI #641 / run 45050783101](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45050783101) completed/failure, job 137295221369 : typecheck, tests unitaires, build et migrations réussis ; intégration PostgreSQL échouée à la ligne 84 (undefined versus null). [Docker #508 / run 45050783078](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45050783078) completed/success sur HEAD antérieur 80149af068c0a0751359ac8feeb9b3321ba5890d.
- ROOT_CAUSE : assertion sur failed.rows[0].error_message mais requête SQL SELECT status, summary sans error_message ; la propriété était undefined. Ceci est une erreur de test, pas une preuve de double finalisation.
- CODE/TEST : commit 9059646e1387d1670eed172770051b2c24265d49 ajoute error_message à la projection SQL du test. Aucun changement de code métier, schéma, secret, source, main ou S1.
- TEST_EVIDENCE nouveau code : NOT_YET_ATTESTED ; tests locaux NOT_RUN ; contrôler les workflows exact-HEAD après ce checkpoint.
- BLOCK_REASON : CI du correctif et revue indépendante non attestées ; qualification #13/#14 et recette métier #17 incomplètes.
- NEXT_ACTION : vérifier CI et Docker du nouveau HEAD ; corriger si échec ; ajouter ensuite une recette multi-endpoints démontrant PARTIAL conservé en mode strict ; demander revue indépendante avant toute fusion. Continuer les lots libres après réconciliation, sans toucher aux PR concurrentes ni S1.
- ROLLBACK : revert ciblé du commit de test et de cette entrée sur la branche Draft.

---


## 2026-11-22 — PR #36 : strict-mode sans double finalisation (lots 4/11)

- **RECONCILIATION** : PR #1 MERGED, PR #36 OPEN/DRAFT ; base main `73256f48d81d38ce8ff6f51be9e024b25cf5dadb`, HEAD initial `83f1712d163143465d762427cbafb84b794905d9` ; dépôt privé au contrôle GitHub. AGENTS.md, documents maîtres 00–15, checkpoint 2026-11-06 et dernier NEXT_ACTION relus ; PR/issues ouvertes recherchées ; revues #36 = []. Aucune branche concurrente modifiée.
- **TEST_EVIDENCE HEAD précédent** : [CI #638 / run 45044625482](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45044625482) et [Docker #505 / run 45044625520](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45044625520) = completed/success, exclusivement sur `83f1712d163143465d762427cbafb84b794905d9`.
- **RED (non exécuté isolément)** : commit `183164c42230741557eff0d9532d5629bb1420f7` ajoute une assertion de non-réécriture de `error_message` pour un run FAILED après signalement strict `failOnEndpointError`. Le code précédent finalisait une première fois puis réentrait dans catch pour finaliser une seconde fois.
- **GREEN (non encore validé)** : commit `493023b71f624cdaabe2b743cd61aa0ca6ffef5f` déplace la finalisation normale après le catch des erreurs opérationnelles dans `src/jobs/ingest.ts`. Une erreur opérationnelle garde sa finalisation FAILED ; une erreur de signalement strict n'écrase plus un PARTIAL/FAILED déjà enregistré. Aucun changement de schéma, source, secret, API, main ou S1.
- **TEST_EVIDENCE nouveau code** : NOT_YET_ATTESTED ; attendre les workflows CI et Docker sur le nouveau HEAD. Tests locaux NOT_RUN. La recette reste synthétique et ne certifie pas la collecte officielle.
- **BLOCK_REASON** : CI exact-HEAD et revue indépendante #36 manquantes pour ces deux nouveaux commits ; qualification officielle #13/#14 et recette métier #17 incomplètes.
- **NEXT_ACTION** : vérifier les workflows CI/Docker exact-HEAD, lire les logs et corriger toute régression ; ajouter si nécessaire une recette multi-endpoints SUCCESS/PARTIAL/FAILED pour certifier la conservation de PARTIAL, puis solliciter revue indépendante avant fusion. Poursuivre #13/#14/#15 sur tâches libres uniquement après claim/réconciliation ; aucun merge ni S1.
- **ROLLBACK** : revert ciblé des deux commits code/test et de cette entrée sur la branche Draft ; aucune donnée réelle ni production modifiée.

---

## 2026-11-22 — PR #36 : historique FAILED conservé après reprise (lots 4/11)

- **RECONCILIATION** : PR #1 réellement MERGED ; PR #36 OPEN/DRAFT, HEAD de départ `5c2f28df44f0adc5dd16ecbdcc9af5be047d9f42`, base `73256f48d81d38ce8ff6f51be9e024b25cf5dadb`. AGENTS.md, docs/15_AUTONOMOUS_AGENT_EXECUTION.md, worklog et checkpoint 2026-11-06 relus ; recherche des 13 PR ouvertes et 12 issues ouvertes ; aucune branche concurrente modifiée.
- **TEST_EVIDENCE exact HEAD précédent** : [CI run 45039498157](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45039498157) et [Docker run 45039498171](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45039498171) retournent `completed/success` pour le commit `5c2f28df44f0adc5dd16ecbdcc9af5be047d9f42`. La recherche des revues #36 retourne zéro revue. Les succès ne sont PAS transposés aux nouveaux commits.
- **CODE/TEST** : commit `f6e1824e5e2526d1ef88534ac113260df08d8cbf` renforce `test/integration/ingestion-html-csv.test.ts` : après SUCCESS → FAILED (HTTP 404 enfant) → SUCCESS, le journal `ops.ingestion_runs` doit conserver exactement deux runs SUCCESS et un run FAILED, sans réécriture silencieuse du run échoué. Les assertions précédentes de non-duplication des observations et archives sont conservées. Fixture synthétique et PostgreSQL isolé, sans réseau externe ni changement de schéma.
- **TEST_EVIDENCE nouveau code** : `NOT_YET_ATTESTED` ; contrôler CI/Docker du HEAD après ce journal, corriger tout échec avant toute revue/fusion.
- **BLOCK_REASON** : nouveau test non encore validé sur son HEAD exact ; aucune revue indépendante #36 ; qualification officielle des sources #13 et adaptateurs #14 incomplète ; aucun HISTORY_COMPLETE ni déploiement S1 attesté.
- **NEXT_ACTION** : vérifier CI/Docker exact HEAD de #36 et la conservation des statuts historiques ; corriger les erreurs éventuelles. Obtenir revue indépendante avant fusion. Poursuivre les qualifications #13/#14 et #15 sur branches libres uniquement après réconciliation/claim, sans toucher aux PR concurrentes ; ne pas fusionner ni déployer S1.
- **ROLLBACK** : revert ciblé du commit de test et de cette entrée sur la branche Draft ; aucune donnée réelle, secret, main ou serveur modifié.

---


## 2026-11-22 — PR #36 : retry après échec enfant et non-duplication (lots 4/11)

- **RECONCILIATION** : PR #1 fusionnée ; PR #36 ouverte Draft ; HEAD vérifié avant modification `acff39845ee4bffd01062da39ad27cf7249c399d` ; AGENTS.md, docs/15_AUTONOMOUS_AGENT_EXECUTION.md, worklog et checkpoint du 06/11 relus ; PR/issues ouvertes recherchées ; aucune branche concurrente modifiée.
- **TEST_EVIDENCE — GREEN sur HEAD précédent** : [CI #634 / run 45033460962](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45033460962) et [Docker #501 / run 45033460973](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45033460973) sont `completed/success` pour `acff39845ee4bffd01062da39ad27cf7249c399d`. Ces résultats ne certifient pas le nouveau commit.
- **CODE/TEST** : commit `e336d6b7a93e1769fc9c3206824a9e8f0f530757` étend `test/integration/ingestion-html-csv.test.ts` : après SUCCESS puis FAILED sur HTTP 404, un troisième passage rétabli doit revenir à SUCCESS sans dupliquer les deux observations ni les deux archives brutes. Même moteur `runIngestion`, fixture synthétique et PostgreSQL isolé ; aucun nouveau schéma, source ou orchestrateur.
- **TEST_EVIDENCE du nouveau code** : `NOT_YET_ATTESTED` ; contrôler les nouveaux workflows CI/Docker et corriger toute régression.
- **BLOCK_REASON** : CI exact HEAD du nouveau test et revue indépendante non attestées ; contrats/licences et données officielles #13/#14 non qualifiés ; pas de preuve HISTORY_COMPLETE ni déploiement S1.
- **NEXT_ACTION** : vérifier CI/Docker du HEAD après ce journal, notamment le troisième passage et les compteurs ; en cas d'échec, lire les logs et corriger la PR #36. Obtenir revue indépendante avant fusion ; poursuivre les sources officielles #13/#14 et normalisation #15 sans toucher aux PR occupées. Aucun déploiement S1.
- **ROLLBACK** : revert ciblé du commit de test et de cette entrée sur branche Draft ; aucune modification de main ou production.

---


## 2026-11-22 — PR #36 : recette intégrée GREEN et préservation des données après échec enfant (lots 4/11)

- **RECONCILIATION** : PR #1 fusionnée ; PR #36 ouverte Draft, HEAD initial exact `dff333f5a3339f2943b1094a84d53d77d3fc3b20` ; AGENTS.md, documents maîtres dans l'ordre prescrit, docs/15_AUTONOMOUS_AGENT_EXECUTION.md, checkpoint 2026-11-06 et dernier NEXT_ACTION consultés ; PR concurrentes préservées.
- **TEST_EVIDENCE — GREEN exact HEAD précédent** : [CI #632 / run 45028281579](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45028281579), job 137226001846, `completed/success`, typecheck, build, migrations, tests unitaires et intégration PostgreSQL ; les logs contiennent explicitement `ok 3 - HTML index -> CSV child -> SHA archive -> PostgreSQL -> SUCCESS; failed child -> FAILED`. [Docker #499 / run 45028281596](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45028281596), job 137226063028, `completed/success`. Ces preuves ne valent pas pour le commit nouveau.
- **CODE/TEST** : commit `60a664d88a98220f8791e545a5ce7412f74375dc` ajoute à `test/integration/ingestion-html-csv.test.ts` des assertions de non-perte et non-duplication : après l'échec HTTP 404 du CSV enfant lors d'un second passage, les deux observations déjà persistées et les deux artefacts SHA identifiés restent présents. Le code existant déduplique les artefacts par `(endpoint_code, sha256)` ; aucune modification du moteur, des schémas ou des sources.
- **TEST_EVIDENCE du nouveau code** : `NOT_RUN` au moment de ce checkpoint ; attendre CI et Docker sur le HEAD créé par la présente mise à jour.
- **BLOCK_REASON** : nouvelle CI exact HEAD et revue indépendante non attestées ; contrats/licences et observations officielles #13/#14 non qualifiés ; historique complet et publication financière #17 non certifiés.
- **NEXT_ACTION** : contrôler CI et Docker sur le nouveau HEAD et les assertions de non-duplication ; si rouge, lire les logs et corriger sur #36. Obtenir revue indépendante ; poursuivre #13/#14 avec droits officiels, sans modifier #22 ni les autres PR ; ne pas fusionner ni déployer S1.
- **ROLLBACK** : revert ciblé du commit de test et de cette entrée sur la PR Draft ; aucun impact sur main, secrets ou production.

---


## 2026-11-22 — PR #36 : correction TypeScript après CI rouge (lot 4/11)

- **RECONCILIATION** : AGENTS.md, docs/15_AUTONOMOUS_AGENT_EXECUTION.md et dernier NEXT_ACTION relus ; PR et issues ouvertes recherchées. Branche #36 conservée, aucune modification de main ni de branche concurrente.
- **TEST_EVIDENCE — FAILURE** : CI [45022944788](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45022944788), job 137209671703, échec TypeScript TS2307 lignes 25/37/39 du test d'intégration (imports relatifs incorrects), suivi de TS7006 ligne 66. Docker [45022944772](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45022944772), job 137209682285, échec de build sur les mêmes erreurs ; aucun PASS attribué à ces runs. Le log CI indique un checkout de c6af4683e2f4f274e0fd7cb255878e8fd6226f49 ; revérifier le HEAD pour chaque validation ultérieure.
- **CODE** : commit [07aa15775703e7d15e351d35a6f4d476b9cc7c69](https://github.com/Patricked-code/africafunds-market-data-pipeline/commit/07aa15775703e7d15e351d35a6f4d476b9cc7c69) corrige les imports du fichier imbriqué test/integration/ingestion-html-csv.test.ts de ../src/ vers ../../src/. Le TS7006 est vraisemblablement une conséquence du module non résolu ; son élimination reste à prouver par CI, sans prétendre à un succès.
- **BLOCK_REASON** : CI et Docker du nouveau HEAD non encore attestés ; possible erreur de schéma/runtime du test intégral à diagnostiquer ; revue indépendante absente ; contrats et échantillons officiels #13/#14 toujours à qualifier.
- **NEXT_ACTION** : contrôler CI/Docker exact HEAD de #36, lire les logs en cas d'échec, corriger les erreurs de type, fixtures, schéma et runtime de la recette intégrée ; ensuite obtenir une revue indépendante avant toute fusion et poursuivre #13/#14. Aucune exécution S1 ni certification de données réelles.
- **ROLLBACK** : revert ciblé du commit de correction des imports et de cette entrée sur la PR Draft ; aucune modification de production, migration, secret ou main.

---

## 2026-11-22 — PR #36 : recette intégrée synthétique HTTP → archive → PostgreSQL (lot 4/11)

- **RECONCILIATION** : PR #1 merged ; PR #36 open/draft ; lecture AGENTS.md, docs/15_AUTONOMOUS_AGENT_EXECUTION.md, checkpoint 2026-11-06 et worklog de branche ; recherche des PR/issues ouvertes. Aucun SHA historique réutilisé comme preuve actuelle.
- **PREUVE CI antérieure** : commit documentaire `0312bba67301156daa55674dde08946d6888d1c7` : GitHub Actions runs [45018302589](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45018302589) et [45018302597](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45018302597), tous deux `completed/success`. Ces résultats ne couvrent PAS le nouveau test.
- **CODE/TEST livré** : commit `4b4b59ca7d3a6d3556cd7bab261c2047864d775d` ; nouveau `test/integration/ingestion-html-csv.test.ts` ; exercice du vrai `runIngestion`, du fetch simulé strictement limité à deux URL `fixtures.invalid`, de l'index HTML, du CSV enfant, de l'archivage SHA-256 et du contenu de fichier, de `market.raw_records`, du statut `SUCCESS` et du statut `FAILED` pour enfant HTTP 404. Fixture et endpoint uniques ; nettoyage ciblé de la base isolée et des fichiers temporaires.
- **TEST_EVIDENCE** : `NOT_RUN` pour le nouveau test au moment du commit ; CI/Docker exact-HEAD à contrôler. Aucune source officielle interrogée, aucune preuve de collecte historique ou de production.
- **BLOCK_REASON** : réussite CI du nouveau HEAD non encore attestée ; revue indépendante manquante ; contrats/licences/échantillons officiels CBE/GOSDMX et qualifications #13 encore incomplets. Le test nécessite `DATABASE_URL` pointant vers la base de CI isolée et migrations/seed préalables.
- **NEXT_ACTION** : contrôler CI et Docker exact-HEAD de #36 ; corriger toute erreur TypeScript ou d'intégration ; obtenir une revue indépendante avant fusion. Puis reprendre les qualifications officielles #13/#14 et les lots 0–13 sans intervenir sur les branches concurrentes (#22 notamment).
- **ROLLBACK** : revert ciblé du nouveau fichier de test et de cette entrée sur la PR Draft ; aucune migration, donnée de production, secret ou serveur S1 modifié.

---


## 2026-11-22 — PR #36 : CI et Docker du contrat HTML/CSV confirmés (lot 4/11)

- **RECONCILIATION** : PR #1 `closed/merged` ; PR #36 `open/draft`, HEAD vérifié `09af8e4bce436a3a124f37c3f2d5eadcadbc359d`. Lecture de `AGENTS.md`, `docs/15_AUTONOMOUS_AGENT_EXECUTION.md`, du checkpoint `docs/CONTINUITY_CHECKPOINT_2026-11-06.md` et du présent journal ; recherche des issues ouvertes. Les SHA du 06/11 restent historiques.
- **TEST_EVIDENCE exact HEAD** : CI #627 [run 45013353229](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45013353229) = `completed/success` ; Docker/PostgreSQL isolé #494 [run 45013353242](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45013353242) = `completed/success`. Ces deux runs sont associés au HEAD `09af8e4b` ; ils ne prouvent ni collecte réelle ni exécution S1.
- **REVUE DE CODE** : le test `test/ingestion-html-csv-contract.test.ts` exerce découverte de liens, parseurs et garde de complétude avec fixtures synthétiques, mais n'exécute pas `runIngestion`, `fetchWithRetry`, `archiveRaw`, `persistRows` ni `finishRun`. Aucune recette HTTP→archive→PostgreSQL→statut final n'est donc attestée.
- **BLOCK_REASON** : revue indépendante et recette intégrée manquantes ; contrats/licences/échantillons officiels CBE/GOSDMX non qualifiés. Le nouveau commit documentaire doit être revalidé séparément ; ne pas lui attribuer les runs précédents.
- **NEXT_ACTION** : implémenter sur #36 un test d'intégration isolé qui exerce le véritable chemin HTTP/index HTML/CSV enfant/archive SHA-256/PostgreSQL/statut final, avec fixtures synthétiques, mocks réseau ou serveur local, sans requête aux sources officielles ; contrôler CI exact HEAD, demander revue indépendante ; poursuivre #13/#14 sans toucher #22 ni branches concurrentes.
- **ROLLBACK** : revert ciblé de cette entrée sur la branche Draft ; aucune migration, donnée, secret ou production modifiés.

---


## 2026-11-22 — PR #36 : contrat HTML → CSV enfant testé avec fixtures synthétiques (lot 4/11)

- **RECONCILIATION** : lecture de `AGENTS.md`, `docs/15_AUTONOMOUS_AGENT_EXECUTION.md`, `docs/09_CHANGELOG_WORKLOG.md` et du checkpoint historique 2026-11-06 ; recherche des 13 PR et 12 issues ouvertes. PR #36 toujours Draft, aucune revue indépendante retournée. PR #22 et autres branches concurrentes non modifiées.
- **TEST_EVIDENCE antérieure, exact HEAD** : commit `4b00492c07797107fe2950bc49f07834815bc61a` ; CI [45008109698](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45008109698) et Docker isolé [45008109652](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45008109652), tous deux `completed/success`. Ne pas attribuer ces résultats au nouveau code.
- **TRAVAIL CONCRET** : commit `bd0f407e7293181a93a2b06cdd64f1371c28d313` ; ajout `test/ingestion-html-csv-contract.test.ts` (3 tests) : index HTML sans table → lien CSV relatif → observations parsées → garde de complétude ; échec d'un enfant malgré CSV valide ; CSV sans observations. Fixtures exclusivement synthétiques `fixtures.invalid`, sans réseau.
- **LIMITES** : tests `NOT_RUN` au moment de l'écriture ; ce test contractuel n'exécute pas `fetchWithRetry`, l'archive SHA-256, PostgreSQL ni `runIngestion`. Il ne remplace pas la recette intégrée HTTP → DB → statut final et ne certifie aucun endpoint officiel, licence ou historique.
- **BLOCK_REASON** : CI exact-HEAD du nouveau test et revue indépendante non attestées ; intégration HTTP/archives/DB/statut manquante ; contrats/échantillons officiels des six adaptateurs #14 non qualifiés.
- **NEXT_ACTION** : contrôler les workflows CI/Docker du HEAD de cette branche après le présent commit ; corriger tout échec ; construire une recette isolée HTTP/index/CSV/DB/statut en réutilisant les tests d'intégration existants et sans réseau externe ; obtenir revue indépendante ; poursuivre #13/#14 sans toucher aux branches concurrentes.
- **ROLLBACK** : revert ciblé du commit de test et de cette entrée sur la branche Draft, sans toucher `main`, données, secrets ou S1.

---

## 2026-11-22 — PR #36 : refus des sélections vides de sources (lot 4/11)

- **RECONCILIATION** : PR #1 fusionnée ; PR #36 OPEN/DRAFT sur `fix/ingestion-false-success-20261122`, HEAD de départ `55f9f0967723d8e5df9e5abb020829cd1cff825b` ; lecture AGENTS.md, docs/15_AUTONOMOUS_AGENT_EXECUTION.md, worklog et checkpoint 2026-11-06 ; recherche des PR/issues ouvertes. Les autres branches restent intactes.
- **PREUVE CI antérieure** : les workflows GitHub Actions [45003884242](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45003884242) et [45003884201](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45003884201) sont `completed/success` pour le HEAD de départ `55f9f096`. Aucun résultat de ce type n'est attribué aux commits nouveaux.
- **CODE** : commits `6bbfba67f6d82ee44149aaade3776b2b29b122cf` et `9dd83a09dc220c1e2a632344bf6b278d9e205552` : garde `assertEndpointsSelected` et appel avant `startRun`. Un filtre qui ne correspond à aucune source ne produit plus de faux `SUCCESS` ni de run vide. Contrat explicite : échec avant création du run, pas de statut `FAILED` persistant pour cette absence de sélection.
- **TESTS** : commit `2530cc0fd5d30c257ff00633f2bbdd6dd623edaa` ajoute la couverture des comptes 0, négatifs, fractionnaires, NaN, infinis, hors entiers sûrs, et des comptes valides. **NOT_RUN** au moment de l'écriture ; la CI du nouveau HEAD reste à contrôler. Le test HTTP→HTML→CSV enfant→DB n'est pas encore livré.
- **BLOCK_REASON** : CI exact-HEAD et revue indépendante non attestées ; absence de recette HTTP/CSV intégrée ; contrats/licences et échantillons officiels CBE/GOSDMX toujours non vérifiés. Aucun S1, aucun merge, aucun HISTORY_COMPLETE.
- **NEXT_ACTION** : contrôler CI et Docker du nouveau HEAD ; corriger toute régression ; poursuivre un test d'intégration déterministe du parcours HTTP/index HTML/CSV enfant et de ses échecs, avec fixtures synthétiques et isolation de DB ; obtenir revue indépendante ; continuer issues #13/#14 sans toucher aux PR concurrentes.
- **ROLLBACK** : revert ciblé des trois commits fonctionnels/tests et de cette entrée sur la branche Draft ; aucune donnée, migration, archive, secret ou production modifiés.

---

## 2026-11-22 — PR #36 : vérification des gates CI du HEAD 129aba7a (reprise 09:39 Europe/Paris)

- **RÉCONCILIATION** : PR #1 réellement MERGED ; PR #36 OPEN/DRAFT, HEAD exact `129aba7abb4957859fde63e2fcafb4fb891a1a0e` ; recherche GitHub actuelle des PR/issues ouvertes ; lecture AGENTS.md, docs/15_AUTONOMOUS_AGENT_EXECUTION.md, journal de branche et checkpoint historique 2026-11-06. Les autres branches, notamment #22, demeurent non modifiées.
- **TEST_EVIDENCE — CI exact-HEAD** : [run 44998766549](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/44998766549), CI #621, `completed/success`, job `validate` #137135444994 `completed/success`. Étapes explicitement `success` : checkout exact PR revision, TypeScript, unit tests, build, PostgreSQL migrations/reapply, registry seed, integration tests, backfill claim/window gates, S1 read-only checks.
- **TEST_EVIDENCE — Docker exact-HEAD** : [run 44998766503](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/44998766503), Docker #488, `completed/success`, job #137135500574 `completed/success`, stack Docker isolée et persistance PostgreSQL sur runner CI. Aucun runtime S1 ni collecte réelle certifié.
- **REVUE** : `list_pull_request_reviews(#36)` retourne zéro revue ; la PR reste Draft. La validation de l'ancien HEAD ne doit pas être transposée à un commit ultérieur.
- **ANALYSE CODE** : les tests de `test/ingestion-completeness.test.ts` valident la garde pure, mais pas le chemin réel `ingestEndpoint` avec faux HTTP/archives/DB. `src/jobs/ingest.ts` traite les index HTML et les enfants ; la qualification métier d'un index sans observations et la propagation des échecs demandent encore des fixtures et tests d'intégration. Aucun contrat institutionnel CBE/GOSDMX inféré.
- **BLOCK_REASON** : revue indépendante non attestée ; test d'intégration HTTP→index HTML→CSV enfant→persistance→statut manquant ; contrats/licences/échantillons officiels des six adaptateurs #14 non vérifiés. Pas de merge, HISTORY_COMPLETE ou S1.
- **NEXT_ACTION** : compléter un test d'intégration déterministe et isolé du parcours HTML/CSV et des échecs enfants (fixtures non officielles synthétiques, aucun réseau externe) sur la PR #36 après relecture de l'architecture des tests existants ; corriger toute régression, vérifier CI exact nouveau HEAD et obtenir revue indépendante. En parallèle poursuivre qualifications #13/#14 sans toucher aux PR concurrentes. Éviter les commits documentaires répétitifs pour le seul polling CI.
- **ROLLBACK** : revert ciblé de cette entrée sur la branche #36 ; aucun code, donnée, schéma, secret ou serveur modifié pendant cette reprise.

---


## 2026-11-22 — PR #36 : CI exact-HEAD confirmée et test de dépassement des entiers sûrs

- **RÉCONCILIATION** : PR #1 fermée/fusionnée selon l'état GitHub antérieurement attesté ; PR #36 OPEN/DRAFT, branche `fix/ingestion-false-success-20261122`. Relecture AGENTS.md, protocole autonome, journal de branche, checkpoint historique et recherches des issues/PR ouvertes. Le checkpoint 2026-11-06 n'est pas un état courant.
- **PREUVE CI EXACTE** : commit `c57e80c1dfecd8e15728b7a76df03b7c4d947a94`, workflow CI [44994654930](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/44994654930) `completed/success` ; workflow Docker/PostgreSQL isolé [44994654941](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/44994654941) `completed/success`. Ces preuves ne sont pas transposables aux nouveaux commits.
- **TRAVAIL TEST** : commit `b2fb2c74f5c47a9d71715128ee09529a6acd5060` ajoute les tests de refus des compteurs supérieurs à `Number.MAX_SAFE_INTEGER` ou inférieurs à `Number.MIN_SAFE_INTEGER` pour `rows` et `failedChildren`. Le garde-fou existant `Number.isSafeInteger` est conservé sans changement de contrat. Tests ajoutés mais **NOT_RUN** pour ce nouveau commit à la rédaction.
- **BLOCK_REASON** : CI exact-HEAD après ajout des tests et présent journal non encore attestée ; revue indépendante absente ; pas de preuve de contrats/licences et fixtures officielles pour les six adaptateurs #14 ; tests end-to-end de téléchargement HTML/index et classification des échecs encore incomplets.
- **NEXT_ACTION** : vérifier CI et Docker sur le nouveau HEAD de PR #36, corriger tout échec sans fusion ; ajouter des tests d'intégration contrôlés du parcours index HTML/CSV et des téléchargements enfants, qualifier le statut des index sans observations, obtenir une revue indépendante ; poursuivre #13/#14 indépendamment des branches occupées. Ne pas revendiquer collecte réelle, HISTORY_COMPLETE, S1 ou runner permanent.
- **ROLLBACK** : revert ciblé du commit de test et de ce journal sur PR #36 ; aucune migration, source, secret, branche concurrente ni serveur modifié.

---


## 2026-11-22 — PR #36 : durcissement des compteurs de complétude

- **RÉCONCILIATION** : PR #1 fusionnée ; PR #36 toujours Draft. Les runs GitHub Actions du HEAD précédent `2c4de4c3496328f90ec14776442f230a20e9f786` sont `completed/success` : Docker [44990092461](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/44990092461), job `137109088171` ; CI [44990092470](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/44990092470), job `137109041529`. Aucune transposition de ces résultats aux nouveaux commits.
- **CODE** : commit `ef248379b6932f9f1b116656be4eb2bbb6c7a526` refuse les compteurs de lignes/échecs négatifs, fractionnaires, infinis, NaN ou non sûrs. Commit `00f54de17c072c252b2806e4654b94e0ae593551` ajoute la couverture de régression correspondante. La garde reste pure et le contrat public inchangé ; aucun accès source ni S1.
- **TEST_EVIDENCE** : nouveaux tests écrits, **NOT_RUN** au moment de ce checkpoint ; attendre les runs CI du nouveau HEAD. La revue indépendante est absente.
- **BLOCK_REASON** : CI exact-HEAD des nouveaux commits non attestée ; revue indépendante manquante ; qualification officielle des index documentaires et des six adaptateurs #14 non achevée.
- **NEXT_ACTION** : vérifier les workflows CI et Docker exact-HEAD du commit de journal, examiner les erreurs et corriger si nécessaire ; poursuivre les tests d'intégration des index HTML/CSV et l'arbitrage de statut sans faux SUCCESS ; obtenir revue indépendante et maintenir PR #36 Draft jusqu'aux gates. Poursuivre #13/#14 indépendamment des branches concurrentes.
- **ROLLBACK** : revert ciblé des commits `ef248379`, `00f54de1` et du présent checkpoint sur branche PR #36, sans changement de données ni schéma.

---

## 2026-11-22 — PR #36 : CI exacte et couverture des index HTML (reprise gouvernée)

- **PREUVES GITHUB** : sur HEAD initial de la PR #36 `103787e77b626bd0591538846f5820c81e8991ff`, workflow CI #614, run [44985642241](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/44985642241), job `validate` #137095482572 **completed/success** (TypeScript, tests unitaires, build, migrations PostgreSQL et réapplication, tests intégration, claims et fenêtres backfill). Workflow Docker isolé #481, run [44985642266](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/44985642266), job #137095482412 **completed/success** (boot et persistance PostgreSQL sur runner éphémère). Ces résultats ne valent **que pour ce SHA**, sans preuve de collecte officielle ou S1.
- **TRAVAIL CODE/TEST ADDITIF** : commit `17ae2a83c9fd06d86056825ccdc4eb576df5d878` ajoute deux cas de non-régression à `test/ingestion-completeness.test.ts` : index HTML sans table locale mais fichiers enfants avec observations, et index sans observation enfant. Aucun changement de contrat d'ingestion, aucune écriture sur les branches concurrentes.
- **LIMITES** : ces deux tests contrôlent la garde agrégée, pas le téléchargement réel ni la classification détaillée de chaque source ; CI sur le HEAD après ajout **non encore attestée**. La politique de classification `FAILED` versus `PARTIAL` pour les index légitimes et les documents sans observation demeure à arbitrer. Aucune revue indépendante attestée.
- **BLOCK_REASON** : revue indépendante absente ; qualification institutionnelle des formats et des licences #14 non achevée ; CI exact-HEAD du nouveau test et des modifications documentaires à vérifier.
- **NEXT_ACTION** : vérifier les runs `pull_request` et jobs du nouveau HEAD ; compléter si nécessaire les tests d'intégration index HTML/CSV avec fixtures autorisées et la distinction de statut sans faux SUCCESS ; obtenir revue indépendante, puis continuer les six adaptateurs officiels #14 et les qualifications #13. Préserver PR #22 et les autres branches occupées ; aucune fusion ni S1 sans gates.
- **ROLLBACK** : revert ciblé des commits de cette branche, sans modification de schéma, données ni archives.

---

## 2026-11-22 — Lot 4/11 : garde anti-faux SUCCESS ingestion (PR indépendante)

- **BASE REVÉRIFIÉE** : main `73256f48d81d38ce8ff6f51be9e024b25cf5dadb` ; branche `fix/ingestion-false-success-20261122` dédiée, sans toucher aux PR #22, #25, #26 ou #35.
- **CONSTAT CODE** : `src/jobs/ingest.ts` incrémentait le compteur d'endpoint réussi même si `parseAndPersist()` produisait zéro observation, et absorbait les échecs de liens enfants. Un archivage brut seul ne certifie pas une ingestion exploitable.
- **PATCH** : garde pure `src/jobs/ingestionCompleteness.ts`, rejet de contenu non interprété après conservation de l'archive et de l'assessment, décompte des échecs enfants, refus de SUCCESS en l'absence de lignes ou si un enfant échoue ; quatre tests unitaires `test/ingestion-completeness.test.ts`. Aucun adaptateur PDF/JSON/SDMX inventé ; aucune modification de source/licence.
- **LIMITES** : tests écrits, non exécutés localement ; CI exact-HEAD et revue indépendante à vérifier. Les cas d'index HTML sans observations et les réponses autorisées sans données doivent être qualifiés métier avant merge ; le contrat `PARTIAL`/échec reste à préciser selon la politique de run. Aucune collecte réelle, aucun S1, aucune certification des 44 sources.
- **BLOCK_REASON** : absence de validation CI, revue indépendante et échantillons officiels des six adaptateurs ; PR #22 sous travail concurrent.
- **NEXT_ACTION** : ouvrir PR Draft sur main, vérifier CI exact-HEAD et corriger les tests, demander revue ; traiter les faux SUCCESS et compatibilité des index HTML, puis poursuivre issue #14 avec formats et droits officiels. Pas de merge sans gates.
- **ROLLBACK** : revert des commits ciblés de cette branche ; archives brutes et schéma PostgreSQL inchangés.

---


## 2026-11-07 — SadiaAF S1 : première installation staging gouvernée, archives persistantes et autorisation des vhosts

- **MANDAT** : l'utilisateur autorise désormais la modification des deux vhosts `sadiaaf.wealthtechinnovations.com` et `api.sadiaaf.wealthtechinnovations.com`, et la suppression d'une archive identifiable. Audit S1 répété : API vhost 16 Ko, frontend 36 Ko ; uniquement pages Plesk d'origine, dossiers historiques `.well-known`, `e-vote`, `sadiaaf_project-v2` ; **aucune archive détectée dans ces vhosts**. Les archives AMF-UMOA, sauvegardes Plesk et autres données hors vhosts ne sont pas autorisées à suppression indifférenciée. Aucune suppression S1 effectuée.
- **ÉTAT D'ACCÈS** : MCP bridge répond, `docker ps` ne présente que le bridge healthy. `get_write_tools_context` atteste `free_shell=false` et `run_command_s1=false`. Le dépôt `Patricked-code/africafunds-market-data-pipeline` était sur `main=5b86462a1e59c20737b33b367e9ca9a16ee7afe6`, CI principale + test Docker Compose runtime SUCCESS. PR concurrente #22 Draft de backfill, laissée inchangée.
- **CORRECTION ADDITIVE** : la racine d'archive Docker du service collector était relative à chaque release : `./data/raw:/app/data/raw`. La branche `feat/sadiaaf-s1-staging-provisioning-20261107` ajoute `SADIAAF_RAW_HOST_DIR` paramétrable et fixe la production sur `$APP_ROOT/shared/raw`, supprimant le lien symbolique sous la release. Ceci protège les fichiers bruts et leur traçabilité lors des changements de version ; le staging utilise `$ROOT/shared/raw` et prépare ses permissions à l'UID du runtime Node non-root.
- **INSTALLATEUR GOUVERNÉ** : `deploy/s1/staging-provision.sh` propose uniquement `--plan` (aucune écriture), `--apply` (première installation S1 expressément approuvée, sous répertoire/volume/ports de staging fixes, exact Git SHA, checkout propre, preflight PASS, aucun volume/container existant, aucun Plesk) et `--verify` (lecture seule). En cas d'échec il conserve tous les artefacts, sans supprimer volume ou raw.
- **SECRETS** : `deploy/s1/staging-secrets-init.sh` prépare un fichier root:600 `/etc/sadiaaf-market-data-staging.env`, mot de passe aléatoire 64 hex via openssl sans affichage, refuse d'écraser un fichier existant et n'insère pas le mot de passe dans les arguments de processus. L'installateur valide la correspondance exacte de credentials DB/URL, un nom de base strictement staging et `ENABLE_SCHEDULER=false`. `deploy/s1/staging.env.example` n'a aucun secret réel.
- **TESTS ET RECETTE** : `test/s1-staging-provision.test.mjs` couvre plan sans écriture, premier install refusé sans consentement, exact SHA, collisions, interdiction MCP/vhost, archive raw persistante, non-activation du collecteur ; `.github/workflows/ci.yml` vérifie Bash et tests. Le workflow Docker runtime existant teste déjà PostgreSQL/migrations/API/web et conservation de données après recréation sur runner GitHub ; les tests additionnels sont conditionnés par CI.
- **LIMITES** : code écrit sur GitHub uniquement. **Aucune base créée sur S1**, aucun vhost modifié, aucune archive supprimée, aucun statut de collecte réelle revendiqué. Outillage staging autorisé absent, CPU/RAM/ports/volumes arrêtés et backup/restore S1 non attestés. Les gates de production et la sécurité API/RBAC restent applicables.
- **NEXT_ACTION** : CI complète + recette runtime sur HEAD, revue/PR puis fusion sans écraser le travail concurrent ; activation par l'administrateur du serveur d'une fonction MCP **bornée** au chemin de staging permettant l'exécution de ces scripts au SHA exact et l'attestation des prérequis. Première installation ensuite, vérifications des volumes/migrations/backup/restauration, collecte source autorisée, puis mise à jour réversible des deux vhosts après correction HTTP 500.

---

## 2026-11-07 — SadiaAF S1 : recette Docker intégrale isolée et correction du flag scheduler

- **MANDAT** : continuer le déploiement SadiaAF en préservant les deux domaines historiques, les services MCP et le code canonique déjà fusionné ; aucun nouveau projet de collecte ni partage d'image Docker avec MCP.
- **RÉCONCILIATION** : `main=d61fe17a6d038de00c06ea1d78ed20cf05e3c5c8`, CI main #42391464201 SUCCESS, zéro PR ouverte au départ ; S1 `docker ps` bridge MCP unique et sain, `df -h` environ 20 Go libres. `get_write_tools_context` confirme absence de shell arbitraire et d'action d'installation staging autorisée : ne pas lancer le déploiement public pour contourner le blocage.
- **DÉFAUT P0 DÉCOUVERT** : `ENABLE_SCHEDULER: z.coerce.boolean().default(true)` dans `src/config/env.ts`, ce qui convertit `"false"` en `true` ; risque de collecte non autorisée même avec `ENABLE_SCHEDULER=false` dans `.env.production.example`.
- **CORRECTION ADDITIVE** : `src/config/schedulerEnabled.ts`, branche `feat/sadiaaf-isolated-compose-runtime-smoke-20261107`, activation uniquement explicite, valeur absente = false, valeurs ambiguës rejetées. Tests `test/scheduler-enabled-env.test.ts` (false, true, absente et invalide).
- **NOUVELLE PREUVE RUNTIME** : `.github/workflows/staging-runtime-smoke.yml` lance le vrai Compose en runner GitHub éphémère, construit les images, initialise PostgreSQL avec migrations/seed, démarre API/web loopback, vérifie `/health` + statut + absence de worker collector, détruit puis recrée **les conteneurs sans supprimer le volume**, réinterroge le nombre de migrations et n'efface à la fin que les ressources de CI. **Aucune écriture S1**.
- **GATES** : CI sur HEAD exact et revue de diff obligatoires avant fusion. Un smoke Docker hébergé sur GitHub ne qualifie pas l'hébergement S1, ses sauvegardes, sa mémoire ni les licences des sources. Aucun cutover Plesk autorisé.
- **NEXT_ACTION** : obtenir la CI réelle du runtime, corriger tout écart du Dockerfile/Compose additivement, fusionner seulement si contrôles positifs ; puis action MCP bornée pour le précontrôle et provisioning de staging PostgreSQL local S1, puis pilote officiel légalement autorisé et restauration testée.

---

## 2026-11-07 — Audit live S1 réitéré, staging en lecture seule et protection image Docker

- **MANDAT** : conserver exactement les domaines `sadiaaf.wealthtechinnovations.com` et `api.sadiaaf.wealthtechinnovations.com` ; vérifier si serveur et composants sont réellement prêts/installés, puis poursuivre l'étape admissible suivante sans destruction ni reconfiguration anticipée.
- **RÉSULTATS LIVE S1** : bridge MCP disponible ; les deux domaines HTTP 500 ; racines vhosts présentes mais sans dépôt Git ; Docker n'affiche que `wealthtech_mcp_ssh_bridge` actif, PM2 n'affiche pas SadiaAF ; `df -h` 77 Go/54 Go utilisés/20 Go disponibles. Aucun PostgreSQL SadiaAF Docker actif ni job de collecte attestés. Ce constat n'exclut pas les volumes ou moteurs hors Docker arrêtés. `sadiaaf_status_s1` et `inspect_sadiaaf_s1` bloqués par le filtre read-only sur `echo`. `deploy_sadiaaf_s1(allow_write=false)` refuse l'exécution ; pas de dry-run serveur via cet outil.
- **RISQUE SÉCURITÉ COMPLÉMENTAIRE** : présence d'un `Dockerfile` avec `COPY . .` mais absence de `.dockerignore` au contrôle ; danger d'intégration de secrets .env et des archives raw dans le contexte de build. Aucun build de production S1 effectué.
- **ACTION CODE ADDITIVE** : branche `fix/sadiaaf-s1-staging-preflight-docker-context-20261107` depuis `main` SHA `d323eab41845841d5cf13453d7193500bc18793b` ; création `.dockerignore` (exclusion secrets/raw/git/backups), `deploy/s1/staging-preflight.sh` strictement read-only (SHA exact, Docker Compose, daemon, mémoire/disque, ports 18991/18992, vhosts, git propre), tests `test/s1-staging-preflight.test.mjs`, vérification modèle Docker Compose en CI, mise à jour du dossier d'audit `docs/S1_DEPLOYMENT_READINESS_20261107.md`.
- **TESTS ATTENDUS** : `bash -n`, Node tests invariants, CI typecheck+unit+build+PostgreSQL migrations/seed/integ, `docker compose config` sans création de conteneur. Tant que CI non terminée, ne pas déclarer DONE.
- **LIMITES ET RISQUES** : préflight pas exécuté sur S1 ; mémoire disponible en RAM, plugins Docker Compose, certificats Plesk, ports, snapshots PostgreSQL/raw et restoration non attestés. Collecteur rester opt-in tant que licences/protocoles des sources absents.
- **ROLLBACK** : revert ciblé des commits de branche (aucune écriture S1), conserver `main` et vhosts. Pas de `docker compose down -v`, purge vhost ou reset.
- **NEXT_ACTION** : CI verte → PR/revue → merge si admissible → créer/habiliter l'action spécifique de précontrôle staging sur S1 et la lancer en lecture seule → staging PostgreSQL isolé → API locale → archive pilote source autorisée → sauvegarde/restauration avant tout cutover public.

---

## 2026-11-07 — Mandat S1 : dépôt Git → PostgreSQL interne → collecte persistante SadiaAF (audit sans écriture)

- **CLARIFICATION DU MANDAT** : l'utilisateur demande le fonctionnement autonome de SadiaAF sur S1 : deux domaines existants, code GitHub canonique, base PostgreSQL interne, archives raw sur S1 et collecteur permanent. Il ne demande pas une collecte ponctuelle manuelle par ChatGPT. Les lots 12/13 existants s'appliquent.
- **RECONCILIATION GITHUB** : `main` vérifié au SHA `d12a440b37972756105218335671002fe1dfd11a`, dépôt `private` ; code `docker-compose.yml`, `deploy/s1/{preflight,deploy,rollback}.sh`, Node/TypeScript, PostgreSQL 16, API et scheduler déjà présents. Pas de second pipeline ni d'effacement des schémas.
- **PREUVES S1 READ-ONLY** : bridge MCP `ping` OK, présence des deux vhosts SadiaAF mais aucune racine Git, `curl -I` HTTP 500 sur les deux domaines, `docker ps` uniquement bridge MCP (pas de conteneur postgres/collector), stockage racine S1 77 Go / 54 Go utilisés / 20 Go libres. Les fonctions `inspect_sadiaaf_s1` et `sadiaaf_status_s1` échouent actuellement sur garde read-only (`echo`) ; ne pas interpréter comme preuve d'absence d'apps.
- **RISQUES STATIQUES MAJEURS SUR MAIN** : script `deploy.sh` supprimait les fichiers des deux vhosts, `rollback.sh` idem ; projet Docker Compose non stabilisé entre releases (donc volume PG potentiellement différent), lancement collector avant contrats/licences source, API sans sécurité RBAC publique attestée. Le merge du code ne prouve pas que PostgreSQL est provisionné S1.
- **TESTS RED observés avant patch** : contrôle des invariants fail-closed — 0/6 protections présentes : cutover sous double attestation, projet Docker stable, préservation de vhosts deploy/rollback, collecte opt-in, scheduler désactivé. Tests `test/s1-deployment-safety.test.mjs` ajoutés.
- **CHANGEMENTS ADDITIFS SUR BRANCHE DÉDIÉE** `fix/sadiaaf-s1-stable-db-safe-rollout-20261107` : garde avant modification production, `COMPOSE_PROJECT_NAME` stable, archives vérifiées SHA-256, aucune suppression des vhosts, rollback non destructif, profil `collector` opt-in, template `ENABLE_SCHEDULER=false`, gate CI Node/bashtest ; détail et recette dans `docs/S1_DEPLOYMENT_READINESS_20261107.md`.
- **LIMITES** : code préparé dans GitHub seulement ; **pas de S1 PostgreSQL créé**, pas de container appliqué, pas de domaine modifié, pas de source collectée, pas de déploiement ou de réussite de recette attesté. La CI/PR du HEAD et le test réel de staging sont les prochaines preuves attendues.
- **NEXT_ACTION** : obtenir CI verte + PR vérifiée, conserver `main` intact jusqu'à fusion gouvernée ; débloquer accès d'installation staging non destructive (pas de shell libre via bridge actuel), provisionner DB/volume isolés après backup, seed/migrations et API locale, ensuite source pilote légalement qualifiée, monitoring/sauvegarde/restauration, puis seulement basculement Plesk.

---

## 2026-11-07 — Réconciliation post-fusions et diagnostic backfill lease/fencing (issue #5)

- **SOURCE DE VÉRITÉ** : `get_repo` Patricked-code confirme `visibility=private` (ancienne alerte publique dépassée), `main` possède désormais le code de la PR #12 ; journal de fusion précédent : PR #4/#11/#12/#18/#10 intégrées avec preuves CI citées plus haut. Les PR #1/#2 restent ouvertes selon la recherche GitHub ; aucune nouvelle fusion ici.
- **LECTURE DU CODE MAIN** : `src/jobs/backfillClaim.ts` revendique atomiquement `PENDING/RETRY` et enregistre `locked_at`, mais ne définit ni `lease_until` ni token de fencing. `src/jobs/backfill.ts` n'applique pas de token de possession lors de ses mises à jour terminales. Risque de course en cas de reprise d'un `RUNNING` expiré : **constat statique**, pas incident observé.
- **ACTION GITHUB EFFECTIVE** : diagnostic et critères de recette ajoutés à [issue #5, commentaire 6709067230](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/5#issuecomment-6709067230). Aucun test local, CI nouvelle ou commit de code dans cette intervention ; ne pas présenter les travaux de lease comme DONE.
- **BLOCK_REASON** : absence de protocole de lease/fencing validé et de tests PostgreSQL crash/reprise ; absence d'adaptateur historique autorisé. La prochaine correction doit être développée sur branche distincte depuis le main actuel et validée en CI.
- **NEXT_ACTION** : issue #5 : migration additive lease/token, claim/heartbeat/recovery, UPDATE terminaux protégés par token, tests PostgreSQL worker A expiré → B reprend → A refusé → B seul conclut. Ensuite issue #14 adaptateurs autorisés, #15 normalisation, #16 nouvelles sources, #17 recette ; CI et revue avant merge, aucun S1.

---

## 2026-11-07 — Intégration GitHub gouvernée des cinq PR de code, sans perte de branches ni déploiement

- **MANDAT PROPRIÉTAIRE** : intégrer rapidement les travaux GitHub sur `main` en préservant la continuité et le code existant. La visibilité du dépôt reste **privée** ; `main` demeure sans protection GitHub sur décision expresse. L'ADR-014 en conserve les conséquences et contrôles compensatoires.
- **SAUVEGARDE VÉRIFIABLE** : branche `backup/main-before-pr-integration-20261107`, point de retour `fb7ec155fc748b133a771564bbd4510e1546fc68`. Les branches PR et leur historique ne sont pas supprimés.
- **PR #4 — MERGED** : socle CI Node.js 22 / PostgreSQL 16, lockfile, adaptations TypeScript, SHA de fusion `3d43dffce83203550ed57a46623d16c575a719c6` ; [CI sur main #42385711314](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42385711314) **SUCCESS**.
- **PR #11 — MERGED** : erreurs HTTP, limites de taille et retries, SHA fusion `b732e7db9aee01f4824caa1165265ea4b0ffe4f4` ; [CI main #42385935455](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42385935455) **SUCCESS**.
- **PR #12 — MERGED** : claim atomique/backfill sans faux succès pour fenêtre non prouvée, SHA fusion `81398a963c67b11dcaffdd9206e848311b999952` ; [CI main #42386153269](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42386153269) **SUCCESS** avec tests PostgreSQL.
- **PR #18 — MERGED** : audit prudent de 44 sources, inventaire et preuves read-only, SHA fusion `30d1be156701bb047839da51ed983d154d1e8550` ; [CI main #42386364765](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42386364765) **SUCCESS** ; workflow de qualification sur branche [#42383683377](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42383683377) **SUCCESS** (HEAD source original).
- **PR #10 — MERGED** : contrainte `UNIQUE NULLS NOT DISTINCT` pour lignes brutes, contrôle bloquant avant migration en présence de doublons, SHA fusion `6401c282b8905db7b817eafee704f6e963b554de` ; [CI main #42386577024](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42386577024) **SUCCESS**. **IMPORTANT** : ne jamais appliquer la migration `006_raw_records_nullsafe.sql` sur une base existante avant audit SQL de doublons, sauvegarde et restauration testée ; le merge du code ne vaut pas déploiement.
- **PR #1 (documentation)** : [PR #1](https://github.com/Patricked-code/africafunds-market-data-pipeline/pull/1) rassemble les 14 lots, l'AGENTS.md, le backlog/roadmap, les ADR, le journal et l'annexe d'origine de PR #2. Ajouter ce checkpoint et obtenir CI sur le HEAD documentaire exact **avant** sa fusion. Le document historique de PR #2 est conservé à l'identique sur **629 lignes finales sur 630**, seul le titre est adapté avec introduction de convergence ; la branche et l'historique PR #2 restent conservés jusqu'à clôture justifiée.
- **ÉCART MÉTIER NON LEVÉ** : données réelles/historiques, protocoles et droits des institutions, six adaptateurs CBE/BCT, récupération des `RUNNING` expirés, normalisation/qualité, calculs et publication, API/cockpit sécurisé, staging et S1 ne sont pas attestés comme complets. CI du code ≠ données financières prouvées.
- **GATES/ROLLBACK** : cinq PR de code fusionnées via commit `merge` sans force-push ni écrasement, chacune avec CI positive sur le HEAD d'origine et CI main au SHA de fusion ; aucune écriture S1. Rollback par `git revert -m 1` des commits de fusion en ordre inverse, dans une PR testée, **pas** par reset forcé qui perdrait des travaux ; sauvegarde pre-integration conservée.
- **NEXT_ACTION** : fusionner la PR documentaire #1 une fois la CI exacte verte, qualifier PR #2 comme annexée sans perte et clore uniquement la redondance ; puis achever progressivement les 14 lots : #14 adaptateurs et droits/fixtures officiels → #5 lease/heartbeat/reprise sûre + backfill réel → #15 normalisation/qualité → #16 FX/inflation/fonds/VL → #17 recette des marchés → staging/S1 après gates. Ne jamais présenter ces tâches encore ouvertes comme DONE.

---

## 2026-11-07 — Reprise code lot 4/11 : fenêtre historique strictement vérifiée (#5, PR #12)

- **POINT D'ENTRÉE** : reprise du `NEXT_ACTION` vérifié sous `Patricked-code/africafunds-market-data-pipeline`. Dépôt `private` et `main.protected=false` selon décision propriétaire confirmée le 07/11. `main` SHA `fb7ec155fc748b133a771564bbd4510e1546fc68`. Sept PR Draft existantes, aucune fusion. Ne pas réactiver la protection de main sans nouvelle instruction.
- **AUDIT DE L'EXISTANT** : `src/jobs/backfillClaim.ts` possédait déjà le claim atomique SQL `UPDATE ... FOR UPDATE SKIP LOCKED` avec test de concurrence PostgreSQL. `src/jobs/backfill.ts` ignorait néanmoins `window_from/window_to` en appelant l'ingestion générique `mode=discover` ; risque confirmé de faux `SUCCESS` historique. Le contrat de réponse partielle/échec d'endpoint était déjà corrigé par la PR #12.
- **IMPLÉMENTATION COMPLÉMENTAIRE** : `src/jobs/historicalWindowAdapter.ts` ajoute un contrat de collecte borné et de preuve (endpoint, bornes exactes, provenance, nombre d'observations, couverture vérifiée), avec registre d'adaptateurs **volontairement vide** faute de preuves institutionnelles. `src/jobs/backfill.ts` ne déclenche plus `discover` pour le backfill : tout endpoint sans adaptateur borné qualifié passe `BLOCKED_ADAPTER` avant le réseau. Aucune prétention à un historique complet. L'ingestion quotidienne/générique n'est pas modifiée.
- **TESTS** : `test/historical-window.test.ts` vérifie la non-qualification des 6 sources dynamiques et de collecteurs génériques, le refus de dates non concordantes, de preuve manquante et d'une page du jour ; `test/integration/backfill-window.test.ts` est exécuté sur PostgreSQL isolé après seed, vérifie le statut `BLOCKED_ADAPTER`, aucun fetch réseau ni nouveau run/archive. Le test de concurrence du claim existant demeure exécuté.
- **COMMITS ADDITIFS PR #12** : `2f937c127796105202aae5ac4cbd50f82a789b2d` → `656e073b46ba4239847b70cdb60b08b1db9ebea1` → `f01dc503bafbb8552d24108ee5e497445b063982` → `fe14611c794a537c690afc84e652b9a64bbec27a` → HEAD `bff304dbfe76a6ea38e8d3d3b7fca24319ef3450`.
- **PREUVE CI EXACTE** : [run #42384942885](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42384942885) **SUCCESS** sur `bff304dbfe76a6ea38e8d3d3b7fca24319ef3450`. Typecheck, tests unitaires, build, migrations et réapplication, seed et **deux tests PostgreSQL** (concurrence + blocage des fenêtres) verts. La PR #12 est toujours Draft, base PR #4, non fusionnée ; [description actualisée](https://github.com/Patricked-code/africafunds-market-data-pipeline/pull/12), [issue #5 documentée](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/5#issuecomment-6708772804).
- **GATES** : aucun fichier `config/sources/*.json`, aucune donnée brute ni migration SQL, aucun S1/production et aucun push `main` modifiés. Non-régression du collecteur normal validée par CI. Les status `SUCCESS` historiques exigent désormais un adaptateur et des preuves strictes. **ROLLBACK** = revert des cinq commits de PR #12, après contrôle des effets sur le traitement non fusionné.
- **STATUT** : la tranche de prévention du faux succès est **DONE sur branche** (code/tests/CI), l'issue backfill #5 reste **PARTIAL**, car la collecte de véritables fenêtres sur des données officielles, les 6 adaptateurs #14 et la reprise sûre des `RUNNING` expirés avec fencing/lease restent non implémentés. Un `BLOCKED_ADAPTER` ne signifie pas que la source est indisponible, seulement qu'aucun contrat historique n'est qualifié.
- **NEXT_ACTION** : reprendre issue #14 (contrats officiels et fixtures BCT/CBE, période/version/DSD/droits sans bypass), coder un premier adaptateur `ingestWindow` légalement vérifié avec preuve dates et couverture ; puis terminer issue #5 (lease/heartbeat/recovery/fencing), issue #15 (qualité/normalisation), #16 (FX/inflation/fonds/VL) et #17 (recette 11 marchés). Toujours dans les 14 lots existants et sans fusion/déploiement prématuré.

---

## 2026-11-07 — Décision propriétaire : dépôt privé, main sans protection GitHub

- **INSTRUCTION PROPRIÉTAIRE EXPLICITE** : « J'ai mis en privé et j'ai supprimé la protection branche ». Maintenir ce choix ; **ne pas réactiver** la protection de `main` ni modifier la visibilité.
- **VÉRIFICATION GITHUB** : `GET /repos/Patricked-code/africafunds-market-data-pipeline` → `visibility=private`, identité connectée avec `admin=true`. `GET /branches/main` → `protected=false`, contrôles requis `off` et SHA `fb7ec155fc748b133a771564bbd4510e1546fc68`. `GET /rulesets` → 403, plan GitHub ne donnant pas l'accès aux rulesets privés dans cette configuration.
- **ISSUE #3 — TRAÇABILITÉ** : [commentaire d'arbitrage et preuve](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/3#issuecomment-6708610431). Historique du P0 conservé ; ancienne exigence « protéger main » supplantée par le choix actuel du propriétaire. Confidentialité `DONE`, branche sans protection volontaire `DONE`, garanties automatisées avant merge `NEEDS_REVIEW` car non enforced.
- **CONTRÔLES COMPENSATOIRES** : branches/PR, CI sur SHA exact, tests/qualité/revue de diff/dépendances, contrôle des migrations, sauvegardes, rollback et checkpoints exigés par les règles du chantier ; ces procédures n'impliquent **aucune protection GitHub effective**. Aucune fusion et aucun déploiement n'ont été autorisés ou exécutés du seul fait de ce changement.
- **CONTINUITÉ** : reprendre les travaux admissibles #13/#14, #5, #15–#17 et les PR Draft, sans nouveau programme. Les dernières preuves CI de PR #18 restent les runs `42383683367` et `42383683377` sur HEAD `cc05846f59254ec5ee9ac15e4d6303b4fcfdd96b`, à recontrôler si le HEAD change.
- **ROLLBACK** : mise à jour documentaire additive sur PR #1 uniquement ; revert de ce commit possible, aucune modification de production/paramètres GitHub.

---

## 2026-11-07 15:55 Europe/Paris — Réconciliation P0, preuves source-audit et vérificateur fail-closed (#3/#13/#14, PR #18)

- **ADMISSION/RECONCILIATION** : GitHub connecté au compte `Patricked-code`, droits administrateur affichés. `main` SHA `fb7ec155fc748b133a771564bbd4510e1546fc68`; `main.protected=false`, required checks `off`, rulesets `[]`, lecture détaillée protection GET refusée HTTP 403 (`Resource not accessible by integration`). `get_repo` confirme **`visibility=public`**, contradiction avec la politique privée de l'issue #3. Sept PR (#1, #2, #4, #10, #11, #12, #18) toutes Draft et non fusionnées ; #10/#11/#12/#18 sont empilées sur PR #4.
- **TRACE DE GOUVERNANCE** : commentaire de réconciliation sur [issue #3](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/3#issuecomment-6708432699) : aucune modification de visibilité/permissions ; les gates réels de `main` demeurent **BLOCKED**. La sécurité et l'intention propriétaire doivent être arbitrées avant fusion.
- **PREUVE NATIVE DU RUN INITIAL DE LA REPRISE** : artifact ZIP GitHub ID `13577514837` du [run 42381995032](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42381995032), SHA ZIP `f9236465743ce493ec08ce4799bcbd890fae212678b7bb9f95214533d06807ec` : 11 marchés, 44 endpoints, 13 HEAD 200 / 28 NOT_PROBED / 2 HEAD 403 / 1 HEAD 404 ; 44 droits non vérifiés, zéro publication admissible. Attestation additionnelle dans `docs/SOURCE_AUDIT_RUN_42381995032.md`, commit `fe45ffc38ef78164e5f4b0034e6380a43d930d6a` sur PR #18.
- **CODE ADDITIF / TESTS** : `scripts/verify-source-audit-evidence.mjs` (commit `c8185634af3849850005e85a9fa8de215ff70adb`), `test/source-audit-evidence.test.mjs` (commit `da5c4f7b4855e92405f621d0eb6da3534d1cef84`), puis intégration du contrôle obligatoire dans `.github/workflows/source-audit.yml` (commit `cc05846f59254ec5ee9ac15e4d6303b4fcfdd96b`). Vérification fail-closed : 44 identifiants uniques, métadonnées immuables (URL, droits, statut d'historique et publication), classification de sonde autorisée, résumé et horodatages cohérents. **5/5** tests locaux Node 22 PASS ; l'ancien artifact réel et le nouvel artifact réel passent le validateur local.
- **PREUVES CI SUR LE HEAD EXACT DE PR #18** `cc05846f59254ec5ee9ac15e4d6303b4fcfdd96b` : [CI #42383683367](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42383683367) **SUCCESS** ; [Source Qualification #42383683377](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42383683377) **SUCCESS**, incluant l'étape `Verify evidence completeness and prevent false qualification`. Aucun test, run ni SHA d'un ancien HEAD n'est substitué à ceux-ci.
- **DERNIER ARTEFACT DATÉ** : `source-qualification-evidence-42383683377`, GitHub ID `13578727535`, ZIP SHA-256 `4986b95f88f1de72b501c39f52b49df54dbf158337c7346311ac9673637cbd6f`, sondes `2026-11-07T14:53:36.072Z` → `14:54:56.337Z` : **14** `HTTP_OK_UNVERIFIED_CONTENT`, **27** `NOT_PROBED`, **2** `RESTRICTED`, **1** `NOT_FOUND`. Les 27 non sondées = 11 robots complexes / 7 robots réseau / 5 contenu inattendu / 4 HTTP 403 robots. **0** historique certifié, **44** droits non vérifiés, **0** sources publiables. Différence de statut entre deux runs ≠ preuve d'amélioration métier.
- **SUITE ISSUE #14** : commentaire [#14](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/14#issuecomment-6708510444) basé sur sources primaires CBE/GOSDMX : CONIA O/N vs indices/term rates distincts ; date de transaction ≠ date de publication ; GOSDMX ne fournit pas de contrat de téléchargement des taux via le seul catalogue. Six adaptateurs restent **BLOCKED/NOT_STARTED au niveau des données réelles**, aucune API inventée.
- **RÉCONCILIATION DOCUMENTAIRE PR #1/#2** : `docs/PROJECT_MEMORY.md` de la PR #2 est conservé dans PR #1 comme annexe avec une nouvelle introduction et le corps de mémoire historique ; 629 lignes finales identiques, seule l'introduction est adaptée. Les deux PR demeurent Draft ; aucune suppression/fermeture arbitraire.
- **GATES / NON-RÉGRESSION** : aucun remplacement de `config/sources.json` ou des 11 JSON sources, aucune donnée brute, base de production, secret, service S1, migration de production, merge ni push direct sur main. Les preuves CI portent uniquement sur HEAD précis.
- **STATUT** : réconciliation et archivage de l'audit **DONE** ; sécurisation GitHub **BLOCKED** ; issue #13 et programme des 14 lots **PARTIAL** ; production et historique financier complet **NOT_STARTED/non attestés**.
- **NEXT_ACTION (RESUME FIRST)** : (1) arbitrer/restaurer confidentialité et protéger `main` avec attestation réelle issue #3, sans rendre le dépôt public pour contourner la protection ; (2) qualifier légalement chaque source et les six adaptateurs #14 sur contrats/fixtures officiels, sans bypass ; (3) reprendre #5/PR #12 après claim anti-collision, corriger fenêtres/claims/reprise, puis #7/PR #11 ; (4) compléter normalisation #15, familles manquantes #16, pilotes #17, toujours dans les 14 lots existants ; (5) valider dépendances PR #4 et autres PR Draft avant toute intégration et démontrer la véritable exécution autonome #9 sans confondre MCP/UAES/SadiaAF.
- **ROLLBACK** : revert ciblé des commits additifs sur la branche Draft PR #18 ; restauration précédente du journal sur PR #1 si nécessaire. Aucune restauration de données/production requise puisqu'aucune écriture S1 n'a eu lieu.

---

## 2026-11-07 15:30 Europe/Paris — Qualification HEAD sans fausse certification (#13 / PR #18)

- **RECONCILIATION** : AGENTS.md, journal canonique, checkpoint docs/CONTINUITY_CHECKPOINT_2026-11-06.md et docs/15_AUTONOMOUS_AGENT_EXECUTION.md consultés sur branche PR #1 ; PR #1/#18, issues ouvertes et PR ouvertes interrogées ; source de vérité GitHub. Le dépôt reste déclaré public par get_repo. Aucun SHA historique supposé courant.
- **PREUVE CI** : pour commit exact `5c652ece870e5970150de18d59c0ca2be96de660`, CI run [42377671102](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42377671102) et Source Qualification run [42377671106](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42377671106) = completed/success (connecteur GitHub). Ces résultats ne valident pas le commit suivant.
- **CODE/TEST** : ajout additif de tests paramétrés HEAD HTTP 301/403/404/405/501 : classification REDIRECT_NOT_FOLLOWED/RESTRICTED/NOT_FOUND/HEAD_UNSUPPORTED, redirect=manual, robots préalable, aucune certification historique ni publication. Commit PR #18 `eff4ca4696585080bdac5b9a3f18e3f061230c51`. Les 44 sources ne sont pas modifiées.
- **VALIDATION** : tests locaux NOT_RUN ; workflows du nouveau SHA à contrôler. Les résultats de l'ancien SHA ne valent pas attestation de ce nouveau commit.
- **BLOCK_REASON** : les 22 NOT_PROBED, 7 HEAD 403 et 1 HEAD 404 historiques ne sont pas requalifiés par ces tests ; droits/licences et échantillons #14 non attestés ; PR #12 sans claim non modifiée ; protection/revues main non démontrées, visibilité publique à traiter dans issue #3. Aucune fusion ni déploiement S1.
- **NEXT_ACTION** : contrôler CI et audit sur `eff4ca4696585080bdac5b9a3f18e3f061230c51`, lire les artefacts du run 42314547906 et la matrice docs/SOURCE_AUDIT_RUN_42314547906.md ; qualifier légalement les sources et commencer les adaptateurs #14 sur contrats/fixtures officiels, puis #5 après claim, #15–#17 sur données réelles. Ne jamais conclure HISTORY_COMPLETE sans preuve.

---


## 2026-11-07 14:34 Europe/Paris — Validation CI et tests HTTP robots supplémentaires (#13 / PR #18)

- **RECONCILIATION** : AGENTS.md, documents maîtres 00–15, journal et contrat autonome lus sur la branche documentaire PR #1 ; issue #13, PR #18, code et tests de sa branche consultés. GitHub REST confirme visibilité `public`. Les HEAD de toutes les PR et la protection main ne sont pas intégralement attestés ici ; ne pas réutiliser d'anciens SHA comme actuels.
- **PREUVE CI** : sur le commit exact `3a9a7805687ffdd70b3c19e2cf90fe78cf5db417`, workflow CI `42373313240` = completed/success et workflow Source Qualification `42373313194` = completed/success (résultats du connecteur GitHub). Ce succès ne prouve pas la disponibilité des sources ni les historiques.
- **TRAVAIL CONCRET** : ajout d'un test paramétré sur robots.txt HTTP 301/302/401/403/429/500/503 : une réponse non autorisante doit produire `NOT_PROBED / ROBOTS_HTTP_<status>`, zéro HEAD, aucun statut de publication admissible et couverture `NOT_VERIFIED`. Commit de test `5c652ece870e5970150de18d59c0ca2be96de660` sur `audit/official-source-qualification-20261107`, PR #18. Aucune URL ni source historique modifiée.
- **VALIDATION** : test local NOT_RUN ; CI du nouveau commit à vérifier, aucun SUCCESS anticipé. Pas de fusion ni S1.
- **BLOCK_REASON** : preuves de droits/contrats et données historiques non obtenues pour #13/#14 ; 22 NOT_PROBED, 7 HEAD 403, 1 HEAD 404 historiques à requalifier ; PR #12 sans claim non touchée ; protections/revues de main non réattestées, visibilité publique à traiter dans issue #3.
- **NEXT_ACTION** : vérifier les workflows du commit `5c652ece870e5970150de18d59c0ca2be96de660`, corriger tout échec ; lire artefacts de l'audit 42314547906 et requalifier légalement chaque source ; développer ensuite les adaptateurs #14 avec contrats et fixtures autorisés, poursuivre #5 seulement après claim, puis #15–#17 selon les preuves. Aucune fusion implicite.

---


## 2026-11-07 13:36 Europe/Paris — Correction fixture robots et reprise CI (#13 / PR #18)

- **RECONCILIATION** : instructions AGENTS.md, documents maîtres 00–15, journal et contrat autonome relus sur la branche PR #1 ; issue #13 et PR #18 consultées ; branche technique confirmée `audit/official-source-qualification-20261107`. L'état de `main`, protections et l'ensemble des HEAD PR ne sont pas intégralement réattestés pendant ce passage ; les anciens SHA restent historiques.
- **PREUVE CI ANTÉRIEURE** : la recherche de runs pour l'ancien SHA `eec00076dd58ef3a7ef7e98de10d617f3b5481fc` a retourné uniquement CI `42368710321` = SUCCESS et source-audit `42368710264` = FAILURE ; ces résultats ne valident pas le commit de correction.
- **DÉFAUT ET CODE** : le test final de `test/source-audit.test.mjs` utilisait un séparateur littéral `\\n` dans la fixture robots espacée, au lieu d'un saut de ligne interprété par JavaScript ; ce cas ne représentait pas deux directives robots. Correction minimale sur la branche de PR #18, commit `3a9a7805687ffdd70b3c19e2cf90fe78cf5db417`, sans modifier les 44 sources ni la logique réseau.
- **VALIDATION** : tests locaux NOT_RUN. La requête des workflow runs associés au nouveau commit a renvoyé une liste vide à ce contrôle ; aucune CI sur ce SHA n'est attestée SUCCESS. Aucun accès réseau source ni déploiement.
- **BLOCK_REASON** : CI de source-audit antérieure rouge ; validation du nouveau commit en attente ; 22 NOT_PROBED, 7 HEAD 403 et 1 HEAD 404 historiques non résolus ; licences et fixtures #14 non attestées ; protections, revues et visibilité à réconcilier avec issue #3 ; PR #12 non modifiée sans claim.
- **NEXT_ACTION** : relever les nouveaux runs GitHub Actions du commit `3a9a7805687ffdd70b3c19e2cf90fe78cf5db417` et leurs logs ; corriger tout échec réel. Vérifier ensuite HEAD de toutes les PR et main, matrice d'audit, puis poursuivre #13 et #14 sans bypass ; #5 uniquement après claim ; #15–#17 selon preuves. Pas de fusion ni S1.

---


## 2026-11-07 12:33 Europe/Paris — Correction CI rouge robots User-agent (#13 / PR #18)

- **RECONCILIATION** : AGENTS.md, docs/09_CHANGELOG_WORKLOG.md et docs/15_AUTONOMOUS_AGENT_EXECUTION.md relus sur PR #1 ; dernier checkpoint documentaire du 06/11 et dernière entrée du 07/11 conservés. PR #1 HEAD `20aec333d30eea04e73475cb55158e2dcbdb648e`, PR #18 HEAD avant correction `4f5bb61e7081c5bfa6a28fcdc3f6deec66d65187`, PR #12 HEAD `ab45f3ffe175f69e45ba3f06ffe3b033185c6e3e` (non modifiée). Aucune fusion ni déploiement.
- **PREUVES CI** : pour l'ancien HEAD PR #18 `4f5bb61e7081c5bfa6a28fcdc3f6deec66d65187`, CI générale [42364760488](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42364760488) = completed/success ; qualification des sources [42364760480](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42364760480) = completed/failure. Logs du job `128380407489` : test `robots denial prevents endpoint probes` attendait `ROBOTS_DISALLOW` mais recevait `ROBOTS_UNPARSEABLE` ; 20 tests passés, 1 échoué, artifact absent car étape d'inventaire ignorée.
- **CAUSE ET CORRECTION** : la regex de reconnaissance d'un robots.txt non vide utilisait les séquences littérales `\\s` au lieu de la classe whitespace `\s` ; elle rejetait même `User-agent: *`. Correction minimale dans `scripts/audit-source-registry.mjs`, commit `6165f6382926ab8778d92286b4592e2d75c0d50a`. Test additionnel de règle robots valide avec espaces initiaux et refus HEAD dans `test/source-audit.test.mjs`, commit `eec00076dd58ef3a7ef7e98de10d617f3b5481fc` (HEAD technique).
- **VALIDATION** : CI et audit sur le nouveau HEAD à vérifier ; aucun test local exécuté, aucun SUCCESS déclaré pour le nouveau commit. Aucune modification des 44 sources, ni contournement robots, ni requête réseau manuelle.
- **BLOCK_REASON** : qualification précédente rouge ; protection de main et revues non attestées, visibilité publique historiquement contradictoire (issue #3), 22 NOT_PROBED/7 HEAD 403/1 HEAD 404 historiques non résolus, licences/fixtures #14 non prouvées ; PR #12 non touchée sans claim.
- **NEXT_ACTION** : contrôler les deux workflows sur `eec00076dd58ef3a7ef7e98de10d617f3b5481fc`, lire les logs et corriger si rouge ; poursuivre qualification officielle #13 sans bypass ; #14 adaptateurs sur contrats/fixtures autorisés ; #5 backfill après claim ; #15–#17 uniquement avec preuves. Maintenir toutes les PR Draft ; aucune fusion, secret ni S1.

---


## 2026-11-07 11:37 Europe/Paris — Robots plaintext non interprétable : refus conservateur (#13 / PR #18)

- **RECONCILIATION** : AGENTS.md, journal canonique, checkpoint du 06/11 et contrat docs/15 relus sur PR #1. GitHub REST : main `fb7ec155fc748b133a771564bbd4510e1546fc68` (protected=false), dépôt public (private=false), PR #1/#2/#4/#10/#11/#12/#18 Draft. PR #18 HEAD initial `c6ba7f42a1047cc773d3e0547ed3e04fd2fc60e5`, base PR #4 `fix/ci-baseline-20261106`. PR #12 HEAD `ab45f3ffe175f69e45ba3f06ffe3b033185c6e3e`, non modifiée.
- **PREUVES** : CI [42360684852](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42360684852) et audit [42360684804](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42360684804) = completed/success sur l'ancien HEAD exact `c6ba7f42a1047cc773d3e0547ed3e04fd2fc60e5` ; ces runs ne valident pas les nouveaux commits.
- **TDD / CODE** : un robots.txt HTTP 200 text/plain contenant un message de challenge non HTML sans directive User-agent était interprété comme une autorisation implicite. Test de refus sans HEAD ajouté commit `e1933b2aac4b5cfde2b71c6e6ae0a5c5d3bb0503` (RED prévu, non exécuté localement). Correction minimale fail-closed `ROBOTS_UNPARSEABLE` pour contenu non vide sans directive User-agent, préservant robots vide/404 et les règles valides : commit `4f5bb61e7081c5bfa6a28fcdc3f6deec66d65187` (GREEN à vérifier en CI). Aucune source historique ni donnée modifiée.
- **VALIDATION** : tests locaux NOT_RUN ; nouveaux GitHub Actions sur HEAD `4f5bb61e7081c5bfa6a28fcdc3f6deec66d65187` à contrôler avant toute déclaration SUCCESS.
- **BLOCK_REASON** : main non protégée, visibilité publique divergente de l'ancien checkpoint privé, aucune autorisation de fusion ; 22 NOT_PROBED, 7 HEAD 403 et 1 HEAD 404 de la matrice historique non résolus ; licences et données témoins #14 non attestées ; #5/PR #12 en cours sans claim exclusif attesté. Aucune fusion ni S1.
- **NEXT_ACTION** : vérifier CI générale et source-audit au HEAD exact `4f5bb61e7081c5bfa6a28fcdc3f6deec66d65187`, corriger tout échec ; poursuivre l'audit #13 avec preuves officielles sans contournement ; qualifier les six adaptateurs #14 sur contrats et fixtures autorisés ; reprendre #5 seulement après réconciliation de propriétaire/claim ; #15–#17 selon données témoins et preuves. Conserver toutes les PR Draft.

---


## 2026-11-07 10:39 Europe/Paris — Contrôle HTML robots sans en-tête MIME (#13 / PR #18)

- **RECONCILIATION** : documents AGENTS.md, worklog, checkpoint 2026-11-06 et contrat 15 relus sur PR #1 (HEAD avant écriture `e7168155ad23b880fb8781bfe60170bf360a2e51`). PR #12 Draft HEAD `ab45f3ffe175f69e45ba3f06ffe3b033185c6e3e`, non modifiée. PR #18 Draft HEAD initial `a0bf1bef042906d08de2827a9a19392c13c47552`. Dépôt `visibility=public` via get_repo, anomalie déjà suivie issue #3. Les PR/ issues ouvertes ont été réinterrogées ; aucune fusion autorisée.
- **PREUVES CI** : les workflows [CI 42356083174](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42356083174) et [audit 42356083122](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42356083122) sont `completed/success` pour l'**ancien HEAD exact** `a0bf1bef042906d08de2827a9a19392c13c47552`. Ils ne valident pas les nouveaux commits.
- **DÉFAUT ET CORRECTION** : robots.txt HTTP 200 sans Content-Type pouvait contenir une page HTML de challenge et être traité comme permission robots vide. Détection fail-closed du préfixe HTML même sans en-tête MIME dans `scripts/audit-source-registry.mjs`, sans contournement ni requête HEAD subséquente ; commits `bdbdc378ff0245dd9ddfddbde5afd13bc9412353` puis correction de syntaxe `c6ba7f42a1047cc773d3e0547ed3e04fd2fc60e5`. Aucun changement des 44 sources.
- **TEST** : scénario simulé `test/source-audit.test.mjs` pour page HTML robots sans Content-Type, zéro HEAD, `NOT_PROBED / ROBOTS_UNEXPECTED_CONTENT_TYPE`, couverture `NOT_VERIFIED` ; commit `3852adc0d8144355363b7ab803054e21ab3ce9f9`. Tests locaux NOT_RUN ; CI sur HEAD technique final `c6ba7f42a1047cc773d3e0547ed3e04fd2fc60e5` à contrôler.
- **BLOCK_REASON** : protection/revue main non attestées ; dépôt déclaré public contrairement à l'ancienne mémoire ; 22 NOT_PROBED, 7 HEAD 403 et 1 HEAD 404 historiques non résolus par ce test ; licences et fixtures #14 absentes ; backfill #5 incomplet. Pas de merge, S1, secrets ni HISTORY_COMPLETE.
- **NEXT_ACTION** : contrôler les deux GitHub Actions au HEAD exact `c6ba7f42a1047cc773d3e0547ed3e04fd2fc60e5`, corriger toute CI rouge ; poursuivre qualification officielle #13 sans bypass, puis adaptateurs #14 sur contrats autorisés ; reprendre #5 seulement après claim et vérification du HEAD ; #15–#17 selon preuves. Maintenir PR Draft et le journal comme autorité unique.

---


## 2026-11-07 09:34 Europe/Paris — Validation URL réelle au gate de publication (#13 / PR #18)

- **RECONCILIATION** : AGENTS.md, worklog et contrat 15 relus dans PR #1 ; PR #1/#12/#18 ouvertes Draft. PR #18 base PR #4 (branche CI), non main. Runs antérieurs #42352277555 (CI) et #42352277554 (audit) : jobs terminés SUCCESS sur ancien HEAD `9cf54fad84c8ca76ed678a727f741a43e2a86dfe`. Cela ne valide pas les nouveaux commits.
- **DÉFAUT** : `sourceReadiness()` acceptait une étiquette `urlPolicy=APPROVED_HOST` sans revérifier l'URL réelle, alors que `probeInventory()` effectuait déjà ce contrôle. Un inventaire importé ou obsolète pouvait ainsi franchir le gate de qualification à la publication.
- **CODE** : réutilisation additive de `validateEndpointUrl(endpoint.url)` dans `sourceReadiness()`, refus `URL_POLICY_NOT_APPROVED` pour URL absente, invalide ou non autorisée. Commit `dbcf01dd4c656162152a232e8c5501904c6f4274` sur PR #18.
- **TEST** : fixtures positives enrichies avec URL HTTPS approuvée ; nouveau test pour URL absente, HTTP, localhost, port personnalisé, domaine non approuvé et URL invalide, malgré label forgé. Commit `a0bf1bef042906d08de2827a9a19392c13c47552`. Validation CI sur ce HEAD : PENDING à ce checkpoint, tests locaux NOT_RUN.
- **BLOCK_REASON** : protections/revues main non attestées, visibilité publique à réconcilier avec issue #3 ; 22 NOT_PROBED, 7 HEAD 403, 1 HEAD 404 historiques non résolus ; licences et données témoins manquantes. Pas de fusion, ni S1, ni certification HISTORY_COMPLETE.
- **NEXT_ACTION** : vérifier CI et source-audit sur HEAD `a0bf1bef042906d08de2827a9a19392c13c47552` et corriger tout échec ; reprendre #13 qualification autorisée puis #14 adaptateurs et #5 backfill après coordination de propriété ; #15–#17 sur preuves réelles uniquement.

---

## 2026-11-07 08:40 Europe/Paris — Refus des pages HTML de challenge robots (#13 / PR #18)

- **RECONCILIATION** : branche documentaire PR #1 relue (AGENTS, worklog, checkpoint 2026-11-06, contrat 15). Dépôt GitHub déclaré public ; alerte #3 conservée. La CI #42347592300 et l'audit #42347592309 ont été vérifiés SUCCESS sur l'ancien HEAD PR #18 `5dfb789978fdfee182c51cab28951e0c12b8f2d2` ; aucune conclusion sur les nouveaux commits.
- **DÉFAUT** : une page HTML de protection/connexion répondant HTTP 200 à /robots.txt était analysée comme un fichier robots sans règles, ce qui autorisait un HEAD sans politique réellement lisible.
- **CODE** : fail-closed sur réponse robots HTTP 200 dont Content-Type n'est pas text/plain ; statut `NOT_PROBED / ROBOTS_UNEXPECTED_CONTENT_TYPE`, sans requête HEAD. Commits PR #18 `adbeaff775e5b6655a3a78049c97b1acd41db90c`, correction de contrôle de flux `5cfcdcf986c97951d71334f8b7bc16e023ed4eda`.
- **TEST** : fixture HTML 200, vérification un seul GET, aucun HEAD, endpoint conservé et historique NOT_VERIFIED ; commit `9cf54fad84c8ca76ed678a727f741a43e2a86dfe`. Tests locaux NOT_RUN ; contrôler les workflows du HEAD exact avant tout SUCCESS.
- **BLOCK_REASON** : absence de protection et de revue pour main ; visibilité publique contradictoire ; accès/licences et fixtures historiques insuffisants pour #13/#14 ; backfill #5 incomplet. Aucune fusion ni S1.
- **NEXT_ACTION** : vérifier CI et audit sur `9cf54fad84c8ca76ed678a727f741a43e2a86dfe`, corriger si rouge ; poursuivre qualification autorisée #13, puis #14 et #5 après vérification des claims ; #15–#17 restent soumis à preuves métier.

---

Ce journal décrit les travaux réellement effectués. Ajouter les nouvelles entrées en tête.

## 2026-11-07 07:33 Europe/Paris — URL réellement revalidée avant tout réseau (#13 / PR #18)

- **RECONCILIATION** : GitHub Patricked-code, dépôt `visibility=public` (`private=false`), en contradiction avec l'ancien libellé privé ; issue #3 conserve l'alerte. PR ouvertes #1/#2/#4/#10/#11/#12/#18 ; issues ouvertes #3/#5–#9/#13–#17. PR #1 HEAD avant écriture `4133d7ac3d196325d98ddd464a427a64889087b1`, PR #12 `ab45f3ffe175f69e45ba3f06ffe3b033185c6e3e`, PR #18 `7335680fae683337496e306493adf0bd4f69e8a0`. Dernier checkpoint du journal et contrat `docs/15_AUTONOMOUS_AGENT_EXECUTION.md` relus. Les runs [CI #42343585429](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42343585429) et [audit #42343585431](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42343585431) sont **SUCCESS** sur ce HEAD **précédent**.
- **DÉFAUT** : `probeInventory()` faisait confiance à `urlPolicy='APPROVED_HOST'` provenant d'un inventaire externe et construisait ensuite `new URL(e.url)` sans revérifier l'URL réelle au point de sortie réseau. Une métadonnée obsolète ou falsifiée pouvait permettre une requête HTTP vers une destination non autorisée.
- **CODE** : sur PR #18, réutilisation de `validateEndpointUrl(e.url)` avant tout appel réseau ; refus `BLOCKED_BY_URL_POLICY` et motif explicite si l'URL réelle ne satisfait pas HTTPS, allowlist, interdiction des credentials et ports personnalisés. Commit `6f29f0edff5a56942a627c8c8ed56e801682cda3`. Les 44 sources, robots, HEAD, contrats, schémas et collecteurs ne sont pas modifiés.
- **TESTS** : deux scénarios ajoutés dans `test/source-audit.test.mjs` : aucune requête pour URL non approuvée malgré label falsifié (HTTP, localhost, IP loopback, credentials, port, hôte non approuvé, URL invalide) ; chemin nominal HTTPS conserve GET robots puis HEAD et historique `NOT_VERIFIED`. Commit `5dfb789978fdfee182c51cab28951e0c12b8f2d2` (HEAD technique après écriture). Tests locaux `NOT_RUN` ; GitHub Actions sur ce SHA exact à vérifier. Les runs #42347584135/#42347584136 observés sur SHA intermédiaire `6f29f0ed...` ne prouvent **pas** le HEAD final.
- **BLOCK_REASON** : `main` historiquement sans protection (à revérifier via branch API), absence de fusion/revue autorisée, visibilité publique divergente ; 22 `NOT_PROBED`, 7 `HEAD 403`, 1 `HEAD 404` du snapshot #42314547906 non certifiés, licences/fixtures des 6 adaptateurs non attestées ; #5 fenêtres, lease et crash recovery incomplets.
- **NEXT_ACTION** : vérifier les runs CI/audit sur le HEAD exact `5dfb789978fdfee182c51cab28951e0c12b8f2d2`, corriger toute régression ; continuer #13 avec preuves de protocoles et droits officiels sans contournement ; #14 uniquement sur contrats et fixtures autorisés ; reprendre #5/PR #12 après claim explicite ; puis #15–#17. Ne jamais fusionner, déployer S1 ou certifier les historiques sans preuves.

---

## 2026-11-07 06:38 Europe/Paris — Audit réseau fail-closed pour enabled absent ou ambigu (#13 / PR #18)

- **RECONCILIATION** : GitHub Patricked-code : dépôt `visibility=public` (alerte #3), `main=fb7ec155fc748b133a771564bbd4510e1546fc68`, `protected=false`. PR ouvertes #1/#2/#4/#10/#11/#12/#18 ; issues #3/#5–#9/#13–#17. PR #1 HEAD avant écriture `cb9f66a8f20b3955abfea35d19ba05a1de806f1e`, PR #12 `ab45f3ffe175f69e45ba3f06ffe3b033185c6e3e`, PR #18 `74bf64cd4581fe4a7caa5ae3bb7d70f2d9373219`. Documents AGENTS, checkpoint 2026-11-06, journal et contrat d'exécution relus. La CI [42339430636](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42339430636) et l'audit [42339430639](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42339430639) sont `SUCCESS` sur le SHA **antérieur** `74bf64cd...`.
- **DÉFAUT** : `probeInventory()` pouvait contacter `robots.txt` puis l'endpoint lorsque `configured` était absent, `null` ou ambigu, alors que `sourceReadiness()` exige déjà `configured === true`. Un inventaire partiel ne doit pas déclencher de requête réseau. Le registre initial n'est pas modifié.
- **CODE** : sur PR #18, `scripts/audit-source-registry.mjs` exige désormais `configured === true` avant tout réseau et rend `NOT_PROBED / ENDPOINT_NOT_ENABLED` sinon. Commit `d54e192867f5bb4392a4328de1dc05db4dd55c77`.
- **TESTS** : `test/source-audit.test.mjs` ajuste les fixtures existantes et ajoute une vérification sans requête pour `undefined`, `null`, `false`, `'true'`, `1`. Commit `7335680fae683337496e306493adf0bd4f69e8a0` (nouveau HEAD technique écrit). Les tests n'ont **pas** été exécutés localement ; CI exacte du nouveau HEAD à vérifier. Runs initialement observés sur le commit intermédiaire `d54e192...` : [42343579970](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42343579970) et [42343579771](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42343579771) `QUEUED`, donc ne prouvent pas le HEAD final.
- **BLOCK_REASON** : `main` non protégée, revues et fusion non autorisées, visibilité publique divergente de la documentation historique ; 22 NOT_PROBED, 7 HEAD 403 et 1 HEAD 404 historiques non certifiés ; absence de contrats/fixtures/licences pour les six adaptateurs ; fenêtres, lease et crash recovery du backfill encore à achever. Aucun S1.
- **NEXT_ACTION** : vérifier les deux runs CI/audit sur le HEAD exact `7335680fae683337496e306493adf0bd4f69e8a0` et corriger si rouge ; poursuivre #13 avec accès et droits officiels sans bypass, puis #14 ; traiter #5/PR #12 seulement après coordination du claim et inspection de son HEAD, puis #15–#17. Ne pas fusionner ni déployer.

---

## 2026-11-07 05:39 Europe/Paris — Gate de publication fail-closed si métadonnées absentes (#13, PR #18)

- **RECONCILIATION** : dépôt GitHub `visibility=public` (ancien libellé privé contradictoire, issue #3) ; `main=fb7ec155fc748b133a771564bbd4510e1546fc68`, `protected=false`. PR ouvertes #1/#2/#4/#10/#11/#12/#18, issues #3/#5–#9/#13–#17. PR #1 initialement `9d891e0b1a57e1df21a90e5bf014b2e86a5d841e`, PR #12 `ab45f3ffe175f69e45ba3f06ffe3b033185c6e3e`, PR #18 initialement `88113d5fc9235156ab4c86a05e0d5873db5d2e99`. Les workflows sur ce dernier HEAD étaient bien SUCCESS : CI [42334911313](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42334911313), audit [42334911348](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42334911348). Le checkpoint 2026-11-06 a été relu ; la présente entrée plus récente fait autorité pour NEXT_ACTION.
- **DÉFAUT / CODE** : `sourceReadiness()` ne bloquait que `configured === false` et un `urlPolicy` présent mais différent de `APPROVED_HOST`. Un enregistrement partiel dépourvu de ces deux champs pouvait donc être déclaré publiable si les autres critères étaient artificiellement positifs. Correction fail-closed : exiger `configured === true` et `urlPolicy === APPROVED_HOST`, sans modifier le registre des 44 sources ni le collecteur. Commit PR #18 `e1e57814408d6302cc5ba849e9d79fc739d73e89`.
- **TESTS** : fixtures de publication déjà positives ajustées pour expliciter les deux gates ; tests ajoutés pour `undefined`, `null`, `false`, types ambigus et URL policy absente ou invalide. Commit `74bf64cd4581fe4a7caa5ae3bb7d70f2d9373219` (HEAD technique observé). Aucune licence ni donnée historique n'est attestée par ces fixtures.
- **CI / PREUVE** : nouveaux runs déclenchés automatiquement après écriture ; les runs [42339423751](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42339423751) et [42339423754](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42339423754) observés `in_progress` au SHA intermédiaire `e1e5781`, donc **ne prouvent pas** le HEAD final `74bf64cd...`. Attendre la CI et l'audit sur le HEAD exact et inspecter leurs jobs.
- **BLOCK_REASON** : absence de protections `main` et de revues attestées, visibilité publique divergente de l'historique ; 22 NOT_PROBED, 7 HEAD 403, 1 HEAD 404 du run 42314547906 non résolus sans accès/licences/fixtures officiels ; six adaptateurs #14 et fenêtres/leases/crash recovery #5 non terminés. Aucune fusion ni déploiement S1.
- **NEXT_ACTION** : vérifier CI/audit sur HEAD PR #18 `74bf64cd4581fe4a7caa5ae3bb7d70f2d9373219`, corriger si échec ; poursuivre #13 par qualification officielle documentée sans bypass. Reprendre #5/PR #12 uniquement après vérification du HEAD et coordination de propriété ; puis #14, #15, #16, #17 dans les 14 lots existants. Ne pas confondre la plateforme SadiaAF avec l'application AfricaFunds.

---

## 2026-11-07 04:37 Europe/Paris — Publication refusée pour source désactivée ou URL non approuvée (#13 / PR #18)

- **RECONCILIATION** : `main` `fb7ec155fc748b133a771564bbd4510e1546fc68`, `protected=false`, dépôt `visibility=public` malgré mention privée historique (issue #3). PR ouvertes #1/#2/#4/#10/#11/#12/#18 ; issues ouvertes #3/#5–#9/#13–#17. PR #1 au départ `1026a5fb85f6cf08f71bc789606c9c6d4b14d3c0`; PR #12 `ab45f3ffe175f69e45ba3f06ffe3b033185c6e3e`; PR #18 au départ `008937c5457f02d19a2db401fa5017101769f6ba`, CI `42329899523` SUCCESS et audit `42329899500` SUCCESS sur ce SHA antérieur.
- **BUG / CODE** : `sourceReadiness()` pouvait déclarer admissible une source explicitement désactivée ou portant `urlPolicy=UNAPPROVED_HOST` si ses autres métadonnées de validation étaient positives. La correction additive de `scripts/audit-source-registry.mjs` ajoute les blocages `ENDPOINT_DISABLED` et `URL_POLICY_NOT_APPROVED` ; aucune modification des 44 endpoints ni de la collecte. Commit `895dc3ad43077787553bd292b510574baf7ef6b9`.
- **TEST** : ajout dans `test/source-audit.test.mjs` d'un test avec fixture de qualification positive et trois refus (disabled, URL non approuvée, les deux), commit `88113d5fc9235156ab4c86a05e0d5873db5d2e99` ; attendre les deux GitHub Actions sur ce SHA exact avant de déclarer la validation. Le test n'accorde aucun droit réel à une source.
- **BLOCK_REASON** : les 22 `NOT_PROBED`, 7 `HEAD 403`, 1 `HEAD 404` de la matrice du run `42314547906` restent non résolus faute de protocoles/licences/fixtures attestés ; aucune série `HISTORY_COMPLETE`. Les 6 adaptateurs #14 et le backfill complet #5 restent à terminer. `main` non protégée ; aucune fusion ou déploiement S1 autorisés.
- **NEXT_ACTION** : vérifier les CI et audit du HEAD exact `88113d5fc9235156ab4c86a05e0d5873db5d2e99` ; poursuivre #13 avec tests de robots/URLs et preuves officielles sans bypass ; préparer #14 sur contrats officiels ; reprendre #5/PR #12 avec claim explicite et vérification du HEAD avant tout changement ; puis #15–#17. Aucune fusion.

---

## 2026-11-07 03:33 Europe/Paris — Robots.txt : sélection du groupe User-agent le plus spécifique (#13 / PR #18)

- **RECONCILIATION** : main `fb7ec155fc748b133a771564bbd4510e1546fc68`, `protected=false`; PR #1 `df999a541cf6e6a3c4d11cbcd2dd6b162994f94b` au départ, PR #12 `ab45f3ffe175f69e45ba3f06ffe3b033185c6e3e`, PR #18 `dcbb1d4d5f8d5b48f89d0d27b9213951bf82edf7` au départ. PR #18 CI `42324487253` SUCCESS et audit `42324487153` SUCCESS sur ce dernier HEAD précédent ; nouvelles modifications non couvertes par ces runs. PR #1/#2/#4/#10/#11/#12/#18 ouvertes. Issues #3/#5–#9/#13–#17 ouvertes.
- **CODE** : PR #18 branche `audit/official-source-qualification-20261107` ; `scripts/audit-source-registry.mjs` corrigé : la sélection de règles robots respecte désormais le token de produit en préfixe et choisit le groupe `User-agent` correspondant le plus long. Le code précédent utilisait `includes`, autorisant une correspondance partielle non pertinente à supplanter le groupe wildcard, ou mélangeait des groupes de spécificité différente. Aucun téléchargement financier ni contournement robots. Commit code `4d9b4208b8cedfc401d102e8c14c404c49c9ecee`.
- **TESTS** : deux tests ajoutés pour groupes de spécificités différentes, token sans correspondance, groupes égaux ; commits `1915222aa6cb1f9c4748eb287082fbb338ce2fc5` puis correction de fixture `008937c5457f02d19a2db401fa5017101769f6ba`. **VALIDATION** : attendre les GitHub Actions sur HEAD exact `008937c5457f02d19a2db401fa5017101769f6ba` ; ne pas inférer SUCCESS des runs précédents.
- **BLOCK_REASON** : la correction des règles robots n'est pas une preuve d'accès aux 22 endpoints non sondés, 7 réponses 403 ou 1 réponse 404. Aucun droit, protocole, historique, adaptateur CBE/BCT ni publication attestés. `main` sans protection ; visibilité du dépôt précédemment retournée `public`, alerte issue #3.
- **NEXT_ACTION** : vérifier CI/audit du nouveau HEAD PR #18 ; en cas de succès, qualifier les règles robots réelles sans bypass et les contrats officiels #13/#14 ; continuer #5 sur fenêtres historiques, leases et reprise crash après vérification de claim ; puis #15–#17. Aucun merge ni déploiement S1.

---

## 2026-11-07 02:30 Europe/Paris — PR #18 : aucun sondage réseau sur source désactivée

- **RECONCILIATION** : GitHub main `fb7ec155fc748b133a771564bbd4510e1546fc68`, `protected=false` ; API dépôt `visibility=public` (écart avec ancien libellé privé, issue #3 ouverte). PR #1 HEAD `5ff56f3a03330d44ee13f0267507a96a446f9952` avant ce checkpoint ; PR #12 HEAD `ab45f3ffe175f69e45ba3f06ffe3b033185c6e3e` avec CI `42313428780` SUCCESS ; PR #18 avant correction `0ae361968b5fe7870c456d1f083597fb1fd9311c` avec CI `42322814867` SUCCESS et audit `42322814792` SUCCESS. Issues #3, #5–#9, #13–#17 ouvertes. Aucune fusion.
- **ANOMALIE CORRIGÉE / #13** : `buildInventory()` enregistrait `configured=false` pour les sources désactivées, mais `probeInventory()` ignorait ce drapeau et pouvait lancer des requêtes `robots.txt` et `HEAD` malgré une désactivation. Correction minimale additive dans `scripts/audit-source-registry.mjs` : court-circuit `NOT_PROBED / ENDPOINT_DISABLED` avant toute opération réseau, sans effacer la source du catalogue et sans modifier la qualification métier.
- **CODE/TEST** : PR [#18](https://github.com/Patricked-code/africafunds-market-data-pipeline/pull/18), commits `79411ab06545ef4424d301184d081f1640cb93f7` et `dcbb1d4d5f8d5b48f89d0d27b9213951bf82edf7` (HEAD à la fin des écritures techniques). Deux tests ajoutés dans `test/source-audit.test.mjs` : zéro appel réseau pour une source désactivée et conservation du sondage robots-gated pour une source activée. Le test vérifie aussi qu'aucune couverture historique ni autorisation de publication n'est accordée implicitement.
- **CI** : runs initialement observés `42324477390` (audit) et `42324477309` (CI) au commit intermédiaire `79411ab0`, `queued` au contrôle ; **ils ne valident pas encore le HEAD final avec tests**. Vérifier les nouveaux runs sur HEAD exact `dcbb1d4d5f8d5b48f89d0d27b9213951bf82edf7` ; résultats non attestés à ce checkpoint.
- **BLOCK_REASON** : les 22 `NOT_PROBED` historiques (robots), 7 HEAD 403 et 1 HEAD 404 ne sont pas résolus par ce correctif ; droits, formats, fenêtres et couverture restent non attestés. Les 6 adaptateurs CBE/BCT n'ont pas encore de fixtures et contrats officiels suffisants pour certification. Protection `main` absente et visibilité publique signalée issue #3.
- **NEXT_ACTION** : contrôler CI et audit au HEAD exact PR #18, puis reprendre #13 avec qualification officielle robots/403/404 sans bypass ; obtenir fixtures et droits pour #14 ; poursuivre indépendamment #5/PR #12 sur fenêtres historiques, leases et crash recovery avec claim explicite avant modification concurrente ; ensuite #15→#17. Aucun merge, aucun déploiement S1.

---

## 2026-11-07 — SadiaAF réaffirmé et source-qualification durcie (PR #18)

- **Clarification de périmètre** : SadiaAF est la plateforme centrale de données financières africaines. `Patricked-code/africafunds-market-data-pipeline` est le nom historique de son dépôt technique et AfricaFunds une application consommatrice possible ; aucune refonte, renommage cassant ou réduction du périmètre. Entrées documentaires sur PR #1 : `AGENTS.md` (SHA commit `10f9234e96b00e7b3cac6d6e0bb7f5f812e41846`), `docs/01_PRODUCT_VISION_SCOPE.md` (`5b4dfd9fcaa66910206c4a083231da2daa4af7c5`), ADR-013 dans `docs/08_DECISION_LOG.md` (`a4a00bbcf7ae34c06ecb47fa229674a150c42489`).
- **Qualification sans faux positifs** : suite additive dans PR [#18](https://github.com/Patricked-code/africafunds-market-data-pipeline/pull/18), HEAD `0ae361968b5fe7870c456d1f083597fb1fd9311c`. `scripts/audit-source-registry.mjs` initialise sur chacun des 44 endpoints `rightsStatus=NOT_VERIFIED`, `sourceFormatStatus=NOT_VERIFIED`, `normalizationStatus=NOT_VERIFIED`, `historicalCoverage=NOT_VERIFIED`, `publicationEligible=false` ; les 6 sources dynamiques restent `historicalAdapterStatus=BLOCKED_ADAPTER`. `sourceReadiness()` exige droits, formats, adaptateur, historique, normalisation, preuves et publication approuvés ; un HEAD 2xx ne les lève pas. Tests correspondants ajoutés.
- **Preuve CI exacte** : [audit #42322814792](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42322814792) `SUCCESS` et [CI générale #42322814867](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42322814867) `SUCCESS`, tous deux au SHA `0ae361968b5fe7870c456d1f083597fb1fd9311c`. Résultats unitaires ≠ certification des 44 sources ni preuve de publication.
- **Diligence officielle** : GSE Ghana, page publique https://gse.com.gh/market-reports/ et barème officiel *avril 2024* https://gse.com.gh/wp-content/uploads/2025/01/GSE-Market-Price-List-2024.pdf : conditions d'usage historiques, dérivés, index et redistribution potentiellement sous licences distinctes, droits 2026 non attestés ; commentaire issue [#13](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/13). Portail BCT GOSDMX et pages CBE CONIA relevés sur issue [#14](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/14), sans preuve d'API, fixtures ou licence opérationnelles.
- **RECONCILIATION** : `main` inchangée `fb7ec155fc748b133a771564bbd4510e1546fc68`, `protected=false`; `get_repo` renvoie `visibility=public`, contraire au statut privé historique (alerte issue #3 déjà créée). PR #1/#18 Draft ; aucun merge, déploiement, suppression de source ni écriture de production.
- **NEXT_ACTION** : poursuivre la qualification des sources #13 avec contrôles de licences, accès et formats officiels ; ensuite fabriquer les fixtures autorisées et adaptateurs CBE/BCT #14. Parallèlement, terminer le vrai backfill #5 (fenêtres, leases, crash recovery) en reprenant PR #12, puis normalisation #15, sources manquantes #16 et validation marchés #17. Préserver le socle existant, la matrice des 14 lots et les gates GitHub/S1.

---

## 2026-11-07 — Réconciliation des gates et CI audit, alerte visibilité issue #3

- **RECONCILIATION** : GitHub `get_repo` sous identité Patricked-code renvoie `visibility=public` ; la PR #1 reste Draft ouverte, la PR #18 reste Draft ouverte sur `audit/official-source-qualification-20261107`, HEAD exact `2808fcb2ffa74e69fb8ea297f8565bd5ca5278d1`, base `fix/ci-baseline-20261106`. Les issues #13–#17 sont ouvertes. Aucune modification de visibilité, aucune fusion.
- **TEST_EVIDENCE** : inspection directe des jobs Actions : CI [42314998003](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42314998003) job `validate` `completed/success`; audit [42314998004](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42314998004) job `qualify-44-endpoints` `completed/success`. Les tests de workflow et sondages HEAD ne certifient pas les séries ni les historiques. Matrice `docs/SOURCE_AUDIT_RUN_42314547906.md` lue sur branche PR #18 : 14 HEAD 200, 7 HEAD 403, 1 HEAD 404, 22 NOT_PROBED ; aucun HISTORY_COMPLETE.
- **ACTION_EFFECTIVE** : alerte complémentaire déposée dans [issue #3](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/3) concernant l'incohérence `privé`/`public` et les protections non attestées. Aucune écriture sur PR #12/#18 possiblement possédées par une autre exécution ; pas de nouveau runner ni registre.
- **BLOCK_REASON** : protection main non attestée à cette exécution, statut public contraire au texte historique #3 ; droits d'accès et formats des sources restreintes non validés ; aucune preuve de couverture historique.
- **NEXT_ACTION** : poursuivre #13 sur preuves de robots/contrats sans bypass et qualification GSE, puis #14 fixtures officielles et #5 fenêtres/leases avec claim explicite avant toute écriture concurrente ; traiter #15–#17 par incréments testés. Contrôler les protections via endpoint GitHub admin avant toute fusion. Aucune fusion ni déploiement S1.

---
## 2026-11-07 — Validation HEAD exact de PR #18, nouveaux candidats officiels et risque de visibilité

- **HEAD de la PR [#18](https://github.com/Patricked-code/africafunds-market-data-pipeline/pull/18)** : `2808fcb2ffa74e69fb8ea297f8565bd5ca5278d1`, Draft sur `fix/ci-baseline-20261106`. Les deux workflows sont **SUCCESS sur le HEAD exact** : [source qualification 42314998004](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42314998004) et [CI générale 42314998003](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42314998003). Aucun merge ni production.
- **Preuve de sondage durable** : `docs/SOURCE_AUDIT_RUN_42314547906.md` sur la branche #18 reproduit les 44 statuts du premier run [42314547906](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42314547906) : 14 HEAD 200, 7 HEAD 403, 1 HEAD 404 GSE, 22 NOT_PROBED (robots complexe/non accessible). Artefact GitHub `13549179118`. Le premier run a été exécuté à l'ancien SHA `da1e669531ba7533df412b4f2d889374a66128e7`, puis documents ajoutés. Ce sont des contrôles d'accessibilité seulement : aucune couverture historique validée.
- **Nouvelles pistes vérifiées publiquement** (non activées dans le registre) : Ghana Stock Exchange `/trading-and-data/` et `/market-reports/` candidats pour remplacer `/market-data/` HEAD 404 ; BCT Tunisie TMM historique sur `www.bct.gov.tn/bct/siteprod/tableau_statistique_a.jsp?params=PL203105`, TUNIBOR et FX ; CBE Égypte FX/inflation historiques ; AMMC Maroc statistiques OPCVM hebdomadaires XLS/XLSX. Les pages ont été documentées dans les issues #13, #14 et #16, mais ni droits, ni formats internes, ni profondeur des historiques, ni champs VL individuels ne sont certifiés.
- **Risque gouvernance** : API REST GitHub actuelle renvoie `private=false`, `visibility=public` pour le repo contrairement à l'ancien journal le qualifiant de privé ; branche `main` `protected=false`. Alerte déposée en issue #3. Aucune modification de visibilité ni de protection.
- **Continuité récurrente** : l'automatisation existante `Automation_a523352a7c448191a41080097ce8b01f` a été mise à jour en conservant son rythme horaire et sa mission : prendre en compte les étapes #13→#14→#5→#15→#16→#17, les preuves et les gates, sans registre parallèle.
- **NEXT_ACTION** : reprendre d'abord les travaux ouverts, conserver l'audit 44/44 comme baseline et compléter par source sans bypass ; qualifier le GSE candidat et les 7 restrictions, préparer adapters officiels CBE/BCT et sources manquantes ; poursuivre backfill #5 (fenêtres/lease/recovery), normalisation #15 et validations #17. Ne déclarer DONE ni HISTORY_COMPLETE sans tests réels, document témoins et publication contrôlée.

---
## 2026-11-07 — Qualification officielle des 44 sources PR #18

- **MANDAT** : exécuter les six étapes demandées dans le pipeline existant, sans recréation : audit 44 sources (#13) → 6 adaptateurs CBE/BCT + parseurs (#14) → backfill vrai (#5) → normalisation/qualité (#15) → FX/inflation/fonds/VL (#16) → validation marché et publication (#17). Ces issues sont reliées aux 14 lots existants ; aucun programme parallèle.
- **RECONCILIATION INITIALE** : `main` `fb7ec155fc748b133a771564bbd4510e1546fc68`, protection `false`. PR #1/#2/#4/#10/#11/#12 Draft ouvertes. La PR #12 HEAD `ab45f3ffe175f69e45ba3f06ffe3b033185c6e3e` a CI `42313428780` `SUCCESS` (correctifs backfill partiels, pas de preuve fenêtre historique).
- **TRAVAIL EFFECTUÉ** : création issues #13/#14/#15/#16/#17 et commentaires source ; branche `audit/official-source-qualification-20261107` sur la CI PR #4 ; PR [#18](https://github.com/Patricked-code/africafunds-market-data-pipeline/pull/18) Draft. Ajout d'un inventaire déterministe 44/11, outil de contrôle robots-gated HTTPS HEAD à allowlist fixe de 27 hôtes et sans redirection, tests Node, workflow read-only et documents d'audit ; aucun fichier `config/sources/*.json` ni moteur original supprimé ou changé.
- **PREUVES CI** : [audit #42314547906](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42314547906) **SUCCESS**, [CI #42314547894](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42314547894) **SUCCESS**, au SHA `da1e669531ba7533df412b4f2d889374a66128e7`. Artefact GitHub `13549179118` inspecté : 44 endpoints dans inventory.json, 14 HEAD 2xx, 7 HEAD 403, 1 HEAD 404, 22 NOT_PROBED (robots complexes/non accessibles). La preuve par endpoint a été consignée en `docs/SOURCE_AUDIT_RUN_42314547906.md` sur PR #18. Après ajout documentaire le HEAD PR #18 est passé à `2808fcb2ffa74e69fb8ea297f8565bd5ca5278d1` ; nouvelle CI sur ce HEAD à vérifier avant intégration.
- **RECHERCHE OFFICIELLE** : pages CBE CONIA O/N, index, T-Bills/T-Bonds, interbancaire et pages historiques FX/inflation identifiées, mais API dynamique non qualifiée ; GOSDMX avec SDMX signalé mais accès direct indisponible ; exemples accessibles BRVM, CBN NOFR, BEAC, Botswana et NBE ; toutes observations d'accès datées et partielles. Aucun adaptateur marqué READY, aucun historique certifié.
- **STATUT VÉRITABLE** : étape 1 inventaire 44/44 + premiers probes prouvés, mais qualification source par source et couverture historique `PARTIAL`. Étapes 2/4/5/6 structurées et en qualification, non implémentées. Étape 3 PR #12 partiellement codée et testée ; fenêtres/lease/recovery non terminées. Aucun nouveau merge `main`, aucune collecte massive ni déploiement S1.
- **NEXT_ACTION** : vérifier la CI du HEAD actuel PR #18 ; améliorer prudemment la qualification des 22 non sondés en respectant robots, valider la route GSE Ghana, résoudre contractuellement les sources 403, établir fixtures/protocoles autorisés CBE/BCT, puis suivre #5 backfill et les issues #15–#17. Continuer les tâches admissibles sans remplacer les 14 lots ; préserver source registry, PostgreSQL, scheduler et API initiaux. Gates main #3 restent ouverts.
- **ROLLBACK** : tout le travail technique de l'audit est sur PR #18 ; aucune action sur serveur ou données de production.

---
## 2026-11-07 00:39 Europe/Paris — PR #12 : test de concurrence PostgreSQL réel et gate CI

- **RECONCILIATION** : main `fb7ec155fc748b133a771564bbd4510e1546fc68` (`protected=false`), PR #1/#2/#4/#10/#11/#12 Draft ouvertes, issues #3/#5/#6/#7/#8/#9 ouvertes. Le HEAD précédent PR #12 `e75fb6927be4e4d101d1b51c2bf6c30b8715ce6b` a la preuve [CI 42306338209](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42306338209) `SUCCESS` (Node/typecheck/tests unitaires/build/migrations/seed), **pas encore une preuve d'intégration multi-workers**.
- **ACTION_EFFECTIVE** : sur la branche PR [#12](https://github.com/Patricked-code/africafunds-market-data-pipeline/pull/12), ajout de `test/integration/backfill-claim.test.ts` (commit `fbae3440698482886aa57fc47be964222a32b06b`) : deux connexions PostgreSQL distinctes, transaction du premier worker laissée ouverte, tentative concurrente avec `lock_timeout`, assertion `SKIP LOCKED`, puis vérification RUNNING/attempts et nettoyage du job de test. Modification additive de `.github/workflows/ci.yml` (commit `ab45f3ffe175f69e45ba3f06ffe3b033185c6e3e`) pour exécuter ce test après migrations et seed, sans remplacer le workflow existant.
- **TEST_EVIDENCE** : nouveau HEAD `ab45f3ffe175f69e45ba3f06ffe3b033185c6e3e`, [CI 42313428780](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42313428780) `QUEUED` à la dernière lecture. **Le test d'intégration ajouté n'est PAS encore attesté PASS** ; aucune preuve RED locale n'est revendiquée. Run précédent sur commit intermédiaire 42313417357 en cours, susceptible d'être annulé par la concurrence CI.
- **BLOCK_REASON** : protection main #3 absente ; CI du nouveau HEAD à confirmer ; récupération des RUNNING abandonnés non implémentée ; fenêtres historiques non propagées ; pas d'exécuteur de codage hébergé prouvé #9. Aucune fusion, aucune migration S1, aucun déploiement.
- **NEXT_ACTION** : vérifier le résultat exact de CI 42313428780 et corriger les échecs éventuels. Ensuite poursuivre #5 avec bail/heartbeat et récupération sûre des RUNNING, puis adaptation de la collecte aux fenêtres `window_from/window_to` avec tests réels. Reprendre #7 si #5 bloqué ; conserver les gates #3 et le statut Draft.
- **ROLLBACK** : deux commits isolés sur la branche PR #12 ; aucune action sur main ni production.

---

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
