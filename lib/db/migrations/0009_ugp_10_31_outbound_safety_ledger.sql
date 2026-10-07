BEGIN;
CREATE TABLE authority_outreach_suppressions (
 suppression_id text PRIMARY KEY,
 suppression_version text NOT NULL CHECK (suppression_version='ugp-10-31-outbound-suppression-v1'),
 suppression_fingerprint char(64) NOT NULL UNIQUE CHECK (suppression_fingerprint ~ '^[0-9a-f]{64}$'),
 site_id uuid NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
 recipient_domain text NOT NULL CHECK (recipient_domain=lower(recipient_domain) AND length(recipient_domain) BETWEEN 1 AND 253),
 contact_point_fingerprint char(64) NOT NULL CHECK (contact_point_fingerprint ~ '^[0-9a-f]{64}$'),
 reason_code text NOT NULL CHECK (reason_code IN ('explicit_opt_out','manual_suppression','compliance_hold','reputation_risk')),
 suppressed_by text NOT NULL CHECK (suppressed_by ~ '^[A-Za-z0-9_.:@-]{1,120}$'),
 suppressed_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
 UNIQUE(site_id,contact_point_fingerprint),
 CHECK (suppression_id ~ '^uaos-[0-9a-f]{24}$'),
 CHECK (substring(suppression_id from 6)=substring(suppression_fingerprint from 1 for 24))
);
CREATE INDEX idx_authority_outreach_suppressions_recipient_domain_history
 ON authority_outreach_suppressions(site_id,recipient_domain,suppressed_at DESC,suppression_id DESC);

CREATE TABLE authority_outreach_send_reservations (
 reservation_id text PRIMARY KEY,
 reservation_version text NOT NULL CHECK (reservation_version='ugp-10-31-outbound-safety-reservation-v1'),
 reservation_fingerprint char(64) NOT NULL UNIQUE CHECK (reservation_fingerprint ~ '^[0-9a-f]{64}$'),
 logical_send_key char(64) NOT NULL UNIQUE CHECK (logical_send_key ~ '^[0-9a-f]{64}$'),
 site_id uuid NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
 delivery_binding_authorization_decision_fingerprint char(64) NOT NULL CHECK (delivery_binding_authorization_decision_fingerprint ~ '^[0-9a-f]{64}$'),
 delivery_binding_authorization_review_spec_fingerprint char(64) NOT NULL CHECK (delivery_binding_authorization_review_spec_fingerprint ~ '^[0-9a-f]{64}$'),
 prospect_fingerprint char(64) NOT NULL CHECK (prospect_fingerprint ~ '^[0-9a-f]{64}$'),
 opportunity_fingerprint char(64) NOT NULL CHECK (opportunity_fingerprint ~ '^[0-9a-f]{64}$'),
 candidate_fingerprint char(64) NOT NULL CHECK (candidate_fingerprint ~ '^[0-9a-f]{64}$'),
 selected_role_candidate_fingerprint char(64) NOT NULL CHECK (selected_role_candidate_fingerprint ~ '^[0-9a-f]{64}$'),
 selected_contact_point_fingerprint char(64) NOT NULL CHECK (selected_contact_point_fingerprint ~ '^[0-9a-f]{64}$'),
 send_review_fingerprint char(64) NOT NULL CHECK (send_review_fingerprint ~ '^[0-9a-f]{64}$'),
 quality_gate_fingerprint char(64) NOT NULL CHECK (quality_gate_fingerprint ~ '^[0-9a-f]{64}$'),
 recipient_domain text NOT NULL CHECK (recipient_domain=lower(recipient_domain) AND length(recipient_domain) BETWEEN 1 AND 253),
 status text NOT NULL CHECK (status IN ('reserved','released','consumed','uncertain')),
 reserved_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL CHECK (expires_at>reserved_at),
 terminal_at timestamptz,
 terminal_reason text,
 created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
 CHECK ((status='reserved' AND terminal_at IS NULL AND terminal_reason IS NULL) OR (status IN ('released','consumed','uncertain') AND terminal_at IS NOT NULL AND terminal_reason IS NOT NULL)),
 CHECK (reservation_id ~ '^uaosr-[0-9a-f]{24}$'),
 CHECK (substring(reservation_id from 7)=substring(reservation_fingerprint from 1 for 24))
);
CREATE UNIQUE INDEX ux_authority_outreach_send_reservations_active_contact
 ON authority_outreach_send_reservations(site_id,selected_contact_point_fingerprint)
 WHERE status IN ('reserved','uncertain');
CREATE INDEX idx_authority_outreach_send_reservations_contact_rate
 ON authority_outreach_send_reservations(site_id,selected_contact_point_fingerprint,reserved_at DESC,reservation_id DESC);
CREATE INDEX idx_authority_outreach_send_reservations_recipient_domain_rate
 ON authority_outreach_send_reservations(site_id,recipient_domain,reserved_at DESC,reservation_id DESC);
CREATE INDEX idx_authority_outreach_send_reservations_prospect_history
 ON authority_outreach_send_reservations(site_id,prospect_fingerprint,reserved_at DESC,reservation_id DESC);

CREATE TABLE authority_outreach_send_safety_events (
 event_id text PRIMARY KEY,
 event_version text NOT NULL CHECK (event_version='ugp-10-31-outbound-safety-event-v1'),
 event_fingerprint char(64) NOT NULL UNIQUE CHECK (event_fingerprint ~ '^[0-9a-f]{64}$'),
 reservation_id text NOT NULL REFERENCES authority_outreach_send_reservations(reservation_id) ON DELETE RESTRICT,
 reservation_fingerprint char(64) NOT NULL CHECK (reservation_fingerprint ~ '^[0-9a-f]{64}$'),
 site_id uuid NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
 sequence bigint NOT NULL CHECK (sequence>=1),
 previous_event_fingerprint char(64) CHECK (previous_event_fingerprint IS NULL OR previous_event_fingerprint ~ '^[0-9a-f]{64}$'),
 event_type text NOT NULL CHECK (event_type IN ('reserved','released','consumed','marked_uncertain')),
 event_reason text NOT NULL CHECK (event_reason IN ('safety_preflight_passed','operator_release','reservation_expired','single_send_consumed','provider_result_uncertain')),
 actor_id text NOT NULL CHECK (actor_id ~ '^[A-Za-z0-9_.:@-]{1,120}$'),
 occurred_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
 UNIQUE(reservation_id,sequence),
 CHECK ((sequence=1 AND previous_event_fingerprint IS NULL) OR (sequence>1 AND previous_event_fingerprint IS NOT NULL)),
 CHECK (event_id ~ '^uaose-[0-9a-f]{24}$'),
 CHECK (substring(event_id from 7)=substring(event_fingerprint from 1 for 24))
);
CREATE INDEX idx_authority_outreach_send_safety_events_reservation_history
 ON authority_outreach_send_safety_events(reservation_id,sequence,event_id);

CREATE FUNCTION reject_authority_outreach_safety_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'authority_outreach_safety_audit_is_immutable' USING ERRCODE='55000';
END;
$$;
CREATE TRIGGER authority_outreach_suppressions_reject_update_delete
 BEFORE UPDATE OR DELETE ON authority_outreach_suppressions FOR EACH ROW EXECUTE FUNCTION reject_authority_outreach_safety_audit_mutation();
CREATE TRIGGER authority_outreach_suppressions_reject_truncate
 BEFORE TRUNCATE ON authority_outreach_suppressions FOR EACH STATEMENT EXECUTE FUNCTION reject_authority_outreach_safety_audit_mutation();
CREATE TRIGGER authority_outreach_send_reservations_reject_delete
 BEFORE DELETE ON authority_outreach_send_reservations FOR EACH ROW EXECUTE FUNCTION reject_authority_outreach_safety_audit_mutation();
CREATE TRIGGER authority_outreach_send_reservations_reject_truncate
 BEFORE TRUNCATE ON authority_outreach_send_reservations FOR EACH STATEMENT EXECUTE FUNCTION reject_authority_outreach_safety_audit_mutation();
CREATE TRIGGER authority_outreach_send_safety_events_reject_update_delete
 BEFORE UPDATE OR DELETE ON authority_outreach_send_safety_events FOR EACH ROW EXECUTE FUNCTION reject_authority_outreach_safety_audit_mutation();
CREATE TRIGGER authority_outreach_send_safety_events_reject_truncate
 BEFORE TRUNCATE ON authority_outreach_send_safety_events FOR EACH STATEMENT EXECUTE FUNCTION reject_authority_outreach_safety_audit_mutation();
COMMIT;
