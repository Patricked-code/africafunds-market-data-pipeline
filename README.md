# AfricaFunds Market Data Pipeline

Pipeline autonome d’ingestion, d’archivage et de normalisation des données officielles nécessaires aux indices AfricaFunds.

## Périmètre v0.1

Marchés : Maroc, Ghana, BRVM/UEMOA, Tunisie, Égypte, Nigeria, Kenya, BVMAC/CEMAC, Botswana, Namibie et Éthiopie.

Familles collectées :

- indices actions larges et variantes officielles ;
- taux overnight, interbancaires et monétaires ;
- adjudications de bons et obligations ;
- courbes de taux par maturité ;
- cours de change local/EUR/USD ;
- documents, Excel, CSV, PDF et tableaux HTML sources.

## Principes

1. Aucun fichier source n’est écrasé.
2. Chaque réponse est archivée et identifiée par SHA-256.
3. Les chargements sont idempotents.
4. Les données brutes restent séparées des observations normalisées et calculées.
5. Toute valeur peut remonter à sa source.
6. Les rattrapages historiques sont découpés en fenêtres reprenables.
7. Le collecteur respecte les limitations d’accès et ne contourne ni authentification ni CAPTCHA.
8. Un indice officiel importé n’est jamais confondu avec un indice AfricaFunds calculé.

## Architecture

```text
Sites officiels
  ↓
Source registry
  ↓
HTTP collector + retries
  ↓
Raw archive SHA-256
  ↓
HTML / CSV / XLS / XLSX parsers
  ↓
market.raw_records
  ↓
Adaptateurs de normalisation par source
  ↓
Indices, taux, instruments et courbes normalisés
  ↓
Valorisation et indices AfricaFunds
  ↓
Séries locale / EUR / USD
```

## Installation locale

```bash
cp .env.example .env
docker compose build
docker compose up -d postgres
docker compose run --rm collector node dist/src/cli/index.js migrate
docker compose run --rm collector node dist/src/cli/index.js seed
```

## Première collecte

```bash
# Une source nationale
docker compose run --rm collector node dist/src/cli/index.js ingest --market=MAR

# Une famille de données
docker compose run --rm collector node dist/src/cli/index.js ingest --family=YIELD_CURVE

# Découverte des fichiers historiques liés
docker compose run --rm collector node dist/src/cli/index.js discover --market=UEMOA
```

## Rattrapage historique

```bash
# Créer des fenêtres de 90 jours
docker compose run --rm collector node dist/src/cli/index.js backfill \
  --market=MAR --from=2000-01-01 --to=2026-07-29

# Voir la file
docker compose run --rm collector node dist/src/cli/index.js backfill --list=true

# Traiter dix fenêtres
docker compose run --rm collector node dist/src/cli/index.js backfill --work=true --limit=10
```

Les pages reposant sur une API dynamique inconnue passent en `BLOCKED_ADAPTER`. Cela évite de déclarer un historique terminé alors que l’API ou la pagination n’est pas encore comprise.

## Planification

Le conteneur `collector` démarre le scheduler interne :

- ingestion incrémentale : jours ouvrés à 21 h 30 ;
- découverte des archives : dimanche à 2 h 15 ;
- audit des portails : le premier jour du mois à 3 h.

Les expressions sont configurables dans `.env`.

Une alternative système est fournie dans `crontab.example`. Il ne faut pas activer simultanément le scheduler interne et le cron système.

## Commandes

```text
migrate
seed
ingest [--market=MAR] [--family=YIELD_CURVE]
discover [--market=UEMOA]
backfill --from=YYYY-MM-DD --to=YYYY-MM-DD
backfill --list=true
backfill --work=true [--limit=10]
audit-sources
scheduler
```

## Ce qui fonctionne dans le socle

- registre des 11 marchés et de leurs institutions ;
- 45+ endpoints officiels initiaux ;
- téléchargement avec redirections, délai maximal et reprises ;
- archivage local par marché/source/date/empreinte ;
- extraction générique des tableaux HTML ;
- découverte et téléchargement des CSV, Excel, PDF, JSON et ZIP liés ;
- lecture CSV, XLS et XLSX ;
- stockage des lignes brutes en JSONB ;
- suivi des exécutions et santé des portails ;
- file de rattrapage historique ;
- modèle SQL des indices, taux, instruments, courbes, valorisations et séries calculées.

## Adaptateurs spécifiques restant à réaliser

Certains portails nécessitent une analyse réseau ou un parseur propre :

- CBE Égypte : endpoints historiques dynamiques CONIA, T-Bills et T-Bonds ;
- BCT GOSDMX : requêtes statistiques et dimensions SDMX ;
- certaines pages NSE/CBK et EGX ;
- normalisation détaillée des PDF UMOA-Titres et BEAC ;
- classification automatique des maturités et bootstrap des courbes ;
- moteur de Total Return obligataire ;
- calcul des indices de catégorie des fonds et benchmarks plateforme.

Le projet les isole dans le registre avec le statut `MANUAL_API_DISCOVERY`, afin de préserver la fiabilité du suivi.

## Documentation

- `docs/ARCHITECTURE.md` : composants et flux.
- `docs/DATA_DICTIONARY.md` : tables et grains.
- `docs/SOURCE_ADAPTERS.md` : marchés, indices et portails.
- `docs/OPERATIONS.md` : exploitation et reprise.
- `docs/ARCHITECTURE_ATOMIQUE_REFERENCE.md` : spécification atomique fonctionnelle.

## Déploiement S1 — domaines SadiaAF

La version 0.2 ajoute :

- une API HTTP de supervision et consultation ;
- un tableau de bord statique ;
- un stack Docker PostgreSQL/API/collector/web ;
- des scripts Plesk de sauvegarde, remplacement et rollback.

Documentation : `docs/S1_DEPLOYMENT.md`.

```bash
sudo ./deploy/s1/preflight.sh
sudo ./deploy/s1/deploy.sh
```
