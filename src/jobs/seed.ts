import { loadRegistry } from '../config/registry.js';
import { withTransaction } from '../db/pool.js';
import { logger } from '../config/logger.js';

export async function seedRegistry(): Promise<void> {
  const registry = await loadRegistry();
  await withTransaction(async (client) => {
    for (const market of registry.markets) {
      await client.query(
        `INSERT INTO ref.markets(market_code, market_name, currency_code, all_share_index_name)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT(market_code) DO UPDATE SET
           market_name=EXCLUDED.market_name,
           currency_code=EXCLUDED.currency_code,
           all_share_index_name=EXCLUDED.all_share_index_name,
           updated_at=now()`,
        [market.code, market.name, market.currency, market.allShareIndex],
      );
      for (const [type, institution] of Object.entries(market.institutions) as Array<[string, { name: string; url: string }]>) {
        await client.query(
          `INSERT INTO ref.institutions(market_code, institution_type, institution_name, website_url)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT(market_code, institution_type) DO UPDATE SET
             institution_name=EXCLUDED.institution_name,
             website_url=EXCLUDED.website_url,
             updated_at=now()`,
          [market.code, type.toUpperCase(), institution.name, institution.url],
        );
      }
      for (const endpoint of market.endpoints) {
        await client.query(
          `INSERT INTO source.source_endpoints(endpoint_code, market_code, label, url, data_family, collector_type, frequency, enabled)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT(endpoint_code) DO UPDATE SET
             market_code=EXCLUDED.market_code, label=EXCLUDED.label, url=EXCLUDED.url,
             data_family=EXCLUDED.data_family, collector_type=EXCLUDED.collector_type,
             frequency=EXCLUDED.frequency, enabled=EXCLUDED.enabled, updated_at=now()`,
          [endpoint.id, market.code, endpoint.label, endpoint.url, endpoint.dataFamily, endpoint.collector, endpoint.frequency, endpoint.enabled],
        );
      }
    }
  });
  logger.info({ markets: registry.markets.length }, 'Référentiel des sources chargé');
}
