import postgres from "postgres";
import { executionStateFingerprint, type ExecutableField } from "./execution-foundation.js";
import { verifyTask53RollbackPropagation } from "./task53-rollback-propagation.js";
import { verifyTask53Storefront, type Task53ProviderState, type Task53Resource } from "./task53-production-pilot.js";
import { resolveTask53ShopifyResource } from "./task53-resource-resolver.js";

export const TASK53_ROLLBACK_RECONCILIATION_VERSION = "task53_post_rollback_propagation_reconciliation_v1" as const;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class Task53RollbackReconciliationError extends Error {
  constructor(public readonly category: string, public readonly status = 409) {
    super(category);
    this.name = "Task53RollbackReconciliationError";
  }
}

export function task53RollbackReconciliationConfirmation(actionId: string, deploymentId: string, rollbackId: string) {
  return `REVERIFY_TASK53_ROLLBACK:${actionId}:${deploymentId}:${rollbackId}`;
}

export function evaluateTask53RollbackReconciliationCandidate(input: {
  actionStatus: string;
  planStatus: string;
  deploymentStatus: string;
  lifecycleStage: unknown;
  foundationState: unknown;
  foundationDeploymentId: unknown;
  foundationRollbackId: unknown;
  verificationStatus: unknown;
  rollbackStatus: unknown;
  publicWriteOccurred: unknown;
  manualInterventionRequired: unknown;
  failureCategory: unknown;
  publicSiteWrites: unknown;
  automaticTransition: unknown;
  deploymentCount: number;
  reconciliationCount: number;
  actionId: string;
  deploymentId: string;
  rollbackId: string;
}) {
  if (input.actionStatus !== "failed" || input.planStatus !== "failed") return { ok: false as const, reason: "task53_reconciliation_state_not_failed" };
  if (input.deploymentStatus !== "completed") return { ok: false as const, reason: "task53_reconciliation_deployment_not_completed" };
  if (input.lifecycleStage !== "manual_intervention_required" || input.foundationState !== "manual_intervention_required") {
    return { ok: false as const, reason: "task53_reconciliation_manual_intervention_state_required" };
  }
  if (input.foundationDeploymentId !== input.deploymentId || input.foundationRollbackId !== input.rollbackId) {
    return { ok: false as const, reason: "task53_reconciliation_audit_identity_mismatch" };
  }
  if (input.verificationStatus !== "verified" || input.rollbackStatus !== "failed") {
    return { ok: false as const, reason: "task53_reconciliation_failure_not_rollback_only" };
  }
  if (input.publicWriteOccurred !== true || input.manualInterventionRequired !== true || input.failureCategory !== "rollback_verification_failed") {
    return { ok: false as const, reason: "task53_reconciliation_failure_not_eligible" };
  }
  if (input.publicSiteWrites !== false || input.automaticTransition !== false) {
    return { ok: false as const, reason: "task53_reconciliation_safety_invariant_failed" };
  }
  if (input.deploymentCount !== 1) return { ok: false as const, reason: "task53_reconciliation_requires_single_deployment" };
  if (input.reconciliationCount > 0) return { ok: false as const, reason: "task53_reconciliation_already_recorded" };
  return { ok: true as const };
}

function database() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Task53RollbackReconciliationError("execution_runtime_unavailable", 503);
  return postgres(url, { max: 1, prepare: false, connect_timeout: 5, idle_timeout: 2 });
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function executableField(value: unknown): ExecutableField {
  if (value !== "title" && value !== "meta_description") throw new Task53RollbackReconciliationError("task53_reconciliation_field_invalid");
  return value;
}

function task53Resource(value: unknown): Task53Resource {
  const row = object(value);
  const kind = row.kind;
  const gid = typeof row.gid === "string" ? row.gid.trim() : "";
  if ((kind !== "product" && kind !== "collection") || !/^gid:\/\/shopify\/(?:Product|Collection)\/[0-9]+$/.test(gid)) {
    throw new Task53RollbackReconciliationError("task53_reconciliation_resource_invalid");
  }
  if (kind === "product" && !gid.startsWith("gid://shopify/Product/")) throw new Task53RollbackReconciliationError("task53_reconciliation_resource_invalid");
  if (kind === "collection" && !gid.startsWith("gid://shopify/Collection/")) throw new Task53RollbackReconciliationError("task53_reconciliation_resource_invalid");
  return { kind, gid };
}

type ReconciliationContext = {
  actionId: string;
  actionPlanId: string;
  pageId: string;
  pageUrl: string;
  actionStatus: string;
  planStatus: string;
  deploymentId: string;
  deploymentStatus: string;
  deploymentMetadata: Record<string, unknown>;
  rollbackId: string;
  rollbackStatus: string;
  rollbackRestoreState: Record<string, unknown>;
  expectedOutcome: Record<string, unknown>;
  field: ExecutableField;
  beforeValue: string | null;
  expectedBeforeFingerprint: string;
  resource: Task53Resource;
  deploymentCount: number;
  reconciliationCount: number;
};

async function loadContext(actionId: string, deploymentId: string, rollbackId: string): Promise<ReconciliationContext> {
  if (![actionId, deploymentId, rollbackId].every((value) => uuidPattern.test(value))) {
    throw new Task53RollbackReconciliationError("task53_reconciliation_identity_invalid", 400);
  }
  const sql = database();
  try {
    const rows = await sql<Array<{
      actionId: string;
      actionPlanId: string;
      pageId: string | null;
      pageUrl: string | null;
      actionStatus: string;
      planStatus: string;
      expectedOutcome: Record<string, unknown>;
      deploymentId: string;
      deploymentStatus: string;
      deploymentMetadata: Record<string, unknown>;
      rollbackId: string;
      rollbackStatus: string;
      rollbackRestoreState: Record<string, unknown>;
      deploymentCount: number;
      reconciliationCount: number;
    }>>`
      SELECT a.id::text AS "actionId",a.action_plan_id::text AS "actionPlanId",a.page_id::text AS "pageId",p.url AS "pageUrl",
        a.status AS "actionStatus",ap.status AS "planStatus",ap.expected_outcome AS "expectedOutcome",
        d.id::text AS "deploymentId",d.status AS "deploymentStatus",d.metadata AS "deploymentMetadata",
        r.id::text AS "rollbackId",r.status AS "rollbackStatus",r.restore_state AS "rollbackRestoreState",
        (SELECT COUNT(*)::int FROM deployments d2 WHERE d2.action_plan_id=ap.id) AS "deploymentCount",
        (SELECT COUNT(*)::int FROM verifications v WHERE v.deployment_id=d.id AND v.expected_state->>'phase'='rollback_reverification') AS "reconciliationCount"
      FROM actions a
      JOIN action_plans ap ON ap.id=a.action_plan_id
      LEFT JOIN pages p ON p.id=a.page_id
      JOIN deployments d ON d.action_plan_id=ap.id AND d.id=${deploymentId}::uuid
      JOIN rollbacks r ON r.deployment_id=d.id AND r.id=${rollbackId}::uuid
      WHERE a.id=${actionId}::uuid
      LIMIT 1`;
    const row = rows[0];
    if (!row || !row.pageId || !row.pageUrl) throw new Task53RollbackReconciliationError("task53_reconciliation_record_not_found", 404);

    const expected = object(row.expectedOutcome);
    const foundation = object(expected.executionFoundation);
    const eligibility = evaluateTask53RollbackReconciliationCandidate({
      actionStatus: row.actionStatus,
      planStatus: row.planStatus,
      deploymentStatus: row.deploymentStatus,
      lifecycleStage: expected.lifecycleStage,
      foundationState: foundation.state,
      foundationDeploymentId: foundation.deploymentId,
      foundationRollbackId: foundation.rollbackId,
      verificationStatus: foundation.verificationStatus,
      rollbackStatus: foundation.rollbackStatus,
      publicWriteOccurred: foundation.publicWriteOccurred,
      manualInterventionRequired: foundation.manualInterventionRequired,
      failureCategory: foundation.failureCategory,
      publicSiteWrites: expected.publicSiteWrites,
      automaticTransition: expected.automaticTransition,
      deploymentCount: Number(row.deploymentCount ?? 0),
      reconciliationCount: Number(row.reconciliationCount ?? 0),
      actionId,
      deploymentId,
      rollbackId,
    });
    if (!eligibility.ok) throw new Task53RollbackReconciliationError(eligibility.reason);

    const metadata = object(row.deploymentMetadata);
    const restore = object(row.rollbackRestoreState);
    if (metadata.actionId !== actionId || restore.actionId !== actionId) throw new Task53RollbackReconciliationError("task53_reconciliation_action_identity_mismatch");
    const field = executableField(metadata.field);
    if (restore.field !== field) throw new Task53RollbackReconciliationError("task53_reconciliation_field_mismatch");
    const resource = task53Resource(metadata.providerResource);
    const restoreResource = task53Resource(restore.providerResource);
    if (resource.kind !== restoreResource.kind || resource.gid !== restoreResource.gid) throw new Task53RollbackReconciliationError("task53_reconciliation_resource_mismatch");
    const beforeValue = metadata.beforeValue == null ? null : String(metadata.beforeValue).replace(/\s+/g, " ").trim();
    const restoreValue = restore.value == null ? null : String(restore.value).replace(/\s+/g, " ").trim();
    if (beforeValue !== restoreValue) throw new Task53RollbackReconciliationError("task53_reconciliation_restore_value_mismatch");
    const expectedBeforeFingerprint = executionStateFingerprint(field, beforeValue);
    if (restore.fingerprint !== expectedBeforeFingerprint) throw new Task53RollbackReconciliationError("task53_reconciliation_restore_fingerprint_mismatch");

    return {
      actionId,
      actionPlanId: row.actionPlanId,
      pageId: row.pageId,
      pageUrl: row.pageUrl,
      actionStatus: row.actionStatus,
      planStatus: row.planStatus,
      deploymentId,
      deploymentStatus: row.deploymentStatus,
      deploymentMetadata: metadata,
      rollbackId,
      rollbackStatus: row.rollbackStatus,
      rollbackRestoreState: restore,
      expectedOutcome: expected,
      field,
      beforeValue,
      expectedBeforeFingerprint,
      resource,
      deploymentCount: Number(row.deploymentCount ?? 0),
      reconciliationCount: Number(row.reconciliationCount ?? 0),
    };
  } finally {
    await sql.end({ timeout: 2 }).catch(() => undefined);
  }
}

async function readProvider(context: ReconciliationContext): Promise<Task53ProviderState> {
  const resolved = await resolveTask53ShopifyResource(context.pageUrl);
  if (resolved.resource.kind !== context.resource.kind || resolved.resource.gid !== context.resource.gid) {
    throw new Task53RollbackReconciliationError("task53_reconciliation_provider_identity_mismatch", 409);
  }
  const value = context.field === "title" ? resolved.seo.title : resolved.seo.description;
  return {
    resource: context.resource,
    field: context.field,
    value,
    fingerprint: executionStateFingerprint(context.field, value),
    seoTitle: resolved.seo.title,
    seoDescription: resolved.seo.description,
    providerRequestId: resolved.provider_request_id,
  };
}

async function persistReconciliation(context: ReconciliationContext, propagation: Awaited<ReturnType<typeof verifyTask53RollbackPropagation>>) {
  const sql = database();
  try {
    return await sql.begin(async (tx) => {
      const rows = await tx<Array<{ actionStatus: string; planStatus: string; expectedOutcome: Record<string, unknown>; reconciliationCount: number }>>`
        SELECT a.status AS "actionStatus",ap.status AS "planStatus",ap.expected_outcome AS "expectedOutcome",
          (SELECT COUNT(*)::int FROM verifications v WHERE v.deployment_id=${context.deploymentId}::uuid AND v.expected_state->>'phase'='rollback_reverification') AS "reconciliationCount"
        FROM actions a JOIN action_plans ap ON ap.id=a.action_plan_id
        WHERE a.id=${context.actionId}::uuid AND ap.id=${context.actionPlanId}::uuid
        FOR UPDATE OF a,ap`;
      const row = rows[0];
      if (!row) throw new Task53RollbackReconciliationError("task53_reconciliation_record_not_found", 404);
      if (row.actionStatus !== "failed" || row.planStatus !== "failed" || Number(row.reconciliationCount ?? 0) > 0) {
        throw new Task53RollbackReconciliationError("task53_reconciliation_state_changed");
      }
      const expected = object(row.expectedOutcome);
      const foundation = object(expected.executionFoundation);
      if (expected.lifecycleStage !== "manual_intervention_required" || foundation.state !== "manual_intervention_required" || foundation.deploymentId !== context.deploymentId || foundation.rollbackId !== context.rollbackId) {
        throw new Task53RollbackReconciliationError("task53_reconciliation_state_changed");
      }

      const verificationRows = await tx<Array<{ id: string }>>`
        INSERT INTO verifications(deployment_id,page_id,status,expected_state,actual_state,verified_at)
        VALUES(${context.deploymentId}::uuid,${context.pageId}::uuid,'verified',${tx.json({
          phase: "rollback_reverification",
          field: context.field,
          value: context.beforeValue,
          fingerprint: context.expectedBeforeFingerprint,
          providerResource: context.resource,
          reconciliationOfRollbackId: context.rollbackId,
        } as never)},${tx.json({
          phase: "rollback_reverification",
          provider: propagation.providerState,
          storefront: propagation.storefront,
          propagation: {
            version: "task53_bounded_rollback_propagation_reverification_v1",
            attemptCount: propagation.attemptCount,
            totalDelayMs: propagation.totalDelayMs,
            attempts: propagation.attempts,
          },
          providerMutationPerformed: false,
        } as never)},now()) RETURNING id::text`;
      const verificationId = verificationRows[0]!.id;

      const rollbackRows = await tx<Array<{ id: string }>>`
        INSERT INTO rollbacks(deployment_id,status,reason,restore_state,rolled_back_at)
        VALUES(${context.deploymentId}::uuid,'completed','Task #53 post-rollback propagation reconciliation',${tx.json({
          actionId: context.actionId,
          pageId: context.pageId,
          targetUrl: context.pageUrl,
          providerResource: context.resource,
          field: context.field,
          value: context.beforeValue,
          fingerprint: context.expectedBeforeFingerprint,
          reconciliationOfRollbackId: context.rollbackId,
          reconciliationVerificationId: verificationId,
          providerMutationPerformed: false,
        } as never)},now()) RETURNING id::text`;
      const reconciliationRollbackId = rollbackRows[0]!.id;
      const reconciledAt = new Date().toISOString();
      const reconciliationAudit = {
        version: TASK53_ROLLBACK_RECONCILIATION_VERSION,
        originalRollbackId: context.rollbackId,
        verificationId,
        reconciliationRollbackId,
        attemptCount: propagation.attemptCount,
        totalDelayMs: propagation.totalDelayMs,
        providerMutationPerformed: false,
        reconciledAt,
      };

      await tx`UPDATE deployments SET metadata=metadata || ${tx.json({ rollbackReconciliation: reconciliationAudit } as never)} WHERE id=${context.deploymentId}::uuid`;
      await tx`UPDATE actions SET status='completed',updated_at=now() WHERE id=${context.actionId}::uuid`;
      await tx`UPDATE action_plans SET status='completed',expected_outcome=${tx.json({
        ...expected,
        lifecycleStage: "production_pilot_verified_and_rolled_back",
        publicSiteWrites: false,
        automaticTransition: false,
        executionFoundation: {
          ...foundation,
          state: "production_pilot_verified_and_rolled_back",
          rollbackStatus: "verified_after_propagation",
          manualInterventionRequired: false,
          originalFailureCategory: foundation.failureCategory,
          failureCategory: null,
          rollbackReconciliation: reconciliationAudit,
        },
      } as never)},updated_at=now() WHERE id=${context.actionPlanId}::uuid`;

      return { verificationId, reconciliationRollbackId, reconciledAt, reconciliationAudit };
    });
  } finally {
    await sql.end({ timeout: 2 }).catch(() => undefined);
  }
}

export async function reconcileTask53RollbackPropagation(actionId: string, input: {
  deploymentId: string;
  rollbackId: string;
  confirmation: string;
}) {
  const deploymentId = input.deploymentId.trim();
  const rollbackId = input.rollbackId.trim();
  const requiredConfirmation = task53RollbackReconciliationConfirmation(actionId, deploymentId, rollbackId);
  if (input.confirmation !== requiredConfirmation) throw new Task53RollbackReconciliationError("explicit_task53_rollback_reconciliation_confirmation_required", 400);
  const context = await loadContext(actionId, deploymentId, rollbackId);
  const propagation = await verifyTask53RollbackPropagation({
    expectedProviderFingerprint: context.expectedBeforeFingerprint,
    readProvider: () => readProvider(context),
    verifyStorefront: () => verifyTask53Storefront({
      url: context.pageUrl,
      field: context.field,
      expectedValue: context.beforeValue,
    }),
  });

  if (!propagation.verified) {
    return {
      version: TASK53_ROLLBACK_RECONCILIATION_VERSION,
      actionId,
      deploymentId,
      rollbackId,
      reconciled: false,
      providerVerified: propagation.providerVerified,
      storefrontVerified: propagation.storefrontVerified,
      attemptCount: propagation.attemptCount,
      totalDelayMs: propagation.totalDelayMs,
      providerMutationPerformed: false,
      databaseMutationPerformed: false,
      manualInterventionRequired: true,
      requiredConfirmation,
    };
  }

  const persisted = await persistReconciliation(context, propagation);
  return {
    version: TASK53_ROLLBACK_RECONCILIATION_VERSION,
    actionId,
    deploymentId,
    rollbackId,
    reconciled: true,
    providerVerified: true,
    storefrontVerified: true,
    attemptCount: propagation.attemptCount,
    totalDelayMs: propagation.totalDelayMs,
    providerMutationPerformed: false,
    databaseMutationPerformed: true,
    manualInterventionRequired: false,
    finalState: "production_pilot_verified_and_rolled_back" as const,
    verificationId: persisted.verificationId,
    reconciliationRollbackId: persisted.reconciliationRollbackId,
    reconciledAt: persisted.reconciledAt,
    requiredConfirmation,
  };
}
