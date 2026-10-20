import test from "node:test";
import assert from "node:assert/strict";
import type { Request, Response } from "express";
import { createCustomerCapabilityHandler } from "./customer-capabilities.js";

async function invoke(input: {
  subject?: string;
  siteId?: unknown;
  readGrants?: Parameters<typeof createCustomerCapabilityHandler>[0];
  readCapability?: Parameters<typeof createCustomerCapabilityHandler>[1];
}) {
  let code = 200;
  let body: unknown = null;
  const req = {
    auth: input.subject ? { subject: input.subject } : undefined,
    query: input.siteId === undefined ? {} : { siteId: input.siteId },
  } as unknown as Request;
  const res = {
    status(value: number) { code = value; return this; },
    json(value: unknown) { body = value; return this; },
  } as unknown as Response;
  await createCustomerCapabilityHandler(input.readGrants ?? (async () => []), input.readCapability)(req, res);
  return { code, body };
}

test("customer handler independently requires authentication", async () => {
  let accessed = false;
  const result = await invoke({ siteId: "site-a", readGrants: async () => { accessed = true; return []; } });
  assert.deepEqual(result, { code: 401, body: { error: "authentication_required" } });
  assert.equal(accessed, false);
});

test("rejects malformed site IDs before membership lookup", async () => {
  let accessed = false;
  const result = await invoke({ subject: "user-a", siteId: ["site-a"], readGrants: async () => { accessed = true; return []; } });
  assert.deepEqual(result, { code: 400, body: { error: "invalid_site_id" } });
  assert.equal(accessed, false);
});

test("denies unauthorized sites without leaking membership information", async () => {
  const result = await invoke({ subject: "user-a", siteId: "site-b", readGrants: async () =>
    [{ principalSubject: "user-a", organizationId: "org-a", siteId: "site-a", active: true }] });
  assert.deepEqual(result, { code: 404, body: { error: "site_not_authorized" } });
});

test("returns unavailable when the grant database fails", async () => {
  const result = await invoke({ subject: "user-a", siteId: "site-a", readGrants: async () => { throw Error("db down"); } });
  assert.deepEqual(result, { code: 503, body: { error: "membership_unavailable" } });
});

test("authorized scope cannot falsely claim unimplemented capabilities", async () => {
  const result = await invoke({ subject: "user-a", siteId: "site-a", readGrants: async () =>
    [{ principalSubject: "user-a", organizationId: "org-a", siteId: "site-a", active: true }] });
  assert.deepEqual(result, { code: 503, body: { error: "customer_capabilities_not_implemented" } });
});

test("authorized scope reaches only an explicitly injected site-scoped capability reader", async () => {
  const scope = { organizationId: "org-a", siteId: "site-a" };
  let seen: unknown = null;
  const result = await invoke({
    subject: "user-a", siteId: "site-a",
    readGrants: async () => [{ ...scope, principalSubject: "user-a", active: true }],
    readCapability: async authorized => {
      seen = authorized;
      return { ...scope, state: "analysis_pending", authorized: true, reason: "Verified analysis pending",
        site: { id: "site-a", name: "Site A", domain: "example.test" }, sources: [], metrics: [] };
    },
  });
  assert.deepEqual(seen, scope);
  assert.equal(result.code, 200);
  assert.deepEqual(result.body, { state: "analysis_pending", authorized: true, reason: "Verified analysis pending",
    site: { id: "site-a", name: "Site A", domain: "example.test" }, sources: [], metrics: [] });
});

test("wrong-site capability payload fails closed with no foreign site details", async () => {
  const result = await invoke({
    subject: "user-a", siteId: "site-a",
    readGrants: async () => [{ principalSubject: "user-a", organizationId: "org-a", siteId: "site-a", active: true }],
    readCapability: async () => ({
      organizationId: "org-b", state: "site_operational", authorized: true, reason: "foreign",
      site: { id: "site-b", name: "Foreign Site", domain: "other.test" }, sources: [], metrics: [],
    }),
  });
  assert.deepEqual(result, { code: 503, body: { error: "customer_capabilities_unavailable" } });
});
