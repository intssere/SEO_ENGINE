-- UGP-11.1D17: opt-in disposable fixture only. Never included in production migrations.
BEGIN;
CREATE TABLE ugp11_transport_fixture.revocation_events (
 issuer varchar(128) NOT NULL,
 tenant_id varchar(128) NOT NULL,
 site_id varchar(128) NOT NULL,
 key_id varchar(128) NOT NULL,
 sequence bigint NOT NULL CHECK (sequence > 0),
 event_id varchar(128) NOT NULL,
 fingerprint char(64) NOT NULL CHECK (fingerprint ~ '^[0-9a-f]{64}$'),
 previous_fingerprint char(64) NOT NULL CHECK (previous_fingerprint ~ '^[0-9a-f]{64}$'),
 action varchar(8) NOT NULL CHECK(action IN ('revoke','rotate','retire')),
 effective_at timestamptz NOT NULL,
 fixture_signature text NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
 source varchar(16) NOT NULL DEFAULT 'fixture_only' CHECK(source='fixture_only'),
 PRIMARY KEY(issuer,tenant_id,site_id,key_id,sequence),
 UNIQUE(issuer,tenant_id,site_id,key_id,event_id),
 UNIQUE(issuer,tenant_id,site_id,key_id,fingerprint)
);
CREATE FUNCTION ugp11_transport_fixture.reject_revocation_event_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'revocation_events_append_only'; END; $$;
CREATE TRIGGER ugp11_revocation_events_immutable
BEFORE UPDATE OR DELETE OR TRUNCATE ON ugp11_transport_fixture.revocation_events
FOR EACH STATEMENT EXECUTE FUNCTION ugp11_transport_fixture.reject_revocation_event_mutation();
COMMIT;
