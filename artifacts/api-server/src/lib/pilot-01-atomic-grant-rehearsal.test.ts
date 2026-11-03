import assert from "node:assert/strict";
import test from "node:test";
import { SyntheticAtomicGrantLedger, type RehearsalGrant } from "./pilot-01-atomic-grant-rehearsal.js";

const now = 1_800_000_000_000;
const scope = { actorId: "actor-A", tenantId: "tenant-A", siteId: "site-A" } as const;
const g: RehearsalGrant = {
  grantId: "grant-A", issuer: "synthetic-issuer", nonce: "nonce-A", ...scope,
  operation: "analyze", expiresAtMs: now + 1_000,
};
const request = { ...scope, operation: "analyze" as const };
const make = () => { const ledger = new SyntheticAtomicGrantLedger(); assert.equal(ledger.register(g), true); return ledger; };

test("RT01-A2: one consume yields one immutable receipt; replay denied", () => {
  const ledger = make();
  assert.equal(ledger.consume(g.grantId, request, now), "consumed");
  assert.equal(ledger.consume(g.grantId, request, now), "denied");
  assert.equal(ledger.status(g.grantId), "consumed");
  assert.deepEqual(ledger.auditSnapshot().map(x => x.kind), ["consumed"]);
  assert.equal(Object.isFrozen(ledger.auditSnapshot()[0]), true);
});

test("RT01-A2: revoke-before-consume and consume-before-revoke each permit one transition", () => {
  const a = make();
  assert.equal(a.revoke(g.grantId, scope), "revoked");
  assert.equal(a.consume(g.grantId, request, now), "denied");
  const b = make();
  assert.equal(b.consume(g.grantId, request, now), "consumed");
  assert.equal(b.revoke(g.grantId, scope), "denied");
  assert.equal(a.auditSnapshot().length, 1);
  assert.equal(b.auditSnapshot().length, 1);
});

test("RT01-A2: synthetic competing calls serialize to a single accepted transition", async () => {
  const ledger = make();
  const results = await Promise.all(Array.from({ length: 12 }, (_, i) =>
    Promise.resolve().then(() => i % 2 === 0
      ? ledger.consume(g.grantId, request, now)
      : ledger.revoke(g.grantId, scope))));
  assert.equal(results.filter(x => x === "consumed" || x === "revoked").length, 1);
  assert.equal(ledger.auditSnapshot().length, 1);
});

test("RT01-A2: cross-actor, cross-tenant, cross-site, operation and expiry are denied", () => {
  const ledger = make();
  const mismatches = [
    { ...request, actorId: "actor-B" },
    { ...request, tenantId: "tenant-B" },
    { ...request, siteId: "site-B" },
    { ...request, operation: "recommend" as const },
    { ...request, operation: "site_write" as const, diffHash: "diff" },
    { ...request, actorId: "" },
  ];
  for (const input of mismatches) assert.equal(ledger.consume(g.grantId, input, now), "denied");
  assert.equal(ledger.consume(g.grantId, request, now + 1_000), "denied");
  assert.equal(ledger.consume(g.grantId, request, Number.NaN), "denied");
  assert.equal(ledger.revoke(g.grantId, { ...scope, actorId: "actor-B" }), "denied");
  assert.equal(ledger.revoke(g.grantId, { ...scope, tenantId: "tenant-B" }), "denied");
  assert.equal(ledger.status(g.grantId), "active");
  assert.equal(ledger.auditSnapshot().length, 0);
});

test("RT01-A2: injected audit failure rolls back state and receipt for consumption", () => {
  const ledger = make();
  ledger.failNextReceipt();
  assert.equal(ledger.consume(g.grantId, request, now), "unavailable");
  assert.equal(ledger.status(g.grantId), "active");
  assert.equal(ledger.auditSnapshot().length, 0);
  assert.equal(ledger.consume(g.grantId, request, now), "consumed");
  assert.equal(ledger.auditSnapshot().length, 1);
});

test("RT01-A2: injected audit failure rolls back revocation", () => {
  const ledger = make();
  ledger.failNextReceipt();
  assert.equal(ledger.revoke(g.grantId, scope), "unavailable");
  assert.equal(ledger.status(g.grantId), "active");
  assert.equal(ledger.auditSnapshot().length, 0);
  assert.equal(ledger.revoke(g.grantId, scope), "revoked");
});

test("RT01-A2: duplicate grant registration and malformed issuer are denied", () => {
  const ledger = make();
  assert.equal(ledger.register(g), false);
  assert.equal(ledger.register({ ...g, grantId: "grant-B", issuer: "" }), false);
  assert.equal(ledger.register({ ...g, grantId: "grant-C", operation: "site_write" }), false);
  assert.equal(ledger.consume("missing", request, now), "denied");
  assert.equal(ledger.revoke("missing", scope), "denied");
  assert.equal(ledger.auditSnapshot().length, 0);
});

test("RT01-A2: in-memory fixture reinitialization does NOT imply durability", () => {
  const a = make();
  assert.equal(a.consume(g.grantId, request, now), "consumed");
  const b = make(); // fresh process-local fixture accepts again: intentionally NOT durable
  assert.equal(b.consume(g.grantId, request, now), "consumed");
});
