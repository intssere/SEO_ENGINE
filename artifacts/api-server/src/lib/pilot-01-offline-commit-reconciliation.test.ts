import assert from "node:assert/strict";
import test from "node:test";
import {
  rehearseUncertainCommitReconciliation,
  type AtomicAdmissionReconciliationPort,
} from "./pilot-01-offline-commit-reconciliation.js";
import type {
  AtomicAdmissionContextProvider, AtomicAdmissionPolicy,
  AtomicAdmissionReceipt, AtomicAdmissionRequest,
} from "./pilot-01-atomic-job-admission.js";
import type { VerifiedGrantContext } from "./pilot-01-trusted-grant-contract.js";

const context: VerifiedGrantContext = {
  actorId: "actor", tenantId: "tenant", siteId: "site",
  issuerId: "issuer", sessionId: "synthetic-session", role: "analyst",
  source: "server_verified_session",
};
const request: AtomicAdmissionRequest = {
  grantId: "grant", siteId: "site", operation: "analyze", idempotencyKey: "stable-key",
};
const policy: AtomicAdmissionPolicy = {
  authEnforced: true, siteVerified: true, runGateEnabled: true,
  publicSiteWritesEnabled: false, aiProposalGenerationEnabled: false,
};
const receipt: AtomicAdmissionReceipt = {
  admissionId: "admission", jobId: "job", grantId: "grant",
  idempotencyKey: "stable-key", actorId: "actor", tenantId: "tenant",
  siteId: "site", issuerId: "issuer", operation: "analyze",
  transactionId: "tx", committedAt: "2026-11-04T15:00:00.000Z",
};
const provider = (value: VerifiedGrantContext | null = context): AtomicAdmissionContextProvider =>
  ({ async resolve() { return value; } });
const lookup = (calls: string[], response: unknown): AtomicAdmissionReconciliationPort =>
  ({ async findCommitted(input) {
    calls.push(input.request.idempotencyKey);
    return response as Awaited<ReturnType<AtomicAdmissionReconciliationPort["findCommitted"]>>;
  }});

test("RT01-A8: matching persisted receipt can be confirmed only for synthetic rehearsal", async () => {
  const calls: string[] = [];
  const outcome = await rehearseUncertainCommitReconciliation(
    request, policy, provider(), lookup(calls, { status: "found", receipt }));
  assert.deepEqual(outcome, { status: "confirmed_for_rehearsal", receipt });
  assert.equal(outcome.status === "confirmed_for_rehearsal" && Object.isFrozen(outcome.receipt), true);
  assert.deepEqual(calls, ["stable-key"]);
});

test("RT01-A8: missing commit is UNRESOLVED, never permission to issue another admission", async () => {
  const calls: string[] = [];
  const outcome = await rehearseUncertainCommitReconciliation(
    request, policy, provider(), lookup(calls, { status: "not_found" }));
  assert.deepEqual(outcome, { status: "unresolved" });
  assert.deepEqual(calls, ["stable-key"]);
});

test("RT01-A8: auth and safety gates deny before any lookup", async () => {
  for (const change of [
    { authEnforced: false }, { siteVerified: false }, { runGateEnabled: false },
    { publicSiteWritesEnabled: true }, { aiProposalGenerationEnabled: true },
  ]) {
    const calls: string[] = [];
    const result = await rehearseUncertainCommitReconciliation(
      request, { ...policy, ...change }, provider(), lookup(calls, { status: "found", receipt }));
    assert.deepEqual(result, { status: "denied" });
    assert.deepEqual(calls, []);
  }
});

test("RT01-A8: invalid scope or write operations deny before lookup", async () => {
  for (const bad of [
    { ...request, grantId: "" }, { ...request, siteId: "" },
    { ...request, idempotencyKey: "" },
    { ...request, operation: "site_write" },
  ]) {
    const calls: string[] = [];
    const result = await rehearseUncertainCommitReconciliation(
      bad as AtomicAdmissionRequest, policy, provider(),
      lookup(calls, { status: "found", receipt }));
    assert.deepEqual(result, { status: "denied" });
    assert.deepEqual(calls, []);
  }
});

test("RT01-A8: unverified or mismatched principals do not access committed receipts", async () => {
  for (const bad of [
    null, { ...context, role: "viewer" }, { ...context, source: "request_body" },
    { ...context, siteId: "different" }, { ...context, sessionId: "" },
    { ...context, actorId: "" }, { ...context, tenantId: "" },
    { ...context, issuerId: "" },
  ]) {
    const calls: string[] = [];
    assert.deepEqual(await rehearseUncertainCommitReconciliation(
      request, policy, provider(bad as VerifiedGrantContext | null),
      lookup(calls, { status: "found", receipt })), { status: "denied" });
    assert.deepEqual(calls, []);
  }
});

test("RT01-A8: cross-scope or incomplete evidence is conflict, never confirmation", async () => {
  const changes: Partial<AtomicAdmissionReceipt>[] = [
    { grantId: "other" }, { idempotencyKey: "other" }, { actorId: "other" },
    { tenantId: "other" }, { siteId: "other" }, { issuerId: "other" },
    { operation: "recommend" }, { jobId: "" }, { admissionId: "" },
    { transactionId: "" }, { committedAt: "invalid" },
  ];
  for (const change of changes) {
    const calls: string[] = [];
    const outcome = await rehearseUncertainCommitReconciliation(
      request, policy, provider(),
      lookup(calls, { status: "found", receipt: { ...receipt, ...change } }));
    assert.deepEqual(outcome, { status: "conflict" });
    assert.deepEqual(calls, ["stable-key"]);
  }
});

test("RT01-A8: explicit conflicts, outages, invalid responses and exceptions fail closed", async () => {
  for (const [value, expected] of [
    [{ status: "conflict" }, "conflict"],
    [{ status: "unavailable" }, "unavailable"],
    [null, "unavailable"], [true, "unavailable"],
    [{ status: "unexpected" }, "unavailable"],
    [{ status: "found" }, "conflict"],
  ] as const) {
    const result = await rehearseUncertainCommitReconciliation(
      request, policy, provider(), lookup([], value));
    assert.deepEqual(result, { status: expected });
  }
  const outage: AtomicAdmissionReconciliationPort = {
    async findCommitted() { throw Error("connection lost"); },
  };
  assert.deepEqual(await rehearseUncertainCommitReconciliation(
    request, policy, provider(), outage), { status: "unavailable" });
  const missingSession: AtomicAdmissionContextProvider = {
    async resolve() { throw Error("session service unavailable"); },
  };
  assert.deepEqual(await rehearseUncertainCommitReconciliation(
    request, policy, missingSession, lookup([], { status: "found", receipt })),
    { status: "unavailable" });
});

test("RT01-A8: recovery performs a single read-only call; no retry side-effects", async () => {
  let calls = 0;
  const readOnly: AtomicAdmissionReconciliationPort = {
    async findCommitted() {
      calls++;
      return { status: "not_found" };
    },
  };
  const outcome = await rehearseUncertainCommitReconciliation(request, policy, provider(), readOnly);
  assert.deepEqual(outcome, { status: "unresolved" });
  assert.equal(calls, 1);
});
