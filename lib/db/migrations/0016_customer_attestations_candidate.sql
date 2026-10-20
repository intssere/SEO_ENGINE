-- UX-CH proposed attestation persistence, REVIEW-ONLY and NOT BOOTSTRAPPED.
-- Depends on 0001_core.sql and 0015_customer_memberships_candidate.sql.
-- No initial grants, attestations or trusted issuers are seeded.
BEGIN;
ALTER TABLE evidence ADD CONSTRAINT evidence_id_site_membership_key UNIQUE (id, site_id);
CREATE TABLE customer_readiness_attestations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  site_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('setup', 'initial_analysis')),
  evidence_id uuid NOT NULL,
  authority text NOT NULL CHECK (length(trim(authority)) > 0),
  complete boolean NOT NULL,
  verified_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (site_id, organization_id)
    REFERENCES sites(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (evidence_id, site_id)
    REFERENCES evidence(id, site_id) ON DELETE RESTRICT
);
CREATE INDEX customer_readiness_attestations_scope_idx
  ON customer_readiness_attestations(organization_id, site_id, kind, verified_at DESC);
-- Composite FK enforces matching site ownership at the database layer.
COMMIT;
