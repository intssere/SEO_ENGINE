-- Synthetic transaction; never run on production or staging.
-- Requires 0001_core.sql and the candidate customer-memberships migration.
BEGIN;
DO $cert$
DECLARE
  org_a uuid;
  org_b uuid;
  site_a uuid;
  n int;
BEGIN
  INSERT INTO organizations(name,slug) VALUES ('UX A','ux-ch-cert-a') RETURNING id INTO org_a;
  INSERT INTO organizations(name,slug) VALUES ('UX B','ux-ch-cert-b') RETURNING id INTO org_b;
  INSERT INTO sites(organization_id,name,domain,canonical_origin)
    VALUES (org_a,'UX site A','ux-cert.example','https://ux-cert.example')
    RETURNING id INTO site_a;

  INSERT INTO customer_organization_memberships(organization_id,principal_subject)
    VALUES (org_a,'ux-user-a');
  INSERT INTO customer_site_memberships(organization_id,site_id,principal_subject)
    VALUES (org_a,site_a,'ux-user-a');

  SELECT count(*) INTO n
  FROM customer_site_memberships sm
  JOIN customer_organization_memberships om USING (organization_id, principal_subject)
  JOIN sites s ON s.id=sm.site_id AND s.organization_id=sm.organization_id
  WHERE sm.principal_subject='ux-user-a' AND sm.active AND om.active AND s.is_active;
  IF n <> 0 THEN RAISE EXCEPTION 'inactive memberships unexpectedly authorized'; END IF;

  INSERT INTO customer_organization_memberships(organization_id,principal_subject,active)
    VALUES (org_b,'ux-user-b',true);
  BEGIN
    INSERT INTO customer_site_memberships(organization_id,site_id,principal_subject,active)
      VALUES (org_b,site_a,'ux-user-b',true);
    RAISE EXCEPTION 'cross-organization site membership was accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;

  UPDATE customer_organization_memberships SET active=true
    WHERE organization_id=org_a AND principal_subject='ux-user-a';
  UPDATE customer_site_memberships SET active=true
    WHERE site_id=site_a AND principal_subject='ux-user-a';
  SELECT count(*) INTO n
  FROM customer_site_memberships sm
  JOIN customer_organization_memberships om USING (organization_id,principal_subject)
  JOIN sites s ON s.id=sm.site_id AND s.organization_id=sm.organization_id
  WHERE sm.principal_subject='ux-user-a' AND sm.active AND om.active AND s.is_active;
  IF n <> 1 THEN RAISE EXCEPTION 'active membership did not authorize'; END IF;

  -- Canonical identity must be retrievable only under the exact authorized
  -- site and organization pair. Never infer site identity from domain alone.
  SELECT count(*) INTO n FROM sites s
  WHERE s.id=site_a AND s.organization_id=org_a AND s.is_active;
  IF n <> 1 THEN RAISE EXCEPTION 'authorized canonical site identity unavailable'; END IF;
  SELECT count(*) INTO n FROM sites s
  WHERE s.id=site_a AND s.organization_id=org_b AND s.is_active;
  IF n <> 0 THEN RAISE EXCEPTION 'foreign organization accessed site identity'; END IF;

  UPDATE customer_organization_memberships SET active=false WHERE organization_id=org_a;
  SELECT count(*) INTO n FROM customer_site_memberships sm
  JOIN customer_organization_memberships om USING (organization_id,principal_subject)
  JOIN sites s ON s.id=sm.site_id AND s.organization_id=sm.organization_id
  WHERE sm.principal_subject='ux-user-a' AND sm.active AND om.active AND s.is_active;
  IF n <> 0 THEN RAISE EXCEPTION 'organization revocation failed'; END IF;

  UPDATE customer_organization_memberships SET active=true WHERE organization_id=org_a;
  UPDATE sites SET is_active=false WHERE id=site_a;
  SELECT count(*) INTO n FROM customer_site_memberships sm
  JOIN customer_organization_memberships om USING (organization_id,principal_subject)
  JOIN sites s ON s.id=sm.site_id AND s.organization_id=sm.organization_id
  WHERE sm.principal_subject='ux-user-a' AND sm.active AND om.active AND s.is_active;
  IF n <> 0 THEN RAISE EXCEPTION 'inactive site was authorized'; END IF;
  SELECT count(*) INTO n FROM sites s
  WHERE s.id=site_a AND s.organization_id=org_a AND s.is_active;
  IF n <> 0 THEN RAISE EXCEPTION 'inactive site identity was available'; END IF;

  DELETE FROM customer_organization_memberships WHERE organization_id=org_a;
  SELECT count(*) INTO n FROM customer_site_memberships WHERE site_id=site_a;
  IF n <> 0 THEN RAISE EXCEPTION 'organization membership cascade failed'; END IF;
END
$cert$;
ROLLBACK;
