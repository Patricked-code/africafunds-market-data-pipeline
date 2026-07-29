CREATE TABLE IF NOT EXISTS ops.ingestion_runs (
  ingestion_run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text
);

CREATE TABLE IF NOT EXISTS ops.backfill_jobs (
  backfill_job_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_code text NOT NULL REFERENCES source.source_endpoints(endpoint_code),
  window_from date NOT NULL,
  window_to date NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  attempts integer NOT NULL DEFAULT 0,
  locked_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (window_to >= window_from),
  UNIQUE(endpoint_code, window_from, window_to)
);

CREATE INDEX IF NOT EXISTS backfill_pending_idx ON ops.backfill_jobs(status, window_from);

CREATE TABLE IF NOT EXISTS quality.assessments (
  quality_assessment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_type text NOT NULL,
  object_id uuid NOT NULL,
  assessment_date date NOT NULL,
  coverage_score numeric(5,2),
  freshness_score numeric(5,2),
  source_score numeric(5,2),
  methodology_score numeric(5,2),
  anomaly_score numeric(5,2),
  overall_score numeric(5,2) NOT NULL,
  quality_status text NOT NULL,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quality.source_health_checks (
  source_health_check_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_code text NOT NULL REFERENCES source.source_endpoints(endpoint_code),
  checked_at timestamptz NOT NULL,
  http_status integer,
  latency_ms integer,
  final_url text,
  content_type text,
  is_available boolean NOT NULL,
  error_message text
);

CREATE INDEX IF NOT EXISTS source_health_endpoint_idx ON quality.source_health_checks(endpoint_code, checked_at DESC);

ALTER TABLE calc.yield_curve_daily_versions
  ADD CONSTRAINT yield_curve_calc_run_fk
  FOREIGN KEY (calculation_run_id) REFERENCES ops.ingestion_runs(ingestion_run_id);
