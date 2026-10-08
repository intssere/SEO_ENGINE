-- CVI-1B.4F DRAFT: never applied by runtime bootstrap or production deployments.
-- Apply only after 0012 in a dedicated disposable PostgreSQL certification database.
BEGIN;

CREATE FUNCTION cvi_reject_authorization_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'cvi_authorization_audit_is_immutable'
    USING ERRCODE = '55000';
  RETURN NULL;
END;
$$;

CREATE TRIGGER cvi_authorization_audit_reject_update
BEFORE UPDATE ON cvi_tenant_authorization_audit
FOR EACH ROW EXECUTE FUNCTION cvi_reject_authorization_audit_mutation();

CREATE TRIGGER cvi_authorization_audit_reject_delete
BEFORE DELETE ON cvi_tenant_authorization_audit
FOR EACH ROW EXECUTE FUNCTION cvi_reject_authorization_audit_mutation();

CREATE TRIGGER cvi_authorization_audit_reject_truncate
BEFORE TRUNCATE ON cvi_tenant_authorization_audit
FOR EACH STATEMENT EXECUTE FUNCTION cvi_reject_authorization_audit_mutation();

COMMIT;
