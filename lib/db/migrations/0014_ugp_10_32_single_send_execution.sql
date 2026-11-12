BEGIN;

CREATE TABLE authority_outreach_single_send_executions (
 execution_id text PRIMARY KEY,
 execution_version text NOT NULL CHECK (execution_version='ugp-10-32-single-send-execution-v1'),
 execution_fingerprint char(64) NOT NULL UNIQUE CHECK (execution_fingerprint ~ '^[0-9a-f]{64}$'),
 reservation_id text NOT NULL UNIQUE REFERENCES authority_outreach_send_reservations(reservation_id) ON DELETE RESTRICT,
 reservation_fingerprint char(64) NOT NULL CHECK (reservation_fingerprint ~ '^[0-9a-f]{64}$'),
 site_id uuid NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
 selected_contact_point_fingerprint char(64) NOT NULL CHECK (selected_contact_point_fingerprint ~ '^[0-9a-f]{64}$'),
 candidate_fingerprint char(64) NOT NULL CHECK (candidate_fingerprint ~ '^[0-9a-f]{64}$'),
 payload_fingerprint char(64) NOT NULL CHECK (payload_fingerprint ~ '^[0-9a-f]{64}$'),
 adapter_class text NOT NULL CHECK (adapter_class ~ '^[a-z0-9_-]{1,64}$'),
 state text NOT NULL CHECK (state IN ('claimed','accepted','rejected','uncertain')),
 attempt_count smallint NOT NULL DEFAULT 1 CHECK (attempt_count=1),
 claimed_at timestamptz NOT NULL,
 completed_at timestamptz,
 adapter_receipt_fingerprint char(64),
 terminal_reason text,
 created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
 CHECK (
   (state='claimed' AND completed_at IS NULL AND adapter_receipt_fingerprint IS NULL AND terminal_reason IS NULL)
   OR
   (state IN ('accepted','rejected','uncertain') AND completed_at IS NOT NULL AND adapter_receipt_fingerprint IS NOT NULL AND terminal_reason IS NOT NULL)
 ),
 CHECK (execution_id ~ '^uaosx-[0-9a-f]{24}$'),
 CHECK (substring(execution_id from 7)=substring(execution_fingerprint from 1 for 24))
);
CREATE INDEX idx_authority_outreach_single_send_execution_site_history
 ON authority_outreach_single_send_executions(site_id,claimed_at DESC,execution_id DESC);
CREATE INDEX idx_authority_outreach_single_send_execution_contact_history
 ON authority_outreach_single_send_executions(site_id,selected_contact_point_fingerprint,claimed_at DESC,execution_id DESC);

CREATE TABLE authority_outreach_single_send_execution_events (
 event_id text PRIMARY KEY,
 event_version text NOT NULL CHECK (event_version='ugp-10-32-single-send-execution-event-v1'),
 event_fingerprint char(64) NOT NULL UNIQUE CHECK (event_fingerprint ~ '^[0-9a-f]{64}$'),
 execution_id text NOT NULL REFERENCES authority_outreach_single_send_executions(execution_id) ON DELETE RESTRICT,
 execution_fingerprint char(64) NOT NULL CHECK (execution_fingerprint ~ '^[0-9a-f]{64}$'),
 reservation_id text NOT NULL REFERENCES authority_outreach_send_reservations(reservation_id) ON DELETE RESTRICT,
 site_id uuid NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
 sequence bigint NOT NULL CHECK (sequence>=1),
 previous_event_fingerprint char(64) CHECK (previous_event_fingerprint IS NULL OR previous_event_fingerprint ~ '^[0-9a-f]{64}$'),
 event_type text NOT NULL CHECK (event_type IN ('claimed','accepted','rejected','uncertain')),
 event_reason text NOT NULL CHECK (event_reason IN ('execution_preflight_passed','mock_adapter_accepted','mock_adapter_rejected','mock_adapter_uncertain','execution_recovery_uncertain')),
 adapter_receipt_fingerprint char(64),
 actor_id text NOT NULL CHECK (actor_id ~ '^[A-Za-z0-9_.:@-]{1,120}$'),
 occurred_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
 UNIQUE(execution_id,sequence),
 CHECK ((sequence=1 AND previous_event_fingerprint IS NULL) OR (sequence>1 AND previous_event_fingerprint IS NOT NULL)),
 CHECK ((event_type='claimed' AND adapter_receipt_fingerprint IS NULL) OR (event_type<>'claimed' AND adapter_receipt_fingerprint IS NOT NULL)),
 CHECK (event_id ~ '^uaosxe-[0-9a-f]{24}$'),
 CHECK (substring(event_id from 8)=substring(event_fingerprint from 1 for 24))
);
CREATE INDEX idx_authority_outreach_single_send_execution_events_history
 ON authority_outreach_single_send_execution_events(execution_id,sequence,event_id);

CREATE TRIGGER outreach_single_send_exec_reject_delete
 BEFORE DELETE ON authority_outreach_single_send_executions
 FOR EACH ROW EXECUTE FUNCTION reject_authority_outreach_safety_audit_mutation();
CREATE TRIGGER outreach_single_send_exec_reject_truncate
 BEFORE TRUNCATE ON authority_outreach_single_send_executions
 FOR EACH STATEMENT EXECUTE FUNCTION reject_authority_outreach_safety_audit_mutation();
CREATE TRIGGER outreach_single_send_event_reject_update_delete
 BEFORE UPDATE OR DELETE ON authority_outreach_single_send_execution_events
 FOR EACH ROW EXECUTE FUNCTION reject_authority_outreach_safety_audit_mutation();
CREATE TRIGGER outreach_single_send_event_reject_truncate
 BEFORE TRUNCATE ON authority_outreach_single_send_execution_events
 FOR EACH STATEMENT EXECUTE FUNCTION reject_authority_outreach_safety_audit_mutation();

COMMIT;
