import test from "node:test";
import assert from "node:assert/strict";
import { executionStateFingerprint, type AuthorizationEnvelope } from "./execution-foundation.js";
import { buildTask53Preflight } from "./task53-production-pilot.js";
import {
  TASK54_PROPAGATION_DELAYS_MS,
  TASK54_VERSION,
  promoteTask53PreflightToTask54,
  task54ForwardDisposition,
  task54RequiredConfirmation,
} from "./task54-persistent-apply.js";

function envelope(): AuthorizationEnvelope {
  const before = "Old description";
  const after = "New persistent description";
  return {
    version: "controlled_execution_foundation_v1",
    planId: "11111111-1111-4111-8111-111111111111",
    target: {
      pageId: "22222222-2222-4222-8222-222222222222",
      url: "https://diamondshelf.us/collections/example",
      field: "meta_description",
    },
    actionType: "update_meta_description",
    expectedCurrentState: { value: before, fingerprint: executionStateFingerprint("meta_description", before) },
    proposedState: { value: after, fingerprint: executionStateFingerprint("meta_description", after) },
    evidence: {
      ids: ["33333333-3333-4333-8333-333333333333", "44444444-4444-4444-8444-444444444444"],
      proposalFingerprint: "proposal-fingerprint",
    },
    risk: { classification: "low", boundedPilot: true },
    rollback: { value: before, fingerprint: executionStateFingerprint("meta_description", before) },
    authorization: {
      issuedAt: "2026-09-12T14:00:00.000Z",
      expiresAt: "2026-09-12T14:15:00.000Z",
      executionAuthorized: true,
      providerWriteAllowed: false,
      publicSiteWrites: false,
      automaticTransition: false,
    },
    verification: {
      status: "pending",
      mode: "independent_read_after_write",
      expectedField: "meta_description",
      expectedValue: after,
      expectedFingerprint: executionStateFingerprint("meta_description", after),
      failureDisposition: "rollback_eligible",
    },
    envelopeFingerprint: "task54-test-envelope",
  };
}

const resource = { kind: "collection" as const, gid: "gid://shopify/Collection/123456789" };

function readyTask53Preflight() {
  const auth = envelope();
  return buildTask53Preflight({
    actionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    envelope: auth,
    resource,
    providerState: {
      resource,
      field: auth.target.field,
      value: auth.expectedCurrentState.value,
      fingerprint: auth.expectedCurrentState.fingerprint,
      seoTitle: null,
      seoDescription: auth.expectedCurrentState.value,
      providerRequestId: "provider-read-1",
    },
    credentialScopes: ["write_products"],
    publicWriteGateEnabled: true,
    priorDeploymentCount: 0,
    otherActiveExecutionCount: 0,
    now: "2026-09-12T14:05:00.000Z",
  });
}

test("Task #54 promotion uses a distinct persistent-apply fingerprint and confirmation namespace", () => {
  const base = readyTask53Preflight();
  assert.equal(base.readyForLivePilot, true);
  const promoted = promoteTask53PreflightToTask54(base);

  assert.equal(promoted.version, TASK54_VERSION);
  assert.equal(promoted.mode, "persistent_verified_apply");
  assert.equal(promoted.readyForPersistentApply, true);
  assert.equal(promoted.successLeavesChangeLive, true);
  assert.equal(promoted.rollbackOnVerificationFailure, true);
  assert.equal(promoted.additionalForwardMutationAllowed, false);
  assert.equal(promoted.additionalRollbackMutationAllowed, false);
  assert.notEqual(promoted.preflightFingerprint, base.preflightFingerprint);
  assert.equal(promoted.sourceTask53PreflightFingerprint, base.preflightFingerprint);
  assert.equal(promoted.requiredConfirmation, task54RequiredConfirmation(base.actionId, promoted.preflightFingerprint));
  assert.match(promoted.requiredConfirmation, /^APPLY_AND_VERIFY_TASK54:/);
});

test("Task #54 preserves every Task #53 preflight blocker instead of weakening admission", () => {
  const auth = envelope();
  const base = buildTask53Preflight({
    actionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    envelope: auth,
    resource,
    providerState: {
      resource,
      field: auth.target.field,
      value: "changed outside the system",
      fingerprint: executionStateFingerprint(auth.target.field, "changed outside the system"),
      seoTitle: null,
      seoDescription: "changed outside the system",
      providerRequestId: null,
    },
    credentialScopes: ["read_products"],
    publicWriteGateEnabled: false,
    priorDeploymentCount: 1,
    otherActiveExecutionCount: 1,
    now: "2026-09-12T14:16:00.000Z",
  });
  const promoted = promoteTask53PreflightToTask54(base);
  assert.equal(promoted.readyForPersistentApply, false);
  assert.deepEqual(promoted.blockers, base.blockers);
  assert.ok(promoted.blockers.includes("authorization_expired_or_invalid"));
  assert.ok(promoted.blockers.includes("provider_state_changed_since_approval"));
  assert.ok(promoted.blockers.includes("shopify_write_products_scope_missing"));
  assert.ok(promoted.blockers.includes("public_site_write_gate_disabled"));
  assert.ok(promoted.blockers.includes("duplicate_provider_execution_blocked"));
  assert.ok(promoted.blockers.includes("another_site_execution_is_active"));
});

test("Task #54 forward disposition keeps a verified write live and rolls back only a failed verified-write path", () => {
  assert.equal(task54ForwardDisposition({ publicWriteOccurred: true, forwardVerified: true }), "keep_live");
  assert.equal(task54ForwardDisposition({ publicWriteOccurred: true, forwardVerified: false }), "rollback");
  assert.equal(task54ForwardDisposition({ publicWriteOccurred: false, forwardVerified: false }), "fail_no_write");
  assert.equal(task54ForwardDisposition({ publicWriteOccurred: false, forwardVerified: false, writeOutcomeUncertain: true }), "manual_intervention");
  assert.equal(task54ForwardDisposition({ publicWriteOccurred: true, forwardVerified: true, writeOutcomeUncertain: true }), "manual_intervention");
});

test("Task #54 propagation schedule is bounded and does not imply additional provider mutations", () => {
  assert.deepEqual([...TASK54_PROPAGATION_DELAYS_MS], [0, 1000, 2500, 5000, 10000]);
  assert.equal(TASK54_PROPAGATION_DELAYS_MS.length, 5);
});
