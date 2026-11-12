import test from "node:test";
import assert from "node:assert/strict";
import { loadCustomerReadinessFromScopedSources } from "./customer-scoped-source-readiness.js";

const scope = { organizationId: "org-a", siteId: "site-a" };
const at = "2026-10-20T00:00:00Z";
const base = {
  principalSubject: "user-a",
  requestedSiteId: "site-a",
  readGrants: async () => [{ ...scope, principalSubject: "user-a", active: true }],
  readSources: async (_scope: typeof scope) => [{ status: "available" as const, observedAt: at }],
  readAttestation: async (_scope: typeof scope, _kind: "setup" | "initial_analysis") =>
    ({ ...scope, evidenceId: "proof-a", authority: "certifier", complete: true, verifiedAt: at }),
  readProof: async () => ({ id: "proof-a", source: "crawl", observedAt: at }),
  trustedAuthorities: ["certifier"],
  now: new Date("2026-10-20T12:00:00Z"),
  maxAgeMs: 86400000,
};

test("unauthorized caller never reaches source or attestation readers", async () => {
  let sources = 0, attestations = 0;
  const result = await loadCustomerReadinessFromScopedSources({
    ...base, principalSubject: "other",
    readSources: async () => { sources++; return []; },
    readAttestation: async () => { attestations++; return null; },
  });
  assert.deepEqual(result, { ok: false, reason: "site_not_authorized" });
  assert.equal(sources, 0);
  assert.equal(attestations, 0);
});

test("source reader receives only membership-authorized organization and site", async () => {
  let seen: unknown;
  const result = await loadCustomerReadinessFromScopedSources({
    ...base, readSources: async given => { seen = given; return [{ status: "available", observedAt: at }]; },
  });
  assert.deepEqual(seen, scope);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.readiness.state, "site_operational");
});

test("unavailable source backend fails closed before attestation access", async () => {
  let attestationReads = 0;
  const result = await loadCustomerReadinessFromScopedSources({
    ...base, readSources: async () => { throw Error("source store offline"); },
    readAttestation: async () => { attestationReads++; return null; },
  });
  assert.deepEqual(result, { ok: false, reason: "source_evidence_unavailable" });
  assert.equal(attestationReads, 0);
});

test("stale sources cannot elevate readiness even with valid attestations", async () => {
  const result = await loadCustomerReadinessFromScopedSources({
    ...base, readSources: async () => [{ status: "available", observedAt: "2026-10-17T00:00:00Z" }],
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.readiness.state, "site_degraded");
});
