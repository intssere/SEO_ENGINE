import test from "node:test";
import assert from "node:assert/strict";
import { resolveCustomerSiteScope } from "./customer-site-scope.js";

const grants = [
  { principalSubject: "user-a", organizationId: "org-a", siteId: "site-a", active: true },
  { principalSubject: "user-a", organizationId: "org-a", siteId: "site-b", active: true },
  { principalSubject: "user-b", organizationId: "org-b", siteId: "site-c", active: true },
  { principalSubject: "user-a", organizationId: "org-a", siteId: "site-d", active: false },
];

test("rejects anonymous requests even with a known site ID", () => {
  assert.deepEqual(resolveCustomerSiteScope({ principalSubject: null, requestedSiteId: "site-a", grants }), { ok: false, reason: "unauthenticated" });
});

test("rejects ambiguous implicit selection and guessed cross-user site IDs", () => {
  assert.deepEqual(resolveCustomerSiteScope({ principalSubject: "user-a", requestedSiteId: null, grants }), { ok: false, reason: "site_required" });
  assert.deepEqual(resolveCustomerSiteScope({ principalSubject: "user-a", requestedSiteId: "site-c", grants }), { ok: false, reason: "site_not_authorized" });
  assert.deepEqual(resolveCustomerSiteScope({ principalSubject: "user-a", requestedSiteId: "site-d", grants }), { ok: false, reason: "site_not_authorized" });
});

test("resolves only active authenticated site grants", () => {
  assert.deepEqual(resolveCustomerSiteScope({ principalSubject: "user-a", requestedSiteId: "site-b", grants }), { ok: true, organizationId: "org-a", siteId: "site-b" });
  assert.deepEqual(resolveCustomerSiteScope({ principalSubject: "user-b", requestedSiteId: null, grants }), { ok: true, organizationId: "org-b", siteId: "site-c" });
});

test("rejects missing, empty or unrelated grants", () => {
  assert.deepEqual(resolveCustomerSiteScope({ principalSubject: "user-a", requestedSiteId: "site-a", grants: [] }), { ok: false, reason: "site_not_authorized" });
  assert.deepEqual(resolveCustomerSiteScope({ principalSubject: "user-a", requestedSiteId: null, grants: [] }), { ok: false, reason: "site_required" });
});

test("conflicting organization grants for same site fail closed independent of input order", () => {
  const a = { principalSubject: "user-a", organizationId: "org-a", siteId: "site-a", active: true };
  const b = { principalSubject: "user-a", organizationId: "org-other", siteId: "site-a", active: true };
  for (const records of [[a, b], [b, a]]) {
    assert.deepEqual(resolveCustomerSiteScope({ principalSubject: "user-a", requestedSiteId: "site-a", grants: records }), { ok: false, reason: "site_not_authorized" });
    assert.deepEqual(resolveCustomerSiteScope({ principalSubject: "user-a", requestedSiteId: null, grants: records }), { ok: false, reason: "site_required" });
  }
});

test("duplicate identical grants do not introduce ambiguous selection", () => {
  const grant = { principalSubject: "user-a", organizationId: "org-a", siteId: "site-a", active: true };
  assert.deepEqual(resolveCustomerSiteScope({ principalSubject: "user-a", requestedSiteId: null, grants: [grant, grant] }), { ok: true, organizationId: "org-a", siteId: "site-a" });
});
