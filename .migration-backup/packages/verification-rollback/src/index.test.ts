import assert from "node:assert/strict";
import test from "node:test";
import {
  assertRollbackExecutionAuthorized,
  buildRollbackPlan,
  shouldRecommendRollback,
  toRollbackInsert,
  toVerificationInsert,
  verifyDeploymentState,
} from "./index.js";

test("verifies matching expected state regardless of object key order", () => {
  const result = verifyDeploymentState({
    deploymentId: "dep-1",
    expectedState: { seo: { title: "New title", description: "Desc" } },
    actualState: { seo: { description: "Desc", title: "New title" }, extra: true },
  });
  assert.equal(result.status, "verified");
  assert.equal(result.mismatches.length, 0);
});

test("fails verification when expected state is not observed", () => {
  const result = verifyDeploymentState({
    deploymentId: "dep-2",
    expectedState: { seo: { title: "Expected" } },
    actualState: { seo: { title: "Different" } },
  });
  assert.equal(result.status, "failed");
  assert.deepEqual(result.mismatches.map((item) => item.path), ["seo.title"]);
  assert.equal(shouldRecommendRollback(result), true);
});

test("marks regression when actual state diverges from both baseline and expected state", () => {
  const result = verifyDeploymentState({
    deploymentId: "dep-3",
    baselineState: { seo: { title: "Old" } },
    expectedState: { seo: { title: "New" } },
    actualState: { seo: { title: "Unexpected" } },
  });
  assert.equal(result.status, "regressed");
  assert.deepEqual(result.regressedPaths, ["seo.title"]);
});

test("rollback plan restores only captured pre-change state and remains pending", () => {
  const plan = buildRollbackPlan(
    "dep-4",
    {
      actionType: "metadata.title",
      target: { productId: "gid://shopify/Product/1" },
      beforeState: { seo: { title: "Original" } },
      expectedState: { seo: { title: "Changed" } },
    },
    "verification failed",
  );
  assert.equal(plan.status, "pending");
  assert.deepEqual(plan.restoreState, { seo: { title: "Original" } });
  assert.equal(toRollbackInsert(plan).status, "pending");
});

test("rollback fails closed when no pre-change state was captured", () => {
  assert.throws(
    () => buildRollbackPlan("dep-5", { actionType: "image.alt", target: {}, beforeState: {}, expectedState: {} }, "failed"),
    /pre-change state/,
  );
});

test("rollback execution requires global switch, connector enablement, and approval when required", () => {
  const prior = process.env.PUBLIC_SITE_WRITES_ENABLED;
  try {
    process.env.PUBLIC_SITE_WRITES_ENABLED = "false";
    assert.throws(() => assertRollbackExecutionAuthorized({ publicSiteWritesEnabled: true, connectorEnabled: true }), /kill switch/);

    process.env.PUBLIC_SITE_WRITES_ENABLED = "true";
    assert.throws(() => assertRollbackExecutionAuthorized({ publicSiteWritesEnabled: true, connectorEnabled: false }), /not explicitly enabled/);
    assert.throws(
      () => assertRollbackExecutionAuthorized({ publicSiteWritesEnabled: true, connectorEnabled: true, approvalRequired: true }),
      /explicit approval/,
    );
    assert.doesNotThrow(() =>
      assertRollbackExecutionAuthorized({
        publicSiteWritesEnabled: true,
        connectorEnabled: true,
        approvalRequired: true,
        approvalGranted: true,
      }),
    );
  } finally {
    if (prior === undefined) delete process.env.PUBLIC_SITE_WRITES_ENABLED;
    else process.env.PUBLIC_SITE_WRITES_ENABLED = prior;
  }
});

test("verification and rollback dedupe keys are deterministic", () => {
  const a = verifyDeploymentState({
    deploymentId: "dep-6",
    expectedState: { b: 2, a: 1 },
    actualState: { a: 1, b: 2 },
  });
  const b = verifyDeploymentState({
    deploymentId: "dep-6",
    expectedState: { a: 1, b: 2 },
    actualState: { b: 2, a: 1 },
  });
  assert.equal(a.dedupeKey, b.dedupeKey);
  assert.equal(toVerificationInsert(a).status, "verified");
});
