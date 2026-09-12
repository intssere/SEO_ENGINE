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
export const TASK53_ADMIN_API_VERSION = "2026-07" as const;

export class Task53ExecutionV2Error extends Error {
  constructor(public readonly category: string, public readonly status: number) {
    super(category);
    this.name = "Task53ExecutionV2Error";
  }
}

type ActionContext = {
  actionId: string;
  actionPlanId: string;
  actionStatus: string;
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

export type Task53ExecutionV2Input = {
  resource: Task53Resource;
  preflightFingerprint: string;
  confirmation: string;
};

function database() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Task53ExecutionV2Error("execution_runtime_unavailable", 503);
  return postgres(url, { max: 1, prepare: false, connect_timeout: 5, idle_timeout: 2 });
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function authorizationEnvelope(value: unknown): AuthorizationEnvelope {
  const row = object(value);
  if (row.version !== "controlled_execution_foundation_v1" || typeof row.planId !== "string" || typeof row.envelopeFingerprint !== "string") {
    throw new Task53ExecutionV2Error("execution_authorization_envelope_missing", 409);
  }
  return row as unknown as AuthorizationEnvelope;
}

function effectiveFetch(fetchImpl?: typeof fetch): typeof fetch {
  const base = fetchImpl ?? fetch;
  return (async (input: URL | RequestInfo, init?: RequestInit) => {
    if (typeof input === "string" && input.includes("/admin/api/2025-10/graphql.json")) {
      return base(input.replace("/admin/api/2025-10/graphql.json", `/admin/api/${TASK53_ADMIN_API_VERSION}/graphql.json`), init);
    }
    if (input instanceof URL && input.pathname.includes("/admin/api/2025-10/graphql.json")) {
      const url = new URL(input);
      url.pathname = url.pathname.replace("/admin/api/2025-10/graphql.json", `/admin/api/${TASK53_ADMIN_API_VERSION}/graphql.json`);
      return base(url, init);
    }
    return base(input, init);
  }) as typeof fetch;
}

async function loadActionContext(actionId: string): Promise<ActionContext> {
  if (!uuidPattern.test(actionId)) throw new Task53ExecutionV2Error("action_not_found", 404);
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
    if (!row || !row.pageId || !row.pageUrl) throw new Task53ExecutionV2Error("action_not_found", 404);
    const envelope = authorizationEnvelope(object(row.proposedChange).authorizationEnvelope);
    const expected = object(row.expectedOutcome);
    const foundation = object(expected.executionFoundation);
    if (envelope.planId !== row.actionPlanId || envelope.target.pageId !== row.pageId || envelope.target.url !== row.pageUrl) throw new Task53ExecutionV2Error("execution_identity_mismatch", 409);
    if (expected.lifecycleStage !== "executable_action" || expected.executionAuthorized !== true || foundation.actionId !== actionId) throw new Task53ExecutionV2Error("action_not_execution_authorized", 409);
    if (expected.publicSiteWrites !== false || expected.automaticTransition !== false) throw new Task53ExecutionV2Error("execution_safety_invariant_failed", 409);
    if (row.approvalDecision !== "approved" || !row.approvedAt) throw new Task53ExecutionV2Error("latest_approval_not_approved", 409);
    if (row.actionStatus !== "pending") throw new Task53ExecutionV2Error("action_not_pending", 409);
    if (row.siteDomain.toLowerCase() !== "diamondshelf.us") throw new Task53ExecutionV2Error("task53_site_not_allowed", 403);
    return {
      actionId: row.actionId,
      actionPlanId: row.actionPlanId,
      actionStatus: row.actionStatus,
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

function buildPreflight(context: ActionContext, resource: Task53Resource, providerState: Task53ProviderState, credential: Task53ShopifyCredential) {
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

export async function getTask53PreflightV2(actionId: string, resource: Task53Resource, fetchImpl?: typeof fetch) {
  const context = await loadActionContext(actionId);
  const credential = await loadTask53ShopifyCredential();
  const providerState = await readTask53ShopifyState({ credential, resource, field: context.envelope.target.field, fetchImpl: effectiveFetch(fetchImpl) });
  const preflight = buildPreflight(context, resource, providerState, credential);
  return {
    ...preflight,
    adminApiVersion: TASK53_ADMIN_API_VERSION,
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
      const rows = await tx<Array<{ actionStatus: string; expectedOutcome: Record<string, unknown>; deploymentCount: number; activeCount: number }>>`
        SELECT a.status AS "actionStatus",ap.expected_outcome AS "expectedOutcome",
          (SELECT COUNT(*)::int FROM deployments d WHERE d.action_plan_id=ap.id) AS "deploymentCount",
          (SELECT COUNT(*)::int FROM deployments d2 JOIN action_plans ap2 ON ap2.id=d2.action_plan_id
            WHERE ap2.site_id=ap.site_id AND d2.status IN ('pending','active') AND d2.action_plan_id<>ap.id) AS "activeCount"
        FROM actions a JOIN action_plans ap ON ap.id=a.action_plan_id
        WHERE a.id=${context.actionId}::uuid FOR UPDATE OF a,ap`;
      const row = rows[0];
      if (!row || row.actionStatus !== "pending") throw new Task53ExecutionV2Error("action_not_pending", 409);
      if (Number(row.deploymentCount ?? 0) > 0) throw new Task53ExecutionV2Error("duplicate_provider_execution_blocked", 409);
      if (Number(row.activeCount ?? 0) > 0) throw new Task53ExecutionV2Error("another_site_execution_is_active", 409);
      const expected = object(row.expectedOutcome);
      const foundation = object(expected.executionFoundation);
      if (expected.lifecycleStage !== "executable_action" || expected.executionAuthorized !== true || foundation.actionId !== context.actionId) throw new Task53ExecutionV2Error("action_not_execution_authorized", 409);
      if (expected.publicSiteWrites !== false || expected.automaticTransition !== false) throw new Task53ExecutionV2Error("execution_safety_invariant_failed", 409);
      const inserted = await tx<Array<{ id: string }>>`
        INSERT INTO deployments(action_plan_id,provider,status,metadata)
        VALUES(${context.actionPlanId}::uuid,'shopify','active',${tx.json({
          version: "controlled_single_action_production_execution_pilot_v1",
          orchestrator: "task53_store_v2",
          adminApiVersion: TASK53_ADMIN_API_VERSION,
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
          providerWriteStage: "reserved",
          publicWriteOccurred: false,
        } as never)}) RETURNING id::text`;
      const deploymentId = inserted[0]!.id;
      await tx`UPDATE actions SET status='active',updated_at=now() WHERE id=${context.actionId}::uuid`;
      await tx`UPDATE action_plans SET expected_outcome=expected_outcome || ${tx.json({
        lifecycleStage: "production_pilot_active",
        publicSiteWrites: false,
        automaticTransition: false,
        executionFoundation: {
          ...foundation,
          state: "provider_write_reserved",
          deploymentId,
          verificationStatus: "pending",
          rollbackEligible: false,
          publicWriteOccurred: false,
          task53PreflightFingerprint: preflight.preflightFingerprint,
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
  } finally { await sql.end({ timeout: 2 }).catch(() => undefined); }
}

async function persistVerification(deploymentId: string, pageId: string, phase: "forward" | "rollback", verified: boolean, expected: Record<string, unknown>, actual: Record<string, unknown>) {
  const sql = database();
  try {
    const rows = await sql<Array<{ id: string }>>`
      INSERT INTO verifications(deployment_id,page_id,status,expected_state,actual_state,verified_at)
      VALUES(${deploymentId}::uuid,${pageId}::uuid,${verified ? "verified" : "failed"},${sql.json({ phase, ...expected } as never)},${sql.json({ phase, ...actual } as never)},now()) RETURNING id::text`;
    return rows[0]!.id;
  } finally { await sql.end({ timeout: 2 }).catch(() => undefined); }
}

async function persistRollback(deploymentId: string, context: ActionContext, preflight: Task53Preflight, verified: boolean, details: Record<string, unknown>) {
  const sql = database();
  try {
    const rows = await sql<Array<{ id: string }>>`
      INSERT INTO rollbacks(deployment_id,status,reason,restore_state,rolled_back_at)
      VALUES(${deploymentId}::uuid,${verified ? "completed" : "failed"},'Task #53 explicit execute-and-rollback pilot restore',${sql.json({
        actionId: context.actionId,
        pageId: context.pageId,
        targetUrl: context.pageUrl,
        providerResource: preflight.resource,
        field: preflight.field,
        value: preflight.beforeValue,
        fingerprint: preflight.expectedBeforeFingerprint,
        preflightFingerprint: preflight.preflightFingerprint,
        ...details,
      } as never)},${verified ? new Date().toISOString() : null}) RETURNING id::text`;
    return rows[0]!.id;
  } finally { await sql.end({ timeout: 2 }).catch(() => undefined); }
}

async function finalize(context: ActionContext, input: {
  deploymentId: string;
  forwardVerificationId: string | null;
  rollbackId: string | null;
  rollbackVerificationId: string | null;
  forwardVerified: boolean;
  rollbackVerified: boolean;
  publicWriteOccurred: boolean;
  failureCategory: string | null;
}) {
  const sql = database();
  try {
    await sql.begin(async (tx) => {
      const rows = await tx<Array<{ expectedOutcome: Record<string, unknown> }>>`
        SELECT expected_outcome AS "expectedOutcome" FROM action_plans WHERE id=${context.actionPlanId}::uuid FOR UPDATE`;
      const expected = object(rows[0]?.expectedOutcome);
      const foundation = object(expected.executionFoundation);
      const manualInterventionRequired = input.publicWriteOccurred && !input.rollbackVerified;
      const lifecycleStage = manualInterventionRequired
        ? "manual_intervention_required"
        : input.forwardVerified && input.rollbackVerified
          ? "production_pilot_verified_and_rolled_back"
          : input.rollbackVerified
            ? "production_pilot_rolled_back_with_forward_verification_failure"
            : "production_pilot_failed_without_confirmed_write";
      const successfulPilot = input.forwardVerified && input.rollbackVerified;
      await tx`UPDATE actions SET status=${successfulPilot ? "completed" : "failed"},updated_at=now() WHERE id=${context.actionId}::uuid`;
      await tx`UPDATE action_plans SET status=${successfulPilot ? "completed" : "failed"},expected_outcome=${tx.json({
        ...expected,
        lifecycleStage,
        publicSiteWrites: false,
        automaticTransition: false,
        executionFoundation: {
          ...foundation,
          state: lifecycleStage,
          deploymentId: input.deploymentId,
          forwardVerificationId: input.forwardVerificationId,
          rollbackId: input.rollbackId,
          rollbackVerificationId: input.rollbackVerificationId,
          verificationStatus: input.forwardVerified ? "verified" : "failed",
          rollbackStatus: input.rollbackVerified ? "verified" : input.publicWriteOccurred ? "failed" : "not_required",
          rollbackEligible: false,
          publicWriteOccurred: input.publicWriteOccurred,
          manualInterventionRequired,
          failureCategory: input.failureCategory,
        },
      } as never)},updated_at=now() WHERE id=${context.actionPlanId}::uuid`;
    });
  } finally { await sql.end({ timeout: 2 }).catch(() => undefined); }
}

async function safeProviderRead(credential: Task53ShopifyCredential, preflight: Task53Preflight, fetchImpl: typeof fetch) {
  try {
    return await readTask53ShopifyState({ credential, resource: preflight.resource, field: preflight.field, fetchImpl });
  } catch {
    return null;
  }
}

export async function executeTask53ProductionPilotV2(actionId: string, input: Task53ExecutionV2Input, fetchImpl?: typeof fetch) {
  const context = await loadActionContext(actionId);
  const credential = await loadTask53ShopifyCredential();
  const providerFetch = effectiveFetch(fetchImpl);
  const beforeState = await readTask53ShopifyState({ credential, resource: input.resource, field: context.envelope.target.field, fetchImpl: providerFetch });
  const preflight = buildPreflight(context, input.resource, beforeState, credential);
  if (!preflight.readyForLivePilot) throw new Task53ExecutionV2Error(preflight.blockers[0] ?? "task53_preflight_not_ready", 409);
  if (input.preflightFingerprint !== preflight.preflightFingerprint) throw new Task53ExecutionV2Error("stale_task53_preflight_fingerprint", 409);
  if (input.confirmation !== task53RequiredConfirmation(actionId, preflight.preflightFingerprint)) throw new Task53ExecutionV2Error("explicit_task53_execute_and_rollback_confirmation_required", 400);

  const deploymentId = await reserveDeployment(context, preflight);
  let publicWriteOccurred = false;
  let forwardProviderState: Task53ProviderState | null = null;
  let forwardMutationRequestId: string | null = null;
  let forwardFailureCategory: string | null = null;

  try {
    const receipt = await mutateTask53ShopifyState({ credential, resource: preflight.resource, field: preflight.field, value: preflight.afterValue, fetchImpl: providerFetch });
    forwardMutationRequestId = receipt.providerRequestId;
    if (!receipt.ok) {
      await patchDeployment(deploymentId, "failed", { providerWriteStage: "rejected", mutationReceipt: receipt, publicWriteOccurred: false }, receipt.providerRequestId);
      await finalize(context, { deploymentId, forwardVerificationId: null, rollbackId: null, rollbackVerificationId: null, forwardVerified: false, rollbackVerified: false, publicWriteOccurred: false, failureCategory: receipt.errorCategory });
      throw new Task53ExecutionV2Error(receipt.errorCategory ?? "shopify_mutation_rejected", 502);
    }
    publicWriteOccurred = true;
    await patchDeployment(deploymentId, "completed", { providerWriteStage: "accepted", mutationReceipt: receipt, publicWriteOccurred: true }, receipt.providerRequestId, true);
  } catch (error) {
    if (error instanceof Task53ExecutionV2Error) throw error;
    forwardFailureCategory = error instanceof Error ? error.message : "shopify_mutation_uncertain";
    const observed = await safeProviderRead(credential, preflight, providerFetch);
    if (observed?.fingerprint === context.envelope.proposedState.fingerprint) {
      publicWriteOccurred = true;
      forwardProviderState = observed;
      await patchDeployment(deploymentId, "completed", { providerWriteStage: "accepted_observed_after_uncertain_response", publicWriteOccurred: true, forwardFailureCategory }, null, true);
    } else if (observed?.fingerprint === context.envelope.expectedCurrentState.fingerprint) {
      await patchDeployment(deploymentId, "failed", { providerWriteStage: "failed_observed_unchanged", publicWriteOccurred: false, forwardFailureCategory });
      await finalize(context, { deploymentId, forwardVerificationId: null, rollbackId: null, rollbackVerificationId: null, forwardVerified: false, rollbackVerified: false, publicWriteOccurred: false, failureCategory: forwardFailureCategory });
      throw new Task53ExecutionV2Error("provider_write_failed_state_unchanged", 502);
    } else {
      await patchDeployment(deploymentId, "failed", { providerWriteStage: "uncertain_manual_intervention", publicWriteOccurred: false, forwardFailureCategory });
      await finalize(context, { deploymentId, forwardVerificationId: null, rollbackId: null, rollbackVerificationId: null, forwardVerified: false, rollbackVerified: false, publicWriteOccurred: false, failureCategory: "provider_write_outcome_uncertain" });
      throw new Task53ExecutionV2Error("provider_write_outcome_uncertain", 502);
    }
  }

  if (!forwardProviderState) forwardProviderState = await safeProviderRead(credential, preflight, providerFetch);
  const forwardStorefront = await verifyTask53Storefront({ url: context.pageUrl, field: preflight.field, expectedValue: preflight.afterValue, fetchImpl: providerFetch });
  const forwardProviderVerified = forwardProviderState?.fingerprint === context.envelope.proposedState.fingerprint;
  const forwardVerified = Boolean(forwardProviderVerified && forwardStorefront.ok);

  let rollbackMutationAccepted = false;
  let rollbackFailureCategory: string | null = null;
  try {
    const rollbackReceipt = await mutateTask53ShopifyState({ credential, resource: preflight.resource, field: preflight.field, value: preflight.beforeValue, fetchImpl: providerFetch });
    rollbackMutationAccepted = rollbackReceipt.ok;
    if (!rollbackReceipt.ok) rollbackFailureCategory = rollbackReceipt.errorCategory ?? "shopify_rollback_rejected";
  } catch (error) {
    rollbackFailureCategory = error instanceof Error ? error.message : "shopify_rollback_uncertain";
  }
  const rollbackProviderState = await safeProviderRead(credential, preflight, providerFetch);
  const rollbackStorefront = await verifyTask53Storefront({ url: context.pageUrl, field: preflight.field, expectedValue: preflight.beforeValue, fetchImpl: providerFetch });
  const rollbackProviderVerified = rollbackProviderState?.fingerprint === context.envelope.expectedCurrentState.fingerprint;
  const rollbackVerified = Boolean(rollbackProviderVerified && rollbackStorefront.ok);

  let forwardVerificationId: string | null = null;
  let rollbackId: string | null = null;
  let rollbackVerificationId: string | null = null;
  let auditFailureCategory: string | null = null;
  try {
    forwardVerificationId = await persistVerification(deploymentId, context.pageId, "forward", forwardVerified, {
      field: preflight.field,
      value: preflight.afterValue,
      fingerprint: context.envelope.proposedState.fingerprint,
      providerResource: preflight.resource,
    }, {
      provider: forwardProviderState,
      storefront: forwardStorefront,
      providerVerified: forwardProviderVerified,
      storefrontVerified: forwardStorefront.ok,
      auditFingerprint: task53AuditFingerprint({ provider: forwardProviderState, storefront: forwardStorefront }),
    });
    rollbackId = await persistRollback(deploymentId, context, preflight, rollbackVerified, {
      mutationAccepted: rollbackMutationAccepted,
      failureCategory: rollbackFailureCategory,
      providerState: rollbackProviderState,
      storefront: rollbackStorefront,
    });
    rollbackVerificationId = await persistVerification(deploymentId, context.pageId, "rollback", rollbackVerified, {
      field: preflight.field,
      value: preflight.beforeValue,
      fingerprint: context.envelope.expectedCurrentState.fingerprint,
      providerResource: preflight.resource,
    }, {
      provider: rollbackProviderState,
      storefront: rollbackStorefront,
      providerVerified: rollbackProviderVerified,
      storefrontVerified: rollbackStorefront.ok,
      rollbackMutationAccepted,
      rollbackFailureCategory,
      auditFingerprint: task53AuditFingerprint({ provider: rollbackProviderState, storefront: rollbackStorefront, rollbackMutationAccepted, rollbackFailureCategory }),
    });
  } catch (error) {
    auditFailureCategory = error instanceof Error ? error.message : "task53_audit_persistence_failed";
  }

  const failureCategory = !rollbackVerified
    ? rollbackFailureCategory ?? "rollback_verification_failed"
    : !forwardVerified
      ? forwardFailureCategory ?? "forward_verification_failed"
      : auditFailureCategory;
  await finalize(context, {
    deploymentId,
    forwardVerificationId,
    rollbackId,
    rollbackVerificationId,
    forwardVerified,
    rollbackVerified,
    publicWriteOccurred,
    failureCategory,
  });

  return {
    version: "controlled_single_action_production_execution_pilot_v1" as const,
    orchestrator: "task53_store_v2" as const,
    admin_api_version: TASK53_ADMIN_API_VERSION,
    action_id: actionId,
    action_plan_id: context.actionPlanId,
    deployment_id: deploymentId,
    forward_verification_id: forwardVerificationId,
    rollback_id: rollbackId,
    rollback_verification_id: rollbackVerificationId,
    provider_write_request_id: forwardMutationRequestId,
    public_write_occurred: publicWriteOccurred,
    forward_verified: forwardVerified,
    rollback_verified: rollbackVerified,
    audit_persisted: auditFailureCategory === null,
    manual_intervention_required: publicWriteOccurred && !rollbackVerified,
    final_state: publicWriteOccurred && !rollbackVerified
      ? "manual_intervention_required"
      : forwardVerified && rollbackVerified
        ? "production_pilot_verified_and_rolled_back"
        : rollbackVerified
          ? "production_pilot_rolled_back_with_forward_verification_failure"
          : "production_pilot_failed_without_confirmed_write",
    provider_secret_exposed: false,
    automatic_transition: false,
  };
}
