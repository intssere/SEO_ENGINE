-- UGP-11.1D5: opt-in disposable Postgres fixture extension, never production migration.
-- Applies only after UGP-11.1D1 fixture, in dedicated CI database.
BEGIN;
CREATE TABLE ugp11_transport_fixture.controls (
  tenant_id varchar(128) NOT NULL,
  site_id varchar(128) NOT NULL,
  mode varchar(16) NOT NULL CHECK (mode IN ('running','paused','draining','drained','killed')),
  revision bigint NOT NULL CHECK (revision > 0),
  fingerprint char(64) NOT NULL CHECK (fingerprint ~ '^[0-9a-f]{64}$'),
  source varchar(24) NOT NULL DEFAULT 'fixture_only' CHECK (source='fixture_only'),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (tenant_id,site_id)
);
-- All controls remain fixture-only. No external authoritative P9 certification yet.
-- Never grant claims from these fixture-only control records.
COMMIT;
