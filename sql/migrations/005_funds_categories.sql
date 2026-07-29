CREATE TABLE IF NOT EXISTS fund.management_companies (
  management_company_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text NOT NULL,
  commercial_name text,
  market_code text REFERENCES ref.markets(market_code),
  regulator_identifier text,
  status text NOT NULL DEFAULT 'ACTIVE',
  valid_from date,
  valid_to date
);

CREATE TABLE IF NOT EXISTS fund.fund_portfolios (
  portfolio_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_name text NOT NULL,
  management_company_id uuid REFERENCES fund.management_companies(management_company_id),
  launch_date date,
  liquidation_date date,
  status text NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS fund.funds (
  fund_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid REFERENCES fund.fund_portfolios(portfolio_id),
  legal_name text NOT NULL,
  market_code text REFERENCES ref.markets(market_code),
  regulator_identifier text,
  launch_date date,
  liquidation_date date,
  status text NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS fund.share_classes (
  share_class_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES fund.funds(fund_id),
  share_class_name text NOT NULL,
  currency_code char(3) NOT NULL REFERENCES ref.currencies(currency_code),
  distribution_policy text,
  isin text,
  initial_nav numeric(24,8),
  launch_date date,
  end_date date,
  is_representative_class boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS fund.fund_category_memberships (
  membership_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES fund.funds(fund_id),
  category_id uuid NOT NULL REFERENCES ref.category_nodes(category_id),
  valid_from date NOT NULL,
  valid_to date,
  classification_source_type text,
  classification_confidence text NOT NULL DEFAULT 'TO_REVIEW',
  is_peer_group_eligible boolean NOT NULL DEFAULT true,
  is_category_index_eligible boolean NOT NULL DEFAULT true,
  exclusion_reason text,
  methodology_version_id uuid REFERENCES method.methodology_versions(methodology_version_id),
  CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE TABLE IF NOT EXISTS fund.nav_observations (
  nav_observation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_class_id uuid NOT NULL REFERENCES fund.share_classes(share_class_id),
  valuation_date date NOT NULL,
  publication_date date,
  nav_value numeric(24,8) NOT NULL,
  currency_code char(3) NOT NULL REFERENCES ref.currencies(currency_code),
  distribution_adjusted_nav numeric(24,8),
  previous_nav_observation_id uuid REFERENCES fund.nav_observations(nav_observation_id),
  daily_return numeric(18,10),
  raw_record_id uuid REFERENCES market.raw_records(raw_record_id),
  quality_status text NOT NULL DEFAULT 'PROVISIONAL',
  revision_number integer NOT NULL DEFAULT 1,
  UNIQUE(share_class_id, valuation_date, revision_number)
);

CREATE TABLE IF NOT EXISTS calc.category_daily_calculations (
  category_daily_calculation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES ref.category_nodes(category_id),
  observation_date date NOT NULL,
  currency_code char(3) NOT NULL REFERENCES ref.currencies(currency_code),
  total_active_funds integer NOT NULL,
  total_eligible_funds integer NOT NULL,
  funds_valued_on_date integer NOT NULL,
  funds_used_in_calculation integer NOT NULL,
  funds_excluded integer NOT NULL DEFAULT 0,
  funds_without_nav integer NOT NULL DEFAULT 0,
  unique_portfolios_used integer,
  share_classes_observed integer,
  fund_coverage_ratio numeric(8,6),
  aum_coverage_ratio numeric(8,6),
  nominal_daily_return numeric(18,10),
  real_daily_return numeric(18,10),
  inflation_factor numeric(18,12),
  quality_score numeric(5,2),
  calculation_status text NOT NULL,
  ingestion_run_id uuid REFERENCES ops.ingestion_runs(ingestion_run_id),
  UNIQUE(category_id, observation_date, currency_code)
);

CREATE TABLE IF NOT EXISTS calc.category_daily_fund_contributions (
  contribution_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_daily_calculation_id uuid NOT NULL REFERENCES calc.category_daily_calculations(category_daily_calculation_id),
  fund_id uuid NOT NULL REFERENCES fund.funds(fund_id),
  portfolio_id uuid REFERENCES fund.fund_portfolios(portfolio_id),
  share_class_id uuid REFERENCES fund.share_classes(share_class_id),
  nav_observation_id uuid REFERENCES fund.nav_observations(nav_observation_id),
  fund_daily_return numeric(18,10),
  fund_weight numeric(18,10),
  included boolean NOT NULL,
  exclusion_reason text
);
