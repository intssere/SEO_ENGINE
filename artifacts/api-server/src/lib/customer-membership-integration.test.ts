import test from "node:test";
import assert from "node:assert/strict";
import { createCustomerGrantReader } from "./customer-membership-reader.js";
import { loadCustomerSiteScope } from "./customer-site-scope-loader.js";

// Synthetic integration: no connection, migration, API registration or provider I/O.
const subject = "user-a";
const serverRows = [
  { organization_id: "org-a", site_id: "site-a", principal_subject: subject },
  { organization_id: "org-a", site_id: "site-b", principal_subject: subject },
];

test("authenticated reader-to-resolver pipeline preserves explicit site scope", async () => {
  const readGrants = createCustomerGrantReader(async (_strings, principal) => {
    assert.equal(principal, subject);
    return serverRows;
  });
  assert.deepEqual(await loadCustomerSiteScope({ principalSubject: subject, requestedSiteId: "site-b", readGrants }),
    { ok: true, organizationId: "org-a", siteId: "site-b" });
  assert.deepEqual(await loadCustomerSiteScope({ principalSubject: subject, requestedSiteId: null, readGrants }),
    { ok: false, reason: "site_required" });
  assert.deepEqual(await loadCustomerSiteScope({ principalSubject: subject, requestedSiteId: "site-other", readGrants }),
    { ok: false, reason: "site_not_authorized" });
});

test("membership lookup failure cannot become an implicit grant", async () => {
  const readGrants = createCustomerGrantReader(async () => { throw new Error("database unavailable"); });
  assert.deepEqual(await loadCustomerSiteScope({ principalSubject: subject, requestedSiteId: "site-a", readGrants }),
    { ok: false, reason: "membership_unavailable" });
});

test("unauthenticated requests do not query membership backend", async () => {
  let queries = 0;
  const readGrants = createCustomerGrantReader(async () => { queries++; return serverRows; });
  assert.deepEqual(await loadCustomerSiteScope({ principalSubject: null, requestedSiteId: "site-a", readGrants }),
    { ok: false, reason: "unauthenticated" });
  assert.equal(queries, 0);
});
