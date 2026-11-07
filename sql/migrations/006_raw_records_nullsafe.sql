-- PostgreSQL 16: prevent duplicate HTML/CSV raw rows where sheet_name IS NULL.
-- No data is deleted or rewritten. Existing duplicates block the migration deliberately.
-- Apply only with staged backup, load assessment and tested recovery for existing databases.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM market.raw_records
     GROUP BY raw_artifact_id, sheet_name, row_number
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'raw_records already contains duplicate (raw_artifact_id, sheet_name, row_number) keys; migration blocked to preserve provenance; audit and reconcile existing rows before retry';
  END IF;
END
$$;

ALTER TABLE market.raw_records
  ADD CONSTRAINT raw_records_identity_nullsafe
  UNIQUE NULLS NOT DISTINCT (raw_artifact_id, sheet_name, row_number);
