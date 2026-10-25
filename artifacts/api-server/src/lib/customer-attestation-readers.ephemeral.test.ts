import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import { createCustomerAttestationReader, type AttestationRowQuery } from "./customer-attestation-reader.js";
import { createAttestationEvidenceVerifier, type AttestationEvidenceQuery } from "./customer-attestation-evidence-reader.js";
import { verifyStoredCustomerAttestation } from "./customer-stored-attestation-verifier.js";
import { assessStoredCustomerReadiness } from "./customer-stored-readiness.js";
import { createCustomerSourceFreshnessReader, type SourceFreshnessQuery } from "./customer-source-freshness-reader.js";
import { createCustomerSiteIdentityReader, type SiteIdentityQuery } from "./customer-site-identity-reader.js";
import { projectCustomerCapability } from "./customer-capability-projection.js";

function certificationUrl(): string | null {
  const raw = process.env.UX_CH_ATTESTATION_EPHEMERAL_DATABASE_URL;
  if (!raw) return null;
  const url = new URL(raw);
  if (!["127.0.0.1", "localhost"].includes(url.hostname) ||
      url.pathname !== "/seo_engine_customer_attestation_cert") {
    throw Error("ux_ch_attestation_ephemeral_database_guard_failed");
  }
  return raw;
}

test("actual scoped attestation and proof readers certify only owned evidence in disposable PostgreSQL", async t => {
  const url = certificationUrl();
  if (!url) { t.skip("isolated attestation database not supplied"); return; }
  const sql = postgres(url, { max: 1, prepare: false });
  t.after(async () => { await sql.end({ timeout: 1 }); });
  const rollback = Symbol("rollback");
  try {
    await sql.begin(async tx => {
      const [a] = await tx`INSERT INTO organizations(name,slug) VALUES ('Reader Attestation A','reader-att-a') RETURNING id::text AS id`;
      const [b] = await tx`INSERT INTO organizations(name,slug) VALUES ('Reader Attestation B','reader-att-b') RETURNING id::text AS id`;
      const [site] = await tx`INSERT INTO sites(organization_id,name,domain,canonical_origin)
        VALUES (${a.id}::uuid,'Attestation Site','reader-att.example','https://reader-att.example') RETURNING id::text AS id`;
      const [proof] = await tx`INSERT INTO evidence(site_id,source,kind,observed_at)
        VALUES (${site.id}::uuid,'crawl','readiness-proof','2026-10-20T00:00:00Z') RETURNING id::text AS id`;
      await tx`INSERT INTO customer_readiness_attestations(organization_id,site_id,kind,evidence_id,authority,complete,verified_at)
        VALUES (${a.id}::uuid,${site.id}::uuid,'setup',${proof.id}::uuid,'offline-certifier',true,'2026-10-20T01:00:00Z')`;
      const readAttestation = createCustomerAttestationReader(tx as unknown as AttestationRowQuery);
      const readProof = createAttestationEvidenceVerifier(tx as unknown as AttestationEvidenceQuery);
      const scope = { organizationId: a.id, siteId: site.id };
      const record = await readAttestation(scope, "setup");
      assert.deepEqual(record, { ...scope, evidenceId: proof.id, authority: "offline-certifier",
        complete: true, verifiedAt: "2026-10-20T01:00:00.000Z" });
      assert.deepEqual(await verifyStoredCustomerAttestation({
        scope, attestation: record, readProof, trustedAuthorities: ["offline-certifier"],
        now: new Date("2026-10-20T02:00:00Z"), maxAgeMs: 86400000,
      }), { ok: true, complete: true, verifiedAt: "2026-10-20T01:00:00.000Z", authority: "offline-certifier" });
      assert.equal(await readAttestation({ organizationId: b.id, siteId: site.id }, "setup"), null);
      assert.equal(await readProof({ organizationId: b.id, siteId: site.id }, proof.id), null);
      assert.equal(await readAttestation(scope, "initial_analysis"), null);
      const readSources = createCustomerSourceFreshnessReader(tx as unknown as SourceFreshnessQuery);
      const sourceStatuses = await readSources(scope, new Date("2026-10-20T02:00:00Z"), 86400000);
      assert.deepEqual(sourceStatuses, [{ source: "crawl", status: "available", observedAt: "2026-10-20T00:00:00.000Z" }]);
      assert.deepEqual(await readSources({ organizationId: b.id, siteId: site.id }, new Date("2026-10-20T02:00:00Z"), 86400000), []);
      const readinessInput = {
        scope, readAttestation, readProof,
        trustedAuthorities: ["offline-certifier"],
        now: new Date("2026-10-20T02:00:00Z"), maxAgeMs: 86400000,
        sourceStatuses: sourceStatuses ?? [],
      };
      assert.deepEqual(await assessStoredCustomerReadiness(readinessInput), {
        state: "unverified", reason: "analysis_attestation_unavailable",
      });
      await tx`INSERT INTO customer_readiness_attestations(organization_id,site_id,kind,evidence_id,authority,complete,verified_at)
        VALUES (${a.id}::uuid,${site.id}::uuid,'initial_analysis',${proof.id}::uuid,'offline-certifier',true,'2026-10-20T01:00:00Z')`;
      assert.deepEqual(await assessStoredCustomerReadiness(readinessInput), {
        state: "site_operational", reason: "verified_sources_available",
      });
      // Project only authoritative identity, verified completion and scoped
      // source observations. Metrics remain empty until separately certified.
      const identity = await createCustomerSiteIdentityReader(tx as unknown as SiteIdentityQuery)(scope);
      assert.ok(identity);
      const assessment = await assessStoredCustomerReadiness(readinessInput);
      assert.equal(assessment.state, "site_operational");
      const capability = projectCustomerCapability(scope, {
        ...scope, name: identity.name, domain: identity.domain,
        setupComplete: true, analysisComplete: true,
        sources: (sourceStatuses ?? []).map(source => ({
          name: source.source, status: source.status, observedAt: source.observedAt,
        })),
        metrics: [],
      });
      assert.equal(capability?.state, "site_operational");
      assert.deepEqual(capability?.site, { id: site.id, name: "Attestation Site", domain: "reader-att.example" });
      assert.deepEqual(capability?.metrics, []);
      assert.equal(projectCustomerCapability({ organizationId: b.id, siteId: site.id }, {
        ...scope, name: identity.name, domain: identity.domain,
        setupComplete: true, analysisComplete: true,
        sources: [], metrics: [],
      }), null);
      await tx`UPDATE sites SET is_active=false WHERE id=${site.id}::uuid`;
      assert.equal(await readAttestation(scope, "setup"), null);
      assert.equal(await readProof(scope, proof.id), null);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
});
