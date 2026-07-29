# AfricaFunds — Indices officiels, taux, instruments, maturités et courbes

> Partie de la spécification atomique de référence.


## 8.1 `market.official_indices`

```text
official_index_id
index_code
index_name
provider_id
country_or_zone_id
asset_class_id
currency_code
return_type
weighting_method
base_date
base_value
is_official
methodology_document_id
valid_from
valid_to
status
```

## 8.2 `market.official_index_observations`

```text
official_index_observation_id
official_index_id
observation_date
publication_date
index_level
daily_return
currency_code
quality_status
source_observation_id
```

## 8.3 `market.category_official_index_links`

Relation plusieurs-à-plusieurs entre une catégorie nationale et ses indices officiels.

```text
category_official_index_link_id
category_id
official_index_id
reference_role
priority_order
benchmark_component_weight
is_primary_reference
is_platform_component
valid_from
valid_to
methodology_version_id
```

### Exemple Actions Maroc

```text
Actions Maroc
├── MASI
├── MASI Return Gross
├── MASI Return Net
├── FTSE CSE Morocco All-Liquid
└── autres références validées
```

---

# 9. Tables des séries de taux

## 9.1 `market.official_rate_series`

Une ligne par série de taux officielle.

| Colonne | Description |
|---|---|
| `rate_series_id` | Identifiant |
| `series_code` | MAR-MONIA, MAR-5Y, NGA-NTB-91D |
| `series_name` | Nom officiel |
| `provider_id` | Banque centrale, Trésor, bourse |
| `country_or_zone_id` | Marché |
| `currency_code` | Devise |
| `rate_family` | POLICY, OVERNIGHT, INTERBANK, BILL, BOND, REPO |
| `instrument_type` | Dépôt, bon, obligation, repo |
| `tenor_code` | ON, 1W, 3M, 2Y, 10Y |
| `tenor_days` | Durée normalisée |
| `rate_type` | YIELD, COUPON, DISCOUNT, ZERO_RATE, PAR_RATE |
| `day_count_basis` | ACT/360, ACT/365 |
| `frequency` | DAILY, WEEKLY, AUCTION |
| `valid_from` | Début |
| `valid_to` | Fin |

## 9.2 `market.official_rate_observations`

```text
rate_observation_id
rate_series_id
observation_date
publication_date
rate_value
bid_rate
ask_rate
weighted_average_rate
marginal_rate
volume
currency_code
quality_status
source_observation_id
```

---

# 10. Tables des instruments obligataires

## 10.1 `market.instruments`

```text
instrument_id
isin
instrument_code
issuer_id
country_or_zone_id
currency_code
instrument_type
issue_date
maturity_date
original_maturity_days
coupon_type
coupon_rate
coupon_frequency
nominal_value
outstanding_amount
status
```

## 10.2 `market.instrument_cashflows`

```text
cashflow_id
instrument_id
cashflow_date
cashflow_type
coupon_amount
principal_amount
currency_code
is_projected
is_paid
```

## 10.3 `market.instrument_market_observations`

```text
market_observation_id
instrument_id
observation_date
clean_price
dirty_price
accrued_interest
yield_to_maturity
bid_price
ask_price
reference_price
traded_volume
outstanding_amount
observation_type
quality_status
source_observation_id
```

---

# 11. Segmentation CT / MT / LT

## 11.1 `method.maturity_bucket_rules`

| Segment | Proposition initiale |
|---|---|
| Monétaire | 0 à 1 an inclus |
| Obligations CT | Plus de 1 an à 3 ans inclus |
| Obligations MT | Plus de 3 ans à 7 ans inclus |
| Obligations LT | Plus de 7 ans |

```text
maturity_bucket_rule_id
market_id
category_id
bucket_code
minimum_remaining_days_exclusive
maximum_remaining_days_inclusive
valid_from
valid_to
methodology_version_id
```

## 11.2 `calc.instrument_bucket_memberships`

Une ligne par instrument et par date.

```text
instrument_bucket_membership_id
instrument_id
calculation_date
remaining_days
bucket_code
category_id
rule_id
included
exclusion_reason
calculation_run_id
```

Un titre initialement émis à dix ans peut passer de LT à MT puis à CT selon sa maturité résiduelle.

---

# 12. Courbes de taux

## 12.1 `calc.yield_curves`

```text
yield_curve_id
curve_code
curve_name
country_or_zone_id
currency_code
curve_type
methodology_version_id
valid_from
valid_to
```

## 12.2 `calc.yield_curve_daily_versions`

```text
yield_curve_daily_version_id
yield_curve_id
curve_date
interpolation_method
number_of_observed_points
number_of_interpolated_points
quality_score
calculation_run_id
```

## 12.3 `calc.yield_curve_points`

```text
yield_curve_point_id
yield_curve_daily_version_id
tenor_code
tenor_days
observed_rate
fitted_rate
zero_rate
par_rate
forward_rate
is_observed
source_rate_observation_id
```

Points cibles :

```text
ON, 1W, 1M, 3M, 6M, 9M, 1Y,
2Y, 3Y, 5Y, 7Y, 10Y, 15Y, 20Y, 25Y, 30Y
```

---

# 13. Méthodologies

## 13.1 `method.methodologies`

```text
methodology_id
methodology_code
methodology_name
methodology_type
owner
status
```

## 13.2 `method.methodology_versions`

```text
methodology_version_id
methodology_id
version_number
effective_from
effective_to
parameters_json
document_id
approval_status
approved_by
approved_at
```

Types de méthodologie :

```text
CATEGORY_CLASSIFICATION
CATEGORY_INDEX
OFFICIAL_COMPOSITE
MONEY_MARKET_INDEX
BOND_TOTAL_RETURN
BOND_MODEL_PRICED
CONSTANT_MATURITY
PLATFORM_BENCHMARK
FX_CONVERSION
INFLATION_ADJUSTMENT
QUALITY_SCORING
```

---

# 14. Définition des indices AfricaFunds
