import test from "node:test";
import assert from "node:assert/strict";
import { createCustomerSourceFreshnessReader } from "./customer-source-freshness-reader.js";

const scope = { organizationId: "org-a", siteId: "site-a" };
const now = new Date("2026-10-20T12:00:00Z");
const day = 86400000;

test("site-scoped observations produce fresh and stale source results", async () => {
  let params: unknown[] = []; let query = "";
  const read = createCustomerSourceFreshnessReader(async (parts, ...values) => {
    params = values; query = parts.join("?");
    return [
      { site_id: "site-a", source: "gsc", observed_at: "2026-10-20T10:00:00Z" },
      { site_id: "site-a", source: "crawler", observed_at: "2026-10-18T00:00:00Z" },
    ];
  });
  assert.deepEqual(await read(scope, now, day), [
    { source: "gsc", status: "available", observedAt: "2026-10-20T10:00:00Z" },
    { source: "crawler", status: "stale", observedAt: "2026-10-18T00:00:00Z" },
  ]);
  assert.deepEqual(params, ["site-a", "org-a"]);
  assert.match(query, /s\.organization_id = \?/);
  assert.match(query, /s\.is_active = true/);
  assert.match(query, /MAX\(e\.observed_at\)/);
});

test("future timestamps cannot make sources available", async () => {
  const read = createCustomerSourceFreshnessReader(async () => [
    { site_id: "site-a", source: "gsc", observed_at: "2026-10-21T00:00:00Z" },
  ]);
  assert.equal((await read(scope, now, day))?.[0].status, "stale");
});

test("malformed or cross-site observations fail closed", async () => {
  const read = createCustomerSourceFreshnessReader(async () => [
    { site_id: "site-b", source: "gsc", observed_at: "2026-10-20T10:00:00Z" },
  ]);
  assert.equal(await read(scope, now, day), null);
});

test("empty evidence is not operational readiness", async () => {
  const read = createCustomerSourceFreshnessReader(async () => []);
  assert.deepEqual(await read(scope, now, day), []);
});
