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
     AND attempts < 4
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

/**
 * Requeue abandoned RUNNING jobs without stealing live leases. PostgreSQL
 * locks and updates the same bounded candidate set atomically; a concurrent
 * heartbeat changes locked_at and cannot be silently overwritten.
 * This is a recovery primitive, not an active scheduler or proof of recovery.
 * $1 = minimum age in seconds (strictly positive), $2 = batch limit.
 */
export const RECOVER_EXPIRED_BACKFILLS_SQL = `
WITH expired AS (
  SELECT backfill_job_id
    FROM ops.backfill_jobs
   WHERE status='RUNNING'
     AND locked_at IS NOT NULL
     AND locked_at < now() - ($1::double precision * interval '1 second')
     AND $1::double precision > 0
   ORDER BY locked_at, backfill_job_id
   FOR UPDATE SKIP LOCKED
   LIMIT $2
)
UPDATE ops.backfill_jobs AS jobs
   SET status=CASE WHEN jobs.attempts >= 4 THEN 'FAILED' ELSE 'RETRY' END,
       locked_at=NULL,
       finished_at=CASE WHEN jobs.attempts >= 4 THEN now() ELSE NULL END,
       last_error=CASE WHEN jobs.attempts >= 4
         THEN 'Lease expired; retry budget exhausted'
         ELSE 'Lease expired; awaiting a new atomic claim' END
  FROM expired
 WHERE jobs.backfill_job_id=expired.backfill_job_id
   AND jobs.status='RUNNING'
RETURNING jobs.backfill_job_id
`;

/**
 * Retire legacy PENDING/RETRY rows whose attempt budget is already exhausted.
 * This bounded transition never claims or retries work and is safe to repeat.
 * $1 = maximum number of rows to normalize (positive integer).
 */
export const FAIL_EXHAUSTED_BACKFILLS_SQL = `
WITH exhausted AS (
  SELECT backfill_job_id
    FROM ops.backfill_jobs
   WHERE status IN ('PENDING', 'RETRY')
     AND attempts >= 4
     AND $1::integer > 0
   ORDER BY window_from, endpoint_code, backfill_job_id
   FOR UPDATE SKIP LOCKED
   LIMIT $1
)
UPDATE ops.backfill_jobs AS jobs
   SET status='FAILED',
       locked_at=NULL,
       finished_at=now(),
       last_error='Retry budget exhausted before atomic claim'
  FROM exhausted
 WHERE jobs.backfill_job_id=exhausted.backfill_job_id
   AND jobs.status IN ('PENDING', 'RETRY')
   AND jobs.attempts >= 4
RETURNING jobs.backfill_job_id
`;
