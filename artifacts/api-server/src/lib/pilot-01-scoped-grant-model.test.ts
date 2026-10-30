import assert from "node:assert/strict";
import test from "node:test";
import { evaluatePilotGrant, type ScopedGrant, type PilotRequest } from "./pilot-01-scoped-grant-model.js";

const now = 1_800_000_000_000;
const grant: ScopedGrant = {
  actorId: "owner-A", tenantId: "tenant-A", siteId: "site-A",
  operation: "analyze", expiresAtMs: now + 60_000, nonce: "fixture-nonce",
};
const request: PilotRequest = {
  actorId: "owner-A", tenantId: "tenant-A", siteId: "site-A", operation: "analyze",
};
test("exact actor tenant site and operation match for an offline analysis fixture", () => {
  assert.equal(evaluatePilotGrant(grant, request, now), "matched");
});
test("deny missing, expired and malformed grant fixture", () => {
  assert.equal(evaluatePilotGrant(null, request, now), "denied");
  assert.equal(evaluatePilotGrant({...grant, expiresAtMs: now}, request, now), "denied");
  assert.equal(evaluatePilotGrant({...grant, nonce: " "}, request, now), "denied");
});
test("deny cross-tenant, cross-site and different actor requests", () => {
  for (const overrides of [{tenantId:"tenant-B"}, {siteId:"site-B"}, {actorId:"owner-B"}]) {
    assert.equal(evaluatePilotGrant(grant, {...request, ...overrides}, now), "denied");
  }
});
test("analysis and recommendation grants can never authorize a site-write request", () => {
  const write: PilotRequest = {...request, operation: "site_write", diffHash: "diff-A"};
  assert.equal(evaluatePilotGrant(grant, write, now), "denied");
  assert.equal(evaluatePilotGrant({...grant, operation:"recommend"}, write, now), "denied");
  assert.equal(evaluatePilotGrant({...grant, operation:"site_write"}, write, now), "denied");
  assert.equal(evaluatePilotGrant({...grant, operation:"site_write", approvedDiffHash:"diff-B"}, write, now), "denied");
  assert.equal(evaluatePilotGrant({...grant, operation:"site_write", approvedDiffHash:"diff-A"}, write, now), "matched");
});
test("pure evaluator is NOT one-shot: replay and revocation must be separate enforced gates", () => {
  assert.equal(evaluatePilotGrant(grant, request, now), "matched");
  assert.equal(evaluatePilotGrant(grant, request, now), "matched");
});
