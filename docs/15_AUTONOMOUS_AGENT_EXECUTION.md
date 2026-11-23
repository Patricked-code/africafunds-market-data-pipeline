# 15 — Exécution continue des travaux par agents Claude et ChatGPT

**Date de décision :** 2026-11-06  
**Statut :** contrat de fonctionnement approuvé comme objectif, **non encore déployé comme runtime autonome**.  
**Dépôt :** `Patricked-code/africafunds-market-data-pipeline`.  
**Références maîtres :** `AGENTS.md`, `docs/07_AI_HANDOFF_PROTOCOL.md`, `docs/09_CHANGELOG_WORKLOG.md`, `docs/08_DECISION_LOG.md`, `docs/13_MODE_DE_REALISATION_ET_PLAN_DE_LOTS.md` et `docs/10_DEPLOYMENT_GATES.md`.

## 1. Mandat permanent et définition de la cible

Le mandat principal est **d'achever intégralement AfricaFunds Market Data Pipeline / plateforme cible SadiaAF**, depuis les fondations existantes jusqu'au code, aux données, aux tests, aux contrats, au staging et à une production S1 gouvernée et attestée. Réutiliser et compléter le système existant sans recréer ce qui fonctionne.

Une fois un agent Claude ou ChatGPT admis sur le dépôt, il doit **enchaîner toutes les tâches admissibles**, sans demander à l'utilisateur de donner une instruction après chaque tâche. Son objectif n'est pas de réaliser une seule PR, mais de poursuivre le même programme jusqu'à la fin du travail autorisé ou à un blocage réel et documenté.

**Précision technique obligatoire :** un dépôt Git et un fichier `AGENTS.md` ne peuvent pas, seuls, maintenir un agent en exécution 24 h/24. Cette continuité suppose un **exécuteur externe persistant ou relancé par planificateur**, avec authentification GitHub et accès au modèle Claude ou ChatGPT, budget, durée d'exécution, reprise après crash et surveillance. Aucun exécuteur de ce type n'est attesté comme installé ou actif pour ce dépôt à la date de rédaction. Le présent document en définit le **contrat inter-agent**, sans simuler son activation.

## 2. Autorités et séparation des responsabilités

- **GitHub** : dépôt canonique, code, historique, branches, issues/PR, discussions de revue, commits, CI et preuves réellement disponibles.
- **`docs/09_CHANGELOG_WORKLOG.md`** : journal chronologique canonique des travaux, checkpoints datés et dernier `NEXT_ACTION`.
- **`docs/13_MODE_DE_REALISATION_ET_PLAN_DE_LOTS.md`** : programme existant de 14 lots (0 à 13), à conserver.
- **`docs/14_MATRICE_EXIGENCES_RECETTE.md`** : critères d'acceptation et preuves métier.
- **`docs/08_DECISION_LOG.md`** : décisions durables, pas de modification silencieuse d'arbitrages acceptés.
- **Agent Claude/ChatGPT** : analyse, planification locale, développement, tests, PR, documentation et remise de preuves dans sa capacité technique et son mandat.
- **Exécuteur/scheduler** : relance les agents, vérifie les prérequis, la concurrence et les conditions d'arrêt ; ne crée aucune seconde autorité métier.
- **Validation** : contrôles CI, revue indépendante et protections de branche ; validation humaine des décisions réservées et des gates de production S1 déjà définis.

La couche d'exécution doit être **agnostique du modèle** : un même format de tâche, checkpoint, critères de recette, preuve et issue/PR, quel que soit le moteur Claude ou ChatGPT. Aucun accès à Codex/Copilot n'est requis.

## 3. Boucle canonique de travail

1. **ADMISSION** : identifier le dépôt, le rôle d'agent, les capacités réelles (GitHub lecture/écriture, terminal, CI, environnements de test) ; lire `AGENTS.md` et ses pointeurs. Ne pas déduire une permission d'une ancienne conversation.
2. **RECONCILIATION** : relever SHA de `main`, branches et PR ouvertes, CI et tests réels, conflits, derniers checkpoints ; détecter et traiter les écarts entre journal et code réel avant toute écriture.
3. **CONTINUITY** : récupérer l'entrée la plus récente du worklog, le `NEXT_ACTION` actif et le dernier checkpoint ; conserver les travaux déjà engagés en priorité.
4. **DISCOVERY** : identifier dans les lots 0 à 13 et la matrice de recette le prochain travail autorisé, non terminé, indépendant des travaux bloqués. Ne pas réouvrir un sujet prouvé `DONE`.
5. **ADMISSIBILITY** : formuler objectif, critères vérifiables, sources, dépendances, portée de fichiers, risques, données de test, rollback. Refuser toute tâche qui exige un secret ou une permission inexistante, un contournement de sécurité ou la suppression de données non protégées.
6. **CLAIM** : réserver le travail à **un seul agent** avec identifiant de tâche, propriétaire, branche, commit base, horodatage, délai de validité/lease et état, sur GitHub ou un mécanisme transactionnel fondé sur GitHub. **Ce protocole de claim est à implémenter ; il n'est pas encore attesté.**
7. **TDD** : lire le code pertinent ; créer un test qui démontre le défaut ou l'exigence (**RED**) ; implémenter la modification minimale compatible (**GREEN**) ; compléter tests limites, sécurité, migration et non-régression ; conserver les sorties d'exécution.
8. **VALIDATION** : exécuter les contrôles disponibles et ceux nécessaires à la tâche ; noter chaque résultat réellement obtenu (pas de PASS inventé). Si un outil manque, marquer le test `NOT_RUN` et ne pas transformer une hypothèse en réussite.
9. **PR** : branche dédiée, commits lisibles, PR avec fichiers et preuves, suivi de CI, revue indépendante lorsque disponible, demande de correction si rouge. Aucun push direct `main`.
10. **INTEGRATION** : fusion uniquement si politique de branche, CI, revue et critères d'acceptation sont satisfaits. Si la fusion ou un gate est réservé à une personne ou à une autorité non disponible, classer `WAITING_APPROVAL` et poursuivre une autre tâche indépendante.
11. **CHECKPOINT** : mettre à jour le statut, le worklog, les décisions si concernées, le `NEXT_ACTION`, les références commit/PR/CI et la nature des tests ; libérer ou transférer le claim.
12. **LOOP** : revenir à la réconciliation puis sélectionner automatiquement le travail admissible suivant. L'agent n'attend pas un nouveau message utilisateur entre deux tâches autorisées.

Transition nominale :

```text
ADMISSION → RECONCILIATION → CONTINUITY → DISCOVERY → ADMISSIBILITY
  → CLAIM → TDD(RED→GREEN) → VALIDATION → PR → INTEGRATION
  → CHECKPOINT ───────────────────────────────────────────────┐
                ← RECONCILIATION ←────────────────────────────┘

Bloqué/permission manquante → CHECKPOINT(BLOCKED) → autre tâche indépendante
Plus aucune tâche admissible → IDLE avec raison et prochain contrôle programmé
Crash/perte de contexte → ADMISSION + récupération à partir de GitHub
```

**Définition de « sans arrêt » :** poursuivre les tâches successives tant qu'il existe un agent/exécuteur actif, un mandat valide, une tâche admissible et les ressources nécessaires. En cas de blocage, l'orchestrateur doit replanifier la reprise plutôt que boucler à vide ou déclarer l'objectif atteint.

## 4. Sélection des travaux et priorités

L'ordre de référence au 2026-11-06 est :

1. **RESUME FIRST** : reprendre le `NEXT_ACTION` admissible de la dernière session, vérifier les PR en cours ; en particulier converger la PR #1 et la PR #2 avant de multiplier les sources documentaires.
2. **P0 BEFORE EXPANSION** : traiter les défauts de backfill, la propagation des erreurs, le claim concurrent, la déduplication SQL, les réponses HTTP et les risques de déploiement, avec preuves RED/GREEN.
3. **FOUNDATIONS** : compléter la CI/testabilité, la sécurité et le modèle canonique avant une exposition publique ou les intégrations exigeantes.
4. **LOTS** : poursuivre les lots existants selon leurs dépendances réelles, sans ignorer la matrice de recette.
5. **PRODUCTION GATES** : staging et production S1 uniquement après recette, sauvegardes, restauration, rollback, sécurité, approbations et attestation runtime.

Le système de sélection doit être **déterministe et auditable** : priorité explicite, dépendances satisfaites, claim disponible, critères d'acceptation connus. Il peut travailler sur une autre tâche si une PR est en attente de revue, mais jamais substituer ce détour au travail bloqué initial.

## 5. Multi-agents Claude / ChatGPT : concurrence sans collision

Chaque agent utilise la même lecture de la source GitHub et un espace de branche distinct. Deux agents ne peuvent pas simultanément posséder la même tâche et les mêmes fichiers conflictuels sans coordination explicite.

**Métadonnées minimales du travail :**

| Champ | Rôle |
|---|---|
| `WORK_ITEM_ID` | Identifiant stable lié à issue ou registre de tâches |
| `PARENT_LOT` | Lot 0–13 existant |
| `GOAL` / `ACCEPTANCE` | Objet et critères prouvables |
| `STATUS` | `READY`, `CLAIMED`, `IN_PROGRESS`, `PR_OPEN`, `WAITING_CI`, `WAITING_REVIEW`, `WAITING_APPROVAL`, `BLOCKED`, `DONE` |
| `OWNER_AGENT` | Claude ou ChatGPT, identifiant de session/exécuteur |
| `CLAIM_LEASE_UNTIL` | Expiration détectable après crash |
| `BASE_SHA` / `BRANCH` | Point de départ exact et branche de travail |
| `PR_URL` / `MERGE_SHA` | Traçabilité du changement |
| `TEST_EVIDENCE` / `CI_RUN` | Logs et vérifications réels |
| `NEXT_ACTION` | Reprise déterministe, jamais implicite |
| `BLOCK_REASON` | Autorisation, dépendance, panne d'outil ou test rouge |

Pour une migration de base, une méthode financière ou un changement de contrat, utiliser une exclusion/coordination explicite, une revue de compatibilité et une migration additive. Les baux expirés sont repris **après vérification** du commit, des PR et des traces, jamais par écrasement aveugle.

## 6. Gouvernance des actions autonomes

**Autorisées sans nouvelle instruction par tâche**, dès lors que le mandat et les permissions sont présents : lecture/audit du dépôt, création de branches de travail, tests sur environnement isolé, corrections compatibles, documentation, commits, création et mise à jour de PR, suivi de CI, revue technique et passage à la tâche admissible suivante.

**Gouvernées par des gates obligatoires** : merge uniquement avec contrôles réellement satisfaits et revue requise ; changements de sécurité majeurs, exposition de données, accès à des secrets, actions irréversibles, infrastructure sensible et production S1 dans le périmètre de leurs autorisations et approbations explicites. Un agent ne doit jamais contourner un contrôle humain pour satisfaire la boucle « sans arrêt ».

Les artefacts GitHub `Draft` restent `Draft` tant que leurs conditions de sortie ne sont pas prouvées. Un test ou un déploiement non exécuté est `NOT_RUN`, jamais `PASS`.

## 7. Gestion des incidents, anti-régression et reprise

- **Échec de test** : conserver logs, corriger sur la branche et relancer ; si non reproductible, documenter l'environnement manquant.
- **CI rouge** : garder PR ouverte, ne pas fusionner ; créer ou compléter l'issue de défaut si la remédiation requiert une autre tâche.
- **PR conflictuelle** : réconcilier le HEAD exact et revalider les tests, sans rebase destructif non nécessaire.
- **Agent interrompu** : relire GitHub et worklog ; vérifier lease/branche/PR ; reprendre au premier gate non satisfait.
- **Travail bloqué** : `BLOCKED` avec raison, preuve et `NEXT_ACTION`; sélectionner du travail indépendant s'il en existe.
- **Aucune tâche libre** : `IDLE` sans consommation inutile, avec contrôle à l'arrivée d'un événement GitHub ou à la prochaine cadence du scheduler.
- **Terminaison globale** : chaque exigence de la matrice est couverte, validée et reliée à une preuve, les lots sont achevés, les gates S1 satisfaits, le code et le runtime attestés — pas seulement un nombre de PR fusionnées.

## 8. Ce qui manque pour obtenir un fonctionnement réellement permanent

Cette section est un **backlog d'implémentation**, pas une déclaration de capacité existante :

1. **Runner durable** (GitHub Actions orchestrateur, service dédié ou autre environnement) : déclenchement par événements et planification, reprise après crash, limites budgétaires et alertes.
2. **Adaptateurs d'exécution** Claude et ChatGPT dans leurs environnements réellement disponibles ; interfaces communes pour lecture Git, patch, shell/test, PR et checkpoint, sans secrets dans le dépôt.
3. **Registre/claim avec exclusion atomique** et baux renouvelables ; arbitrage des conflits et reprise après expiration.
4. **CI crédible et reproductible** avec dépendances verrouillées, PostgreSQL isolé, tests financiers, scans et builds.
5. **Politique d'intégration et revue indépendante** vérifiable, cohérente avec protections GitHub, délégation et exigences de sécurité.
6. **Vérifications automatiques du worklog et des preuves**, ainsi qu'un contrôle d'absence de dérive sur `NEXT_ACTION`.
7. **Validation en staging** du cycle complet enchaînant plusieurs tâches, y compris interruption/reprise, conflit multi-agent, CI rouge, attente de revue et absence de tâches.

**Statut actuel :** le contrat documentaire peut être lu par Claude ou ChatGPT, mais aucun runner, scheduler, claim atomique, travail continu effectif ou pipeline CI n'est démontré dans le cadre de cette intervention.

## 9. Exemple de consigne d'entrée inter-agent

> Je suis l'agent codeur de ce dépôt. Lis `AGENTS.md`, `docs/15_AUTONOMOUS_AGENT_EXECUTION.md`, le dernier worklog et checkpoint ; réconcilie l'état GitHub réel et retrouve la dernière tâche admissible. Poursuis le cycle branche → tests RED → correction GREEN → vérification → PR/CI/revue → checkpoint → tâche suivante, dans la limite de tes outils et autorisations. Ne sollicite une décision que si un gate réellement réservé l'exige. Aucun déploiement S1 sans les preuves et autorisations obligatoires. Inscris chaque étape dans GitHub pour qu'un autre agent reprenne sans perte de contexte.

## 10. Critères de recette de la continuité

Le mécanisme ne pourra être déclaré **DONE** que si un exécuteur réel démontre :

1. Une première tâche mise en oeuvre avec PR, CI et logs de tests authentiques.
2. La sélection **automatique** d'une seconde tâche admissible, sans message humain entre les deux.
3. Un arrêt contrôlé et la reprise de la même tâche par un autre agent, sans écrasement et avec continuité du `NEXT_ACTION`.
4. Deux agents exécutant des travaux indépendants sans collision de claim ni conflit de versions silencieux.
5. Une PR rouge ou en attente d'approbation qui reste non fusionnée, pendant qu'un travail indépendant progresse.
6. Les gates S1 bloquant toute mise en production non autorisée.
7. La remontée de l'état final, des preuves et des blocages dans GitHub, puis le retour à `IDLE` ou la sélection du prochain travail.

Aucune de ces recettes n'est attestée comme passée le 2026-11-06.

## 11. Intégration automatique gouvernée — préparation 2026-11-23

Cette section complète la boucle du §3 sans créer de seconde file de tâches, de nouveau scheduler ou d'autorité concurrente. Les seules autorités de validation sont les protections GitHub, les reviews et les checks réels du SHA concerné.

**Code candidat :** `scripts/ci/governed-native-automerge.mjs`, `test/governed-native-automerge.test.mjs` et `.github/workflows/governed-native-automerge.yml`. Le workflow `pull_request_target` utilise exclusivement un checkout de `main`, et n'exécute JAMAIS le code des PR non fiables. Il dispose seulement de `contents: read` et `pull-requests: write`. Aucune API de fusion directe n'est utilisée : seule l'inscription dans l'**auto-merge natif GitHub** est proposée, si toutes les conditions d'éligibilité sont vérifiées.

**Déclenchement :** PR interne ciblant `main`, ouverte, non Draft, au dernier SHA reçu, labellisée `automerge-eligible` par l'agent propriétaire après revue des changements et tests applicables. Une PR sans ce signal reste non éligible. Le retrait du label ou le passage en Draft désactive l'enrôlement auto-merge existant via l'API de révocation native, sans fusion ; les changements de politique détectés lors d'un événement déclenchent le même contrôle conservateur. Le workflow se déclenche par événement GitHub ; l'automatisation horaire existante reste responsable du `NEXT_ACTION` et du travail de code, sans duplication.

**Gates fail-closed :** `main.protected=true`, option `allow_auto_merge=true`, règle de protection classique effective avec au moins une approbation obligatoire, `validate` et `Build, boot, migrate and verify persistent PostgreSQL` comme contrôles statutaires requis sur une branche à jour, approbations anciennes invalidées, résolution des conversations de revue obligatoire et protections appliquées aux administrateurs. Si ces données ne sont pas vérifiables par le token GitHub Actions ou si un seul gate manque, le workflow n'enrôle pas la PR. GitHub vérifie ensuite les reviews et checks avant sa fusion native.

**Statut live observé au 2026-11-23 :** `main.protected=false`, aucun ruleset retourné, `allow_auto_merge=false`, PR #36 Draft et `reviews=[]`. Le mécanisme est donc **PREPARED / NOT ACTIVE** ; il ne peut en aucun cas être déclaré autonome en production. En outre, une revue humaine ou par un **acteur indépendant réellement habilité** reste obligatoire ; aucun tel reviewer automatique n'est actuellement attesté.

**Configuration administrative UNIQUE nécessaire :** créer sur `main` une protection GitHub réelle exigeant PR, `validate` au SHA courant, au moins une revue indépendante, dismissal des approvals obsolètes, résolution des conversations, absence de bypass administrateur, force-push/suppression interdits ; puis autoriser `Allow auto-merge` dans les paramètres du dépôt. Vérifier que le token natif peut lire la règle via GraphQL et enrôler la PR ; sinon conserver le gate fermé, sans ajouter de token personnel ou de service payant.

**Couverture CI :** `staging-runtime-smoke.yml` a été adapté pour exécuter Docker/PostgreSQL sur **toutes** les PR, y compris purement documentaires, afin que son check puisse être exigé sans blocage par filtre de chemins. Les deux checks doivent passer sur le SHA exact et le branchement main doit être à jour. Aucun S1, secrets, intégration de données officielles ni déploiement automatique implicite.

**Recette avant DONE :** tests unitaires du fail-closed sur CI au SHA exact ; protection main attestée ; auto-merge effectivement configuré ; PR pilote non Draft et éligible, revue indépendante après le dernier push, status `validate=SUCCESS` et Docker SUCCESS sur le SHA exact ; inscription auto-merge attestée, fusion native, aucun bypass ; second chantier continué à partir du checkpoint, sans collision. En cas de défaut : `BLOCK_REASON` et `NEXT_ACTION` dans les autorités GitHub existantes.

## 12. Fusion native sans revue obligatoire — décision 2026-11-23

Le propriétaire a explicitement retiré l'exigence universelle d'approbation indépendante pour les **PR ordinaires non sensibles** des lots 0–13. Cette décision ADR-016 remplace, dans ce périmètre limité, les mentions de revue indépendante obligatoire de l'ADR-015 et du §11 ; elle **ne supprime pas** les autorisations humaines réservées à S1, aux secrets, à l'infrastructure sensible et aux traitements destructifs.

Un agent peut proposer `automerge-eligible` après preuve CI/Docker et qualification de la portée, sans attendre une approbation indépendante. GitHub doit exiger PR sur `main`, checks `validate` et `Build, boot, migrate and verify persistent PostgreSQL` stricts et à jour, conversations de revue résolues, et protections contre les force-push/suppressions. Le ruleset actif ciblant main peut avoir `required_approving_review_count=0`, sans approbation du dernier push, ni exigence CODEOWNERS, team reviewers ou approbation supplémentaire. Si un gate est manquant ou son état non vérifiable, le code refuse l'enrôlement (fail-closed).

La suppression des approbations n'équivaut PAS à une fusion autorisée par défaut : ni PR Draft, ni dossier sans droits/licences vérifiés, ni changement sensible, ni absence de tests, ni exposition de secret, ni S1 ne doivent être intégrés automatiquement. La mission et la mémoire canonique restent dans ce dépôt, aucun deuxième orchestrateur n'est créé.

État d'exécution à revalider : GitHub a enregistré le ruleset `27937019` avec compteur initial 1 ; l'application du nouveau compteur 0 nécessite des droits d'administration du compte `Patricked-code`. La PR #37 reste Draft jusqu'aux contrôles exact SHA et à la qualification opérationnelle du workflow ; aucune preuve d'automatisation effective par GitHub Actions n'est anticipée.


## 13. Cartographie vérifiable des treize dimensions de continuité SadiaAF (2026-11-23)

**Objet :** rattacher les treize dimensions du suivi transversal aux documents, lots, issues et PR déjà existants. Cette section est une **extension du contrat canonique**, pas un second registre, une autre roadmap ou un nouvel orchestrateur. Elle ne prétend pas sauvegarder le verbatim intégral et horodaté de toutes les conversations : l'exhaustivité conversationnelle littérale n'est pas attestée. Les documents maîtres restent AGENTS.md, docs/05_IMPLEMENTATION_ROADMAP.md, docs/06_CURRENT_STATUS_AND_GAPS.md, docs/08_DECISION_LOG.md, docs/09_CHANGELOG_WORKLOG.md, docs/13_MODE_DE_REALISATION_ET_PLAN_DE_LOTS.md, docs/14_MATRICE_EXIGENCES_RECETTE.md et le présent fichier. Le dernier état LIVE GitHub prime sur les descriptions historiques.

### 13.1 — Identité, dépôt, gouvernance GitHub
- **SadiaAF** est la plateforme centrale indépendante des applications consommatrices comme AfricaFunds. Dépôt technique canonique unique : Patricked-code/africafunds-market-data-pipeline. Ni MCP, ni UAES, ni Workers ne deviennent une autorité ou un nouveau runtime de SadiaAF.
- Au contrôle du 23/11/2026 : dépôt PUBLIC ; main au SHA 73256f48d81d38ce8ff6f51be9e024b25cf5dadb, protégée par ruleset actif n° 27937019 ; aucun bypass ; PR obligatoire ; 0 approbation requise pour les PR ordinaires (ADR-016) ; conversations de revue résolues ; checks stricts obligatoires validate et Build, boot, migrate and verify persistent PostgreSQL ; interdictions de force-push et suppression ; allow_auto_merge=true. Issue #3 clôturée.
- La signature cryptographique des commits est un **sujet distinct**, non certifié exécuté.

### 13.2 — Déblocages réalisés et limites de certification
- Authentification GitHub CLI Patricked-code et configuration unique du ruleset par le script Windows V2 exécutées et vérifiées par API. Inutile de refaire ces réglages.
- GitHub CI et Docker tournent sur les PR ; le dépôt public permet des runners standards sans nouvelle dépense constatée. Ces tests ne valent ni fusion native certifiée, ni moteur codeur autonome 24 h/24, ni production S1.
- Ne jamais reporter un SUCCESS d'un ancien SHA sur un nouveau commit. Aucun nouveau service payant, Codex, Copilot, file ou orchestrateur demandé.

### 13.3 — PR #37, automatisation d'intégration, lot 11
- Branche feat/sadiaaf-governed-native-automerge-20261123 ; script scripts/ci/governed-native-automerge.mjs, workflow .github/workflows/governed-native-automerge.yml, tests et modifications des CI existantes.
- Au checkpoint d'entrée : PR #37 OPEN/READY non fusionnée, HEAD bc71e107925b91632ee19413c664240d601c303d, CI #714 (run 45280800082) et Docker #578 (run 45280800083) SUCCESS sur ce SHA seulement.
- Mécanisme : GitHub native auto-merge sans merge direct ; PR interne, READY, label explicite automerge-eligible, événement SHA actuel, règles strictes actives. Diff exhaustif exigé ; refus des changements .github, sécurité, secrets/credentials, SQL, déploiement, dépendances et renommages sensibles. Révocation au retrait du signal.
- **BLOQUÉ** : PR non intégrée à main ; permissions réelles du GITHUB_TOKEN, compatibilité événement pull_request_target et pilote de fusion native non certifiés. La PR #37 est elle-même sensible car elle modifie la gouvernance ; ne pas lui appliquer aveuglément la voie ordinaire.

### 13.4 — Historique des opérations techniques et correctifs
- Tests fail-closed renforcés sur la PR #37. CI #710 a initialement détecté un chemin credentials au pluriel non refusé (80/81 tests) ; commit 022ade7eb238bc59a9b4c52ed6fc2539ac089544 corrige la reconnaissance singulier/pluriel.
- La contention potentielle entre les fichiers backfill-claim.test.ts et backfill-window.test.ts utilisant une même base PostgreSQL a conduit au commit c76bd26406a7bb4325d8f31f829a18b6052390ef : test:integration fonctionne avec --test-concurrency=1 ENTRE fichiers, tout en gardant la concurrence entre workers DANS les tests. Hypothèse de cause non déterministe encore à valider par répétitions. Issue #5 renseignée ; ne pas modifier la branche PR #22 sans claim.

### 13.5 — PR #36, ingestion
- PR #36 OPEN/DRAFT, HEAD observé df0129b625798147eb1dc3f283fcbd7fd19fac99 ; CI #686 et Docker #553 SUCCESS sur son SHA, non fusionnée.
- Refuser les faux SUCCESS lorsque zéro observation ou téléchargement enfant échoué ; vérifier la compatibilité des pages HTML d'index légitimes et le comportement officiel de chaque adaptateur. Conserver propriété/claim de sa branche.

### 13.6 — Inventaire des PR candidates
- Quatorze PR ouvertes au contrôle : #22 et #25 à #37. #22 backfill/fencing ; #25 preuve audit 44 sources ; #26 collecteurs API non implémentés ; #27 admission typée ; #28 scoring qualité ; #29 registre FX/inflation/VL ; #30 CORS ; #31 gates S1 documentaires ; #32 obligations ; #33 HTTP retry ; #34 calcul index/FX ; #35 parsing CSV ; #36 faux succès ; #37 auto-merge.
- Chaque PR doit être qualifiée selon ownership/branches, diff, SHA, dépendances, tests, droits des sources et autorisations sensibles. PR ouverte ou CI verte ne signifie pas un lot complet.

### 13.7 — Les six chantiers de données du mandat complémentaire
1. **Issue #13 / PR #18 fusionnée :** qualifier les 44 endpoints / 11 marchés. Matrice historique docs/SOURCE_AUDIT_RUN_42314547906.md : 14 HEAD 200, 7 HEAD 403, 1 HEAD 404, 22 NOT_PROBED au 07/11 ; résoudre par preuves officielles sans contourner robots/licences ; HTTP 200 ne certifie pas une série historisée.
2. **Issue #14 :** six adaptateurs dynamiques, cinq CBE Égypte et un GOSDMX Tunisie ; formats API/documentaires, droits et données témoins obligatoires. Les PR de sécurité/CSV seules ne sont pas six adaptateurs DONE.
3. **Issue #5, PR #12 fusionnée, PR #22 ouverte :** fenêtres historiques réellement appliquées, claims atomiques, leases/fencing, crash recovery, retry, zéro faux SUCCESS, répétabilité PostgreSQL.
4. **Issue #15 :** provenance, dates économiques, normalisation, validation et qualité dans les schémas ref/source/market/fund/method/calc/quality ; aucune observation invalide publiée.
5. **Issue #16 :** sources officielles FX, inflation, fonds/VL, droits/licences, enrichissement additif préservant les 44 sources initiales.
6. **Issue #17 :** historiques, trous, révisions, indices, courbes, obligations et Total Return, méthodes comparées aux valeurs témoins puis publication API ; aucun HISTORY_COMPLETE sans preuves.
Les issues #5, #13–#17 restent ouvertes. Ce programme est transversal aux lots existants, pas une nouvelle usine ou un lot 14.

### 13.8 — Les quatorze lots canoniques, de 0 à 13
- Lot 0 : consolidation documentaire, existant à réconcilier, non certifié totalement achevé.
- Lot 1 : sécurité, identité, bootstrap, SUPER_ADMIN, MFA et RBAC, non certifiés DONE.
- Lot 2 : modèle canonique exécutable, normalisation et provenance, qualification non achevée.
- Lot 3 : interopérabilité, mappings et drift, pilotes non certifiés.
- Lot 4 : adaptateurs officiels, inventaire initial présent, six adaptateurs et couverture historique non achevés.
- Lot 5 : courbes de taux, séries et recettes de marché non certifiées.
- Lot 6 : obligations et Total Return, calculs réels à recetter.
- Lot 7 : fonds/VL, catégories et benchmarks, sources/méthodes/recettes à compléter.
- Lot 8 : cockpit Super Administrateur, parcours sécurisé end-to-end non attesté.
- Lot 9 : API, exports, webhooks, sécurité et contrats à valider.
- Lot 10 : PostHog et observabilité, exploitation et protections à attester.
- Lot 11 : CI/tests/sécurité, CI fonctionnelle, auto-merge et stabilité à terminer.
- Lot 12 : staging : runner Docker éphémère != staging durable sur S1 ; préflight/DB/collecte et backup à vérifier.
- Lot 13 : production S1 bloquée par gates de recette et autorisation explicite.
La définition complète, les critères de réception et les dépendances restent dans docs/13 et docs/14. Ne jamais déduire DONE d'une simple présence de code ou d'une checklist.

### 13.9 — Staging S1, recettes financières, production
- Architecture SadiaAF prévue : API/cockpit propres, PostgreSQL, archives brutes persistantes, collecte indépendante de ChatGPT et supervision. Les observations HTTP 500 sur les domaines au 07/11 sont historiques, pas un contrôle live S1.
- docs/10_DEPLOYMENT_GATES.md exige authentification/RBAC/MFA, scan de secrets, licences des sources, migrations/seeds, qualité/provenance, calculs de référence (courbes, fonds, obligations, Total Return et absence de look-ahead), API, charge, staging, sauvegarde/restauration, rollback, approbation de mise en production.
- Aucun S1 sans autorisation spécifique, aucune suppression d'existant et aucune assimilation des tests Docker CI à une recette de production.

### 13.10 — Enchaînement strict des travaux et parallélisme admissible
1. Réconcilier main, PR #37, checks SHA et dernier NEXT_ACTION.
2. Qualifier permissions token, événement pull_request_target, refus des changements sensibles et test fail-closed.
3. Intégration PR #37 seulement après autorisation gouvernée de cette PR de sécurité ; jamais de fusion directe ou implicite.
4. Recette d'enrôlement et fusion native sur une PR pilote ordinaire non sensible, puis preuve de reprise.
5. Traiter la non-détermination des tests backfill sans collision PR #22.
6. Qualifier PR #36 et les autres PR selon dépendances, propriété, droits et tests.
7. Réaliser les six chantiers de données par marché avec valeurs témoins, licences, provenance, historique et publication.
8. Terminer les autres lots 0–11, identité, calculs, cockpit, API, observabilité.
9. Préflight lecture seule S1 puis staging isolé AUTORISÉ, PostgreSQL persistant, sauvegardes/restauration et collecte pilote.
10. Production uniquement après gates documentés et autorisation explicite.
Ne pas bloquer des travaux non dépendants pendant l'attente d'un gate ou d'une autre branche propriétaire.

### 13.11 — Exécution autonome : ce qui est présent et ce qui reste à démontrer
- Automatisation ChatGPT existante « Continuité AfricaFunds Data Pipeline » : Automation_a523352a7c448191a41080097ce8b01f, active avec cadence horaire, mandat GitHub-first et anti-collision, sans nouvelle file/autorité.
- Les runners GitHub Actions effectuent CI et Docker ; ils ne sont pas des agents codeurs autonomes. Les sections 1–10 du présent contrat définissent déjà une boucle objectif → lecture → NEXT_ACTION → claim → code → tests → PR → preuves → reprise.
- L'exécuteur codeur réel permanent/repris, ses permissions et son accès modèle, ses claims et crash recovery, le budget zéro coût supplémentaire et deux lots successifs end-to-end doivent être **attestés par preuves** avant d'affirmer 24 h/24.

### 13.12 — Anti-régression, anti-dispersion et décisions durables
- Sources existantes seulement : AGENTS.md pour les règles, docs/08 pour ADR, docs/09 pour checkpoints, docs/05/06/13/14 pour lots/statuts/gates, GitHub PR/issues pour ownership et tests.
- À chaque exécution : recharger SHA, CI, PR, dépendances et autorisations ; pas de push direct main, force-push, fusion de gouvernance sans autorisation, nouveau secret, service payant, déploiement S1 non autorisé.
- ADR-016 supprime la revue indépendante UNIVERSSELLE des PR ordinaires, pas les autres gates sensibles. L'absence de secrets dans l'historique public reste non certifiée.

### 13.13 — Point de reprise vérifiable et critères de fin
- Lecture : AGENTS.md → docs/09 et dernier checkpoint → présent docs/15 → docs/05/06/08/10/13/14 → état GitHub réel. Cet ordre complète le parcours documentaire d'arrivée existant, sans le remplacer.
- Avant la présente mise à jour documentaire : PR #37 HEAD bc71e107925b91632ee19413c664240d601c303d, READY, CI #714 et Docker #578 SUCCESS ; main protégée inchangée, PR #36 DRAFT. Le présent ajout produira un nouveau SHA à vérifier à nouveau, sans extrapoler les tests anciens.
- **BLOCK_REASON :** PR #37 de gouvernance non fusionnée et workflow non validé en runtime, token/événement à certifier ; fusion pilote absente ; runner codeur permanent non attesté ; six chantiers et recettes financières non terminés ; S1 non autorisé.
- **NEXT_ACTION :** vérifier CI/Docker sur le nouveau SHA, qualifier les permissions et l'événement de la PR #37, autoriser/gouverner l'intégration de cette PR sensible, recetter un vrai auto-merge natif et deux cycles de développement sans collision, poursuivre PR #36 et les lots existants, puis staging/production selon gates distincts.
