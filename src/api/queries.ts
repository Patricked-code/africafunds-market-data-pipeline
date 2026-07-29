import { pool } from '../db/pool.js';

export async function tableExists(schema: string, table: string): Promise<boolean> {
  const result = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema=$1 AND table_name=$2
     ) AS exists`,
    [schema, table],
  );
  return Boolean(result.rows[0]?.exists);
}

export async function health(): Promise<Record<string, unknown>> {
  const result = await pool.query<{ now: string }>('SELECT now()::text AS now');
  return { ok: true, service: 'africafunds-market-data-api', database: 'up', database_time: result.rows[0]?.now };
}

export async function statusSummary(): Promise<Record<string, unknown>> {
  const [marketCount, sourceCount, rateCount, indexCount, runsExist, jobsExist] = await Promise.all([
    pool.query<{ count: string }>('SELECT count(*)::text AS count FROM ref.markets WHERE active=true'),
    pool.query<{ count: string }>('SELECT count(*)::text AS count FROM source.source_endpoints WHERE enabled=true'),
    pool.query<{ count: string }>('SELECT count(*)::text AS count FROM market.official_rate_observations'),
    pool.query<{ count: string }>('SELECT count(*)::text AS count FROM calc.index_daily_values'),
    tableExists('ops', 'ingestion_runs'),
    tableExists('ops', 'backfill_jobs'),
  ]);
  const lastRun = runsExist
    ? (await pool.query(`SELECT job_type,status,started_at,finished_at,summary,error_message FROM ops.ingestion_runs ORDER BY started_at DESC LIMIT 1`)).rows[0] ?? null
    : null;
  const backfill = jobsExist
    ? (await pool.query(`SELECT count(*) FILTER (WHERE status='PENDING')::int AS pending,
      count(*) FILTER (WHERE status='SUCCESS')::int AS success,
      count(*) FILTER (WHERE status='RETRY')::int AS retry,
      count(*) FILTER (WHERE status='FAILED')::int AS failed,
      count(*) FILTER (WHERE status='BLOCKED_ADAPTER')::int AS blocked_adapter FROM ops.backfill_jobs`)).rows[0]
    : { pending: 0, success: 0, retry: 0, failed: 0, blocked_adapter: 0 };
  return {
    ok: true,
    counts: {
      markets: Number(marketCount.rows[0]?.count ?? 0),
      enabled_sources: Number(sourceCount.rows[0]?.count ?? 0),
      rate_observations: Number(rateCount.rows[0]?.count ?? 0),
      index_values: Number(indexCount.rows[0]?.count ?? 0),
    },
    backfill,
    last_run: lastRun,
  };
}

export async function markets(): Promise<unknown[]> {
  const result = await pool.query(`SELECT m.market_code,m.market_name,m.currency_code,m.all_share_index_name,
    count(DISTINCT s.endpoint_code)::int AS source_count,
    count(DISTINCT i.index_id)::int AS official_index_count,
    count(DISTINCT r.rate_series_id)::int AS rate_series_count
    FROM ref.markets m
    LEFT JOIN source.source_endpoints s ON s.market_code=m.market_code AND s.enabled=true
    LEFT JOIN market.official_indices i ON i.market_code=m.market_code
    LEFT JOIN market.official_rate_series r ON r.market_code=m.market_code
    WHERE m.active=true GROUP BY m.market_code,m.market_name,m.currency_code,m.all_share_index_name ORDER BY m.market_name`);
  return result.rows;
}

export async function sources(url: URL): Promise<unknown[]> {
  const market = url.searchParams.get('market');
  const family = url.searchParams.get('family');
  const values: unknown[] = [];
  const clauses = ['enabled=true'];
  if (market) { values.push(market); clauses.push(`market_code=$${values.length}`); }
  if (family) { values.push(family); clauses.push(`data_family=$${values.length}`); }
  const result = await pool.query(`SELECT endpoint_code,market_code,label,url,data_family,collector_type,frequency,enabled,updated_at
    FROM source.source_endpoints WHERE ${clauses.join(' AND ')} ORDER BY market_code,data_family,endpoint_code`, values);
  return result.rows;
}

export async function runs(limit: number): Promise<unknown[]> {
  if (!(await tableExists('ops','ingestion_runs'))) return [];
  return (await pool.query(`SELECT ingestion_run_id,job_type,scope,status,started_at,finished_at,summary,error_message
    FROM ops.ingestion_runs ORDER BY started_at DESC LIMIT $1`, [limit])).rows;
}

export async function backfill(limit: number): Promise<unknown[]> {
  if (!(await tableExists('ops','backfill_jobs'))) return [];
  return (await pool.query(`SELECT backfill_job_id,endpoint_code,window_from,window_to,status,attempts,started_at,finished_at,last_error
    FROM ops.backfill_jobs ORDER BY created_at DESC LIMIT $1`, [limit])).rows;
}

export async function indices(url: URL, limit: number): Promise<unknown[]> {
  const market = url.searchParams.get('market');
  const currency = url.searchParams.get('currency');
  const values: unknown[] = [];
  const clauses: string[] = [];
  if (market) { values.push(market); clauses.push(`d.market_code=$${values.length}`); }
  if (currency) { values.push(currency); clauses.push(`v.currency_code=$${values.length}`); }
  values.push(limit);
  return (await pool.query(`SELECT d.index_code,d.index_name,d.market_code,v.observation_date,v.currency_code,v.index_level,v.daily_return,v.quality_score
    FROM calc.index_daily_values v JOIN calc.index_definitions d ON d.index_id=v.index_id
    ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
    ORDER BY v.observation_date DESC,d.index_code LIMIT $${values.length}`, values)).rows;
}

export async function rates(url: URL, limit: number): Promise<unknown[]> {
  const market = url.searchParams.get('market');
  const family = url.searchParams.get('family');
  const values: unknown[] = [];
  const clauses: string[] = [];
  if (market) { values.push(market); clauses.push(`s.market_code=$${values.length}`); }
  if (family) { values.push(family); clauses.push(`s.rate_family=$${values.length}`); }
  values.push(limit);
  return (await pool.query(`SELECT s.series_code,s.series_name,s.market_code,s.currency_code,s.rate_family,s.tenor_code,s.tenor_days,
    o.observation_date,COALESCE(o.weighted_average_rate,o.rate_value,o.marginal_rate) AS selected_rate,o.quality_status
    FROM market.official_rate_series s JOIN market.official_rate_observations o USING(rate_series_id)
    ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
    ORDER BY o.observation_date DESC,s.series_code LIMIT $${values.length}`, values)).rows;
}
