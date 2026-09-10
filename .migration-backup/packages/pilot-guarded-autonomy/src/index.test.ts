import test from "node:test";
import assert from "node:assert/strict";
import {
  assertGuardedBatchExecutionAuthorized,
  planGuardedAutonomyPilot,
  shouldAutoHaltAfterVerification,
  type GuardedActionCandidate,
} from "./index.js";

function candidate(id: string, confidence = 0.9): GuardedActionCandidate {
  return {
    opportunityId: `opp-${id}`,
    planId: `plan-${id}`,
    actionId: id,
    pageId: `page-${id}`,
    actionType: "metadata.title",
    disposition: "auto",
    confidence,
    reversible: true,
    beforeStateCaptured: true,
    expectedStateCaptured: true,
    targetRef: `gid://shopify/Product/${id.replace(/\D/g, "") || "1"}`,
  };
}

test("admits only a bounded deterministic batch after all pilot prerequisites", () => {
  const candidates = Array.from({ length: 30 }, (_, index) => candidate(`action-${index + 1}`, 0.81 + index / 1000));
  const plan = planGuardedAutonomyPilot({
    siteDomain: "diamondshelf.us",
    baselineCertified: true,
    controlledOptimizationVerified: true,
    measurementEvidenceReady: true,
    requestedBatchSize: 10,
    candidates,
  });

  assert.equal(plan.status, "ready");
  assert.equal(plan.admitted.length, 10);
  assert.equal(plan.batchLimit, 10);
  assert.equal(plan.executionAuthorized, false);
  assert.ok(plan.admitted.every((item) => item.confidence >= 0.8));
  assert.equal(plan.admitted[0]?.actionId, "action-30");
});

test("halts immediately for regression, pending verification, or algorithm update mode", () => {
  for (const input of [
    { unresolvedRegressions: 1 },
    { pendingVerifications: 1 },
    { algorithmUpdateMode: true },
  ]) {
    const plan = planGuardedAutonomyPilot({
      siteDomain: "diamondshelf.us",
      baselineCertified: true,
      controlledOptimizationVerified: true,
      measurementEvidenceReady: true,
      candidates: [candidate("action-1")],
      ...input,
    });
    assert.equal(plan.status, "halted");
    assert.equal(plan.admitted.length, 0);
    assert.ok(plan.haltReasons.length > 0);
  }
});

test("rejects approval actions, low confidence, missing before-state, and oversized batches", () => {
  const bad = candidate("action-bad", 0.7);
  bad.disposition = "approval";
  bad.beforeStateCaptured = false;
  const plan = planGuardedAutonomyPilot({
    siteDomain: "diamondshelf.us",
    baselineCertified: true,
    controlledOptimizationVerified: true,
    measurementEvidenceReady: true,
    requestedBatchSize: 26,
    candidates: [bad],
  });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockers.some((value) => value.includes("requestedBatchSize")));
  assert.equal(plan.rejected.length, 1);
  assert.ok((plan.rejected[0]?.reasons.length ?? 0) >= 3);
});

test("execution authorization requires global switch and exact admitted action set", () => {
  const previous = process.env.PUBLIC_SITE_WRITES_ENABLED;
  try {
    const plan = planGuardedAutonomyPilot({
      siteDomain: "diamondshelf.us",
      baselineCertified: true,
      controlledOptimizationVerified: true,
      measurementEvidenceReady: true,
      candidates: [candidate("action-1")],
    });

    process.env.PUBLIC_SITE_WRITES_ENABLED = "false";
    assert.throws(() => assertGuardedBatchExecutionAuthorized(plan, {
      siteDomain: "diamondshelf.us",
      actionIds: ["action-1"],
      actorId: "founder",
      authorizationRef: "AUTH-29-TEST",
    }), /kill switch/);

    process.env.PUBLIC_SITE_WRITES_ENABLED = "true";
    assert.throws(() => assertGuardedBatchExecutionAuthorized(plan, {
      siteDomain: "diamondshelf.us",
      actionIds: ["different-action"],
      actorId: "founder",
      authorizationRef: "AUTH-29-TEST",
    }), /exact admitted action set/);

    assert.doesNotThrow(() => assertGuardedBatchExecutionAuthorized(plan, {
      siteDomain: "diamondshelf.us",
      actionIds: ["action-1"],
      actorId: "founder",
      authorizationRef: "AUTH-29-TEST",
    }));
  } finally {
    if (previous === undefined) delete process.env.PUBLIC_SITE_WRITES_ENABLED;
    else process.env.PUBLIC_SITE_WRITES_ENABLED = previous;
  }
});

test("post-write verification automatically halts on failed, regressed, or pending result", () => {
  assert.equal(shouldAutoHaltAfterVerification([{ status: "verified" }, { status: "verified" }]), false);
  assert.equal(shouldAutoHaltAfterVerification([{ status: "verified" }, { status: "failed" }]), true);
  assert.equal(shouldAutoHaltAfterVerification([{ status: "regressed" }]), true);
  assert.equal(shouldAutoHaltAfterVerification([{ status: "pending" }]), true);
});
