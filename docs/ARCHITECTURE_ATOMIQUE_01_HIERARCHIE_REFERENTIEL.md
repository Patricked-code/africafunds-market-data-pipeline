# AfricaFunds — Architecture atomique des catégories, indices, taux et calculs

**Version :** 0.1 — documentation de conception provisoire  
**Périmètre initial :** Maroc, Tunisie, Égypte, UEMOA, Ghana, Nigeria, Kenya, CEMAC  
**Classes d’actifs prioritaires :** Actions, Monétaire, Obligations, Diversifiés  

---

## 1. Objectif du modèle

Le modèle doit permettre de représenter, historiser, calculer et publier :

1. la hiérarchie des catégories AfricaFunds ;
2. les fonds et leurs appartenances historiques aux catégories ;
3. les indices officiels nationaux ;
4. les séries de taux du jour le jour au très long terme ;
5. les instruments obligataires et leurs flux ;
6. les courbes de taux quotidiennes ;
7. les indices de catégorie calculés à partir des fonds ;
8. les indices de marché construits par AfricaFunds ;
9. les benchmarks plateforme ;
10. les versions en devise locale, EUR et USD ;
11. la provenance complète de chaque donnée et de chaque calcul.

Le modèle doit être atomique : chaque observation, relation, règle méthodologique et résultat calculé doit être identifiable, historisé et reproductible.

---

# 2. Hiérarchie fonctionnelle

## 2.1 Hiérarchie géographique et de catégorie

```text
N1 — Classe d’actifs
└── N2 — Classe d’actifs Afrique EUR / USD
    └── N3 — Classe d’actifs Région EUR / USD
        └── N4 — Classe d’actifs nationale en devise locale
            └── N5 — Catégorie nationale spécialisée
                └── N6 — Segment national spécialisé
```

### Exemple Actions Maroc

```text
N1 — Actions
└── N2 — Actions Afrique EUR / USD
    └── N3 — Actions Afrique du Nord EUR / USD
        └── N4 — Actions Maroc MAD
            └── N5 — Actions Maroc
```

### Exemple Obligations Maroc

```text
N1 — Obligations
└── N2 — Obligations Afrique EUR / USD
    └── N3 — Obligations Afrique du Nord EUR / USD
        └── N4 — Obligations Maroc MAD
            └── N5 — Obligations nationales Maroc
                ├── N6 — Obligations nationales CT Maroc
                ├── N6 — Obligations nationales MT Maroc
                └── N6 — Obligations nationales LT Maroc
```

### Exemple Diversifiés Maroc

```text
N1 — Diversifiés
└── N2 — Diversifiés Afrique EUR / USD
    └── N3 — Diversifiés Afrique du Nord EUR / USD
        └── N4 — Diversifiés Maroc MAD
            ├── N5 — Diversifiés prudents Maroc
            ├── N5 — Diversifiés équilibrés Maroc
            └── N5 — Diversifiés dynamiques Maroc
```

---

## 2.2 Hiérarchie analytique d’une catégorie nationale

Chaque catégorie nationale possède un ensemble d’objets analytiques distincts.

```text
Catégorie nationale
├── Devise locale
├── Contextes EUR et USD
├── Fonds membres
├── Catégorie de comparaison
├── Indices officiels de référence
├── Indice national de catégorie nominal
├── Indice national de catégorie réel
├── Indice de marché AfricaFunds
├── Benchmark plateforme AfricaFunds
├── Taux sans risque
├── Courbe de taux
├── Méthodologie
├── Période de validité
└── Score de qualité
```

---

# 3. Domaines fonctionnels atomiques

Le système est divisé en onze domaines.

| Domaine | Responsabilité |
|---|---|
| Référentiel géographique | Continents, régions, pays, zones monétaires |
| Référentiel devises | Devises, paires FX, conventions |
| Taxonomie | Classes d’actifs, catégories et arbre N1 à N6 |
| Fonds | Fonds, portefeuilles, classes de parts, sociétés de gestion |
| Appartenance | Affectation historique des fonds aux catégories |
| Marché officiel | Indices officiels, taux, courbes, instruments |
| Méthodologies | Règles, versions, maturités CT/MT/LT, pondérations |
| Calculs | Rendements, indices de catégorie, benchmarks, conversions |
| Qualité | Couverture, anomalies, scores et statuts |
| Provenance | Sources, documents, fichiers, feuilles, cellules |
| Publication | Séries locale/EUR/USD, API, pages et exports |

---

# 4. Objets atomiques principaux

## 4.1 Référentiel

```text
GeographicEntity
Region
Country
MonetaryZone
Currency
Calendar
AssetClass
CategoryNode
CategoryCurrencyContext
```

## 4.2 Fonds

```text
ManagementCompany
FundPortfolio
Fund
ShareClass
FundCategoryMembership
FundNAVObservation
FundAUMObservation
FundDistribution
FundEvent
```

## 4.3 Données de marché

```text
OfficialIndex
OfficialIndexObservation
OfficialRateSeries
OfficialRateObservation
SovereignInstrument
InstrumentCashflow
InstrumentMarketObservation
InstrumentDailyValuation
YieldCurve
YieldCurvePoint
InflationSeries
InflationObservation
FXSeries
FXObservation
```

## 4.4 Méthodologie et calcul

```text
Methodology
MethodologyVersion
MaturityBucketRule
IndexDefinition
IndexComponent
IndexConstituentDaily
IndexDailyValue
CategoryDailyCalculation
CategoryDailyFundContribution
CalculationRun
QualityAssessment
```

## 4.5 Provenance

```text
SourceOrganization
SourceEndpoint
SourceDocument
RawFile
WorkbookSheet
SourceCell
ExtractionRun
ObservationProvenance
```

---

# 5. Architecture relationnelle proposée

## 5.1 Schémas PostgreSQL

```text
ref        Référentiels stables
fund       Fonds et sociétés de gestion
market     Données officielles de marché
method     Méthodologies et règles
calc       Calculs, indices et courbes
quality    Qualité, anomalies et validations
source     Provenance, documents et fichiers
publish    Séries et objets exposés par API
ops        Exécutions, files d’attente et supervision
```

---

# 6. Tables de référence

## 6.1 `ref.geographic_entities`

| Colonne | Type | Description |
|---|---|---|
| `geographic_entity_id` | UUID | Identifiant |
| `entity_type` | VARCHAR | CONTINENT, REGION, COUNTRY, MONETARY_ZONE |
| `code` | VARCHAR | AFR, NORTH_AFRICA, MAR, UEMOA |
| `name_fr` | VARCHAR | Libellé français |
| `name_en` | VARCHAR | Libellé anglais |
| `parent_entity_id` | UUID | Parent géographique |
| `valid_from` | DATE | Début de validité |
| `valid_to` | DATE | Fin de validité |

## 6.2 `ref.currencies`

| Colonne | Type | Description |
|---|---|---|
| `currency_code` | CHAR(3) | MAD, TND, EGP, XOF, GHS, NGN, KES, XAF, EUR, USD |
| `currency_name` | VARCHAR | Nom |
| `minor_unit` | SMALLINT | Nombre de décimales |
| `is_active` | BOOLEAN | Statut |

## 6.3 `ref.asset_classes`

| Colonne | Type | Description |
|---|---|---|
| `asset_class_id` | UUID | Identifiant |
| `asset_class_code` | VARCHAR | EQUITY, MONEY_MARKET, BOND, MULTI_ASSET |
| `name_fr` | VARCHAR | Actions, Monétaire, Obligations, Diversifiés |
| `display_order` | INTEGER | Ordre d’affichage |

## 6.4 `ref.category_nodes`

Table centrale de la hiérarchie N1 à N6.

| Colonne | Type | Description |
|---|---|---|
| `category_id` | UUID | Identifiant |
| `category_code` | VARCHAR | EQ-MAR, BOND-MAR-CT |
| `category_name` | VARCHAR | Actions Maroc |
| `parent_category_id` | UUID | Parent dans l’arbre |
| `asset_class_id` | UUID | Classe d’actifs |
| `hierarchy_level` | SMALLINT | 1 à 6 |
| `geographic_entity_id` | UUID | Afrique, région, pays ou zone |
| `local_currency_code` | CHAR(3) | Devise locale du marché |
| `category_type` | VARCHAR | ASSET_CLASS, CONTINENTAL, REGIONAL, NATIONAL, PROFILE, MATURITY_BUCKET |
| `valid_from` | DATE | Début |
| `valid_to` | DATE | Fin |
| `status` | VARCHAR | ACTIVE, HIDDEN, ARCHIVED |

## 6.5 `ref.category_currency_contexts`

| Colonne | Type | Description |
|---|---|---|
| `category_context_id` | UUID | Identifiant |
| `category_id` | UUID | Catégorie |
| `currency_code` | CHAR(3) | Locale, EUR ou USD |
| `context_type` | VARCHAR | LOCAL, CONVERTED |
| `is_primary` | BOOLEAN | Contexte local principal |
| `fx_series_id` | UUID | Série FX utilisée |
| `valid_from` | DATE | Début |
| `valid_to` | DATE | Fin |

---

# 7. Tables Fonds

## 7.1 `fund.management_companies`

```text
management_company_id
legal_name
commercial_name
country_id
regulator_identifier
status
valid_from
valid_to
```

## 7.2 `fund.fund_portfolios`

Un portefeuille économique peut porter plusieurs classes de parts.

```text
portfolio_id
portfolio_name
management_company_id
launch_date
liquidation_date
status
```

## 7.3 `fund.funds`

```text
fund_id
portfolio_id
legal_name
historical_name
country_id
legal_form
regulator_identifier
launch_date
liquidation_date
status
```

## 7.4 `fund.share_classes`

```text
share_class_id
fund_id
share_class_name
currency_code
distribution_policy
isin
initial_nav
launch_date
end_date
is_representative_class
```

## 7.5 `fund.fund_category_memberships`

| Colonne | Description |
|---|---|
| `membership_id` | Identifiant |
| `fund_id` | Fonds |
| `category_id` | Catégorie N4, N5 ou N6 |
| `valid_from` | Début d’appartenance |
| `valid_to` | Fin d’appartenance |
| `classification_source_type` | Régulateur, prospectus, portefeuille |
| `classification_confidence` | Confirmé, probable, à contrôler |
| `is_peer_group_eligible` | Appartient au groupe de comparaison |
| `is_category_index_eligible` | Peut participer à l’indice de catégorie |
| `exclusion_reason` | Motif |
| `methodology_version_id` | Version appliquée |

## 7.6 `fund.nav_observations`

```text
nav_observation_id
share_class_id
valuation_date
publication_date
nav_value
currency_code
distribution_adjusted_nav
previous_nav_observation_id
daily_return
quality_status
source_observation_id
created_at
```

---

# 8. Tables des indices officiels actions
