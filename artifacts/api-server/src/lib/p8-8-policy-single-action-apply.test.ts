import assert from "node:assert/strict";
import test from "node:test";
import { executionStateFingerprint } from "./execution-foundation.js";
import {
  assessP88W07Verification,
  assertP88W07ExactW06Handoff,
  assertP88W07TransitionAllowed,
  buildP88W07VerificationEvidence,
  p88W07ControlSafetyDecision,
  p88W07DispatchEligibilityIssues,
  p88W07ReservationTerminalStatus,
  projectP88W07ExecutionIntent,
} from "./p8-8-policy-single-action-apply.js";
import { p88W02StateFingerprint } from "./p8-8-governed-proposal-materialization.js";
import { buildP88W07TestFixture } from "./p8-8-w07-test-fixture.js";

test("W07 deterministically rebuilds exact W06 handoff and policy-only execution identities", () => {
  const f = buildP88W07TestFixture();
  const preflight = assertP88W07ExactW06Handoff(f.handoff);
  assert.equal(preflight.disposition, "ready_for_w07");

  const first = projectP88W07ExecutionIntent(f.handoff);
  const second = projectP88W07ExecutionIntent(f.handoff);
  assert.equal(first.executionFingerprint, second.executionFingerprint);
  assert.equal(first.dispatchFingerprint, second.dispatchFingerprint);
  assert.match(first.executionId, /^p88w07-exec-[0-9a-f]{24}$/);
  assert.match(first.dispatchId, /^p88w07-dispatch-[0-9a-f]{24}$/);
  assert.equal(first.executionProvenance, "policy_single_action_apply");
  assert.equal(first.safety.task51AuthorityUsed, false);
  assert.equal(first.safety.task53AuthorityUsed, false);
  assert.equal(first.safety.task54AuthorityUsed, false);
  assert.equal(first.safety.task54ConfirmationGenerated, false);
  assert.equal(first.safety.policyRuntimeActivated, false);
});

test("W07 fails closed on tampered W06 preflight", () => {
  const f = buildP88W07TestFixture();
  assert.throws(
    () => assertP88W07ExactW06Handoff({
      ...f.handoff,
      preflight: {
        ...f.preflight,
        preflightFingerprint: "f".repeat(64),
      },
    }),
    /p88_w07_w06_preflight_integrity_mismatch/,
  );
});

test("W07 dispatch eligibility requires both gates, fresh quota/cooldown, no human conflict, exact credential profile and write_products", () => {
  const f = buildP88W07TestFixture();
  assert.deepEqual(
    p88W07DispatchEligibilityIssues(f.executionIntent, f.eligibility),
    [],
  );

  const issues = p88W07DispatchEligibilityIssues(
    f.executionIntent,
    {
      ...f.eligibility,
      publicSiteWritesEnabled: false,
      policyMutationExecutionEnabled: false,
      quotaAvailable: false,
      sameTargetCooldownSatisfied: false,
      noHumanExecutionConflict: false,
      credentialProfileId: "wrong-profile",
      credentialScopes: [],
    },
  );
  assert.deepEqual(issues, [
    "credential_profile_mismatch",
    "human_execution_conflict",
    "mutation_quota_exhausted",
    "policy_mutation_execution_gate_closed",
    "public_site_writes_gate_closed",
    "same_target_cooldown_not_satisfied",
    "write_products_scope_missing",
  ]);
});

test("W07 state machine permits only certified forward/safety-closure transitions", () => {
  for (const [from, to] of [
    ["reserved_prewrite", "dispatch_started"],
    ["reserved_prewrite", "cancelled_before_dispatch"],
    ["dispatch_started", "forward_rejected_no_write"],
    ["dispatch_started", "forward_verification_pending"],
    ["forward_verification_pending", "forward_verified_live"],
    ["forward_verification_pending", "rollback_required"],
    ["rollback_required", "rollback_started"],
    ["rollback_started", "rollback_verification_pending"],
    ["rollback_verification_pending", "rollback_verified_closed"],
  ] as const) {
    assert.doesNotThrow(() => assertP88W07TransitionAllowed(from, to));
  }

  assert.throws(
    () => assertP88W07TransitionAllowed("dispatch_started", "reserved_prewrite"),
    /p88_w07_transition_not_allowed/,
  );
  assert.throws(
    () => assertP88W07TransitionAllowed("rollback_started", "rollback_required"),
    /p88_w07_transition_not_allowed/,
  );
  assert.throws(
    () => assertP88W07TransitionAllowed("forward_verified_live", "rollback_required"),
    /p88_w07_transition_not_allowed/,
  );
});

test("W07 W04 closure mapping preserves claimed state until safe terminal closure", () => {
  assert.equal(
    p88W07ReservationTerminalStatus("reserved_prewrite"),
    null,
  );
  assert.equal(
    p88W07ReservationTerminalStatus("dispatch_started"),
    null,
  );
  assert.equal(
    p88W07ReservationTerminalStatus("forward_verification_pending"),
    null,
  );
  assert.equal(
    p88W07ReservationTerminalStatus("rollback_required"),
    null,
  );
  assert.equal(
    p88W07ReservationTerminalStatus("cancelled_before_dispatch"),
    "released",
  );
  assert.equal(
    p88W07ReservationTerminalStatus("forward_rejected_no_write"),
    "consumed",
  );
  assert.equal(
    p88W07ReservationTerminalStatus("forward_verified_live"),
    "consumed",
  );
  assert.equal(
    p88W07ReservationTerminalStatus("rollback_verified_closed"),
    "consumed",
  );
  assert.equal(
    p88W07ReservationTerminalStatus("manual_intervention_required"),
    "manual_intervention",
  );
});

test("W07 control semantics block new forward work but preserve safety closure after point of no return", () => {
  assert.equal(
    p88W07ControlSafetyDecision({
      dispatchState: "reserved_prewrite",
      currentControlMode: "paused",
      afterStateObserved: false,
    }),
    "cancel_prewrite",
  );
  assert.equal(
    p88W07ControlSafetyDecision({
      dispatchState: "dispatch_started",
      currentControlMode: "paused",
      afterStateObserved: false,
    }),
    "safety_closure_only",
  );
  assert.equal(
    p88W07ControlSafetyDecision({
      dispatchState: "forward_verification_pending",
      currentControlMode: "killed",
      afterStateObserved: true,
    }),
    "rollback_safety_closure",
  );
  assert.equal(
    p88W07ControlSafetyDecision({
      dispatchState: "forward_verified_live",
      currentControlMode: "killed",
      afterStateObserved: true,
    }),
    "terminal",
  );
});

test("W07 exact verification rejects normalized whitespace equivalence", () => {
  const f = buildP88W07TestFixture({
    after: "After  W07 exact\nbytes",
  });
  const normalized = "After W07 exact bytes";

  assert.equal(
    executionStateFingerprint("meta_description", f.executionIntent.state.afterValue),
    executionStateFingerprint("meta_description", normalized),
  );

  const evidence = buildP88W07VerificationEvidence({
    status: "verified",
    providerRawValue: normalized,
    providerObservedFingerprint: p88W02StateFingerprint({
      target: f.lineage.w02Materialization.target,
      value: normalized,
      purpose: "after",
    }),
    providerVerified: true,
    storefrontVerified: true,
    failureCategories: [],
  });
  const assessment = assessP88W07Verification({
    target: f.lineage.w02Materialization.target,
    purpose: "after",
    expectedValue: f.executionIntent.state.afterValue,
    expectedFingerprint: f.executionIntent.state.afterFingerprint,
    evidence,
  });
  assert.equal(assessment.status, "failed");
  assert.equal(assessment.exactProviderStateMatched, false);
  assert.ok(assessment.reasons.includes("provider_exact_state_mismatch"));
});

test("W07 retained-live verification requires exact provider state and both independent evidence channels", () => {
  const f = buildP88W07TestFixture();
  const evidence = buildP88W07VerificationEvidence({
    status: "verified",
    providerRawValue: f.executionIntent.state.afterValue,
    providerObservedFingerprint: f.executionIntent.state.afterFingerprint,
    providerVerified: true,
    storefrontVerified: true,
    failureCategories: [],
  });
  const assessment = assessP88W07Verification({
    target: f.lineage.w02Materialization.target,
    purpose: "after",
    expectedValue: f.executionIntent.state.afterValue,
    expectedFingerprint: f.executionIntent.state.afterFingerprint,
    evidence,
  });
  assert.equal(assessment.status, "verified");

  const noStorefront = buildP88W07VerificationEvidence({
    status: evidence.status,
    providerRawValue: evidence.providerRawValue,
    providerObservedFingerprint: evidence.providerObservedFingerprint,
    providerVerified: evidence.providerVerified,
    storefrontVerified: false,
    failureCategories: evidence.failureCategories,
  });
  const failed = assessP88W07Verification({
    target: f.lineage.w02Materialization.target,
    purpose: "after",
    expectedValue: f.executionIntent.state.afterValue,
    expectedFingerprint: f.executionIntent.state.afterFingerprint,
    evidence: noStorefront,
  });
  assert.equal(failed.status, "failed");
  assert.ok(
    failed.reasons.includes("independent_storefront_verification_failed"),
  );
});
