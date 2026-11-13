import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { z } from 'zod';
import { env } from './env.js';

const endpointSchema = z.object({
  id: z.string().trim().min(1), label: z.string(), url: z.string().url(),
  dataFamily: z.enum(['EQUITY_INDEX','MONEY_MARKET_RATE','MONEY_MARKET_INDEX','TREASURY_RATE','YIELD_CURVE','FX','INFLATION','FUND_NAV']),
  collector: z.enum(['HTML_TABLE','HTML_TABLE_CSV','HTML_LINK_INDEX','DOCUMENT_LINK_INDEX','PDF_LINK_INDEX','XLSX_LINK_INDEX','MANUAL_API_DISCOVERY']),
  frequency: z.string(), enabled: z.boolean().optional().default(true),
});
const institutionSchema = z.object({ name: z.string(), url: z.string().url() });
const marketSchema = z.object({
  code: z.string().trim().min(1), name: z.string(), currency: z.string().length(3), allShareIndex: z.string().nullable(),
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

/** Resolve a manifest entry only within the registry directory. No network access. */
export function resolveMarketFile(base: string, file: string): string {
  // Reject platform-dependent separators and drive-qualified paths before resolving on POSIX.
  if (file.includes('\\') || file.includes('\0') || /^[A-Za-z]:/.test(file) || isAbsolute(file)) {
    throw new Error('INVALID_MARKET_FILE_PATH');
  }
  const target = resolve(base, file);
  const rel = relative(resolve(base), target);
  if (!rel || rel === '..' || rel.startsWith('../') || rel.startsWith('..\\\\') || isAbsolute(rel)) {
    throw new Error('INVALID_MARKET_FILE_PATH');
  }
  return target;
}

/** Check real paths as well as lexical paths, rejecting symlinks outside the registry root. */
export async function resolveMarketFileSafe(base: string, file: string): Promise<string> {
  const target = resolveMarketFile(base, file);
  const [realBase, realTarget] = await Promise.all([realpath(base), realpath(target)]);
  const rel = relative(realBase, realTarget);
  if (!rel || rel === '..' || rel.startsWith('../') || rel.startsWith('..\\\\') || isAbsolute(rel)) {
    throw new Error('INVALID_MARKET_FILE_PATH');
  }
  // A manifest market entry must resolve to a regular file, never a directory or device.
  if (!(await stat(realTarget)).isFile()) {
    throw new Error('INVALID_MARKET_FILE_TYPE');
  }
  return realTarget;
}

/** Validate a complete registry without filesystem side effects. */
export function parseRegistry(raw: unknown): Registry {
  const registry = registrySchema.parse(raw);
  assertUniqueSourceIds(registry.markets);
  return registry;
}

export async function loadRegistry(): Promise<Registry> {
  const raw = JSON.parse(await readFile(env.SOURCE_REGISTRY_PATH, 'utf8')) as unknown;
  const monolithic = registrySchema.safeParse(raw);
  if (monolithic.success) {
    return parseRegistry(monolithic.data);
  }
  const manifest = manifestSchema.parse(raw);
  const base = dirname(resolve(env.SOURCE_REGISTRY_PATH));
  const markets = await Promise.all(manifest.marketFiles.map(async (file) =>
    marketSchema.parse(JSON.parse(await readFile(await resolveMarketFileSafe(base, file), 'utf8'))),
  ));
  return parseRegistry({ ...manifest, markets });
}

export async function listEndpoints(filters?: { market?: string; family?: string }): Promise<SourceEndpoint[]> {
  const registry = await loadRegistry();
  return registry.markets.flatMap((market) => market.endpoints
    .filter((endpoint) => endpoint.enabled)
    .filter((endpoint) => !filters?.market || market.code === filters.market)
    .filter((endpoint) => !filters?.family || endpoint.dataFamily === filters.family)
    .map((endpoint) => ({ ...endpoint, marketCode: market.code, currency: market.currency })));
}
