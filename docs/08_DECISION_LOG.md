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
- **Décision :** réutiliser les CI GitHub et **l'auto-merge natif GitHub**, sans merger par API directe, ni GitHub App de contournement, ni orchestrateur indépendant. Un workflow de confiance depuis main peut inscrire une PR interne, non Draft, portant le label `automerge-eligible` dans l'auto-merge **uniquement après vérification** d'une protection effective de main, d'au moins une revue requise, des approbations obsolètes invalidées, des fils résolus, des checks `validate` et `Build, boot, migrate and verify persistent PostgreSQL` exigés, d'une branche à jour et de l'application aux administrateurs.
- **Revue indépendante :** aucun compte/agent de revue indépendant n'est attesté à cette date. Le mécanisme ne doit ni s'auto-approuver, ni inventer une revue, ni réduire le nombre de revues requises ; l'absence de relecteur reste BLOCKED.
- **Portée :** autorisation de préparer les tests, le script de vérification et le workflow en PR dédiée issue #3/#9 ; **pas d'autorisation implicite de merger cette PR ni les PR fonctionnelles**, de modifier les paramètres admin à l'aveugle ou de déployer S1.
- **Préconditions de fonctionnement :** configurer une fois les protections réelles et `Allow auto-merge` via administration GitHub ; fusionner la PR seulement après ses propres gates ; disposer d'une identité distincte pour les revues et d'une vérification de compatibilité GitHub_TOKEN/GraphQL. Aucun coût additionnel autorisé.
- **Rétrocompatibilité :** ne pas modifier le scheduler métier, les 14 lots, les 44 sources, les bases ou le circuit de déploiement ; aucun secret ajouté.
- **Vérification requise :** CI du SHA exact, vérification des événements de non-éligibilité (SKIP sans fusion), revue indépendante, preuve d'enrôlement puis fusion native d'une PR pilote après gates ; contrôle `main` et absence de bypass.
- **Réversibilité :** désactiver le workflow ou le label, ou `Allow auto-merge` ; ne jamais relâcher les protections afin de provoquer une fusion.

## ADR-016 — Auto-fusion des PR ordinaires sans revue indépendante obligatoire

- **Date :** 2026-11-23.
- **Statut :** ACCEPTED (décision explicite du propriétaire) ; déploiement de la politique GitHub et du workflow **IN_PROGRESS**, non certifié tant que les preuves n'existent pas.
- **Contexte :** règles GitHub [#27937019](https://github.com/Patricked-code/africafunds-market-data-pipeline/rules/27937019) installées, mais compteur `required_approving_review_count=1`, dernier push soumis à approbation, et PR #37 Draft. Le propriétaire décide de ne plus demander une revue indépendante pour chaque développement ordinaire.
- **Décision :** pour les PR ordinaires et non sensibles du programme SadiaAF, conserver PR, `main` protégée, checks stricts `validate` et `Build, boot, migrate and verify persistent PostgreSQL`, fils résolus, interdictions force-push/suppression et absence de bypass ; ne plus exiger de revue indépendante : `required_approving_review_count=0`, `require_last_push_approval=false`, `require_code_owner_review=false`, `required_reviewers=[]`, `require_extra_approval_for_unattributed_changes=false`. Conserver l'option `Allow auto-merge` native et l'éligibilité explicite de la PR, sans fusion directe ou approbation artificielle.
- **Gates réservés :** aucune implication pour la production S1, les secrets, les droits des données sources, les migrations destructives ou les changements sensibles. Ces opérations conservent leurs autorisations spécifiques dans `docs/10_DEPLOYMENT_GATES.md` et les décisions applicables.
- **Autorité :** la présente décision remplace uniquement l'exigence de revue indépendante universelle de l'ADR-015 pour les PR ordinaires. Les autres exigences et l'historique restent inchangés.
- **Dépendance administrative :** modifier le ruleset existant **27937019**, sans en créer un second, via l'identité admin `Patricked-code`. Le connecteur GitHub courant ne possède pas la capacité d'écriture sur les réglages admin. Ne jamais prétendre le changement appliqué avant attestation REST.
- **Recette :** règles `main` actives et vérifiées, CI/Docker au dernier SHA, PR non Draft et éligible, test de fusion native au travers de GitHub sans intervenant, vérification checkpoint et reprise du lot suivant.
- **Risque accepté :** sans relecteur, un défaut non couvert par les tests peut être intégré ; conserver tests, checks, sécurité de provenance et filtrage des changements sensibles.

## ADR-017 — Déclenchement de fusion par workflows GitHub fiables et SHA attesté

- Date : 2026-11-24.
- Statut : ACCEPTED pour la conception ; activation pratique à tester après intégration gouvernée de PR #37.
- Source externe vérifiée : GitHub Changelog du 2026-11-02 annonce le blocage par défaut de pull_request_target sur les dépôts PUBLIC au 2026-12-02 en l'absence de politique d'exception explicite. Référence : https://github.blog/changelog/2026-11-02-pull_request_target-blocked-by-default-december-2/
- Décision : ne pas dépendre du déclencheur pull_request_target. Déclencher le workflow d'enrôlement natif avec workflow_run completed depuis les workflows CI et Docker déjà présents, qui s'exécutent sur les PR. Le workflow privilégié doit exister dans main, exclusivement utiliser le checkout de main et n'exécuter ni PR head, ni archive, ni artefact téléchargé depuis la PR.
- Contrôle de provenance : accepter uniquement un événement de workflow de pull_request, completed/success, provenant du dépôt SadiaAF, portant exactement l'un des deux noms de workflows de confiance ; exiger une unique PR rattachée, sa branche main et son SHA head identique au SHA de l'exécution et au SHA de la PR relue au moment d'agir.
- Signal de reprise ou révocation : accepter uniquement les commandes exactes /sadiaaf-automerge SHA ou /sadiaaf-revoke-automerge SHA en commentaire de PR par OWNER/MEMBER/COLLABORATOR, jamais un commentaire anonyme, ni un SHA obsolète. Le label automerge-eligible reste une condition obligatoire et ne constitue pas une autorisation pour les chemins sensibles.
- Révocation : un retrait de label, sans commande d'annulation, ne réveille pas immédiatement workflow_run. L'exécuteur propriétaire doit donc émettre la commande SHA-bound de révocation avant toute suppression de label sur une PR déjà enrôlée, ou désactiver l'auto-merge natif dans GitHub. Ne jamais promettre une révocation événementielle automatique non implémentée.
- Gouvernance : seulement PR ordinaires sans chemins sensibles, CI et Docker statutaires stricts, protection main, approbations universelles à zéro selon ADR-016, pas de nouveau scheduler, secret, PAT admin, second orchestrateur, déploiement S1 ou dépense.
- Condition de DONE : CI et Docker sur le HEAD exact de PR #37, fusion de cette PR de gouvernance sous autorisation du propriétaire, vérification de l'événement workflow_run et du token réel sur main, preuve ENROLLED/SKIPPED/REVOKED puis pilote de PR ordinaire fusionnée par GitHub sans bypass. Aucune annonce de 24/7 sans exécuteur réel attesté.

## ADR-018 — Protection d'enrôlement contre les changements sensibles après inscription

- Date : 2026-11-24.
- Statut : ACCEPTED pour le code et les tests, recette runtime et fusion encore à contrôler.
- Problème réel : après un enrôlement auto-merge natif, un contributeur habilité peut pousser un nouveau SHA contenant un chemin sensible ; GitHub ne désactive pas automatiquement l'auto-merge pour tous les auteurs dotés de droits d'écriture. La révocation événementielle peut donc être trop tardive.
- Décision : prolonger le job de contrôle obligatoire validate pour vérifier chaque nouveau SHA avec un GITHUB_TOKEN uniquement en lecture (contents:read, pull-requests:read). Si le diff est sensible et que la PR est labellisée automerge-eligible OU inscrite dans le native auto-merge, ce check requis doit échouer sur le SHA courant. La PR sensible sans inscription peut suivre la procédure de fusion expressément autorisée sous les autres checks du ruleset. Le diff manquant/tronqué échoue toujours.
- Autorisation : l'inscription native privilégiée reste dans le workflow_run fiable utilisant uniquement le code main (sans checkout PR ni artefact) ; le jeton d'enrôlement requiert les permissions contents:write et pull-requests:write pour la mutation GraphQL, avec protection main et aucun contournement de ruleset.
- Fallback : supprimer le fallback de protection classique non normalisé ; accepter uniquement une règle ruleset active et vérifiable correspondant à main. En l'absence de preuve du statut de bypass du token, aucune inscription.
- Limite de modèle : un collaborateur disposant du droit de modifier un workflow CI ou d'activer lui-même l'auto-merge peut chercher à contourner un contrôle embarqué dans le contenu d'une PR. Les ACL GitHub et l'exigence de gouvernance des PR sensibles restent donc pertinentes ; le nouveau check garantit le scénario de non-régression d'un ajout sensible accidentel/après enrôlement, et ne doit pas être présenté comme un verrou absolu contre un auteur malveillant habilité.
- Preuves attendues : tests du required head gate (label/auto_merge, fichiers sensibles et non sensibles), CI + Docker sur SHA exact, revue des fils bloquants, fusion autorisée de PR #37, pilote native auto-merge sur PR ordinaire, test de rejet sur nouvelle révision sensible. Aucun assouplissement des deux checks requis, aucun S1, aucun secret tiers.


## Rattachement des ADR existants à la MISSION 13 (24/11/2026)

**CONTINUITY_ID :** SADIAAF-CONTINUITY-20261124-01. Cette table est un index de lecture, non une nouvelle décision, et ne modifie aucun statut ni texte ADR historique. Le contrat de référence est docs/15 §13, introduit par [d78f6e82](https://github.com/Patricked-code/africafunds-market-data-pipeline/commit/d78f6e82cf180f0128fb8ddaa40e1d35f0f3dcfc) dans PR #37. Filiation vérifiée dans [issue #9](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/9#issuecomment-7123410131).

| Décision | Rôle dans la MISSION 13 | Autorité de mise en œuvre / preuve |
|---|---|---|
| ADR-001 | Mémoire persistante | AGENTS, docs/00/07/09, PR1 |
| ADR-002 | Gates de production | docs/10/14, lots 12–13, PR31 |
| ADR-003 | Architecture progressive | docs/02/12, non-refonte |
| ADR-004 | Modèle canonique indépendant | docs/03/12, lots 2–3 |
| ADR-005 | Séries locales et conversions FX | docs/04/14, lots 5–7, issue16 |
| ADR-006 | Séparation officiel/propriétaire | docs/04/14, lots 5–7 |
| ADR-007 | Méthodologies versionnées et périodes de validité | docs/04, FR-025 docs/14, PARTIAL ; lots 5–7, issue17 |
| ADR-008 | Historique sans anticipation | docs/04/14, backfill et calculs, issues5/17 |
| ADR-009 | PostHog distinct des traces techniques | docs/12/13, lot10 |
| ADR-010 | Mandat fondateur autonomie | docs/15, PR1, issue9 du 06/11, PR42 = continuation |
| ADR-011 | Convergence mémoire PR1/PR2 | docs/00 + annexe PROJECT_MEMORY.md, PR2 fermée non fusionnée |
| ADR-012 | Préserver l'architecture et distinguer les deux usines | AGENTS, docs/13/15, PR19/21/23/24 pour exploitation |
| ADR-013 | SadiaAF plateforme centrale | docs/01/00, pas de confusion AfricaFunds/MCP/UAES/Workers |
| ADR-014 | Historique dépôt privé et main non protégée | configuration historique, devenue obsolète sur ces points ; issue3, ADR015/016 |
| ADR-015 | Auto-fusion native sous protections | PR37, règles et tests, revue universelle modifiée par ADR016 |
| ADR-016 | Pas de revue indépendante systématique pour PR ordinaires | ruleset27937019 et PR37/38/39 ; autres gates maintenus |
| ADR-017 | Événements fiables et SHA attesté | workflow_run et signaux SHA-bound de PR37, recettes PR38/39/40 |
| ADR-018 | Refus des changements sensibles après enrôlement | validate required head gate PR37 ; limites ACL explicites |

La fusion de PR37 (ed78d253fbce9b5f94b9ef4d9a38803c6b63d417), puis les recettes PR38/39 et le correctif PR40 actualisent les états historiques d'activation de ces ADR, sans effacer leurs conditions ni prétendre certifier tous les scénarios négatifs. Vérifier les preuves LIVE et docs/06/09. L'ADR-010/012 ne permet pas de créer une nouvelle usine concurrente ; le modèle Qwen de PR42 reste candidat, aucun choix définitif de provider n'est déduit du pilote. Les 14 lots et FR-025 conservent leurs propres recettes.

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
