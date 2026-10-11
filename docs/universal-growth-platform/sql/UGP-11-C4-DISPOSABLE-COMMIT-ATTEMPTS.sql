-- UGP-11.C4 disposable-only durable attempt/outcome evidence.
-- Never install on Production or a shared database. No runtime migration.
BEGIN;
CREATE TABLE ugp11_transport_fixture.commit_attempts (
 attempt_id varchar(128) PRIMARY KEY,
 tenant_id varchar(128) NOT NULL,
 site_id varchar(128) NOT NULL,
 job_identity char(64) NOT NULL REFERENCES ugp11_transport_fixture.jobs(identity),
 payload_fingerprint char(64) NOT NULL CHECK(payload_fingerprint ~ '^[0-9a-f]{64}$'),
 prior_fence bigint NOT NULL CHECK(prior_fence >= 0),
 committed_fence bigint NOT NULL CHECK(committed_fence = prior_fence + 1),
 recorded_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
 source varchar(24) NOT NULL DEFAULT 'fixture_only' CHECK(source='fixture_only'),
 UNIQUE(tenant_id,site_id,job_identity,committed_fence)
);
-- The marker must be inserted in the SAME transaction as its fenced job update.
-- Absence of a marker is not sufficient proof of rollback if observation is partial.
CREATE FUNCTION ugp11_transport_fixture.reject_commit_attempt_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'commit_attempt_append_only'; END; $$;
CREATE TRIGGER ugp11_commit_attempt_no_update_delete
BEFORE UPDATE OR DELETE OR TRUNCATE ON ugp11_transport_fixture.commit_attempts
FOR EACH STATEMENT EXECUTE FUNCTION ugp11_transport_fixture.reject_commit_attempt_mutation();
COMMIT;
