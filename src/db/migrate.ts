import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pool, withTransaction } from './pool.js';
import { logger } from '../config/logger.js';

export async function migrate(): Promise<void> {
  await pool.query(`CREATE TABLE IF NOT EXISTS public.schema_migrations (
    version text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);

  const dir = resolve('sql/migrations');
  const files = (await readdir(dir)).filter((name) => name.endsWith('.sql')).sort();
  for (const file of files) {
    const exists = await pool.query('SELECT 1 FROM public.schema_migrations WHERE version = $1', [file]);
    if (exists.rowCount) continue;
    const sql = await readFile(resolve(dir, file), 'utf8');
    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query('INSERT INTO public.schema_migrations(version) VALUES ($1)', [file]);
    });
    logger.info({ migration: file }, 'Migration appliquée');
  }
}
