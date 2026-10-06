import assert from "node:assert/strict";
import test from "node:test";
import {
  P12_2_L10_13D_RECEIPT,
  assertP122L1013DFixtureReceipt,
  p122L1013DFixtureReceiptFingerprint,
} from "./p12-2-l10-13d-fixture-execution-receipt.js";
import {
  P12_2_L10_13E_CERTIFIED_PRODUCTION_SNAPSHOT,
  P12_2_L10_13E_NEW_IMAGE,
  P12_2_L10_13E_OLD_IMAGE,
  p122L1013EAuthorizationLiteral,
  p122L1013ETransitionFingerprint,
  validateP122L1013EProductionSnapshot,
} from "./p12-2-l10-13e-production-app-image-transition.js";

test("L10.13D fixture receipt is complete and deterministic", () => {
  assert.doesNotThrow(() => assertP122L1013DFixtureReceipt());
  assert.equal(P12_2_L10_13D_RECEIPT.deploymentStatus, "SUCCESS");
  assert.equal(P12_2_L10_13D_RECEIPT.deploymentAttempts, 1);
  assert.equal(P12_2_L10_13D_RECEIPT.deploymentRetries, 0);
  assert.equal(P12_2_L10_13D_RECEIPT.finalFixtureServiceCount, 0);
  assert.equal(P12_2_L10_13D_RECEIPT.finalFixtureStagedChanges, null);
  assert.match(p122L1013DFixtureReceiptFingerprint(), /^[0-9a-f]{64}$/);
});

test("L10.13E binds exact old and new immutable image digests", () => {
  assert.equal(
    P12_2_L10_13E_OLD_IMAGE,
    "ghcr.io/intssere/seo-engine@sha256:30632cc85de834c5dfb2ee6e34c55cab3e68d799ae69be8dcd8c0efa6fc3b283",
  );
  assert.equal(
    P12_2_L10_13E_NEW_IMAGE,
    "ghcr.io/intssere/seo-engine@sha256:45cbaecd3e40f3354303b63c30b139ba155e02a753d50ad94eb1a627e25b61c2",
  );
  assert.notEqual(P12_2_L10_13E_OLD_IMAGE, P12_2_L10_13E_NEW_IMAGE);
});

test("L10.13E certified Production snapshot yields deterministic authorization", () => {
  const result = validateP122L1013EProductionSnapshot(
    P12_2_L10_13E_CERTIFIED_PRODUCTION_SNAPSHOT,
  );
  assert.equal(result.result, "ready_for_transition_authorization");
  if (result.result !== "ready_for_transition_authorization") return;
  assert.equal(
    result.transitionFingerprint,
    p122L1013ETransitionFingerprint(P12_2_L10_13E_CERTIFIED_PRODUCTION_SNAPSHOT),
  );
  assert.equal(
    result.authorizationLiteral,
    p122L1013EAuthorizationLiteral(P12_2_L10_13E_CERTIFIED_PRODUCTION_SNAPSHOT),
  );
  assert.match(
    result.authorizationLiteral,
    /^AUTHORIZE:P12_2_L10_13E_PRODUCTION_APP_IMAGE_TRANSITION:[0-9a-f]{64}$/,
  );
});

test("L10.13E fails closed on Production image drift", () => {
  const result = validateP122L1013EProductionSnapshot({
    ...P12_2_L10_13E_CERTIFIED_PRODUCTION_SNAPSHOT,
    currentImage: P12_2_L10_13E_NEW_IMAGE,
  });
  assert.deepEqual(result, {
    result: "fail_closed",
    code: "production_state_mismatch",
  });
});

test("L10.13E fails closed on pending work or configuration drift", () => {
  assert.deepEqual(
    validateP122L1013EProductionSnapshot({
      ...P12_2_L10_13E_CERTIFIED_PRODUCTION_SNAPSHOT,
      pendingWorkCount: 1,
    }),
    { result: "fail_closed", code: "production_state_mismatch" },
  );
  assert.deepEqual(
    validateP122L1013EProductionSnapshot({
      ...P12_2_L10_13E_CERTIFIED_PRODUCTION_SNAPSHOT,
      healthcheckPath: "/wrong",
    }),
    { result: "fail_closed", code: "production_config_mismatch" },
  );
});

test("L10.13E never grants rollback, migration, DB or crawl authority", () => {
  for (const patch of [
    { rollbackAuthorized: true },
    { databaseMutation: true },
    { migration0010ApplyAuthorized: true },
    { crawlOrRecoveryExecutionAuthorized: true },
  ]) {
    assert.deepEqual(
      validateP122L1013EProductionSnapshot({
        ...P12_2_L10_13E_CERTIFIED_PRODUCTION_SNAPSHOT,
        ...patch,
      }),
      { result: "fail_closed", code: "transition_boundary_mismatch" },
    );
  }
});
