import postgres from "postgres";
import { evaluateExecutionAuthorization, type AuthorizationEnvelope } from "./execution-foundation.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ExecutionAuthorizationError extends Error {
  constructor(readonly category: string, readonly status: number) {
    super(category);
    this.name = "ExecutionAuthorizationError";
  }
}

export type AuthorizeExecutionInput = {
  proposalFingerprint: string;
  confirmation: string;
};

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

function qualityEligible(expected: Record<string, unknown>) {
  const quality = object(expected.qualityGate);
  const blocking = Array.isArray(quality.blockingReasons) ? quality.blockingReasons : [];
  return quality.approvalEligible === true && quality.status !== "blocked" && Number(quality.score ?? 0) >= 70 && blocking.length === 0;
}

function currentFieldValue(field: string, snapshot: { title: string | null; metaDescription: string | null }) {
  if (field === "title") return snapshot.title;
  if (field === "meta_description") return snapshot.metaDescription;
  return null;
}

export async function authorizeApprovedProposal(planId: string, input: AuthorizeExecutionInput) {
  if (!uuidPattern.test(planId)) throw new ExecutionAuthorizationError("proposal_not_found", 404);
  if (!input.proposalFingerprint || input.confirmation !== `AUTHORIZE:${planId}:${input.proposalFingerprint}`) {
    throw new ExecutionAuthorizationError("explicit_execution_confirmation_required", 400);
  }
  const sql = database();
  if (!sql) throw new ExecutionAuthorizationError("execution_runtime_unavailable", 503);
  try {
    return await sql.begin(async (tx) => {
      const rows = await tx<Array<{
        id: string;
        siteId: string;
        status: string;
        expectedOutcome: Record<string, unknown>;
        opportunityStatus: string;
        riskClassification: string;
        pageId: string | null;
        pageUrl: string | null;
        title: string | null;
        metaDescription: string | null;
        approvalDecision: string | null;
        approvedAt: string | null;
      }>>`
        SELECT ap.id::text,
          ap.site_id::text AS "siteId",
          ap.status,
          ap.expected_outcome AS "expectedOutcome",
          o.status AS "opportunityStatus",
          COALESCE(o.impact_estimate->>'riskClassification',ap.risk_level,'blocked') AS "riskClassification",
          p.id::text AS "pageId",p.url AS "pageUrl",
          ps.title,ps.meta_description AS "metaDescription",
          approval.decision AS "approvalDecision",approval.decided_at::text AS "approvedAt"
        FROM action_plans ap
        JOIN opportunities o ON o.id=ap.opportunity_id
        LEFT JOIN pages p ON p.id=o.page_id
        LEFT JOIN LATERAL (
          SELECT title,meta_description FROM page_snapshots WHERE page_id=p.id ORDER BY observed_at DESC LIMIT 1
        ) ps ON true
        LEFT JOIN LATERAL (
          SELECT decision,decided_at FROM approvals WHERE action_plan_id=ap.id ORDER BY decided_at DESC LIMIT 1
        ) approval ON true
        WHERE ap.id=${planId}::uuid
        FOR UPDATE OF ap`;
      const row = rows[0];
      if (!row) throw new ExecutionAuthorizationError("proposal_not_found", 404);
      if (!["new", "accepted", "planned"].includes(row.opportunityStatus)) throw new ExecutionAuthorizationError("proposal_stale_or_ineligible", 409);

      const expected = object(row.expectedOutcome);
      if (expected.planner !== "dry_run_action_planner_v1") throw new ExecutionAuthorizationError("unsupported_action_plan", 409);
      if (expected.proposalFingerprint !== input.proposalFingerprint) throw new ExecutionAuthorizationError("stale_proposal_fingerprint", 409);
      if (expected.publicSiteWrites !== false || expected.automaticTransition !== false) throw new ExecutionAuthorizationError("proposal_safety_invariant_failed", 409);
      const proposal = object(expected.proposal);
      const evidenceIds = [...new Set(stringArray(proposal.supportingEvidenceIds))].sort();

      const persistedRows = await tx<{ id: string }[]>`
        SELECT e.id::text
        FROM evidence e
        JOIN opportunities o ON e.id = ANY(o.evidence_ids)
        WHERE o.id=(SELECT opportunity_id FROM action_plans WHERE id=${planId}::uuid)
          AND e.site_id=${row.siteId}::uuid`;
      const persistedSet = new Set(persistedRows.map((item) => item.id));
      const persistedEvidenceCount = evidenceIds.filter((id) => persistedSet.has(id)).length;
      const priorActions = await tx<{ count: number }[]>`SELECT COUNT(*)::int count FROM actions WHERE action_plan_id=${planId}::uuid`;
      const field = String(proposal.field ?? "");
      const result = evaluateExecutionAuthorization({
        planId,
        pageId: row.pageId ?? "",
        pageUrl: row.pageUrl ?? "",
        actionType: String(proposal.actionType ?? ""),
        field,
        beforeValue: typeof proposal.beforeValue === "string" ? proposal.beforeValue : proposal.beforeValue == null ? null : String(proposal.beforeValue),
        afterValue: typeof proposal.afterValue === "string" ? proposal.afterValue : null,
        currentValue: currentFieldValue(field, row),
        supportingEvidenceIds: evidenceIds,
        persistedEvidenceCount,
        proposalFingerprint: input.proposalFingerprint,
        lifecycle: String(expected.lifecycleStage ?? ""),
        approvalDecision: row.approvalDecision,
        approvedAt: row.approvedAt,
        qualityEligible: qualityEligible(expected),
        riskClassification: row.riskClassification,
        priorActionCount: Number(priorActions[0]?.count ?? 0),
        publicSiteWritesEnabled: process.env.PUBLIC_SITE_WRITES_ENABLED === "true",
        now: new Date().toISOString(),
      });
      if (!result.ok) throw new ExecutionAuthorizationError(result.reason, 409);
      const envelope: AuthorizationEnvelope = result.envelope;

      const actionRows = await tx<{ id: string; createdAt: string }[]>`
        INSERT INTO actions(action_plan_id,page_id,action_type,status,target,proposed_change,expected_state)
        VALUES(
          ${planId}::uuid,
          ${envelope.target.pageId}::uuid,
          ${envelope.actionType},
          'pending',
          ${tx.json({ url: envelope.target.url, field: envelope.target.field, pageId: envelope.target.pageId } as never)},
          ${tx.json({ value: envelope.proposedState.value, fingerprint: envelope.proposedState.fingerprint, authorizationEnvelope: envelope } as never)},
          ${tx.json({ before: envelope.expectedCurrentState, after: envelope.proposedState, verification: envelope.verification, rollback: envelope.rollback } as never)}
        ) RETURNING id::text,created_at::text AS "createdAt"`;
      const action = actionRows[0]!;
      const nextExpected = {
        lifecycleStage: "executable_action",
        executionAuthorized: true,
        publicSiteWrites: false,
        automaticTransition: false,
        executionFoundation: {
          actionId: action.id,
          state: "authorized_internal_only",
          authorizationEnvelope: envelope,
          verificationStatus: "pending",
          rollbackEligible: false,
          publicWriteOccurred: false,
        },
      };
      await tx`UPDATE action_plans SET expected_outcome=expected_outcome || ${tx.json(nextExpected as never)},updated_at=now() WHERE id=${planId}::uuid`;
      return {
        action_id: action.id,
        action_plan_id: planId,
        lifecycle: "executable_action" as const,
        action_status: "pending" as const,
        authorization_fingerprint: envelope.envelopeFingerprint,
        authorization_expires_at: envelope.authorization.expiresAt,
        verification_status: "pending" as const,
        rollback_eligible: false,
        execution_authorized: true,
        provider_write_allowed: false,
        public_site_writes: false,
        public_write_occurred: false,
        created_at: action.createdAt,
      };
    });
  } finally {
    await sql.end({ timeout: 2 }).catch(() => undefined);
  }
}

export async function loadExecutionFoundation() {
  const sql = database();
  if (!sql) return { readiness: { state: "unavailable", message: "Database connection is not configured." }, rows: [] };
  try {
    const rows = await sql`
      SELECT a.id::text AS action_id,a.action_plan_id::text AS action_plan_id,a.action_type,a.status AS action_status,
        a.target,a.proposed_change,a.expected_state,a.created_at,a.updated_at,
        COALESCE(ap.expected_outcome->>'lifecycleStage','approved_proposal') AS lifecycle,
        COALESCE((ap.expected_outcome->>'executionAuthorized')::boolean,false) AS execution_authorized,
        COALESCE((ap.expected_outcome->>'publicSiteWrites')::boolean,false) AS public_site_writes,
        COALESCE(ap.expected_outcome->'executionFoundation'->>'verificationStatus','pending') AS verification_status,
        COALESCE((ap.expected_outcome->'executionFoundation'->>'rollbackEligible')::boolean,false) AS rollback_eligible,
        COALESCE((ap.expected_outcome->'executionFoundation'->>'publicWriteOccurred')::boolean,false) AS public_write_occurred
      FROM actions a JOIN action_plans ap ON ap.id=a.action_plan_id
      ORDER BY a.created_at DESC LIMIT 200`;
    return { readiness: { state: "live", message: "Execution foundation records loaded." }, rows };
  } catch {
    return { readiness: { state: "unavailable", message: "Execution foundation records could not be loaded." }, rows: [] };
  } finally {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  }
}
