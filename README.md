# AfricaFunds Market Data Pipeline

> **État vérifié au 6 novembre 2026 : socle v0.2.0, plateforme cible SadiaAF non terminée, aucune attestation de déploiement de ce dépôt sur S1.** La présence de scripts Plesk ne constitue pas une autorisation de production. Le moteur est distinct du produit AfricaFunds, qui est un de ses consommateurs futurs.

### Point d'entrée pour Claude, ChatGPT et toute reprise

1. Lire [`AGENTS.md`](AGENTS.md) et [`docs/00_PROJECT_MEMORY.md`](docs/00_PROJECT_MEMORY.md) pour la mission et l'autorité documentaire.
2. Lire le [journal de continuité](docs/09_CHANGELOG_WORKLOG.md), le dernier checkpoint daté et [l'état réel](docs/06_CURRENT_STATUS_AND_GAPS.md) ; **revérifier les SHAs, PR et CI sur GitHub avant de reprendre**.
3. Reprendre le [plan canonique de 14 lots](docs/13_MODE_DE_REALISATION_ET_PLAN_DE_LOTS.md) et la [matrice d'exigences/recette](docs/14_MATRICE_EXIGENCES_RECETTE.md), sans plan parallèle.
4. Pour un agent codeur Claude ou ChatGPT, suivre [le contrat d'exécution continue](docs/15_AUTONOMOUS_AGENT_EXECUTION.md) et [le protocole de transmission](docs/07_AI_HANDOFF_PROTOCOL.md). Les spécifications n'attestent pas un exécuteur autonome 24 h/24 ; le véritable raccordement reste à démontrer.
5. Aucun push direct sur `main`, aucun déploiement S1 sans [gates](docs/10_DEPLOYMENT_GATES.md), revue et autorisations applicables. Les décisions durables sont dans [`docs/08_DECISION_LOG.md`](docs/08_DECISION_LOG.md).

**Photographie des travaux du 6 novembre (à vérifier à chaque reprise) :** PR #1 (mémoire), PR #2 (mémoire annexée à #1 sans fusion), PR #4 (CI reproductible), PR #10 (idempotence SQL), PR #11 (traitement HTTP) ; issues #3 (protection de `main`), #5 (backfill historique), #7 (sécurité HTTP), #9 (vrai exécuteur codeur). Le code `main` demeure la référence livrée jusqu'à fusion effective.

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

Les adaptateurs explicitement déclarés `MANUAL_API_DISCOVERY` sont marqués `BLOCKED_ADAPTER`. **Attention** : l'audit du 6 novembre montre que les autres tâches de backfill n'appliquent pas encore nécessairement leurs fenêtres `window_from/window_to` ; leur succès ne doit pas être interprété comme la preuve d'une reconstitution historique. Voir l'issue #5 et les tests de recette à réaliser.

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
- 44 endpoints configurés sur 11 marchés au contrôle du 6 novembre 2026 ; configuration ne prouvant pas une ingestion réelle réussie ;
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

Documentation : `docs/S1_DEPLOYMENT.md`. **Les commandes ci-dessous sont historiques et informatives : elles ne doivent pas être exécutées sur S1 avant sauvegarde PostgreSQL/archives brutes, staging, restauration, rollback testé et autorisation explicite.**

```bash
sudo ./deploy/s1/preflight.sh
sudo ./deploy/s1/deploy.sh
```
