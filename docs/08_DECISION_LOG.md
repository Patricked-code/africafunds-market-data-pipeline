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
