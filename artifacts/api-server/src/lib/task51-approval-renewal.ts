import postgres from "postgres";
import {
  evaluateExecutionAuthorization,
  type AuthorizationEnvelope,
  type ExecutionAuthorizationInput,
} from "./execution-foundation.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_TTL_MINUTES = 15;

export class ApprovalWindowRenewalError extends Error {
  constructor(readonly category: string, readonly status: number) {
    super(category);
    this.name = "ApprovalWindowRenewalError";
  }
}

export type RenewApprovalWindowInput = {
  proposalFingerprint: string;
  confirmation: string;
};

export type ApprovalWindowRenewalEvaluation =
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

function ttlMinutes(input: ExecutionAuthorizationInput) {
  return Math.max(1, Math.min(input.ttlMinutes ?? DEFAULT_TTL_MINUTES, 60));
}

export function evaluateApprovalWindowRenewal(input: ExecutionAuthorizationInput): ApprovalWindowRenewalEvaluation {
  const current = evaluateExecutionAuthorization(input);
  if (current.ok) return { ok: false, reason: "authorization_window_still_active" };
  if (current.reason !== "authorization_window_expired") return current;

  const approvedAt = new Date(input.approvedAt ?? "");
  if (Number.isNaN(approvedAt.getTime())) return { ok: false, reason: "approval_timestamp_invalid" };
  const previousExpiresAt = new Date(approvedAt.getTime() + ttlMinutes(input) * 60_000).toISOString();
  const renewed = evaluateExecutionAuthorization({ ...input, approvedAt: input.now });
  if (!renewed.ok) return renewed;
  return { ok: true, envelope: renewed.envelope, previousExpiresAt };
}

export function buildApprovalWindowRenewalConfirmation(planId: string, proposalFingerprint: string) {
  return `RENEW_AUTHORIZATION_WINDOW:${planId}:${proposalFingerprint}`;
}

export async function renewApprovedProposalAuthorizationWindow(
  planId: string,
  input: RenewApprovalWindowInput,
  actorId: string,
) {
  if (!uuidPattern.test(planId)) throw new ApprovalWindowRenewalError("proposal_not_found", 404);
  const expectedConfirmation = buildApprovalWindowRenewalConfirmation(planId, input.proposalFingerprint);
  if (!input.proposalFingerprint || input.confirmation !== expectedConfirmation) {
    throw new ApprovalWindowRenewalError("explicit_renewal_confirmation_required", 400);
  }

  const sql = database();
  if (!sql) throw new ApprovalWindowRenewalError("execution_runtime_unavailable", 503);
  try {
    return await sql.begin(async (tx) => {
      const rows = await tx<Array<{
        id: string;
        siteId: string;
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
      if (!row) throw new ApprovalWindowRenewalError("proposal_not_found", 404);
      if (!["new", "accepted", "planned"].includes(row.opportunityStatus)) {
        throw new ApprovalWindowRenewalError("proposal_stale_or_ineligible", 409);
      }

      const expected = object(row.expectedOutcome);
      if (expected.planner !== "dry_run_action_planner_v1") throw new ApprovalWindowRenewalError("unsupported_action_plan", 409);
      if (expected.proposalFingerprint !== input.proposalFingerprint) throw new ApprovalWindowRenewalError("stale_proposal_fingerprint", 409);
      if (
        expected.executionAuthorized !== false ||
        expected.publicSiteWrites !== false ||
        expected.automaticTransition !== false ||
        expected.dryRun !== true
      ) {
        throw new ApprovalWindowRenewalError("proposal_safety_invariant_failed", 409);
      }

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
      const now = new Date().toISOString();
      const evaluation = evaluateApprovalWindowRenewal({
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
        now,
      });
      if (!evaluation.ok) throw new ApprovalWindowRenewalError(evaluation.reason, 409);

      const safeActorId = actorId.replace(/[^A-Za-z0-9_.:@-]/g, "").slice(0, 120) || "same_origin_reviewer";
      const approvalRows = await tx<{ id: string; decidedAt: string }[]>`
        INSERT INTO approvals(action_plan_id,decision,actor_id,reason)
        VALUES(${planId}::uuid,'approved',${safeActorId},'task51_authorization_window_renewal')
        RETURNING id::text,decided_at::text AS "decidedAt"`;
      const approval = approvalRows[0]!;
      const expiresAt = new Date(new Date(approval.decidedAt).getTime() + DEFAULT_TTL_MINUTES * 60_000).toISOString();

      return {
        renewal_approval_id: approval.id,
        action_plan_id: planId,
        decision: "approved" as const,
        lifecycle: "approved_proposal" as const,
        proposal_fingerprint: input.proposalFingerprint,
        previous_authorization_expires_at: evaluation.previousExpiresAt,
        renewed_at: approval.decidedAt,
        authorization_expires_at: expiresAt,
        execution_authorized: false,
        provider_write_allowed: false,
        public_site_writes: false,
        automatic_transition: false,
      };
    });
  } finally {
    await sql.end({ timeout: 2 }).catch(() => undefined);
  }
}
