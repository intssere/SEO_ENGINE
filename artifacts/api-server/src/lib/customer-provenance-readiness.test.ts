import test from "node:test";
import assert from "node:assert/strict";
import { loadProvenanceCertifiedCustomerReadiness } from "./customer-provenance-readiness.js";

const scope = { organizationId: "org-a", siteId: "site-a" };
const at = "2026-10-20T00:00:00Z";
const base = {
  principalSubject: "person-a",
  requestedSiteId: "site-a",
  readGrants: async () => [{ ...scope, principalSubject: "person-a", active: true }],
  readEvidence: async () => [{ ...scope, source: "gsc", kind: "search-observation", observedAt: at }],
  trustedSourcePolicies: [{ source: "gsc", permittedKinds: ["search-observation"] }],
  readAttestation: async () => ({ ...scope, evidenceId: "proof-a", authority: "certifier", complete: true, verifiedAt: at }),
  readProof: async () => ({ id: "proof-a", source: "crawl", observedAt: at }),
  trustedAuthorities: ["certifier"],
  now: new Date("2026-10-20T12:00:00Z"),
  maxAgeMs: 86400000,
};

test("trusted recent evidence and proved attestations qualify for operational readiness", async () => {
  const result = await loadProvenanceCertifiedCustomerReadiness(base);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.readiness.state, "site_operational");
});
test("unauthorized subject never reaches evidence or attestation readers", async () => {
  let evidence = 0, attestations = 0;
  const result = await loadProvenanceCertifiedCustomerReadiness({
    ...base, principalSubject: "other",
    readEvidence: async () => { evidence++; return []; },
    readAttestation: async () => { attestations++; return null; },
  });
  assert.deepEqual(result, { ok: false, reason: "site_not_authorized" });
  assert.equal(evidence, 0);
  assert.equal(attestations, 0);
});
test("untrusted source kinds and stale evidence never qualify as operational", async () => {
  const untrusted = await loadProvenanceCertifiedCustomerReadiness({
    ...base, trustedSourcePolicies: [{ source: "gsc", permittedKinds: ["unrelated"] }],
  });
  assert.equal(untrusted.ok, true);
  if (untrusted.ok) assert.equal(untrusted.readiness.state, "site_degraded");
  const stale = await loadProvenanceCertifiedCustomerReadiness({
    ...base, readEvidence: async () => [{ ...scope, source: "gsc", kind: "search-observation", observedAt: "2026-10-17T00:00:00Z" }],
  });
  assert.equal(stale.ok, true);
  if (stale.ok) assert.equal(stale.readiness.state, "site_degraded");
});
test("cross-tenant evidence and unavailable source storage fail closed before attestation reads", async () => {
  let attestations = 0;
  const opts = { ...base, readAttestation: async () => { attestations++; return null; } };
  assert.deepEqual(await loadProvenanceCertifiedCustomerReadiness({
    ...opts, readEvidence: async () => [{ ...scope, siteId: "other", source: "gsc", kind: "search-observation", observedAt: at }],
  }), { ok: false, reason: "source_evidence_unavailable" });
  assert.deepEqual(await loadProvenanceCertifiedCustomerReadiness({
    ...opts, readEvidence: async () => { throw Error("offline"); },
  }), { ok: false, reason: "source_evidence_unavailable" });
  assert.equal(attestations, 0);
});
