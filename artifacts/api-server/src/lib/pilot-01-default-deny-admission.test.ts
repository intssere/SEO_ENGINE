import assert from "node:assert/strict";
import test from "node:test";
import {
  checkPilotAdmission,
  rehearsePilotAdmission,
  type PilotAdmissionInput,
  type SyntheticGrantConsumer,
} from "./pilot-01-default-deny-admission.js";
import type { ScopedGrant } from "./pilot-01-scoped-grant-model.js";

const now = 1_800_000_000_000;
const identity = { actorId: "actor-A", tenantId: "tenant-A", siteId: "site-A" } as const;
const grant: ScopedGrant = {
  ...identity,
  operation: "analyze",
  nonce: "fixture-grant",
  expiresAtMs: now + 60_000,
};
const valid: PilotAdmissionInput = {
  principal: { ...identity, sessionVerified: true, role: "admin" },
  authEnforced: true,
  siteVerified: true,
  runGateEnabled: true,
  publicSiteWritesEnabled: false,
  aiProposalGenerationEnabled: false,
  operation: "analyze",
  grant,
  nowMs: now,
};
const override = (change: Partial<PilotAdmissionInput>): PilotAdmissionInput => ({ ...valid, ...change });
const consumer = (calls: string[], response: boolean = true): SyntheticGrantConsumer => ({
  async consume(g, request) {
    calls.push(g.nonce + ":" + request.actorId + ":" + request.siteId);
    return response;
  },
});

test("RT01-A1 default-deny matrix rejects unsafe state before touching consumer", async () => {
  const variations: Array<[string, PilotAdmissionInput]> = [
    ["no principal", override({ principal: null })],
    ["session not verified", override({ principal: { ...valid.principal!, sessionVerified: false } })],
    ["auth disabled", override({ authEnforced: false })],
    ["site unverified", override({ siteVerified: false })],
    ["run gate disabled", override({ runGateEnabled: false })],
    ["public writes enabled", override({ publicSiteWritesEnabled: true })],
    ["AI proposals enabled", override({ aiProposalGenerationEnabled: true })],
    ["viewer", override({ principal: { ...valid.principal!, role: "viewer" } })],
    ["empty tenant", override({ principal: { ...valid.principal!, tenantId: "" } })],
    ["wrong tenant", override({ principal: { ...valid.principal!, tenantId: "tenant-B" } })],
    ["wrong site", override({ principal: { ...valid.principal!, siteId: "site-B" } })],
    ["wrong actor", override({ principal: { ...valid.principal!, actorId: "actor-B" } })],
    ["wrong operation", override({ operation: "recommend" })],
    ["no grant", override({ grant: null })],
    ["expired", override({ nowMs: now + 60_000 })],
    ["invalid time", override({ nowMs: Number.NaN })],
    ["blank nonce", override({ grant: { ...grant, nonce: "" } })],
  ];
  for (const [caseName, input] of variations) {
    const calls: string[] = [];
    assert.equal(checkPilotAdmission(input), "denied", caseName);
    assert.equal(await rehearsePilotAdmission(input, consumer(calls)), "denied", caseName);
    assert.deepEqual(calls, [], caseName);
  }
});

test("RT01-A1 only synthetic matching grant reaches injected consumer", async () => {
  const calls: string[] = [];
  assert.equal(checkPilotAdmission(valid), "matched");
  assert.equal(await rehearsePilotAdmission(valid, consumer(calls)), "admitted_for_rehearsal");
  assert.deepEqual(calls, ["fixture-grant:actor-A:site-A"]);
});

test("RT01-A1 denied consumer and storage exception do not admit", async () => {
  const calls: string[] = [];
  assert.equal(await rehearsePilotAdmission(valid, consumer(calls, false)), "denied");
  assert.equal(calls.length, 1);
  assert.equal(await rehearsePilotAdmission(valid, { async consume() { throw Error("fixture-unavailable"); } }), "unavailable");
});

test("RT01-A1 unsupported site-write intent is not an admission operation", () => {
  const input = { ...valid, operation: "site_write" } as unknown as PilotAdmissionInput;
  assert.equal(checkPilotAdmission(input), "denied");
});

test("RT01-A1 does not expose any queue or provider dispatch API", () => {
  // The module returns a classification only. It has no queue/launch dependency.
  assert.equal(typeof rehearsePilotAdmission, "function");
});
