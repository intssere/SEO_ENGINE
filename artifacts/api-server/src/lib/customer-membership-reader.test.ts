import test from "node:test";
import assert from "node:assert/strict";
import { createCustomerGrantReader } from "./customer-membership-reader.js";

test("membership SQL binds authenticated subject and filters both active grants and active site", async () => {
  let query = "";
  let parameters: unknown[] = [];
  const read = createCustomerGrantReader(async (strings, ...values) => {
    query = strings.join("?");
    parameters = values;
    return [{ organization_id: "org-1", site_id: "site-1", principal_subject: "user-1" }];
  });
  assert.deepEqual(await read("user-1"), [{
    organizationId: "org-1", siteId: "site-1", principalSubject: "user-1", active: true,
  }]);
  assert.deepEqual(parameters, ["user-1"]);
  assert.match(query, /sm\.principal_subject = \?/);
  assert.match(query, /sm\.active = true/);
  assert.match(query, /om\.active = true/);
  assert.match(query, /s\.is_active = true/);
  assert.match(query, /s\.organization_id = sm\.organization_id/);
});

test("empty subject cannot issue a database query", async () => {
  let calls = 0;
  const read = createCustomerGrantReader(async () => { calls++; return []; });
  assert.deepEqual(await read(" "), []);
  assert.equal(calls, 0);
});

test("database errors propagate to the fail-closed scope loader", async () => {
  const read = createCustomerGrantReader(async () => { throw Error("database offline"); });
  await assert.rejects(() => read("user-1"), /database offline/);
});

test("unexpected subjects, duplicate site grants and malformed memberships fail closed", async () => {
  const row = { organization_id: "org-a", site_id: "site-a", principal_subject: "user-a" };
  for (const rows of [
    [{ ...row, principal_subject: "user-b" }],
    [{ ...row, organization_id: "" }],
    [row, row],
    [{ ...row, site_id: null as unknown as string }],
  ]) {
    const read = createCustomerGrantReader(async () => rows);
    await assert.rejects(() => read("user-a"), /customer_membership_rows_invalid/);
  }
});

test("oversized membership results cannot be converted to authorized grants", async () => {
  const read = createCustomerGrantReader(async () =>
    Array.from({ length: 101 }, (_, index) => ({
      organization_id: "org-a", site_id: `site-${index}`, principal_subject: "user-a",
    })),
  );
  await assert.rejects(() => read("user-a"), /customer_membership_rows_invalid/);
});
