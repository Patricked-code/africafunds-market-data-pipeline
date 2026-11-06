import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  RAW_ARCHIVE_DIR: z.string().default('./data/raw'),
  SOURCE_REGISTRY_PATH: z.string().default('./config/sources.json'),
  LOG_LEVEL: z.string().default('info'),
  HTTP_TIMEOUT_MS: z.coerce.number().int().positive().default(45_000),
  HTTP_MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(4),
  // Upper bound for a downloaded response, including chunked streams.
  HTTP_MAX_RESPONSE_BYTES: z.coerce.number().int().positive().default(100 * 1024 * 1024),
  HTTP_USER_AGENT: z.string().default('AfricaFundsMarketCollector/0.1'),
  SCHEDULER_TIMEZONE: z.string().default('Europe/Paris'),
  ENABLE_SCHEDULER: z.coerce.boolean().default(true),
  DAILY_INGEST_CRON: z.string().default('30 21 * * 1-5'),
  WEEKLY_DISCOVERY_CRON: z.string().default('15 2 * * 0'),
  MONTHLY_SOURCE_AUDIT_CRON: z.string().default('0 3 1 * *'),
  BACKFILL_BATCH_DAYS: z.coerce.number().int().positive().default(90),
  MAX_CONCURRENT_SOURCES: z.coerce.number().int().positive().max(10).default(2),
});

export const env = schema.parse(process.env);
