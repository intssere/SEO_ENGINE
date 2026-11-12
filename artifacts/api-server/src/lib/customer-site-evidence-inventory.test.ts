import test from "node:test";
import assert from "node:assert/strict";
import { createCustomerSiteEvidenceInventory } from "./customer-site-evidence-inventory.js";

const scope = { organizationId: "org-a", siteId: "site-a" };
const site = { id: "site-a", organization_id: "org-a", name: "Example", domain: "example.test" };
const observation = { id: "ev-a", site_id: "site-a", source: "crawler", kind: "audit", observed_at: "2026-10-19T00:00:00Z" };

test("inventory joins separately scoped site identity and evidence", async () => {
  const inputs: unknown[][] = [];
  const load = createCustomerSiteEvidenceInventory(
    async (_s, ...values) => { inputs.push(values); return [site]; },
    async (_s, ...values) => { inputs.push(values); return [observation]; },
  );
  const result = await load(scope);
  assert.deepEqual(inputs, [["site-a", "org-a"], ["site-a", "org-a"]]);
  assert.deepEqual(result, { ...scope, name: "Example", domain: "example.test",
    observations: [{ id: "ev-a", source: "crawler", kind: "audit", observedAt: "2026-10-19T00:00:00Z" }] });
  assert.equal(result && "metrics" in result, false);
  assert.equal(result && "analysisComplete" in result, false);
});

test("denied site identity never executes evidence query", async () => {
  let calls = 0;
  const load = createCustomerSiteEvidenceInventory(async () => [], async () => { calls++; return [observation]; });
  assert.equal(await load(scope), null);
  assert.equal(calls, 0);
});

test("wrong-tenant and malformed evidence result in no inventory", async () => {
  const load = createCustomerSiteEvidenceInventory(
    async () => [site],
    async () => [{ ...observation, site_id: "other-site" }],
  );
  assert.equal(await load(scope), null);
});

test("no observations is empty inventory, not invented performance data", async () => {
  const load = createCustomerSiteEvidenceInventory(async () => [site], async () => []);
  const result = await load(scope);
  assert.deepEqual(result?.observations, []);
});
