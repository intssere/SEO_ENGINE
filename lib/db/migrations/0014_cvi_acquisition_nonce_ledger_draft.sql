-- CVI-1B.4O DORMANT DRAFT. DO NOT APPLY TO ANY PRODUCTION DATABASE.
-- Certification ONLY in isolated localhost seo_engine_cvi_disposable after 0012/0013.
-- No principals, credentials, authorizations, or acquisition records are seeded.
BEGIN;

CREATE TABLE cvi_acquisition_nonce_ledger (
  acquisition_id text PRIMARY KEY CHECK (length(acquisition_id) BETWEEN 1 AND 255),
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  site_id uuid NOT NULL,
  connection_id uuid NOT NULL REFERENCES connections(id) ON DELETE RESTRICT,
  auth_subject text NOT NULL CHECK (length(auth_subject) BETWEEN 1 AND 255),
  auth_session_id uuid NOT NULL REFERENCES auth_sessions(id) ON DELETE RESTRICT,
  request_nonce text NOT NULL CHECK (length(request_nonce) BETWEEN 1 AND 255),
  requested_resource text NOT NULL CHECK (length(requested_resource) BETWEEN 1 AND 2048),
  observation_fingerprint char(64) NOT NULL CHECK (observation_fingerprint ~ '^[0-9a-f]{64}$'),
  requested_at timestamptz NOT NULL,
  observed_at timestamptz NOT NULL,
  admitted_at timestamptz NOT NULL DEFAULT now(),
  disposition text NOT NULL DEFAULT 'recorded_untrusted'
    CHECK (disposition = 'recorded_untrusted'),
  CONSTRAINT cvi_acquisition_site_org_fk
    FOREIGN KEY (site_id,tenant_id) REFERENCES sites(id,organization_id) ON DELETE RESTRICT,
  CONSTRAINT cvi_acquisition_order_check CHECK (requested_at <= observed_at),
  CONSTRAINT cvi_acquisition_tenant_connection_nonce_unique
    UNIQUE (tenant_id,connection_id,request_nonce),
  CONSTRAINT cvi_acquisition_connection_site_pair_unique
    UNIQUE (connection_id,site_id,acquisition_id)
);

-- Prevent storing a nonce under a connection bound to a different site.
CREATE FUNCTION cvi_validate_acquisition_connection_site()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM connections
    WHERE id=NEW.connection_id AND site_id=NEW.site_id AND status='connected') THEN
    RAISE EXCEPTION 'cvi_acquisition_connection_site_invalid' USING ERRCODE='23514';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth_sessions
    WHERE id=NEW.auth_session_id AND subject=NEW.auth_subject
      AND revoked_at IS NULL AND expires_at>NEW.admitted_at) THEN
    RAISE EXCEPTION 'cvi_acquisition_session_invalid' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER cvi_acquisition_validate_insert
BEFORE INSERT ON cvi_acquisition_nonce_ledger
FOR EACH ROW EXECUTE FUNCTION cvi_validate_acquisition_connection_site();

-- Append-only nonce tombstones: never delete expired rows and thereby re-admit replay.
CREATE FUNCTION cvi_reject_acquisition_nonce_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'cvi_acquisition_nonce_ledger_immutable' USING ERRCODE='55000';
  RETURN NULL;
END;
$$;
CREATE TRIGGER cvi_acquisition_reject_update
BEFORE UPDATE ON cvi_acquisition_nonce_ledger
FOR EACH ROW EXECUTE FUNCTION cvi_reject_acquisition_nonce_mutation();
CREATE TRIGGER cvi_acquisition_reject_delete
BEFORE DELETE ON cvi_acquisition_nonce_ledger
FOR EACH ROW EXECUTE FUNCTION cvi_reject_acquisition_nonce_mutation();
CREATE TRIGGER cvi_acquisition_reject_truncate
BEFORE TRUNCATE ON cvi_acquisition_nonce_ledger
FOR EACH STATEMENT EXECUTE FUNCTION cvi_reject_acquisition_nonce_mutation();

CREATE INDEX cvi_acquisition_scope_observed_idx
  ON cvi_acquisition_nonce_ledger(tenant_id,site_id,observed_at DESC);
COMMIT;
