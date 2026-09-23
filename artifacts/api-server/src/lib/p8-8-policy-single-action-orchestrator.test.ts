import assert from "node:assert/strict";
import test from "node:test";
import {
  buildP88W07VerificationEvidence,
  type P88W07DispatchState,
} from "./p8-8-policy-single-action-apply.js";
import {
  runP88W07ForwardExecution,
  runP88W07RollbackClosure,
  type P88W07DispatchCoordinator,
} from "./p8-8-policy-single-action-orchestrator.js";
import type { P88W07DispatchReceipt } from "./p8-8-policy-dispatch-store.js";
import type { P88W07ShopifyMutationResult } from "./p8-8-policy-shopify-mutation.js";
import { buildP88W07TestFixture } from "./p8-8-w07-test-fixture.js";

function coordinator(
  base: ReturnType<typeof buildP88W07TestFixture>,
  initial: P88W07DispatchState = "reserved_prewrite",
  replayStarted = false,
): P88W07DispatchCoordinator & { states: P88W07DispatchState[] } {
  let state = initial;
  let revision = 1;
  let forwardAttemptCount: 0 | 1 =
    initial === "reserved_prewrite" || initial === "cancelled_before_dispatch"
      ? 0
      : 1;
  let rollbackAttemptCount: 0 | 1 =
    initial === "rollback_started"
      || initial === "rollback_verification_pending"
      || initial === "rollback_verified_closed"
      ? 1
      : 0;
  let occurrence: "none" | "possible" | "confirmed" =
    forwardAttemptCount === 0 ? "none" : "possible";
  const states: P88W07DispatchState[] = [state];

  const receipt = (): P88W07DispatchReceipt => Object.freeze({
    version: "p8-8-w07-policy-dispatch-v1",
    dispatchId: base.executionIntent.dispatchId,
    dispatchFingerprint: base.executionIntent.dispatchFingerprint,
    executionId: base.executionIntent.executionId,
    executionFingerprint: base.executionIntent.executionFingerprint,
    siteId: base.executionIntent.siteId,
    reservationId: base.executionIntent.reservation.reservationId,
    reservationFingerprint: base.executionIntent.reservation.reservationFingerprint,
    claimId: base.executionIntent.claim.claimId,
    claimFingerprint: base.executionIntent.claim.claimFingerprint,
    policyActionId: base.executionIntent.authorization.policyActionId,
    w06PreflightId: base.executionIntent.preflight.preflightId,
    w06PreflightFingerprint: base.executionIntent.preflight.preflightFingerprint,
    state,
    revision,
    forwardAttemptCount,
    rollbackAttemptCount,
    publicWriteOccurrence: occurrence,
    providerRequestId: null,
    providerOperationFingerprint: null,
    providerResponseFingerprint: null,
    finalClosureReason: null,
    updatedAt: "2026-09-23T12:00:01.000Z",
    durable: true,
    forwardRetryAllowed: false,
    rollbackRetryAllowed: false,
  });

  return {
    states,
    async reservePrewrite() {
      return { kind: "existing_exact", receipt: receipt() };
    },
    async startDispatch() {
      if (replayStarted || state !== "reserved_prewrite") {
        return {
          kind: "already_started_or_terminal",
          receipt: receipt(),
        };
      }
      state = "dispatch_started";
      revision += 1;
      forwardAttemptCount = 1;
      occurrence = "possible";
      states.push(state);
      return { kind: "started_new", receipt: receipt() };
    },
    async startRollback() {
      if (state !== "rollback_required") {
        return {
          kind: "already_started_or_terminal",
          receipt: receipt(),
        };
      }
      state = "rollback_started";
      revision += 1;
      rollbackAttemptCount = 1;
      states.push(state);
      return { kind: "started_new", receipt: receipt() };
    },
    async transition(input) {
      state = input.toState;
      revision += 1;
      if (state === "rollback_started") rollbackAttemptCount = 1;
      occurrence = input.publicWriteOccurrence;
      states.push(state);
      return receipt();
    },
    async readDispatch() {
      return receipt();
    },
  };
}

function accepted(
  purpose: "forward" | "rollback",
  f: ReturnType<typeof buildP88W07TestFixture>,
): P88W07ShopifyMutationResult {
  return {
    version: "p8-8-w07-shopify-product-seo-mutation-v1",
    kind: "accepted",
    purpose,
    requestId: "req-" + purpose,
    operationFingerprint: (purpose === "forward" ? "a" : "b").repeat(64),
    responseFingerprint: (purpose === "forward" ? "c" : "d").repeat(64),
    returnedResourceGid: f.executionIntent.target.resourceGid,
    returnedRawValue: purpose === "forward"
      ? f.executionIntent.state.afterValue
      : f.executionIntent.state.beforeValue,
    userErrors: [],
    providerMutationCalled: true,
    providerWriteOutcomeCertain: true,
    retryAllowed: false,
  };
}

function rejected(
  f: ReturnType<typeof buildP88W07TestFixture>,
): P88W07ShopifyMutationResult {
  return {
    version: "p8-8-w07-shopify-product-seo-mutation-v1",
    kind: "rejected",
    purpose: "forward",
    requestId: "req-rejected",
    operationFingerprint: "e".repeat(64),
    responseFingerprint: "f".repeat(64),
    returnedResourceGid: null,
    returnedRawValue: null,
    userErrors: [{ field: ["product", "seo"], message: "rejected" }],
    providerMutationCalled: true,
    providerWriteOutcomeCertain: true,
    retryAllowed: false,
  };
}

function evidence(
  f: ReturnType<typeof buildP88W07TestFixture>,
  purpose: "forward" | "rollback",
  status: "verified" | "failed" | "unavailable" = "verified",
) {
  const value = purpose === "forward"
    ? f.executionIntent.state.afterValue
    : f.executionIntent.state.beforeValue;
  const fingerprint = purpose === "forward"
    ? f.executionIntent.state.afterFingerprint
    : f.executionIntent.state.beforeFingerprint;
  return buildP88W07VerificationEvidence({
    status,
    providerRawValue: status === "unavailable" ? null : value,
    providerObservedFingerprint: status === "unavailable" ? null : fingerprint,
    providerVerified: status === "verified",
    storefrontVerified: status === "verified",
    failureCategories: status === "failed" ? ["synthetic_verification_failure"] : [],
  });
}

test("W07 forward accepted response becomes live only after exact dual verification", async () => {
  const f = buildP88W07TestFixture();
  const store = coordinator(f);
  let mutationCalls = 0;
  let verifyCalls = 0;
  const result = await runP88W07ForwardExecution({
    store,
    handoff: f.handoff,
    intent: f.executionIntent,
    eligibility: f.eligibility,
    finalBeforeObservation: f.observation,
    mutate: async () => {
      mutationCalls += 1;
      return accepted("forward", f);
    },
    verify: async () => {
      verifyCalls += 1;
      return evidence(f, "forward");
    },
  });
  assert.equal(result.disposition, "forward_verified_live");
  assert.equal(mutationCalls, 1);
  assert.equal(verifyCalls, 1);
  assert.equal(result.providerMutationCalls, 1);
  assert.equal(result.automaticWriteRetryPerformed, false);
  assert.deepEqual(store.states, [
    "reserved_prewrite",
    "dispatch_started",
    "forward_verification_pending",
    "forward_verified_live",
  ]);
});

test("W07 replay after dispatch_started never invokes forward mutation again", async () => {
  const f = buildP88W07TestFixture();
  const store = coordinator(f, "dispatch_started", true);
  let mutationCalls = 0;
  const result = await runP88W07ForwardExecution({
    store,
    handoff: f.handoff,
    intent: f.executionIntent,
    eligibility: f.eligibility,
    finalBeforeObservation: f.observation,
    mutate: async () => {
      mutationCalls += 1;
      return accepted("forward", f);
    },
    verify: async () => evidence(f, "forward"),
  });
  assert.equal(result.disposition, "already_started_or_terminal");
  assert.equal(mutationCalls, 0);
  assert.equal(result.providerMutationCalls, 0);
});

test("W07 uncertain forward outcome becomes manual intervention with no retry", async () => {
  const f = buildP88W07TestFixture();
  const store = coordinator(f);
  let calls = 0;
  const result = await runP88W07ForwardExecution({
    store,
    handoff: f.handoff,
    intent: f.executionIntent,
    eligibility: f.eligibility,
    finalBeforeObservation: f.observation,
    mutate: async () => {
      calls += 1;
      return {
        version: "p8-8-w07-shopify-product-seo-mutation-v1",
        kind: "uncertain",
        purpose: "forward",
        requestId: null,
        operationFingerprint: "1".repeat(64),
        responseFingerprint: null,
        errorCategory: "synthetic_uncertain",
        providerMutationCalled: true,
        providerWriteOutcomeCertain: false,
        retryAllowed: false,
      };
    },
    verify: async () => {
      throw new Error("must not verify uncertain forward in initial W07");
    },
  });
  assert.equal(result.disposition, "manual_intervention_required");
  assert.equal(calls, 1);
  assert.equal(result.automaticWriteRetryPerformed, false);
});

test("W07 authoritative forward rejection closes no-write only after exact before-state verification", async () => {
  const f = buildP88W07TestFixture();
  const store = coordinator(f);
  const result = await runP88W07ForwardExecution({
    store,
    handoff: f.handoff,
    intent: f.executionIntent,
    eligibility: f.eligibility,
    finalBeforeObservation: f.observation,
    mutate: async () => rejected(f),
    verify: async ({ purpose }) => {
      assert.equal(purpose, "rollback");
      return evidence(f, "rollback");
    },
  });
  assert.equal(result.disposition, "forward_rejected_no_write");
  assert.equal(result.receipt.publicWriteOccurrence, "none");
  assert.equal(result.providerMutationCalls, 1);
  assert.equal(result.rollbackMutationCalls, 0);
});

test("W07 failed forward verification stops at rollback_required, then rollback closure spends one exact rollback", async () => {
  const f = buildP88W07TestFixture();
  const store = coordinator(f);
  let forwardCalls = 0;
  const forward = await runP88W07ForwardExecution({
    store,
    handoff: f.handoff,
    intent: f.executionIntent,
    eligibility: f.eligibility,
    finalBeforeObservation: f.observation,
    mutate: async () => {
      forwardCalls += 1;
      return accepted("forward", f);
    },
    verify: async () => evidence(f, "forward", "failed"),
  });
  assert.equal(forward.disposition, "rollback_required");
  assert.equal(forwardCalls, 1);

  let rollbackCalls = 0;
  const rollback = await runP88W07RollbackClosure({
    store,
    handoff: f.handoff,
    intent: f.executionIntent,
    mutate: async ({ purpose }) => {
      assert.equal(purpose, "rollback");
      rollbackCalls += 1;
      return accepted("rollback", f);
    },
    verify: async ({ purpose }) => {
      assert.equal(purpose, "rollback");
      return evidence(f, "rollback");
    },
  });
  assert.equal(rollback.disposition, "rollback_verified_closed");
  assert.equal(rollbackCalls, 1);
  assert.equal(rollback.rollbackMutationCalls, 1);
  assert.equal(rollback.automaticWriteRetryPerformed, false);
  assert.deepEqual(store.states, [
    "reserved_prewrite",
    "dispatch_started",
    "forward_verification_pending",
    "rollback_required",
    "rollback_started",
    "rollback_verification_pending",
    "rollback_verified_closed",
  ]);
});

test("W07 rollback replay after rollback_started never invokes rollback mutation again", async () => {
  const f = buildP88W07TestFixture();
  const store = coordinator(f, "rollback_started");
  let rollbackCalls = 0;
  const result = await runP88W07RollbackClosure({
    store,
    handoff: f.handoff,
    intent: f.executionIntent,
    mutate: async () => {
      rollbackCalls += 1;
      return accepted("rollback", f);
    },
    verify: async () => evidence(f, "rollback"),
  });
  assert.equal(result.disposition, "already_started_or_terminal");
  assert.equal(rollbackCalls, 0);
});

test("W07 unavailable verification after accepted forward becomes manual intervention, not success", async () => {
  const f = buildP88W07TestFixture();
  const store = coordinator(f);
  const result = await runP88W07ForwardExecution({
    store,
    handoff: f.handoff,
    intent: f.executionIntent,
    eligibility: f.eligibility,
    finalBeforeObservation: f.observation,
    mutate: async () => accepted("forward", f),
    verify: async () => evidence(f, "forward", "unavailable"),
  });
  assert.equal(result.disposition, "manual_intervention_required");
});
