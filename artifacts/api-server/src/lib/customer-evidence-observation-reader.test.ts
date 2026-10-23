import test from "node:test";
import assert from "node:assert/strict";
import { createCustomerEvidenceObservationReader } from "./customer-evidence-observation-reader.js";

const scope = { organizationId: "org-a", siteId: "site-a" };
const observation = { id: "ev-1", site_id: "site-a", source: "crawler", kind: "audit", observed_at: new Date("2026-10-18T00:00:00Z") };

test("evidence query filters both authorized organization and site and bounds response", async () => {
  let query = "";
  let params: unknown[] = [];
  const read = createCustomerEvidenceObservationReader(async (strings, ...values) => {
    query = strings.join("?");
    params = values;
    return [observation];
  });
  assert.deepEqual(params, []);
  assert.deepEqual(await read(scope), [{ id: "ev-1", source: "crawler", kind: "audit", observedAt: "2026-10-18T00:00:00.000Z" }]);
  assert.deepEqual(params, ["site-a", "org-a"]);
  assert.match(query, /s\.organization_id = \?/);
  assert.match(query, /s\.is_active = true/);
  assert.match(query, /LIMIT 50/);
});

test("mismatched or malformed evidence fails closed", async () => {
  for (const records of [
    [{ ...observation, site_id: "site-b" }],
    [{ ...observation, source: "" }],
    [{ ...observation, observed_at: "bad-timestamp" }],
  ]) {
    assert.equal(await createCustomerEvidenceObservationReader(async () => records)(scope), null);
  }
});

test("no evidence remains an empty observation set, never a zero KPI", async () => {
  assert.deepEqual(await createCustomerEvidenceObservationReader(async () => [])(scope), []);
});

test("empty scope does not access database", async () => {
  let queries = 0;
  const read = createCustomerEvidenceObservationReader(async () => { queries++; return []; });
  assert.equal(await read({ ...scope, organizationId: "" }), null);
  assert.equal(queries, 0);
});
