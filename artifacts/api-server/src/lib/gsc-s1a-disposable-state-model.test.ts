import assert from "node:assert/strict";
import test from "node:test";
import { GSC_READONLY_PROFILE, GSC_READONLY_SCOPE } from "@seo-engine/oauth-connection-manager/gsc-readonly";
import { GSC_S0_HISTORICAL_SITE_ID } from "./gsc-stage0-static-review.js";
import {
  GSC_S1A_MODEL_VERSION,
  DisposableGscS1aStateModel,
  type GscS1aSyntheticAttempt,
  type GscS1aSyntheticIssue,
  type GscS1aModelResult,
} from "./gsc-s1a-disposable-state-model.js";

const fingerprint = (x: string) => x.repeat(64);
const t0 = 1_782_316_800_000;
function issue(): GscS1aSyntheticIssue {
  return {
    version: GSC_S1A_MODEL_VERSION,
    purpose: GSC_READONLY_PROFILE,
    siteId: GSC_S0_HISTORICAL_SITE_ID,
    scope: GSC_READONLY_SCOPE,
    stateFingerprint: fingerprint("a"),
    organizationFingerprint: fingerprint("1"),
    principalFingerprint: fingerprint("2"),
    sessionFingerprint: fingerprint("3"),
    clientGenerationFingerprint: fingerprint("4"),
    redirectFingerprint: fingerprint("5"),
    issuedAtMs: t0,
    expiresAtMs: t0 + 600_000,
  };
}
function attempt(record: GscS1aSyntheticIssue = issue()): GscS1aSyntheticAttempt {
  return {
    stateFingerprint: record.stateFingerprint,
    organizationFingerprint: record.organizationFingerprint,
    principalFingerprint: record.principalFingerprint,
    sessionFingerprint: record.sessionFingerprint,
    clientGenerationFingerprint: record.clientGenerationFingerprint,
    redirectFingerprint: record.redirectFingerprint,
    observedAtMs: t0 + 1000,
  };
}
function assertNoAuthority(result: GscS1aModelResult) {
  assert.equal(result.kind, "disposable_single_process_simulation_only");
  assert.deepEqual([
    result.trustedNonceVerified, result.durableAtomicStateVerified,
    result.distributedReplayResistanceVerified, result.consentAuthorized,
    result.tokenExchangeAuthorized, result.credentialWriteAuthorized,
    result.providerReadAuthorized, result.runtimeBindingAuthorized,
  ], [false, false, false, false, false, false, false, false]);
}
function expectStatus(result: GscS1aModelResult, status: GscS1aModelResult["status"]) {
  assert.equal(result.status, status);
  assertNoAuthority(result);
}

test("single-instance synthetic issue/consume succeeds once then permanently rejects replay", () => {
  const model = new DisposableGscS1aStateModel();
  expectStatus(model.issue(issue()), "synthetic_issued");
  const consumed = model.attemptConsume(attempt());
  expectStatus(consumed, "synthetic_consumed");
  assert.equal(consumed.simulatedConsumptionObserved, true);
  for (let n = 0; n < 5; n++) expectStatus(model.attemptConsume(attempt()), "synthetic_replay");
});

test("attempt on missing state and malformed state cannot create phantom records", () => {
  const model = new DisposableGscS1aStateModel();
  expectStatus(model.attemptConsume(attempt()), "synthetic_missing");
  expectStatus(model.issue({ ...issue(), stateFingerprint: "bad" }), "synthetic_invalid");
  expectStatus(model.attemptConsume(attempt()), "synthetic_missing");
});

test("reissuing a consumed state never resets the local simulated replay barrier", () => {
  const model = new DisposableGscS1aStateModel();
  expectStatus(model.issue(issue()), "synthetic_issued");
  expectStatus(model.attemptConsume(attempt()), "synthetic_consumed");
  expectStatus(model.issue(issue()), "synthetic_duplicate");
  expectStatus(model.attemptConsume(attempt()), "synthetic_replay");
});

test("simultaneous local microtasks produce exactly one local winner", async () => {
  const model = new DisposableGscS1aStateModel();
  expectStatus(model.issue(issue()), "synthetic_issued");
  const attempts = await Promise.all(
    Array.from({ length: 12 }, () => Promise.resolve().then(() => model.attemptConsume(attempt()))),
  );
  assert.equal(attempts.filter(r => r.status === "synthetic_consumed").length, 1);
  assert.equal(attempts.filter(r => r.status === "synthetic_replay").length, 11);
  for (const r of attempts) assertNoAuthority(r);
});

test("principal, organization, session, client generation and redirect mismatch do not consume", () => {
  for (const key of [
    "organizationFingerprint", "principalFingerprint", "sessionFingerprint",
    "clientGenerationFingerprint", "redirectFingerprint",
  ] as const) {
    const model = new DisposableGscS1aStateModel();
    expectStatus(model.issue(issue()), "synthetic_issued");
    expectStatus(model.attemptConsume({ ...attempt(), [key]: fingerprint("b") }), "synthetic_mismatch");
    expectStatus(model.attemptConsume(attempt()), "synthetic_consumed");
  }
});

test("expired, early, oversized-TTL and malformed timestamp requests deny without grants", () => {
  const model = new DisposableGscS1aStateModel();
  expectStatus(model.issue(issue()), "synthetic_issued");
  expectStatus(model.attemptConsume({ ...attempt(), observedAtMs: t0 }), "synthetic_expired");
  expectStatus(model.attemptConsume({ ...attempt(), observedAtMs: t0 + 600_001 }), "synthetic_expired");
  expectStatus(model.attemptConsume({ ...attempt(), observedAtMs: -5 }), "synthetic_invalid");
  expectStatus(model.attemptConsume({ ...attempt(), observedAtMs: 1.5 }), "synthetic_invalid");
  expectStatus(model.attemptConsume({ ...attempt(), observedAtMs: t0 + 600_000 }), "synthetic_consumed");
  const oversized = new DisposableGscS1aStateModel();
  expectStatus(oversized.issue({ ...issue(), expiresAtMs: t0 + 600_001 }), "synthetic_invalid");
  expectStatus(oversized.issue({ ...issue(), expiresAtMs: t0 }), "synthetic_invalid");
});

test("legacy profile, widened scope and unrelated target candidates cannot enter the model", () => {
  for (const patch of [
    { purpose: "legacy_google" }, { scope: "https://www.googleapis.com/auth/webmasters" },
    { siteId: "unrelated-site-uuid" }, { scope: "https://www.googleapis.com/auth/analytics.readonly" },
  ]) {
    const model = new DisposableGscS1aStateModel();
    expectStatus(model.issue({ ...issue(), ...patch }), "synthetic_invalid");
    expectStatus(model.attemptConsume(attempt()), "synthetic_missing");
  }
});

test("extra authorization fields, codes, secrets and arbitrary metadata are not accepted", () => {
  for (const patch of [
    { consentAuthorized: true }, { tokenExchangeAuthorized: true },
    { clientSecret: "synthetic-secret" }, { authorizationCode: "synthetic-code" },
  ]) expectStatus(new DisposableGscS1aStateModel().issue({ ...issue(), ...patch }), "synthetic_invalid");
  expectStatus(new DisposableGscS1aStateModel().attemptConsume({
    ...attempt(), authorizationCode: "fake",
  }), "synthetic_invalid");
});

test("no prototype, accessor, extra symbol or revoked Proxy can enter the model", () => {
  const model = new DisposableGscS1aStateModel();
  let getters = 0;
  const i = { ...issue() };
  Object.defineProperty(i, "principalFingerprint", {
    enumerable: true, get() { getters++; throw new Error("getter cannot execute"); },
  });
  expectStatus(model.issue(i), "synthetic_invalid");
  assert.equal(getters, 0);
  expectStatus(model.issue({ ...issue(), [Symbol("admin")]: true }), "synthetic_invalid");
  const revoked = Proxy.revocable(issue(), {});
  revoked.revoke();
  expectStatus(model.issue(revoked.proxy), "synthetic_invalid");
  expectStatus(model.issue(new Date()), "synthetic_invalid");
});

test("proxy getter traps are not consulted when snapshots contain own data descriptors", () => {
  const model = new DisposableGscS1aStateModel();
  let reads = 0;
  const p = new Proxy(issue(), { get() { reads++; throw new Error("forbidden"); } });
  expectStatus(model.issue(p), "synthetic_issued");
  assert.equal(reads, 0);
  const a = new Proxy(attempt(), { get() { reads++; throw new Error("forbidden"); } });
  expectStatus(model.attemptConsume(a), "synthetic_consumed");
  assert.equal(reads, 0);
});

test("two separate model instances both consume: this is NOT distributed replay protection", () => {
  // Deliberate failure of global invariant: this is why a real durable atomic
  // shared store + transaction isolation certification is a separate gate.
  const left = new DisposableGscS1aStateModel();
  const right = new DisposableGscS1aStateModel();
  expectStatus(left.issue(issue()), "synthetic_issued");
  expectStatus(right.issue(issue()), "synthetic_issued");
  expectStatus(left.attemptConsume(attempt()), "synthetic_consumed");
  expectStatus(right.attemptConsume(attempt()), "synthetic_consumed");
});

test("simulation result never contains raw tokens, state values, cookies or account IDs", () => {
  const model = new DisposableGscS1aStateModel();
  const result = model.issue(issue());
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes(fingerprint("a")), false);
  assert.equal(serialized.includes("accessToken"), false);
  assert.equal(serialized.includes("authorizationCode"), false);
  assertNoAuthority(result);
});
