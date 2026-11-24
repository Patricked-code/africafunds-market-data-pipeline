# 06 — État réel et écarts

## 2026-11-24 — MISSION 13 / LOT A — A02/A03/A04/A05 réconciliation après B05
- CONTINUITY_ID SADIAAF-CONTINUITY-20261124-01 ; admissions 7124945475/7125022469 ; parent B 227965e9ab6ab0751f54fb0862575ba760df5fc9. Réconciliation des candidats b60e3b9e88c782cd28ebb14c5b32128a0093461d et 1450b5d4648a74783ed63aa111858939df215aab, sept fichiers A contrôlés par diff sans conflit. Bootstrap existant --apply exige audit des protections effectives préinstallées, jeton App dédié, admin GET seulement, contrôle main avant/après, clé privée hors checkout ; --check conservé. A02 broker read inclut Actions:read, modes write inchangés et refus Actions:write ; readiness actionsToken distinct de prToken, preuve runs/jobs lue avec read. Tests historiques adaptés et deux tests négatifs supplémentaires. Aucun fichier B modifié, aucun droit, règle, secret ou ref LIVE créé.
- CI796/Docker659 SUCCESS sur ba0c6e18 ; B 227965e9 publié, pilote31 terminal sans GREEN réel. A02/A03/A04 BLOCKED activation : identité App indépendante et action administrative légitime indisponibles ; ne pas créer ref partiellement protégée. B doit brancher actionsToken séparé et expiration contrôlée. NEXT_ACTION : CI797/Docker660 terminal, publication non-force sur HEAD exact, qualification réelle de l'identité/protections/registre, puis A07–A10. Aucun S1/coût/secret/bypass/A-READY.


## 2026-11-24 — LOT B B05/B07 : réconciliation de la preuve de promotion
- CONTINUITY_ID SADIAAF-CONTINUITY-20261124-01 ; admission 7124973032 ; parent ba0c6e1850b026f88234f39d333fc60b311fbcf9. Réconciliation additive du candidat b9e64f9d3513ba52cf61a173cc83a4b643221fab : promotionEvidence.ts et quatre tests, reconstruction indépendante des contenus et preuves RED/GREEN, contrôle admission renouvelée et relecture finale. Contrat WorkReceipt/asPromotionReceipt A publié sur parent, raccordement directeur restant à réaliser. Pilote30 FAILURE (syntaxe/périmètre du prédicat), aucun GREEN réel. Aucun changement des fichiers techniques A, aucun S1, coût, secret, bypass, fusion ou B-READY.
- NEXT_ACTION : vérifier CI/Docker exacts, raccorder production du reçu et phase promotion avec génération explicite, corriger pilote, recette croisée.


## 2026-11-24 — MISSION 13 / LOT A — complément contrat publication B05/B07
- CONTINUITY_ID SADIAAF-CONTINUITY-20261124-01 ; demande B 7124895087, admission A 7124887112 ; parent préparé 118533c8e1c95993e09a407e1a96451927885195. WorkPassResult.publication?:WorkPublicationProof (issue,mainSha,acceptance,paths,red,green) stocké atomiquement dans WorkReceipt et lié aux preuves originales, SHA/PR/scope et suite ; asPromotionReceipt(receipt) fournit exactement la structure B promotionReceiptSchema. Refus preuve discordante avant release, ancien résultat sans preuve conservé mais non admissible à promotion. Deux tests nouveaux. A06 absence de promotion observe base main actuelle protégée (re-claim base=head). Aucun fichier B, aucune nouvelle autorité.
- PARTIAL : B doit renseigner publication seulement après publication prouvée ; reconstruction indépendante et admission renouvelée obligatoires. Aucun statut DONE, aucune activation distante. NEXT_ACTION : publication groupée après gates parent, B raccordement, A02–A04 et A07–A10. Aucun S1/coût/secret/bypass/A-READY.


## 2026-11-24 — MISSION 13 / LOT A — A04/A06 reçu durable et récupération promotion
- CONTINUITY_ID SADIAAF-CONTINUITY-20261124-01 ; admission 7124887112, demande B 7124866758/7124880115 ; parent 4521101cdcd21db069b4b9fb1c7a839f3b105dae. Réconciliation A06 07fa99d6a5bdec5772313084de2b97932593b692 (githubPrReadiness.ts/test sans modification concurrente) : recoverAbsent/recoverMerged, trois tests. Ajout workReceipts dans ClaimStore existant, release atomique avec résultat de passe, génération, révision, branche/base/head/lot/scopes, PR unique dérivée des preuves, preuves originales et nextAction ; listWorkReceipts/readWorkReceipt, protection de préfixe au CAS, quatre tests. Reçu completed = passe terminée, jamais DONE métier. Pas de nouvelle file, pas d'autorisation implicite, aucun fichier B.
- PARTIAL : capacité bornée 4096, stratégie archivage à qualifier avant permanence ; preuve RED/GREEN et admission renouvelée par B indépendamment, registre distant non activé. CI794/Docker657 SUCCESS parent historique ; CI795/Docker658/pilote30 sur parent B à vérifier. NEXT_ACTION : publier après gates et transmettre B, A02/A03/A04 activation légitime, A07–A10 recettes. Aucun S1/coût/secret/bypass/A-READY.


## 2026-11-24 — LOT B B01/B02 : deuxième contrat et non-régression temporelle
- CONTINUITY_ID SADIAAF-CONTINUITY-20261124-01 ; mandat 7124316324 ; admissions 7124741469/7124828726 ; parent 4790bbafd970c3cf3476db89531b196e395297f0. Pilote28 : modèle/moteur SHA256 vérifiés, trois propositions réelles, 17/18 (tentatives 1/3) et 12/18 (2), régression timezone ; aucun GREEN. Nouvelle enveloppe date-only : le modèle produit exclusivement un prédicat booléen JSON, aucun prédicat prédéfini, périmètre type/format fixé par harness, 2 tests protocole. 18 cas historiques intacts ; aucune correction métier publiée. Recette bornée, pas de preuve d'autonomie générale.
- B02 : réconciliation exacte des cinq fichiers de 4a8232f4 sur parent A, second contrat SADIAAF-INDICES-DAYCOUNT-V1, 14 cas, scope indices.ts, même runner isolé, preuves suite/cas séparées, empreinte dates préservée, 2 tests raccordement. Aucun code A ni métier modifié. A05/A06 interfaces reconnues #7124803846/#7124835964 ; raccordement durable post-publication requis. B02 reste à qualifier réellement.
- NEXT_ACTION : vérifier CI794/Docker657 parent, publication non-force si stable, vraie recette modèle et second contrat, renouvellement B05, raccordement promotion et preuve durable, A-READY/B-READY puis recette croisée. Aucun S1, coût nouveau, secret, bypass ou faux DONE.


## 2026-11-24 — MISSION 13 / LOT A — A05 promotion transactionnelle
- CONTINUITY_ID SADIAAF-CONTINUITY-20261124-01 ; admission 7124763674 ; parent b3e97668fc93cddd83b2ec89577f854a605cc75d. githubPrReadiness.ts : label puis ready via intentions lifecycle distinctes dans ClaimStore existant, exact PR/head/admission/scope, CI/Docker réels par ID/attempt/job, contrôle de politique indépendante obligatoire, relecture, récupération d'effet confirmé sans retry ; aucune fusion directe. githubNewWork maintient interfaces historiques, refuse de récupérer les intents label/ready. Gate historique étendu aux changements src/coordination (sensibles), sans nouvelle autorité de fusion. Quatre tests du port et un test du gate.
- PARTIAL : verifyEligibility doit consommer politique historique de main et preuves indépendantes réelles ; les mutations App et événement ready ne sont pas encore qualifiés. Réconciliation terminale PR/effets absents et intégration au worker nécessitent coordination B ; aucun label/ready réel effectué, aucun secret/protection/S1/coût/bypass/A-READY. NEXT_ACTION : CI exacte, transmettre port à B, activation autorisée A02–A04 et recettes A07–A10.


## 2026-11-24 — LOT B B01/B05 : protocole modèle et raccordement historique A/B
- CONTINUITY_ID SADIAAF-CONTINUITY-20261124-01 ; mandat 7124316324 ; admission 7124713251 ; parent de56bb9d19b7f8d1f99d63f4b2f02e771a703189. ACK A 7124665068. Pilote26 : RED exact quatre défauts, téléchargement et SHA256 moteur/modèle réussis, trois rejets de format, aucune correction testée. Protocole JSON guard strict, réponse json_object, diagnostic borné base64 du texte public, finish_reason stop obligatoire, test offline supplémentaire ; aucun changement du code métier ni des 18 tests.
- B05 : reprise du candidat 5692634, quatre tests chargeur/historique, raccordement direct createAdmissionHistoryPort fourni A au même ClaimStore ; preuve indépendante du préfixe et nouvelle double lecture GitHub, refus suppression/réécriture/CAS, bootstrap explicite seulement superviseur (jamais depuis wake). Aucune modification technique A. Aucun registre supplémentaire, aucun callback de preuve toujours true. Identité/protection/bootstrap réels non attestés ; renouvellement autorisé après fusion et B02 restent à compléter. CI et inférence nouvelle à vérifier, pas de PASS anticipé.
- NEXT_ACTION : publier après gates parent exactes, confirmer vraie recette et rapprochement A05/A06, généraliser contrats et codeur, renouvellement et runtime réel. Aucun S1, coût, secret, bypass ou faux DONE ; recette croisée obligatoire.


## 2026-11-24 — MISSION 13 / LOT A — A04/A06 empreinte des autorisations B05
- CONTINUITY_ID SADIAAF-CONTINUITY-20261124-01 ; admission 7124641417, demande B 7124619969 ; parent préparé 9decb3b12dd47d1209cd2db45c0a329768cc60dc. createAdmissionHistoryPort dans agentClaims.ts : checkpoint count/digest dans état transactionnel existant, initialisation explicite registre neuf + preuve indépendante de l'historique vide, empreinte conforme B, CAS monotone, relecture, rejet absence/régression, contrôle supplémentaire GitHubClaimStore. Interface structurelle readCheckpoint/advanceCheckpoint et initializeEmpty pour bootstrap. Quatre tests de contrat ; aucun fichier B modifié, pas de nouveau registre.
- PARTIAL : autorité authentifiée et preuves de préfixe indépendantes obligatoires, à raccorder avec B ; ref distante non activée, aucun checkpoint LIVE. Aucun PASS de runtime. NEXT_ACTION : publication groupée A après recette parent, B05 raccordement, A05 promotion sous intent et qualification identité/protection/infra. Aucun S1/coût/secret/bypass/A-READY.


## 2026-11-24 — MISSION 13 / LOT A — réconciliation A05/A06 après B04
- CONTINUITY_ID SADIAAF-CONTINUITY-20261124-01 ; admissions 7124531507/7124562646 ; transmission B 7124589000 ; parent vivant 63e305a361c18b755ee2a856ef8215c48aa73628. Réconciliation des candidats d94a49b2a0379b2af3fa9cb6e15f36b4832adf81 et 93d4e82900b658fd5363ac2d325cf1d003ba9762 : diff parent vérifié sans modification concurrente des six fichiers A. A06 lifecycle-absent/reconcileAbsent : authentification, preuve indépendante, quiescence, double observation et CAS, trois tests. A05 ready_for_review dans CI et Docker, conservation des déclencheurs historiques, un test ; aucune modification droits/gates/auto-merge/pilote. Aucun fichier B modifié. CI790/Docker653 SUCCESS sur cec3cf28 ; nouveau SHA à valider.
- PARTIAL : label/ready sous intentions durables à compléter ; capacité registre et preuves réelles ; A02–A04 bloqués identité/admin/protection. NEXT_ACTION : après recette parent, publication non-force, vérifier CI exacte, répondre à B05 (AdmissionHistoryPort dans registre existant), continuer A05/A06 puis infrastructure autorisée et recettes A08–A10. Aucun S1/coût/secret/bypass/A-READY. Recette commune obligatoire.


## 2026-11-24 — LOT B B01/B03/B04 : reprise modèle et raccordement lifecycle
- CONTINUITY_ID SADIAAF-CONTINUITY-20261124-01 ; mandat 7124316324, ACK A 7124426410, admissions B 7124445666/7124508437 ; parent cec3cf28ae891ba86454605270e9b83c7ca7e8f0. Réconciliation des trois fichiers pilote du commit préparé c64ad36 sur HEAD partenaire : pilote22 timeout GGUF 2464014695/3993201376, RED 4 cas et 9 offline PASS, aucune inférence. Reprise partielle curl bornée, 6 tentatives, délai commun 1200s, SHA256 obligatoire, 2 tests offline, plafond job 40 min, 18 tests/code métier inchangés.
- B04 : directorRuntime réutilise createGitHubNewWork du LOT A, admission pr:null et claim, candidat validé AVANT branche, jeton pull-request distinct, branche puis build/mutation puis vérification preuve et création draft avec PR exacte ; 4 tests de contrat, maintien ancien executor et restrictions contrat dates. Aucun ready/merge, aucun changement fichiers A. Préparer seulement avant gates parent, aucune activation réelle ni preuve de succès avant CI/recette. B02/B05 et politiques réelles restent à finaliser. Aucun S1, coût nouveau, secret, bypass ou faux DONE.
- NEXT_ACTION : vérifier CI/Docker parent et publier non-force si stable, vraie recette pilote, B02 généralisation et B05 renouvellement ; coordonner A05 lifecycle ready/merge, A02–A04 protections/identité et A06 récupération. Rapprochement final obligatoire.


## 2026-11-24 — MISSION 13 / LOT A — A01 correction de compilation
- CONTINUITY_ID SADIAAF-CONTINUITY-20261124-01 ; diagnostic LOT B 7124461646, admission 7124472378 ; parent 6013248042bf5149f1166d466ad2eca66683e3a6. CI788/Docker651 FAILURE sur TS2352 du fixture main dans test/github-writer-audit.test.ts. Paramètres de règle typés unknown (données externes), conversion abusive supprimée ; aucune assertion supprimée ni protection affaiblie. Revalidation exacte CI/Docker nécessaire. A06 commit 6013248042bf5149f1166d466ad2eca66683e3a6 publié, tests à confirmer. LOT B intact, c64ad36 préparé à réconcilier sur HEAD vivant. NEXT_ACTION : contrôler nouvelle recette puis poursuivre A05/A06, A02–A04 activation toujours bloquée. Aucun A-READY anticipé.


## 2026-11-24 — MISSION 13 / LOT A — A06 réconciliation terminale des réveils
- CONTINUITY_ID SADIAAF-CONTINUITY-20261124-01 ; admission 7124456464 ; parent d8f61c4c299d7b51fcdf0c7cfb5579d1386ae9f6. agentClaims.ts ajoute reconcileDirectorWake : clôture durable d'un accepted devenu stale ou pending interrompu, après authentification, preuve indépendante, absence de claims de l'ancien dispatch et quiescence attestée pour pending. Même registre et CAS, conserve signal, propriétaire, intention et clé de déduplication ; résultat reconciled, jamais de rejeu ni effacement. Trois tests de contrat : stale, crash/incertitude, compétition CAS. Interface additive pour LOT B ; aucun fichier B modifié.
- PARTIAL : ports de preuve/quiescence doivent être raccordés à l'environnement réel (aucun callback simulé en production). Capacité 4096 et archivage durable, réconciliation absence d'effet lifecycle, récupération réelle encore à traiter. NEXT_ACTION : vérifier CI exacte, fournir interface à B, poursuivre A05/A06, activation A02–A04 et recette A07–A10. Aucun S1/coût/secret/bypass/DONE.


## 2026-11-24 — MISSION 13 / LOT A — A01 audit des protections, A02–A04 préflight
- CONTINUITY_ID SADIAAF-CONTINUITY-20261124-01 ; mandat canonique 7124316324, ACK 7124426410, admission A01 7124436121. Parent adf65b23d8ca0f53270867b5a30c19543ac35467. Réconciliation de l'audit historique 48934501f399fbf050be7a1e36ca796baede85ab (non publié, parent divergent) : githubWriterAudit.ts, tests et scripts/ci/audit-director-writers.mjs. Conservation des contributions du LOT B ; contrôle supplémentaire des checks stricts CI/Docker sur main, cinq tests de contrat. Outil GET uniquement, pas d'attestation d'isolation avant recette réelle.
- LIVE préflight : main ef861ea26b26b82ec7cac987d9404a3707b2439f protected=true, ruleset 27937019 actif exact main, bypass_actors=[], suppression et non-fast-forward interdits, PR obligatoire, checks validate et Build, boot, migrate and verify persistent PostgreSQL stricts. Seul ruleset visible. Ref coordination 404 ; endpoint règles effectives rejeté par connecteur. Installations accessibles 118445804/145098929 ne prouvent ni App SadiaAF dédiée ni possession de sa clé. A01 PARTIAL (audit code + observation réelle, exécution admin complète non attestée), A02/A03/A04 BLOCKED pour activation : identité dédiée, autorité admin légitime et protections spécifiques absentes/non vérifiées. Ne pas créer ref non protégée. CI787/Docker650 SUCCESS sur adf65b23 ; pilote22 FAILURE, B01 réservé au partenaire.
- NEXT_ACTION : vérifier nouvelle CI/Docker ; poursuivre A05/A06 et préparation qualification A07–A10. Lot A seul, aucun fichier B modifié, aucune mutation admin, main, S1, coût supplémentaire, secret ou contournement. A-READY uniquement sur preuves, rendez-vous M13-FINAL-CROSS-CERTIFICATION avec B-READY.


## 2026-11-24 — MISSION 13 / collaboration : raccordement du worker différé
- **CONTINUITY_ID** SADIAAF-CONTINUITY-20261124-01 ; admission 7124224262 ; parent préparé e5b27bcb084ba84449257d08c0359867e70ba0bc. Extension de directorRuntime existant, mêmes ports de preuve/identité/validation, nouveau point runAcceptedExistingPrDirector lit le premier receipt accepted du registre existant, reconstruit uniquement événement CI/merge GitHub canonique, revalide LIVE et appelle runDeferredDirectorWake (CAS existant avant exécution). Aucun événement arbitraire, nouvelle queue ou scheduler. Deux tests de contrat, aucun fichier partenaire modifié. Receipts stale/unsupported échouent fermés ; réconciliation durable et politique de reprise restent nécessaires, pas de preuve de service permanent. Pas de S1, coût, secret ou bypass.
- **NEXT_ACTION** : publier d'abord e5 après CI786/Docker649, puis intégrer cette extension sur HEAD vivant après coordination avec audit partenaire 48934501. Vérifier exact CI et recette modèle non-skipped ; raccorder cycle nouvelle PR, identité/protection réelles et service autorisé ; deux tâches successives et crash/concurrence ; audit croisé final. Aucun DONE anticipé.


## 2026-11-24 — MISSION 13 / collaboration : raccordement effectif du port preuves
- **CONTINUITY_ID** SADIAAF-CONTINUITY-20261124-01 ; admission 7124160510 ; parent a726b89505b321fd5e1f59ffeb8d325707a0e1f1. Raccordement direct du directorRuntime au port githubValidationEvidence avec credential evidence distinct (mode ajouté par partenaire), contrôle identité et 3 jetons distincts, expiration, suite dérivée du même contrat de validation ; suppression des callbacks persistEvidence/verifyEvidence injectés par config publique du runtime. Un test supplémentaire de refus jetons partagés. Politique sémantique et isolation restent ports de confiance à attester. Workflow pilote : groupe de concurrence par PR et SHA pour éviter que commits documentaires remplacent la recette réellement modifiée en attente. Aucun changement du modèle ni des 18 cas. Ne pas compter skip comme GREEN. Aucun fichier identité/claims/nouvelle PR du partenaire touché.
- **LIMITES** : identité App/bot réelle, preuve durable en conditions réelles, politique indépendante et activation protégée restent à qualifier. Pas de déclaration de réussite avant CI et vraie inférence. Pas de S1, coût, secret, bypass.
- **NEXT_ACTION** : relecture HEAD/CI, vraie recette modèle, worker des receipts acceptés, création branche/PR et protection réelle, deux tâches successives + interruption/concurrence et rapprochement final croisé. Priorité usine complète.


## 2026-11-24 — MISSION 13 / P0 : cycle branche et PR nouvelle
- CONTINUITY_ID SADIAAF-CONTINUITY-20261124-01 ; admission 7124146410 ; parent 4863230bc50ed4814e929c5edd7be73bc7ef0fc3. githubNewWork.ts prépare création de branche exact main et PR draft après candidat publié, contrôle admission/claim/isolation et preuve, intention lifecycle CAS dans ClaimStore existant, relecture ref/PR, rejet ambiguïté et reprise seulement avec preuve de quiescence. githubIdentity ajoute token pull-request séparé (contents:read, issues:read, pull_requests:write). Cinq tests ajoutés. Aucun merge, main, ref supprimé ni permission réelle modifiée.
- PARTIAL : composition au directeur (nouvelle admission pr:null), politique réelle, passage draft→ready/auto-merge existant, effets absents après crash à réconcilier explicitement, aucun service permanent ni credential installé. Aucun S1/coût/secret/bypass ou DONE. NEXT_ACTION : CI/Docker exact SHA, raccordement partenaire, modèle réel, activation gouvernée, deux cycles et recette finale croisée.


## 2026-11-24 — MISSION 13 / P0 : réception HTTP et admission durable différée
- CONTINUITY_ID SADIAAF-CONTINUITY-20261124-01 ; admissions 7124078475 et 7124088222. Le récepteur HTTP borné githubWebhookHttp.ts authentifie le corps brut et réconcilie l'événement GitHub avant CAS dans le registre wakeReceipts existant. Pas de longue inférence dans la réponse HTTP, pas de 2xx avant admission durable ; aucun deuxième registre. agentClaims.ts ajoute état accepted et transition CAS accepted → pending → résultat, sans modifier le parcours synchrone historique. Crash/ambiguïté pending impose réconciliation, pas de redispatch automatique. Huit tests contrat, concurrence, reprise et HTTP.
- PARTIAL : aucun listener ou worker permanent installé ; la boucle réelle doit consommer les receipts accepted, revalider LIVE et utiliser runDeferredDirectorWake avec les ports du directeur existant. Limite de délai GitHub et protection/identité/persistance à attester réellement, aucun secret/S1/coût/bypass ou DONE. NEXT_ACTION : regrouper le commit webhook/identité et ce raccordement sur HEAD stable, CI/Docker, qualifier inférence réelle et activation contrôlée, deux cycles et recette croisée.


## 2026-11-24 — MISSION 13 / P0 : rapprochement webhook et identité de preuve
- CONTINUITY_ID SADIAAF-CONTINUITY-20261124-01 ; admission [7124053256](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/9#issuecomment-7124053256), parent 5f8db73bf53e8b805f00ead1bb1de8de6b6c6328. Reprise du commit préparé 1e390062687d3cbfca84131865087d82aec67e9b : githubWebhook.ts et cinq tests, authentification HMAC sur octets bruts, liaison événement/installation/dépôt, réveil canonique existant ; aucun serveur ou secret activé.
- Réponse à demande partenaire 7124025652 : githubIdentity mode evidence séparé, contents:read et issues:write ; publish reste contents:write issues:read. Rejet explicite des droits combinés, deux tests supplémentaires, aucune permission GitHub réellement modifiée. Le broker et sa clé restent hors codeur et consommateurs, isolation réelle et App dédiée à attester. Préservation du port githubValidationEvidence et de tous travaux partenaire.
- PARTIAL : endpoint/activation, composition preuve au runtime, politique indépendante, protection et identité réelles, deux cycles et crash/concurrence à certifier. Aucun S1/coût/secret/bypass/nouvelle usine. NEXT_ACTION : CI/Docker exact SHA, vraie inférence, raccordement et recette finale croisée obligatoire.


## 2026-11-24 — MISSION 13 / collaboration : preuves de validation durables
- **CONTINUITY_ID** SADIAAF-CONTINUITY-20261124-01 ; M13-EVIDENCE-20261124-01, admission 7124021165 ; parent 259ce541f5374535c43889a291136f7e38391148. CI783/Docker646 SUCCESS sur 259ce541 ; partenaire événementiel préparé puis invité à publier. Nouveau githubValidationEvidence.ts et 4 tests : port issue9 exclusivement, preuve RED/GREEN structurée, 18 cas et SHA256, enveloppe encodée, auteur App/bot exact, relecture commentaire immuable et vérification indépendante sujet/suite/head, refus altération et nouvelle tentative aveugle après POST incertain. Convention issue:<id> = commentaire issue9 pour ce port. Aucun registre nouveau, aucune écriture d'une vraie preuve ni activation. Fichiers partenaire préservés.
- **LIMITES** : broker actuel issues:read ; credential distinct issues:write et contents:read sans permission de publication requis, demande partenaire #7124025652. App, suite attendue et isolation à attester ; aucune preuve sémantique par simple empreinte, aucun secret transmis. Fixtures ne valent pas preuve runtime. CI exacte à vérifier. Pas de S1, coût, bypass, faux DONE.
- **NEXT_ACTION** : raccordement du port au directeur avec identité dédiée, politique indépendante et historique durable ; validation réelle du codeur, activation protégée, deux tâches successives et crash/concurrence ; rapprochement final croisé.


## 2026-11-24 — MISSION 13 / P0 : composition du directeur sur PR existante
- CONTINUITY_ID SADIAAF-CONTINUITY-20261124-01 ; admission [7123931782](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/9#issuecomment-7123931782), parent f19cf24ae1e601353644995f51b1b5f794108061. directorRuntime.ts compose les modules réels existants : identité App, lecture et transport séparés, ClaimStore protégé, historique admissions, sélecteur, source immuable, modèle loopback, validateur Docker, builder et publication sous gateway, wake GitHub. Première recette limitée à PR ouverte déjà autorisée et contrat dates ; vérification de l'admission et HEAD PR avant publication, aucun secret au modèle, pas de second orchestrateur. Quatre tests de contrat.
- PARTIAL : preuves d'activation externes encore nécessaires (identité/coffre, isolation réelle, historique durable, persistance/politique indépendante, événement authentifié). Pas de création branche/PR ni recovery implicite, pas de déploiement ou attestation 24/7. Aucun S1, coût, secret, bypass, nouveau registre ou DONE.
- NEXT_ACTION : compléter ports de confiance et généralisation, réconciliation de la CI exacte et recette modèle réelle, intégration/activation contrôlée et rapprochement croisé sur SHA stabilisé, deux cycles et contention/crash.


## 2026-11-24 — MISSION 13 / P0 : préparation de commit immuable
- CONTINUITY_ID SADIAAF-CONTINUITY-20261124-01 ; admission [7123908538](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/9#issuecomment-7123908538), parent e8c635f86400fba17053f5af02d5960b91e05f8c. Nouveau githubCommitBuilder.ts : relit admission/claim, vérifie RED/GREEN liés au sujet et même suite, preuve indépendante, empreinte source originale, crée blob/tree/commit non référencés via API Git canonique, vérifie SHA blob, parent/arbre et contenu candidat, impose contrôle final exhaustif. Aucune modification de ref/PR/main ; la publication reste sous la passerelle existante. Quatre tests de protocole.
- PARTIAL : ports preuve et politique réels, création de branche/PR, identité et protection distantes, composition runtime et qualification E2E nécessaires. Aucun secret ni coût/S1/bypass, pas de deuxième registre. Recette commune croisée obligatoire.
- NEXT_ACTION : raccordement avec validation/persistance de l'autre intervenant, contrôler CI/Docker et inférence réelle sur SHA stabilisé, intégrer exécuteur/événements et deux cycles réels, reprise et concurrence.


## 2026-11-24 — MISSION 13 / collaboration : port de validation isolée
- **CONTINUITY_ID** SADIAAF-CONTINUITY-20261124-01 ; session M13-VALIDATOR-20261124-01 ; admission 7123882723 ; parent 7c2c30f01a5543e7586fb34b0cb0f9057225a509. Nouveau isolatedValidation.ts : port validate du codeur, premier contrat exact SADIAAF-DATES-CALENDAR-V1 reprenant les 18 cas historiques. Docker local sans réseau, image ID immuable déjà disponible, non-root, montage minimal lecture seule, ressources bornées, retrait contrôlé ; comparaison des sorties par contrôleur hors conteneur, suite/sujet SHA256, preuves persistées avant retour, aucune déclaration PASS du modèle. Quatre tests de contrat. Aucun fichier de l'autre agent, modèle ou pilote modifié.
- **LIMITES** : Docker réel indisponible dans cette session, fixtures seulement dans les tests ajoutés ; aucune preuve RED/GREEN nouvelle. Persistance GitHub réelle, image revue, isolation du runner et garde contre comportement adversarial doivent être attestées ; le candidat peut toujours tenter de fabriquer des réponses, une revue sémantique indépendante et CI complète restent obligatoires. Contrat initial mono-module, pas agent général. Aucun secret, coût, S1, bypass, faux DONE.
- **NEXT_ACTION** : CI exacte, raccordement source/validator/persistance au directeur, vraie recette modèle sur HEAD stabilisé, identité et ref protégées, publication/PR et deux cycles avec interruption/concurrence ; rapprochement final croisé des deux agents avant DONE.


## 2026-11-24 — MISSION 13 / collaboration : source immuable du codeur
- **CONTINUITY_ID** SADIAAF-CONTINUITY-20261124-01 ; session M13-SOURCE-20261124-01 admission 7123832625 ; parent 3ed229e6885849a05e5fb41745dc47f54feef247. En complément de l'identité GitHub App admission 7123821790 : nouveau githubSource.ts, 5 tests. Lecture REST bornée du dépôt ID canonique, commit exact, arbres non tronqués, mode répertoire/regular file strict, blob base64 et empreinte Git SHA1 vérifiés, UTF8 strict ; aucun accès aux symlinks, submodules, chemins sensibles, branches mutables. Port readSource du codeur, aucun code exécuté ou publication. Token reste dans runtime fiable, pas transmis au modèle. Aucun fichier identité/gateway/publication modifié.
- **PREUVES / LIMITES** : code/test publiés, CI à vérifier. Pilote6 45338286176 CANCELLED sans job, pilote5 FAILURE ; workflows skip ne valent pas GREEN. Nouvelle recette réelle sur HEAD stabilisé nécessaire. Validation sandbox et builder, source autorisée, identité/ref/écrivains et raccordement runtime complet restent indispensables. Le filtre de chemin ne suffit pas à détecter tous les secrets : inspection indépendante avant livraison au modèle. Pas de S1, coût, secret, bypass ou faux DONE.
- **NEXT_ACTION** : rapprocher les deux contributions, CI exact SHA, qualifier source/validation et runtime, vraie recette modèle, activation protégée et 2 cycles réels + crash/concurrence ; recette finale croisée avant DONE.


## 2026-11-24 — MISSION 13 / P0 : identité GitHub App indépendante
- CONTINUITY_ID SADIAAF-CONTINUITY-20261124-01 ; admission [7123821790](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/9#issuecomment-7123821790), parent cb1ef2d920523562cafb6cbe229989c93730d74f. Complément identité du directeur existant : githubIdentity.ts signe JWT App court avec clé RSA fournie hors Git, vérifie App/installation/compte/dépôt, émet token temporaire restreint à ce dépôt, permissions distinctes lecture/publication, vérifie réponse et liste effective des repos, refus sur droits excessifs et réponse incertaine. Cinq tests de protocole (clé et token fictifs uniquement).
- PARTIAL : aucune App ni installation réelle choisie/activée, aucun secret créé ou lu ; aucune attestation de writer isolation, protection ref, coffre, révocation ou runtime indépendant. Ne jamais donner ces credentials au modèle ; ports fiables seuls. Raccordement à la passerelle et recette réelle restent obligatoires. Aucun coût, S1, bypass, second registre ou DONE.
- NEXT_ACTION : réconcilier CI/Docker sur HEAD commun stabilisé, raccorder identité autorisée, préparation/sandbox/publication/événements existants, bootstrap protégé et recette croisée des deux agents, deux cycles réels successifs, crash et contention.


## 2026-11-24 — MISSION 13 / collaboration : correction de la recette commune et contrôle final croisé
- **CONTINUITY_ID** SADIAAF-CONTINUITY-20261124-01 ; admission 7123807263 ; parent 16cbb9433612b8d79343d3a466f8d8ca0b357765. CI777 run45339202995 job138258596335 et Docker640 run45339203040 job138258613315 FAILURE : même TS2554 test/model-coder.test.ts L24 (validate attend 3 arguments). Correction limitée au test : transmettre acceptance au port original ; aucun changement des assertions, du codeur ou des fichiers de l'autre agent. Pilote12 run45339203034 SUCCESS avec inférence SKIPPED (MODEL_RECIPE_UNCHANGED), pas de preuve GREEN. Nouveau SHA à vérifier.
- **RECETTE FINALE CROISÉE OBLIGATOIRE** : mandat propriétaire : deux agents complémentaires, rapprochement final de toutes les contributions avant DONE. Sur un HEAD commun stabilisé, chacun examine les travaux de l'autre et publie une preuve distincte ; réconcilier inventaire AGENTS/docs15 §13, mandat neuf sections, code et dépendances. Vérifier CI/Docker exacts, vraie génération RED/GREEN, identité isolée, ref protégée, admissions/révocations durables, mutations/PR/auto-merge, checkpoints, deux tâches successives sans nouveau prompt, crash et concurrence réels, cadence et coûts attestés. Toute lacune = BLOCKED/PARTIAL et NEXT_ACTION, pas de certification par fixtures ni simple fusion. Aucun S1, secret, coût supplémentaire ou bypass.
- **NEXT_ACTION** : vérifier CI/Docker du nouveau SHA, résultat véritable du pilote6, poursuivre raccordement du runtime par périmètres disjoints ; stabiliser HEAD pour recette et rapprochement croisés. L'usine complète est priorité absolue, au service des 14 lots.


## 2026-11-24 — MISSION 13 / collaboration : adaptateur codeur du directeur
- **CONTINUITY_ID** SADIAAF-CONTINUITY-20261124-01 ; session M13-CODER-20261124-01 admission 7123731676 ; parent a11cbda2d942b237e583b29199deeea21b5416e3. Première publication stoppée avant écriture sur changement HEAD concurrent ; reprise sur contributions publication b661de1 et correctif a11cbda. Périmètre distinct : modelCoder.ts et 5 tests, docs06/09/15. Adaptateur HTTP local sans credential, contexte/réponse bornés, admission/claim exacts, sources immuables via port fiable, JSON édition ancre unique/scopes exacts TS ordinaires, pas de tests/sensible modifiés, RED/GREEN même suite et empreinte exacte du sujet, heartbeat/relecture autorisation, tentatives bornées et détection répétitions. Candidat seulement, aucun code exécuté sur host ni publié par le modèle.
- **LIMITES** : ports readAdmission/readSource/validate et commit builder doivent être liés au runtime fiable et sandbox réelle ; aucune fixture ne vaut preuve opérationnelle. Scope v1 corrections de fichiers ordinaires existants, pas encore agent général complet. Identité/ref/activation/reprise et preuve deux cycles restent à réaliser. Tests non attestés avant CI ; aucun S1, secret, coût ou bypass.
- **NEXT_ACTION** : réconcilier CI/Docker et pilotes au SHA exact, relier les ports modèle/validation et gateway au directeur existant, certifier identité/coordination et cycles réels + interruption/concurrence. Pas de nouveau registre ni orchestrateur, pas de faux DONE.


- 2026-11-24 / MISSION 13 : correction préventive du helper de test publication compatible exactOptionalPropertyTypes ; aucun changement runtime. CI exacte à vérifier (parent b661de1aa5ada5c16ab7c2e5994046c83ea29d05).

## 2026-11-24 — MISSION 13 / P0 : transport REST de publication préparée
- CONTINUITY_ID SADIAAF-CONTINUITY-20261124-01 ; admission issue #9 [7123717165](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/9#issuecomment-7123717165), parent 42739cd3eb5e2a1d4b99b5a61ec5482c6c373c4d. Raccordement additif de mutationGateway au transport REST dédié, sans modifier githubTransport/selector/chargeur.
- githubPublication.ts borne les endpoints au dépôt canonique, vérifie ID, parent unique, chemins exhaustifs y compris renames (refus pagination/troncature), preuves indépendantes et isolation écrivains via ports fiables. Publication de commit préparé sur ref de travail existante, non-force, HEAD exact, aucune relance après ambiguïté, aucune mutation main/coordination/administration. Le gateway refuse le dispatch si bail expiré avant envoi. 6 tests ajoutés. Pas de token ni configuration réelle.
- PARTIAL : validation CI exacte, identity/runtime, preuves effectives d'isolation et quiescence, préparation de commits/PR sous passerelle, intégration modèle et événements restent nécessaires ; pas de certification 24/7. Aucun S1, coût, bypass, secret ou registre concurrent.
- NEXT_ACTION : raccorder avec chargeur authentifié, certifier identité et règles, protéger la ref, étendre la passerelle aux autres mutations admissibles, deux développements réels successifs, reprise et concurrence.


## 2026-11-24 — MISSION 13 / collaboration : chargeur des admissions canoniques
- **CONTINUITY_ID** SADIAAF-CONTINUITY-20261124-01 ; session M13-ADMISSIONS-20261124-01 admission 7123699598, complémentaire de M13-GATEWAY-20261124-01 admission 7123680193. Parent 0bed3da0c927a347ec44d3f4b58dda93b1fcce97. Périmètre distinct : aucun changement agentClaims.ts, mutationGateway.ts, tests gateway ou pilote. Chargeur githubAdmissions.ts lit uniquement les commentaires de l'issue9 existante, marqueur SADIAAF_WORK_AUTHORIZATION_V1 suivi d'un JSON strict admit/revoke, identité propriétaire GitHub id270385782 + OWNER, SHA exact, deux lectures paginées bornées, refus des commentaires modifiés, doublons, incohérences et réactivation d'anciennes admissions. Schéma partagé avec sélecteur existant, transport GET borné, 5 tests de protocole dont raccordement au sélecteur. Aucun commentaire d'autorisation active publié ; aucun registre/file nouveau, aucune écriture runtime.
- **LIMITES** : identité GitHub ne prouve pas auteur humain si credential partagé ; suppression d'une révocation non détectable sans journal durable, accès écrivain exclusif et réconciliation requis avant activation. Pas d'autorisation automatique à partir de texte libre ou de sorties IA ; source d'admissions approuvée, stratégie de renouvellement après fusion, gateway et runtime à qualifier. Tests nouveaux non attestés avant CI. Référence coordination 404 au contrôle, admissions documentaires non atomiques.
- **NEXT_ACTION** : réconcilier contributions des deux agents, CI exact SHA, pilote réel, compléter runtime et preuves durables des admissions/revocations, raccordement au codeur, identité/ref protégée et 2 tâches réelles avec reprise/concurrence. Pas de S1, coût, secret, bypass ou certification anticipée. Priorité usine autonome complète.


## 2026-11-24 — MISSION 13 / P0 : intention durable de mutation et fencing
- CONTINUITY_ID SADIAAF-CONTINUITY-20261124-01 ; admission issue #9 [7123680193](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/9#issuecomment-7123680193), parent cc09ae69cba46c1bd8b361332c20381e74dcb712. Complément de la sélection LIVE et du pilote, même PR42.
- Extension additive du ClaimStore : intention de publication CAS sur le claim existant, scope et HEAD exact, blocage release/recover/checkpoint tant que résultat incertain, settlement explicite après observation du HEAD et preuve de quiescence pour reprise. Port mutationGateway limité à un commit préparé, identité et preuve indépendantes, publication non-force, aucun retry implicite. Six tests de protocole ajoutés. Aucun accès GitHub privilégié activé, aucun second registre.
- PARTIAL : CI exacte, transport réel, isolation écrivains, protection ref, preuve de quiescence fiable et garde de mutations autres que publication de commit restent à raccorder. Les ports de confiance ne sont pas une certification runtime. Aucun S1, coût nouveau, bypass, secret ni DONE.
- NEXT_ACTION : vérifier CI/Docker et pilote 6/7, raccorder le chargeur, l'identité, les ports de publication/recovery et le modèle au directeur existant ; attester deux développements réels successifs, reprise et contention.


## 2026-11-24 — MISSION 13 / P0 : sélecteur GitHub des travaux admissibles
- **CONTINUITY_ID** : SADIAAF-CONTINUITY-20261124-01 ; admission 7123645651 ; parent 079d0c8e8195d51e4f44c4a977f3546cf14b999c. Le port selectNext existant reçoit un adaptateur githubSelector.ts : vérifie main protégée et SHA, admission structurée liée à issue/lot/branche/critères, état issue, PR et dépendances fusionnées ancêtres de main, ref nouvelle absente, priorités déterministes, exclusion des travaux déjà tentés et claims en réutilisant transition, relecture main. Extension GET bornée du transport existant ; aucune écriture du sélecteur, CAS réel reste dans runClaimedWorkPass. 5 tests ciblés. Aucun registre ni file supplémentaire, aucun changement du pilote #6.
- **LIMITES** : le chargeur d'admissions canoniques authentifiées reste à raccorder ; les commentaires libres, données modèle et fixtures ne sont pas des autorisations. La sélection n'est pas un verrou et ne certifie pas l'absence universelle de collision ; passerelle de mutation, contrôle des permissions écrivains et claims distants indispensables. Nouveau SHA et recettes non attestés avant CI. Aucune S1, dépense, secret ou bypass.
- **NEXT_ACTION** : vérifier CI/Docker exact SHA et pilote #6, raccorder chargeur d'admissions existantes au contrat canonique, identity/coordination/gateway, événements et deux développements réels sans prompt + reprise/concurrence. Priorité usine complète ; 14 lots après autonomie selon gates. Pas de faux DONE.


## 2026-11-24 — MISSION 13 / P0 : édition bornée et qualification du codeur
- **CONTINUITY_ID** : SADIAAF-CONTINUITY-20261124-01 ; admission 7123620149. Parent 17bd3d405a0b2afa942e483c5b73678a9bc5e84e. Antécédents relus : bc937259c9df4932aeff104ff9b87c2896d2fee0 (contrat agnostique modèle) ; 35236c417a802354deb09a4306a548b63d7769ae (checkpoint 06/11 : aucun runtime hébergé SadiaAF attesté, MCP/UAES distincts) ; recherche commits agent/autonomous/runner/pilot, sans prétention d'exhaustivité. Pilote #4 45336212789 job138250421324 : les trois candidats décodés comparent une date déjà normalisée à minuit, au lieu de l'entrée originale, et modifient inutilement la conversion UTC ; 2e réintroduit problème année 0001. Modèle candidat non qualifié.
- **TRAVAIL** : stratégie d'édition minimale par ancre unique du return original ; seul le modèle produit les instructions de garde à insérer, tous les autres octets du corps historique conservés, refus format/périmètre hors garde, 18 tests inchangés, 2 tests offline supplémentaires de composition/rejet ; aucune correction métier écrite à sa place. Filtre de synchronisation compare before/head exacts pour éviter nouvelle inférence lors d'un commit documentaire ; tests offline conservés, SKIP explicite ne vaut pas GREEN. Code candidat non fiable toujours isolé, contrôle lexical non frontière de sécurité, aucune publication de candidat. Aucun nouveau coût, secret, scheduler, S1 ou bypass.
- **NEXT_ACTION** : vérifier exact HEAD CI/Docker et recette réelle, preuves RED/GREEN sans assouplir tests. Si encore bloqué, comparer alternative compatible ressources et licence ; finaliser identité, stockage protégé, sélection réelle, passerelle, événements et 2 développements réels + interruption/concurrence. Priorité absolue usine complète, pas pilote seul. Les 14 lots et 6 chantiers restent le but. Aucun DONE 24/7 anticipé.


## 2026-11-24 — MISSION 13 : état consolidé de la filiation et du P0 autonomie

- **CONTINUITY_ID** : SADIAAF-CONTINUITY-20261124-01 ; admission issue #9 7123549889 ; [filiation historique](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/9#issuecomment-7123410131). Parent PR42 41ddeaf7a2f570d6f9b5af93573113acbd93609f, main ef861ea26b26b82ec7cac987d9404a3707b2439f. PR42 Draft, non fusionnée. CI769 45336212791 et Docker632 45336212803 SUCCESS sur le parent. Pilotes #3 45336025165 et #4 45336212789 FAILURE ; #4 job138250421324 : RED quatre cas confirmé, empreintes validées, trois propositions distinctes rejetées ; timezone et quatre dates invalides, tentative2 également year-0001. Aucune correction modèle validée, aucun candidat intégré. L'auto-merge historique #37–40 est acquis pour les cas attestés ; codeur permanent non certifié. Coordination/transport/bootstrap codés sur PR42, protection/ref et isolation écrivains non attestées. Pas d'activation S1.
- **FONDATIONS** : ADR-001–018 (voir table de rattachement docs/08) ; ADR-010/012 et issue #9 dès 06/11 ; docs15 §13 déjà introduit le 23/11 par d78f6e82 sur PR37. Les anciennes descriptions de PR37/36 ouvertes, revue universelle et main non protégée ne sont pas des instructions actuelles. PR historiques restantes #22/25/29/31 au dernier inventaire ; quatre PR + PR42. FR-025 (ADR-007) PARTIAL, six chantiers et 14 lots non certifiés. Aucun deuxième registre.
- **BLOCK_REASON** : qualité modèle candidat, identité indépendante autorisée, ref protégée, passerelle mutation, sélection réelle et recette enchaînée restent à démontrer. Les preuves antérieures #38/#39 concernent l'auto-fusion, #23 le runtime métier ; ni l'un ni l'autre ne prouve la programmation autonome.
- **NEXT_ACTION** : rechercher les anciens exécuteurs/pilotes dans l'historique Git et sources autorisées avant tout changement de modèle ; réutiliser ceux attestés, sinon qualifier un autre modèle sans surcoût après analyse des candidats rejetés. Raccorder l'existant, activer coordination/identité sous gates, deux développements réels sans prompt, récupération et concurrence ; puis achever les 14 lots et exploitation. Le nouveau HEAD documentaire nécessitera nouveaux checks ; une relance pilote identique n'est pas une nouvelle stratégie.


## 2026-11-24 — MISSION 13 / P0 : stratégie adaptative du codeur
- **CONTINUITY_ID** : SADIAAF-CONTINUITY-20261124-01 ; admission 7123323199. Parent 382948eb3439ef0d88ca3d054d7d19f9f5b38600. Pilote #2 run45335268509 FAILURE : RED et empreintes attestés, trois candidats rejetés sur timezone, invalid-feb30, invalid-leap, invalid-apr31, century-nonleap ; candidats 2/3 identiques. Pilote #3 run45336025165 utilise encore dispositif inchangé (filtre diff PR).
- **TRAVAIL** : 18 tests et isolation conservés, contre-exemples précis, feedback allowlist, échantillonnage borné après échec, détection répétitions et retour source originale, SHA256/base64 des propositions rejetées de code public ; 2 tests offline supplémentaires. dates.ts inchangé, aucune correction écrite à la place du modèle.
- **BLOCK_REASON** : recette nouveau SHA non attestée ; si échec persistant, qualifier autre modèle dans limites runner. Activation admin, identité autonome, passerelle mutation, sélection et récupération toujours ouvertes. Aucun S1, coût, secret ou bypass.
- **NEXT_ACTION** : vérifier CI/Docker/pilote exact SHA, diagnostics et résultats ; activer coordination protégée sous identité admin et code approuvé ; raccorder modèle, mutations, événements et recette 2 tâches réelles, puis 14 lots. Aucun DONE 24/7 anticipé.


## 2026-11-24 — MISSION 13 / P0 : bootstrap administratif de la coordination existante
- **CONTINUITY_ID** : SADIAAF-CONTINUITY-20261124-01 ; admission issue #9 7123299443. Parent 9ba57bf6c2e39cc67ebea49c45e7d81ab1e86cbb CI767/Docker630 SUCCESS ; diagnostic offline SUCCESS ; pilote #2 45335268509 en cours au contrôle. Main ef861ea26b26b82ec7cac987d9404a3707b2439f. Ruleset 27937019 main seul ; ref coordination 404. Les outils connectés ne proposent pas de mutation administrative des règles.
- **TRAVAIL** : bootstrap.ts et CLI administrateur utilisant l'identité gh existante, mode --check lecture seule par défaut, --apply explicite ; vérification ID dépôt, main protégée, règle exacte sans bypass, création de la règle avant référence, état initial via emptyState, pas de force ni modification de main, refus état préexistant non protégé, vérification finale, idempotence. 4 tests de protocole ajoutés. Ne pas exécuter de code PR non approuvé avec identité admin. Pas de création effective de règle/ref pendant cette session ; isolation des writers non attestée. Pas de changement du pilote en cours.
- **BLOCK_REASON** : accès administratif réel, identité GitHub App/jeton autorisé distinct du GITHUB_TOKEN ordinaire (PR de ce dernier exigent approbation de workflows selon docs GitHub actuelles), exclusivité des écrivains, résultat du modèle, passerelle de mutation et événement réel restent nécessaires. Runners standard publics gratuits, jobs limités à 6h, aucune garantie permanente 24/7 ; cadence à mesurer. Aucun secret, S1, coût ou nouveau scheduler.
- **NEXT_ACTION** : vérifier pilote #2 exact SHA ; contrôler nouveau commit et tests ; exécuter bootstrap uniquement dans environnement admin autorisé et code approuvé, relecture ruleset/ref, qualifier identité autonome et permissions sans exposer jetons ; raccorder modèle au directeur et recette réelle 2 tâches + récupération/contestation, puis finir 14 lots.


## 2026-11-24 — MISSION 13 / Lot 11 : réparation de la boucle RED/GREEN du pilote indépendant
- **CONTINUITY_ID** : SADIAAF-CONTINUITY-20261124-01 ; admission 7123198402. MISSION 13 = rapport fondateur 13 sections et mandat d'ingénierie opérationnel 9 sections réaffirmés, au service de la réalisation des 14 lots, sans deuxième programme. Parent f7a3e1aa6acbc97b1157c442bd947a5c2ba4b3d4 CI765/Docker628 SUCCESS, pilote #1 run45332894389 job138238005899 FAILURE. Logs : RED_CONFIRMED, empreintes moteur/modèle vérifiées, deux propositions rejetées ; assertion exacte non journalisée, cause précise des erreurs non connue.
- **CORRECTION** : conserver tous les tests antérieurs, ajouter 3 cas (siècles et année 0001) ; même suite de 18 cas avant/après, RED réellement en échec sur 4 cas attendus, résultat complet avec identifiants bornés, rejet des rapports incomplets/dupliqués et incohérences de sortie. Retour au modèle des identifiants échoués et de sa proposition précédente, trois tentatives max, température 0 et sortie bornée. 5 tests offline de diagnostic exécutés dans le workflow pilote avant téléchargement. Aucun code de dates.ts corrigé à la place du modèle ; aucun assouplissement de test, pas de publication du candidat, environnement isolé maintenu. Nouvelle recette non encore attestée avant CI.
- **BLOCK_REASON** : qualité du code généré, robustesse du pilote (code non fiable et sandbox), stockage distant protégé, passerelle mutations, sélection réelle des tâches et certification continue restent ouverts. Ce pilote n'est pas une autorisation d'écriture ni une preuve 24/7.
- **NEXT_ACTION** : vérifier exact nouveau SHA CI/Docker et pilote #2 (diagnostics RED, inférence, GREEN), diagnostiquer résultats et poursuivre raccordement au directeur, 2 travaux réels successifs indépendants, puis achèvement 14 lots et exploitation gouvernée. Continuer PR25/29/22/31 selon gates. Aucun S1, nouveau coût, secret, bypass, second scheduler.


## 2026-11-24 — Lot 11 / P0 : qualification d'un véritable modèle de programmation indépendant
- **CONTINUITY_ID** : SADIAAF-CONTINUITY-20261124-01 ; issue #9 admission 7122877433. Parent 45e3bb06556736122de04f252ab59e12ce7833a5 CI764/Docker627 SUCCESS. GitHub Models retiré au 30/07/2026. Dépôt public : runner GitHub standard Ubuntu 24.04, pas de runner payant, clé de modèle ni API facturée.
- **TRAVAIL** : workflow pilote borné à PR42, permissions lecture seule, aucun cron/scheduler ni écriture, script lance llama.cpp CPU b12658 et Qwen2.5-Coder-7B-Instruct-GGUF (Apache-2.0) avec SHA256 publiés vérifiés avant exécution. Tâche réelle : RED date ISO invalide dans dates.ts, modèle propose une fonction, GREEN vérifié dans Docker sans réseau ni secret, deux tentatives max ; sortie candidate uniquement dans logs, aucune publication du code généré ni mutation main. Aucun S1.
- **BLOCK_REASON** : recette réelle du modèle non attestée avant exécution, puis transport d'écriture/claim protégé, sélection canonique, capacité de programmer tous les lots et reprise événementielle permanente restent à certifier. Pilote borné != exécuteur 24/7.
- **NEXT_ACTION** : vérifier runs CI/Docker/pilote exact SHA, examiner preuve modèle/RED/GREEN, corriger le pilote si nécessaire ; raccorder modèle qualifié au programme directeur, authentification et passerelle sécurisée, démontrer deux tâches réelles autonomes, reprise/concurrence ; poursuivre les 14 lots sans reconstruire. Pas de nouveau coût ni secret.


## 2026-11-24 — Lot 11 / issue #9 : P0 exécuteur indépendant, transport GitHub
- **CONTINUITY_ID** : SADIAAF-CONTINUITY-20261124-01 ; admission 7122770954. Parent PR42 8ab297d44f5d9b50cbdeb59cafb809fc9234dfed ; CI762/Docker625 SUCCESS, zéro fil ouvert. Main ef861ea26b26b82ec7cac987d9404a3707b2439f après PR32.
- **TRAVAIL** : réconciliation non destructive à deux parents, préservation des historiques de main et PR42 ; GET ref singulier corrigé (PATCH pluriel), transport HTTP GitHub natif borné au dépôt et chemins coordination, délai, redirections interdites, écritures désactivées par défaut et préflight ruleset dédié. Aucun secret, appel live de runtime ni exécuteur de modèle activé. Tests du nouveau SHA non encore attestés.
- **PRIORITÉ** : exécuteur permanent indépendant de ChatGPT, moteur de programmation habilité, au service de l'achèvement des 14 lots et six chantiers existants ; pas de nouveau programme directeur. Poursuivre les lots indépendants.
- **BLOCK_REASON** : CI/Docker exact SHA, identité et jeton runtime autorisés, protection/initialisation ref, fournisseur de programmation sans surcoût, passerelle mutation, transport événementiel et recette réelle non attestés.
- **NEXT_ACTION** : vérifier CI/Docker ; qualifier et activer un runtime réel autorisé, raccorder sélection et mutations, reprise pending, deux développements successifs hors ChatGPT avec contention, interruption, preuves ; poursuivre PR29/22/25/31 selon gates. Aucun S1, coût, secret, bypass ou certification 24/7 anticipée.
## 2026-11-24 — Lots 5–7 / PR #32 : garde de valorisation obligataire et Total Return
- **CONTINUITY_ID** : SADIAAF-CONTINUITY-20261124-01. PR #32, source `src/calc/bonds.ts`, tests `test/bond-financial-inputs.test.ts`, branche `fix/bond-financial-nonfinite-guard-20261115`.
- **DÉVELOPPEMENT** : rejet des valeurs non finies (courbes, maturités, flux, prix, distributions et résultat), échéances négatives, taux incohérents pour un même tenor ; conservation des doublons cohérents, de l'ordre des données de l'appelant, et des formules de valorisation et Total Return en cas valide. Vérifications d'overflow et de cas numériques extrêmes.
- **PREUVES** : CI #756 https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45322460514 SUCCESS, Docker/PostgreSQL #619 https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/45322460499 SUCCESS, tous deux sur l'ancien HEAD `af65a7f0dfd41ff8ddaf9711d505d782fc316f6e`. Les contrôles seront rejoués sur le nouveau SHA documentaire ; les résultats précédents ne suffisent pas à l'attester.
- **CONSTAT DE REVUE** : les documents obligatoires docs/06 et docs/09 étaient absents du diff de la PR #32. Le présent checkpoint corrige cet écart P1, sans toucher au calcul ni aux tests.
- **LIMITES** : les fixtures sont synthétiques ; pas de courbe officielle, historique de marché, licence, méthode validée par le métier ou recette financière exhaustive attestés. Les lots 5–7 et le chantier #17 restent PARTIAL.
- **BLOCK_REASON / NEXT_ACTION** : vérifier validate et Docker/PostgreSQL au nouveau SHA exact, répondre et résoudre la discussion P1 si preuves suffisantes ; laisser auto-merge natif GitHub fusionner sans bypass. Reprendre les cinq PR encore ouvertes selon dépendances (backfill #22, audit #25, registre #29, gates S1 #31), et achever les 14 lots via le référentiel existant ; aucun déploiement S1.


## 2026-11-24 — Lot 11 / issue #9 : raccordement GitHub du programme directeur
- **CONTINUITY_ID** : SADIAAF-CONTINUITY-20261124-01 ; PR #42, parent 60c929fa83e4563a860b326548ef848ca44ad01e ; traces issue #9 7122328349 et 7122339314. CI #760 et Docker #623 SUCCESS sur a0ae4f0b ; main 50e35e70 protégée, ruleset 27937019 actif, auto_merge=true.
- **CODE** : adaptateur githubDirector.ts (CI/merge, lecture live, clé canonique, vérification répétée et raccordement à runDirectorWake), préflight ruleset dédié, cinq scénarios de test. Aucune installation de ref ou exécuteur externe. Ref 404, seul ruleset main ; événements automation indisponibles (404). Aucun S1, secret, coût ni changement des branches métier.
- **BLOCK_REASON** : validation du nouveau commit, protection/initialisation de ref, transport de confiance, exécuteur réel et passerelle mutation, recette réelle et journalisation exhaustive non attestés.
- **NEXT_ACTION** : vérifier CI #761 et Docker #624 sur 60c929fa, publier l'extension sans force uniquement après vérification HEAD et contrôles ; recetter exact SHA, qualifier configuration administrative dédiée et exécuteur déjà disponible, deux cycles réels et reprise sans tick.


## 2026-11-24 — Lot 11 / issue #9 : admission événementielle du programme directeur
- **CONTINUITY_ID** : SADIAAF-CONTINUITY-20261124-01 ; PR #42, admission issue #9 commentaire 7122228856, parent a0ae4f0bc8805f562eeb557d038f4d78d6de7d15.
- **CODE** : runDirectorWake, reçus intention/résultat et déduplication sur ClaimStore existant ; signal non vérifié refusé, signal interrompu non rejoué, quatre tests ciblés. Aucun transport/exécuteur réel ni bootstrap live ajouté. Plafond conservateur des reçus, stratégie de conservation/index à certifier avant activation.
- **BLOCK_REASON** : validation exact SHA à effectuer ; raccordement du transport authentifié et de l'exécuteur, protection ref, passerelle mutation/fencing, réconciliation après interruption et traces d'opérations exhaustives non certifiés.
- **NEXT_ACTION** : contrôler CI/Docker, corriger et réattester, qualifier le raccordement réel sans nouvel orchestrateur ni coût, réaliser deux unités de code successives sans tick et recette de reprise/anti-collision. Les lots métier indépendants restent inchangés ; aucun S1.


## 2026-11-24 — Lot 11 / PR #42 : passage de travail borné et reprise réelle programmée
- **CONTINUITY_ID** : SADIAAF-CONTINUITY-20261124-01. Base main 50e35e703c55a0e3f22fefe862bdc9bbe657bf13, ancien HEAD #42 b15a4823e33fc6498d3e213a1802535db0d2393d ; CI #759 et Docker #622 SUCCESS sur cet ancien SHA, pas sur ce changement.
- **TRAVAIL** : extension du module de coordination existant `runClaimedWorkPass`, avec sélection canonique réitérée, claim, pré-dispatch fencing, callback d'exécution, heartbeat/checkpoint/release, limite et refus des répétitions. Cinq tests supplémentaires, dont deux unités successives sans second déclenchement, interruption, expiration et preuve manquante. Il s'agit d'un port d'intégration borné, pas d'un nouvel ordonnanceur ni d'une invocation réelle de modèle. Tests nouveaux NON_RUN avant CI.
- **RUNTIME** : automation horaire existante vérifiée active (dernière exécution enregistrée 04:35 UTC), mandat renforcé avec succès pour enchaîner le travail admissible pendant une même session, cadence inchangée. Découverte des sources d'événements indisponible (404) ; ref coordination absente (404 GitHub), seul ruleset main retourné. Aucun bootstrap non protégé ni exécuteur événementiel attesté.
- **NEXT_ACTION** : vérifier CI/Docker exact SHA et tests ; qualifier protection ref, identité/horloge et passerelle de mutation ; raccorder le port à l'exécuteur réel autorisé et tester deux cycles réels, crash/reprise et déduplication événementielle. Conserver PR Draft sensible, aucun S1 ni coût nouveau. Lot 11 PARTIAL.


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
