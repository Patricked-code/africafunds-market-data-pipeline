CREATE TABLE IF NOT EXISTS method.methodology_versions (
  methodology_version_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  methodology_code text NOT NULL,
  version_number text NOT NULL,
  methodology_type text NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  document_url text,
  approval_status text NOT NULL DEFAULT 'DRAFT',
  UNIQUE(methodology_code, version_number)
);

CREATE TABLE IF NOT EXISTS method.maturity_bucket_rules (
  maturity_bucket_rule_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code text REFERENCES ref.markets(market_code),
  bucket_code text NOT NULL CHECK (bucket_code IN ('MONEY_MARKET','BOND_CT','BOND_MT','BOND_LT')),
  minimum_remaining_days_exclusive integer,
  maximum_remaining_days_inclusive integer,
  effective_from date NOT NULL,
  effective_to date,
  methodology_version_id uuid REFERENCES method.methodology_versions(methodology_version_id),
  UNIQUE(market_code, bucket_code, effective_from)
);

CREATE TABLE IF NOT EXISTS calc.yield_curves (
  yield_curve_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curve_code text NOT NULL UNIQUE,
  curve_name text NOT NULL,
  market_code text NOT NULL REFERENCES ref.markets(market_code),
  currency_code char(3) NOT NULL REFERENCES ref.currencies(currency_code),
  curve_type text NOT NULL,
  methodology_version_id uuid REFERENCES method.methodology_versions(methodology_version_id),
  valid_from date,
  valid_to date
);

CREATE TABLE IF NOT EXISTS calc.yield_curve_daily_versions (
  yield_curve_daily_version_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  yield_curve_id uuid NOT NULL REFERENCES calc.yield_curves(yield_curve_id),
  curve_date date NOT NULL,
  interpolation_method text NOT NULL,
  observed_point_count integer NOT NULL,
  interpolated_point_count integer NOT NULL,
  quality_score numeric(5,2),
  calculation_run_id uuid,
  UNIQUE(yield_curve_id, curve_date)
);

CREATE TABLE IF NOT EXISTS calc.yield_curve_points (
  yield_curve_point_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  yield_curve_daily_version_id uuid NOT NULL REFERENCES calc.yield_curve_daily_versions(yield_curve_daily_version_id),
  tenor_code text NOT NULL,
  tenor_days integer NOT NULL,
  observed_rate numeric(18,10),
  fitted_rate numeric(18,10),
  zero_rate numeric(18,10),
  par_rate numeric(18,10),
  forward_rate numeric(18,10),
  is_observed boolean NOT NULL,
  source_rate_observation_id uuid REFERENCES market.official_rate_observations(rate_observation_id),
  UNIQUE(yield_curve_daily_version_id, tenor_days)
);

CREATE TABLE IF NOT EXISTS calc.index_definitions (
  index_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  index_code text NOT NULL UNIQUE,
  index_name text NOT NULL,
  index_family text NOT NULL,
  category_id uuid REFERENCES ref.category_nodes(category_id),
  market_code text REFERENCES ref.markets(market_code),
  base_currency_code char(3) NOT NULL REFERENCES ref.currencies(currency_code),
  base_date date NOT NULL,
  base_value numeric(24,8) NOT NULL DEFAULT 100,
  return_type text NOT NULL,
  calculation_method text NOT NULL,
  methodology_version_id uuid REFERENCES method.methodology_versions(methodology_version_id),
  publication_status text NOT NULL DEFAULT 'DRAFT',
  valid_from date,
  valid_to date
);

CREATE TABLE IF NOT EXISTS calc.index_components (
  index_component_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  index_id uuid NOT NULL REFERENCES calc.index_definitions(index_id),
  component_type text NOT NULL,
  official_index_id uuid REFERENCES market.official_indices(official_index_id),
  rate_series_id uuid REFERENCES market.official_rate_series(rate_series_id),
  component_index_id uuid REFERENCES calc.index_definitions(index_id),
  weight numeric(18,10),
  valid_from date NOT NULL,
  valid_to date
);

CREATE TABLE IF NOT EXISTS calc.instrument_daily_valuations (
  instrument_daily_valuation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id uuid NOT NULL REFERENCES market.instruments(instrument_id),
  valuation_date date NOT NULL,
  valuation_method text NOT NULL,
  observed_clean_price numeric(24,8),
  model_clean_price numeric(24,8),
  selected_clean_price numeric(24,8),
  accrued_interest numeric(24,8),
  dirty_price numeric(24,8),
  yield_used numeric(18,10),
  yield_curve_daily_version_id uuid REFERENCES calc.yield_curve_daily_versions(yield_curve_daily_version_id),
  daily_total_return numeric(18,10),
  modified_duration numeric(18,10),
  convexity numeric(18,10),
  dv01 numeric(24,10),
  quality_score numeric(5,2),
  UNIQUE(instrument_id, valuation_date)
);

CREATE TABLE IF NOT EXISTS calc.instrument_bucket_memberships (
  instrument_bucket_membership_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id uuid NOT NULL REFERENCES market.instruments(instrument_id),
  calculation_date date NOT NULL,
  remaining_days integer NOT NULL,
  bucket_code text NOT NULL,
  category_id uuid REFERENCES ref.category_nodes(category_id),
  rule_id uuid REFERENCES method.maturity_bucket_rules(maturity_bucket_rule_id),
  included boolean NOT NULL,
  exclusion_reason text,
  UNIQUE(instrument_id, calculation_date)
);

CREATE TABLE IF NOT EXISTS calc.index_constituents_daily (
  index_constituent_daily_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  index_id uuid NOT NULL REFERENCES calc.index_definitions(index_id),
  observation_date date NOT NULL,
  instrument_id uuid REFERENCES market.instruments(instrument_id),
  fund_id uuid,
  bucket_code text,
  remaining_days integer,
  market_value numeric(30,8),
  outstanding_amount numeric(30,8),
  weight numeric(18,10) NOT NULL,
  valuation_id uuid REFERENCES calc.instrument_daily_valuations(instrument_daily_valuation_id),
  included boolean NOT NULL,
  exclusion_reason text
);

CREATE TABLE IF NOT EXISTS calc.index_daily_values (
  index_daily_value_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  index_id uuid NOT NULL REFERENCES calc.index_definitions(index_id),
  observation_date date NOT NULL,
  calculation_date date NOT NULL,
  publication_date date,
  currency_code char(3) NOT NULL REFERENCES ref.currencies(currency_code),
  currency_context text NOT NULL CHECK (currency_context IN ('LOCAL','CONVERTED')),
  previous_level numeric(24,8),
  daily_return numeric(18,10),
  index_level numeric(24,8) NOT NULL,
  fx_rate_used numeric(24,12),
  fx_rate_date date,
  inflation_factor_used numeric(18,12),
  constituent_count integer,
  funds_used_count integer,
  coverage_ratio numeric(8,6),
  quality_score numeric(5,2),
  methodology_version_id uuid REFERENCES method.methodology_versions(methodology_version_id),
  revision_number integer NOT NULL DEFAULT 1,
  UNIQUE(index_id, observation_date, currency_code, revision_number)
);
