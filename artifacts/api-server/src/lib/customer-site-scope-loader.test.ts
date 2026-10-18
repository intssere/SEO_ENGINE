import test from "node:test";
import assert from "node:assert/strict";
import { loadCustomerSiteScope } from "./customer-site-scope-loader.js";

const grant = { principalSubject: "subject-a", organizationId: "org-a", siteId: "site-a", active: true };

test("unauthenticated requests never reach the membership reader", async () => {
  let called = false;
  const result = await loadCustomerSiteScope({
    principalSubject: null, requestedSiteId: "site-a",
    readGrants: async () => { called = true; return [grant]; },
  });
  assert.deepEqual(result, { ok: false, reason: "unauthenticated" });
  assert.equal(called, false);
});

test("membership lookup failures fail closed rather than inheriting app roles", async () => {
  const result = await loadCustomerSiteScope({
    principalSubject: "subject-a", requestedSiteId: "site-a",
    readGrants: async () => { throw new Error("store unavailable"); },
  });
  assert.deepEqual(result, { ok: false, reason: "membership_unavailable" });
});

test("authoritative reader receives authenticated subject and selects active site", async () => {
  let lookedUp: string | null = null;
  const result = await loadCustomerSiteScope({
    principalSubject: "subject-a", requestedSiteId: "site-a",
    readGrants: async subject => { lookedUp = subject; return [grant]; },
  });
  assert.equal(lookedUp, "subject-a");
  assert.deepEqual(result, { ok: true, organizationId: "org-a", siteId: "site-a" });
});

test("request-provided site ID cannot select another user's membership", async () => {
  const result = await loadCustomerSiteScope({
    principalSubject: "subject-a", requestedSiteId: "site-b",
    readGrants: async () => [grant, { principalSubject: "subject-b", organizationId: "org-b", siteId: "site-b", active: true }],
  });
  assert.deepEqual(result, { ok: false, reason: "site_not_authorized" });
});
