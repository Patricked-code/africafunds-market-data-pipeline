# 11 — Cahier de conception maître AfricaFunds Market Data / SadiaAF

**Statut :** document de cadrage maître — production non autorisée  
**Version :** 1.0  
**Date :** 31 juillet 2026  
**Dépôt :** `Patricked-code/africafunds-market-data-pipeline`  
**Domaines de production prévus :** `sadiaaf.wealthtechinnovations.com` et `api.sadiaaf.wealthtechinnovations.com`

---

## 1. Objet du document

Ce cahier rassemble les décisions fonctionnelles, financières, techniques et organisationnelles prises depuis le début du cadrage du projet. Il doit permettre à une équipe humaine ou à une IA de :

1. comprendre la finalité du produit ;
2. distinguer ce qui existe de ce qui reste à construire ;
3. développer sans casser les données, les méthodes ou l’infrastructure ;
4. vérifier chaque résultat par une preuve reproductible ;
5. préparer une mise en production uniquement après recette complète.

Ce document est complété par :

- `docs/12_ARCHITECTURE_DE_CONCEPTION_DETAILLEE.md` ;
- `docs/13_MODE_DE_REALISATION_ET_PLAN_DE_LOTS.md` ;
- `docs/14_MATRICE_EXIGENCES_RECETTE.md` ;
- les documents `00` à `10` déjà présents dans la branche de mémoire persistante.

---

## 2. Vision produit

SadiaAF/AfricaFunds Market Data doit devenir une plateforme autonome, multi-applications et auditable de données financières africaines.

Elle doit :

- collecter les publications officielles des bourses, régulateurs, banques centrales, agences de dette et instituts statistiques ;
- archiver chaque fichier ou réponse source sans écrasement ;
- extraire et normaliser les observations ;
- reconstruire les historiques ;
- produire les courbes, valorisations, indices et benchmarks AfricaFunds ;
- publier les résultats en devise locale, EUR et USD ;
- alimenter AfricaFunds et d’autres sites ou bases ;
- recevoir des données externes et en redistribuer selon des contrats versionnés ;
- fournir un espace Super Administrateur sécurisé ;
- garantir la provenance, la qualité, la reproductibilité et le rollback.

Le produit n’est donc pas un simple scraper, ni un second site public AfricaFunds. Il est le moteur de données et de calcul partagé de l’écosystème WealthTech.

---

## 3. Périmètre initial

### 3.1 Marchés

- Maroc ;
- Ghana ;
- UEMOA / BRVM ;
- Tunisie ;
- Égypte ;
- Nigeria ;
- Kenya ;
- CEMAC / BVMAC ;
- Botswana ;
- Namibie ;
- Éthiopie.

### 3.2 Classes d’actifs

- Actions ;
- Monétaire ;
- Obligations ;
- Diversifiés.

### 3.3 Données prioritaires

- indices actions officiels ;
- taux monétaires et interbancaires ;
- taux directeurs et facilités ;
- adjudications de bons et obligations ;
- instruments souverains et leurs flux ;
- prix, rendements, encours et volumes ;
- courbes de taux ;
- devises et change ;
- inflation ;
- fonds, classes de parts, VL, actifs nets et distributions ;
- appartenances historiques aux catégories ;
- méthodologies et versions ;
- provenance et qualité.

---

## 4. Hiérarchie métier AfricaFunds

```text
N1 — Classe d’actifs
└── N2 — Classe d’actifs Afrique EUR / USD
    └── N3 — Classe d’actifs Région EUR / USD
        └── N4 — Classe d’actifs nationale en devise locale
            └── N5 — Catégorie nationale spécialisée
                └── N6 — Segment national spécialisé
```

### 4.1 Exemple Actions Maroc

```text
N1 Actions
└── N2 Actions Afrique EUR / USD
    └── N3 Actions Afrique du Nord EUR / USD
        └── N4 Actions Maroc MAD
            └── N5 Actions Maroc
```

### 4.2 Exemple Obligations Maroc

```text
N1 Obligations
└── N2 Obligations Afrique EUR / USD
    └── N3 Obligations Afrique du Nord EUR / USD
        └── N4 Obligations Maroc MAD
            └── N5 Obligations nationales Maroc
                ├── N6 Obligations nationales CT Maroc
                ├── N6 Obligations nationales MT Maroc
                └── N6 Obligations nationales LT Maroc
```

### 4.3 Exemple Diversifiés

```text
N5 Diversifiés prudents nationaux
N5 Diversifiés équilibrés nationaux
N5 Diversifiés dynamiques nationaux
```

Chaque catégorie nationale doit connaître :

- son pays ou sa zone ;
- sa devise locale ;
- ses contextes EUR et USD ;
- ses fonds membres et leur période d’appartenance ;
- ses indices officiels ;
- son indice national de catégorie ;
- son indice réel ;
- son benchmark plateforme ;
- son taux sans risque ;
- sa courbe applicable ;
- sa méthodologie ;
- sa période de validité ;
- son score de qualité.

---

## 5. Chaîne de valeur fonctionnelle

```text
Institutions officielles et partenaires
              ↓
Collecte et découverte
              ↓
Archive brute immuable
              ↓
Extraction structurée
              ↓
Staging et normalisation
              ↓
Modèle canonique
              ↓
Contrôles qualité et réconciliation
              ↓
Calculs financiers et indices
              ↓
Publication API / exports / synchronisations
              ↓
Sites et bases consommateurs
```

Aucune étape ne doit écraser la précédente.

---

## 6. Exigences fonctionnelles majeures

### 6.1 Collecte

Le système doit :

- gérer HTML, CSV, XLS, XLSX, JSON, XML/SDMX, PDF et ZIP ;
- suivre les redirections ;
- reprendre après erreur ;
- gérer pagination et fenêtres historiques ;
- détecter les liens et documents liés ;
- détecter les changements de format ;
- conserver date de téléchargement, code HTTP, URL finale et type MIME ;
- calculer une empreinte SHA-256 ;
- empêcher les doublons ;
- conserver les versions modifiées d’un même document.

### 6.2 Backfill historique

- découpage en fenêtres reprenables ;
- statuts `PENDING`, `RUNNING`, `SUCCESS`, `RETRY`, `FAILED`, `BLOCKED_ADAPTER` ;
- idempotence ;
- verrouillage des exécutions concurrentes ;
- preuve de couverture par source, période et famille de données ;
- impossibilité d’annoncer un historique complet tant que des fenêtres restent bloquées.

### 6.3 Provenance

Chaque observation doit pouvoir remonter à :

```text
organisme → page → document → fichier → feuille → cellule/ligne
→ valeur brute → valeur normalisée → calcul → publication
```

### 6.4 Normalisation

Le moteur doit harmoniser :

- dates économiques, dates de publication et dates d’ingestion ;
- devises ISO ;
- unités et facteurs d’échelle ;
- séparateurs de milliers et décimales ;
- maturités et tenors ;
- types de taux ;
- identifiants d’instruments ;
- noms historiques, alias et changements de gestionnaire ;
- statuts de fonds et d’instruments.

### 6.5 Fonds et catégories

Le système doit :

- séparer fonds, portefeuille économique et classe de parts ;
- éviter de compter plusieurs classes du même portefeuille ;
- historiser les appartenances aux catégories ;
- gérer fusions, splits, distributions, liquidations, absorptions et changements de nom ;
- distinguer VL, actif net, Unit Price, Bid Price et Offer Price ;
- conserver devise, date de valorisation et date de publication.

### 6.6 Calcul journalier d’une catégorie nationale N5

Pour chaque date et catégorie :

- compter les fonds actifs ;
- compter les fonds éligibles ;
- compter les fonds ayant valorisé ;
- compter les fonds effectivement utilisés ;
- compter les fonds exclus et sans VL ;
- conserver les portefeuilles uniques ;
- calculer le rendement moyen journalier ;
- calculer le niveau d’indice ;
- calculer la couverture ;
- produire la série nominale et réelle ;
- produire les contextes locale, EUR et USD ;
- conserver la composition et les exclusions ;
- affecter un score et un statut de qualité.

### 6.7 Indices officiels et propriétaires

Les objets doivent rester distincts :

- indice officiel importé ;
- composite officiel AfricaFunds ;
- indice national de catégorie ;
- indice national réel ;
- indice de marché AfricaFunds ;
- benchmark plateforme.

Aucun indice propriétaire ne doit être présenté comme officiel.

### 6.8 Obligations

Le moteur doit gérer :

- instruments et flux ;
- maturité résiduelle quotidienne ;
- affectation Monétaire / CT / MT / LT ;
- prix propre, intérêt couru et prix sale ;
- coupon, amortissement et remboursement ;
- taux actuariel et courbe ;
- encours et pondération ;
- valorisation observée ou théorique ;
- duration, duration modifiée, convexité et DV01 ;
- rendement Total Return ;
- indices Agrégé, CT, MT et LT.

Bornes initiales, configurables et historisées :

- Monétaire : 0 à 1 an inclus ;
- CT : plus de 1 an à 3 ans inclus ;
- MT : plus de 3 ans à 7 ans inclus ;
- LT : plus de 7 ans.

### 6.9 Courbes de taux

Points cibles :

```text
ON, 1W, 1M, 3M, 6M, 9M, 1Y,
2Y, 3Y, 5Y, 7Y, 10Y, 15Y, 20Y, 25Y, 30Y
```

Méthodes possibles :

- interpolation linéaire ;
- interpolation monotone ;
- spline monotone ;
- Nelson-Siegel ;
- Nelson-Siegel-Svensson ;
- bootstrap zéro-coupon.

Le choix est versionné et dépend de la qualité et du nombre de points.

### 6.10 Devises et inflation

- la série locale reste la série économique source ;
- EUR et USD sont des contextes convertis ;
- conserver le taux de change, sa date, sa source, son décalage et sa qualité ;
- produire les rendements nominaux et réels ;
- ne pas invalider la série locale si seule la conversion est insuffisante.

---

## 7. Références nationales initiales

| Marché | Devise | Indice actions large principal | Référence monétaire initiale |
|---|---|---|---|
| Maroc | MAD | MASI | MONIA |
| Ghana | GHS | GSE Composite | interbancaire / T-Bills |
| UEMOA | XOF | BRVM Composite | interbancaire BCEAO |
| Tunisie | TND | TUNINDEX | TMM / interbancaire BCT |
| Égypte | EGP | EGX100 EWI, EGX30 | CONIA Index |
| Nigeria | NGN | NGX All-Share | NOFRI |
| Kenya | KES | NSE All Share | KESONIA |
| CEMAC | XAF | BVMAC All Share | TIMP / références BEAC |
| Botswana | BWP | DCI | BoBC / T-Bills |
| Namibie | NAD | NSX Overall et NSX Local | repo / T-Bills |
| Éthiopie | ETB | à confirmer ou construire | T-Bills 28/91/182/364 jours |

Le registre détaillé des indices, maturités et sources reste dans les documents méthodologiques et les fichiers de configuration par marché.

---

## 8. Super Administration

Le premier déploiement final devra créer un espace sécurisé comprenant :

- bootstrap du premier `SUPER_ADMIN` par secret à usage unique ;
- changement obligatoire du secret initial ;
- MFA ;
- gestion des utilisateurs, rôles, organisations et scopes ;
- gestion des sources et adaptateurs ;
- gestion des jobs, backfills et files ;
- validation des anomalies et mappings ;
- publication, retrait et republication ;
- gestion des méthodologies ;
- gestion des clés API et contrats de données ;
- sauvegarde, restauration et audit ;
- accès aux logs, métriques et alertes.

Rôles initiaux :

- `SUPER_ADMIN` ;
- `PLATFORM_ADMIN` ;
- `DATA_ADMIN` ;
- `DATA_STEWARD` ;
- `CALCULATION_REVIEWER` ;
- `INTEGRATION_ADMIN` ;
- `API_CONSUMER` ;
- `AUDITOR` ;
- `READ_ONLY`.

---

## 9. Interopérabilité multi-sites et multi-bases

La plateforme doit pouvoir recevoir et envoyer des données vers :

- PostgreSQL ;
- MySQL/MariaDB ;
- SQL Server ;
- Oracle ;
- Supabase ;
- REST ;
- GraphQL ;
- CSV/Excel ;
- JSON ;
- XML/SDMX ;
- Parquet ;
- SFTP ;
- S3/MinIO.

### 9.1 Reconnaissance de schéma

Pour chaque système externe :

- tables, colonnes, types ;
- clés et contraintes ;
- unités, devises et formats ;
- exemples de valeurs et taux de nullité ;
- fréquence et propriétaire ;
- sensibilité ;
- empreinte de schéma ;
- dérive entre versions.

### 9.2 Mappings versionnés

Chaque mapping contient :

- système source/destination ;
- objet et champ externe ;
- objet et champ canonique ;
- direction ;
- transformation ;
- règle de validation ;
- confiance et priorité ;
- version et période de validité ;
- statut et approbateur.

Statuts : `PROPOSED`, `REVIEWED`, `APPROVED`, `ACTIVE`, `RETIRED`, `REJECTED`.

### 9.3 Résolution des identités

Les crosswalks doivent relier :

- identifiant AfricaFunds ;
- ISIN ;
- code régulateur ;
- code bourse ;
- ancien code ;
- alias ;
- identifiant partenaire.

Ils doivent empêcher les doublons d’entités.

---

## 10. API et consommation

Familles d’API attendues :

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

Exigences :

- versionnement ;
- OpenAPI ;
- pagination et filtres ;
- OAuth2/OIDC ;
- clés API et scopes ;
- quotas et rate limiting ;
- webhooks signés ;
- exports CSV/Excel/Parquet ;
- journalisation par consommateur ;
- contrats de données versionnés.

---

## 11. PostHog et observabilité

PostHog sert au suivi produit et aux feature flags. Il ne remplace pas les logs, métriques et traces techniques.

Événements prévus :

```text
admin_login_succeeded
admin_login_failed
source_created
adapter_enabled
backfill_started
backfill_completed
backfill_failed
schema_discovered
schema_change_detected
field_mapping_proposed
field_mapping_approved
sync_started
sync_completed
sync_failed
yield_curve_published
index_calculation_completed
index_published
api_key_created
```

Groupes : organisation, application, marché, système externe et adaptateur.

L’observabilité technique doit couvrir :

- logs structurés ;
- métriques ;
- traces distribuées ;
- files et latences ;
- PostgreSQL ;
- CPU, mémoire et disque ;
- erreurs métier ;
- alertes et escalades.

---

## 12. Exigences non fonctionnelles

- idempotence ;
- haute traçabilité ;
- reprise après erreur ;
- isolation des données ;
- sécurité par défaut ;
- lecture seule par défaut pour les systèmes externes ;
- performance compatible avec des historiques longs ;
- extensibilité par pays et famille de données ;
- documentation versionnée ;
- sauvegarde et restauration testées ;
- compatibilité staging/production ;
- absence de secret dans Git ;
- aucune suppression physique d’une donnée publiée sans politique formelle.

---

## 13. État actuel honnête

### Présent ou partiellement présent

- dépôt GitHub ;
- registre initial des marchés et sources ;
- collecteur HTTP générique ;
- archive SHA-256 ;
- parseurs HTML/CSV/Excel ;
- PostgreSQL et migrations ;
- backfill et scheduler ;
- API de supervision ;
- tableau de bord en lecture seule ;
- fonctions de calcul de base ;
- scripts de déploiement S1.

### À construire ou finaliser

- authentification, RBAC, MFA et Super Admin ;
- modèle canonique exécutable complet ;
- interopérabilité multi-bases ;
- adaptateurs Égypte, Tunisie, Kenya, EGX, UMOA-Titres et BEAC ;
- parsing PDF industriel ;
- moteur complet de courbes ;
- classification quotidienne des maturités ;
- moteur Total Return obligataire ;
- indices de catégories de fonds ;
- benchmarks définitifs ;
- PostHog et observabilité ;
- CI, tests réels, staging et recette ;
- production S1.

---

## 14. Principes de gouvernance

- aucune fonction annoncée comme terminée sans code, test, documentation et contrôle réel ;
- toute décision d’architecture ou de méthodologie est historisée ;
- toute PR met à jour le statut, la roadmap et le worklog ;
- aucune donnée brute n’est écrasée ;
- aucun mapping ambigu n’est activé sans validation ;
- aucune mise en production avant validation de tous les gates ;
- toute IA commence par `AGENTS.md` et suit le protocole de reprise.

---

## 15. Critère de réussite globale

Le projet sera considéré prêt lorsque, sur un environnement de staging isolé :

1. une base vierge est créée et migrée sans erreur ;
2. le Super Admin est créé de façon sûre ;
3. une collecte réelle par marché est réussie ;
4. un backfill pilote est repris après interruption ;
5. la provenance d’une observation est démontrée ;
6. une courbe et un indice sont reproduits sur un jeu de référence ;
7. une synchronisation entrante et sortante est validée ;
8. les permissions et audits sont contrôlés ;
9. sauvegarde, restauration et rollback sont testés ;
10. le rapport de recette est approuvé.
