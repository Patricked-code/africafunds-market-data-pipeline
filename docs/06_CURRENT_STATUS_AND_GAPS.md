# 06 — État réel et écarts

## 2026-11-24 — Lot 11 / issue #9 : coordination inter-agents (socle en validation)
- **CONTINUITY_ID** : SADIAAF-CONTINUITY-20261124-01 ; admission publiée dans issue #9 commentaire 7121998305 ; base 50e35e703c55a0e3f22fefe862bdc9bbe657bf13. Branche dédiée `feat/sadiaaf-agent-coordination-20261124`, aucune modification des PR #22/#25/#29/#31/#32.
- **IMPLEMENTATION** : machine d'état claim/heartbeat/checkpoint/release/recover, exclusion tâche/branche/périmètre explicite, bail et génération de fencing, adaptateur GitHub Git Data CAS non-force sur ref opérationnelle dédiée. Tests unitaires et contention simulée ; pas d'initialisation live ni de preuve de contrôle universel.
- **BLOCK_REASON** : CI et Docker exact SHA à vérifier ; ref de coordination à protéger contre force push/suppression, identité/horloge de confiance et passerelle d'écriture avec fencing à raccorder ; pas de garantie contre un client qui écrit hors passerelle. Aucun S1, secret, coût supplémentaire.
- **NEXT_ACTION** : valider les tests, qualifier la ref opérationnelle et son bootstrap gouverné, exécuter contention/reprise réelle avec deux agents, imposer admission/fencing sur écritures et gate PR ; réconcilier les checkpoints avec main actuel. Lot 11 PARTIAL. Ne pas remplacer les travaux métier ni les autorités existantes.


## 2026-11-24 — Lot 9 / chantier #17 : réconciliation de la sécurité API/CORS, PR #30
- **CONTINUITY_ID** : SADIAAF-CONTINUITY-20261124-01 ; ancienne branche `fix/api-cors-origin-admission-20261114` HEAD `c4504755daaacbe1b4682f8ab495a737bbdb0654`, main protégé `9adffe7eaa711fae7f780653c44a847cbf815220`.
- **CODE EXISTANT** : huit blobs code/tests PR #30 repris sans reconstruction : `src/api/cors.ts`, `queries.ts`, `server.ts`, tests du refus d'origines non sûres et visibilité de publication des taux et indices (unitaires et PostgreSQL). Le reste de main conserve les protecteurs d'ingestion, de provenance et de qualité déjà intégrés.
- **GIT/MEMOIRE** : merge à deux parents sans force, docs/06 et docs/09 du main actuel préservés + checkpoint ; anciennes entrées de PR accessibles par son historique Git et la PR source.
- **LIMITES** : contrôles CORS et de publication ne certifient ni les droits de redistribution, ni les séries, ni l'API complète ou les recettes financières par marché. La publication de données non licenciées demeure interdite.
- **BLOCK_REASON** : CI validate et smoke Docker/PostgreSQL sur HEAD exact et remarques de revue à vérifier, aucune production S1.
- **NEXT_ACTION** : qualifier PR30 READY (10 fichiers non sensibles), label native auto-merge sous gates, CI/Docker exact SHA, corriger défauts et threads. Poursuivre ensuite backfill #22, sujets de configuration/workflows sensibles par procédure gouvernée, puis lots 0–13 selon dépendances.


## 2026-11-24 — Lot 2/11, chantier #15 : non-régression de l'admission qualité, PR #28
- **CONTINUITY_ID** : SADIAAF-CONTINUITY-20261124-01 ; branche originale `test/quality-row-admission-regression-20261112`, ancien HEAD `bebd543671f92d23ed38b4da0fb1a3dfe7ea7c5e`, main protégé `de42e308a932d144d6928419229f35cef07974d5`.
- **TRAVAUX REPRIS** : réutilisation exacte du blob `src/quality/validate.ts` et de ses tests `test/quality-rows-regression.test.ts` (scoring structurel de lignes) ; aucun nouveau modèle de qualité ni réécriture des modules de provenance intégrés en #27.
- **HISTORIQUE/GOUVERNANCE** : merge Git à deux parents non force avec main courant et documents docs/06/09 conservés, checkpoint additionnel. Les anciens commits de branche restent consultables via la PR originale. Approbation indépendante ordinaire non exigée (ADR-016), deux checks CI/Docker obligatoires et discussion résolue.
- **LIMITES** : le scoring structurel ne certifie ni validation financière par source/market, ni dates économiques et provenance complète, ni licence officielle ou publication API. Le chantier #15 et les 14 lots restent PARTIAL.
- **BLOCK_REASON** : nouvelle CI et Docker sur SHA du merge non certifiés ; toute remarque GitHub P2 devra être examinée, pas contournée.
- **NEXT_ACTION** : qualifier PR28 READY, vérifier 4 fichiers, valider tests sur SHA exact puis auto-merge native ; reprendre PR30 API ou autres PR indépendantes selon propriété/anti-collision. Aucun S1.


## 2026-11-24 — Lots 2/11, chantier #15 : admission typée et provenance, PR #27
- **CONTINUITY_ID** : SADIAAF-CONTINUITY-20261124-01. Branche d'origine `feat/quality-financial-observation-gate-20261109`, HEAD source `6b292b66c5201780b6583da6bf502a9817edfac1`, main actuel `ac6166ccff370f721110a7d68b965e95426eac9b`.
- **REUTILISATION** : trois blobs code `financialObservation.ts`, `rawRecordProvenance.ts`, `withVerifiedRawRecord.ts` et quatre fichiers tests exactement identiques à la PR historique, actuellement ABSENTS du main précédent, ajoutés sans modifier les validateurs existants ni SQL. Protection contre l'admission financière sans provenance / source / marché / méthode documentée ; aucun historique de marché certifié par cette seule création de gate.
- **HISTORIQUE** : merge Git à deux parents sans force, docs/06 et docs/09 autorité main conservés et checkpoint additif, ancienne version du journal disponible via commit PR historique. Pas de nouvelle file/roadmap, pas de changement S1.
- **BLOCK_REASON** : CI unitaires/PostgreSQL et Docker du nouveau HEAD non certifiées, éventuelles remarques de revue ; qualification de sources et mappings officiels restent incomplètes.
- **NEXT_ACTION** : qualifier PR READY sans chemins sensibles et sous SHA attendu, CI validate + Docker/PostgreSQL exacts, auto-merge native si réussite et aucun fil bloquant, puis PR #28 scoring qualité après relecture du main. Maintenir les six chantiers et 14 lots sans reconstruction.


## 2026-11-24 — Lots 5–7 / PR #34 : réconciliation des calculs de rendement et indices
- **CONTINUITY_ID** : SADIAAF-CONTINUITY-20261124-01 ; branche d'origine `7c9f5cfc65dfb7b3e8162c9a4eb62fecaeeb18ec`, parent main protégé `5236d3895a81efd3c48b03f2040041dcf6be7e7c`.
- **CODE/TEST EXACTS** : `src/calc/indices.ts` et `test/indices-finite-output.test.ts` repris tels quels de la PR historique ; contrôle des valeurs finies en entrée/sortie, overflow de moyenne/pondérations, indices positifs, sous-flux de taux FX et pertes nominales au-delà de 100 %. L'exactitude des méthodes financières et des courbes n'est PAS validée par ces tests synthétiques seuls.
- **GIT / MEMOIRE** : commit à deux parents sans force, arbre du main courant + blobs de PR #34, documents docs/06 et docs/09 actuels préservés avec ce checkpoint ; anciennes versions documentaires sont conservées dans le parent PR.
- **BLOCK_REASON** : CI validate et Docker exact SHA encore à obtenir, réactions de revue à examiner, licences/données officielles et recettes méthodologiques par marché non attestées.
- **NEXT_ACTION** : qualifier PR READY sous ruleset, lancer/enrôler auto-merge natif après périmètre et tests, corriger les anomalies, puis PR #32 obligations/Total Return. Reprendre qualité et sources officielles sans collision, aucun S1 ni coûts ajoutés.


## 2026-11-24 — Lot 4/11 : réconciliation PR #33, fiabilité des réponses HTTP avant archivage
- **CONTINUITY_ID** : SADIAAF-CONTINUITY-20261124-01. Branche source historique PR #33 `6b428474483d8086e26c995f970d88425c190a45`, base main `4b1612458f53124e4de8a5d1e74ba11ded4cee54`. Retenir les deux blobs de code/test de la PR #33 tels quels sans reconstruction.
- **MÉCANISME GIT** : merge à deux parents (branche historique comme premier parent, main comme second), branche mise à jour sans force sous expected_SHA. Documents docs/06 et docs/09 du main courant conservés avec checkpoint ; anciens journaux intégraux disponibles dans parent original.
- **COUVERTURE DU CORRECTIF** : libération des streams de réponses HTTP rejetées, limites de corps et annulation/abort, retry sans fuite et sans corrompre des archives brutes. Ce correctif ne qualifie aucun endpoint externe officiel ni ne modifie les règles d'accès.
- **BLOCK_REASON** : suite CI validate + Docker/PostgreSQL du nouveau HEAD requise, réponse éventuelle à toute revue métier, aucune source licenciée vérifiée ni S1.
- **NEXT_ACTION** : sortir Draft et label automerge-eligible seulement après vérification du périmètre sûr, tester sur SHA exact et fusionner via GitHub native, puis reprendre les PR de qualité et calculs financiers sur main actuel, sans collision.


## 2026-11-24 — Convergence PR #36 après PR #26 : ingestion, archives, index HTML et audit réel
- **CONTINUITY_ID** : SADIAAF-CONTINUITY-20261124-01. Branche originale PR #36 `fix/ingestion-false-success-20261122`, premier parent `df0129b625798147eb1dc3f283fcbd7fd19fac99`, second parent `main=02a162437a564b8b5e3bc5f8b612a11bec4b76f2`. Aucun force push ni perte de l'historique des deux parents.
- **CONSERVATION DE L'EXISTANT** : blob source `src/jobs/ingestionCompleteness.ts` et les trois tests #36 repris IDENTIQUES de la branche d'origine. Les contrôles #26 de `src/jobs/runStore.ts`, `terminalWrite.ts`, `ingestionOutcome.ts` et `ingest.ts` sont conservés dans le main courant, avec fusion minimale documentée du conflit de code. Aucun autre PR/SQL/registre source/S1 touché.
- **SÉMANTIQUE COMBINÉE À TESTER** : `MANUAL_API_DISCOVERY` toujours BLOCKED_ADAPTER avant archivage ; zéro endpoint interdit avec audit FAILED ; zéro ligne en mode ingest n'est pas un succès ; index HTML avec CSV enfant valide peut réussir ; échec d'un téléchargement enfant refuse le succès de cet endpoint mais conserve les compteurs artifacts/rows/links réellement observés. Mode `discover` peut produire zéro ligne avec des liens et aucun enfant échoué, sans devenir une preuve de publication financière.
- **STATUT TERMINAL** : préserver l'issue réelle des endpoints dans PostgreSQL (`SUCCESS`, `PARTIAL`, `FAILED`) avant d'émettre l'exception du mode strict vers l'appelant ; l'exception ne doit jamais déclencher une deuxième écriture terminale. L'appel strict reste refusé si des endpoints sont en échec ; aucun faux succès de backfill. Cette décision de convergence remplace la chronologie d'écriture stricte de PR #26 mais maintient la preuve d'échec pour l'appelant et le status audit réel.
- **TESTS COMBINÉS** : garder les tests PR #26 et #36, ajouter deux tests des compteurs de collectes avec failedChildren ainsi que le cas discover ; CI et PostgreSQL du HEAD merge encore à exécuter. Aucun adaptateur officiel CBE/GOSDMX ni source/licence n'est certifié.
- **AUTORITÉ DOCUMENTAIRE** : conserver les documents main actuels et y insérer ce checkpoint ; les anciennes versions intégrales de docs/06 et docs/09 de PR #36 demeurent accessibles par le premier parent Git, sans écraser les entrées courantes.
- **BLOCK_REASON** : nouvelle combinaison non certifiée avant CI/Docker, éventuels commentaires GitHub à examiner et corriger ; lot 4 et chantiers #5/#13–#17 restent PARTIAL, lot 13 S1 non autorisé.
- **NEXT_ACTION** : vérifier la liste exacte des fichiers et les checks `validate` / Docker PostgreSQL sur HEAD fusionné, résoudre chaque régression/test et fil de revue avant READY/label et fusion native. Réévaluer ensuite les PR #22/#25/#27–#34 dans l'ordre des dépendances, avec 14 lots/6 chantiers et recettes financières comme autorité, sans recréer l'existant.


## 2026-11-24 — Convergence PR #26 : contrôles d'ingestion et écritures terminales préservés
- **CONTINUITY_ID** : SADIAAF-CONTINUITY-20261124-01 ; ancienne PR #26 HEAD `bc632405eb8964250c4d88fb56adff846d652a9d`, branche `fix/manual-api-discovery-fail-closed-20261109`, rapprochée du `main=bf42e246a083221d0bd64a5b28f349847215016f` après intégration CSV de PR #35.
- **TRAVAIL PRÉSERVÉ** : 7 blobs CODE/TEST EXACTS de PR #26 (src/jobs/ingest.ts, ingestionOutcome.ts, runStore.ts, terminalWrite.ts, tests unitaires et intégration PostgreSQL) repris sans réécriture ; classement BLOCKED_ADAPTER pour MANUAL_API_DISCOVERY, NO_STRUCTURED_ROWS en mode ingest, compteurs et statuts terminales, fencing et writeTerminalOnce.
- **HISTORIQUE** : merge Git non destructif à deux parents (premier PR #26, second main) ; état des docs/06 et docs/09 du main courant maintenu avec checkpoint. Le contenu ancien des docs modifiés par PR #26 reste récupérable par son parent Git original ; aucun force push/suppression, aucune réinitialisation des branches d'autres PR.
- **DEPENDANCE SUIVANTE** : PR #36 a des modifications concurrentes à src/jobs/ingest.ts : ne pas la merger par écrasement du fichier. Fusionner les contrôles NO_STRUCTURED_ROWS, BLOCKED_ADAPTER, runStore/terminalWrite de #26 et les gardes failedChildren/rows/endpoint de #36 avec tests de comportement discover vs ingest. La PR #36 doit être réconciliée seulement après réussite/intégration de #26.
- **BLOCK_REASON** : CI/Docker sur HEAD du présent merge non encore certifiées ; aucune qualification des six adaptateurs officiels, aucune conformité des sources/licences/recette S1 attestée.
- **NEXT_ACTION** : contrôler les checks validate et Docker/PostgreSQL du nouveau HEAD, fichiers diff et reviews, passer PR #26 READY et mettre label automerge-eligible si admissible, déclencher native auto-merge SHA-bound, puis traiter la PR #36 sans collision. Poursuivre les 14 lots et six chantiers selon tests financiers/sources réelles.


## 2026-11-24 — Lot 4 / PR #35 : réconciliation du parseur CSV existant sans réécriture
- **CONTINUITY_ID** : SADIAAF-CONTINUITY-20261124-01. Reprise non destructive de la PR #35 depuis ancien SHA `dadf871051f2b478eb875125d4dd55b46e2d25ca` vers `main=eb74c0a1d42d8dafa4fa67bbf8aa185b571763fa`.
- **SOURCE EXACTE** : le blob `src/parsers/csv.ts` (`79f02ea9b636327f7d188a2b93fb71770af7efc3`) et les tests `test/csv-document-parser-regression.test.ts` (`6a66d0a590b4582e96c73252f333d42aeb7587f2`) proviennent IDENTIQUES de la PR #35 ; aucun parseur ni test existant n'est reconstruit, la base de code `main` reste inchangée hors ces deux fichiers.
- **RÉSOLUTION DES DOCUMENTS** : conserver la version récente complète des journaux de `main`, y ajouter ce checkpoint ; les versions historiques complètes de docs/06 et docs/09 de la branche d'origine sont conservées par son premier parent Git (`dadf871051f2b478eb875125d4dd55b46e2d25ca`), sans substitution à l'autorité documentaire actuelle. Aucun historique n'est supprimé ni force-push.
- **MÉCANISME** : merge commit à deux parents (PR #35 puis `main`) sur l'arbre de `main`, avec les deux blobs source/test d'origine. Mise à jour du ref uniquement si HEAD d'origine conservé (compare-and-swap / non-force).
- **GARDE-FOUS** : PR ordinaire, fichiers `src/parsers/csv.ts`, nouveau test, docs/06/09 uniquement, sans modifications d'ingestion #26/#36, ni base de données, secret, dépendance, workflow ou S1. Aucun adaptateur officiel qualifié par cette modification.
- **BLOCK_REASON** : à cette écriture, nouveau SHA du merge non encore créé/testé. CI `validate` et Docker/PostgreSQL exact SHA, discussions et règles GitHub à vérifier avant label `automerge-eligible` et sortie Draft.
- **NEXT_ACTION** : valider les deux checks sur le nouveau HEAD, qualifier la PR #35 et laisser GitHub fusionner en natif sous ruleset #27937019 ; ensuite recharger `main` et réconcilier la PR #36 (et la PR #26 recouvrant `src/jobs/ingest.ts`) par ordre de dépendances, conserver les six chantiers de données/14 lots, puis staging/production uniquement après gates.


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
