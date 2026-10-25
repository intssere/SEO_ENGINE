import assert from "node:assert/strict";
import test from "node:test";
import { GSC_READONLY_PROFILE, GSC_READONLY_SCOPE } from "@seo-engine/oauth-connection-manager/gsc-readonly";
import { GSC_S0_HISTORICAL_SITE_ID } from "./gsc-stage0-static-review.js";
import {
  GSC_S1B_VERSION, simulateGscS1bRegister, simulateGscS1bConsume,
  type GscS1bAttempt, type GscS1bDisposableAtomicPort,
  type GscS1bRegistration, type GscS1bObservation,
} from "./gsc-s1b-disposable-atomic-port.js";

const fingerprint = (c: string) => c.repeat(64);
const t0 = 1_782_316_800_000;
const ID = ["organizationFingerprint", "principalFingerprint", "sessionFingerprint",
  "clientGenerationFingerprint", "redirectFingerprint"] as const;

function state(): GscS1bRegistration {
  return {
    version: GSC_S1B_VERSION, purpose: GSC_READONLY_PROFILE,
    siteId: GSC_S0_HISTORICAL_SITE_ID, scope: GSC_READONLY_SCOPE,
    stateFingerprint: fingerprint("a"),
    organizationFingerprint: fingerprint("1"),
    principalFingerprint: fingerprint("2"),
    sessionFingerprint: fingerprint("3"),
    clientGenerationFingerprint: fingerprint("4"),
    redirectFingerprint: fingerprint("5"),
    issuedAtMs: t0, expiresAtMs: t0 + 600_000,
  };
}
function callback(record: GscS1bRegistration = state()): GscS1bAttempt {
  return {
    stateFingerprint: record.stateFingerprint,
    organizationFingerprint: record.organizationFingerprint,
    principalFingerprint: record.principalFingerprint,
    sessionFingerprint: record.sessionFingerprint,
    clientGenerationFingerprint: record.clientGenerationFingerprint,
    redirectFingerprint: record.redirectFingerprint,
    observedAtMs: t0 + 1500,
  };
}
function neverAuthorized(value: GscS1bObservation) {
  assert.equal(value.kind, "untrusted_disposable_store_claim_only");
  assert.deepEqual([
    value.atomicityIndependentlyVerified, value.durableStorageVerified,
    value.distributedReplayResistanceVerified, value.trustedStateVerified,
    value.consentAuthorized, value.tokenExchangeAuthorized,
    value.credentialWriteAuthorized, value.providerReadAuthorized,
    value.runtimeBindingAuthorized,
  ], [false, false, false, false, false, false, false, false, false]);
}
function status(value: GscS1bObservation, expected: GscS1bObservation["status"]) {
  assert.equal(value.status, expected);
  neverAuthorized(value);
}
/** Test double only. This map does not establish real distributed DB atomicity. */
class SharedSyntheticStore implements GscS1bDisposableAtomicPort {
  private rows = new Map<string, { record: Readonly<GscS1bRegistration>; used: boolean }>();
  async insertIfAbsent(record: Readonly<GscS1bRegistration>): Promise<unknown> {
    if (this.rows.has(record.stateFingerprint)) return { status: "duplicate" };
    this.rows.set(record.stateFingerprint, { record, used: false });
    return { status: "inserted" };
  }
  async consumeIfPendingAndBound(attempt: Readonly<GscS1bAttempt>): Promise<unknown> {
    const row = this.rows.get(attempt.stateFingerprint);
    if (!row) return { status: "missing" };
    if (row.used) return { status: "replay" };
    if (ID.some(k => attempt[k] !== row.record[k])) return { status: "mismatch" };
    if (attempt.observedAtMs <= row.record.issuedAtMs ||
        attempt.observedAtMs > row.record.expiresAtMs) return { status: "expired" };
    // Check-and-set completes synchronously, BEFORE Promise resolution.
    row.used = true;
    return { status: "consumed" };
  }
}
const delegate = (port: SharedSyntheticStore): GscS1bDisposableAtomicPort => ({
  insertIfAbsent: x => port.insertIfAbsent(x),
  consumeIfPendingAndBound: x => port.consumeIfPendingAndBound(x),
});
test("shared disposable fake: multiple callers observe only one synthetic consume winner", async () => {
  const shared = new SharedSyntheticStore();
  status(await simulateGscS1bRegister(delegate(shared), state()), "synthetic_inserted");
  const callers = Array.from({ length: 24 }, () => delegate(shared));
  const result = await Promise.all(callers.map(p => simulateGscS1bConsume(p, callback())));
  assert.equal(result.filter(v => v.status === "synthetic_consumed").length, 1);
  assert.equal(result.filter(v => v.status === "synthetic_replay").length, 23);
  for (const r of result) neverAuthorized(r);
});
test("duplicate issue never reopens consumed synthetic state", async () => {
  const port = new SharedSyntheticStore();
  status(await simulateGscS1bRegister(port, state()), "synthetic_inserted");
  status(await simulateGscS1bConsume(port, callback()), "synthetic_consumed");
  status(await simulateGscS1bRegister(port, state()), "synthetic_duplicate");
  status(await simulateGscS1bConsume(port, callback()), "synthetic_replay");
});
test("wrong principal, org, session, client or redirect never consumes", async () => {
  for (const k of ID) {
    const port = new SharedSyntheticStore();
    status(await simulateGscS1bRegister(port, state()), "synthetic_inserted");
    status(await simulateGscS1bConsume(port, { ...callback(), [k]: fingerprint("b") }), "synthetic_mismatch");
    status(await simulateGscS1bConsume(port, callback()), "synthetic_consumed");
  }
});
test("time boundaries are checked within fake predicate and failed attempt does not consume", async () => {
  const port = new SharedSyntheticStore();
  status(await simulateGscS1bRegister(port, state()), "synthetic_inserted");
  status(await simulateGscS1bConsume(port, { ...callback(), observedAtMs: t0 }), "synthetic_expired");
  status(await simulateGscS1bConsume(port, { ...callback(), observedAtMs: t0 + 600_001 }), "synthetic_expired");
  status(await simulateGscS1bConsume(port, { ...callback(), observedAtMs: t0 + 600_000 }), "synthetic_consumed");
});
test("unknown callback and bad request shapes never create fake state", async () => {
  const port = new SharedSyntheticStore();
  status(await simulateGscS1bConsume(port, callback()), "synthetic_missing");
  status(await simulateGscS1bRegister(port, { ...state(), stateFingerprint: "not-hex" }), "synthetic_invalid_input");
  status(await simulateGscS1bConsume(port, callback()), "synthetic_missing");
  status(await simulateGscS1bConsume(port, { ...callback(), observedAtMs: 1.1 }), "synthetic_invalid_input");
});
test("GSC-only profile, candidate site, exact readonly scope and TTL are fail closed", async () => {
  const patches = [
    { purpose: "legacy_google" }, { siteId: "wrong-site" },
    { scope: "https://www.googleapis.com/auth/webmasters" },
    { scope: "https://www.googleapis.com/auth/analytics.readonly" },
    { expiresAtMs: t0 + 600_001 }, { expiresAtMs: t0 },
  ];
  for (const patch of patches) {
    const port = new SharedSyntheticStore();
    status(await simulateGscS1bRegister(port, { ...state(), ...patch }), "synthetic_invalid_input");
    status(await simulateGscS1bConsume(port, callback()), "synthetic_missing");
  }
});
test("unexpected secrets, fake grants and hidden fields are denied without port invocation", async () => {
  let calls = 0;
  const trap: GscS1bDisposableAtomicPort = {
    async insertIfAbsent() { calls++; return { status: "inserted" }; },
    async consumeIfPendingAndBound() { calls++; return { status: "consumed" }; },
  };
  for (const field of [
    { codeVerifier: "fake" }, { tokenExchangeAuthorized: true },
    { accessToken: "fake" }, { authorizationCode: "fake" },
  ]) status(await simulateGscS1bRegister(trap, { ...state(), ...field }), "synthetic_invalid_input");
  const hidden = { ...state() };
  Object.defineProperty(hidden, "privateSecret", { enumerable: false, value: "fake" });
  status(await simulateGscS1bRegister(trap, hidden), "synthetic_invalid_input");
  status(await simulateGscS1bConsume(trap, { ...callback(), code: "fake" }), "synthetic_invalid_input");
  assert.equal(calls, 0);
});
test("accessors and revoked proxies rejected before invoking port", async () => {
  const port = new SharedSyntheticStore();
  let accesses = 0;
  const input = { ...state() };
  Object.defineProperty(input, "stateFingerprint", { enumerable: true,
    get() { accesses++; throw new Error("getter must not execute"); },
  });
  status(await simulateGscS1bRegister(port, input), "synthetic_invalid_input");
  assert.equal(accesses, 0);
  const revoked = Proxy.revocable(callback(), {});
  revoked.revoke();
  status(await simulateGscS1bConsume(port, revoked.proxy), "synthetic_invalid_input");
});
test("proxy get traps are not consulted on own data-descriptor snapshot", async () => {
  const port = new SharedSyntheticStore();
  let reads = 0;
  const input = new Proxy(state(), { get() { reads++; throw new Error("forbidden"); } });
  status(await simulateGscS1bRegister(port, input), "synthetic_inserted");
  const attempt = new Proxy(callback(), { get() { reads++; throw new Error("forbidden"); } });
  status(await simulateGscS1bConsume(port, attempt), "synthetic_consumed");
  assert.equal(reads, 0);
});
test("forged, accessor-bearing, extra-field or unexpected port receipts fail closed", async () => {
  const port = (answer: unknown): GscS1bDisposableAtomicPort => ({
    async insertIfAbsent() { return answer; },
    async consumeIfPendingAndBound() { return answer; },
  });
  for (const value of [
    null, undefined, {}, { status: "approved" }, { status: "consumed", authority: true },
    { status: true }, ["consumed"],
  ]) {
    status(await simulateGscS1bRegister(port(value), state()), "synthetic_invalid_receipt");
    status(await simulateGscS1bConsume(port(value), callback()), "synthetic_invalid_receipt");
  }
  let calls = 0;
  const r: Record<string, unknown> = {};
  Object.defineProperty(r, "status", { enumerable: true,
    get() { calls++; throw new Error("must not run"); },
  });
  status(await simulateGscS1bConsume(port(r), callback()), "synthetic_invalid_receipt");
  assert.equal(calls, 0);
});
test("port network-like errors do not leak or grant any authorization", async () => {
  const port: GscS1bDisposableAtomicPort = {
    async insertIfAbsent() { throw new Error("synthetic-secret-do-not-echo"); },
    async consumeIfPendingAndBound() { throw new Error("synthetic-secret-do-not-echo"); },
  };
  for (const r of [
    await simulateGscS1bRegister(port, state()),
    await simulateGscS1bConsume(port, callback()),
  ]) {
    status(r, "synthetic_port_error");
    assert.equal(JSON.stringify(r).includes("synthetic-secret"), false);
  }
});
test("two truly separate stores both consume: shared/distributed storage is NOT proven", async () => {
  const left = new SharedSyntheticStore(), right = new SharedSyntheticStore();
  for (const port of [left, right]) status(await simulateGscS1bRegister(port, state()), "synthetic_inserted");
  status(await simulateGscS1bConsume(left, callback()), "synthetic_consumed");
  status(await simulateGscS1bConsume(right, callback()), "synthetic_consumed");
});
test("dishonest port can report two consumes: result is NEVER a real grant", async () => {
  let claims = 0;
  const dishonest: GscS1bDisposableAtomicPort = {
    async insertIfAbsent() { return { status: "inserted" }; },
    async consumeIfPendingAndBound() { claims++; return { status: "consumed" }; },
  };
  const both = await Promise.all([
    simulateGscS1bConsume(dishonest, callback()),
    simulateGscS1bConsume(dishonest, callback()),
  ]);
  assert.equal(claims, 2);
  for (const v of both) {
    status(v, "synthetic_consumed");
    assert.equal(v.simulatedPortReportedConsume, true);
    assert.equal(v.distributedReplayResistanceVerified, false);
    assert.equal(v.tokenExchangeAuthorized, false);
  }
});
