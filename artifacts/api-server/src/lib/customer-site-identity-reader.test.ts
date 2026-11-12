import test from "node:test";
import assert from "node:assert/strict";
import { createCustomerSiteIdentityReader } from "./customer-site-identity-reader.js";

const scope = { siteId: "site-a", organizationId: "org-a" };
const row = { id: "site-a", organization_id: "org-a", name: "Example", domain: "example.test" };

test("binds both authenticated scope dimensions and active-site filter", async () => {
  let query = "";
  let values: unknown[] = [];
  const read = createCustomerSiteIdentityReader(async (strings, ...params) => {
    query = strings.join("?");
    values = params;
    return [row];
  });
  assert.deepEqual(await read(scope), { ...scope, name: row.name, domain: row.domain });
  assert.deepEqual(values, ["site-a", "org-a"]);
  assert.match(query, /s\.id = \?/);
  assert.match(query, /s\.organization_id = \?/);
  assert.match(query, /s\.is_active = true/);
});

test("empty site scope cannot query the database", async () => {
  let calls = 0;
  const read = createCustomerSiteIdentityReader(async () => { calls++; return [row]; });
  assert.equal(await read({ ...scope, siteId: "" }), null);
  assert.equal(calls, 0);
});

test("mismatched or ambiguous database identities fail closed", async () => {
  for (const rows of [[{ ...row, organization_id: "org-b" }], [{ ...row, id: "site-b" }], [row, row], []]) {
    const read = createCustomerSiteIdentityReader(async () => rows);
    assert.equal(await read(scope), null);
  }
});

test("site identity cannot produce fabricated readiness or metrics", async () => {
  const read = createCustomerSiteIdentityReader(async () => [row]);
  const identity = await read(scope);
  assert.equal(identity && "setupComplete" in identity, false);
  assert.equal(identity && "metrics" in identity, false);
});
