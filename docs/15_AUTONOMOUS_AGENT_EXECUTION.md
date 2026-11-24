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


### Rattachement canonique MISSION 13 — continuité de la section 13, 24/11/2026

**MISSION 13 / SADIAAF-CONTINUITY-20261124-01** = nom du programme transversal existant de la présente section 13 et du mandat d'ingénierie opérationnel réaffirmé en neuf sections. Ni lot 13 seul, ni nouveau projet. Le commit [d78f6e82](https://github.com/Patricked-code/africafunds-market-data-pipeline/commit/d78f6e82cf180f0128fb8ddaa40e1d35f0f3dcfc) est la preuve Git vérifiée de l'introduction de cette cartographie le 23/11, avant PR42. ADR-010 (06/11) et ADR-012 prescrivent déjà sélection, TDD, claims, PR/CI, checkpoint et reprise. PR1 fournit les fondations et la mémoire ; ADR-011 préserve PR2 en annexe ; ADR-013 identifie SadiaAF. Issue #9 (06/11) est le chantier canonique, issue #3/PR4 ses prérequis, PR37/ADR015–018 l'intégration gouvernée, PR38/39 les pilotes de fusion, PR40 le correctif post-fusion, PR42 la mise en œuvre ultérieure de la coordination et du candidat codeur. [Filiation et inventaire historique](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/9#issuecomment-7123410131). Les descriptions datées ci-dessous sont conservées comme histoire ; docs/06 et docs/09 et GitHub LIVE donnent le statut actuel.

**Mandat opérationnel (neuf dimensions, référencé sans prétendre à une transcription intégrale des conversations)** : mission réelle ; autorité unique et anti-doublon ; situation historique à réconcilier ; boucle objectif/mémoire/NEXT_ACTION/claim/analyse/plan/code/tests/corrections/PR/CI-Docker/fusion admissible/checkpoint/reprise ; distinction modèle et exécuteur ; six priorités (réconciliation, recette codeur, coordination, raccordement GitHub, deux cycles E2E, 14 lots) ; gouvernance ; critères de recette ; action technique immédiate sous capacités attestées. Le codeur doit écrire réellement, analyser plusieurs fichiers, conserver les tests, corriger avec budget borné, choisir la tâche suivante sans nouveau prompt, survivre à interruption et éviter collisions. Vérifier coût, licence, ressources et cadence réelle. Pas de Codex/Copilot, coût nouveau, bypass, secret exposé, S1 prématuré ou nouveau registre.

**Distinctions de preuve** : #4 CI ; #38/#39 auto-fusion ; #23 runtime métier ; #42 coordination et inférence Qwen. Aucune des trois premières ne prouve génération de code autonome. Qwen est un candidat de recette, non un moteur imposé ; si un ancien exécuteur attesté existe, le réutiliser. Inventorier branches, commits, issues et workflows historiques avant tout remplacement. Le pilote #4 (45336212789, job138250421324) a échoué malgré trois propositions distinctes ; CI769/Docker632 verts au parent 41ddeaf7a2f570d6f9b5af93573113acbd93609f ne certifient pas le codeur. Aucune réussite 24/7. Préserver la coordination existante et finaliser son stockage/identité/passerelle/sélection/événements et reprise. La cadence horaire est un filet de continuité, non une preuve indépendante. Les 14 lots, six chantiers, ADR-007/FR025 et gates restent intacts. État courant, preuves et NEXT_ACTION : docs/06/09, non ce snapshot.

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

### 13.13.1 — Événement GitHub fiable, compatibilité 2026-12-02 (ADR-017)

Le workflow de la PR #37 a été migré depuis pull_request_target (dont le blocage par défaut sur les dépôts publics est annoncé pour le 2 décembre 2026) vers workflow_run sur la fin de la CI et du smoke Docker déjà existants. Aucun second scheduler ni file de tâches. Seul le code du checkout fiable main, sur le workflow présent dans main, peut utiliser le jeton pull-requests:write ; aucun checkout/artefact du code PR.

Vérification signal : événement completed/success provenant de CI ou Docker du dépôt SadiaAF, event pull_request, dépôt head identique, exactement une PR cible main et un SHA de head identique au SHA du run et à la PR active. Toute absence ou divergence => SKIP. Le filtrage des chemins sensibles et du label automerge-eligible reste obligatoire.

En cas de changement de label après la conclusion des jobs, le seul signal immédiat explicite est un commentaire de PR par une identité OWNER/MEMBER/COLLABORATOR avec commande exacte /sadiaaf-automerge SHA ou /sadiaaf-revoke-automerge SHA. Ce signal est strictement SHA-bound et ne peut pas élargir les autorisations de fusion. Le retrait du label SEUL ne déclenche plus immédiatement la révocation : l'agent propriétaire doit poster la commande de révocation avant de retirer le label, ou utiliser Disable auto-merge dans GitHub. Ne pas prétendre l'ancienne révocation via unlabeled encore active.

Au moment de la rédaction : seul le CODE et ses tests sont candidats sur la PR #37, encore non fusionnée. L'intégration dans main, la validation effective du token et une fusion auto-merge de PR pilote sous les deux checks stricts restent à prouver et à conserver dans docs/09.

### 13.13.2 — Poussées après enrôlement, validation requise et résolution des fils (ADR-018)

Le job obligatoire validate comporte désormais une vérification lecture seule de l'inventaire COMPLET des fichiers du HEAD de PR via API GitHub. Elle refuse un SHA si les chemins sont sensibles et si la PR porte encore automerge-eligible ou si auto_merge est déjà activé, même en cas de retrait du label. L'absence d'inventaire ou divergence HEAD bloque validate. Pour une PR sensible non enrôlée, la fusion expressément autorisée reste possible après tous les autres checks. Cela prévient le cas de poussée accidentelle sensible pendant une attente auto-merge.

Le workflow d'enrôlement lit exclusivement le code main via workflow_run ; GitHub GraphQL exige, pour cet acte, contents:write et pull-requests:write sur le GITHUB_TOKEN du seul workflow de confiance. Aucun jeton n'est passé au code issu d'une PR. L'ancien fallback de protection classique était mal normalisé et a été supprimé : ruleset exact/actif/main requis, sans bypass connu.

Une modification malveillante du CI par un acteur déjà autorisé à écrire reste une hypothèse de menace externe : on ne certifie pas un verrou absolu sans contrôle supplémentaire indépendant du code PR et ACL de gouvernance. Les opérations de règles de sécurité et S1 restent gouvernées, aucune revue humaine universelle pour PR ordinaires n'est réintroduite.

Les trois fils de revue PR #37 (permissions de mutation, fallback classique, garde de chemin sensible après push) doivent recevoir des réponses techniques et être résolus seulement après vérification des tests et corrections. Une CI verte ne remplace pas la résolution des fils obligatoire dans le ruleset.

## 14. Coordination opérationnelle — socle de réservation, fencing et traces (24/11/2026)

Référence `SADIAAF-CONTINUITY-20261124-01`, issue #9, lot 11. Extension additive du contrat §5 ; aucune deuxième file métier ni ordonnanceur. Le module `src/coordination/agentClaims.ts` définit les transitions claim, heartbeat, checkpoint, release et recover, et le contrat ClaimStore. Le stockage Git Data API utilise une seule ref opérationnelle `refs/heads/coordination/sadiaaf-agent-state` (pas main) et un état `agent-claims.json` ; chaque événement est conservé par un commit successeur à parent unique. Un update non-force refuse un concurrent frère ; un échec ou résultat ambigu impose relecture, pas de retry aveugle. La ref ne doit être initialisée qu'une fois, après validation et protection effective contre force-push/suppression. Elle ne remplace ni issues, ni worklog, ni décisions.

Tout agent ou humain doit annoncer l'admission sur issue existante, lire main/PR/checkpoints, déclarer travail, session opaque, lot, branche, SHA, périmètres fichier/composant/contrat et prochain pas ; obtenir un claim avant toute écriture gouvernée, renouveler le bail, conserver preuve et NEXT_ACTION à chaque étape significative, libérer après transfert. Un bail expiré reste bloquant jusqu'à récupération explicitement réconciliée, avec nouveau fencing. Les anciens propriétaires sont refusés par le contrôle de génération. Le périmètre déclaré doit couvrir les effets sémantiques et dépendances, pas seulement les chemins modifiés. Les preuves sont des références GitHub et non des secrets ni verbatim de conversations (dépôt public).

**Limites et conditions d'activation :** le module et ses tests ne constituent pas encore un service ou une passerelle obligatoire. L'identité doit être vérifiée par l'appelant authentifié et l'horloge fournie par l'exécuteur de confiance ; le contrôle de fencing doit être appliqué par une passerelle qui maîtrise chaque mutation, avec exclusion adaptée à la mutation. Les écritures GitHub directes peuvent autrement contourner le protocole. Le bootstrap de ref, ses protections, le client d'exécution, les contrôles CI/admission et les tests E2E de concurrence réelle et récupération restent à réaliser. Aucun claim sur les données backfill n'est modifié. **PARTIAL**, pas de certification 24/7.

### 14.1 — Passage borné du moteur existant et port de raccordement (24/11/2026)

`runClaimedWorkPass` complète le module de coordination sans créer de deuxième ordonnanceur. Le client de confiance fournit ClaimStore protégé, identité authentifiée, horloge, sélection canonique réconciliée et callback de l'exécuteur réel. Après chaque unité terminée ou bloquée avec trace, le passage sélectionne immédiatement la suivante, sous limite 1–10 et sans répétition locale. Un résultat incertain, une expiration ou une erreur laisse la réservation en place pour recovery explicite ; aucune libération automatique aveugle. Une référence de preuve est exigée pour checkpoint/release mais n'est pas à elle seule certification métier. Le contrôle avant dispatch n'est pas une autorisation atomique de mutation externe : le vrai client doit imposer fencing sur chaque écriture. Les ports sont testés avec des doubles ; ils ne lancent pas seuls un modèle. L'automatisation horaire existante, vérifiée active et enrichie du mandat de travail successif, reste le filet de reprise. La découverte événementielle a échoué (404) à ce contrôle ; aucun réveil GitHub→ChatGPT attesté. Ne pas créer la ref opérationnelle sans protection vérifiée ; ne pas annoncer un runtime 24/7, deux cycles réels ou une protection universelle tant que le raccordement, la concurrence réelle et la reprise ne sont pas recettés.

### 14 — Admission événementielle du programme global directeur (extension)
Le passage borné runClaimedWorkPass est raccordé à runDirectorWake sur le même ClaimStore : signal typé (CI, fusion PR, dépendance, récupération, admission, filet horaire), vérification par transport de confiance, clé sémantique de déduplication, intention durable CAS avant sélection/dispatch, résultat durable après le passage. Un signal déjà traité ne relance pas un agent ; un signal inachevé impose réconciliation, pas rejeu aveugle. Les reçus sont conservés avec les événements du même état transactionnel (pas de second registre). Un plafond de 4096 reçus ferme l'admission sans purge implicite : index/historique vérifiable à prévoir avant service permanent. Le port verifySignal n'est PAS un transport GitHub authentifié opérationnel ; le branchement et la dérivation canonique de clé à partir des événements GitHub réels sont à réaliser, de même que l'exécuteur et la récupération prouvée. Ne pas déclarer tous les mouvements ni le réveil réel couverts. Le filet horaire ne doit pas remplacer le passage enchaîné. Aucun contenu privé ou secret dans l'état public. Tests d'admission, rejeu, interruption et concurrence ajoutés ; validation CI exacte à obtenir.

### 14 — Adaptateur de signaux GitHub et préflight de protection (extension)
Le module src/coordination/githubDirector.ts dérive les clés des événements CI terminés (run+attempt) et PR fusionnées (numéro+SHA) à partir de lectures GitHub authentifiées et strictement liées à ce dépôt, aux deux workflows canoniques et à main. Refus du SHA obsolète, association ambiguë, fork, exécution non terminée et fusion non ancêtre de main. Le transport doit authentifier la livraison avant le premier appel ; la vérification live est répétée avant admission dans runDirectorWake. Pas de workflow privilégié activé, pas d'exécuteur réel attesté. assertCoordinationRuleset contrôle un ruleset dédié actif sans bypass, ciblant exactement la ref opérationnelle et prohibant force-push/suppression ; ne l'installe pas et ne prouve ni restriction d'identités d'écriture ni protection effective complète. Au contrôle, seul le ruleset main 27937019 est présent et la ref opérationnelle 404 ; donc bootstrap refusé. Le connecteur d'automatisation ne retourne pas d'événements (action 404). Les cinq tests sont ajoutés mais pas encore exécutés sur le nouveau SHA. Réutiliser le programme directeur existant, ne pas créer de service payant ni d'orchestrateur parallèle.

### 14 — Priorité P0 : exécuteur indépendant et transport HTTP (extension)
L'exécuteur permanent indépendant des sessions ChatGPT est prioritaire, au service des 14 lots existants. githubTransport.ts fournit le transport HTTP natif borné au dépôt ; écritures désactivées par défaut et contrôlées par ruleset dédié. Ce n'est pas un modèle de programmation ni une activation de runtime. Le jeton d'une identité autorisée doit être fourni à l'exécution hors Git, sans nouvelle dépense ni S1. Le transport ne crée pas de ref, ne fusionne pas, ne pousse pas main. Recette réelle requise : identité, protection, bootstrap, passerelle de mutation, sélection canonique, deux développements successifs sans ChatGPT ni tick, interruption et concurrence. Aucun DONE anticipé.

### 14 — Qualification réelle du moteur de code indépendant (extension)

## 2026-11-24 — Lot 11 / P0 : qualification d'un véritable modèle de programmation indépendant
- **CONTINUITY_ID** : SADIAAF-CONTINUITY-20261124-01 ; issue #9 admission 7122877433. Parent 45e3bb06556736122de04f252ab59e12ce7833a5 CI764/Docker627 SUCCESS. GitHub Models retiré au 30/07/2026. Dépôt public : runner GitHub standard Ubuntu 24.04, pas de runner payant, clé de modèle ni API facturée.
- **TRAVAIL** : workflow pilote borné à PR42, permissions lecture seule, aucun cron/scheduler ni écriture, script lance llama.cpp CPU b12658 et Qwen2.5-Coder-7B-Instruct-GGUF (Apache-2.0) avec SHA256 publiés vérifiés avant exécution. Tâche réelle : RED date ISO invalide dans dates.ts, modèle propose une fonction, GREEN vérifié dans Docker sans réseau ni secret, deux tentatives max ; sortie candidate uniquement dans logs, aucune publication du code généré ni mutation main. Aucun S1.
- **BLOCK_REASON** : recette réelle du modèle non attestée avant exécution, puis transport d'écriture/claim protégé, sélection canonique, capacité de programmer tous les lots et reprise événementielle permanente restent à certifier. Pilote borné != exécuteur 24/7.
- **NEXT_ACTION** : vérifier runs CI/Docker/pilote exact SHA, examiner preuve modèle/RED/GREEN, corriger le pilote si nécessaire ; raccorder modèle qualifié au programme directeur, authentification et passerelle sécurisée, démontrer deux tâches réelles autonomes, reprise/concurrence ; poursuivre les 14 lots sans reconstruire. Pas de nouveau coût ni secret.

### MISSION 13 — Mandat d'ingénierie opérationnel et correction du pilote

## 2026-11-24 — MISSION 13 / Lot 11 : réparation de la boucle RED/GREEN du pilote indépendant
- **CONTINUITY_ID** : SADIAAF-CONTINUITY-20261124-01 ; admission 7123198402. MISSION 13 = rapport fondateur 13 sections et mandat d'ingénierie opérationnel 9 sections réaffirmés, au service de la réalisation des 14 lots, sans deuxième programme. Parent f7a3e1aa6acbc97b1157c442bd947a5c2ba4b3d4 CI765/Docker628 SUCCESS, pilote #1 run45332894389 job138238005899 FAILURE. Logs : RED_CONFIRMED, empreintes moteur/modèle vérifiées, deux propositions rejetées ; assertion exacte non journalisée, cause précise des erreurs non connue.
- **CORRECTION** : conserver tous les tests antérieurs, ajouter 3 cas (siècles et année 0001) ; même suite de 18 cas avant/après, RED réellement en échec sur 4 cas attendus, résultat complet avec identifiants bornés, rejet des rapports incomplets/dupliqués et incohérences de sortie. Retour au modèle des identifiants échoués et de sa proposition précédente, trois tentatives max, température 0 et sortie bornée. 5 tests offline de diagnostic exécutés dans le workflow pilote avant téléchargement. Aucun code de dates.ts corrigé à la place du modèle ; aucun assouplissement de test, pas de publication du candidat, environnement isolé maintenu. Nouvelle recette non encore attestée avant CI.
- **BLOCK_REASON** : qualité du code généré, robustesse du pilote (code non fiable et sandbox), stockage distant protégé, passerelle mutations, sélection réelle des tâches et certification continue restent ouverts. Ce pilote n'est pas une autorisation d'écriture ni une preuve 24/7.
- **NEXT_ACTION** : vérifier exact nouveau SHA CI/Docker et pilote #2 (diagnostics RED, inférence, GREEN), diagnostiquer résultats et poursuivre raccordement au directeur, 2 travaux réels successifs indépendants, puis achèvement 14 lots et exploitation gouvernée. Continuer PR25/29/22/31 selon gates. Aucun S1, nouveau coût, secret, bypass, second scheduler.

### MISSION 13 — Bootstrap administratif protégé (extension)

## 2026-11-24 — MISSION 13 / P0 : bootstrap administratif de la coordination existante
- **CONTINUITY_ID** : SADIAAF-CONTINUITY-20261124-01 ; admission issue #9 7123299443. Parent 9ba57bf6c2e39cc67ebea49c45e7d81ab1e86cbb CI767/Docker630 SUCCESS ; diagnostic offline SUCCESS ; pilote #2 45335268509 en cours au contrôle. Main ef861ea26b26b82ec7cac987d9404a3707b2439f. Ruleset 27937019 main seul ; ref coordination 404. Les outils connectés ne proposent pas de mutation administrative des règles.
- **TRAVAIL** : bootstrap.ts et CLI administrateur utilisant l'identité gh existante, mode --check lecture seule par défaut, --apply explicite ; vérification ID dépôt, main protégée, règle exacte sans bypass, création de la règle avant référence, état initial via emptyState, pas de force ni modification de main, refus état préexistant non protégé, vérification finale, idempotence. 4 tests de protocole ajoutés. Ne pas exécuter de code PR non approuvé avec identité admin. Pas de création effective de règle/ref pendant cette session ; isolation des writers non attestée. Pas de changement du pilote en cours.
- **BLOCK_REASON** : accès administratif réel, identité GitHub App/jeton autorisé distinct du GITHUB_TOKEN ordinaire (PR de ce dernier exigent approbation de workflows selon docs GitHub actuelles), exclusivité des écrivains, résultat du modèle, passerelle de mutation et événement réel restent nécessaires. Runners standard publics gratuits, jobs limités à 6h, aucune garantie permanente 24/7 ; cadence à mesurer. Aucun secret, S1, coût ou nouveau scheduler.
- **NEXT_ACTION** : vérifier pilote #2 exact SHA ; contrôler nouveau commit et tests ; exécuter bootstrap uniquement dans environnement admin autorisé et code approuvé, relecture ruleset/ref, qualifier identité autonome et permissions sans exposer jetons ; raccorder modèle au directeur et recette réelle 2 tâches + récupération/contestation, puis finir 14 lots.

### MISSION 13 — Stratégie adaptative du pilote

## 2026-11-24 — MISSION 13 / P0 : stratégie adaptative du codeur
- **CONTINUITY_ID** : SADIAAF-CONTINUITY-20261124-01 ; admission 7123323199. Parent 382948eb3439ef0d88ca3d054d7d19f9f5b38600. Pilote #2 run45335268509 FAILURE : RED et empreintes attestés, trois candidats rejetés sur timezone, invalid-feb30, invalid-leap, invalid-apr31, century-nonleap ; candidats 2/3 identiques. Pilote #3 run45336025165 utilise encore dispositif inchangé (filtre diff PR).
- **TRAVAIL** : 18 tests et isolation conservés, contre-exemples précis, feedback allowlist, échantillonnage borné après échec, détection répétitions et retour source originale, SHA256/base64 des propositions rejetées de code public ; 2 tests offline supplémentaires. dates.ts inchangé, aucune correction écrite à la place du modèle.
- **BLOCK_REASON** : recette nouveau SHA non attestée ; si échec persistant, qualifier autre modèle dans limites runner. Activation admin, identité autonome, passerelle mutation, sélection et récupération toujours ouvertes. Aucun S1, coût, secret ou bypass.
- **NEXT_ACTION** : vérifier CI/Docker/pilote exact SHA, diagnostics et résultats ; activer coordination protégée sous identité admin et code approuvé ; raccorder modèle, mutations, événements et recette 2 tâches réelles, puis 14 lots. Aucun DONE 24/7 anticipé.

### MISSION 13 — Qualification par édition bornée

## 2026-11-24 — MISSION 13 / P0 : édition bornée et qualification du codeur
- **CONTINUITY_ID** : SADIAAF-CONTINUITY-20261124-01 ; admission 7123620149. Parent 17bd3d405a0b2afa942e483c5b73678a9bc5e84e. Antécédents relus : bc937259c9df4932aeff104ff9b87c2896d2fee0 (contrat agnostique modèle) ; 35236c417a802354deb09a4306a548b63d7769ae (checkpoint 06/11 : aucun runtime hébergé SadiaAF attesté, MCP/UAES distincts) ; recherche commits agent/autonomous/runner/pilot, sans prétention d'exhaustivité. Pilote #4 45336212789 job138250421324 : les trois candidats décodés comparent une date déjà normalisée à minuit, au lieu de l'entrée originale, et modifient inutilement la conversion UTC ; 2e réintroduit problème année 0001. Modèle candidat non qualifié.
- **TRAVAIL** : stratégie d'édition minimale par ancre unique du return original ; seul le modèle produit les instructions de garde à insérer, tous les autres octets du corps historique conservés, refus format/périmètre hors garde, 18 tests inchangés, 2 tests offline supplémentaires de composition/rejet ; aucune correction métier écrite à sa place. Filtre de synchronisation compare before/head exacts pour éviter nouvelle inférence lors d'un commit documentaire ; tests offline conservés, SKIP explicite ne vaut pas GREEN. Code candidat non fiable toujours isolé, contrôle lexical non frontière de sécurité, aucune publication de candidat. Aucun nouveau coût, secret, scheduler, S1 ou bypass.
- **NEXT_ACTION** : vérifier exact HEAD CI/Docker et recette réelle, preuves RED/GREEN sans assouplir tests. Si encore bloqué, comparer alternative compatible ressources et licence ; finaliser identité, stockage protégé, sélection réelle, passerelle, événements et 2 développements réels + interruption/concurrence. Priorité absolue usine complète, pas pilote seul. Les 14 lots et 6 chantiers restent le but. Aucun DONE 24/7 anticipé.

### MISSION 13 — Sélection GitHub admissible

## 2026-11-24 — MISSION 13 / P0 : sélecteur GitHub des travaux admissibles
- **CONTINUITY_ID** : SADIAAF-CONTINUITY-20261124-01 ; admission 7123645651 ; parent 079d0c8e8195d51e4f44c4a977f3546cf14b999c. Le port selectNext existant reçoit un adaptateur githubSelector.ts : vérifie main protégée et SHA, admission structurée liée à issue/lot/branche/critères, état issue, PR et dépendances fusionnées ancêtres de main, ref nouvelle absente, priorités déterministes, exclusion des travaux déjà tentés et claims en réutilisant transition, relecture main. Extension GET bornée du transport existant ; aucune écriture du sélecteur, CAS réel reste dans runClaimedWorkPass. 5 tests ciblés. Aucun registre ni file supplémentaire, aucun changement du pilote #6.
- **LIMITES** : le chargeur d'admissions canoniques authentifiées reste à raccorder ; les commentaires libres, données modèle et fixtures ne sont pas des autorisations. La sélection n'est pas un verrou et ne certifie pas l'absence universelle de collision ; passerelle de mutation, contrôle des permissions écrivains et claims distants indispensables. Nouveau SHA et recettes non attestés avant CI. Aucune S1, dépense, secret ou bypass.
- **NEXT_ACTION** : vérifier CI/Docker exact SHA et pilote #6, raccorder chargeur d'admissions existantes au contrat canonique, identity/coordination/gateway, événements et deux développements réels sans prompt + reprise/concurrence. Priorité usine complète ; 14 lots après autonomie selon gates. Pas de faux DONE.


## 2026-11-24 — MISSION 13 / P0 : intention durable de mutation et fencing
- CONTINUITY_ID SADIAAF-CONTINUITY-20261124-01 ; admission issue #9 [7123680193](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/9#issuecomment-7123680193), parent cc09ae69cba46c1bd8b361332c20381e74dcb712. Complément de la sélection LIVE et du pilote, même PR42.
- Extension additive du ClaimStore : intention de publication CAS sur le claim existant, scope et HEAD exact, blocage release/recover/checkpoint tant que résultat incertain, settlement explicite après observation du HEAD et preuve de quiescence pour reprise. Port mutationGateway limité à un commit préparé, identité et preuve indépendantes, publication non-force, aucun retry implicite. Six tests de protocole ajoutés. Aucun accès GitHub privilégié activé, aucun second registre.
- PARTIAL : CI exacte, transport réel, isolation écrivains, protection ref, preuve de quiescence fiable et garde de mutations autres que publication de commit restent à raccorder. Les ports de confiance ne sont pas une certification runtime. Aucun S1, coût nouveau, bypass, secret ni DONE.
- NEXT_ACTION : vérifier CI/Docker et pilote 6/7, raccorder le chargeur, l'identité, les ports de publication/recovery et le modèle au directeur existant ; attester deux développements réels successifs, reprise et contention.

### MISSION 13 — Chargeur des admissions canoniques

## 2026-11-24 — MISSION 13 / collaboration : chargeur des admissions canoniques
- **CONTINUITY_ID** SADIAAF-CONTINUITY-20261124-01 ; session M13-ADMISSIONS-20261124-01 admission 7123699598, complémentaire de M13-GATEWAY-20261124-01 admission 7123680193. Parent 0bed3da0c927a347ec44d3f4b58dda93b1fcce97. Périmètre distinct : aucun changement agentClaims.ts, mutationGateway.ts, tests gateway ou pilote. Chargeur githubAdmissions.ts lit uniquement les commentaires de l'issue9 existante, marqueur SADIAAF_WORK_AUTHORIZATION_V1 suivi d'un JSON strict admit/revoke, identité propriétaire GitHub id270385782 + OWNER, SHA exact, deux lectures paginées bornées, refus des commentaires modifiés, doublons, incohérences et réactivation d'anciennes admissions. Schéma partagé avec sélecteur existant, transport GET borné, 5 tests de protocole dont raccordement au sélecteur. Aucun commentaire d'autorisation active publié ; aucun registre/file nouveau, aucune écriture runtime.
- **LIMITES** : identité GitHub ne prouve pas auteur humain si credential partagé ; suppression d'une révocation non détectable sans journal durable, accès écrivain exclusif et réconciliation requis avant activation. Pas d'autorisation automatique à partir de texte libre ou de sorties IA ; source d'admissions approuvée, stratégie de renouvellement après fusion, gateway et runtime à qualifier. Tests nouveaux non attestés avant CI. Référence coordination 404 au contrôle, admissions documentaires non atomiques.
- **NEXT_ACTION** : réconcilier contributions des deux agents, CI exact SHA, pilote réel, compléter runtime et preuves durables des admissions/revocations, raccordement au codeur, identité/ref protégée et 2 tâches réelles avec reprise/concurrence. Pas de S1, coût, secret, bypass ou certification anticipée. Priorité usine autonome complète.


## 2026-11-24 — MISSION 13 / P0 : transport REST de publication préparée
- CONTINUITY_ID SADIAAF-CONTINUITY-20261124-01 ; admission issue #9 [7123717165](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/9#issuecomment-7123717165), parent 42739cd3eb5e2a1d4b99b5a61ec5482c6c373c4d. Raccordement additif de mutationGateway au transport REST dédié, sans modifier githubTransport/selector/chargeur.
- githubPublication.ts borne les endpoints au dépôt canonique, vérifie ID, parent unique, chemins exhaustifs y compris renames (refus pagination/troncature), preuves indépendantes et isolation écrivains via ports fiables. Publication de commit préparé sur ref de travail existante, non-force, HEAD exact, aucune relance après ambiguïté, aucune mutation main/coordination/administration. Le gateway refuse le dispatch si bail expiré avant envoi. 6 tests ajoutés. Pas de token ni configuration réelle.
- PARTIAL : validation CI exacte, identity/runtime, preuves effectives d'isolation et quiescence, préparation de commits/PR sous passerelle, intégration modèle et événements restent nécessaires ; pas de certification 24/7. Aucun S1, coût, bypass, secret ou registre concurrent.
- NEXT_ACTION : raccorder avec chargeur authentifié, certifier identité et règles, protéger la ref, étendre la passerelle aux autres mutations admissibles, deux développements réels successifs, reprise et concurrence.

### MISSION 13 — Adaptateur codeur borné

## 2026-11-24 — MISSION 13 / collaboration : adaptateur codeur du directeur
- **CONTINUITY_ID** SADIAAF-CONTINUITY-20261124-01 ; session M13-CODER-20261124-01 admission 7123731676 ; parent a11cbda2d942b237e583b29199deeea21b5416e3. Première publication stoppée avant écriture sur changement HEAD concurrent ; reprise sur contributions publication b661de1 et correctif a11cbda. Périmètre distinct : modelCoder.ts et 5 tests, docs06/09/15. Adaptateur HTTP local sans credential, contexte/réponse bornés, admission/claim exacts, sources immuables via port fiable, JSON édition ancre unique/scopes exacts TS ordinaires, pas de tests/sensible modifiés, RED/GREEN même suite et empreinte exacte du sujet, heartbeat/relecture autorisation, tentatives bornées et détection répétitions. Candidat seulement, aucun code exécuté sur host ni publié par le modèle.
- **LIMITES** : ports readAdmission/readSource/validate et commit builder doivent être liés au runtime fiable et sandbox réelle ; aucune fixture ne vaut preuve opérationnelle. Scope v1 corrections de fichiers ordinaires existants, pas encore agent général complet. Identité/ref/activation/reprise et preuve deux cycles restent à réaliser. Tests non attestés avant CI ; aucun S1, secret, coût ou bypass.
- **NEXT_ACTION** : réconcilier CI/Docker et pilotes au SHA exact, relier les ports modèle/validation et gateway au directeur existant, certifier identité/coordination et cycles réels + interruption/concurrence. Pas de nouveau registre ni orchestrateur, pas de faux DONE.
