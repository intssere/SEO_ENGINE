import postgres from "postgres";
import type { AuthorizationEnvelope } from "./execution-foundation.js";
import {
  buildTask53Preflight,
  mutateTask53ShopifyState,
  readTask53ShopifyState,
  task53AuditFingerprint,
  task53RequiredConfirmation,
  verifyTask53Storefront,
  type Task53Preflight,
  type Task53ProviderState,
  type Task53Resource,
  type Task53ShopifyCredential,
} from "./task53-production-pilot.js";
import { loadTask53ShopifyCredential } from "./task53-shopify-credential.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class Task53ExecutionError extends Error {
  constructor(public readonly category: string, public readonly status: number) {
    super(category);
    this.name = "Task53ExecutionError";
  }
}

type ActionContext = {
  actionId: string;
  actionPlanId: string;
  actionStatus: string;
  actionType: string;
  pageId: string;
  pageUrl: string;
  siteId: string;
  siteDomain: string;
  planStatus: string;
  expectedOutcome: Record<string, unknown>;
  proposedChange: Record<string, unknown>;
  expectedState: Record<string, unknown>;
  approvalDecision: string | null;
  approvalActor: string | null;
  approvedAt: string | null;
  envelope: AuthorizationEnvelope;
  priorDeploymentCount: number;
  otherActiveExecutionCount: number;
};

export type Task53ExecutionInput = {
  resource: Task53Resource;
  preflightFingerprint: string;
  confirmation: string;
};

function database() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Task53ExecutionError("execution_runtime_unavailable", 503);
  return postgres(url, { max: 1, prepare: false, connect_timeout: 5, idle_timeout: 2 });
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function authorizationEnvelope(value: unknown): AuthorizationEnvelope {
  const row = object(value);
  if (row.version !== "controlled_execution_foundation_v1" || typeof row.planId !== "string" || typeof row.envelopeFingerprint !== "string") {
    throw new Task53ExecutionError("execution_authorization_envelope_missing", 409);
  }
  return row as unknown as AuthorizationEnvelope;
}

async function loadActionContext(actionId: string): Promise<ActionContext> {
  if (!uuidPattern.test(actionId)) throw new Task53ExecutionError("action_not_found", 404);
  const sql = database();
  try {
    const rows = await sql<Array<{
      actionId: string;
      actionPlanId: string;
      actionStatus: string;
      actionType: string;
      pageId: string | null;
      pageUrl: string | null;
      siteId: string;
      siteDomain: string;
      planStatus: string;
      expectedOutcome: Record<string, unknown>;
      proposedChange: Record<string, unknown>;
      expectedState: Record<string, unknown>;
      approvalDecision: string | null;
      approvalActor: string | null;
      approvedAt: string | null;
      priorDeploymentCount: number;
      otherActiveExecutionCount: number;
    }>>`
      SELECT a.id::text AS "actionId",a.action_plan_id::text AS "actionPlanId",a.status AS "actionStatus",a.action_type AS "actionType",
        a.page_id::text AS "pageId",p.url AS "pageUrl",ap.site_id::text AS "siteId",s.domain AS "siteDomain",ap.status AS "planStatus",
        ap.expected_outcome AS "expectedOutcome",a.proposed_change AS "proposedChange",a.expected_state AS "expectedState",
        approval.decision AS "approvalDecision",approval.actor_id AS "approvalActor",approval.decided_at::text AS "approvedAt",
        (SELECT COUNT(*)::int FROM deployments d WHERE d.action_plan_id=ap.id) AS "priorDeploymentCount",
        (SELECT COUNT(*)::int FROM deployments d2 JOIN action_plans ap2 ON ap2.id=d2.action_plan_id WHERE ap2.site_id=ap.site_id AND d2.status IN ('pending','active') AND d2.action_plan_id<>ap.id) AS "otherActiveExecutionCount"
      FROM actions a
      JOIN action_plans ap ON ap.id=a.action_plan_id
      JOIN sites s ON s.id=ap.site_id
      LEFT JOIN pages p ON p.id=a.page_id
      LEFT JOIN LATERAL (
        SELECT decision,actor_id,decided_at FROM approvals WHERE action_plan_id=ap.id ORDER BY decided_at DESC LIMIT 1
      ) approval ON true
      WHERE a.id=${actionId}::uuid
      LIMIT 1`;
    const row = rows[0];
    if (!row || !row.pageId || !row.pageUrl) throw new Task53ExecutionError("action_not_found", 404);
    const proposed = object(row.proposedChange);
    const envelope = authorizationEnvelope(proposed.authorizationEnvelope);
    if (envelope.planId !== row.actionPlanId || envelope.target.pageId !== row.pageId || envelope.target.url !== row.pageUrl) {
      throw new Task53ExecutionError("execution_identity_mismatch", 409);
    }
    const expectedOutcome = object(row.expectedOutcome);
    const foundation = object(expectedOutcome.executionFoundation);
    if (expectedOutcome.lifecycleStage !== "executable_action" || expectedOutcome.executionAuthorized !== true || foundation.actionId !== actionId) {
      throw new Task53ExecutionError("action_not_execution_authorized", 409);
    }
    if (expectedOutcome.automaticTransition !== false) throw new Task53ExecutionError("automatic_transition_invariant_failed", 409);
    if (row.approvalDecision !== "approved" || !row.approvedAt) throw new Task53ExecutionError("latest_approval_not_approved", 409);
    if (row.actionStatus !== "pending") throw new Task53ExecutionError("action_not_pending", 409);
    if (row.siteDomain.toLowerCase() !== "diamondshelf.us") throw new Task53ExecutionError("task53_site_not_allowed", 403);
    return {
      ...row,
      pageId: row.pageId,
      pageUrl: row.pageUrl,
      envelope,
      priorDeploymentCount: Number(row.priorDeploymentCount ?? 0),
      otherActiveExecutionCount: Number(row.otherActiveExecutionCount ?? 0),
    };
  } finally {
    await sql.end({ timeout: 2 }).catch(() => undefined);
  }
}

export async function getTask53Preflight(actionId: string, resource: Task53Resource, fetchImpl?: typeof fetch) {
  const context = await loadActionContext(actionId);
  const credential = await loadTask53ShopifyCredential();
  const providerState = await readTask53ShopifyState({ credential, resource, field: context.envelope.target.field, fetchImpl });
  const preflight = buildTask53Preflight({
    actionId,
    envelope: context.envelope,
    resource,
    providerState,
    credentialScopes: credential.scopes,
    publicWriteGateEnabled: process.env.PUBLIC_SITE_WRITES_ENABLED?.trim().toLowerCase() === "true",
    priorDeploymentCount: context.priorDeploymentCount,
    otherActiveExecutionCount: context.otherActiveExecutionCount,
    now: new Date().toISOString(),
  });
  return {
    ...preflight,
    approval: { decision: context.approvalDecision, actor: context.approvalActor, decidedAt: context.approvedAt },
    providerPreReadRequestId: providerState.providerRequestId,
    providerSecretExposed: false,
    mutationPerformed: false,
  };
}

async function reserveDeployment(context: ActionContext, preflight: Task53Preflight) {
  const sql = database();
  try {
    return await sql.begin(async (tx) => {
      const locked = await tx<Array<{ actionStatus: string; expectedOutcome: Record<string, unknown>; deploymentCount: number; activeCount: number }>>`
        SELECT a.status AS "actionStatus",ap.expected_outcome AS "expectedOutcome",
          (SELECT COUNT(*)::int FROM deployments d WHERE d.action_plan_id=ap.id) AS "deploymentCount",
          (SELECT COUNT(*)::int FROM deployments d2 JOIN action_plans ap2 ON ap2.id=d2.action_plan_id WHERE ap2.site_id=ap.site_id AND d2.status IN ('pending','active') AND d2.action_plan_id<>ap.id) AS "activeCount"
        FROM actions a JOIN action_plans ap ON ap.id=a.action_plan_id
        WHERE a.id=${context.actionId}::uuid
        FOR UPDATE OF a,ap`;
      const row = locked[0];
      if (!row || row.actionStatus !== "pending") throw new Task53ExecutionError("action_not_pending", 409);
      if (Number(row.deploymentCount ?? 0) > 0) throw new Task53ExecutionError("duplicate_provider_execution_blocked", 409);
      if (Number(row.activeCount ?? 0) > 0) throw new Task53ExecutionError("another_site_execution_is_active", 409);
      const expected = object(row.expectedOutcome);
      const currentFoundation = object(expected.executionFoundation);
      if (expected.lifecycleStage !== "executable_action" || expected.executionAuthorized !== true || currentFoundation.actionId !== context.actionId) {
        throw new Task53ExecutionError("action_not_execution_authorized", 409);
      }
      const deploymentRows = await tx<Array<{ id: string; createdAt: string }>>`
        INSERT INTO deployments(action_plan_id,provider,status,metadata)
        VALUES(
          ${context.actionPlanId}::uuid,
          'shopify',
          'active',
          ${tx.json({
            version: "controlled_single_action_production_execution_pilot_v1",
            actionId: context.actionId,
            pageId: context.pageId,
            targetUrl: context.pageUrl,
            providerResource: preflight.resource,
            field: preflight.field,
            beforeValue: preflight.beforeValue,
            afterValue: preflight.afterValue,
            preflightFingerprint: preflight.preflightFingerprint,
            authorizationFingerprint: context.envelope.envelopeFingerprint,
            rollbackIncluded: true,
            publicWriteOccurred: false,
            providerWriteStage: "reserved",
          } as never)}
        ) RETURNING id::text,created_at::text AS "createdAt"`;
      const deployment = deploymentRows[0]!;
      await tx`UPDATE actions SET status='active',updated_at=now() WHERE id=${context.actionId}::uuid`;
      const nextExpected = {
        ...expected,
        lifecycleStage: "production_pilot_active",
        publicSiteWrites: true,
        automaticTransition: false,
        executionFoundation: {
          ...currentFoundation,
          state: "provider_write_reserved",
          deploymentId: deployment.id,
          verificationStatus: "pending",
          rollbackEligible: false,
          publicWriteOccurred: false,
          task53PreflightFingerprint: preflight.preflightFingerprint,
        },
      };
      await tx`UPDATE action_plans SET expected_outcome=${tx.json(nextExpected as never)},updated_at=now() WHERE id=${context.actionPlanId}::uuid`;
      return deployment;
    });
  } finally {
    await sql.end({ timeout: 2 }).catch(() => undefined);
  }
}

async function updateDeployment(input: { deploymentId: string; status: "active" | "completed" | "failed"; externalRef?: string | null; deployed?: boolean; metadataPatch: Record<string, unknown> }) {
  const sql = database();
  try {
    await sql`
      UPDATE deployments
      SET status=${input.status},
          external_ref=COALESCE(${input.externalRef ?? null},external_ref),
          deployed_at=CASE WHEN ${input.deployed === true} THEN COALESCE(deployed_at,now()) ELSE deployed_at END,
          metadata=metadata || ${sql.json(input.metadataPatch as never)}
      WHERE id=${input.deploymentId}::uuid`;
  } finally { await sql.end({ timeout: 2 }).catch(() => undefined); }
}

async function insertVerification(input: {
  deploymentId: string;
  pageId: string;
  phase: "forward" | "rollback";
  status: "verified" | "failed";
  expected: Record<string, unknown>;
  actual: Record<string, unknown>;
}) {
  const sql = database();
  try {
    const rows = await sql<Array<{ id: string }>>`
      INSERT INTO verifications(deployment_id,page_id,status,expected_state,actual_state,verified_at)
      VALUES(${input.deploymentId}::uuid,${input.pageId}::uuid,${input.status},${sql.json({ phase: input.phase, ...input.expected } as never)},${sql.json({ phase: input.phase, ...input.actual } as never)},now())
      RETURNING id::text`;
    return rows[0]!.id;
  } finally { await sql.end({ timeout: 2 }).catch(() => undefined); }
}

async function createRollback(input: { deploymentId: string; context: ActionContext; preflight: Task53Preflight }) {
  const sql = database();
  try {
    const rows = await sql<Array<{ id: string }>>`
      INSERT INTO rollbacks(deployment_id,status,reason,restore_state)
      VALUES(
        ${input.deploymentId}::uuid,
        'active',
        'Task #53 bounded production pilot always restores the approved pre-write state.',
        ${sql.json({
          actionId: input.context.actionId,
          pageId: input.context.pageId,
          targetUrl: input.context.pageUrl,
          providerResource: input.preflight.resource,
          field: input.preflight.field,
          value: input.preflight.beforeValue,
          fingerprint: input.preflight.expectedBeforeFingerprint,
          preflightFingerprint: input.preflight.preflightFingerprint,
        } as never)}
      ) RETURNING id::text`;
    return rows[0]!.id;
  } finally { await sql.end({ timeout: 2 }).catch(() => undefined); }
}

async function finalizeRollbackRow(rollbackId: string, status: "completed" | "failed") {
  const sql = database();
  try {
    await sql`UPDATE rollbacks SET status=${status},rolled_back_at=CASE WHEN ${status === "completed"} THEN now() ELSE rolled_back_at END WHERE id=${rollbackId}::uuid`;
  } finally { await sql.end({ timeout: 2 }).catch(() => undefined); }
}

async function finalizePlan(input: {
  context: ActionContext;
  deploymentId: string;
  forwardVerificationId: string | null;
  rollbackId: string | null;
  rollbackVerificationId: string | null;
  forwardVerified: boolean;
  rollbackVerified: boolean;
  publicWriteOccurred: boolean;
  manualInterventionRequired: boolean;
  failureCategory?: string | null;
}) {
  const sql = database();
  try {
    await sql.begin(async (tx) => {
      const rows = await tx<Array<{ expectedOutcome: Record<string, unknown> }>>`
        SELECT expected_outcome AS "expectedOutcome" FROM action_plans WHERE id=${input.context.actionPlanId}::uuid FOR UPDATE`;
      const expected = object(rows[0]?.expectedOutcome);
      const foundation = object(expected.executionFoundation);
      const success = input.forwardVerified && input.rollbackVerified && !input.manualInterventionRequired;
      const lifecycleStage = success
        ? "production_pilot_verified_and_rolled_back"
        : input.rollbackVerified
          ? "production_pilot_rolled_back_with_forward_verification_failure"
          : "manual_intervention_required";
      const nextExpected = {
        ...expected,
        lifecycleStage,
        publicSiteWrites: true,
        automaticTransition: false,
        executionFoundation: {
          ...foundation,
          state: lifecycleStage,
          deploymentId: input.deploymentId,
          forwardVerificationId: input.forwardVerificationId,
          rollbackId: input.rollbackId,
          rollbackVerificationId: input.rollbackVerificationId,
          verificationStatus: input.forwardVerified ? "verified" : "failed",
          rollbackStatus: input.rollbackVerified ? "verified" : input.rollbackId ? "failed" : "not_started",
          rollbackEligible: false,
          publicWriteOccurred: input.publicWriteOccurred,
          manualInterventionRequired: input.manualInterventionRequired,
          failureCategory: input.failureCategory ?? null,
        },
      };
      await tx`UPDATE actions SET status=${success ? "completed" : "failed"},updated_at=now() WHERE id=${input.context.actionId}::uuid`;
      await tx`UPDATE action_plans SET status=${success ? "completed" : "failed"},expected_outcome=${tx.json(nextExpected as never)},updated_at=now() WHERE id=${input.context.actionPlanId}::uuid`;
    });
  } finally { await sql.end({ timeout: 2 }).catch(() => undefined); }
}

async function observeAfterUncertainMutation(credential: Task53ShopifyCredential, context: ActionContext, preflight: Task53Preflight, fetchImpl?: typeof fetch) {
  try {
    return await readTask53ShopifyState({ credential, resource: preflight.resource, field: preflight.field, fetchImpl });
  } catch {
    return null;
  }
}

export async function executeTask53ProductionPilot(actionId: string, input: Task53ExecutionInput, fetchImpl?: typeof fetch) {
  const context = await loadActionContext(actionId);
  const credential = await loadTask53ShopifyCredential();
  const beforeState = await readTask53ShopifyState({ credential, resource: input.resource, field: context.envelope.target.field, fetchImpl });
  const preflight = buildTask53Preflight({
    actionId,
    envelope: context.envelope,
    resource: input.resource,
    providerState: beforeState,
    credentialScopes: credential.scopes,
    publicWriteGateEnabled: process.env.PUBLIC_SITE_WRITES_ENABLED?.trim().toLowerCase() === "true",
    priorDeploymentCount: context.priorDeploymentCount,
    otherActiveExecutionCount: context.otherActiveExecutionCount,
    now: new Date().toISOString(),
  });
  if (!preflight.readyForLivePilot) throw new Task53ExecutionError(preflight.blockers[0] ?? "task53_preflight_not_ready", 409);
  if (input.preflightFingerprint !== preflight.preflightFingerprint) throw new Task53ExecutionError("stale_task53_preflight_fingerprint", 409);
  if (input.confirmation !== task53RequiredConfirmation(actionId, preflight.preflightFingerprint)) {
    throw new Task53ExecutionError("explicit_task53_execute_and_rollback_confirmation_required", 400);
  }

  const deployment = await reserveDeployment(context, preflight);
  let publicWriteOccurred = false;
  let forwardProviderState: Task53ProviderState | null = null;
  let forwardMutationRequestId: string | null = null;
  let forwardFailureCategory: string | null = null;

  try {
    const receipt = await mutateTask53ShopifyState({ credential, resource: preflight.resource, field: preflight.field, value: preflight.afterValue, fetchImpl });
    forwardMutationRequestId = receipt.providerRequestId;
    if (!receipt.ok) {
      await updateDeployment({ deploymentId: deployment.id, status: "failed", externalRef: receipt.providerRequestId, metadataPatch: { providerWriteStage: "rejected", mutationReceipt: receipt, publicWriteOccurred: false } });
      await finalizePlan({ context, deploymentId: deployment.id, forwardVerificationId: null, rollbackId: null, rollbackVerificationId: null, forwardVerified: false, rollbackVerified: false, publicWriteOccurred: false, manualInterventionRequired: false, failureCategory: receipt.errorCategory });
      throw new Task53ExecutionError(receipt.errorCategory ?? "shopify_mutation_rejected", 502);
    }
    publicWriteOccurred = true;
    await updateDeployment({ deploymentId: deployment.id, status: "completed", externalRef: receipt.providerRequestId, deployed: true, metadataPatch: { providerWriteStage: "accepted", mutationReceipt: receipt, publicWriteOccurred: true } });
    forwardProviderState = await readTask53ShopifyState({ credential, resource: preflight.resource, field: preflight.field, fetchImpl });
  } catch (error) {
    if (error instanceof Task53ExecutionError) throw error;
    forwardFailureCategory = error instanceof Error ? error.message : "shopify_mutation_uncertain";
    forwardProviderState = await observeAfterUncertainMutation(credential, context, preflight, fetchImpl);
    if (forwardProviderState?.fingerprint === context.envelope.proposedState.fingerprint) {
      publicWriteOccurred = true;
      await updateDeployment({ deploymentId: deployment.id, status: "completed", externalRef: forwardMutationRequestId, deployed: true, metadataPatch: { providerWriteStage: "accepted_observed_after_uncertain_response", publicWriteOccurred: true, forwardFailureCategory } });
    } else if (forwardProviderState?.fingerprint === context.envelope.expectedCurrentState.fingerprint) {
      await updateDeployment({ deploymentId: deployment.id, status: "failed", metadataPatch: { providerWriteStage: "failed_observed_unchanged", publicWriteOccurred: false, forwardFailureCategory } });
      await finalizePlan({ context, deploymentId: deployment.id, forwardVerificationId: null, rollbackId: null, rollbackVerificationId: null, forwardVerified: false, rollbackVerified: false, publicWriteOccurred: false, manualInterventionRequired: false, failureCategory: forwardFailureCategory });
      throw new Task53ExecutionError("provider_write_failed_state_unchanged", 502);
    } else {
      await updateDeployment({ deploymentId: deployment.id, status: "failed", metadataPatch: { providerWriteStage: "uncertain_manual_intervention", publicWriteOccurred: false, forwardFailureCategory } });
      await finalizePlan({ context, deploymentId: deployment.id, forwardVerificationId: null, rollbackId: null, rollbackVerificationId: null, forwardVerified: false, rollbackVerified: false, publicWriteOccurred: false, manualInterventionRequired: true, failureCategory: "provider_write_outcome_uncertain" });
      throw new Task53ExecutionError("provider_write_outcome_uncertain", 502);
    }
  }

  const forwardStorefront = await verifyTask53Storefront({ url: context.pageUrl, field: preflight.field, expectedValue: preflight.afterValue, fetchImpl });
  const forwardProviderVerified = forwardProviderState?.fingerprint === context.envelope.proposedState.fingerprint;
  const forwardVerified = Boolean(forwardProviderVerified && forwardStorefront.ok);
  const forwardVerificationId = await insertVerification({
    deploymentId: deployment.id,
    pageId: context.pageId,
    phase: "forward",
    status: forwardVerified ? "verified" : "failed",
    expected: {
      field: preflight.field,
      value: preflight.afterValue,
      fingerprint: context.envelope.proposedState.fingerprint,
      providerResource: preflight.resource,
    },
    actual: {
      provider: forwardProviderState,
      storefront: forwardStorefront,
      providerVerified: forwardProviderVerified,
      storefrontVerified: forwardStorefront.ok,
      auditFingerprint: task53AuditFingerprint({ provider: forwardProviderState, storefront: forwardStorefront }),
    },
  });

  const rollbackId = await createRollback({ deploymentId: deployment.id, context, preflight });
  let rollbackFailureCategory: string | null = null;
  let rollbackProviderState: Task53ProviderState | null = null;
  try {
    const rollbackReceipt = await mutateTask53ShopifyState({ credential, resource: preflight.resource, field: preflight.field, value: preflight.beforeValue, fetchImpl });
    if (!rollbackReceipt.ok) rollbackFailureCategory = rollbackReceipt.errorCategory ?? "shopify_rollback_rejected";
    rollbackProviderState = await observeAfterUncertainMutation(credential, context, preflight, fetchImpl);
  } catch (error) {
    rollbackFailureCategory = error instanceof Error ? error.message : "shopify_rollback_uncertain";
    rollbackProviderState = await observeAfterUncertainMutation(credential, context, preflight, fetchImpl);
  }
  const rollbackStorefront = await verifyTask53Storefront({ url: context.pageUrl, field: preflight.field, expectedValue: preflight.beforeValue, fetchImpl });
  const rollbackProviderVerified = rollbackProviderState?.fingerprint === context.envelope.expectedCurrentState.fingerprint;
  const rollbackVerified = Boolean(rollbackProviderVerified && rollbackStorefront.ok);
  await finalizeRollbackRow(rollbackId, rollbackVerified ? "completed" : "failed");
  const rollbackVerificationId = await insertVerification({
    deploymentId: deployment.id,
    pageId: context.pageId,
    phase: "rollback",
    status: rollbackVerified ? "verified" : "failed",
    expected: {
      field: preflight.field,
      value: preflight.beforeValue,
      fingerprint: context.envelope.expectedCurrentState.fingerprint,
      providerResource: preflight.resource,
    },
    actual: {
      provider: rollbackProviderState,
      storefront: rollbackStorefront,
      providerVerified: rollbackProviderVerified,
      storefrontVerified: rollbackStorefront.ok,
      rollbackFailureCategory,
      auditFingerprint: task53AuditFingerprint({ provider: rollbackProviderState, storefront: rollbackStorefront, rollbackFailureCategory }),
    },
  });

  const manualInterventionRequired = !rollbackVerified;
  await finalizePlan({
    context,
    deploymentId: deployment.id,
    forwardVerificationId,
    rollbackId,
    rollbackVerificationId,
    forwardVerified,
    rollbackVerified,
    publicWriteOccurred,
    manualInterventionRequired,
    failureCategory: rollbackFailureCategory ?? forwardFailureCategory ?? (!forwardVerified ? "forward_verification_failed" : null),
  });

  return {
    version: "controlled_single_action_production_execution_pilot_v1" as const,
    action_id: actionId,
    action_plan_id: context.actionPlanId,
    deployment_id: deployment.id,
    forward_verification_id: forwardVerificationId,
    rollback_id: rollbackId,
    rollback_verification_id: rollbackVerificationId,
    provider_write_request_id: forwardMutationRequestId,
    public_write_occurred: publicWriteOccurred,
    forward_verified: forwardVerified,
    rollback_verified: rollbackVerified,
    manual_intervention_required: manualInterventionRequired,
    final_state: forwardVerified && rollbackVerified ? "production_pilot_verified_and_rolled_back" : rollbackVerified ? "production_pilot_rolled_back_with_forward_verification_failure" : "manual_intervention_required",
    provider_secret_exposed: false,
    automatic_transition: false,
  };
}
