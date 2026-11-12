import test from "node:test";
import assert from "node:assert/strict";
import { createScopedCustomerCapabilityReader, loadCustomerCapability } from "./customer-capability-loader.js";

const grant = { principalSubject: "subject-a", organizationId: "org-a", siteId: "site-a", active: true };
const evidence = {
  organizationId: "org-a", siteId: "site-a", name: "Example", domain: "example.test",
  setupComplete: false, analysisComplete: false, sources: [], metrics: [],
};

test("no authenticated membership means no evidence access", async () => {
  let requested = false;
  const result = await loadCustomerCapability({
    principalSubject: "subject-b", requestedSiteId: "site-a",
    readGrants: async () => [grant],
    readEvidence: async () => { requested = true; return evidence; },
  });
  assert.deepEqual(result, { ok: false, reason: "site_not_authorized" });
  assert.equal(requested, false);
});

test("evidence reader receives only server-authorized site scope", async () => {
  let seen: unknown;
  const result = await loadCustomerCapability({
    principalSubject: "subject-a", requestedSiteId: "site-a",
    readGrants: async () => [grant],
    readEvidence: async scope => { seen = scope; return evidence; },
  });
  assert.deepEqual(seen, { organizationId: "org-a", siteId: "site-a" });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.capability.state, "setup_required");
});

test("wrong-tenant evidence and database failures deny capabilities", async () => {
  const base = { principalSubject: "subject-a", requestedSiteId: "site-a", readGrants: async () => [grant] };
  assert.deepEqual(await loadCustomerCapability({
    ...base, readEvidence: async () => ({ ...evidence, organizationId: "org-b" }),
  }), { ok: false, reason: "evidence_scope_mismatch" });
  assert.deepEqual(await loadCustomerCapability({
    ...base, readEvidence: async () => { throw Error("no evidence backend"); },
  }), { ok: false, reason: "evidence_unavailable" });
});

test("missing evidence cannot imply zero metrics or operational readiness", async () => {
  const result = await loadCustomerCapability({
    principalSubject: "subject-a", requestedSiteId: "site-a",
    readGrants: async () => [grant], readEvidence: async () => null,
  });
  assert.deepEqual(result, { ok: false, reason: "evidence_unavailable" });
});

test("scoped adapter supplies handler-compatible authorization and site provenance", async () => {
  const reader = createScopedCustomerCapabilityReader(async scope => {
    assert.deepEqual(scope, { organizationId: "org-a", siteId: "site-a" });
    return evidence;
  });
  const result = await reader({ organizationId: "org-a", siteId: "site-a" });
  assert.equal(result?.organizationId, "org-a");
  assert.equal(result?.site.id, "site-a");
  assert.equal(result?.state, "setup_required");
  assert.equal(result?.authorized, true);
});

test("scoped adapter rejects foreign evidence and backend errors without exposing details", async () => {
  const scope = { organizationId: "org-a", siteId: "site-a" };
  assert.equal(await createScopedCustomerCapabilityReader(async () => ({ ...evidence, siteId: "site-b" }))(scope), null);
  assert.equal(await createScopedCustomerCapabilityReader(async () => { throw Error("internal database secret"); })(scope), null);
  let reads = 0;
  assert.equal(await createScopedCustomerCapabilityReader(async () => { reads++; return evidence; })({
    organizationId: "", siteId: "site-a",
  }), null);
  assert.equal(reads, 0);
});
