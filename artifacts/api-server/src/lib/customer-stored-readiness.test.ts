import test from "node:test";
import assert from "node:assert/strict";
import { assessStoredCustomerReadiness } from "./customer-stored-readiness.js";

const scope = { organizationId: "org-a", siteId: "site-a" };
const date = "2026-10-20T00:00:00Z";
const base = {
  scope, now: new Date("2026-10-20T12:00:00Z"), maxAgeMs: 86400000,
  trustedAuthorities: ["certifier"],
  sourceStatuses: [{ status: "available" as const, observedAt: date }],
  readProof: async () => ({ id: "proof-a", source: "crawl", observedAt: date }),
  readAttestation: async (_scope: typeof scope, _kind: "setup" | "initial_analysis") =>
    ({ ...scope, evidenceId: "proof-a", authority: "certifier", complete: true, verifiedAt: date }),
};
test("verified persisted setup and analysis can certify readiness", async () => {
  assert.equal((await assessStoredCustomerReadiness(base)).state, "site_operational");
});
test("missing proof cannot certify readiness or infer completion", async () => {
  assert.deepEqual(await assessStoredCustomerReadiness({ ...base, readProof: async () => null }),
    { state: "unverified", reason: "setup_attestation_unavailable" });
});
test("unverified setup prevents analysis persistence access", async () => {
  const requested: string[] = [];
  const result = await assessStoredCustomerReadiness({
    ...base,
    readAttestation: async (_scope, kind) => {
      requested.push(kind);
      return { ...scope, evidenceId: "proof-a", authority: "certifier", complete: kind !== "setup", verifiedAt: date };
    },
  });
  assert.equal(result.state, "setup_required");
  assert.deepEqual(requested, ["setup"]);
});
test("database errors and wrong-site attestations fail closed", async () => {
  assert.equal((await assessStoredCustomerReadiness({
    ...base, readAttestation: async () => { throw Error("db unavailable"); },
  })).state, "unverified");
  assert.equal((await assessStoredCustomerReadiness({
    ...base, readAttestation: async () => ({ ...scope, siteId: "site-b", evidenceId: "proof-a", authority: "certifier", complete: true, verifiedAt: date }),
  })).state, "unverified");
});
