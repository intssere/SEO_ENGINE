import test from "node:test";
import assert from "node:assert/strict";
import { certifySourceEvidence } from "./customer-source-provenance.js";

const scope = { organizationId: "org-a", siteId: "site-a" };
const candidate = { ...scope, source: "gsc", kind: "search-observation", observedAt: "2026-10-20T10:00:00Z" };
const base = { scope, candidate, trustedPolicies: [{ source: "gsc", permittedKinds: ["search-observation"] }], now: new Date("2026-10-20T12:00:00Z"), maxAgeMs: 86400000 };

test("recent evidence is available only when source and kind are trusted", () => {
  assert.deepEqual(certifySourceEvidence(base), { status: "available", observedAt: candidate.observedAt });
  assert.deepEqual(certifySourceEvidence({ ...base, trustedPolicies: [] }), { status: "unknown", observedAt: null });
  assert.deepEqual(certifySourceEvidence({ ...base, trustedPolicies: [{ source: "gsc", permittedKinds: ["unrelated"] }] }), { status: "unknown", observedAt: null });
});

test("cross-site and cross-organization provenance does not qualify", () => {
  assert.equal(certifySourceEvidence({ ...base, candidate: { ...candidate, siteId: "site-b" } }).status, "unknown");
  assert.equal(certifySourceEvidence({ ...base, candidate: { ...candidate, organizationId: "org-b" } }).status, "unknown");
});

test("future and expired observations do not qualify as available", () => {
  assert.equal(certifySourceEvidence({ ...base, candidate: { ...candidate, observedAt: "2026-10-21T00:00:00Z" } }).status, "stale");
  assert.equal(certifySourceEvidence({ ...base, candidate: { ...candidate, observedAt: "2026-10-18T00:00:00Z" } }).status, "stale");
});

test("duplicate trust policies fail closed rather than choosing one", () => {
  const policy = { source: "gsc", permittedKinds: ["search-observation"] };
  assert.deepEqual(certifySourceEvidence({ ...base, trustedPolicies: [policy, policy] }), { status: "unknown", observedAt: null });
});
