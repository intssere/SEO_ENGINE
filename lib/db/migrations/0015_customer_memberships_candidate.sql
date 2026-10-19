-- UX-CH membership foundation. NEW, NOT WIRED INTO BOOTSTRAP OR DEPLOYMENT.
-- Review and independently certify before applying to any database.
-- Site memberships must be backed by organization membership and the site's
-- canonical organization_id. Authentication subject is server-origin only.
BEGIN;

CREATE TABLE customer_organization_memberships (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  principal_subject text NOT NULL CHECK (length(trim(principal_subject)) > 0),
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, principal_subject)
);

ALTER TABLE sites ADD CONSTRAINT sites_id_organization_membership_key
  UNIQUE (id, organization_id);

CREATE TABLE customer_site_memberships (
  organization_id uuid NOT NULL,
  site_id uuid NOT NULL,
  principal_subject text NOT NULL,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (site_id, principal_subject),
  FOREIGN KEY (organization_id, principal_subject)
    REFERENCES customer_organization_memberships(organization_id, principal_subject)
    ON DELETE CASCADE,
  FOREIGN KEY (site_id, organization_id)
    REFERENCES sites(id, organization_id) ON DELETE CASCADE
);

CREATE INDEX customer_site_memberships_principal_idx
  ON customer_site_memberships(principal_subject, site_id);

-- No implicit grants or seeds; newly created memberships default inactive.
COMMIT;
