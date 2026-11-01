import test from "node:test";
import assert from "node:assert/strict";
import { verifyReadinessAttestation } from "./customer-attestation-trust.js";

const scope = { organizationId: "org-a", siteId: "site-a" };
const attestation = { ...scope, authority: "setup-certifier", evidenceId: "evidence-a", verifiedAt: "2026-10-19T00:00:00Z", complete: true };
const base = { scope, attestation, trustedAuthorities: ["setup-certifier"], verifiedEvidenceIds: ["evidence-a"], now: new Date("2026-10-19T12:00:00Z"), maxAgeMs: 86400000 };

test("accepts explicitly scoped trusted and evidence-backed current attestation", () => {
  assert.deepEqual(verifyReadinessAttestation(base), { ok: true, complete: true, verifiedAt: attestation.verifiedAt, authority: "setup-certifier" });
});
test("rejects wrong organization, issuer and unverified proof", () => {
  assert.equal(verifyReadinessAttestation({ ...base, attestation: { ...attestation, organizationId: "org-b" } }).ok, false);
  assert.deepEqual(verifyReadinessAttestation({ ...base, trustedAuthorities: [] }), { ok: false, reason: "attestation_authority_untrusted" });
  assert.deepEqual(verifyReadinessAttestation({ ...base, verifiedEvidenceIds: [] }), { ok: false, reason: "attestation_evidence_unverified" });
});
test("rejects future-dated and stale attestations", () => {
  assert.deepEqual(verifyReadinessAttestation({ ...base, attestation: { ...attestation, verifiedAt: "2026-10-20T00:00:00Z" } }), { ok: false, reason: "attestation_freshness_invalid" });
  assert.deepEqual(verifyReadinessAttestation({ ...base, maxAgeMs: 1000 }), { ok: false, reason: "attestation_freshness_invalid" });
});
test("explicit negative attestations remain negative", () => {
  assert.deepEqual(verifyReadinessAttestation({ ...base, attestation: { ...attestation, complete: false } }), { ok: true, complete: false, verifiedAt: attestation.verifiedAt, authority: "setup-certifier" });
});
