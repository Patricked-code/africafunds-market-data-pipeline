/**
 * Claim PENDING/RETRY jobs atomically across multiple PostgreSQL workers.
 * The CTE row locks remain held until the UPDATE commits. Returning the
 * previous attempt count preserves the existing retry budget (4 attempts).
 */
export const CLAIM_PENDING_BACKFILLS_SQL = `
WITH candidates AS (
  SELECT backfill_job_id, attempts
    FROM ops.backfill_jobs
   WHERE status IN ('PENDING', 'RETRY')
   ORDER BY window_from, endpoint_code
   FOR UPDATE SKIP LOCKED
   LIMIT $1
)
UPDATE ops.backfill_jobs AS jobs
   SET status='RUNNING',
       locked_at=now(),
       started_at=now(),
       finished_at=NULL,
       attempts=jobs.attempts+1
  FROM candidates
 WHERE jobs.backfill_job_id=candidates.backfill_job_id
RETURNING jobs.backfill_job_id, jobs.endpoint_code,
          jobs.window_from::text, jobs.window_to::text,
          candidates.attempts, jobs.attempts AS claim_attempt, jobs.locked_at::text AS claim_locked_at
`;

/**
 * Renew only the currently owned RUNNING claim. The attempt generation is
 * immutable during a heartbeat; stale workers cannot renew a replacement.
 * The caller must stop processing when rowCount is zero.
 */
export const RENEW_BACKFILL_LEASE_SQL = `
UPDATE ops.backfill_jobs
   SET locked_at=now()
 WHERE backfill_job_id=$1
   AND status='RUNNING'
   AND attempts=$2
   AND locked_at::text=$3
RETURNING locked_at::text AS claim_locked_at
`;
