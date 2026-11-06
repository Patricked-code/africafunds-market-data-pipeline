import { migrate } from '../db/migrate.js';
import { seedRegistry } from '../jobs/seed.js';
import { runIngestion } from '../jobs/ingest.js';
import { enqueueBackfill, listPendingBackfills, processBackfillJobs } from '../jobs/backfill.js';
import { auditSources } from '../jobs/audit.js';
import { startScheduler } from '../jobs/scheduler.js';
import { logger } from '../config/logger.js';

function options(args: string[]): Record<string, string> {
  return Object.fromEntries(args.filter((arg) => arg.startsWith('--')).map((arg) => {
    const [key, ...rest] = arg.slice(2).split('=');
    return [key!, rest.join('=') || 'true'];
  }));
}

async function main(): Promise<void> {
  const [command = 'help', ...args] = process.argv.slice(2);
  const opts = options(args);
  const filters = {
    ...(opts.market !== undefined ? { market: opts.market } : {}),
    ...(opts.family !== undefined ? { family: opts.family } : {}),
  };
  switch (command) {
    case 'migrate':
      await migrate();
      break;
    case 'seed':
      await migrate();
      await seedRegistry();
      break;
    case 'ingest':
      await migrate();
      await seedRegistry();
      await runIngestion({ ...filters, mode: 'ingest' });
      break;
    case 'discover':
      await migrate();
      await seedRegistry();
      await runIngestion({ ...filters, mode: 'discover' });
      break;
    case 'backfill':
      await migrate();
      await seedRegistry();
      if (opts.list === 'true') {
        await listPendingBackfills(Number(opts.limit ?? 100));
      } else if (opts.work === 'true') {
        await processBackfillJobs(Number(opts.limit ?? 10));
      } else {
        if (!opts.from || !opts.to) throw new Error('Options requises : --from=YYYY-MM-DD --to=YYYY-MM-DD');
        await enqueueBackfill({ ...filters, from: opts.from, to: opts.to });
      }
      break;
    case 'audit-sources':
      await migrate();
      await seedRegistry();
      await auditSources();
      break;
    case 'scheduler':
      await migrate();
      await seedRegistry();
      startScheduler();
      await new Promise(() => undefined);
      break;
    default:
      console.log(`AfricaFunds Market Data Pipeline\n\nCommandes:\n  migrate\n  seed\n  ingest [--market=MAR] [--family=YIELD_CURVE]\n  discover [--market=UEMOA]\n  backfill --from=2000-01-01 --to=2026-07-29 [--market=MAR]\n  backfill --list=true
  backfill --work=true [--limit=10]\n  audit-sources\n  scheduler`);
  }
}

main().catch((error) => {
  logger.fatal({ error }, 'Commande interrompue');
  process.exitCode = 1;
});
