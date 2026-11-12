import test from "node:test";
import assert from "node:assert/strict";
import { createCustomerGrantReader } from "./customer-membership-reader.js";
import { createCustomerSiteIdentityReader } from "./customer-site-identity-reader.js";
import { loadCustomerSiteScope } from "./customer-site-scope-loader.js";

// Synthetic query boundaries only. Candidate membership migration remains inactive.
const principalSubject = "user-a";
const grantRows = [{ organization_id: "org-a", site_id: "site-a", principal_subject: principalSubject }];

test("authorized membership scope reaches canonical identity lookup unchanged", async () => {
  const readGrants = createCustomerGrantReader(async (_parts, subject) => {
    assert.equal(subject, principalSubject);
    return grantRows;
  });
  const authorized = await loadCustomerSiteScope({ principalSubject, requestedSiteId: "site-a", readGrants });
  assert.equal(authorized.ok, true);
  if (!authorized.ok) return;
  const readIdentity = createCustomerSiteIdentityReader(async (_parts, siteId, organizationId) => {
    assert.equal(siteId, "site-a");
    assert.equal(organizationId, "org-a");
    return [{ id: "site-a", organization_id: "org-a", name: "Site A", domain: "example.test" }];
  });
  assert.deepEqual(await readIdentity({ organizationId: authorized.organizationId, siteId: authorized.siteId }), {
    organizationId: "org-a", siteId: "site-a", name: "Site A", domain: "example.test",
  });
});

test("unauthorized site cannot reach canonical identity storage", async () => {
  const readGrants = createCustomerGrantReader(async () => grantRows);
  let identityReads = 0;
  const readIdentity = createCustomerSiteIdentityReader(async () => {
    identityReads++;
    return [{ id: "site-b", organization_id: "org-b", name: "Foreign", domain: "foreign.test" }];
  });
  const result = await loadCustomerSiteScope({ principalSubject, requestedSiteId: "site-b", readGrants });
  assert.deepEqual(result, { ok: false, reason: "site_not_authorized" });
  assert.equal(result.ok, false);
  // An unauthorized outcome must not be passed into the identity reader.
  assert.equal(typeof readIdentity, "function");
  assert.equal(identityReads, 0);
});

test("malformed membership rows fail closed before canonical identity lookup", async () => {
  const readGrants = createCustomerGrantReader(async () => [
    { organization_id: "org-a", site_id: "site-a", principal_subject: "foreign-subject" },
  ]);
  const result = await loadCustomerSiteScope({ principalSubject, requestedSiteId: "site-a", readGrants });
  assert.deepEqual(result, { ok: false, reason: "membership_unavailable" });
});
