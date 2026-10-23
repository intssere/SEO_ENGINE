import test from "node:test";
import assert from "node:assert/strict";
import { verifyStoredCustomerAttestation } from "./customer-stored-attestation-verifier.js";

const scope = { organizationId: "org-a", siteId: "site-a" };
const attestation = { ...scope, authority: "setup-certifier", evidenceId: "evidence-a", verifiedAt: "2026-10-19T00:00:00Z", complete: true };
const base = {
  scope, attestation,
  trustedAuthorities: ["setup-certifier"],
  now: new Date("2026-10-19T12:00:00Z"),
  maxAgeMs: 86400000,
  readProof: async (_scope: typeof scope, _evidenceId: string) => ({ id: "evidence-a", source: "crawl", observedAt: "2026-10-19T00:00:00Z" }),
};

test("requires matching trusted attestation and verified proof", async () => {
  assert.deepEqual(await verifyStoredCustomerAttestation(base),
    { ok: true, complete: true, verifiedAt: attestation.verifiedAt, authority: "setup-certifier" });
});

test("rejects foreign-site attestations before querying proof", async () => {
  let called = false;
  const result = await verifyStoredCustomerAttestation({
    ...base, attestation: { ...attestation, siteId: "site-b" },
    readProof: async () => { called = true; return null; },
  });
  assert.deepEqual(result, { ok: false, reason: "attestation_precheck_failed" });
  assert.equal(called, false);
});

test("mismatched proof and database errors fail closed", async () => {
  assert.deepEqual(await verifyStoredCustomerAttestation({
    ...base, readProof: async () => ({ id: "foreign-proof", source: "crawl", observedAt: attestation.verifiedAt }),
  }), { ok: false, reason: "attestation_proof_unverified" });
  assert.deepEqual(await verifyStoredCustomerAttestation({
    ...base, readProof: async () => { throw Error("database offline"); },
  }), { ok: false, reason: "attestation_proof_unavailable" });
});

test("cannot authorize expired attestations despite valid proof", async () => {
  assert.deepEqual(await verifyStoredCustomerAttestation({ ...base, maxAgeMs: 1000 }),
    { ok: false, reason: "attestation_freshness_invalid" });
});

test("proof must not be created after attestation verification", async () => {
  const result = await verifyStoredCustomerAttestation({
    ...base,
    readProof: async () => ({
      id: "evidence-a", source: "crawl", observedAt: "2026-10-19T01:00:00Z",
    }),
  });
  assert.deepEqual(result, { ok: false, reason: "attestation_proof_temporal_invalid" });
});

test("stale proof cannot retrospectively certify a fresh attestation", async () => {
  const result = await verifyStoredCustomerAttestation({
    ...base,
    readProof: async () => ({
      id: "evidence-a", source: "crawl", observedAt: "2026-10-17T00:00:00Z",
    }),
  });
  assert.deepEqual(result, { ok: false, reason: "attestation_proof_temporal_invalid" });
});

test("expired or future attestations never trigger a proof database read", async () => {
  for (const verifiedAt of ["2026-10-17T00:00:00Z", "2026-10-20T00:00:00Z", "not-a-timestamp"]) {
    let reads = 0;
    const result = await verifyStoredCustomerAttestation({
      ...base, attestation: { ...attestation, verifiedAt },
      readProof: async () => { reads++; throw Error("proof must not be fetched"); },
    });
    assert.deepEqual(result, { ok: false, reason: "attestation_freshness_invalid" });
    assert.equal(reads, 0);
  }
});

test("invalid completion flag never triggers a proof read", async () => {
  let reads = 0;
  const result = await verifyStoredCustomerAttestation({
    ...base, attestation: { ...attestation, complete: "true" as unknown as boolean },
    readProof: async () => { reads++; return null; },
  });
  assert.deepEqual(result, { ok: false, reason: "attestation_completion_invalid" });
  assert.equal(reads, 0);
});
