import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';
import { env } from './env.js';

const endpointSchema = z.object({
  id: z.string(), label: z.string(), url: z.string().url(),
  dataFamily: z.enum(['EQUITY_INDEX','MONEY_MARKET_RATE','MONEY_MARKET_INDEX','TREASURY_RATE','YIELD_CURVE','FX','INFLATION','FUND_NAV']),
  collector: z.enum(['HTML_TABLE','HTML_TABLE_CSV','HTML_LINK_INDEX','DOCUMENT_LINK_INDEX','PDF_LINK_INDEX','XLSX_LINK_INDEX','MANUAL_API_DISCOVERY']),
  frequency: z.string(), enabled: z.boolean().optional().default(true),
});
const institutionSchema = z.object({ name: z.string(), url: z.string().url() });
const marketSchema = z.object({
  code: z.string(), name: z.string(), currency: z.string().length(3), allShareIndex: z.string().nullable(),
  institutions: z.record(institutionSchema), endpoints: z.array(endpointSchema),
});
const registrySchema = z.object({
  version: z.string(), generatedAt: z.string(), defaultPolicies: z.record(z.unknown()), markets: z.array(marketSchema),
});
const manifestSchema = z.object({
  version: z.string(), generatedAt: z.string(), defaultPolicies: z.record(z.unknown()), marketFiles: z.array(z.string()),
});

export type SourceEndpoint = z.infer<typeof endpointSchema> & { marketCode: string; currency: string };
export type Registry = z.infer<typeof registrySchema>;

/** Reject ambiguous source identifiers before ingestion or filtering. */
export function assertUniqueSourceIds(markets: readonly { code?: string; endpoints: readonly { id: string }[] }[]): void {
  const seenSources = new Set<string>();
  const seenMarkets = new Set<string>();
  for (const market of markets) {
    if (market.code !== undefined) {
      if (seenMarkets.has(market.code)) throw new Error(`DUPLICATE_MARKET_CODE: ${market.code}`);
      seenMarkets.add(market.code);
    }
    for (const endpoint of market.endpoints) {
      if (seenSources.has(endpoint.id)) throw new Error(`DUPLICATE_SOURCE_ID: ${endpoint.id}`);
      seenSources.add(endpoint.id);
    }
  }
}

export async function loadRegistry(): Promise<Registry> {
  const raw = JSON.parse(await readFile(env.SOURCE_REGISTRY_PATH, 'utf8')) as unknown;
  const monolithic = registrySchema.safeParse(raw);
  if (monolithic.success) {
    assertUniqueSourceIds(monolithic.data.markets);
    return monolithic.data;
  }
  const manifest = manifestSchema.parse(raw);
  const base = dirname(resolve(env.SOURCE_REGISTRY_PATH));
  const markets = await Promise.all(manifest.marketFiles.map(async (file) =>
    marketSchema.parse(JSON.parse(await readFile(resolve(base, file), 'utf8'))),
  ));
  const registry = registrySchema.parse({ ...manifest, markets });
  assertUniqueSourceIds(registry.markets);
  return registry;
}

export async function listEndpoints(filters?: { market?: string; family?: string }): Promise<SourceEndpoint[]> {
  const registry = await loadRegistry();
  return registry.markets.flatMap((market) => market.endpoints
    .filter((endpoint) => endpoint.enabled)
    .filter((endpoint) => !filters?.market || market.code === filters.market)
    .filter((endpoint) => !filters?.family || endpoint.dataFamily === filters.family)
    .map((endpoint) => ({ ...endpoint, marketCode: market.code, currency: market.currency })));
}
