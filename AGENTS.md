# AGENTS.md — Règles de continuité pour toute IA

## Reprise de la MISSION 13 — filiation obligatoire

**MISSION 13 — SADIAAF-CONTINUITY-20261124-01** désigne l'achèvement intégral des 14 lots, des six chantiers de données et des deux autonomies (développement et exploitation). Priorité absolue : rendre l'exécuteur codeur indépendant de ChatGPT réellement opérationnel et certifié. La cartographie originelle est `docs/15_AUTONOMOUS_AGENT_EXECUTION.md` §13 (commit d78f6e82cf180f0128fb8ddaa40e1d35f0f3dcfc, PR #37) ; elle prolonge ADR-010 du 06/11/2026, PR #1 et issue #9. Lire la filiation et les preuves liées dans docs/00, docs/08, docs/09 et docs/15 avant toute nouvelle conception. Retrouver l'existant dans branches, commits, issues et workflows, y compris les PR fermées ; ne pas assimiler PR42 à l'origine du chantier. Le pilote modèle Qwen est une recette candidate, pas une nouvelle autorité ni une technologie imposée. Si un exécuteur historique admissible existe, le réutiliser après preuve. 

Point de reprise historique : https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/9#issuecomment-7123410131. GitHub LIVE et le dernier checkpoint priment sur tout état ancien. La mémoire historique PR #2 et le checkpoint du 06/11 restent intacts. Aucun doublon d'orchestrateur, de scheduler, de registre ou de roadmap. L'ADR-007 (méthodologies versionnées), FR-025 et les autres exigences métier restent à satisfaire ; ne pas les confondre avec le mécanisme d'autonomie.


Ce dépôt est la mémoire technique et fonctionnelle du projet **AfricaFunds Market Data / SadiaAF**.

## Nomenclature canonique : plateforme SadiaAF et application AfricaFunds

- **SadiaAF** = plateforme centrale de données financières africaines à achever, indépendante de ses applications consommatrices. C'est l'objet du programme des 14 lots.
- **`Patricked-code/africafunds-market-data-pipeline`** = dépôt GitHub technique historique hébergeant le socle de SadiaAF. Son nom n'autorise aucune réduction du périmètre produit.
- **AfricaFunds** = application consommatrice possible, au même titre que BRVM ChainSolutions et les partenaires ; **ne jamais la confondre avec la plateforme SadiaAF**.
- Ne pas renommer le dépôt, les modules, les schémas ou les identifiants pour des motifs rédactionnels ; conserver leurs contrats et leur rétrocompatibilité. Les nouveaux documents fonctionnels doivent utiliser *SadiaAF* pour désigner la plateforme.
- Les usines de programmes/tâches et de développement autonome organisent **l'achèvement de SadiaAF** ; elles ne constituent ni un nouveau pipeline de données ni un projet de développement de la seule application AfricaFunds.

## Lecture obligatoire avant toute modification

Lire dans cet ordre :

1. `docs/00_PROJECT_MEMORY.md`
2. `docs/01_PRODUCT_VISION_SCOPE.md`
3. `docs/11_CAHIER_DE_CONCEPTION_MASTER.md`
4. `docs/02_ARCHITECTURE_TARGET.md`
5. `docs/12_ARCHITECTURE_DE_CONCEPTION_DETAILLEE.md`
6. `docs/03_DATA_GOVERNANCE_INTEROPERABILITY.md`
7. `docs/04_FINANCIAL_METHODOLOGIES.md`
8. `docs/13_MODE_DE_REALISATION_ET_PLAN_DE_LOTS.md`
9. `docs/14_MATRICE_EXIGENCES_RECETTE.md`
10. `docs/05_IMPLEMENTATION_ROADMAP.md`
11. `docs/06_CURRENT_STATUS_AND_GAPS.md`
12. `docs/07_AI_HANDOFF_PROTOCOL.md`
13. `docs/08_DECISION_LOG.md`
14. `docs/10_DEPLOYMENT_GATES.md`
15. `docs/09_CHANGELOG_WORKLOG.md` (commencer par l'entrée la plus récente et suivre le lien vers le dernier checkpoint de continuité)
16. `docs/15_AUTONOMOUS_AGENT_EXECUTION.md` (**obligatoire pour tout agent codeur Claude/ChatGPT qui reprend, exécute, transmet ou enchaîne des tâches**)

Avant toute reprise après interruption ou parenthèse, consulter le **dernier checkpoint daté référencé par `docs/09_CHANGELOG_WORKLOG.md`** et vérifier l'état réel de GitHub (branches, SHAs, PR, CI). Les snapshots ne remplacent jamais cette vérification.

## Mandat d'exécution continue

**But permanent : achever le pipeline de données AfricaFunds/SadiaAF dans le cadre des 14 lots existants.** Dès que le dernier travail admissible est terminé, sélectionner et commencer automatiquement le suivant avec preuve et checkpoint GitHub ; ne pas attendre un nouveau prompt à chaque tâche. Appliquer le contrat commun et ses gates dans `docs/15_AUTONOMOUS_AGENT_EXECUTION.md`. **Un agent ne devient pas un service permanent par simple lecture de ce fichier : il faut un exécuteur réel ; ne jamais déclarer ce runner actif sans preuve.**

## Principe obligatoire : évolution du socle technique existant

**Objectif premier : achever le système AfricaFunds Market Data Pipeline / SadiaAF initialement conçu, en partant de son code et de son architecture réels, sans le remplacer par un système parallèle.** L'amélioration ne doit jamais devenir une refonte implicite.

Avant toute PR, tout agent codeur Claude/ChatGPT doit :

1. **INVENTORIER** les composants réels sur la branche de référence, leurs contrats, données, tests, dépendances et mécanismes de reprise ; distinguer les composants codés, testés, déployés et seulement prévus.
2. **CARTOGRAPHIER L'ÉCART** entre ce qui existe, la cible des 14 lots et la matrice de recette. Reprendre les chantiers engagés avant toute extension facultative.
3. **PRÉSERVER** la chaîne industrielle déjà en place : source registry → ordonnanceur/ingestion → HTTP → archive brute SHA-256 → parseurs → PostgreSQL et qualité → normalisation → calculs → publication (les dernières étapes sont partiellement à achever). Conserver aussi la file historique de backfill, l'API, Docker, les migrations et les autorités documentaires existantes.
4. **COMPLÉTER/RENFORCER** le composant existant par la modification minimale cohérente, avec compatibilité des interfaces, migrations additives, gestion de version, tests RED/GREEN et preuve de non-régression.
5. **ÉVALUER LES NOUVEAUTÉS** seulement si elles ont un bénéfice démontrable pour la cible : sécurité, données, méthodes financières, fiabilité, reprises, performances, interopérabilité ou autonomie des agents. Une technologie nouvelle ne justifie ni duplication de fonction ni création d'une seconde autorité.
6. **VALIDER ET TRACER** le comportement initial conservé, le nouvel attendu, les tests et leurs limites, les risques, les critères d'acceptation, la PR/CI et le `NEXT_ACTION`. Ne pas appeler `DONE` une étape prévue mais non exécutée.

**Interdiction par défaut :** réécriture globale, remplacement du scheduler, de la base, du moteur de calcul ou du pipeline par un nouvel orchestrateur sans preuve d'impossibilité de faire évoluer l'existant et sans ADR explicite, revue, plan de migration, sauvegarde, rollback et approbations requises.

Les deux industries sont distinctes : **l'usine des données** exécute collecte→transformation→publication ; **l'usine de développement** fait évoluer cette base via agents, branches, tests, CI, PR et continuité GitHub. Leur raccordement ne doit pas confondre leurs cycles ni leurs responsabilités.

## Règles impératives

- Ne jamais prétendre qu’une fonction, un historique, un adaptateur ou un déploiement est terminé sans preuve reproductible.
- Ne jamais modifier directement la production ni supprimer un ancien service sans sauvegarde, précontrôle, recette et rollback.
- Ne jamais écraser une donnée brute, une observation publiée ou une méthodologie historique.
- Séparer strictement : source brute, extraction, normalisation, calcul, publication.
- Distinguer toujours un indice officiel importé d’un indice propriétaire AfricaFunds.
- Toute donnée calculée doit conserver la version méthodologique, le run, la provenance et le score de qualité.
- Toute modification de schéma, de mapping ou de méthode doit être versionnée et datée.
- Aucun secret, mot de passe, token, clé API ou fichier `.env` réel ne doit être committé.
- Travailler sur une branche dédiée, exécuter les tests, documenter les écarts, puis ouvrir une PR.
- Ne jamais déployer sur S1 tant que les critères de `docs/10_DEPLOYMENT_GATES.md` ne sont pas tous satisfaits et validés.

## Mise à jour documentaire obligatoire

Chaque PR fonctionnelle doit mettre à jour au minimum :

- `docs/06_CURRENT_STATUS_AND_GAPS.md` ;
- `docs/09_CHANGELOG_WORKLOG.md` ;
- `docs/08_DECISION_LOG.md` si une décision d’architecture ou de méthodologie change ;
- `docs/05_IMPLEMENTATION_ROADMAP.md` si le périmètre ou l’ordre des travaux change ;
- `docs/11_CAHIER_DE_CONCEPTION_MASTER.md`, `docs/12_ARCHITECTURE_DE_CONCEPTION_DETAILLEE.md`, `docs/13_MODE_DE_REALISATION_ET_PLAN_DE_LOTS.md` ou `docs/14_MATRICE_EXIGENCES_RECETTE.md` lorsque le cadrage maître concerné évolue.

## Définition de « terminé »

Une tâche est `DONE` uniquement si :

- le code est présent ;
- les migrations éventuelles sont présentes ;
- les tests sont présents et réussissent ;
- la documentation est mise à jour ;
- les données ou résultats sont contrôlés sur des cas réels ;
- aucune régression connue n’est introduite ;
- le statut est traçable dans le dépôt.

## Admission et traçabilité inter-agents — SADIAAF-CONTINUITY-20261124-01

Avant toute écriture, quel que soit l'intervenant humain, Claude, ChatGPT, automatisation ou autre client : identifier la session par une référence opaque non sensible, consulter les issues/PR actives et le dernier état GitHub, déclarer sur l'issue existante le périmètre, la branche, le SHA et le NEXT_ACTION. Ne pas reprendre un travail déjà occupé. Pendant chaque unité significative, publier le checkpoint, les références de preuves et le prochain pas sur l'issue/PR ; maintenir docs/06 et docs/09 lors de l'intégration et préserver l'historique. Si un autre agent est actif, rester en lecture seule sur son périmètre et choisir une tâche indépendante.

La réservation atomique, le bail, le heartbeat et le fencing du contrat docs/15 §14 sont obligatoires dès activation attestée du dispositif commun. Jusqu'à cette preuve, les déclarations manuelles sur GitHub ne constituent PAS un verrou atomique ; ne pas revendiquer l'absence garantie de collision. Refuser les écritures d'un périmètre non réconcilié. Aucun identifiant privé de conversation, contenu privé ou secret dans le dépôt public.
