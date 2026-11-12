BEGIN;

DO $$
DECLARE
  target_constraint text;
BEGIN
  SELECT con.conname
    INTO target_constraint
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid=con.conrelid
  JOIN pg_namespace nsp ON nsp.oid=rel.relnamespace
  WHERE nsp.nspname='public'
    AND rel.relname='authority_outreach_single_send_execution_events'
    AND con.contype='c'
    AND pg_get_constraintdef(con.oid) LIKE '%event_reason%'
  ORDER BY con.conname
  LIMIT 1;

  IF target_constraint IS NULL THEN
    RAISE EXCEPTION 'ugp10_33_event_reason_constraint_missing'
      USING ERRCODE='55000';
  END IF;

  EXECUTE format(
    'ALTER TABLE authority_outreach_single_send_execution_events DROP CONSTRAINT %I',
    target_constraint
  );
END;
$$;

ALTER TABLE authority_outreach_single_send_execution_events
  ADD CONSTRAINT ua_single_send_exec_event_reason_v2_check
  CHECK (
    event_reason IN (
      'execution_preflight_passed',
      'mock_adapter_accepted',
      'mock_adapter_rejected',
      'mock_adapter_uncertain',
      'execution_recovery_uncertain',
      'controlled_https_cert_accepted',
      'controlled_https_cert_rejected',
      'controlled_https_cert_uncertain'
    )
  );

COMMIT;
