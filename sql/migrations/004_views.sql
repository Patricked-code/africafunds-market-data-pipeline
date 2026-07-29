CREATE OR REPLACE VIEW publish.latest_source_health AS
SELECT DISTINCT ON (endpoint_code)
  endpoint_code, checked_at, http_status, latency_ms, final_url, content_type, is_available, error_message
FROM quality.source_health_checks
ORDER BY endpoint_code, checked_at DESC;

CREATE OR REPLACE VIEW publish.latest_index_values AS
SELECT DISTINCT ON (index_id, currency_code)
  index_id, observation_date, currency_code, currency_context, index_level, daily_return,
  constituent_count, funds_used_count, coverage_ratio, quality_score, publication_date
FROM calc.index_daily_values
ORDER BY index_id, currency_code, observation_date DESC, revision_number DESC;

CREATE OR REPLACE VIEW publish.rate_term_structure AS
SELECT
  s.market_code,
  s.currency_code,
  s.series_code,
  s.series_name,
  s.rate_family,
  s.tenor_code,
  s.tenor_days,
  o.observation_date,
  COALESCE(o.weighted_average_rate, o.rate_value, o.marginal_rate) AS selected_rate,
  o.quality_status
FROM market.official_rate_series s
JOIN market.official_rate_observations o USING(rate_series_id);

CREATE OR REPLACE VIEW publish.backfill_progress AS
SELECT
  endpoint_code,
  count(*) AS total_jobs,
  count(*) FILTER (WHERE status='SUCCESS') AS successful_jobs,
  count(*) FILTER (WHERE status IN ('PENDING','RETRY')) AS pending_jobs,
  count(*) FILTER (WHERE status='FAILED') AS failed_jobs,
  min(window_from) AS history_from,
  max(window_to) AS history_to
FROM ops.backfill_jobs
GROUP BY endpoint_code;
