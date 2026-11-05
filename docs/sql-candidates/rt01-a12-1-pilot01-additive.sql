-- RT01-A12.1 / UNEXECUTED SQL CANDIDATE / NOT AN APPROVED MIGRATION.
-- Location intentionally OUTSIDE lib/db/migrations to avoid auto-discovery.
-- Do not apply to ANY database absent separate resource-specific owner approval.
-- Source-only review cannot prove runtime correctness, RLS, or ledger compatibility.
BEGIN;

-- Shared canonical identity: strict (organization_id, id) FK target.
-- This is an additive index on existing public.sites; review locking/impact
-- before any independently authorized isolated execution.
CREATE UNIQUE INDEX pilot01_sites_organization_id_id_unique
  ON public.sites (organization_id, id);

CREATE SCHEMA pilot01;

-- No runtime role grants, RLS policies or initial grants are installed.
-- The new schema is intentionally unusable by application roles.
REVOKE ALL ON SCHEMA pilot01 FROM PUBLIC;

CREATE TABLE pilot01.grants (
  grant_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  site_id uuid NOT NULL,
  actor_subject text NOT NULL CHECK (length(btrim(actor_subject)) > 0),
  session_id uuid NOT NULL REFERENCES public.auth_sessions(id) ON DELETE RESTRICT,
  issuer_id text NOT NULL CHECK (length(btrim(issuer_id)) > 0),
  issuer_provenance_sha256 char(64) NOT NULL
    CHECK (issuer_provenance_sha256 ~ '^[0-9a-f]{64}$'),
  operation text NOT NULL CHECK (operation IN ('analyze','recommend')),
  state text NOT NULL DEFAULT 'issued'
    CHECK (state IN ('issued','consumed','revoked')),
  issued_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT pilot01_grants_same_tenant_site_fk
    FOREIGN KEY (organization_id,site_id)
    REFERENCES public.sites(organization_id,id) ON DELETE RESTRICT,
  CONSTRAINT pilot01_grants_lifecycle_ck CHECK (
    (state='issued' AND consumed_at IS NULL AND revoked_at IS NULL)
    OR (state='consumed' AND consumed_at IS NOT NULL AND revoked_at IS NULL)
    OR (state='revoked' AND revoked_at IS NOT NULL AND consumed_at IS NULL)
  ),
  CONSTRAINT pilot01_grants_ttl_ck CHECK (expires_at > issued_at),
  UNIQUE(grant_id,organization_id,site_id,actor_subject,issuer_id,operation)
);

CREATE TABLE pilot01.jobs (
  job_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id uuid NOT NULL UNIQUE,
  organization_id uuid NOT NULL,
  site_id uuid NOT NULL,
  actor_subject text NOT NULL,
  issuer_id text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('analyze','recommend')),
  state text NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending','claimed','completed','failed','cancelled')),
  worker_owner text,
  generation bigint NOT NULL DEFAULT 0 CHECK (generation >= 0),
  lease_expires_at timestamptz,
  claimed_at timestamptz,
  finished_at timestamptz,
  result_digest char(64),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT pilot01_jobs_grant_scope_fk
    FOREIGN KEY(grant_id,organization_id,site_id,actor_subject,issuer_id,operation)
    REFERENCES pilot01.grants(grant_id,organization_id,site_id,actor_subject,issuer_id,operation)
    ON DELETE RESTRICT,
  CONSTRAINT pilot01_jobs_lease_shape_ck CHECK (
    (state='pending' AND worker_owner IS NULL AND generation=0
       AND lease_expires_at IS NULL AND finished_at IS NULL)
    OR (state='claimed' AND worker_owner IS NOT NULL AND length(btrim(worker_owner))>0
       AND generation>0 AND lease_expires_at IS NOT NULL AND finished_at IS NULL)
    OR (state IN ('completed','failed','cancelled') AND finished_at IS NOT NULL)
  ),
  CONSTRAINT pilot01_jobs_digest_ck CHECK (
    result_digest IS NULL OR result_digest ~ '^[0-9a-f]{64}$'
  ),
  UNIQUE(job_id,grant_id,organization_id,site_id,actor_subject,issuer_id,operation)
);
CREATE INDEX pilot01_jobs_claim_idx
  ON pilot01.jobs (organization_id,site_id,state,lease_expires_at,created_at);

-- Immutable commit evidence. A receipt does not itself prove issuer authority.
CREATE TABLE pilot01.admissions (
  admission_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL UNIQUE,
  grant_id uuid NOT NULL UNIQUE,
  organization_id uuid NOT NULL,
  site_id uuid NOT NULL,
  actor_subject text NOT NULL,
  issuer_id text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('analyze','recommend')),
  idempotency_key text NOT NULL CHECK(length(btrim(idempotency_key))>0),
  request_sha256 char(64) NOT NULL CHECK(request_sha256 ~ '^[0-9a-f]{64}$'),
  transaction_id text NOT NULL CHECK(length(btrim(transaction_id))>0),
  committed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT pilot01_admissions_job_scope_fk
    FOREIGN KEY(job_id,grant_id,organization_id,site_id,actor_subject,issuer_id,operation)
    REFERENCES pilot01.jobs(job_id,grant_id,organization_id,site_id,actor_subject,issuer_id,operation)
    ON DELETE RESTRICT,
  UNIQUE(organization_id,idempotency_key),
  UNIQUE(admission_id,job_id,grant_id,organization_id,site_id)
);

-- Transactionally appended state-transition evidence; static schema does not
-- enforce that every transition always emits an event. The future adapter MUST.
CREATE TABLE pilot01.job_events (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id uuid NOT NULL,
  job_id uuid NOT NULL,
  grant_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  site_id uuid NOT NULL,
  event_kind text NOT NULL CHECK(
    event_kind IN ('admitted','claimed','renewed','completed','failed','cancelled','fenced')
  ),
  worker_owner text,
  generation bigint NOT NULL CHECK(generation>=0),
  event_sha256 char(64) NOT NULL UNIQUE CHECK(event_sha256 ~ '^[0-9a-f]{64}$'),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT pilot01_job_events_admission_scope_fk
    FOREIGN KEY(admission_id,job_id,grant_id,organization_id,site_id)
    REFERENCES pilot01.admissions(admission_id,job_id,grant_id,organization_id,site_id)
    ON DELETE RESTRICT
);
CREATE INDEX pilot01_job_events_history_idx
  ON pilot01.job_events(job_id,recorded_at,event_id);

-- Durable read-only intent; its presence NEVER authorizes external dispatch.
CREATE TABLE pilot01.outbox (
  outbox_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id uuid NOT NULL,
  job_id uuid NOT NULL,
  grant_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  site_id uuid NOT NULL,
  operation text NOT NULL CHECK(operation IN ('analyze','recommend')),
  owner_id text NOT NULL CHECK(length(btrim(owner_id))>0),
  generation bigint NOT NULL CHECK(generation>0),
  intent_sha256 char(64) NOT NULL CHECK(intent_sha256 ~ '^[0-9a-f]{64}$'),
  state text NOT NULL DEFAULT 'blocked'
    CHECK(state IN ('blocked','eligible','delivered','cancelled','uncertain')),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  delivered_at timestamptz,
  CONSTRAINT pilot01_outbox_admission_scope_fk
    FOREIGN KEY(admission_id,job_id,grant_id,organization_id,site_id)
    REFERENCES pilot01.admissions(admission_id,job_id,grant_id,organization_id,site_id)
    ON DELETE RESTRICT,
  CONSTRAINT pilot01_outbox_delivery_ck CHECK (
    (state='delivered' AND delivered_at IS NOT NULL)
    OR (state<>'delivered' AND delivered_at IS NULL)
  ),
  UNIQUE(organization_id,site_id,intent_sha256)
);
CREATE INDEX pilot01_outbox_pending_idx
  ON pilot01.outbox(organization_id,site_id,state,recorded_at);

-- Append-only receipts and events: guards are in addition to role privileges.
-- Schema owner/superuser can alter these controls: governance required.
CREATE FUNCTION pilot01.reject_immutable_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'PILOT01_IMMUTABLE_RECEIPT';
END;
$$;
CREATE TRIGGER pilot01_admissions_immutable
  BEFORE UPDATE OR DELETE ON pilot01.admissions
  FOR EACH ROW EXECUTE FUNCTION pilot01.reject_immutable_mutation();
CREATE TRIGGER pilot01_job_events_immutable
  BEFORE UPDATE OR DELETE ON pilot01.job_events
  FOR EACH ROW EXECUTE FUNCTION pilot01.reject_immutable_mutation();

-- Explicitly deny access even to table owners unless future governed policies
-- are established. RLS cannot by itself prove caller authenticity.
ALTER TABLE pilot01.grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot01.grants FORCE ROW LEVEL SECURITY;
ALTER TABLE pilot01.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot01.jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE pilot01.admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot01.admissions FORCE ROW LEVEL SECURITY;
ALTER TABLE pilot01.job_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot01.job_events FORCE ROW LEVEL SECURITY;
ALTER TABLE pilot01.outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot01.outbox FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA pilot01 FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA pilot01 FROM PUBLIC;

COMMIT;
