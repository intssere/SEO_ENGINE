-- UGP-11.1D1: isolated, opt-in disposable-DB schema candidate ONLY.
-- NOT in lib/db/migrations; never applied on boot or production.
-- Caller must explicitly select and validate a dedicated ephemeral PostgreSQL database.
BEGIN;
CREATE SCHEMA IF NOT EXISTS ugp11_transport_fixture;
CREATE TABLE ugp11_transport_fixture.jobs (
  identity char(64) PRIMARY KEY CHECK (identity ~ '^[0-9a-f]{64}$'),
  tenant_id varchar(128) NOT NULL,
  site_id varchar(128) NOT NULL,
  idempotency_key varchar(128) NOT NULL,
  job_class varchar(40) NOT NULL CHECK (job_class IN ('signal_refresh','crawl_refresh','content_research','decay_analysis','backlink_refresh')),
  envelope_fingerprint char(64) NOT NULL CHECK (envelope_fingerprint ~ '^[0-9a-f]{64}$'),
  upstream_fingerprint char(64) NOT NULL CHECK (upstream_fingerprint ~ '^[0-9a-f]{64}$'),
  control_revision bigint NOT NULL CHECK (control_revision > 0),
  control_fingerprint char(64) NOT NULL CHECK (control_fingerprint ~ '^[0-9a-f]{64}$'),
  slot_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  admission_expires_at timestamptz NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','claimed','completed','dead_letter','manual_intervention')),
  fence bigint NOT NULL DEFAULT 0 CHECK (fence >= 0),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0 AND attempts <= 8),
  worker_id varchar(128),
  claimed_at timestamptz,
  lease_expires_at timestamptz,
  receipt_fingerprint char(64) CHECK (receipt_fingerprint IS NULL OR receipt_fingerprint ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT ugp11_valid_windows CHECK (slot_at < expires_at AND admission_expires_at > slot_at),
  CONSTRAINT ugp11_claim_shape CHECK (
    (status = 'claimed' AND worker_id IS NOT NULL AND claimed_at IS NOT NULL AND lease_expires_at IS NOT NULL AND fence > 0)
    OR (status <> 'claimed' AND lease_expires_at IS NULL)
  ),
  CONSTRAINT ugp11_unique_scope_key UNIQUE (tenant_id,site_id,idempotency_key)
);
CREATE INDEX ugp11_jobs_queue_idx ON ugp11_transport_fixture.jobs (tenant_id,site_id,slot_at) WHERE status='queued';
CREATE INDEX ugp11_jobs_claim_idx ON ugp11_transport_fixture.jobs (lease_expires_at) WHERE status='claimed';
-- Deliberately no stored SQL function, trigger, cron, worker, autonomous claim, or grants.
-- No automatic takeover of expired leases; require reconciliation outside this schema.
COMMIT;
