import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateTask53RollbackReconciliationCandidate,
  task53RollbackReconciliationConfirmation,
} from "./task53-rollback-reconciliation.js";

const actionId = "d89cef34-2251-468e-b1c6-96b8c86050b6";
const deploymentId = "05d8ed85-0775-449c-b26c-6709a3346356";
const rollbackId = "657ce233-105a-4506-bdad-7b2abc983260";

const candidate = () => ({
  actionStatus: "failed",
  planStatus: "failed",
  deploymentStatus: "completed",
  lifecycleStage: "manual_intervention_required",
  foundationState: "manual_intervention_required",
  foundationDeploymentId: deploymentId,
  foundationRollbackId: rollbackId,
  verificationStatus: "verified",
  rollbackStatus: "failed",
  publicWriteOccurred: true,
  manualInterventionRequired: true,
  failureCategory: "rollback_verification_failed",
  publicSiteWrites: false,
  automaticTransition: false,
  deploymentCount: 1,
  reconciliationCount: 0,
  actionId,
  deploymentId,
  rollbackId,
});

test("rollback reconciliation confirmation is bound to the exact historical action/deployment/rollback tuple", () => {
  assert.equal(
    task53RollbackReconciliationConfirmation(actionId, deploymentId, rollbackId),
    `REVERIFY_TASK53_ROLLBACK:${actionId}:${deploymentId}:${rollbackId}`,
  );
});

test("only the rollback-verification-only manual-intervention state is eligible for reconciliation", () => {
  assert.deepEqual(evaluateTask53RollbackReconciliationCandidate(candidate()), { ok: true });
  assert.deepEqual(
    evaluateTask53RollbackReconciliationCandidate({ ...candidate(), verificationStatus: "failed" }),
    { ok: false, reason: "task53_reconciliation_failure_not_rollback_only" },
  );
  assert.deepEqual(
    evaluateTask53RollbackReconciliationCandidate({ ...candidate(), failureCategory: "provider_write_outcome_uncertain" }),
    { ok: false, reason: "task53_reconciliation_failure_not_eligible" },
  );
});

test("reconciliation fails closed on audit identity, duplicate deployment, prior reconciliation, or relaxed safety flags", () => {
  assert.deepEqual(
    evaluateTask53RollbackReconciliationCandidate({ ...candidate(), foundationRollbackId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }),
    { ok: false, reason: "task53_reconciliation_audit_identity_mismatch" },
  );
  assert.deepEqual(
    evaluateTask53RollbackReconciliationCandidate({ ...candidate(), deploymentCount: 2 }),
    { ok: false, reason: "task53_reconciliation_requires_single_deployment" },
  );
  assert.deepEqual(
    evaluateTask53RollbackReconciliationCandidate({ ...candidate(), reconciliationCount: 1 }),
    { ok: false, reason: "task53_reconciliation_already_recorded" },
  );
  assert.deepEqual(
    evaluateTask53RollbackReconciliationCandidate({ ...candidate(), automaticTransition: true }),
    { ok: false, reason: "task53_reconciliation_safety_invariant_failed" },
  );
});
