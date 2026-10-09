-- UGP-11.1D9 disposable PostgreSQL journal, separate from production migrations.
BEGIN;
CREATE TABLE ugp11_transport_fixture.decision_journal (
 tenant_id varchar(128) NOT NULL,
 site_id varchar(128) NOT NULL,
 revision bigint NOT NULL CHECK(revision>0),
 decision_id varchar(128) NOT NULL,
 nonce varchar(128) NOT NULL,
 principal_id varchar(128) NOT NULL,
 mode varchar(16) NOT NULL CHECK(mode IN ('running','paused','draining','drained','killed')),
 prior_fingerprint char(64) NOT NULL CHECK(prior_fingerprint ~ '^[0-9a-f]{64}$'),
 fingerprint char(64) NOT NULL CHECK(fingerprint ~ '^[0-9a-f]{64}$'),
 fixture_mac char(64) NOT NULL CHECK(fixture_mac ~ '^[0-9a-f]{64}$'),
 effective_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
 source varchar(24) NOT NULL DEFAULT 'fixture_only' CHECK(source='fixture_only'),
 PRIMARY KEY(tenant_id,site_id,revision),
 UNIQUE(tenant_id,site_id,decision_id),
 UNIQUE(tenant_id,site_id,nonce),
 CHECK(effective_at<expires_at)
);
-- Append-only enforced for ordinary writes, including the test DB role.
CREATE FUNCTION ugp11_transport_fixture.reject_decision_journal_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'decision_journal_append_only'; END; $$;
CREATE TRIGGER ugp11_decision_journal_no_update_delete
BEFORE UPDATE OR DELETE OR TRUNCATE ON ugp11_transport_fixture.decision_journal
FOR EACH STATEMENT EXECUTE FUNCTION ugp11_transport_fixture.reject_decision_journal_mutation();
COMMIT;
