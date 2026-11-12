import test from "node:test";
import assert from "node:assert/strict";
import { createCustomerConnectionSourceReader } from "./customer-connection-source-reader.js";

const scope = { organizationId: "org-a", siteId: "site-a" };
test("parameterizes site and organization without exposing credentials", async () => {
  let query = ""; let parameters: unknown[] = [];
  const reader = createCustomerConnectionSourceReader(async (strings, ...values) => {
    query = strings.join("?"); parameters = values;
    return [{ site_id: "site-a", provider: "gsc", status: "connected" }];
  });
  assert.deepEqual(await reader(scope), [{ status: "unknown", observedAt: null }]);
  assert.deepEqual(parameters, ["site-a", "org-a"]);
  assert.match(query, /s\.organization_id = \?/);
  assert.match(query, /s\.is_active = true/);
  assert.doesNotMatch(query, /secret_ref|external_account_id|metadata/);
});

test("revoked or errored connection cannot be available evidence", async () => {
  const reader = createCustomerConnectionSourceReader(async () => [
    { site_id: "site-a", provider: "gsc", status: "revoked" },
    { site_id: "site-a", provider: "bing", status: "error" },
  ]);
  assert.deepEqual(await reader(scope), [
    { status: "unavailable", observedAt: null },
    { status: "unavailable", observedAt: null },
  ]);
});

test("wrong site, unknown connection state and missing scope fail closed", async () => {
  const wrong = createCustomerConnectionSourceReader(async () => [
    { site_id: "site-b", provider: "gsc", status: "connected" },
  ]);
  assert.equal(await wrong(scope), null);
  const malformed = createCustomerConnectionSourceReader(async () => [
    { site_id: "site-a", provider: "gsc", status: "invented" },
  ]);
  assert.equal(await malformed(scope), null);
  let calls = 0;
  const empty = createCustomerConnectionSourceReader(async () => { calls++; return []; });
  assert.equal(await empty({ ...scope, siteId: "" }), null);
  assert.equal(calls, 0);
});

test("missing connections are not treated as healthy providers", async () => {
  assert.deepEqual(await createCustomerConnectionSourceReader(async () => [])(scope), []);
});
