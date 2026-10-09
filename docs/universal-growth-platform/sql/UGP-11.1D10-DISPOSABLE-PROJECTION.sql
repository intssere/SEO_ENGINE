-- UGP-11.1D10: disposable DB projection review only, never operational authority.
BEGIN;
CREATE VIEW ugp11_transport_fixture.control_projection_review AS
WITH ranked AS (
 SELECT tenant_id,site_id,revision,fingerprint,mode,expires_at,source,
  row_number() OVER (PARTITION BY tenant_id,site_id ORDER BY revision DESC) AS rank
 FROM ugp11_transport_fixture.decision_journal
)
SELECT tenant_id,site_id,revision,fingerprint,mode,expires_at,
       false::boolean AS authority_verified,
       false::boolean AS claim_allowed,
       false::boolean AS dispatch_allowed,
       'fixture_lineage_not_authoritative'::text AS reason
FROM ranked WHERE rank=1 AND source='fixture_only';
COMMIT;
