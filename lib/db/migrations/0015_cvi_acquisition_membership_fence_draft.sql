-- CVI-1B.4P DORMANT DRAFT. Disposable localhost certification only.
-- Corrects acquisition insertion to require active tenant membership and site read grant.
-- Remains nonauthorizing; trigger does not independently verify provider data.
BEGIN;
CREATE OR REPLACE FUNCTION cvi_validate_acquisition_connection_site()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM connections c JOIN sites s ON s.id=c.site_id
    WHERE c.id=NEW.connection_id AND c.site_id=NEW.site_id
      AND s.organization_id=NEW.tenant_id AND s.is_active=true
      AND c.status='connected'
      AND (
        (c.provider='google'
          AND 'https://www.googleapis.com/auth/webmasters.readonly'=ANY(c.scopes))
        OR (c.provider='shopify' AND 'read_content'=ANY(c.scopes))
      )) THEN
    RAISE EXCEPTION 'cvi_acquisition_connection_site_invalid' USING ERRCODE='23514';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth_sessions se
    WHERE se.id=NEW.auth_session_id AND se.subject=NEW.auth_subject
      AND se.revoked_at IS NULL AND se.expires_at>NEW.admitted_at) THEN
    RAISE EXCEPTION 'cvi_acquisition_session_invalid' USING ERRCODE='23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM cvi_organization_memberships m
    JOIN cvi_site_read_grants g
      ON g.organization_membership_id=m.id AND g.organization_id=m.organization_id
    WHERE m.organization_id=NEW.tenant_id AND m.auth_subject=NEW.auth_subject
      AND m.status='active' AND m.revoked_at IS NULL
      AND m.effective_at<=NEW.admitted_at
      AND (m.expires_at IS NULL OR m.expires_at>NEW.admitted_at)
      AND g.organization_id=NEW.tenant_id AND g.site_id=NEW.site_id
      AND g.permission='read_evidence' AND g.status='active' AND g.revoked_at IS NULL
      AND g.effective_at<=NEW.admitted_at
      AND (g.expires_at IS NULL OR g.expires_at>NEW.admitted_at)
  ) THEN
    RAISE EXCEPTION 'cvi_acquisition_read_grant_invalid' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
COMMIT;
