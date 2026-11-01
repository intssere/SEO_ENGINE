import test from "node:test";
import assert from "node:assert/strict";
import { loadAuthorizedSiteEvidenceInventory } from "./customer-authorized-evidence-inventory.js";

const grant = { principalSubject: "person-a", organizationId: "org-a", siteId: "site-a", active: true };
const inventory = { organizationId: "org-a", siteId: "site-a", name: "Example", domain: "example.test", observations: [] };

test("membership denial prevents any evidence inventory access", async () => {
  let reads = 0;
  const result = await loadAuthorizedSiteEvidenceInventory({
    principalSubject: "person-b", requestedSiteId: "site-a",
    readGrants: async () => [grant],
    readInventory: async () => { reads++; return inventory; },
  });
  assert.deepEqual(result, { ok: false, reason: "site_not_authorized" });
  assert.equal(reads, 0);
});

test("inventory reader receives server-authorized scope", async () => {
  let observedScope: unknown;
  const result = await loadAuthorizedSiteEvidenceInventory({
    principalSubject: "person-a", requestedSiteId: "site-a",
    readGrants: async () => [grant],
    readInventory: async scope => { observedScope = scope; return inventory; },
  });
  assert.deepEqual(observedScope, { organizationId: "org-a", siteId: "site-a" });
  assert.deepEqual(result, { ok: true, inventory });
});

test("wrong-organization inventory and unavailable reader fail closed", async () => {
  const base = { principalSubject: "person-a", requestedSiteId: "site-a", readGrants: async () => [grant] };
  assert.deepEqual(await loadAuthorizedSiteEvidenceInventory({
    ...base, readInventory: async () => ({ ...inventory, organizationId: "org-b" }),
  }), { ok: false, reason: "inventory_unavailable" });
  assert.deepEqual(await loadAuthorizedSiteEvidenceInventory({
    ...base, readInventory: async () => { throw Error("db offline"); },
  }), { ok: false, reason: "inventory_unavailable" });
});

test("missing inventory is not evidence of zero performance or complete setup", async () => {
  const result = await loadAuthorizedSiteEvidenceInventory({
    principalSubject: "person-a", requestedSiteId: "site-a",
    readGrants: async () => [grant], readInventory: async () => null,
  });
  assert.deepEqual(result, { ok: false, reason: "inventory_unavailable" });
});
