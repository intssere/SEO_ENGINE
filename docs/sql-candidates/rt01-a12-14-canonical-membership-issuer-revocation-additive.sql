-- PILOT-01 RT01-A12.14: UNEXECUTED ADDITIVE CUSTODY PERSISTENCE CANDIDATE.
-- SOURCE ONLY. NOT in lib/db/migrations; NOT an authorized operational migration.
-- No execution against any database (including disposable) under this milestone.
-- Dependency: separately reviewed and applied A12.1 pilot01 schema and
-- public.sites(organization_id,id) unique index. Do not auto-bootstrap.
-- Complements A12.7-A12.13; DO NOT duplicate pilot01.grants/jobs/admissions/events/outbox.
-- Historical migration authority, resource ownership, data drift and lock impact unverified.
BEGIN;

-- Tenant membership is independent of global auth_sessions.role.
-- Subject + organization is the custody key. No implicit global-admin privilege.
CREATE TABLE pilot01.tenant_memberships (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  subject text NOT NULL CHECK (length(btrim(subject)) > 0),
  role text NOT NULL CHECK (role IN ('viewer','operator','admin')),
  active boolean NOT NULL DEFAULT false,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT pilot01_membership_lifecycle_ck CHECK (
    (active = true AND revoked_at IS NULL)
    OR (active = false)
  ),
  PRIMARY KEY (organization_id, subject)
);

-- Issuer identity is never caller-supplied authentication proof.
-- provenance_sha256 is correlation only; trusted attestation must be verified separately.
CREATE TABLE pilot01.issuer_custody (
  issuer_id text PRIMARY KEY CHECK (length(btrim(issuer_id)) > 0),
  organization_id uuid NOT NULL,
  site_id uuid NOT NULL,
  actor_subject text NOT NULL CHECK (length(btrim(actor_subject)) > 0),
  operation text NOT NULL CHECK (operation IN ('analyze','recommend')),
  provenance_sha256 char(64) NOT NULL
    CHECK (provenance_sha256 ~ '^[0-9a-f]{64}$'),
  active boolean NOT NULL DEFAULT false,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT pilot01_issuer_same_org_site_fk
    FOREIGN KEY (organization_id, site_id)
    REFERENCES public.sites (organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT pilot01_issuer_lifecycle_ck CHECK (
    (active = true AND revoked_at IS NULL)
    OR (active = false)
  ),
  UNIQUE (issuer_id, organization_id, site_id, actor_subject, operation)
);

-- Append-only *intent* at schema level: all data mutations require independently
-- approved restricted writer roles and a DB-owned audited transaction API.
-- This table alone cannot prevent its owner/superuser from updating or deleting rows.
CREATE TABLE pilot01.custody_revocation_events (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  subject text NOT NULL CHECK (length(btrim(subject)) > 0),
  issuer_id text,
  entity_type text NOT NULL CHECK (entity_type IN ('membership','issuer')),
  entity_revision bigint NOT NULL CHECK (entity_revision > 0),
  event_kind text NOT NULL CHECK (event_kind IN ('revoked','expired','suspended')),
  initiated_by_subject text NOT NULL CHECK(length(btrim(initiated_by_subject)) > 0),
  authorization_receipt_sha256 char(64) NOT NULL
    CHECK (authorization_receipt_sha256 ~ '^[0-9a-f]{64}$'),
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT pilot01_custody_event_kind_ck CHECK (
    (entity_type='membership' AND issuer_id IS NULL)
    OR (entity_type='issuer' AND issuer_id IS NOT NULL AND length(btrim(issuer_id)) > 0)
  )
);
CREATE INDEX pilot01_custody_revocation_events_lookup
  ON pilot01.custody_revocation_events (organization_id, subject, occurred_at DESC);

-- Deny application roles by default: no CREATE POLICY, no runtime GRANT, no
-- SECURITY DEFINER functions or automatic triggers. Future roles/policies,
-- audited issuance and monotonic revisions require separate authority.
ALTER TABLE pilot01.tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot01.tenant_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE pilot01.issuer_custody ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot01.issuer_custody FORCE ROW LEVEL SECURITY;
ALTER TABLE pilot01.custody_revocation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot01.custody_revocation_events FORCE ROW LEVEL SECURITY;
REVOKE ALL ON pilot01.tenant_memberships, pilot01.issuer_custody,
  pilot01.custody_revocation_events FROM PUBLIC;

COMMIT;
