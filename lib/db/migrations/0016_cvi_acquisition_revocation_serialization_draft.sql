-- CVI-1C.10 DORMANT DRAFT; disposable PostgreSQL proof ONLY.
-- Row-level shared locks serialize a new acquisition nonce insert with
-- concurrent revocation/suspension of its connection, session, membership and grant.
-- No production migration or runtime authorization is enabled.
BEGIN;
CREATE OR REPLACE FUNCTION cvi_validate_acquisition_connection_site()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  authorized_id uuid;
  membership_id uuid;
BEGIN
  -- Global lock order: site -> connection -> session -> membership -> grant.
  -- FOR SHARE conflicts with UPDATE/DELETE on the protected authorization rows.
  SELECT s.id INTO authorized_id
    FROM sites s WHERE s.id=NEW.site_id
      AND s.organization_id=NEW.tenant_id AND s.is_active=true
    FOR SHARE OF s;
  IF authorized_id IS NULL THEN
    RAISE EXCEPTION 'cvi_acquisition_connection_site_invalid' USING ERRCODE='23514';
  END IF;
  authorized_id:=NULL;
  SELECT c.id INTO authorized_id FROM connections c
    WHERE c.id=NEW.connection_id AND c.site_id=NEW.site_id
      AND c.status='connected'
      AND ((c.provider='google'
        AND 'https://www.googleapis.com/auth/webmasters.readonly'=ANY(c.scopes))
        OR (c.provider='shopify' AND 'read_content'=ANY(c.scopes)))
    FOR SHARE OF c;
  IF authorized_id IS NULL THEN
    RAISE EXCEPTION 'cvi_acquisition_connection_site_invalid' USING ERRCODE='23514';
  END IF;
  authorized_id:=NULL;
  SELECT se.id INTO authorized_id FROM auth_sessions se
    WHERE se.id=NEW.auth_session_id AND se.subject=NEW.auth_subject
      AND se.revoked_at IS NULL AND se.expires_at>clock_timestamp()
    FOR SHARE OF se;
  IF authorized_id IS NULL THEN
    RAISE EXCEPTION 'cvi_acquisition_session_invalid' USING ERRCODE='23514';
  END IF;
  SELECT m.id INTO membership_id FROM cvi_organization_memberships m
    WHERE m.organization_id=NEW.tenant_id AND m.auth_subject=NEW.auth_subject
      AND m.status='active' AND m.revoked_at IS NULL
      AND m.effective_at<=clock_timestamp()
      AND (m.expires_at IS NULL OR m.expires_at>clock_timestamp())
    FOR SHARE OF m;
  IF membership_id IS NULL THEN
    RAISE EXCEPTION 'cvi_acquisition_read_grant_invalid' USING ERRCODE='23514';
  END IF;
  authorized_id:=NULL;
  SELECT g.id INTO authorized_id FROM cvi_site_read_grants g
    WHERE g.organization_membership_id=membership_id
      AND g.organization_id=NEW.tenant_id AND g.site_id=NEW.site_id
      AND g.permission='read_evidence' AND g.status='active'
      AND g.revoked_at IS NULL AND g.effective_at<=clock_timestamp()
      AND (g.expires_at IS NULL OR g.expires_at>clock_timestamp())
    FOR SHARE OF g;
  IF authorized_id IS NULL THEN
    RAISE EXCEPTION 'cvi_acquisition_read_grant_invalid' USING ERRCODE='23514';
  END IF;
  -- Receipt is only a tombstone of an untrusted acquisition; even a row
  -- inserted before revocation commits does not authorize later provider use.
  RETURN NEW;
END;
$$;
COMMIT;
