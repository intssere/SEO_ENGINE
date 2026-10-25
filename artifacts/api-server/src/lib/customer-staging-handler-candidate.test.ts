import test from "node:test";
import assert from "node:assert/strict";
import type { Request, Response } from "express";
import { createCustomerStagingHandlerCandidate } from "./customer-staging-handler-candidate.js";

const scope = { organizationId: "org-a", siteId: "site-a" };
const config = {
  policy: { trustedAuthorities: ["certifier"], maxAgeMs: 86400000 },
  readGrants: async () => [{ ...scope, principalSubject: "customer-a", active: true }],
  readers: {
    readIdentity: async () => ({ ...scope, name: "Site A", domain: "example.test" }),
    readAttestation: async () => ({ ...scope, evidenceId: "proof-a",
      authority: "certifier", complete: true, verifiedAt: "2026-10-20T01:00:00Z" }),
    readProof: async () => ({ id: "proof-a", source: "crawl", observedAt: "2026-10-20T00:00:00Z" }),
    readSources: async () => [{ source: "crawl", status: "available" as const, observedAt: "2026-10-20T00:00:00Z" }],
  },
  now: () => new Date("2026-10-20T02:00:00Z"),
};

test("invalid policy prevents staging handler creation before any readers run", () => {
  let calls = 0;
  const handler = createCustomerStagingHandlerCandidate({
    ...config, policy: { trustedAuthorities: [], maxAgeMs: 86400000 },
    readGrants: async () => { calls++; return []; },
  });
  assert.equal(handler, null);
  assert.equal(calls, 0);
});

test("candidate handler enforces auth and tenant scope before certified evidence", async () => {
  const handler = createCustomerStagingHandlerCandidate(config);
  assert.ok(handler);
  const invoke = async (subject: string | null) => {
    let status = 200;
    let body: unknown;
    const req = { auth: subject ? { subject } : undefined,
      query: { siteId: "site-a" } } as unknown as Request;
    const res = { status(code: number) { status = code; return this; },
      json(value: unknown) { body = value; return this; } } as unknown as Response;
    await handler(req, res);
    return { status, body };
  };
  assert.equal((await invoke(null)).status, 401);
  assert.equal((await invoke("foreign")).status, 404);
  const allowed = await invoke("customer-a");
  assert.equal(allowed.status, 200);
  const payload = allowed.body as { site: { id: string }; metrics: unknown[] };
  assert.equal(payload.site.id, "site-a");
  assert.deepEqual(payload.metrics, []);
});
