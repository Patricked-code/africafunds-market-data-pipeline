# 08 — Journal des décisions

Utiliser ce fichier pour les décisions durables. Ne pas supprimer les anciennes décisions ; les remplacer par une nouvelle entrée qui les rend obsolètes.

## ADR-001 — Le dépôt est la mémoire persistante

- Date : 2026-07-31
- Statut : ACCEPTED
- Décision : conserver dans Git la vision, l’architecture, les méthodologies, le statut, la roadmap, les règles IA et le worklog.
- Motif : permettre à toute IA ou équipe de reprendre sans dépendre de l’historique d’une conversation.

## ADR-002 — Pas de production avant cadrage et recette

- Date : 2026-07-31
- Statut : ACCEPTED
- Décision : ne pas déployer sur S1 avant satisfaction des gates de sécurité, données, tests, staging, sauvegarde et rollback.

## ADR-003 — Architecture progressive

- Date : 2026-07-31
- Statut : ACCEPTED
- Décision : modular monolith structuré au départ ; extraction en microservices uniquement lorsque l’isolation ou la charge le justifie.
- Motif : limiter la complexité opérationnelle tout en gardant des frontières nettes.

## ADR-004 — Modèle canonique indépendant des consommateurs

- Date : 2026-07-31
- Statut : ACCEPTED
- Décision : AfricaFunds possède un modèle canonique stable. Les sites et bases partenaires sont reliés par des contrats et mappings versionnés.

## ADR-005 — Local comme source économique

- Date : 2026-07-31
- Statut : ACCEPTED
- Décision : les séries locales sont sources ; EUR et USD sont des contextes convertis conservant le FX, la date, la source et la qualité.

## ADR-006 — Séparation officiel / propriétaire

- Date : 2026-07-31
- Statut : ACCEPTED
- Décision : un indice officiel importé et un indice AfricaFunds calculé sont des objets distincts avec fournisseurs, méthodes et statuts différents.

## ADR-007 — Méthodologies versionnées

- Date : 2026-07-31
- Statut : ACCEPTED
- Décision : bornes CT/MT/LT, pondérations, courbes, règles de qualité et benchmarks sont historisés avec périodes de validité.

## ADR-008 — Calcul historique sans anticipation

- Date : 2026-07-31
- Statut : ACCEPTED
- Décision : un calcul au jour D utilise uniquement les informations disponibles au jour D ; première publication et révisions sont conservées.

## ADR-009 — PostHog n’est pas l’observabilité technique complète

- Date : 2026-07-31
- Statut : ACCEPTED
- Décision : PostHog mesure l’usage produit, les parcours et les feature flags. Logs, métriques et traces techniques utilisent une chaîne d’observabilité dédiée.

## ADR-010 — Objectif de finalisation et continuité des agents codeurs

- Date : 2026-11-06
- Statut : ACCEPTED (mandat et contrat cible, **pas** attestation d'implémentation runtime)
- Contexte : le projet doit aller au-delà du cadrage et des PR documentaires pour parvenir à une plateforme fonctionnelle, testée et déployée sous gates, avec reprise sans perte de fil conducteur entre Claude et ChatGPT.
- Décision : conserver les 14 lots et les documents canoniques ; adopter `docs/15_AUTONOMOUS_AGENT_EXECUTION.md` comme contrat inter-agent de sélection, exécution TDD, PR, preuves, checkpoint, reprise et enchaînement des travaux admissibles sans nouvelle instruction par tâche.
- Conséquences : réaliser et tester un véritable orchestrateur/runner et des claims multi-agents avant de qualifier le fonctionnement de permanent. Les gates de revue, de sécurité et de production de l'ADR-002 restent obligatoires ; aucune exécution 24 h/24 n'est déclarée active à cette date.
- Remplace / remplacée par : aucune.

## ADR-011 — Convergence des mémoires des PR #1 et #2

- Date : 2026-11-06
- Statut : ACCEPTED (organisation documentaire de la branche PR #1, encore soumise à revue/fusion)
- Contexte : deux PR Draft issues du même SHA `main` exposent des mémoires partiellement redondantes, et `docs/PROJECT_MEMORY.md` se présentait comme un second point d'entrée.
- Décision : `docs/00_PROJECT_MEMORY.md` est le point d'entrée canonique ; la mémoire intégrale PR #2 est importée en annexe historique `docs/PROJECT_MEMORY.md`, conservant sa provenance sans écraser les décisions acceptées et les journaux. Aucun statut daté n'est considéré comme une preuve runtime actuelle.
- Conséquences : la PR #2 doit être revue puis clôturée comme reprise sans perte **après validation de la convergence**. Pas de merge ou suppression automatique de cette PR par la seule adoption de cette ADR.
- Remplace / remplacée par : aucune.

## ADR-012 — Préserver, compléter et achever l'architecture industrielle originelle

- Date : 2026-11-06
- Statut : ACCEPTED (principe de réalisation ; aucune capacité runtime supplémentaire attestée par cette décision)
- Contexte : le dépôt contient déjà un socle technique structuré et un enchaînement industriel initial : scheduler `src/jobs/scheduler.ts`, registry des sources, ingestion `src/jobs/ingest.ts`, collecte HTTP, archives SHA-256, parseurs, tables PostgreSQL, file backfill, qualité, fonctions de calcul et API. Le projet cible prévoit aussi normalisation, calcul complet et publication, encore partiellement inachevés.
- Décision : **partir exclusivement de cette base vérifiée**, préserver les composants fonctionnels et leurs contrats, corriger et compléter les mécanismes existants, atteindre les fonctionnalités et performances prévues dans les 14 lots, puis y intégrer seulement les meilleures améliorations justifiées et compatibles. Pas de reconstruction ou de système parallèle par défaut.
- Méthode : inventaire réel → comparaison avec l'architecture cible/matrice de recette → évolution minimale/additive → tests de non-régression et de métier → PR/CI/revue et gates → preuves/checkpoint → travail suivant. Toute refonte indispensable requiert comparaison d'options, ADR spécifique, plan de migration/rollback et autorisations adaptées.
- Distinction : usine de données (collecte, archives, normalisation, calculs, diffusion) ≠ usine de développement autonome (Claude/ChatGPT, PR, CI, continuité), cette seconde devant aider à achever la première sans substituer ses mécanismes ou son autorité.
- Conséquences : le succès n'est ni le nombre de PR, ni l'adoption d'un nouveau framework, mais l'achèvement vérifié de la chaîne industrielle prévue, avec provenance, sécurité, fiabilité et interopérabilité. La conservation de `main` n'implique pas à elle seule que tous les comportements sont déjà validés en production.
- Remplace / remplacée par : aucune ; complète ADR-003, ADR-010 et ADR-011.

## ADR-013 — SadiaAF : plateforme centrale ; AfricaFunds : application consommatrice

- Date : 2026-11-07
- Statut : ACCEPTED (clarification documentaire, aucun changement de runtime)
- Contexte : des références historiques `AfricaFunds Market Data Pipeline` dans le dépôt et ses fichiers risquent d'être interprétées à tort comme un périmètre limité à l'application AfricaFunds.
- Décision : **SadiaAF est la plateforme centrale indépendante à achever et industrialiser sur le socle du dépôt historique `Patricked-code/africafunds-market-data-pipeline`**. AfricaFunds est une application consommatrice, au même titre que les autres usages et partenaires autorisés. Les 14 lots, le registre des sources, le modèle canonique et la publication API sont prévus pour SadiaAF, et non pour une application unique.
- Non-régression : conserver les identifiants historiques techniques, les URL, les données, le schéma SQL et les contrats ; aucune stratégie de renommage massive ou recréation de dépôt.
- Conséquences : utiliser le nom SadiaAF dans les nouvelles décisions de périmètre ; conserver les noms historiques lorsqu'ils désignent précisément des artefacts existants. Les règles de licences et permissions de sources se qualifient pour les usages de SadiaAF et de ses consommateurs, pas seulement pour AfricaFunds.
- Remplace / remplacée par : complète ADR-004 et ADR-012, sans effacer leurs références historiques.

## ADR-014 — Dépôt privé, branche principale sans protection et intégration vérifiée

- Date : 2026-11-07
- Statut : ACCEPTED (décision explicite du propriétaire, configuration GitHub relue)
- Contexte : le dépôt avait été identifié public pendant la réconciliation #3, puis le propriétaire a demandé et réalisé le retour au statut privé et la suppression volontaire de la protection de branche. Il a ensuite demandé de fusionner les travaux testés sur `main` pour ne pas bloquer l'achèvement du programme SadiaAF et préserver tout le code.
- Décision : garder `Patricked-code/africafunds-market-data-pipeline` **privé** ; conserver `main` **sans protection GitHub**, conformément au choix propriétaire. Ne pas réactiver de protection ni rendre le dépôt public sans une nouvelle décision explicite. Autoriser l'intégration graduelle par PR des travaux réellement admissibles, avec commit HEAD exact, contrôles CI et comparaison des différences, sans utiliser le retrait de protection comme exemption des vérifications.
- Garanties compensatoires : (1) branche Git de sauvegarde de `main` avant la série d'intégrations et conservation des branches PR ; (2) aucun push direct sur `main` ; (3) CI et tests sur SHA exact, comparaison des changements, contrôle des conflits/dépendances et des migrations ; (4) fusion `merge` avec garde sur HEAD attendu et contrôle de la CI sur `main` après chaque fusion ; (5) journal, statuts, preuves et rollback ciblé.
- Limites : une convention d'agent et la CI ne remplacent pas une protection obligatoire imposée par GitHub. Les migrations touchant une base existante exigent audit des données, sauvegardes/restauration et dry-run **avant leur application**, même si le code de migration est fusionné. Un merge de code ne vaut pas mise en production ni certification des séries historiques.
- Conséquences : l'issue #3 passe d'un projet de protection GitHub à un registre historique de décision et de risques, sans masquer que les contrôles serveur restent non enforced. Les gates de production S1 de l'ADR-002 restent pleinement applicables ; aucun déploiement implicite.
- Remplace / remplacée par : supplanter uniquement les exigences antérieures de **réactivation obligatoire de la protection GitHub** ; ne remplace pas ADR-002 ni les tests, revues de différences et exigences métier.

## ADR-015 — Auto-fusion native GitHub soumise aux protections vérifiées

- **Date :** 2026-11-23
- **Statut :** ACCEPTED pour la conception et la préparation du code ; activation runtime **BLOCKED** jusqu'à la configuration et aux vérifications GitHub.
- **Contexte vérifié :** dépôt PUBLIC, branche main HEAD `73256f48d81d38ce8ff6f51be9e024b25cf5dadb` avec `protected=false`, `GET /rulesets=[]`, dépôt `allow_auto_merge=false`, PR #36 Draft sans revue. La prémisse historique « dépôt privé » de l'ADR-014 est désormais obsolète, mais l'historique reste conservé.
- **Décision :** réutiliser les CI GitHub et **l'auto-merge natif GitHub**, sans merger par API directe, ni GitHub App de contournement, ni orchestrateur indépendant. Un workflow de confiance depuis main peut inscrire une PR interne, non Draft, portant le label `automerge-eligible` dans l'auto-merge **uniquement après vérification** d'une protection effective de main, d'au moins une revue requise, des approbations obsolètes invalidées, des fils résolus, du check `validate` exigé et de l'application aux administrateurs.
- **Revue indépendante :** aucun compte/agent de revue indépendant n'est attesté à cette date. Le mécanisme ne doit ni s'auto-approuver, ni inventer une revue, ni réduire le nombre de revues requises ; l'absence de relecteur reste BLOCKED.
- **Portée :** autorisation de préparer les tests, le script de vérification et le workflow en PR dédiée issue #3/#9 ; **pas d'autorisation implicite de merger cette PR ni les PR fonctionnelles**, de modifier les paramètres admin à l'aveugle ou de déployer S1.
- **Préconditions de fonctionnement :** configurer une fois les protections réelles et `Allow auto-merge` via administration GitHub ; fusionner la PR seulement après ses propres gates ; disposer d'une identité distincte pour les revues et d'une vérification de compatibilité GitHub_TOKEN/GraphQL. Aucun coût additionnel autorisé.
- **Rétrocompatibilité :** ne pas modifier le scheduler métier, les 14 lots, les 44 sources, les bases ou le circuit de déploiement ; aucun secret ajouté.
- **Vérification requise :** CI du SHA exact, vérification des événements de non-éligibilité (SKIP sans fusion), revue indépendante, preuve d'enrôlement puis fusion native d'une PR pilote après gates ; contrôle `main` et absence de bypass.
- **Réversibilité :** désactiver le workflow ou le label, ou `Allow auto-merge` ; ne jamais relâcher les protections afin de provoquer une fusion.

## Modèle d’entrée

```markdown
## ADR-NNN — Titre
- Date : YYYY-MM-DD
- Statut : PROPOSED | ACCEPTED | SUPERSEDED | REJECTED
- Contexte :
- Décision :
- Conséquences :
- Remplace / remplacée par :
```
