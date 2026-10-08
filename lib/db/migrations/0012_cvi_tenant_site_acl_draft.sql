-- CVI-1B.4D DRAFT ONLY. Never wired to bootstrap or deployment.
-- Apply exclusively to an explicitly authorized disposable database for certification.
-- No memberships, grants, credentials or authorization are seeded by this migration.
BEGIN;

CREATE TABLE cvi_organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  auth_subject text NOT NULL CHECK (length(auth_subject) BETWEEN 1 AND 255),
  member_role text NOT NULL CHECK (member_role IN ('viewer','editor','owner')),
  status text NOT NULL DEFAULT 'revoked' CHECK (status IN ('active','suspended','revoked')),
  effective_at timestamptz NOT NULL,
  expires_at timestamptz,
  revoked_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cvi_membership_interval CHECK (expires_at IS NULL OR expires_at > effective_at),
  CONSTRAINT cvi_membership_revocation CHECK ((status = 'revoked') = (revoked_at IS NOT NULL)),
  CONSTRAINT cvi_membership_subject_unique UNIQUE (organization_id, auth_subject),
  CONSTRAINT cvi_membership_org_identity UNIQUE (id, organization_id)
);

-- This composite identity makes cross-organization site grants impossible
-- through direct DML, regardless of API-layer validation.
ALTER TABLE sites
  ADD CONSTRAINT cvi_sites_id_org_unique UNIQUE (id, organization_id);

CREATE TABLE cvi_site_read_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_membership_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  site_id uuid NOT NULL,
  permission text NOT NULL CHECK (permission IN ('read_evidence','review_content','manage_connection')),
  status text NOT NULL DEFAULT 'revoked' CHECK (status IN ('active','revoked')),
  effective_at timestamptz NOT NULL,
  expires_at timestamptz,
  revoked_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cvi_site_grant_membership_fk
    FOREIGN KEY (organization_membership_id, organization_id)
    REFERENCES cvi_organization_memberships (id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT cvi_site_grant_site_fk
    FOREIGN KEY (site_id, organization_id)
    REFERENCES sites (id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT cvi_site_grant_interval CHECK (expires_at IS NULL OR expires_at > effective_at),
  CONSTRAINT cvi_site_grant_revocation CHECK ((status = 'revoked') = (revoked_at IS NOT NULL)),
  CONSTRAINT cvi_site_grant_unique UNIQUE (organization_membership_id, site_id, permission)
);

CREATE INDEX cvi_membership_subject_active_idx
  ON cvi_organization_memberships (auth_subject, organization_id, status, expires_at);
CREATE INDEX cvi_grant_site_permission_active_idx
  ON cvi_site_read_grants (site_id, permission, status, expires_at);

-- Historical event ledger: append-only protections must be reviewed/certified
-- separately; this record is never a replacement for live membership checks.
CREATE TABLE cvi_tenant_authorization_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE RESTRICT,
  site_id uuid REFERENCES sites(id) ON DELETE RESTRICT,
  auth_subject text NOT NULL,
  event_kind text NOT NULL CHECK (event_kind IN (
    'membership_created','membership_changed','membership_revoked',
    'site_grant_created','site_grant_changed','site_grant_revoked',
    'access_denied','access_reviewed'
  )),
  outcome text NOT NULL CHECK (outcome IN ('recorded','denied')),
  correlation_id text NOT NULL,
  evidence_fingerprint char(64) NOT NULL CHECK (evidence_fingerprint ~ '^[0-9a-f]{64}$'),
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cvi_tenant_audit_scope_time_idx
  ON cvi_tenant_authorization_audit (organization_id, site_id, occurred_at DESC);

COMMIT;
