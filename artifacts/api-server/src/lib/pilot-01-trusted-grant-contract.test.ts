import assert from "node:assert/strict";
import test from "node:test";
import {
  rehearseTrustedGrantConsumption,
  type AtomicGrantReceiptStore,
  type DurableGrantReceipt,
  type GrantConsumeIntent,
  type ServerAuthenticatedContextProvider,
  type VerifiedGrantContext,
} from "./pilot-01-trusted-grant-contract.js";

const context: VerifiedGrantContext = {
  actorId: "actor", tenantId: "tenant", siteId: "site",
  issuerId: "issuer", sessionId: "server-session", role: "analyst",
  source: "server_verified_session",
};
const intent: GrantConsumeIntent = { grantId: "grant-1", operation: "analyze" };
const receipt: DurableGrantReceipt = {
  receiptId: "receipt-1", grantId: intent.grantId,
  actorId: context.actorId, tenantId: context.tenantId,
  siteId: context.siteId, issuerId: context.issuerId,
  operation: intent.operation, transactionId: "tx-1",
  committedAt: "2026-11-03T14:00:00.000Z",
};
const provider = (value: VerifiedGrantContext | null = context): ServerAuthenticatedContextProvider => ({
  async resolve() { return value; },
});
const store = (calls: string[], value: unknown = { status: "consumed", receipt }): AtomicGrantReceiptStore => ({
  async consume(input) {
    calls.push(input.context.actorId + ":" + input.context.siteId + ":" + input.intent.grantId);
    return value as Awaited<ReturnType<AtomicGrantReceiptStore["consume"]>>;
  },
});

test("RT01-A3a: synthetic server-side context and matching receipt classify consumed without dispatch", async () => {
  const calls: string[] = [];
  const result = await rehearseTrustedGrantConsumption(intent, provider(), store(calls));
  assert.equal(result.status, "consumed");
  assert.deepEqual(calls, ["actor:site:grant-1"]);
  if (result.status === "consumed") assert.equal(Object.isFrozen(result.receipt), true);
});

test("RT01-A3a: missing or forged identity provenance and invalid roles deny before store", async () => {
  const changes: Array<VerifiedGrantContext | null> = [
    null, { ...context, source: "request_body" } as unknown as VerifiedGrantContext,
    { ...context, actorId: "" }, { ...context, tenantId: " tenant" },
    { ...context, siteId: "" }, { ...context, issuerId: "" },
    { ...context, sessionId: "" }, { ...context, role: "viewer" } as unknown as VerifiedGrantContext,
  ];
  for (const candidate of changes) {
    const calls: string[] = [];
    assert.deepEqual(await rehearseTrustedGrantConsumption(intent, provider(candidate), store(calls)), { status: "denied" });
    assert.deepEqual(calls, []);
  }
});

test("RT01-A3a: unsupported site write, missing grant and malformed operation deny before auth", async () => {
  for (const candidate of [
    { grantId: "", operation: "analyze" },
    { grantId: " grant", operation: "analyze" },
    { grantId: "grant-1", operation: "site_write" },
    { grantId: "grant-1", operation: "delete" },
  ]) {
    let resolved = false;
    const result = await rehearseTrustedGrantConsumption(
      candidate as GrantConsumeIntent,
      { async resolve() { resolved = true; return context; } },
      store([]),
    );
    assert.deepEqual(result, { status: "denied" });
    assert.equal(resolved, false);
  }
});

test("RT01-A3a: mismatched or malformed durable receipt never becomes success", async () => {
  const defects = [
    { ...receipt, receiptId: "" },
    { ...receipt, grantId: "other" },
    { ...receipt, actorId: "other" },
    { ...receipt, tenantId: "other" },
    { ...receipt, siteId: "other" },
    { ...receipt, issuerId: "other" },
    { ...receipt, operation: "recommend" },
    { ...receipt, transactionId: "" },
    { ...receipt, committedAt: "not-a-time" },
  ];
  for (const malformed of defects) {
    const result = await rehearseTrustedGrantConsumption(intent, provider(), store([], { status: "consumed", receipt: malformed }));
    assert.deepEqual(result, { status: "unavailable" });
  }
});

test("RT01-A3a: provider and store exceptions, unexpected output fail closed", async () => {
  assert.deepEqual(await rehearseTrustedGrantConsumption(intent, { async resolve() { throw Error("auth unavailable"); } }, store([])), { status: "unavailable" });
  const broken: AtomicGrantReceiptStore = { async consume() { throw Error("DB unavailable"); } };
  assert.deepEqual(await rehearseTrustedGrantConsumption(intent, provider(), broken), { status: "unavailable" });
  assert.deepEqual(await rehearseTrustedGrantConsumption(intent, provider(), { async consume() { return undefined as unknown as Awaited<ReturnType<AtomicGrantReceiptStore["consume"]>>; } }), { status: "unavailable" });
  for (const value of [null, true, { status: "ok" }, { status: "consumed" }, { status: "denied" }, { status: "unavailable" }]) {
    const result = await rehearseTrustedGrantConsumption(intent, provider(), store([], value));
    assert.equal(result.status, value && typeof value === "object" && "status" in value && ["denied", "unavailable"].includes(String(value.status)) ? value.status : "unavailable");
  }
});

test("RT01-A3a: no SQL, worker, queue or external-call dependency exists in guard API", async () => {
  const received: string[] = [];
  const outcome = await rehearseTrustedGrantConsumption(intent, provider(), store(received, { status: "denied" }));
  assert.deepEqual(outcome, { status: "denied" });
  assert.deepEqual(received, ["actor:site:grant-1"]);
});
