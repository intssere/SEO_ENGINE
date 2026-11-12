import test from "node:test";
import assert from "node:assert/strict";
import { loadAuthorizedCustomerReadiness } from "./customer-authorized-readiness.js";

const scope = { organizationId: "org-a", siteId: "site-a" };
const at = "2026-10-20T00:00:00Z";
const inputs = {
  principalSubject: "person-a",
  requestedSiteId: "site-a",
  readGrants: async () => [{ principalSubject: "person-a", ...scope, active: true }],
  readAttestation: async (_scope: typeof scope, _kind: "setup" | "initial_analysis") => ({
    ...scope, evidenceId: "proof-a", authority: "certifier", complete: true, verifiedAt: at,
  }),
  readProof: async () => ({ id: "proof-a", source: "crawl", observedAt: at }),
  trustedAuthorities: ["certifier"],
  now: new Date("2026-10-20T12:00:00Z"),
  maxAgeMs: 86400000,
  sourceStatuses: [{ status: "available" as const, observedAt: at }],
};

test("authorized site scope leads to proof-backed readiness", async () => {
  const result = await loadAuthorizedCustomerReadiness(inputs);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual({ organizationId: result.organizationId, siteId: result.siteId }, scope);
    assert.equal(result.readiness.state, "site_operational");
  }
});

test("unauthorized principal never accesses attestation or proof", async () => {
  let attestationReads = 0;
  let proofReads = 0;
  const result = await loadAuthorizedCustomerReadiness({
    ...inputs, principalSubject: "person-b",
    readAttestation: async () => { attestationReads++; return null; },
    readProof: async () => { proofReads++; return null; },
  });
  assert.deepEqual(result, { ok: false, reason: "site_not_authorized" });
  assert.equal(attestationReads, 0);
  assert.equal(proofReads, 0);
});

test("unverified proof cannot become operational despite membership access", async () => {
  const result = await loadAuthorizedCustomerReadiness({
    ...inputs, readProof: async () => null,
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.readiness.state, "unverified");
});

test("cross-tenant attestation fails readiness without exposing foreign data", async () => {
  const result = await loadAuthorizedCustomerReadiness({
    ...inputs,
    readAttestation: async () => ({ ...scope, organizationId: "org-b", evidenceId: "proof-a", authority: "certifier", complete: true, verifiedAt: at }),
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.readiness.state, "unverified");
});
