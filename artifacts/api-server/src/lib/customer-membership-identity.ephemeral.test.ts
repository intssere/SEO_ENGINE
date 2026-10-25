import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import { createCustomerGrantReader, type MembershipQuery } from "./customer-membership-reader.js";
import { createCustomerSiteIdentityReader, type SiteIdentityQuery } from "./customer-site-identity-reader.js";
import { loadCustomerSiteScope } from "./customer-site-scope-loader.js";
import { createAttestationEvidenceVerifier, type AttestationEvidenceQuery } from "./customer-attestation-evidence-reader.js";

/** Only a specially named localhost database created by CI may be used. */
function isolatedUrl() {
  const raw = process.env.UX_CH_MEMBERSHIP_EPHEMERAL_DATABASE_URL;
  if (!raw) return null;
  const url = new URL(raw);
  if (!["localhost", "127.0.0.1"].includes(url.hostname) ||
      url.pathname !== "/seo_engine_customer_membership_cert") {
    throw new Error("ux_ch_ephemeral_database_guard_failed");
  }
  return raw;
}

test("actual parameterized membership and canonical identity readers honor PostgreSQL tenant boundaries", async t => {
  const url = isolatedUrl();
  if (!url) { t.skip("isolated CI database not supplied"); return; }
  const sql = postgres(url, { max: 1, prepare: false });
  t.after(async () => { await sql.end({ timeout: 1 }); });

  // CI creates this disposable database with 0001 + 0015. Use one rollback-only
  // transaction so test fixtures cannot persist even within that database.
  const rollback = Symbol("rollback");
  try {
    await sql.begin(async tx => {
      const [orgA] = await tx`INSERT INTO organizations(name,slug) VALUES ('CH Reader A','ch-reader-a') RETURNING id::text AS id`;
      const [orgB] = await tx`INSERT INTO organizations(name,slug) VALUES ('CH Reader B','ch-reader-b') RETURNING id::text AS id`;
      const [site] = await tx`
        INSERT INTO sites(organization_id,name,domain,canonical_origin)
        VALUES (${orgA.id}::uuid,'Customer A','ch-reader.example','https://ch-reader.example')
        RETURNING id::text AS id
      `;
      await tx`INSERT INTO customer_organization_memberships(organization_id,principal_subject,active)
        VALUES (${orgA.id}::uuid,'ch-subject-a',true)`;
      await tx`INSERT INTO customer_site_memberships(organization_id,site_id,principal_subject,active)
        VALUES (${orgA.id}::uuid,${site.id}::uuid,'ch-subject-a',true)`;

      const grants = createCustomerGrantReader(tx as unknown as MembershipQuery);
      const identity = createCustomerSiteIdentityReader(tx as unknown as SiteIdentityQuery);
      const auth = await loadCustomerSiteScope({ principalSubject: "ch-subject-a", requestedSiteId: site.id, readGrants: grants });
      assert.deepEqual(auth, { ok: true, organizationId: orgA.id, siteId: site.id });
      if (!auth.ok) throw Error("membership authorization missing");
      assert.deepEqual(await identity({ organizationId: auth.organizationId, siteId: auth.siteId }), {
        organizationId: orgA.id, siteId: site.id, name: "Customer A", domain: "ch-reader.example",
      });
      assert.equal(await identity({ organizationId: orgB.id, siteId: site.id }), null);
      const [proof] = await tx`INSERT INTO evidence(site_id,source,kind,observed_at)
        VALUES (${site.id}::uuid,'gsc','search_observation','2026-10-20T12:00:00Z')
        RETURNING id::text AS id`;
      const readProof = createAttestationEvidenceVerifier(tx as unknown as AttestationEvidenceQuery);
      assert.deepEqual(await readProof({ organizationId: orgA.id, siteId: site.id }, proof.id), {
        id: proof.id, source: "gsc", observedAt: "2026-10-20T12:00:00.000Z",
      });
      assert.equal(await readProof({ organizationId: orgB.id, siteId: site.id }, proof.id), null);
      assert.equal(await readProof({ organizationId: orgA.id, siteId: site.id }, orgB.id), null);
      assert.deepEqual(await loadCustomerSiteScope({ principalSubject: "foreign-subject", requestedSiteId: site.id, readGrants: grants }),
        { ok: false, reason: "site_not_authorized" });
      await tx`UPDATE customer_organization_memberships SET active=false WHERE organization_id=${orgA.id}::uuid`;
      assert.deepEqual(await loadCustomerSiteScope({ principalSubject: "ch-subject-a", requestedSiteId: site.id, readGrants: grants }),
        { ok: false, reason: "site_not_authorized" });
      await tx`UPDATE sites SET is_active=false WHERE id=${site.id}::uuid`;
      assert.equal(await identity({ organizationId: orgA.id, siteId: site.id }), null);
      assert.equal(await readProof({ organizationId: orgA.id, siteId: site.id }, proof.id), null);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
});
