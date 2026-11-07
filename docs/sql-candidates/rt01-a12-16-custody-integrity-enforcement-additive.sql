-- RT01-A12.16 / UNEXECUTED ADDITIVE ENFORCEMENT CANDIDATE / SOURCE ONLY.
-- Never run this SQL without a separate owner authorization. Outside migrations.
-- Requires canonical 0001-0011, A12.1 and A12.14 SQL candidates as dependencies.
-- Reuses existing custody tables and A12.1 immutable mutation rejection function.
-- Not operational security certification, authentication or a deployable migration.
BEGIN;

-- Reject DELETE for custody identities. No new identity tables or grant paths.
CREATE TRIGGER pilot01_membership_no_delete
  BEFORE DELETE ON pilot01.tenant_memberships
  FOR EACH ROW EXECUTE FUNCTION pilot01.reject_immutable_mutation();
CREATE TRIGGER pilot01_issuer_no_delete
  BEFORE DELETE ON pilot01.issuer_custody
  FOR EACH ROW EXECUTE FUNCTION pilot01.reject_immutable_mutation();

-- This restricted transition candidate intentionally permits only one mutation:
-- active -> inactive revocation with revision increment EXACTLY one.
-- No replacement of identity, scope, role, expiry or provenance after issuance.
-- Future renewal and issuance are BLOCKED until separately reviewed.
-- An already inactive/revoked record cannot be reactivated or updated.
CREATE FUNCTION pilot01.guard_custody_revocation_transition()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, pilot01
AS $guard$
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW.revision <> OLD.revision + 1
     OR OLD.active IS DISTINCT FROM TRUE
     OR OLD.revoked_at IS NOT NULL
     OR NEW.active IS DISTINCT FROM FALSE
     OR NEW.revoked_at IS NULL
     OR NEW.revoked_at < OLD.created_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
     OR NEW.updated_at < OLD.updated_at THEN
    RAISE EXCEPTION 'PILOT01_CUSTODY_TRANSITION_DENIED' USING ERRCODE='23514';
  END IF;

  IF TG_TABLE_NAME='tenant_memberships' THEN
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
       OR NEW.subject IS DISTINCT FROM OLD.subject
       OR NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'PILOT01_MEMBERSHIP_SCOPE_IMMUTABLE' USING ERRCODE='23514';
    END IF;
  ELSIF TG_TABLE_NAME='issuer_custody' THEN
    IF NEW.issuer_id IS DISTINCT FROM OLD.issuer_id
       OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
       OR NEW.site_id IS DISTINCT FROM OLD.site_id
       OR NEW.actor_subject IS DISTINCT FROM OLD.actor_subject
       OR NEW.operation IS DISTINCT FROM OLD.operation
       OR NEW.provenance_sha256 IS DISTINCT FROM OLD.provenance_sha256 THEN
      RAISE EXCEPTION 'PILOT01_ISSUER_SCOPE_IMMUTABLE' USING ERRCODE='23514';
    END IF;
  ELSE
    RAISE EXCEPTION 'PILOT01_UNKNOWN_CUSTODY_TABLE' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$guard$;
CREATE TRIGGER pilot01_membership_revocation_guard
  BEFORE UPDATE ON pilot01.tenant_memberships
  FOR EACH ROW EXECUTE FUNCTION pilot01.guard_custody_revocation_transition();
CREATE TRIGGER pilot01_issuer_revocation_guard
  BEFORE UPDATE ON pilot01.issuer_custody
  FOR EACH ROW EXECUTE FUNCTION pilot01.guard_custody_revocation_transition();

-- Atomic evidence is inserted in the SAME UPDATE statement/transaction.
-- Failure of INSERT must roll back the guarded custody UPDATE.
-- DB role is recorded as an unauthenticated *technical principal* only;
-- it is NOT proof of authorized human actor or cryptographic issuance.
-- Receipt hash is deterministic correlation, NOT a signature.
CREATE FUNCTION pilot01.append_guarded_custody_revocation()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, pilot01
AS $append$
DECLARE
  v_entity text;
  v_subject text;
  v_issuer text;
  v_material text;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RAISE EXCEPTION 'PILOT01_REVOKE_APPEND_ONLY' USING ERRCODE='23514';
  END IF;
  IF TG_TABLE_NAME='tenant_memberships' THEN
    v_entity := 'membership';
    v_subject := NEW.subject;
    v_issuer := NULL;
  ELSIF TG_TABLE_NAME='issuer_custody' THEN
    v_entity := 'issuer';
    v_subject := NEW.actor_subject;
    v_issuer := NEW.issuer_id;
  ELSE
    RAISE EXCEPTION 'PILOT01_UNKNOWN_CUSTODY_TABLE' USING ERRCODE='23514';
  END IF;
  v_material := NEW.organization_id::text || ':' || v_subject || ':' ||
    COALESCE(v_issuer,'') || ':' || NEW.revision::text || ':' ||
    NEW.revoked_at::text;
  INSERT INTO pilot01.custody_revocation_events
    (organization_id,subject,issuer_id,entity_type,entity_revision,event_kind,
     initiated_by_subject,authorization_receipt_sha256)
  VALUES
    (NEW.organization_id,v_subject,v_issuer,v_entity,NEW.revision,'revoked',
     'db-role:' || current_user,encode(public.digest(v_material,'sha256'),'hex'));
  RETURN NULL;
END;
$append$;
CREATE TRIGGER pilot01_membership_revocation_append
  AFTER UPDATE ON pilot01.tenant_memberships
  FOR EACH ROW EXECUTE FUNCTION pilot01.append_guarded_custody_revocation();
CREATE TRIGGER pilot01_issuer_revocation_append
  AFTER UPDATE ON pilot01.issuer_custody
  FOR EACH ROW EXECUTE FUNCTION pilot01.append_guarded_custody_revocation();

-- Adapt the existing A12.1 immutable receipt guard. This protects evidence
-- from ordinary UPDATE/DELETE; superusers/owners can disable triggers.
CREATE TRIGGER pilot01_custody_revocation_events_immutable
  BEFORE UPDATE OR DELETE ON pilot01.custody_revocation_events
  FOR EACH ROW EXECUTE FUNCTION pilot01.reject_immutable_mutation();

-- No CREATE ROLE, CREATE POLICY, GRANT, ALTER RLS or runtime wiring is included.
-- PUBLIC has no execute right to the new enforcement functions.
REVOKE ALL ON FUNCTION pilot01.guard_custody_revocation_transition() FROM PUBLIC;
REVOKE ALL ON FUNCTION pilot01.append_guarded_custody_revocation() FROM PUBLIC;
COMMIT;
