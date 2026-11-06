# 05 — Feuille de route d’implémentation

## Phase 0 — Documentation et discipline de reprise

- [x] Mémoire persistante et règles IA
- [x] Vision et architecture cible
- [x] Gouvernance et interopérabilité
- [x] Synthèse méthodologique
- [ ] Synchroniser le README avec cette documentation
- [ ] Ajouter modèles de PR, issues et ADR

## Phase 1 — Sécurité et bootstrap

- [ ] Schémas `identity` et `audit`
- [ ] Authentification OIDC/OAuth2 ou solution validée
- [ ] RBAC et scopes
- [ ] Bootstrap du premier `SUPER_ADMIN`
- [ ] MFA et rotation des secrets
- [ ] Gestion des organisations et clés API
- [ ] Audit immuable des actions

## Phase 2 — Modèle canonique et interopérabilité

- [ ] Dictionnaire canonique exécutable
- [ ] Schéma `integration`
- [ ] Découverte PostgreSQL/MySQL/REST/CSV/Excel
- [ ] Snapshots et détection de dérive
- [ ] Mappings de champs et de valeurs
- [ ] Crosswalks d’identifiants
- [ ] Contrats de données entrants/sortants
- [ ] Dry-run, synchronisation, conflits et dead-letter

## Phase 3 — Adaptateurs officiels

- [ ] Égypte : CBE CONIA/T-Bills/T-Bonds et EGX
- [ ] Tunisie : BCT GOSDMX/SDMX, CMF et Trésor
- [ ] Kenya : CBK, KESONIA, NSE et PDMO
- [ ] UEMOA : BCEAO, UMOA-Titres et BRVM PDF/Excel
- [ ] CEMAC : BEAC et BVMAC
- [ ] Adaptateurs des autres marchés avec tests réels
- [ ] Détection automatique des changements de format

## Phase 4 — Courbes et obligations

- [ ] Calendriers et cashflows
- [ ] Intérêts courus, prix propre/sale
- [ ] Bootstrap et interpolation versionnés
- [ ] Affectation quotidienne Monétaire/CT/MT/LT
- [ ] Valorisation observée et modèle
- [ ] Duration, convexité et DV01
- [ ] Total Return par instrument et indice
- [ ] Agrégé, CT, MT et LT par marché
- [ ] Conversion EUR/USD et qualité

## Phase 5 — Fonds, catégories et benchmarks

- [ ] Appartenances historiques catégories
- [ ] Gestion des portefeuilles et classes représentatives
- [ ] Rendements ajustés des distributions/splits
- [ ] Indices de catégories nominaux et réels
- [ ] Composites officiels
- [ ] Benchmarks plateforme versionnés
- [ ] Hiérarchies Afrique, région et national

## Phase 6 — Cockpit Super Administrateur

- [ ] Utilisateurs, rôles et organisations
- [ ] Sources, adaptateurs, jobs et backfills
- [ ] Anomalies, validations et republications
- [ ] Schémas externes et mappings
- [ ] Synchronisations et conflits
- [ ] Méthodologies et publications
- [ ] Sauvegardes, restauration et audit

## Phase 7 — API, observabilité et PostHog

- [ ] OpenAPI complet
- [ ] Pagination, filtres, quotas, scopes et webhooks
- [ ] Logs structurés, métriques et traces
- [ ] PostHog : événements, groupes et feature flags
- [ ] Alertes techniques et métier

## Phase 8 — Validation et staging

- [ ] CI complète
- [ ] Tests unitaires, intégration, sécurité et calculs
- [ ] Tests de données réelles par marché
- [ ] Test de reprise et restauration
- [ ] Test de charge
- [ ] Déploiement staging isolé
- [ ] Rapport de recette signé

## Phase 9 — Production S1

Interdite tant que `docs/10_DEPLOYMENT_GATES.md` n’est pas entièrement validé.


## Chantier transversal 2026-11-07 — Qualifier et achever les sources du pipeline initial

Ce parcours n'ajoute aucun nouveau lot aux **14 lots 0–13** et ne crée aucun registre de sources concurrent ; il réutilise `config/sources.json`, PostgreSQL, les adaptateurs et les exigences existants.

1. [ ] **Lot 4/11 — Audit 44 endpoints** : issue [#13](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/13), branche `audit/official-source-qualification-20261107`, PR [#18](https://github.com/Patricked-code/africafunds-market-data-pipeline/pull/18) Draft ; scripts, tests, matrice et workflow ajoutés ; succès des vérifications et résultats de chaque source à attester sur SHA exact.
2. [ ] **Lot 4 — Six adaptateurs dynamiques** : issue [#14](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/14) — Égypte (5), Tunisie (1), parseurs PDF/JSON/SDMX ; interdiction de contourner les accès.
3. [ ] **Lot 4/11 — Backfill historique vrai** : issue [#5](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/5), PR #12 Draft avec correctifs de propagation des erreurs et claim atomique ; fenêtres historiques effectives, récupération crash et validation réelle restent nécessaires.
4. [ ] **Lots 2–7 — Normalisation et qualité** : issue [#15](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/15), exploiter les schémas et calculs existants.
5. [ ] **Lots 2/4/7 — FX, inflation, fonds/VL** : issue [#16](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/16), recherche et qualification avant enrichissement additif du registre.
6. [ ] **Lots 4–13 — Recette par marché et publication** : issue [#17](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/17), couverture, historiques, courbes, indices, API et staging gouvernés.

**Gates :** `REGISTERED_ONLY` ne signifie pas URL accessible ; un `HTTP 200` ne certifie ni série normalisée ni historique complet. Aucun `HISTORY_COMPLETE` ni production S1 sans document témoin, rapprochement, droits d'accès et preuve de reprise. La roadmap est un programme de travail, pas un certificat DONE.
