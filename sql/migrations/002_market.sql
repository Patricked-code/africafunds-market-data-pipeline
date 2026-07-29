CREATE TABLE IF NOT EXISTS market.raw_records (
  raw_record_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_artifact_id uuid NOT NULL REFERENCES source.raw_artifacts(raw_artifact_id),
  endpoint_code text NOT NULL REFERENCES source.source_endpoints(endpoint_code),
  market_code text NOT NULL REFERENCES ref.markets(market_code),
  data_family text NOT NULL,
  sheet_name text,
  row_number integer NOT NULL,
  payload jsonb NOT NULL,
  normalized_at timestamptz,
  normalization_status text NOT NULL DEFAULT 'PENDING',
  UNIQUE(raw_artifact_id, sheet_name, row_number)
);

CREATE INDEX IF NOT EXISTS raw_records_family_idx ON market.raw_records(market_code, data_family);
CREATE INDEX IF NOT EXISTS raw_records_payload_gin ON market.raw_records USING gin(payload);

CREATE TABLE IF NOT EXISTS market.official_indices (
  official_index_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code text NOT NULL REFERENCES ref.markets(market_code),
  index_code text NOT NULL,
  index_name text NOT NULL,
  provider_institution_id uuid REFERENCES ref.institutions(institution_id),
  currency_code char(3) NOT NULL REFERENCES ref.currencies(currency_code),
  return_type text NOT NULL DEFAULT 'PRICE_RETURN',
  weighting_method text,
  base_date date,
  base_value numeric(24,8),
  methodology_url text,
  valid_from date,
  valid_to date,
  status text NOT NULL DEFAULT 'ACTIVE',
  UNIQUE(market_code, index_code)
);

CREATE TABLE IF NOT EXISTS market.official_index_observations (
  official_index_observation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  official_index_id uuid NOT NULL REFERENCES market.official_indices(official_index_id),
  observation_date date NOT NULL,
  publication_date date,
  index_level numeric(24,8) NOT NULL,
  daily_return numeric(18,10),
  market_capitalisation numeric(30,4),
  turnover numeric(30,4),
  raw_record_id uuid REFERENCES market.raw_records(raw_record_id),
  quality_status text NOT NULL DEFAULT 'PROVISIONAL',
  revision_number integer NOT NULL DEFAULT 1,
  UNIQUE(official_index_id, observation_date, revision_number)
);

CREATE TABLE IF NOT EXISTS market.official_rate_series (
  rate_series_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code text NOT NULL REFERENCES ref.markets(market_code),
  series_code text NOT NULL,
  series_name text NOT NULL,
  provider_institution_id uuid REFERENCES ref.institutions(institution_id),
  currency_code char(3) NOT NULL REFERENCES ref.currencies(currency_code),
  rate_family text NOT NULL,
  instrument_type text,
  tenor_code text,
  tenor_days integer,
  rate_type text NOT NULL,
  day_count_basis text,
  frequency text NOT NULL,
  valid_from date,
  valid_to date,
  UNIQUE(market_code, series_code)
);

CREATE TABLE IF NOT EXISTS market.official_rate_observations (
  rate_observation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_series_id uuid NOT NULL REFERENCES market.official_rate_series(rate_series_id),
  observation_date date NOT NULL,
  publication_date date,
  rate_value numeric(18,10),
  bid_rate numeric(18,10),
  ask_rate numeric(18,10),
  weighted_average_rate numeric(18,10),
  marginal_rate numeric(18,10),
  volume numeric(30,4),
  amount_offered numeric(30,4),
  amount_accepted numeric(30,4),
  raw_record_id uuid REFERENCES market.raw_records(raw_record_id),
  quality_status text NOT NULL DEFAULT 'PROVISIONAL',
  revision_number integer NOT NULL DEFAULT 1,
  UNIQUE(rate_series_id, observation_date, revision_number)
);

CREATE TABLE IF NOT EXISTS market.instruments (
  instrument_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code text NOT NULL REFERENCES ref.markets(market_code),
  isin text,
  instrument_code text NOT NULL,
  issuer_name text NOT NULL,
  currency_code char(3) NOT NULL REFERENCES ref.currencies(currency_code),
  instrument_type text NOT NULL,
  issue_date date,
  maturity_date date NOT NULL,
  original_maturity_days integer,
  coupon_type text,
  coupon_rate numeric(18,10),
  coupon_frequency smallint,
  nominal_value numeric(30,8),
  outstanding_amount numeric(30,4),
  status text NOT NULL DEFAULT 'ACTIVE',
  UNIQUE(market_code, instrument_code)
);

CREATE TABLE IF NOT EXISTS market.instrument_cashflows (
  cashflow_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id uuid NOT NULL REFERENCES market.instruments(instrument_id),
  cashflow_date date NOT NULL,
  cashflow_type text NOT NULL,
  coupon_amount numeric(30,8),
  principal_amount numeric(30,8),
  currency_code char(3) NOT NULL REFERENCES ref.currencies(currency_code),
  is_projected boolean NOT NULL DEFAULT true,
  is_paid boolean NOT NULL DEFAULT false,
  UNIQUE(instrument_id, cashflow_date, cashflow_type)
);

CREATE TABLE IF NOT EXISTS market.instrument_market_observations (
  market_observation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id uuid NOT NULL REFERENCES market.instruments(instrument_id),
  observation_date date NOT NULL,
  clean_price numeric(24,8),
  dirty_price numeric(24,8),
  accrued_interest numeric(24,8),
  yield_to_maturity numeric(18,10),
  bid_price numeric(24,8),
  ask_price numeric(24,8),
  reference_price numeric(24,8),
  traded_volume numeric(30,4),
  outstanding_amount numeric(30,4),
  observation_type text NOT NULL,
  raw_record_id uuid REFERENCES market.raw_records(raw_record_id),
  quality_status text NOT NULL DEFAULT 'PROVISIONAL',
  UNIQUE(instrument_id, observation_date, observation_type)
);

CREATE TABLE IF NOT EXISTS market.fx_observations (
  fx_observation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_date date NOT NULL,
  base_currency_code char(3) NOT NULL REFERENCES ref.currencies(currency_code),
  quote_currency_code char(3) NOT NULL REFERENCES ref.currencies(currency_code),
  fx_rate numeric(24,12) NOT NULL CHECK (fx_rate > 0),
  rate_type text NOT NULL,
  provider text NOT NULL,
  is_official boolean NOT NULL DEFAULT false,
  is_triangulated boolean NOT NULL DEFAULT false,
  raw_record_id uuid REFERENCES market.raw_records(raw_record_id),
  quality_status text NOT NULL DEFAULT 'PROVISIONAL',
  UNIQUE(observation_date, base_currency_code, quote_currency_code, rate_type, provider)
);

CREATE TABLE IF NOT EXISTS market.inflation_observations (
  inflation_observation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code text NOT NULL REFERENCES ref.markets(market_code),
  reference_period date NOT NULL,
  publication_date date,
  cpi_level numeric(24,8),
  monthly_inflation numeric(18,10),
  annual_inflation numeric(18,10),
  provider text NOT NULL,
  raw_record_id uuid REFERENCES market.raw_records(raw_record_id),
  quality_status text NOT NULL DEFAULT 'PROVISIONAL',
  UNIQUE(market_code, reference_period, provider)
);

