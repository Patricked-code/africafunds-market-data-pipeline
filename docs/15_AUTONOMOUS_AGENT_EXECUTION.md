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

**Déclenchement :** PR interne ciblant `main`, ouverte, non Draft, au dernier SHA reçu, labellisée `automerge-eligible` par l'agent propriétaire après revue des changements et tests applicables. Une PR sans ce signal reste non éligible. Le workflow se déclenche par événement GitHub ; l'automatisation horaire existante reste responsable du `NEXT_ACTION` et du travail de code, sans duplication.

**Gates fail-closed :** `main.protected=true`, option `allow_auto_merge=true`, règle de protection classique effective avec au moins une approbation obligatoire, `validate` comme contrôle statutaire requis, approbations anciennes invalidées, résolution des conversations de revue obligatoire et protections appliquées aux administrateurs. Si ces données ne sont pas vérifiables par le token GitHub Actions ou si un seul gate manque, le workflow n'enrôle pas la PR. GitHub vérifie ensuite les reviews et checks avant sa fusion native.

**Statut live observé au 2026-11-23 :** `main.protected=false`, aucun ruleset retourné, `allow_auto_merge=false`, PR #36 Draft et `reviews=[]`. Le mécanisme est donc **PREPARED / NOT ACTIVE** ; il ne peut en aucun cas être déclaré autonome en production. En outre, une revue humaine ou par un **acteur indépendant réellement habilité** reste obligatoire ; aucun tel reviewer automatique n'est actuellement attesté.

**Configuration administrative UNIQUE nécessaire :** créer sur `main` une protection GitHub réelle exigeant PR, `validate` au SHA courant, au moins une revue indépendante, dismissal des approvals obsolètes, résolution des conversations, absence de bypass administrateur, force-push/suppression interdits ; puis autoriser `Allow auto-merge` dans les paramètres du dépôt. Vérifier que le token natif peut lire la règle via GraphQL et enrôler la PR ; sinon conserver le gate fermé, sans ajouter de token personnel ou de service payant.

**Limites :** `staging-runtime-smoke.yml` n'exécute pas son job sur les PR purement documentaires à cause de ses filtres `paths`. Il ne doit pas être déclaré requis globalement tant que cette condition n'est pas rendue compatible. Pour les modifications runtime, son run exact-SHA doit néanmoins être évalué dans les gates métier avant l'ajout du label. Aucun S1, secrets, intégration de données officielles ni déploiement automatique implicite.

**Recette avant DONE :** tests unitaires du fail-closed sur CI au SHA exact ; protection main attestée ; auto-merge effectivement configuré ; PR pilote non Draft et éligible, revue indépendante après le dernier push, status `validate=SUCCESS` et, si pertinent, Docker SUCCESS ; inscription auto-merge attestée, fusion native, aucun bypass ; second chantier continué à partir du checkpoint, sans collision. En cas de défaut : `BLOCK_REASON` et `NEXT_ACTION` dans les autorités GitHub existantes.
