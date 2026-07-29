CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS ref;
CREATE SCHEMA IF NOT EXISTS source;
CREATE SCHEMA IF NOT EXISTS market;
CREATE SCHEMA IF NOT EXISTS fund;
CREATE SCHEMA IF NOT EXISTS method;
CREATE SCHEMA IF NOT EXISTS calc;
CREATE SCHEMA IF NOT EXISTS quality;
CREATE SCHEMA IF NOT EXISTS publish;
CREATE SCHEMA IF NOT EXISTS ops;

CREATE TABLE IF NOT EXISTS ref.markets (
  market_code text PRIMARY KEY,
  market_name text NOT NULL,
  currency_code char(3) NOT NULL,
  all_share_index_name text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ref.institutions (
  institution_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code text NOT NULL REFERENCES ref.markets(market_code),
  institution_type text NOT NULL,
  institution_name text NOT NULL,
  website_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(market_code, institution_type)
);

CREATE TABLE IF NOT EXISTS ref.currencies (
  currency_code char(3) PRIMARY KEY,
  currency_name text,
  minor_unit smallint NOT NULL DEFAULT 2,
  active boolean NOT NULL DEFAULT true
);

INSERT INTO ref.currencies(currency_code, currency_name) VALUES
  ('MAD','Dirham marocain'),('GHS','Cedi ghanéen'),('XOF','Franc CFA BCEAO'),
  ('TND','Dinar tunisien'),('EGP','Livre égyptienne'),('NGN','Naira nigérian'),
  ('KES','Shilling kényan'),('XAF','Franc CFA BEAC'),('BWP','Pula botswanais'),
  ('NAD','Dollar namibien'),('ETB','Birr éthiopien'),('EUR','Euro'),('USD','Dollar américain')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS ref.category_nodes (
  category_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code text NOT NULL UNIQUE,
  category_name text NOT NULL,
  parent_category_id uuid REFERENCES ref.category_nodes(category_id),
  hierarchy_level smallint NOT NULL CHECK (hierarchy_level BETWEEN 1 AND 6),
  asset_class text NOT NULL,
  market_code text REFERENCES ref.markets(market_code),
  local_currency_code char(3) REFERENCES ref.currencies(currency_code),
  category_type text NOT NULL,
  valid_from date NOT NULL DEFAULT current_date,
  valid_to date,
  status text NOT NULL DEFAULT 'ACTIVE',
  CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE TABLE IF NOT EXISTS ref.category_currency_contexts (
  category_context_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES ref.category_nodes(category_id),
  currency_code char(3) NOT NULL REFERENCES ref.currencies(currency_code),
  context_type text NOT NULL CHECK (context_type IN ('LOCAL','CONVERTED')),
  is_primary boolean NOT NULL DEFAULT false,
  valid_from date NOT NULL,
  valid_to date,
  UNIQUE(category_id, currency_code, valid_from)
);

CREATE TABLE IF NOT EXISTS source.source_endpoints (
  endpoint_code text PRIMARY KEY,
  market_code text NOT NULL REFERENCES ref.markets(market_code),
  label text NOT NULL,
  url text NOT NULL,
  data_family text NOT NULL,
  collector_type text NOT NULL,
  frequency text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  robots_checked_at timestamptz,
  terms_review_status text NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS source.raw_artifacts (
  raw_artifact_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_code text NOT NULL REFERENCES source.source_endpoints(endpoint_code),
  parent_artifact_id uuid REFERENCES source.raw_artifacts(raw_artifact_id),
  source_url text NOT NULL,
  final_url text NOT NULL,
  fetched_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  http_status integer NOT NULL,
  content_type text,
  etag text,
  last_modified text,
  sha256 char(64) NOT NULL,
  byte_size bigint NOT NULL,
  archive_path text NOT NULL,
  response_headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  parse_status text NOT NULL DEFAULT 'PENDING',
  UNIQUE(endpoint_code, sha256)
);

CREATE INDEX IF NOT EXISTS raw_artifacts_fetched_idx ON source.raw_artifacts(endpoint_code, fetched_at DESC);
