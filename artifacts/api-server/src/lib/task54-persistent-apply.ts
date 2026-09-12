import postgres from "postgres";
import type { AuthorizationEnvelope } from "./execution-foundation.js";
import {
  buildTask53Preflight,
  mutateTask53ShopifyState,
  readTask53ShopifyState,
  task53AuditFingerprint,
  verifyTask53Storefront,
  type Task53Preflight,
  type Task53ProviderState,
  type Task53Resource,
  type Task53ShopifyCredential,
} from "./task53-production-pilot.js";
import { verifyTask53RollbackPropagation, TASK53_ROLLBACK_REVERIFY_DELAYS_MS } from "./task53-rollback-propagation.js";
import { loadTask53ShopifyCredential } from "./task53-shopify-credential.js";

export const TASK54_VERSION = "verified_persistent_single_action_production_apply_v1" as const;
export const TASK54_ORCHESTRATOR = "task54_persistent_apply_v1" as const;
export const TASK54_ADMIN_API_VERSION = "2026-07" as const;
export const TASK54_PROPAGATION_DELAYS_MS = TASK53_ROLLBACK_REVERIFY_DELAYS_MS;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class Task54ExecutionError extends Error {
  constructor(public readonly category: string, public readonly status: number) {
    super(category);
    this.name = "Task54ExecutionError";
  }
}

type ActionContext = {
  actionId: string;
  actionPlanId: string;
  pageId: string;
  pageUrl: string;
  siteDomain: string;
  expectedOutcome: Record<string, unknown>;
  approvalDecision: string | null;
  approvalActor: string | null;
  approvedAt: string | null;
  envelope: AuthorizationEnvelope;
  priorDeploymentCount: number;
  otherActiveExecutionCount: number;
};

export type Task54ExecutionInput = {
  resource: Task53Resource;
  preflightFingerprint: string;
  confirmation: string;
};

export type Task54ForwardDisposition = "keep_live" | "rollback" | "fail_no_write" | "manual_intervention";

function database() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Task54ExecutionError("task54_execution_runtime_unavailable", 503);
  return postgres(url, { max: 1, prepare: false, connect_timeout: 5, idle_timeout: 2 });
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function authorizationEnvelope(value: unknown): AuthorizationEnvelope {
  const row = object(value);
  if (row.version !== "controlled_execution_foundation_v1" || typeof row.planId !== "string" || typeof row.envelopeFingerprint !== "string") {
    throw new Task54ExecutionError("task54_execution_authorization_envelope_missing", 409);
  }
  return row as unknown as AuthorizationEnvelope;
}

function effectiveFetch(fetchImpl?: typeof fetch): typeof fetch {
  const base = fetchImpl ?? fetch;
  return (async (input: URL | RequestInfo, init?: RequestInit) => {
    if (typeof input === "string" && input.includes("/admin/api/2025-10/graphql.json")) {
      return base(input.replace("/admin/api/2025-10/graphql.json", `/admin/api/${TASK54_ADMIN_API_VERSION}/graphql.json`), init);
    }
    if (input instanceof URL && input.pathname.includes("/admin/api/2025-10/graphql.json")) {
      const url = new URL(input);
      url.pathname = url.pathname.replace("/admin/api/2025-10/graphql.json", `/admin/api/${TASK54_ADMIN_API_VERSION}/graphql.json`);
      return base(url, init);
    }
    return base(input, init);
  }) as typeof fetch;
}

export function task54RequiredConfirmation(actionId: string, preflightFingerprint: string) {
  return `APPLY_AND_VERIFY_TASK54:${actionId}:${preflightFingerprint}`;
}

export function task54ForwardDisposition(input: {
  publicWriteOccurred: boolean;
  forwardVerified: boolean;
  writeOutcomeUncertain?: boolean;
}): Task54ForwardDisposition {
  if (input.writeOutcomeUncertain) return "manual_intervention";
  if (!input.publicWriteOccurred) return "fail_no_write";
  return input.forwardVerified ? "keep_live" : "rollback";
}

export function promoteTask53PreflightToTask54(base: Task53Preflight) {
  const preflightFingerprint = task53AuditFingerprint({
    version: TASK54_VERSION,
    mode: "persistent_apply",
    actionId: base.actionId,
    planId: base.planId,
    sourceTask53PreflightFingerprint: base.preflightFingerprint,
    targetUrl: base.targetUrl,
    field: base.field,
    resource: base.resource,
    expectedBeforeFingerprint: base.expectedBeforeFingerprint,
    observedBeforeFingerprint: base.observedBeforeFingerprint,
    afterValue: base.afterValue,
    authorizationExpiresAt: base.authorizationExpiresAt,
  });
  return {
    version: TASK54_VERSION,
    mode: "persistent_verified_apply" as const,
    actionId: base.actionId,
    planId: base.planId,
    targetUrl: base.targetUrl,
    field: base.field,
    resource: base.resource,
    beforeValue: base.beforeValue,
    afterValue: base.afterValue,
    expectedBeforeFingerprint: base.expectedBeforeFingerprint,
    observedBeforeFingerprint: base.observedBeforeFingerprint,
    providerStateMatchesApprovedSnapshot: base.providerStateMatchesApprovedSnapshot,
    authorizationExpiresAt: base.authorizationExpiresAt,
    authorizationFresh: base.authorizationFresh,
    requiredWriteScope: base.requiredWriteScope,
    writeScopePresent: base.writeScopePresent,
    publicWriteGateEnabled: base.publicWriteGateEnabled,
    priorDeploymentCount: base.priorDeploymentCount,
    otherActiveExecutionCount: base.otherActiveExecutionCount,
    sourceTask53PreflightFingerprint: base.preflightFingerprint,
    preflightFingerprint,
    requiredConfirmation: task54RequiredConfirmation(base.actionId, preflightFingerprint),
    successLeavesChangeLive: true as const,
    rollbackOnVerificationFailure: true as const,
    additionalForwardMutationAllowed: false as const,
    additionalRollbackMutationAllowed: false as const,
    readyForPersistentApply: base.readyForLivePilot,
    blockers: [...base.blockers],
  };
}

type Task54Preflight = ReturnType<typeof promoteTask53PreflightToTask54>;

async function loadActionContext(actionId: string): Promise<ActionContext> {
  if (!uuidPattern.test(actionId)) throw new Task54ExecutionError("task54_action_not_found", 404);
  const sql = database();
  try {
    const rows = await sql<Array<{
      actionId: string;
      actionPlanId: string;
      actionStatus: string;
      pageId: string | null;
      pageUrl: string | null;
      siteDomain: string;
      expectedOutcome: Record<string, unknown>;
      proposedChange: Record<string, unknown>;
      approvalDecision: string | null;
      approvalActor: string | null;
      approvedAt: string | null;
      priorDeploymentCount: number;
      otherActiveExecutionCount: number;
    }>>`
      SELECT a.id::text AS "actionId",a.action_plan_id::text AS "actionPlanId",a.status AS "actionStatus",
        a.page_id::text AS "pageId",p.url AS "pageUrl",s.domain AS "siteDomain",
        ap.expected_outcome AS "expectedOutcome",a.proposed_change AS "proposedChange",
        approval.decision AS "approvalDecision",approval.actor_id AS "approvalActor",approval.decided_at::text AS "approvedAt",
        (SELECT COUNT(*)::int FROM deployments d WHERE d.action_plan_id=ap.id) AS "priorDeploymentCount",
        (SELECT COUNT(*)::int FROM deployments d2 JOIN action_plans ap2 ON ap2.id=d2.action_plan_id
          WHERE ap2.site_id=ap.site_id AND d2.status IN ('pending','active') AND d2.action_plan_id<>ap.id) AS "otherActiveExecutionCount"
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
    if (!row || !row.pageId || !row.pageUrl) throw new Task54ExecutionError("task54_action_not_found", 404);
    const envelope = authorizationEnvelope(object(row.proposedChange).authorizationEnvelope);
    const expected = object(row.expectedOutcome);
    const foundation = object(expected.executionFoundation);
    if (envelope.planId !== row.actionPlanId || envelope.target.pageId !== row.pageId || envelope.target.url !== row.pageUrl) {
      throw new Task54ExecutionError("task54_execution_identity_mismatch", 409);
    }
    if (expected.lifecycleStage !== "executable_action" || expected.executionAuthorized !== true || foundation.actionId !== actionId) {
      throw new Task54ExecutionError("task54_action_not_execution_authorized", 409);
    }
    if (expected.publicSiteWrites !== false || expected.automaticTransition !== false) {
      throw new Task54ExecutionError("task54_execution_safety_invariant_failed", 409);
    }
    if (row.approvalDecision !== "approved" || !row.approvedAt) throw new Task54ExecutionError("task54_latest_approval_not_approved", 409);
    if (row.actionStatus !== "pending") throw new Task54ExecutionError("task54_action_not_pending", 409);
    if (row.siteDomain.toLowerCase() !== "diamondshelf.us") throw new Task54ExecutionError("task54_site_not_allowed", 403);
    return {
      actionId: row.actionId,
      actionPlanId: row.actionPlanId,
      pageId: row.pageId,
      pageUrl: row.pageUrl,
      siteDomain: row.siteDomain,
      expectedOutcome: row.expectedOutcome,
      approvalDecision: row.approvalDecision,
      approvalActor: row.approvalActor,
      approvedAt: row.approvedAt,
      envelope,
      priorDeploymentCount: Number(row.priorDeploymentCount ?? 0),
      otherActiveExecutionCount: Number(row.otherActiveExecutionCount ?? 0),
    };
  } finally {
    await sql.end({ timeout: 2 }).catch(() => undefined);
  }
}

function buildBasePreflight(context: ActionContext, resource: Task53Resource, providerState: Task53ProviderState, credential: Task53ShopifyCredential) {
  return buildTask53Preflight({
    actionId: context.actionId,
    envelope: context.envelope,
    resource,
    providerState,
    credentialScopes: credential.scopes,
    publicWriteGateEnabled: process.env.PUBLIC_SITE_WRITES_ENABLED?.trim().toLowerCase() === "true",
    priorDeploymentCount: context.priorDeploymentCount,
    otherActiveExecutionCount: context.otherActiveExecutionCount,
    now: new Date().toISOString(),
  });
}

export async function getTask54Preflight(actionId: string, resource: Task53Resource, fetchImpl?: typeof fetch) {
  const context = await loadActionContext(actionId);
  const credential = await loadTask53ShopifyCredential();
  const providerState = await readTask53ShopifyState({
    credential,
    resource,
    field: context.envelope.target.field,
    fetchImpl: effectiveFetch(fetchImpl),
  });
  const base = buildBasePreflight(context, resource, providerState, credential);
  const preflight = promoteTask53PreflightToTask54(base);
  return {
    ...preflight,
    adminApiVersion: TASK54_ADMIN_API_VERSION,
    approval: { decision: context.approvalDecision, actor: context.approvalActor, decidedAt: context.approvedAt },
    providerPreReadRequestId: providerState.providerRequestId,
    providerSecretExposed: false,
    mutationPerformed: false,
  };
}

async function reserveDeployment(context: ActionContext, preflight: Task54Preflight) {
  const sql = database();
  try {
    return await sql.begin(async (tx) => {
      const rows = await tx<Array<{ actionStatus: string; expectedOutcome: Record<string, unknown>; deploymentCount: number; activeCount: number }>>`
        SELECT a.status AS "actionStatus",ap.expected_outcome AS "expectedOutcome",
          (SELECT COUNT(*)::int FROM deployments d WHERE d.action_plan_id=ap.id) AS "deploymentCount",
          (SELECT COUNT(*)::int FROM deployments d2 JOIN action_plans ap2 ON ap2.id=d2.action_plan_id
            WHERE ap2.site_id=ap.site_id AND d2.status IN ('pending','active') AND d2.action_plan_id<>ap.id) AS "activeCount"
        FROM actions a JOIN action_plans ap ON ap.id=a.action_plan_id
        WHERE a.id=${context.actionId}::uuid FOR UPDATE OF a,ap`;
      const row = rows[0];
      if (!row || row.actionStatus !== "pending") throw new Task54ExecutionError("task54_action_not_pending", 409);
      if (Number(row.deploymentCount ?? 0) > 0) throw new Task54ExecutionError("task54_duplicate_provider_execution_blocked", 409);
      if (Number(row.activeCount ?? 0) > 0) throw new Task54ExecutionError("task54_another_site_execution_is_active", 409);
      const expected = object(row.expectedOutcome);
      const foundation = object(expected.executionFoundation);
      if (expected.lifecycleStage !== "executable_action" || expected.executionAuthorized !== true || foundation.actionId !== context.actionId) {
        throw new Task54ExecutionError("task54_action_not_execution_authorized", 409);
      }
      if (expected.publicSiteWrites !== false || expected.automaticTransition !== false) {
        throw new Task54ExecutionError("task54_execution_safety_invariant_failed", 409);
      }
      const inserted = await tx<Array<{ id: string }>>`
        INSERT INTO deployments(action_plan_id,provider,status,metadata)
        VALUES(${context.actionPlanId}::uuid,'shopify','active',${tx.json({
          version: TASK54_VERSION,
          orchestrator: TASK54_ORCHESTRATOR,
          adminApiVersion: TASK54_ADMIN_API_VERSION,
          actionId: context.actionId,
          pageId: context.pageId,
          targetUrl: context.pageUrl,
          providerResource: preflight.resource,
          field: preflight.field,
          beforeValue: preflight.beforeValue,
          afterValue: preflight.afterValue,
          preflightFingerprint: preflight.preflightFingerprint,
          sourceTask53PreflightFingerprint: preflight.sourceTask53PreflightFingerprint,
          authorizationFingerprint: context.envelope.envelopeFingerprint,
          successLeavesChangeLive: true,
          rollbackOnVerificationFailure: true,
          providerWriteStage: "reserved",
          publicWriteOccurred: false,
        } as never)}) RETURNING id::text`;
      const deploymentId = inserted[0]!.id;
      await tx`UPDATE actions SET status='active',updated_at=now() WHERE id=${context.actionId}::uuid`;
      await tx`UPDATE action_plans SET expected_outcome=expected_outcome || ${tx.json({
        lifecycleStage: "production_apply_active",
        publicSiteWrites: false,
        automaticTransition: false,
        executionFoundation: {
          ...foundation,
          state: "task54_provider_write_reserved",
          deploymentId,
          verificationStatus: "pending",
          rollbackEligible: false,
          publicWriteOccurred: false,
          task54PreflightFingerprint: preflight.preflightFingerprint,
        },
      } as never)},updated_at=now() WHERE id=${context.actionPlanId}::uuid`;
      return deploymentId;
    });
  } finally {
    await sql.end({ timeout: 2 }).catch(() => undefined);
  }
}

async function patchDeployment(deploymentId: string, status: "active" | "completed" | "failed", patch: Record<string, unknown>, externalRef: string | null = null, markDeployed = false) {
  const sql = database();
  try {
    await sql`UPDATE deployments SET status=${status},external_ref=COALESCE(${externalRef},external_ref),deployed_at=CASE WHEN ${markDeployed} THEN COALESCE(deployed_at,now()) ELSE deployed_at END,metadata=metadata || ${sql.json(patch as never)} WHERE id=${deploymentId}::uuid`;
  } finally {
    await sql.end({ timeout: 2 }).catch(() => undefined);
  }
}

async function finalizeNoWrite(context: ActionContext, deploymentId: string, failureCategory: string) {
  const sql = database();
  try {
    await sql.begin(async (tx) => {
      const rows = await tx<Array<{ expectedOutcome: Record<string, unknown> }>>`
        SELECT expected_outcome AS "expectedOutcome" FROM action_plans WHERE id=${context.actionPlanId}::uuid FOR UPDATE`;
      const expected = object(rows[0]?.expectedOutcome);
      const foundation = object(expected.executionFoundation);
      await tx`UPDATE deployments SET status='failed',metadata=metadata || ${tx.json({
        finalState: "production_apply_failed_without_confirmed_write",
        providerWriteStage: "failed_without_confirmed_write",
        publicWriteOccurred: false,
        failureCategory,
      } as never)} WHERE id=${deploymentId}::uuid`;
      await tx`UPDATE actions SET status='failed',updated_at=now() WHERE id=${context.actionId}::uuid`;
      await tx`UPDATE action_plans SET status='failed',expected_outcome=${tx.json({
        ...expected,
        lifecycleStage: "production_apply_failed_without_confirmed_write",
        publicSiteWrites: false,
        automaticTransition: false,
        executionFoundation: {
          ...foundation,
          state: "production_apply_failed_without_confirmed_write",
          deploymentId,
          verificationStatus: "failed",
          rollbackStatus: "not_required",
          rollbackEligible: false,
          publicWriteOccurred: false,
          manualInterventionRequired: false,
          failureCategory,
        },
      } as never)},updated_at=now() WHERE id=${context.actionPlanId}::uuid`;
    });
  } finally {
    await sql.end({ timeout: 2 }).catch(() => undefined);
  }
}

async function finalizeUncertainWrite(context: ActionContext, deploymentId: string, failureCategory: string) {
  const sql = database();
  try {
    await sql.begin(async (tx) => {
      const rows = await tx<Array<{ expectedOutcome: Record<string, unknown> }>>`
        SELECT expected_outcome AS "expectedOutcome" FROM action_plans WHERE id=${context.actionPlanId}::uuid FOR UPDATE`;
      const expected = object(rows[0]?.expectedOutcome);
      const foundation = object(expected.executionFoundation);
      await tx`UPDATE deployments SET status='failed',metadata=metadata || ${tx.json({
        finalState: "manual_intervention_required",
        providerWriteStage: "outcome_uncertain",
        writeOutcomeUncertain: true,
        failureCategory,
      } as never)} WHERE id=${deploymentId}::uuid`;
      await tx`UPDATE actions SET status='failed',updated_at=now() WHERE id=${context.actionId}::uuid`;
      await tx`UPDATE action_plans SET status='failed',expected_outcome=${tx.json({
        ...expected,
        lifecycleStage: "manual_intervention_required",
        publicSiteWrites: false,
        automaticTransition: false,
        executionFoundation: {
          ...foundation,
          state: "manual_intervention_required",
          deploymentId,
          verificationStatus: "unknown",
          rollbackStatus: "unknown",
          rollbackEligible: false,
          publicWriteOccurred: false,
          writeOutcomeUncertain: true,
          manualInterventionRequired: true,
          failureCategory,
        },
      } as never)},updated_at=now() WHERE id=${context.actionPlanId}::uuid`;
    });
  } finally {
    await sql.end({ timeout: 2 }).catch(() => undefined);
  }
}

async function finalizeLiveSuccess(context: ActionContext, deploymentId: string, preflight: Task54Preflight, propagation: Awaited<ReturnType<typeof verifyTask53RollbackPropagation>>, providerWriteRequestId: string | null) {
  const sql = database();
  try {
    return await sql.begin(async (tx) => {
      const rows = await tx<Array<{ expectedOutcome: Record<string, unknown> }>>`
        SELECT expected_outcome AS "expectedOutcome" FROM action_plans WHERE id=${context.actionPlanId}::uuid FOR UPDATE`;
      const expected = object(rows[0]?.expectedOutcome);
      const foundation = object(expected.executionFoundation);
      const verificationRows = await tx<Array<{ id: string }>>`
        INSERT INTO verifications(deployment_id,page_id,status,expected_state,actual_state,verified_at)
        VALUES(${deploymentId}::uuid,${context.pageId}::uuid,'verified',${tx.json({
          phase: "forward",
          field: preflight.field,
          value: preflight.afterValue,
          fingerprint: context.envelope.proposedState.fingerprint,
          providerResource: preflight.resource,
        } as never)},${tx.json({
          phase: "forward",
          provider: propagation.providerState,
          storefront: propagation.storefront,
          providerVerified: propagation.providerVerified,
          storefrontVerified: propagation.storefrontVerified,
          propagation: {
            version: "task54_bounded_forward_propagation_verification_v1",
            attemptCount: propagation.attemptCount,
            totalDelayMs: propagation.totalDelayMs,
            attempts: propagation.attempts,
          },
          auditFingerprint: task53AuditFingerprint({ provider: propagation.providerState, storefront: propagation.storefront, attempts: propagation.attempts }),
        } as never)},now()) RETURNING id::text`;
      const verificationId = verificationRows[0]!.id;
      await tx`UPDATE deployments SET status='completed',external_ref=COALESCE(${providerWriteRequestId},external_ref),deployed_at=COALESCE(deployed_at,now()),metadata=metadata || ${tx.json({
        finalState: "production_change_verified_live",
        providerWriteStage: "accepted_verified_live",
        publicWriteOccurred: true,
        verificationId,
        measurementEligible: true,
        successLeavesChangeLive: true,
        propagation: {
          version: "task54_bounded_forward_propagation_verification_v1",
          attemptCount: propagation.attemptCount,
          totalDelayMs: propagation.totalDelayMs,
          converged: true,
        },
      } as never)} WHERE id=${deploymentId}::uuid`;
      await tx`UPDATE actions SET status='completed',updated_at=now() WHERE id=${context.actionId}::uuid`;
      await tx`UPDATE action_plans SET status='completed',expected_outcome=${tx.json({
        ...expected,
        lifecycleStage: "production_change_verified_live",
        publicSiteWrites: true,
        automaticTransition: false,
        executionFoundation: {
          ...foundation,
          state: "production_change_verified_live",
          deploymentId,
          forwardVerificationId: verificationId,
          verificationStatus: "verified",
          rollbackStatus: "not_required",
          rollbackEligible: true,
          publicWriteOccurred: true,
          liveChangeVerified: true,
          measurementEligible: true,
          manualInterventionRequired: false,
          failureCategory: null,
        },
      } as never)},updated_at=now() WHERE id=${context.actionPlanId}::uuid`;
      return verificationId;
    });
  } finally {
    await sql.end({ timeout: 2 }).catch(() => undefined);
  }
}

async function finalizeRolledBack(context: ActionContext, deploymentId: string, preflight: Task54Preflight, input: {
  forwardPropagation: Awaited<ReturnType<typeof verifyTask53RollbackPropagation>>;
  rollbackPropagation: Awaited<ReturnType<typeof verifyTask53RollbackPropagation>>;
  rollbackMutationAccepted: boolean;
  rollbackFailureCategory: string | null;
  failureCategory: string;
}) {
  const sql = database();
  try {
    return await sql.begin(async (tx) => {
      const rows = await tx<Array<{ expectedOutcome: Record<string, unknown> }>>`
        SELECT expected_outcome AS "expectedOutcome" FROM action_plans WHERE id=${context.actionPlanId}::uuid FOR UPDATE`;
      const expected = object(rows[0]?.expectedOutcome);
      const foundation = object(expected.executionFoundation);
      const forwardRows = await tx<Array<{ id: string }>>`
        INSERT INTO verifications(deployment_id,page_id,status,expected_state,actual_state,verified_at)
        VALUES(${deploymentId}::uuid,${context.pageId}::uuid,'failed',${tx.json({
          phase: "forward",
          field: preflight.field,
          value: preflight.afterValue,
          fingerprint: context.envelope.proposedState.fingerprint,
          providerResource: preflight.resource,
        } as never)},${tx.json({
          phase: "forward",
          provider: input.forwardPropagation.providerState,
          storefront: input.forwardPropagation.storefront,
          providerVerified: input.forwardPropagation.providerVerified,
          storefrontVerified: input.forwardPropagation.storefrontVerified,
          propagation: {
            version: "task54_bounded_forward_propagation_verification_v1",
            attemptCount: input.forwardPropagation.attemptCount,
            totalDelayMs: input.forwardPropagation.totalDelayMs,
            attempts: input.forwardPropagation.attempts,
          },
        } as never)},now()) RETURNING id::text`;
      const forwardVerificationId = forwardRows[0]!.id;
      const rollbackVerified = input.rollbackPropagation.verified;
      const rollbackRows = await tx<Array<{ id: string }>>`
        INSERT INTO rollbacks(deployment_id,status,reason,restore_state,rolled_back_at)
        VALUES(${deploymentId}::uuid,${rollbackVerified ? "completed" : "failed"},'Task #54 verification-failure restore',${tx.json({
          actionId: context.actionId,
          pageId: context.pageId,
          targetUrl: context.pageUrl,
          providerResource: preflight.resource,
          field: preflight.field,
          value: preflight.beforeValue,
          fingerprint: preflight.expectedBeforeFingerprint,
          preflightFingerprint: preflight.preflightFingerprint,
          mutationAccepted: input.rollbackMutationAccepted,
          failureCategory: input.rollbackFailureCategory,
          providerState: input.rollbackPropagation.providerState,
          storefront: input.rollbackPropagation.storefront,
          propagation: {
            version: "task54_bounded_rollback_propagation_verification_v1",
            attemptCount: input.rollbackPropagation.attemptCount,
            totalDelayMs: input.rollbackPropagation.totalDelayMs,
            attempts: input.rollbackPropagation.attempts,
          },
        } as never)},${rollbackVerified ? new Date().toISOString() : null}) RETURNING id::text`;
      const rollbackId = rollbackRows[0]!.id;
      const rollbackVerificationRows = await tx<Array<{ id: string }>>`
        INSERT INTO verifications(deployment_id,page_id,status,expected_state,actual_state,verified_at)
        VALUES(${deploymentId}::uuid,${context.pageId}::uuid,${rollbackVerified ? "verified" : "failed"},${tx.json({
          phase: "rollback",
          field: preflight.field,
          value: preflight.beforeValue,
          fingerprint: context.envelope.expectedCurrentState.fingerprint,
          providerResource: preflight.resource,
        } as never)},${tx.json({
          phase: "rollback",
          provider: input.rollbackPropagation.providerState,
          storefront: input.rollbackPropagation.storefront,
          providerVerified: input.rollbackPropagation.providerVerified,
          storefrontVerified: input.rollbackPropagation.storefrontVerified,
          rollbackMutationAccepted: input.rollbackMutationAccepted,
          rollbackFailureCategory: input.rollbackFailureCategory,
          propagation: {
            version: "task54_bounded_rollback_propagation_verification_v1",
            attemptCount: input.rollbackPropagation.attemptCount,
            totalDelayMs: input.rollbackPropagation.totalDelayMs,
            attempts: input.rollbackPropagation.attempts,
          },
        } as never)},now()) RETURNING id::text`;
      const rollbackVerificationId = rollbackVerificationRows[0]!.id;
      const lifecycleStage = rollbackVerified ? "production_apply_rolled_back_after_verification_failure" : "manual_intervention_required";
      await tx`UPDATE deployments SET status=${rollbackVerified ? "completed" : "failed"},metadata=metadata || ${tx.json({
        finalState: lifecycleStage,
        providerWriteStage: rollbackVerified ? "rolled_back_verified" : "rollback_verification_failed",
        publicWriteOccurred: true,
        forwardVerificationId,
        rollbackId,
        rollbackVerificationId,
        failureCategory: input.failureCategory,
      } as never)} WHERE id=${deploymentId}::uuid`;
      await tx`UPDATE actions SET status='failed',updated_at=now() WHERE id=${context.actionId}::uuid`;
      await tx`UPDATE action_plans SET status='failed',expected_outcome=${tx.json({
        ...expected,
        lifecycleStage,
        publicSiteWrites: false,
        automaticTransition: false,
        executionFoundation: {
          ...foundation,
          state: lifecycleStage,
          deploymentId,
          forwardVerificationId,
          rollbackId,
          rollbackVerificationId,
          verificationStatus: "failed",
          rollbackStatus: rollbackVerified ? "verified" : "failed",
          rollbackEligible: false,
          publicWriteOccurred: true,
          liveChangeVerified: false,
          measurementEligible: false,
          manualInterventionRequired: !rollbackVerified,
          failureCategory: input.failureCategory,
        },
      } as never)},updated_at=now() WHERE id=${context.actionPlanId}::uuid`;
      return { forwardVerificationId, rollbackId, rollbackVerificationId, rollbackVerified, lifecycleStage };
    });
  } finally {
    await sql.end({ timeout: 2 }).catch(() => undefined);
  }
}

async function safeProviderRead(credential: Task53ShopifyCredential, preflight: Task54Preflight, fetchImpl: typeof fetch) {
  try {
    return await readTask53ShopifyState({ credential, resource: preflight.resource, field: preflight.field, fetchImpl });
  } catch {
    return null;
  }
}

async function verifyPropagation(context: ActionContext, preflight: Task54Preflight, credential: Task53ShopifyCredential, fetchImpl: typeof fetch, expectedFingerprint: string, expectedValue: string | null) {
  return verifyTask53RollbackPropagation({
    expectedProviderFingerprint: expectedFingerprint,
    readProvider: () => safeProviderRead(credential, preflight, fetchImpl),
    verifyStorefront: () => verifyTask53Storefront({
      url: context.pageUrl,
      field: preflight.field,
      expectedValue,
      fetchImpl,
    }),
    delaysMs: TASK54_PROPAGATION_DELAYS_MS,
  });
}

export async function executeTask54PersistentApply(actionId: string, input: Task54ExecutionInput, fetchImpl?: typeof fetch) {
  const context = await loadActionContext(actionId);
  const credential = await loadTask53ShopifyCredential();
  const providerFetch = effectiveFetch(fetchImpl);
  const beforeState = await readTask53ShopifyState({ credential, resource: input.resource, field: context.envelope.target.field, fetchImpl: providerFetch });
  const base = buildBasePreflight(context, input.resource, beforeState, credential);
  const preflight = promoteTask53PreflightToTask54(base);
  if (!preflight.readyForPersistentApply) throw new Task54ExecutionError(preflight.blockers[0] ?? "task54_preflight_not_ready", 409);
  if (input.preflightFingerprint !== preflight.preflightFingerprint) throw new Task54ExecutionError("stale_task54_preflight_fingerprint", 409);
  if (input.confirmation !== task54RequiredConfirmation(actionId, preflight.preflightFingerprint)) {
    throw new Task54ExecutionError("explicit_task54_apply_and_verify_confirmation_required", 400);
  }

  const deploymentId = await reserveDeployment(context, preflight);
  let publicWriteOccurred = false;
  let providerWriteRequestId: string | null = null;

  try {
    const receipt = await mutateTask53ShopifyState({
      credential,
      resource: preflight.resource,
      field: preflight.field,
      value: preflight.afterValue,
      fetchImpl: providerFetch,
    });
    providerWriteRequestId = receipt.providerRequestId;
    if (!receipt.ok) {
      await finalizeNoWrite(context, deploymentId, receipt.errorCategory ?? "task54_shopify_mutation_rejected");
      throw new Task54ExecutionError(receipt.errorCategory ?? "task54_shopify_mutation_rejected", 502);
    }
    publicWriteOccurred = true;
    await patchDeployment(deploymentId, "active", {
      providerWriteStage: "accepted_pending_independent_verification",
      mutationReceipt: receipt,
      publicWriteOccurred: true,
    }, receipt.providerRequestId, true);
  } catch (error) {
    if (error instanceof Task54ExecutionError) throw error;
    const failureCategory = error instanceof Error ? error.message : "task54_shopify_mutation_uncertain";
    const observed = await safeProviderRead(credential, preflight, providerFetch);
    if (observed?.fingerprint === context.envelope.proposedState.fingerprint) {
      publicWriteOccurred = true;
      await patchDeployment(deploymentId, "active", {
        providerWriteStage: "accepted_observed_after_uncertain_response",
        publicWriteOccurred: true,
        forwardFailureCategory: failureCategory,
      }, null, true);
    } else if (observed?.fingerprint === context.envelope.expectedCurrentState.fingerprint) {
      await finalizeNoWrite(context, deploymentId, failureCategory);
      throw new Task54ExecutionError("task54_provider_write_failed_state_unchanged", 502);
    } else {
      await finalizeUncertainWrite(context, deploymentId, "task54_provider_write_outcome_uncertain");
      throw new Task54ExecutionError("task54_provider_write_outcome_uncertain", 502);
    }
  }

  const forwardPropagation = await verifyPropagation(
    context,
    preflight,
    credential,
    providerFetch,
    context.envelope.proposedState.fingerprint,
    preflight.afterValue,
  );
  const disposition = task54ForwardDisposition({ publicWriteOccurred, forwardVerified: forwardPropagation.verified });

  if (disposition === "keep_live") {
    try {
      const verificationId = await finalizeLiveSuccess(context, deploymentId, preflight, forwardPropagation, providerWriteRequestId);
      return {
        version: TASK54_VERSION,
        orchestrator: TASK54_ORCHESTRATOR,
        admin_api_version: TASK54_ADMIN_API_VERSION,
        action_id: actionId,
        action_plan_id: context.actionPlanId,
        deployment_id: deploymentId,
        forward_verification_id: verificationId,
        rollback_id: null,
        rollback_verification_id: null,
        provider_write_request_id: providerWriteRequestId,
        public_write_occurred: true,
        forward_verified: true,
        change_left_live: true,
        rollback_performed: false,
        measurement_eligible: true,
        propagation_attempts: forwardPropagation.attemptCount,
        propagation_total_delay_ms: forwardPropagation.totalDelayMs,
        manual_intervention_required: false,
        final_state: "production_change_verified_live" as const,
        provider_secret_exposed: false,
        automatic_transition: false,
      };
    } catch {
      // A verified provider/storefront change without durable success lineage is not allowed to remain live.
      // Fall through to the single deterministic rollback path.
    }
  }

  let rollbackMutationAccepted = false;
  let rollbackFailureCategory: string | null = null;
  try {
    const rollbackReceipt = await mutateTask53ShopifyState({
      credential,
      resource: preflight.resource,
      field: preflight.field,
      value: preflight.beforeValue,
      fetchImpl: providerFetch,
    });
    rollbackMutationAccepted = rollbackReceipt.ok;
    if (!rollbackReceipt.ok) rollbackFailureCategory = rollbackReceipt.errorCategory ?? "task54_shopify_rollback_rejected";
  } catch (error) {
    rollbackFailureCategory = error instanceof Error ? error.message : "task54_shopify_rollback_uncertain";
  }

  const rollbackPropagation = await verifyPropagation(
    context,
    preflight,
    credential,
    providerFetch,
    context.envelope.expectedCurrentState.fingerprint,
    preflight.beforeValue,
  );
  const failureCategory = forwardPropagation.verified
    ? "task54_success_audit_persistence_failed"
    : "task54_forward_verification_failed";
  const finalized = await finalizeRolledBack(context, deploymentId, preflight, {
    forwardPropagation,
    rollbackPropagation,
    rollbackMutationAccepted,
    rollbackFailureCategory,
    failureCategory,
  });

  return {
    version: TASK54_VERSION,
    orchestrator: TASK54_ORCHESTRATOR,
    admin_api_version: TASK54_ADMIN_API_VERSION,
    action_id: actionId,
    action_plan_id: context.actionPlanId,
    deployment_id: deploymentId,
    forward_verification_id: finalized.forwardVerificationId,
    rollback_id: finalized.rollbackId,
    rollback_verification_id: finalized.rollbackVerificationId,
    provider_write_request_id: providerWriteRequestId,
    public_write_occurred: true,
    forward_verified: forwardPropagation.verified,
    change_left_live: false,
    rollback_performed: true,
    rollback_verified: finalized.rollbackVerified,
    measurement_eligible: false,
    forward_propagation_attempts: forwardPropagation.attemptCount,
    rollback_propagation_attempts: rollbackPropagation.attemptCount,
    manual_intervention_required: !finalized.rollbackVerified,
    final_state: finalized.lifecycleStage,
    provider_secret_exposed: false,
    automatic_transition: false,
  };
}
