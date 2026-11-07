# 02 — Architecture cible

## Principe

Commencer par un **modular monolith** clairement découpé, puis extraire les services qui nécessitent une montée en charge ou une isolation spécifique. Éviter une multiplication prématurée de microservices.

## Domaines logiques

```text
API Gateway
Auth & RBAC
Administration
Source Registry
Collection & Discovery
Raw Archive
Parsing & Extraction
Normalization
Canonical Data
Interoperability & Mapping
Quality & Reconciliation
Financial Calculation
Publication
Scheduler & Workers
Audit & Notifications
Observability
```

## Schémas PostgreSQL

```text
ref          référentiels
source       provenance, documents et fichiers
staging      données externes avant validation
market       indices, taux, FX, inflation, instruments
fund         fonds, portefeuilles, classes, VL et événements
method       méthodologies et versions
calc         courbes, valorisations, compositions et indices
integration  systèmes externes, schémas, mappings et synchronisations
quality      contrôles, anomalies et scores
publish      séries et vues exposées
identity     utilisateurs, rôles, organisations et clés API
ops          runs, files, locks, jobs et supervision
audit        journal immuable des actions
```

## Chaîne de données

```text
Source → Archive brute → Extraction → Staging → Normalisation
→ Modèle canonique → Contrôle qualité → Calcul → Publication
```

Aucune étape ne doit écraser la précédente.

## Services de déploiement cible

- `postgres`
- `redis` ou équivalent pour files/locks
- `api`
- `worker-collector`
- `worker-parser`
- `worker-calc`
- `scheduler`
- `admin-web`
- stockage objet S3/MinIO ou volume versionné
- observabilité

## API

Familles attendues :

```text
/auth
/admin
/markets
/indices
/rates
/yield-curves
/instruments
/funds
/navs
/categories
/benchmarks
/methodologies
/integrations
/mappings
/syncs
/quality
/audit
```

API versionnée, OpenAPI, pagination, filtres, scopes, quotas, rate limiting, clés API, OAuth2/OIDC et webhooks signés.

## Déploiements

- local : développement reproductible ;
- staging : données réelles limitées, secrets distincts, aucune dépendance production ;
- production S1 : uniquement après validation des gates.

## Invariants

- migrations idempotentes et versionnées ;
- reprise après erreur ;
- locks empêchant les calculs concurrents incohérents ;
- aucune suppression physique d’une donnée publiée sans politique explicite ;
- révisions et corrections conservées ;
- tous les timestamps en UTC, avec date économique locale distincte.
