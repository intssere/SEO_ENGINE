import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { executionStateFingerprint } from "./execution-foundation.js";
import {
  assertP88W07ExactW06Lineage,
  assertP88W07Transition,
  p88W07NoHumanAuthorityCapability,
  p88W07StateCapability,
  projectP88W07DispatchIntent,
} from "./p8-8-policy-single-action-apply.js";
import { buildP88W07TestFixture } from "./p8-8-w07-test-fixture.js";

test("W07 derives deterministic policy-only dispatch identity from exact W06 ready lineage", () => {
  const fixture = buildP88W07TestFixture();
  assert.equal(fixture.preflight.disposition, "ready_for_w07");
  assert.doesNotThrow(() => assertP88W07ExactW06Lineage(fixture.bundle));

  const first = projectP88W07DispatchIntent({
    bundle: fixture.bundle,
    databaseNow: fixture.snapshot.databaseNow,
  });
  const second = projectP88W07DispatchIntent({
    bundle: fixture.bundle,
    databaseNow: fixture.snapshot.databaseNow,
  });

  assert.equal(first.executionProvenance, "policy_single_action_apply");
  assert.match(first.executionId, /^p88w07-exec-[0-9a-f]{24}$/);
  assert.match(first.dispatchId, /^p88w07-dispatch-[0-9a-f]{24}$/);
  assert.equal(first.dispatchFingerprint, second.dispatchFingerprint);
  assert.equal(first.state.beforeValue, "Before  W07\nbytes");
  assert.equal(first.state.afterValue, "After  W07\nbytes");
  assert.equal(
    first.policy.credentialProfileId,
    fixture.lineage.w01EvaluationInput.grant.credentialProfileId,
  );
  assert.equal(
    first.target.targetBindingFingerprint,
    fixture.preflight.target.targetBindingFingerprint,
  );
});

test("W07 fails closed on a tampered W06 artifact", () => {
  const fixture = buildP88W07TestFixture();
  assert.throws(
    () => assertP88W07ExactW06Lineage({
      ...fixture.bundle,
      w06Preflight: {
        ...fixture.preflight,
        preflightFingerprint: "f".repeat(64),
      },
    }),
    /p88_w07_w06_preflight_integrity_mismatch/,
  );
});

test("W07 refuses shadow or blocked W06 policy preflight", () => {
  const fixture = buildP88W07TestFixture({ policyStage: "shadow" });
  assert.notEqual(fixture.preflight.disposition, "ready_for_w07");
  assert.throws(
    () => projectP88W07DispatchIntent({
      bundle: fixture.bundle,
      databaseNow: fixture.snapshot.databaseNow,
    }),
    /p88_w07_w06_not_ready/,
  );
});

test("W07 uses database time for W03 and W06 freshness", () => {
  const fixture = buildP88W07TestFixture();
  assert.throws(
    () => projectP88W07DispatchIntent({
      bundle: fixture.bundle,
      databaseNow: fixture.preflight.preflightExpiresAt,
    }),
    /p88_w07_w06_preflight_expired/,
  );
});

test("W07 state graph enforces two-phase fence and one-way safety closure", () => {
  assert.doesNotThrow(() =>
    assertP88W07Transition("reserved_prewrite", "dispatch_started"));
  assert.doesNotThrow(() =>
    assertP88W07Transition("reserved_prewrite", "cancelled_before_dispatch"));
  assert.doesNotThrow(() =>
    assertP88W07Transition("forward_verification_pending", "rollback_required"));
  assert.doesNotThrow(() =>
    assertP88W07Transition("rollback_required", "rollback_started"));

  assert.throws(
    () => assertP88W07Transition("dispatch_started", "reserved_prewrite"),
    /p88_w07_transition_not_allowed/,
  );
  assert.throws(
    () => assertP88W07Transition("rollback_started", "dispatch_started"),
    /p88_w07_transition_not_allowed/,
  );
  assert.throws(
    () => assertP88W07Transition("forward_verified_live", "rollback_required"),
    /p88_w07_transition_not_allowed/,
  );

  assert.equal(
    p88W07StateCapability("reserved_prewrite").forwardAttemptSpent,
    false,
  );
  assert.equal(
    p88W07StateCapability("dispatch_started").forwardAttemptSpent,
    true,
  );
  assert.equal(
    p88W07StateCapability("rollback_started").rollbackAttemptSpent,
    true,
  );
  assert.equal(
    p88W07StateCapability("dispatch_started").providerForwardRetryAllowed,
    false,
  );
  assert.equal(
    p88W07StateCapability("rollback_started").providerRollbackRetryAllowed,
    false,
  );
});

test("Task53 normalized fingerprint cannot substitute for W02 byte-exact W07 lineage", () => {
  const fixture = buildP88W07TestFixture({
    before: "Before  W07 exact bytes",
  });
  const normalized = "Before W07 exact bytes";

  assert.equal(
    executionStateFingerprint("meta_description", fixture.lineage.w02Materialization.before.value),
    executionStateFingerprint("meta_description", normalized),
  );
  assert.notEqual(
    fixture.lineage.w02Materialization.before.value,
    normalized,
  );
});

test("W07 exposes no human Task #51/#53/#54 authority", () => {
  const capability = p88W07NoHumanAuthorityCapability();
  assert.equal(capability.humanApprovalCreated, false);
  assert.equal(capability.humanActionCreated, false);
  assert.equal(capability.humanDeploymentCreated, false);
  assert.equal(capability.task51ExecutionPerformed, false);
  assert.equal(capability.task53ExecutionPerformed, false);
  assert.equal(capability.task54ExecutionPerformed, false);
  assert.equal(capability.task54ConfirmationGenerated, false);
  assert.equal(capability.autonomousLiveExecutionAuthorized, false);
});

test("W07 runtime sources contain no human mutation path, generic DB fallback, or runtime binding", async () => {
  const files = await Promise.all([
    "p8-8-policy-single-action-apply.ts",
    "p8-8-policy-single-action-store.ts",
    "p8-8-policy-single-action-shopify.ts",
    "p8-8-policy-single-action-executor.ts",
  ].map((name) => readFile(new URL("./" + name, import.meta.url), "utf8")));
  const source = files.join("\n");

  assert.doesNotMatch(source, /mutateTask53ShopifyState/);
  assert.doesNotMatch(source, /executeTask54PersistentApply/);
  assert.doesNotMatch(source, /APPLY_AND_VERIFY_TASK54/);
  assert.doesNotMatch(source, /EXECUTE_AND_ROLLBACK_TASK53/);
  assert.doesNotMatch(source, /process\.env\.DATABASE_URL/);
  assert.doesNotMatch(source, /router\.|express\s*\(/);
  assert.doesNotMatch(source, /scheduler.*dispatch/i);
  assert.doesNotMatch(source, /worker.*dispatch/i);
  assert.doesNotMatch(source, /fetchImpl\s*\?\?\s*fetch/);
});
