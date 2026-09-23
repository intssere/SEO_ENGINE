import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assertP88W07W06Handoff,
  p88W07Capability,
  projectP88W07DispatchIntent,
  projectP88W07Transition,
} from "./p8-8-policy-single-action-apply.js";
import { buildP88W07TestFixture } from "./p8-8-w07-test-fixture.js";

const runtime = Object.freeze({
  publicSiteWritesEnabled: true,
  policyMutationExecutionEnabled: true,
  mutationQuotaAvailable: true,
  sameTargetCooldownSatisfied: true,
  humanExecutionClear: true,
  unresolvedManualIntervention: false,
});

test("W07 projects deterministic policy-only dispatch identity from exact W01-W06 handoff", () => {
  const f = buildP88W07TestFixture();
  const input = {
    lineage: f.lineage,
    preflight: f.preflight,
    databaseNow: f.snapshot.databaseNow,
    runtime,
    credential: f.credentialBinding,
  };
  assert.doesNotThrow(() => assertP88W07W06Handoff(input));
  const first = projectP88W07DispatchIntent(input);
  const second = projectP88W07DispatchIntent(input);
  assert.equal(first.dispatchId, second.dispatchId);
  assert.equal(first.dispatchFingerprint, second.dispatchFingerprint);
  assert.match(first.policyExecutionId, /^p88w07-exec-[0-9a-f]{24}$/);
  assert.match(first.dispatchId, /^p88w07-dispatch-[0-9a-f]{24}$/);
  assert.equal(first.executionProvenance, "policy_single_action_apply");
  assert.equal(first.initialState, "reserved_prewrite");
  assert.equal(first.forwardAttemptCount, 0);
  assert.equal(first.rollbackAttemptCount, 0);
  assert.equal(first.safety.task51ExecutionPerformed, false);
  assert.equal(first.safety.task53ExecutionPerformed, false);
  assert.equal(first.safety.task54ExecutionPerformed, false);
  assert.equal(first.safety.task54ConfirmationGenerated, false);
});

test("W07 revalidates execution gates, quota, cooldown, human concurrency and credential profile", () => {
  const f = buildP88W07TestFixture();
  const base = {
    lineage: f.lineage,
    preflight: f.preflight,
    databaseNow: f.snapshot.databaseNow,
    runtime,
    credential: f.credentialBinding,
  };
  assert.throws(
    () => projectP88W07DispatchIntent({
      ...base,
      runtime: { ...runtime, publicSiteWritesEnabled: false },
    }),
    /p88_w07_execution_gate_closed/,
  );
  assert.throws(
    () => projectP88W07DispatchIntent({
      ...base,
      runtime: { ...runtime, policyMutationExecutionEnabled: false },
    }),
    /p88_w07_execution_gate_closed/,
  );
  assert.throws(
    () => projectP88W07DispatchIntent({
      ...base,
      runtime: { ...runtime, mutationQuotaAvailable: false },
    }),
    /p88_w07_mutation_quota_exhausted/,
  );
  assert.throws(
    () => projectP88W07DispatchIntent({
      ...base,
      runtime: { ...runtime, sameTargetCooldownSatisfied: false },
    }),
    /p88_w07_same_target_cooldown_blocked/,
  );
  assert.throws(
    () => projectP88W07DispatchIntent({
      ...base,
      runtime: { ...runtime, humanExecutionClear: false },
    }),
    /p88_w07_human_execution_conflict/,
  );
  assert.throws(
    () => projectP88W07DispatchIntent({
      ...base,
      credential: {
        ...f.credentialBinding,
        credentialProfileId: "wrong-profile",
      },
    }),
    /p88_w07_write_credential_binding_invalid/,
  );
});

test("W07 rejects W06 handoff that is no longer exact ready-for-W07", () => {
  const f = buildP88W07TestFixture();
  assert.throws(
    () => projectP88W07DispatchIntent({
      lineage: f.lineage,
      preflight: {
        ...f.preflight,
        disposition: "blocked_no_dispatch",
      },
      databaseNow: f.snapshot.databaseNow,
      runtime,
      credential: f.credentialBinding,
    }),
    /p88_w07_w06_not_ready/,
  );
  assert.throws(
    () => projectP88W07DispatchIntent({
      lineage: f.lineage,
      preflight: {
        ...f.preflight,
        noDispatchProof: {
          ...f.preflight.noDispatchProof,
          providerMutationCalled: true as never,
        },
      },
      databaseNow: f.snapshot.databaseNow,
      runtime,
      credential: f.credentialBinding,
    }),
    /p88_w07_w06_no_dispatch_proof_invalid/,
  );
});

test("W07 transition grammar spends forward and rollback attempts once only", () => {
  const reserved = {
    dispatchId: "p88w07-dispatch-" + "a".repeat(24),
    state: "reserved_prewrite" as const,
    revision: 1,
    forwardAttemptCount: 0 as const,
    rollbackAttemptCount: 0 as const,
    publicWriteOccurrence: "none" as const,
    rollbackOccurrence: "none" as const,
    terminal: false,
  };
  const started = projectP88W07Transition({
    current: reserved,
    nextState: "dispatch_started",
    publicWriteOccurrence: "possible",
  });
  assert.equal(started.forwardAttemptCount, 1);
  assert.equal(started.rollbackAttemptCount, 0);

  const verification = projectP88W07Transition({
    current: {
      ...reserved,
      state: started.toState,
      revision: started.nextRevision,
      forwardAttemptCount: started.forwardAttemptCount,
      rollbackAttemptCount: started.rollbackAttemptCount,
      publicWriteOccurrence: started.publicWriteOccurrence,
      rollbackOccurrence: started.rollbackOccurrence,
    },
    nextState: "forward_verification_pending",
    publicWriteOccurrence: "confirmed",
  });
  const required = projectP88W07Transition({
    current: {
      ...reserved,
      state: verification.toState,
      revision: verification.nextRevision,
      forwardAttemptCount: verification.forwardAttemptCount,
      rollbackAttemptCount: verification.rollbackAttemptCount,
      publicWriteOccurrence: verification.publicWriteOccurrence,
      rollbackOccurrence: verification.rollbackOccurrence,
    },
    nextState: "rollback_required",
    publicWriteOccurrence: "confirmed",
  });
  const rollback = projectP88W07Transition({
    current: {
      ...reserved,
      state: required.toState,
      revision: required.nextRevision,
      forwardAttemptCount: required.forwardAttemptCount,
      rollbackAttemptCount: required.rollbackAttemptCount,
      publicWriteOccurrence: required.publicWriteOccurrence,
      rollbackOccurrence: required.rollbackOccurrence,
    },
    nextState: "rollback_started",
    publicWriteOccurrence: "confirmed",
    rollbackOccurrence: "possible",
  });
  assert.equal(rollback.forwardAttemptCount, 1);
  assert.equal(rollback.rollbackAttemptCount, 1);

  assert.throws(
    () => projectP88W07Transition({
      current: {
        ...reserved,
        state: "rollback_required",
        revision: 9,
        forwardAttemptCount: 1,
        rollbackAttemptCount: 1,
        publicWriteOccurrence: "confirmed",
        rollbackOccurrence: "possible",
      },
      nextState: "rollback_started",
    }),
    /p88_w07_rollback_attempt_not_available/,
  );
});

test("W07 no-dispatch cancellation cannot claim a spent forward attempt", () => {
  assert.throws(
    () => projectP88W07Transition({
      current: {
        dispatchId: "p88w07-dispatch-" + "b".repeat(24),
        state: "reserved_prewrite",
        revision: 1,
        forwardAttemptCount: 1,
        rollbackAttemptCount: 0,
        publicWriteOccurrence: "possible",
        rollbackOccurrence: "none",
        terminal: false,
      },
      nextState: "cancelled_before_dispatch",
    }),
    /p88_w07_cancelled_no_dispatch_proof_invalid/,
  );
});

test("W07 capability remains distinct from human execution authority", () => {
  const capability = p88W07Capability();
  assert.equal(capability.task51ExecutionPerformed, false);
  assert.equal(capability.task53ExecutionPerformed, false);
  assert.equal(capability.task54ExecutionPerformed, false);
  assert.equal(capability.humanApprovalCreated, false);
  assert.equal(capability.humanActionCreated, false);
  assert.equal(capability.humanDeploymentCreated, false);
  assert.equal(capability.automaticForwardRetryAllowed, false);
  assert.equal(capability.automaticRollbackRetryAllowed, false);
});

test("W07 runtime sources contain no human execution-path binding", async () => {
  const sources = await Promise.all([
    "p8-8-policy-single-action-apply.ts",
    "p8-8-policy-dispatch-store.ts",
    "p8-8-policy-single-action-shopify.ts",
    "p8-8-policy-single-action-verify.ts",
    "p8-8-policy-single-action-orchestrator.ts",
  ].map((name) => readFile(new URL("./" + name, import.meta.url), "utf8")));
  const joined = sources.join("\n");
  assert.doesNotMatch(joined, /mutateTask53ShopifyState/);
  assert.doesNotMatch(joined, /task54-persistent-apply/);
  assert.doesNotMatch(joined, /APPLY_AND_VERIFY_TASK54/);
  assert.doesNotMatch(joined, /EXECUTE_AND_ROLLBACK_TASK53/);
  assert.doesNotMatch(joined, /process\.env\.DATABASE_URL/);
  assert.doesNotMatch(joined, /router\.|express\s*\(/);
  assert.doesNotMatch(joined, /scheduler.*dispatch/i);
  assert.doesNotMatch(joined, /worker.*dispatch/i);
});
