import test from "node:test";
import assert from "node:assert/strict";
import type { AuthorizationEnvelope } from "./execution-foundation.js";
import {
  buildRollbackRequest,
  buildShopifyMutationRequest,
  classifyShopifyProviderError,
  deriveTask52OperatorState,
  evaluateProviderWriteAuthorization,
  runShopifyWriteDryRun,
  verifyExecutionState,
} from "./shopify-write-foundation.js";

const actionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const resource = { kind: "product" as const, gid: "gid://shopify/Product/123456789" };

function envelope(): AuthorizationEnvelope {
  return {
    version: "controlled_execution_foundation_v1",
    planId: "11111111-1111-4111-8111-111111111111",
    target: {
      pageId: "22222222-2222-4222-8222-222222222222",
      url: "https://diamondshelf.us/products/example",
      field: "meta_description",
    },
    actionType: "update_meta_description",
    expectedCurrentState: {
      value: "Old description",
      fingerprint: "old-fingerprint",
    },
    proposedState: {
      value: "New evidence-grounded description",
      fingerprint: "new-fingerprint",
    },
    evidence: {
      ids: ["33333333-3333-4333-8333-333333333333", "44444444-4444-4444-8444-444444444444"],
      proposalFingerprint: "proposal-fingerprint",
    },
    risk: { classification: "low", boundedPilot: true },
    rollback: { value: "Old description", fingerprint: "old-fingerprint" },
    authorization: {
      issuedAt: "2026-09-12T00:00:00.000Z",
      expiresAt: "2026-09-12T00:15:00.000Z",
      executionAuthorized: true,
      providerWriteAllowed: false,
      publicSiteWrites: false,
      automaticTransition: false,
    },
    verification: {
      status: "pending",
      mode: "independent_read_after_write",
      expectedField: "meta_description",
      expectedValue: "New evidence-grounded description",
      expectedFingerprint: "new-fingerprint",
      failureDisposition: "rollback_eligible",
    },
    envelopeFingerprint: "authorization-envelope-fingerprint",
  };
}

const confirmation = () => `EXECUTE:${actionId}:${envelope().envelopeFingerprint}`;

test("live Shopify execution fails closed while the public write gate is disabled", () => {
  const result = evaluateProviderWriteAuthorization({
    actionId,
    envelope: envelope(),
    executionConfirmation: confirmation(),
    publicSiteWritesEnabled: false,
    providerConnectionWritable: true,
    priorDeploymentCount: 0,
    now: "2026-09-12T00:05:00.000Z",
    mode: "live",
  });
  assert.deepEqual(result, {
    ok: false,
    providerWriteAllowed: false,
    dispatchAllowed: false,
    state: "write_blocked",
    reason: "public_site_write_gate_disabled",
  });
});

test("stale execution authorization blocks both dry-run readiness and provider execution", () => {
  const result = evaluateProviderWriteAuthorization({
    actionId,
    envelope: envelope(),
    executionConfirmation: confirmation(),
    publicSiteWritesEnabled: true,
    providerConnectionWritable: true,
    priorDeploymentCount: 0,
    now: "2026-09-12T00:16:00.000Z",
    mode: "live",
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "authorization_expired_or_invalid");
  assert.equal(result.state, "write_blocked");
});

test("duplicate provider execution is blocked by durable deployment lineage", () => {
  const result = evaluateProviderWriteAuthorization({
    actionId,
    envelope: envelope(),
    executionConfirmation: confirmation(),
    publicSiteWritesEnabled: true,
    providerConnectionWritable: true,
    priorDeploymentCount: 1,
    now: "2026-09-12T00:05:00.000Z",
    mode: "live",
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "duplicate_provider_execution_blocked");
});

test("provider execution requires a separate exact per-action confirmation", () => {
  const result = evaluateProviderWriteAuthorization({
    actionId,
    envelope: envelope(),
    executionConfirmation: `AUTHORIZE:${envelope().planId}:proposal-fingerprint`,
    publicSiteWritesEnabled: true,
    providerConnectionWritable: true,
    priorDeploymentCount: 0,
    now: "2026-09-12T00:05:00.000Z",
    mode: "live",
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "explicit_provider_execution_confirmation_required");
});

test("mutation request is deterministic and idempotent for the same authorized action", () => {
  const first = buildShopifyMutationRequest({ actionId, envelope: envelope(), providerResource: resource, mode: "dry_run" });
  const second = buildShopifyMutationRequest({ actionId, envelope: envelope(), providerResource: resource, mode: "dry_run" });
  assert.equal(first.requestFingerprint, second.requestFingerprint);
  assert.equal(first.idempotencyKey, second.idempotencyKey);
  assert.equal(first.method, "POST");
  assert.equal(first.path, "/admin/api/2025-10/graphql.json");
  assert.equal(first.graphql.operationName, "SeoEngineTask52ProductUpdate");
});

test("provider failures are explicitly classified and dry-run never dispatches", () => {
  assert.equal(classifyShopifyProviderError({ httpStatus: 401 }), "provider_authentication_error");
  assert.equal(classifyShopifyProviderError({ httpStatus: 403 }), "provider_permission_denied");
  assert.equal(classifyShopifyProviderError({ httpStatus: 422 }), "provider_validation_error");
  assert.equal(classifyShopifyProviderError({ httpStatus: 429 }), "provider_rate_limited");
  assert.equal(classifyShopifyProviderError({ httpStatus: 503 }), "provider_unavailable");
  assert.equal(classifyShopifyProviderError({ networkError: true }), "provider_network_error");

  const result = runShopifyWriteDryRun({
    actionId,
    envelope: envelope(),
    providerResource: resource,
    executionConfirmation: confirmation(),
    providerFailure: { httpStatus: 503 },
    now: "2026-09-12T00:05:00.000Z",
  });
  assert.equal(result.providerDispatchAttempted, false);
  assert.equal(result.publicWriteOccurred, false);
  assert.equal(result.mutationReceipt.status, "failed");
  assert.equal(result.mutationReceipt.errorCategory, "provider_unavailable");
  assert.equal(result.finalState, "manual_intervention_required");
  assert.equal(result.persistence.deployment.status, "failed");
});

test("independent verification normalizes whitespace but detects a true mismatch", () => {
  const passed = verifyExecutionState("title", "A  New Title", " A New Title ");
  assert.equal(passed.status, "passed");
  const failed = verifyExecutionState("title", "A New Title", "Different title");
  assert.equal(failed.status, "failed");
  assert.notEqual(failed.expectedFingerprint, failed.observedFingerprint);
});

test("verification mismatch constructs rollback request from the pre-write snapshot", () => {
  const rollback = buildRollbackRequest({ actionId, envelope: envelope(), providerResource: resource, mode: "dry_run" });
  assert.equal(rollback.value, "Old description");
  assert.equal(rollback.expectedCurrentFingerprint, envelope().proposedState.fingerprint);
  assert.match(rollback.idempotencyKey, /:rollback:/);

  const result = runShopifyWriteDryRun({
    actionId,
    envelope: envelope(),
    providerResource: resource,
    executionConfirmation: confirmation(),
    observedAfterWrite: "Unexpected provider value",
    now: "2026-09-12T00:05:00.000Z",
  });
  assert.equal(result.verification.status, "failed");
  assert.ok(result.rollbackRequest);
  assert.equal(result.rollbackRequest?.value, "Old description");
  assert.equal(result.rollbackVerification?.status, "passed");
  assert.equal(result.finalState, "rollback_verified");
  assert.deepEqual(result.operatorStates, ["execution_ready", "verification_pending", "verification_failed", "rollback_ready", "rollback_verified"]);
  assert.equal(result.persistence.action.status, "rolled_back");
  assert.equal(result.persistence.verifications.length, 2);
});

test("rollback verification failure requires manual intervention", () => {
  const result = runShopifyWriteDryRun({
    actionId,
    envelope: envelope(),
    providerResource: resource,
    executionConfirmation: confirmation(),
    observedAfterWrite: "Unexpected provider value",
    observedAfterRollback: "Still wrong",
    now: "2026-09-12T00:05:00.000Z",
  });
  assert.equal(result.rollbackVerification?.status, "failed");
  assert.equal(result.finalState, "manual_intervention_required");
  assert.equal(result.persistence.action.status, "failed");
});

test("successful dry-run proves full forward verification flow without a Shopify mutation", () => {
  const result = runShopifyWriteDryRun({
    actionId,
    envelope: envelope(),
    providerResource: resource,
    executionConfirmation: confirmation(),
    now: "2026-09-12T00:05:00.000Z",
  });
  assert.equal(result.providerDispatchAttempted, false);
  assert.equal(result.publicWriteOccurred, false);
  assert.equal(result.mutationReceipt.status, "simulated");
  assert.equal(result.verification.status, "passed");
  assert.equal(result.finalState, "verified");
  assert.equal(result.persistence.action.status, "completed");
  assert.equal(result.persistence.deployment.status, "pending");
  assert.equal(result.persistence.verifications[0]?.status, "passed");
});

test("operator state model exposes every Task #52 safety phase without false execution claims", () => {
  assert.equal(deriveTask52OperatorState({ actionStatus: "pending", publicSiteWrites: false }), "write_blocked");
  assert.equal(deriveTask52OperatorState({ actionStatus: "pending", publicSiteWrites: true }), "execution_ready");
  assert.equal(deriveTask52OperatorState({ actionStatus: "executing", deploymentStatus: "deployed" }), "verification_pending");
  assert.equal(deriveTask52OperatorState({ actionStatus: "completed", verificationStatus: "passed" }), "verified");
  assert.equal(deriveTask52OperatorState({ actionStatus: "executing", verificationStatus: "failed", rollbackEligible: false }), "verification_failed");
  assert.equal(deriveTask52OperatorState({ actionStatus: "executing", verificationStatus: "failed", rollbackEligible: true }), "rollback_ready");
  assert.equal(deriveTask52OperatorState({ actionStatus: "rolled_back", rollbackVerificationStatus: "passed" }), "rollback_verified");
  assert.equal(deriveTask52OperatorState({ actionStatus: "failed", rollbackEligible: false }), "manual_intervention_required");
});
