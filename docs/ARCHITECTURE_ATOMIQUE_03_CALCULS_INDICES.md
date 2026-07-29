# AfricaFunds — Indices AfricaFunds, calculs quotidiens, obligations, FX et inflation

> Partie de la spécification atomique de référence.


## 14.1 `calc.index_definitions`

```text
index_id
index_code
index_name
index_family
category_id
base_currency_code
base_date
base_value
return_type
calculation_method
methodology_version_id
valid_from
valid_to
publication_status
```

Familles :

```text
OFFICIAL_REFERENCE_COMPOSITE
CATEGORY_NOMINAL
CATEGORY_REAL
MARKET_TOTAL_RETURN
MARKET_CONSTANT_MATURITY
PLATFORM_BENCHMARK
```

## 14.2 `calc.index_components`

```text
index_component_id
index_id
component_type
component_index_id
component_official_index_id
component_rate_series_id
component_category_index_id
weight
valid_from
valid_to
methodology_version_id
```

---

# 15. Calcul quotidien des indices de catégorie

## 15.1 `calc.category_daily_calculations`

```text
category_daily_calculation_id
category_id
observation_date
currency_code
total_active_funds
total_eligible_funds
funds_valued_on_date
funds_used_in_calculation
funds_excluded
funds_without_nav
unique_portfolios_used
share_classes_observed
fund_coverage_ratio
aum_coverage_ratio
nominal_daily_return
real_daily_return
inflation_factor
quality_score
calculation_status
calculation_run_id
```

## 15.2 `calc.category_daily_fund_contributions`

```text
contribution_id
category_daily_calculation_id
fund_id
portfolio_id
share_class_id
nav_observation_id
fund_daily_return
fund_weight
included
exclusion_reason
```

---

# 16. Valorisation obligataire quotidienne

## 16.1 `calc.instrument_daily_valuations`

```text
instrument_daily_valuation_id
instrument_id
valuation_date
valuation_method
observed_clean_price
model_clean_price
selected_clean_price
accrued_interest
dirty_price
yield_used
curve_version_id
daily_total_return
quality_score
calculation_run_id
```

Valeurs possibles de `valuation_method` :

```text
OBSERVED_PRICE
INTERPOLATED_PRICE
MODEL_PRICED
CONSTANT_MATURITY_PROXY
```

## 16.2 Méthode de prix théorique

```text
Prix théorique(t)
= somme des flux futurs actualisés par la courbe du jour
```

## 16.3 Rendement total

```text
Rendement total(t)
=
[Prix sale(t) + flux reçus(t)] / Prix sale(t-1) - 1
```

---

# 17. Composition quotidienne des indices obligataires

## 17.1 `calc.index_constituents_daily`

```text
index_constituent_daily_id
index_id
observation_date
instrument_id
bucket_code
remaining_days
market_value
outstanding_amount
weight
valuation_id
included
exclusion_reason
calculation_run_id
```

## 17.2 `calc.index_daily_values`

```text
index_daily_value_id
index_id
observation_date
calculation_date
publication_date
currency_code
currency_context
previous_level
daily_return
index_level
fx_rate_used
fx_rate_date
inflation_factor_used
constituent_count
funds_used_count
coverage_ratio
quality_score
calculation_run_id
methodology_version_id
```

---

# 18. FX et conversion EUR/USD

## 18.1 `market.fx_series`

```text
fx_series_id
base_currency_code
quote_currency_code
provider_id
rate_type
valid_from
valid_to
```

## 18.2 `market.fx_observations`

```text
fx_observation_id
fx_series_id
observation_date
publication_date
fx_rate
is_official
is_triangulated
stale_days
quality_status
source_observation_id
```

## 18.3 Conversion des indices

```text
1 + rendement EUR(t)
=
[1 + rendement local(t)]
× [FX local/EUR(t) / FX local/EUR(t-1)]
```

La même règle s’applique au USD.

---

# 19. Inflation

## 19.1 `market.inflation_series`

```text
inflation_series_id
country_id
currency_code
provider_id
series_type
frequency
valid_from
valid_to
```

## 19.2 `market.inflation_observations`

```text
inflation_observation_id
inflation_series_id
reference_period
publication_date
cpi_level
monthly_inflation
yearly_inflation
quality_status
source_observation_id
```

## 19.3 Performance réelle

```text
1 + rendement réel(t)
=
[1 + rendement nominal(t)]
/ [1 + inflation journalière(t)]
```

---

# 20. Qualité et provenance
