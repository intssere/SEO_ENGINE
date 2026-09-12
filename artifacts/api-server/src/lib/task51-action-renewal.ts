import { createHash } from "node:crypto";
import postgres from "postgres";
import {
  executionStateFingerprint,
  type AuthorizationEnvelope,
  type ExecutableField,
} from "./execution-foundation.js";
import {
  resolveTask53ShopifyResource,
  Task53ResolverError,
  type Task53ResolverResult,
} from "./task53-resource-resolver.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_TTL_MINUTES = 15;

export class ExecutableActionAuthorizationRenewalError extends Error {
  constructor(readonly category: string, readonly status: number) {
    super(category);
    this.name = "ExecutableActionAuthorizationRenewalError";
  }
}

export type RenewExecutableActionAuthorizationInput = {
  currentAuthorizationFingerprint: string;
  confirmation: string;
};

export type ExecutableActionRenewalEvaluationInput = {
  actionId: string;
  actionPlanId: string;
  actionStatus: string;
  lifecycle: string;
  executionAuthorized: boolean;
  planPublicSiteWrites: boolean;
  automaticTransition: boolean;
  foundationActionId: string | null;
  publicWriteOccurred: boolean;
  latestApprovalDecision: string | null;
  qualityEligible: boolean;
  riskClassification: string;
  evidenceIds: string[];
  persistedEvidenceCount: number;
  priorActionCount: number;
  priorDeploymentCount: number;
  otherActiveExecutionCount: number;
  currentEnvelope: AuthorizationEnvelope;
  providerCurrentValue: string | null;
  publicWriteGateEnabled: boolean;
  now: string;
  ttlMinutes?: number;
};

export type ExecutableActionRenewalEvaluation =
  | { ok: true; envelope: AuthorizationEnvelope; previousExpiresAt: string }
  | { ok: false; reason: string };

function database() {
  const url = process.env.DATABASE_URL?.trim();
  return url ? postgres(url, { max: 1, prepare: false, connect_timeout: 5, idle_timeout: 2 }) : null;
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
}

function sortedUnique(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort();
}

function qualityEligible(expected: Record<string, unknown>) {
  const quality = object(expected.qualityGate);
  const blocking = Array.isArray(quality.blockingReasons) ? quality.blockingReasons : [];
  return quality.approvalEligible === true && quality.status !== "blocked" && Number(quality.score ?? 0) >= 70 && blocking.length === 0;
}

function ttlMinutes(value?: number) {
  return Math.max(1, Math.min(value ?? DEFAULT_TTL_MINUTES, 60));
}

function hash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function authorizationEnvelope(value: unknown): AuthorizationEnvelope {
  const row = object(value);
  if (row.version !== "controlled_execution_foundation_v1" || typeof row.planId !== "string" || typeof row.envelopeFingerprint !== "string") {
    throw new ExecutableActionAuthorizationRenewalError("execution_authorization_envelope_missing", 409);
  }
  return row as unknown as AuthorizationEnvelope;
}

export function buildExecutableActionRenewalConfirmation(actionId: string, currentAuthorizationFingerprint: string) {
  return `RENEW_EXECUTABLE_ACTION_AUTHORIZATION:${actionId}:${currentAuthorizationFingerprint}`;
}

export function evaluateExecutableActionAuthorizationRenewal(
  input: ExecutableActionRenewalEvaluationInput,
): ExecutableActionRenewalEvaluation {
  const now = new Date(input.now);
  if (Number.isNaN(now.getTime())) return { ok: false, reason: "invalid_authorization_time" };
  if (!input.publicWriteGateEnabled) return { ok: false, reason: "public_site_write_gate_not_enabled" };
  if (input.actionStatus !== "pending") return { ok: false, reason: "action_not_pending" };
  if (
    input.lifecycle !== "executable_action" ||
    input.executionAuthorized !== true ||
    input.foundationActionId !== input.actionId
  ) {
    return { ok: false, reason: "action_not_execution_authorized" };
  }
  if (input.planPublicSiteWrites !== false || input.automaticTransition !== false || input.publicWriteOccurred !== false) {
    return { ok: false, reason: "execution_safety_invariant_failed" };
  }
  if (input.latestApprovalDecision !== "approved") return { ok: false, reason: "latest_approval_not_approved" };
  if (!input.qualityEligible) return { ok: false, reason: "proposal_quality_not_eligible" };
  if (["blocked", "high", "critical"].includes(input.riskClassification.toLowerCase())) {
    return { ok: false, reason: "risk_requires_human_block" };
  }
  const evidenceIds = sortedUnique(input.evidenceIds);
  if (evidenceIds.length < 2 || input.persistedEvidenceCount !== evidenceIds.length) {
    return { ok: false, reason: "supporting_evidence_incomplete" };
  }
  if (input.priorActionCount !== 1) return { ok: false, reason: "action_identity_not_unique" };
  if (input.priorDeploymentCount > 0) return { ok: false, reason: "duplicate_provider_execution_blocked" };
  if (input.otherActiveExecutionCount > 0) return { ok: false, reason: "another_site_execution_is_active" };

  const envelope = input.currentEnvelope;
  if (envelope.version !== "controlled_execution_foundation_v1" || envelope.planId !== input.actionPlanId) {
    return { ok: false, reason: "execution_identity_mismatch" };
  }
  if (
    envelope.authorization.executionAuthorized !== true ||
    envelope.authorization.providerWriteAllowed !== false ||
    envelope.authorization.publicSiteWrites !== false ||
    envelope.authorization.automaticTransition !== false
  ) {
    return { ok: false, reason: "authorization_envelope_safety_invariant_failed" };
  }
  if (sortedUnique(envelope.evidence.ids).join("|") !== evidenceIds.join("|")) {
    return { ok: false, reason: "authorization_evidence_mismatch" };
  }

  const expiresAt = new Date(envelope.authorization.expiresAt);
  if (Number.isNaN(expiresAt.getTime())) return { ok: false, reason: "authorization_timestamp_invalid" };
  if (now.getTime() < expiresAt.getTime()) return { ok: false, reason: "action_authorization_still_active" };

  const providerFingerprint = executionStateFingerprint(envelope.target.field, input.providerCurrentValue);
  if (providerFingerprint !== envelope.expectedCurrentState.fingerprint) {
    return { ok: false, reason: "provider_state_changed_since_authorization" };
  }

  const issuedAt = now.toISOString();
  const renewedExpiresAt = new Date(now.getTime() + ttlMinutes(input.ttlMinutes) * 60_000).toISOString();
  const envelopeBase = {
    version: envelope.version,
    planId: envelope.planId,
    target: envelope.target,
    actionType: envelope.actionType,
    expectedCurrentState: envelope.expectedCurrentState,
    proposedState: envelope.proposedState,
    evidence: envelope.evidence,
    risk: envelope.risk,
    rollback: envelope.rollback,
    authorization: {
      issuedAt,
      expiresAt: renewedExpiresAt,
      executionAuthorized: true as const,
      providerWriteAllowed: false as const,
      publicSiteWrites: false as const,
      automaticTransition: false as const,
    },
    verification: {
      ...envelope.verification,
      status: "pending" as const,
    },
  };

  return {
    ok: true,
    previousExpiresAt: envelope.authorization.expiresAt,
    envelope: {
      ...envelopeBase,
      envelopeFingerprint: hash(envelopeBase),
    },
  };
}

function providerValue(result: Task53ResolverResult, field: ExecutableField) {
  return field === "title" ? result.seo.title : result.seo.description;
}

export async function renewExecutableActionAuthorization(
  actionId: string,
  input: RenewExecutableActionAuthorizationInput,
  actorId: string,
) {
  if (!uuidPattern.test(actionId)) throw new ExecutableActionAuthorizationRenewalError("action_not_found", 404);
  const expectedConfirmation = buildExecutableActionRenewalConfirmation(actionId, input.currentAuthorizationFingerprint);
  if (!input.currentAuthorizationFingerprint || input.confirmation !== expectedConfirmation) {
    throw new ExecutableActionAuthorizationRenewalError("explicit_executable_action_renewal_confirmation_required", 400);
  }

  const sql = database();
  if (!sql) throw new ExecutableActionAuthorizationRenewalError("execution_runtime_unavailable", 503);

  try {
    const targetRows = await sql<Array<{
      actionPlanId: string;
      pageUrl: string | null;
      proposedChange: Record<string, unknown>;
    }>>`
      SELECT a.action_plan_id::text AS "actionPlanId",p.url AS "pageUrl",a.proposed_change AS "proposedChange"
      FROM actions a
      JOIN pages p ON p.id=a.page_id
      WHERE a.id=${actionId}::uuid
      LIMIT 1`;
    const target = targetRows[0];
    if (!target?.pageUrl) throw new ExecutableActionAuthorizationRenewalError("action_not_found", 404);
    const preReadEnvelope = authorizationEnvelope(object(target.proposedChange).authorizationEnvelope);
    if (preReadEnvelope.envelopeFingerprint !== input.currentAuthorizationFingerprint) {
      throw new ExecutableActionAuthorizationRenewalError("stale_authorization_fingerprint", 409);
    }

    let provider: Task53ResolverResult;
    try {
      provider = await resolveTask53ShopifyResource(target.pageUrl);
    } catch (error) {
      if (error instanceof Task53ResolverError) {
        throw new ExecutableActionAuthorizationRenewalError(error.category, error.status);
      }
      throw new ExecutableActionAuthorizationRenewalError("provider_state_revalidation_failed", 502);
    }

    return await sql.begin(async (tx) => {
      const rows = await tx<Array<{
        actionId: string;
        actionPlanId: string;
        actionStatus: string;
        pageId: string | null;
        pageUrl: string | null;
        siteDomain: string;
        proposedChange: Record<string, unknown>;
        expectedState: Record<string, unknown>;
        expectedOutcome: Record<string, unknown>;
        opportunityStatus: string;
        riskClassification: string;
        approvalDecision: string | null;
        priorActionCount: number;
        priorDeploymentCount: number;
        otherActiveExecutionCount: number;
      }>>`
        SELECT a.id::text AS "actionId",a.action_plan_id::text AS "actionPlanId",a.status AS "actionStatus",
          a.page_id::text AS "pageId",p.url AS "pageUrl",s.domain AS "siteDomain",
          a.proposed_change AS "proposedChange",a.expected_state AS "expectedState",ap.expected_outcome AS "expectedOutcome",
          o.status AS "opportunityStatus",
          COALESCE(o.impact_estimate->>'riskClassification',ap.risk_level,'blocked') AS "riskClassification",
          approval.decision AS "approvalDecision",
          (SELECT COUNT(*)::int FROM actions a2 WHERE a2.action_plan_id=ap.id) AS "priorActionCount",
          (SELECT COUNT(*)::int FROM deployments d WHERE d.action_plan_id=ap.id) AS "priorDeploymentCount",
          (SELECT COUNT(*)::int FROM deployments d2 JOIN action_plans ap2 ON ap2.id=d2.action_plan_id
            WHERE ap2.site_id=ap.site_id AND d2.status IN ('pending','active') AND d2.action_plan_id<>ap.id) AS "otherActiveExecutionCount"
        FROM actions a
        JOIN action_plans ap ON ap.id=a.action_plan_id
        JOIN opportunities o ON o.id=ap.opportunity_id
        JOIN sites s ON s.id=ap.site_id
        LEFT JOIN pages p ON p.id=a.page_id
        LEFT JOIN LATERAL (
          SELECT decision FROM approvals WHERE action_plan_id=ap.id ORDER BY decided_at DESC LIMIT 1
        ) approval ON true
        WHERE a.id=${actionId}::uuid
        FOR UPDATE OF a,ap`;
      const row = rows[0];
      if (!row || !row.pageId || !row.pageUrl) throw new ExecutableActionAuthorizationRenewalError("action_not_found", 404);
      if (row.siteDomain.toLowerCase() !== "diamondshelf.us") throw new ExecutableActionAuthorizationRenewalError("task53_site_not_allowed", 403);
      if (!["new", "accepted", "planned"].includes(row.opportunityStatus)) {
        throw new ExecutableActionAuthorizationRenewalError("proposal_stale_or_ineligible", 409);
      }

      const expected = object(row.expectedOutcome);
      const foundation = object(expected.executionFoundation);
      const proposal = object(expected.proposal);
      const envelope = authorizationEnvelope(object(row.proposedChange).authorizationEnvelope);
      if (envelope.envelopeFingerprint !== input.currentAuthorizationFingerprint) {
        throw new ExecutableActionAuthorizationRenewalError("stale_authorization_fingerprint", 409);
      }
      if (expected.planner !== "dry_run_action_planner_v1" || expected.dryRun !== true) {
        throw new ExecutableActionAuthorizationRenewalError("unsupported_action_plan", 409);
      }
      if (expected.proposalFingerprint !== envelope.evidence.proposalFingerprint) {
        throw new ExecutableActionAuthorizationRenewalError("stale_proposal_fingerprint", 409);
      }
      if (envelope.target.pageId !== row.pageId || envelope.target.url !== row.pageUrl || envelope.planId !== row.actionPlanId) {
        throw new ExecutableActionAuthorizationRenewalError("execution_identity_mismatch", 409);
      }
      if (provider.target_url !== row.pageUrl) {
        throw new ExecutableActionAuthorizationRenewalError("provider_target_identity_mismatch", 409);
      }

      const field = envelope.target.field;
      const beforeValue = typeof proposal.beforeValue === "string" ? proposal.beforeValue : proposal.beforeValue == null ? null : String(proposal.beforeValue);
      const afterValue = typeof proposal.afterValue === "string" ? proposal.afterValue : null;
      if (
        executionStateFingerprint(field, beforeValue) !== envelope.expectedCurrentState.fingerprint ||
        executionStateFingerprint(field, afterValue) !== envelope.proposedState.fingerprint
      ) {
        throw new ExecutableActionAuthorizationRenewalError("proposal_state_identity_mismatch", 409);
      }

      const evidenceIds = sortedUnique(stringArray(proposal.supportingEvidenceIds));
      const persistedRows = await tx<{ id: string }[]>`
        SELECT e.id::text
        FROM evidence e
        JOIN opportunities o2 ON e.id = ANY(o2.evidence_ids)
        WHERE o2.id=(SELECT opportunity_id FROM action_plans WHERE id=${row.actionPlanId}::uuid)
          AND e.site_id=(SELECT site_id FROM action_plans WHERE id=${row.actionPlanId}::uuid)`;
      const persistedSet = new Set(persistedRows.map((item) => item.id));
      const persistedEvidenceCount = evidenceIds.filter((id) => persistedSet.has(id)).length;
      const now = new Date().toISOString();
      const evaluation = evaluateExecutableActionAuthorizationRenewal({
        actionId: row.actionId,
        actionPlanId: row.actionPlanId,
        actionStatus: row.actionStatus,
        lifecycle: String(expected.lifecycleStage ?? ""),
        executionAuthorized: expected.executionAuthorized === true,
        planPublicSiteWrites: expected.publicSiteWrites === true,
        automaticTransition: expected.automaticTransition === true,
        foundationActionId: typeof foundation.actionId === "string" ? foundation.actionId : null,
        publicWriteOccurred: foundation.publicWriteOccurred === true,
        latestApprovalDecision: row.approvalDecision,
        qualityEligible: qualityEligible(expected),
        riskClassification: row.riskClassification,
        evidenceIds,
        persistedEvidenceCount,
        priorActionCount: Number(row.priorActionCount ?? 0),
        priorDeploymentCount: Number(row.priorDeploymentCount ?? 0),
        otherActiveExecutionCount: Number(row.otherActiveExecutionCount ?? 0),
        currentEnvelope: envelope,
        providerCurrentValue: providerValue(provider, field),
        publicWriteGateEnabled: process.env.PUBLIC_SITE_WRITES_ENABLED?.trim().toLowerCase() === "true",
        now,
      });
      if (!evaluation.ok) throw new ExecutableActionAuthorizationRenewalError(evaluation.reason, 409);

      const renewed = evaluation.envelope;
      const safeActorId = actorId.replace(/[^A-Za-z0-9_.:@-]/g, "").slice(0, 120) || "same_origin_reviewer";
      const approvalRows = await tx<{ id: string; decidedAt: string }[]>`
        INSERT INTO approvals(action_plan_id,decision,actor_id,reason)
        VALUES(${row.actionPlanId}::uuid,'approved',${safeActorId},'task51_executable_action_authorization_renewal')
        RETURNING id::text,decided_at::text AS "decidedAt"`;
      const approval = approvalRows[0]!;

      const proposedChange = {
        ...object(row.proposedChange),
        authorizationEnvelope: renewed,
      };
      const expectedState = {
        ...object(row.expectedState),
        before: renewed.expectedCurrentState,
        after: renewed.proposedState,
        verification: renewed.verification,
        rollback: renewed.rollback,
      };
      await tx`
        UPDATE actions
        SET proposed_change=${tx.json(proposedChange as never)},expected_state=${tx.json(expectedState as never)},updated_at=now()
        WHERE id=${row.actionId}::uuid`;

      const nextFoundation = {
        ...foundation,
        actionId: row.actionId,
        state: "authorized_internal_only",
        authorizationEnvelope: renewed,
        authorizationRenewalApprovalId: approval.id,
        authorizationRenewedAt: approval.decidedAt,
        verificationStatus: "pending",
        rollbackEligible: false,
        publicWriteOccurred: false,
      };
      await tx`
        UPDATE action_plans
        SET expected_outcome=expected_outcome || ${tx.json({
          lifecycleStage: "executable_action",
          executionAuthorized: true,
          publicSiteWrites: false,
          automaticTransition: false,
          executionFoundation: nextFoundation,
        } as never)},updated_at=now()
        WHERE id=${row.actionPlanId}::uuid`;

      return {
        renewal_approval_id: approval.id,
        action_id: row.actionId,
        action_plan_id: row.actionPlanId,
        lifecycle: "executable_action" as const,
        action_status: "pending" as const,
        previous_authorization_fingerprint: input.currentAuthorizationFingerprint,
        authorization_fingerprint: renewed.envelopeFingerprint,
        previous_authorization_expires_at: evaluation.previousExpiresAt,
        renewed_at: approval.decidedAt,
        authorization_expires_at: renewed.authorization.expiresAt,
        provider_state_fingerprint: executionStateFingerprint(field, providerValue(provider, field)),
        provider_request_id: provider.provider_request_id,
        provider_resource: provider.resource,
        execution_authorized: true,
        provider_write_allowed: false,
        public_site_writes: false,
        automatic_transition: false,
        public_write_occurred: false,
        mutation_performed: false,
      };
    });
  } finally {
    await sql.end({ timeout: 2 }).catch(() => undefined);
  }
}
