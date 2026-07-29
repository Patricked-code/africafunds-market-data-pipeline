import cron from 'node-cron';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { runIngestion } from './ingest.js';
import { auditSources } from './audit.js';

let running = false;

async function guarded(name: string, job: () => Promise<void>): Promise<void> {
  if (running) {
    logger.warn({ job: name }, 'Exécution ignorée : une autre tâche est active');
    return;
  }
  running = true;
  try {
    logger.info({ job: name }, 'Début de tâche planifiée');
    await job();
    logger.info({ job: name }, 'Fin de tâche planifiée');
  } catch (error) {
    logger.error({ job: name, error }, 'Échec de tâche planifiée');
  } finally {
    running = false;
  }
}

export function startScheduler(): void {
  if (!env.ENABLE_SCHEDULER) {
    logger.warn('Scheduler désactivé');
    return;
  }
  const options = { timezone: env.SCHEDULER_TIMEZONE };
  cron.schedule(env.DAILY_INGEST_CRON, () => void guarded('daily-ingest', () => runIngestion({ mode: 'ingest' })), options);
  cron.schedule(env.WEEKLY_DISCOVERY_CRON, () => void guarded('weekly-discovery', () => runIngestion({ mode: 'discover' })), options);
  cron.schedule(env.MONTHLY_SOURCE_AUDIT_CRON, () => void guarded('monthly-source-audit', auditSources), options);
  logger.info({
    timezone: env.SCHEDULER_TIMEZONE,
    daily: env.DAILY_INGEST_CRON,
    weekly: env.WEEKLY_DISCOVERY_CRON,
    monthly: env.MONTHLY_SOURCE_AUDIT_CRON,
  }, 'Scheduler démarré');
}
