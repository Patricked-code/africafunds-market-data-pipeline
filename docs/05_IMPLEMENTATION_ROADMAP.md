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
