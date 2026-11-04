import assert from "node:assert/strict";
import test from "node:test";
import {
  rehearseAuthorizedQueueAdmission,
  type QueueRehearsalIntent,
  type QueueRehearsalPolicy,
  type SyntheticQueueAdmissionPort,
} from "./pilot-01-offline-queue-admission.js";
import type {
  AtomicGrantReceiptStore,
  DurableGrantReceipt,
  ServerAuthenticatedContextProvider,
  VerifiedGrantContext,
} from "./pilot-01-trusted-grant-contract.js";

const context: VerifiedGrantContext = {
  actorId: "synthetic-actor", tenantId: "synthetic-tenant",
  siteId: "synthetic-site", issuerId: "synthetic-issuer",
  sessionId: "synthetic-session", role: "admin",
  source: "server_verified_session",
};
const intent: QueueRehearsalIntent = {
  grantId: "synthetic-grant", siteId: "synthetic-site", operation: "analyze",
};
const policy: QueueRehearsalPolicy = {
  authEnforced: true, siteVerified: true, runGateEnabled: true,
  publicSiteWritesEnabled: false, aiProposalGenerationEnabled: false,
};
const receipt: DurableGrantReceipt = {
  receiptId: "synthetic-receipt", grantId: intent.grantId,
  tenantId: context.tenantId, siteId: context.siteId,
  actorId: context.actorId, issuerId: context.issuerId,
  operation: intent.operation, transactionId: "synthetic-tx",
  committedAt: "2026-11-04T00:00:00.000Z",
};
const provider = (value: VerifiedGrantContext | null = context): ServerAuthenticatedContextProvider =>
  ({ async resolve() { return value; } });
const store = (calls: string[], outcome: unknown = { status: "consumed", receipt }): AtomicGrantReceiptStore =>
  ({ async consume(input) {
    calls.push("consume:" + input.context.siteId + ":" + input.intent.grantId);
    return outcome as Awaited<ReturnType<AtomicGrantReceiptStore["consume"]>>;
  }});
const queue = (calls: string[], response: unknown = null): SyntheticQueueAdmissionPort =>
  ({ async admit(input) {
    calls.push("queue:" + input.consumed.receiptId);
    return (response ?? {
      status: "accepted",
      receipt: {
        jobId: "synthetic-job", receiptId: input.consumed.receiptId,
        grantId: input.intent.grantId, tenantId: input.context.tenantId,
        siteId: input.context.siteId, actorId: input.context.actorId,
        issuerId: input.context.issuerId, operation: input.intent.operation,
      },
    }) as Awaited<ReturnType<SyntheticQueueAdmissionPort["admit"]>>;
  }});

test("RT01-A5: only matching synthetic grant receipt reaches test queue, never dispatch", async () => {
  const calls: string[] = [];
  const result = await rehearseAuthorizedQueueAdmission(intent, policy, provider(), store(calls), queue(calls));
  assert.deepEqual(result, { status: "queued_for_rehearsal", jobId: "synthetic-job" });
  assert.deepEqual(calls, ["consume:synthetic-site:synthetic-grant", "queue:synthetic-receipt"]);
});

test("RT01-A5: disabled enforcement, gates or enabled writes deny before auth/queue", async () => {
  for (const changes of [
    { authEnforced: false }, { siteVerified: false }, { runGateEnabled: false },
    { publicSiteWritesEnabled: true }, { aiProposalGenerationEnabled: true },
  ]) {
    const calls: string[] = [];
    const result = await rehearseAuthorizedQueueAdmission(intent, { ...policy, ...changes },
      { async resolve() { calls.push("auth"); return context; } }, store(calls), queue(calls));
    assert.deepEqual(result, { status: "denied" });
    assert.deepEqual(calls, []);
  }
});

test("RT01-A5: unsupported operation, bad identifiers and cross-site intent deny before grant", async () => {
  for (const bad of [
    { ...intent, grantId: "" }, { ...intent, siteId: "" },
    { ...intent, operation: "site_write" },
    { ...intent, operation: "recommendations_write" },
  ]) {
    const calls: string[] = [];
    const result = await rehearseAuthorizedQueueAdmission(bad as QueueRehearsalIntent, policy,
      { async resolve() { calls.push("auth"); return context; } }, store(calls), queue(calls));
    assert.deepEqual(result, { status: "denied" });
    assert.deepEqual(calls, []);
  }
  const calls: string[] = [];
  const result = await rehearseAuthorizedQueueAdmission({ ...intent, siteId: "other-site" }, policy,
    provider(), store(calls), queue(calls));
  assert.deepEqual(result, { status: "denied" });
  assert.deepEqual(calls, []);
});

test("RT01-A5: invalid session context denies before grant or queue", async () => {
  for (const bad of [
    null, { ...context, source: "client_body" }, { ...context, role: "viewer" },
    { ...context, tenantId: "" }, { ...context, actorId: "" },
    { ...context, sessionId: "" }, { ...context, issuerId: "" },
  ]) {
    const calls: string[] = [];
    assert.deepEqual(await rehearseAuthorizedQueueAdmission(intent, policy,
      provider(bad as VerifiedGrantContext | null), store(calls), queue(calls)), { status: "denied" });
    assert.deepEqual(calls, []);
  }
});

test("RT01-A5: denied, unavailable, malformed or mismatched consume never calls queue", async () => {
  for (const value of [
    { status: "denied" }, { status: "unavailable" }, { status: "consumed" },
    { status: "consumed", receipt: { ...receipt, siteId: "other" } },
    { status: "consumed", receipt: { ...receipt, grantId: "other" } },
    null, true,
  ]) {
    const calls: string[] = [];
    const result = await rehearseAuthorizedQueueAdmission(intent, policy, provider(),
      store(calls, value), queue(calls));
    assert.notEqual(result.status, "queued_for_rehearsal");
    assert.deepEqual(calls, ["consume:synthetic-site:synthetic-grant"]);
  }
});

test("RT01-A5: malformed or conflicting queue receipts fail closed, no retry", async () => {
  const accepted = {
    jobId: "synthetic-job", receiptId: receipt.receiptId,
    grantId: receipt.grantId, tenantId: receipt.tenantId,
    siteId: receipt.siteId, actorId: receipt.actorId,
    issuerId: receipt.issuerId, operation: receipt.operation,
  };
  for (const response of [
    { status: "accepted", receipt: { ...accepted, jobId: "" } },
    { status: "accepted", receipt: { ...accepted, receiptId: "other" } },
    { status: "accepted", receipt: { ...accepted, grantId: "other" } },
    { status: "accepted", receipt: { ...accepted, tenantId: "other" } },
    { status: "accepted", receipt: { ...accepted, siteId: "other" } },
    { status: "accepted", receipt: { ...accepted, actorId: "other" } },
    { status: "accepted", receipt: { ...accepted, issuerId: "other" } },
    { status: "accepted", receipt: { ...accepted, operation: "site_write" } },
    { status: "accepted" }, { status: "unexpected" },
  ]) {
    const calls: string[] = [];
    const result = await rehearseAuthorizedQueueAdmission(intent, policy,
      provider(), store(calls), queue(calls, response));
    assert.deepEqual(result, { status: "unavailable" });
    assert.equal(calls.filter(x => x.startsWith("consume:")).length, 1);
    assert.equal(calls.filter(x => x.startsWith("queue:")).length, 1);
  }
});

test("RT01-A5: queue denial, outage, and exception never become authorization", async () => {
  for (const status of ["denied", "unavailable"] as const) {
    const calls: string[] = [];
    assert.deepEqual(await rehearseAuthorizedQueueAdmission(intent, policy,
      provider(), store(calls), queue(calls, { status })), { status });
    assert.deepEqual(calls, ["consume:synthetic-site:synthetic-grant", "queue:synthetic-receipt"]);
  }
  const calls: string[] = [];
  const throws: SyntheticQueueAdmissionPort = { async admit() { calls.push("queue"); throw Error("ack lost"); } };
  assert.deepEqual(await rehearseAuthorizedQueueAdmission(intent, policy,
    provider(), store(calls), throws), { status: "unavailable" });
  assert.deepEqual(calls, ["consume:synthetic-site:synthetic-grant", "queue"]);
});

test("RT01-A5: a synthetic single-use store denies replay and no second queue admission", async () => {
  let consumed = false;
  const calls: string[] = [];
  const singleUse: AtomicGrantReceiptStore = { async consume() {
    calls.push("consume");
    if (consumed) return { status: "denied" };
    consumed = true;
    return { status: "consumed", receipt };
  }};
  const first = await rehearseAuthorizedQueueAdmission(intent, policy, provider(), singleUse, queue(calls));
  const replay = await rehearseAuthorizedQueueAdmission(intent, policy, provider(), singleUse, queue(calls));
  assert.equal(first.status, "queued_for_rehearsal");
  assert.deepEqual(replay, { status: "denied" });
  assert.deepEqual(calls, ["consume", "queue:synthetic-receipt", "consume"]);
});

test("RT01-A5: injected provider/consumer exceptions fail closed with no queue access", async () => {
  const calls: string[] = [];
  const badProvider: ServerAuthenticatedContextProvider = {
    async resolve() { throw Error("session missing"); },
  };
  assert.deepEqual(await rehearseAuthorizedQueueAdmission(intent, policy,
    badProvider, store(calls), queue(calls)), { status: "unavailable" });
  assert.deepEqual(calls, []);
  const badStore: AtomicGrantReceiptStore = { async consume() { throw Error("postgres unavailable"); } };
  assert.deepEqual(await rehearseAuthorizedQueueAdmission(intent, policy,
    provider(), badStore, queue(calls)), { status: "unavailable" });
  assert.deepEqual(calls, []);
});
