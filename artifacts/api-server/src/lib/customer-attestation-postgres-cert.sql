-- Synthetic certification only. Run in a disposable DB after core and candidate migrations.
BEGIN;
DO $cert$
DECLARE
  org_a uuid;
  org_b uuid;
  site_a uuid;
  site_b uuid;
  proof_a uuid;
  proof_b uuid;
  n integer;
BEGIN
  INSERT INTO organizations(name,slug) VALUES ('Att A','att-cert-a') RETURNING id INTO org_a;
  INSERT INTO organizations(name,slug) VALUES ('Att B','att-cert-b') RETURNING id INTO org_b;
  INSERT INTO sites(organization_id,name,domain,canonical_origin)
    VALUES (org_a,'Att Site A','att-a.example','https://att-a.example') RETURNING id INTO site_a;
  INSERT INTO sites(organization_id,name,domain,canonical_origin)
    VALUES (org_b,'Att Site B','att-b.example','https://att-b.example') RETURNING id INTO site_b;
  INSERT INTO evidence(site_id,source,kind) VALUES (site_a,'audit','readiness-proof') RETURNING id INTO proof_a;
  INSERT INTO evidence(site_id,source,kind) VALUES (site_b,'audit','readiness-proof') RETURNING id INTO proof_b;

  BEGIN
    INSERT INTO customer_readiness_attestations(organization_id,site_id,kind,evidence_id,authority,complete,verified_at)
      VALUES (org_a,site_a,'setup',proof_b,'synthetic-certifier',true,now());
    RAISE EXCEPTION 'cross-site proof unexpectedly accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;

  INSERT INTO customer_readiness_attestations(organization_id,site_id,kind,evidence_id,authority,complete,verified_at)
    VALUES (org_a,site_a,'setup',proof_a,'synthetic-certifier',true,now());

  SELECT count(*) INTO n FROM customer_readiness_attestations
    WHERE organization_id=org_a AND site_id=site_a AND evidence_id=proof_a;
  IF n <> 1 THEN RAISE EXCEPTION 'valid same-site proof unexpectedly rejected'; END IF;

  BEGIN
    INSERT INTO customer_readiness_attestations(organization_id,site_id,kind,evidence_id,authority,complete,verified_at)
      VALUES (org_b,site_a,'setup',proof_a,'synthetic-certifier',true,now());
    RAISE EXCEPTION 'wrong-organization attestation unexpectedly accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
END
$cert$;
ROLLBACK;
