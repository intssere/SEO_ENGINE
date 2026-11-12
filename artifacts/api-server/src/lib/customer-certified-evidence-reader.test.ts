import test from "node:test";
import assert from "node:assert/strict";
import { createCertifiedCustomerEvidenceReader } from "./customer-certified-evidence-reader.js";
import { createScopedCustomerCapabilityReader } from "./customer-capability-loader.js";

const scope = { organizationId: "org-a", siteId: "site-a" };
const verifiedAt = "2026-10-20T01:00:00Z";
const base = {
  readIdentity: async () => ({ ...scope, name: "Site A", domain: "example.test" }),
  readAttestation: async (_scope: typeof scope, _kind: "setup" | "initial_analysis") => ({
    ...scope, authority: "reviewed-certifier", evidenceId: "proof-a",
    verifiedAt, complete: true,
  }),
  readProof: async () => ({ id: "proof-a", source: "crawl", observedAt: "2026-10-20T00:00:00Z" }),
  readSources: async () => [{ source: "crawl", status: "available" as const, observedAt: "2026-10-20T00:00:00Z" }],
  trustedAuthorities: ["reviewed-certifier"],
  now: () => new Date("2026-10-20T02:00:00Z"),
  maxAgeMs: 86400000,
};

test("composed certified evidence produces handler-compatible capability without fabricated KPIs", async () => {
  const read = createScopedCustomerCapabilityReader(createCertifiedCustomerEvidenceReader(base));
  const result = await read(scope);
  assert.equal(result?.state, "site_operational");
  assert.deepEqual(result?.site, { id: "site-a", name: "Site A", domain: "example.test" });
  assert.deepEqual(result?.metrics, []);
  assert.deepEqual(result?.sources, [{ name: "crawl", status: "available", observedAt: "2026-10-20T00:00:00Z" }]);
});

test("missing analysis attestation never projects operational customer data", async () => {
  const read = createScopedCustomerCapabilityReader(createCertifiedCustomerEvidenceReader({
    ...base, readAttestation: async (_scope, kind) => kind === "setup" ? base.readAttestation(scope, kind) : null,
  }));
  assert.equal(await read(scope), null);
});

test("foreign site identity and unavailable source data fail closed", async () => {
  const foreign = createCertifiedCustomerEvidenceReader({
    ...base, readIdentity: async () => ({ ...scope, siteId: "site-foreign", name: "Foreign", domain: "foreign.test" }),
  });
  assert.equal(await foreign(scope), null);
  const missing = createCertifiedCustomerEvidenceReader({ ...base, readSources: async () => null });
  assert.equal(await missing(scope), null);
});

test("without a reviewed trust authority no evidence readers are called", async () => {
  let calls = 0;
  const read = createCertifiedCustomerEvidenceReader({
    ...base, trustedAuthorities: [], readIdentity: async () => { calls++; return null; },
  });
  assert.equal(await read(scope), null);
  assert.equal(calls, 0);
});
