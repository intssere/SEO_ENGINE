import postgres from "postgres";

export type PerformanceFilters = { days: 7 | 28 | 90; country: string; device: "all" | "desktop" | "mobile" | "tablet" };
export type RuntimeReadiness = { state: "live" | "setup_required" | "unavailable"; message: string; siteId: string | null };
export type ProposalDecisionInput = { decision: "approved" | "rejected"; reason?: string | null; confirmation: string; requestRevision?: boolean };

export class ProposalDecisionError extends Error {
  constructor(readonly category: string, readonly status: number) {
    super(category);
    this.name = "ProposalDecisionError";
  }
}

function database() {
  const url = process.env.DATABASE_URL?.trim();
  return url ? postgres(url, { max: 1, prepare: false, connect_timeout: 5, idle_timeout: 2 }) : null;
}
export function parsePerformanceFilters(input: Record<string, unknown>): PerformanceFilters {
  const value = (key: string) => Array.isArray(input[key]) ? input[key][0] : input[key];
  const days = ([7, 28, 90] as const).includes(Number(value("days")) as 7 | 28 | 90) ? Number(value("days")) as 7 | 28 | 90 : 28;
  const country = typeof value("country") === "string" && /^[A-Za-z]{2,3}$/.test(value("country") as string) ? (value("country") as string).toUpperCase() : "all";
  const rawDevice = String(value("device") ?? "").toLowerCase();
  return { days, country, device: ["desktop", "mobile", "tablet"].includes(rawDevice) ? rawDevice as PerformanceFilters["device"] : "all" };
}
export async function getRuntimeReadiness(): Promise<RuntimeReadiness> {
  const sql = database();
  if (!sql) return { state: "unavailable", message: "Database connection is not configured.", siteId: null };
  try {
    const tables = await sql<{ sites: string | null; connections: string | null }[]>`SELECT to_regclass('public.sites')::text sites, to_regclass('public.connections')::text connections`;
    if (!tables[0]?.sites || !tables[0]?.connections) return { state: "setup_required", message: "Database schema has not been initialized.", siteId: null };
    const rows = await sql<{ id: string }[]>`SELECT id::text FROM sites WHERE lower(domain)='diamondshelf.us' AND is_active=true ORDER BY updated_at DESC LIMIT 1`;
    return rows[0] ? { state: "live", message: "Operational database ready.", siteId: rows[0].id } : { state: "setup_required", message: "Diamond Shelf site record has not been initialized.", siteId: null };
  } catch { return { state: "unavailable", message: "Operational database is currently unavailable.", siteId: null }; }
  finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
}
export async function loadPerformance(filters: PerformanceFilters) {
  const readiness = await getRuntimeReadiness();
  if (readiness.state !== "live" || !readiness.siteId) return { readiness, rows: [], summary: null };
  const sql = database()!;
  try {
    const rows = await sql`SELECT sq.query, sq.country, sq.device, SUM(sm.clicks)::int clicks, SUM(sm.impressions)::int impressions, CASE WHEN SUM(sm.impressions)>0 THEN SUM(sm.clicks)::float/SUM(sm.impressions) ELSE 0 END ctr, AVG(sm.average_position) position FROM search_metrics sm JOIN search_queries sq ON sq.id=sm.query_id WHERE sq.site_id=${readiness.siteId}::uuid AND sm.source='gsc' AND sm.metric_date >= current_date - ${filters.days - 1} AND (${filters.country}='all' OR upper(coalesce(sq.country,''))=${filters.country}) AND (${filters.device}='all' OR lower(coalesce(sq.device,''))=${filters.device}) GROUP BY sq.query,sq.country,sq.device ORDER BY impressions DESC, clicks DESC LIMIT 250`;
    const summary = rows.reduce((a, r) => ({ clicks: a.clicks + Number(r.clicks ?? 0), impressions: a.impressions + Number(r.impressions ?? 0) }), { clicks: 0, impressions: 0 });
    return { readiness, rows, summary };
  } catch { return { readiness: { state: "unavailable" as const, message: "Performance data could not be loaded.", siteId: readiness.siteId }, rows: [], summary: null }; }
  finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
}
export async function loadOperationalList(kind: "opportunities" | "actions" | "approvals" | "deployments" | "findings") {
  const readiness = await getRuntimeReadiness();
  if (readiness.state !== "live" || !readiness.siteId) return { readiness, rows: [] as Record<string, unknown>[] };
  const sql = database()!;
  try {
    const queries = {
      opportunities: sql`SELECT o.id::text,COALESCE(o.impact_estimate->>'title',o.opportunity_type) title,o.opportunity_type,o.score,o.status,o.rationale,cardinality(o.evidence_ids) evidence_count,p.url,sq.query,o.impact_estimate->>'riskClassification' risk_classification,o.impact_estimate->>'confidence' confidence,o.impact_estimate->'scoreComponents' score_components,o.impact_estimate->>'whyQualified' why_qualifies FROM opportunities o LEFT JOIN pages p ON p.id=o.page_id LEFT JOIN search_queries sq ON sq.id=o.query_id WHERE o.site_id=${readiness.siteId}::uuid AND o.status IN ('new','accepted','planned') AND o.impact_estimate->>'engine'='opportunity_engine_v1' ORDER BY o.score DESC,o.created_at DESC LIMIT 200`,
      actions: sql`
        SELECT ap.id::text,o.id::text AS opportunity_id,
          COALESCE(o.impact_estimate->>'title',o.opportunity_type) AS title,o.opportunity_type,p.url,p.path,sq.query,o.score,
          COALESCE((o.impact_estimate->>'confidence')::float,0) AS confidence,
          COALESCE(o.impact_estimate->>'riskClassification','unclassified') AS risk_classification,
          COALESCE(ap.expected_outcome->>'lifecycleStage','draft_dry_run') AS lifecycle,ap.status AS plan_status,
          COALESCE((ap.expected_outcome->>'dryRun')::boolean,true) AS dry_run,
          COALESCE((ap.expected_outcome->>'executionAuthorized')::boolean,false) AS execution_authorized,
          COALESCE((ap.expected_outcome->>'publicSiteWrites')::boolean,false) AS public_site_writes,
          COALESCE(ap.expected_outcome->'proposal'->>'actionType','evidence_review_required') AS action_type,
          COALESCE(ap.expected_outcome->'proposal'->>'field','unresolved') AS field,
          ap.expected_outcome->'proposal'->>'beforeValue' AS before_value,
          ap.expected_outcome->'proposal'->>'afterValue' AS after_value,
          ap.rationale,
          COALESCE(ap.expected_outcome->'proposal'->>'expectedBenefit','No expected benefit recorded.') AS expected_benefit,
          COALESCE(ap.expected_outcome->'proposal'->>'rollback','No rollback metadata recorded.') AS rollback,
          COALESCE(ap.expected_outcome->'proposal'->'supportingEvidenceIds','[]'::jsonb) AS evidence_ids,
          COALESCE(jsonb_array_length(ap.expected_outcome->'proposal'->'supportingEvidenceIds'),0)::int AS evidence_count,
          COALESCE((ap.expected_outcome->'proposal'->>'evidenceSufficient')::boolean,false) AS evidence_sufficient,
          COALESCE((ap.expected_outcome->'proposal'->>'boundedPilot')::boolean,true) AS bounded_pilot,
          COALESCE((ap.expected_outcome->'proposal'->>'wholeSiteCoverage')::boolean,false) AS whole_site_coverage,
          COALESCE(ap.expected_outcome->'qualityGate'->>'status','blocked') AS quality_status,
          COALESCE((ap.expected_outcome->'qualityGate'->>'score')::int,0) AS quality_score,
          COALESCE((ap.expected_outcome->'qualityGate'->>'approvalEligible')::boolean,false) AS quality_approval_eligible,
          COALESCE(ap.expected_outcome->'qualityGate'->'checks','[]'::jsonb) AS quality_checks,
          COALESCE(ap.expected_outcome->'qualityGate'->'blockingReasons','[]'::jsonb) AS quality_blocking_reasons,
          COALESCE(ap.expected_outcome->'qualityGate'->'warnings','[]'::jsonb) AS quality_warnings,
          COALESCE(ap.expected_outcome->'qualityGate'->'evidenceReferences','[]'::jsonb) AS quality_evidence_ids,
          latest_approval.decision,latest_approval.reason AS decision_reason,latest_approval.actor_id AS decided_by,
          latest_approval.decided_at,
          COALESCE((ap.expected_outcome->'reviewDecision'->>'revisionRequested')::boolean,false) AS revision_requested,
          ap.updated_at
        FROM action_plans ap JOIN opportunities o ON o.id=ap.opportunity_id
        LEFT JOIN pages p ON p.id=o.page_id LEFT JOIN search_queries sq ON sq.id=o.query_id
        LEFT JOIN LATERAL (SELECT decision,reason,actor_id,decided_at FROM approvals WHERE action_plan_id=ap.id ORDER BY decided_at DESC LIMIT 1) latest_approval ON true
        WHERE ap.site_id=${readiness.siteId}::uuid AND ap.expected_outcome->>'planner'='dry_run_action_planner_v1'
        ORDER BY (ap.expected_outcome->>'lifecycleStage'='approval_ready') DESC,o.score DESC,ap.updated_at DESC LIMIT 200`,
      approvals: sql`
        SELECT ap.id::text,o.id::text AS opportunity_id,
          COALESCE(o.impact_estimate->>'title',o.opportunity_type) AS title,o.opportunity_type,p.url,p.path,sq.query,o.score,
          COALESCE((o.impact_estimate->>'confidence')::float,0) AS confidence,
          COALESCE(o.impact_estimate->>'riskClassification','unclassified') AS risk_classification,
          COALESCE(ap.expected_outcome->>'lifecycleStage','draft_dry_run') AS lifecycle,ap.status AS plan_status,
          COALESCE((ap.expected_outcome->>'dryRun')::boolean,true) AS dry_run,
          COALESCE((ap.expected_outcome->>'executionAuthorized')::boolean,false) AS execution_authorized,
          COALESCE((ap.expected_outcome->>'publicSiteWrites')::boolean,false) AS public_site_writes,
          COALESCE(ap.expected_outcome->'proposal'->>'actionType','evidence_review_required') AS action_type,
          COALESCE(ap.expected_outcome->'proposal'->>'field','unresolved') AS field,
          ap.expected_outcome->'proposal'->>'beforeValue' AS before_value,
          ap.expected_outcome->'proposal'->>'afterValue' AS after_value,
          ap.rationale,
          COALESCE(ap.expected_outcome->'proposal'->>'expectedBenefit','No expected benefit recorded.') AS expected_benefit,
          COALESCE(ap.expected_outcome->'proposal'->>'rollback','No rollback metadata recorded.') AS rollback,
          COALESCE(ap.expected_outcome->'proposal'->'supportingEvidenceIds','[]'::jsonb) AS evidence_ids,
          COALESCE(jsonb_array_length(ap.expected_outcome->'proposal'->'supportingEvidenceIds'),0)::int AS evidence_count,
          COALESCE((ap.expected_outcome->'proposal'->>'evidenceSufficient')::boolean,false) AS evidence_sufficient,
          COALESCE((ap.expected_outcome->'proposal'->>'boundedPilot')::boolean,true) AS bounded_pilot,
          COALESCE((ap.expected_outcome->'proposal'->>'wholeSiteCoverage')::boolean,false) AS whole_site_coverage,
          COALESCE(ap.expected_outcome->'qualityGate'->>'status','blocked') AS quality_status,
          COALESCE((ap.expected_outcome->'qualityGate'->>'score')::int,0) AS quality_score,
          COALESCE((ap.expected_outcome->'qualityGate'->>'approvalEligible')::boolean,false) AS quality_approval_eligible,
          COALESCE(ap.expected_outcome->'qualityGate'->'checks','[]'::jsonb) AS quality_checks,
          COALESCE(ap.expected_outcome->'qualityGate'->'blockingReasons','[]'::jsonb) AS quality_blocking_reasons,
          COALESCE(ap.expected_outcome->'qualityGate'->'warnings','[]'::jsonb) AS quality_warnings,
          COALESCE(ap.expected_outcome->'qualityGate'->'evidenceReferences','[]'::jsonb) AS quality_evidence_ids,
          latest_approval.decision,latest_approval.reason AS decision_reason,latest_approval.actor_id AS decided_by,
          latest_approval.decided_at,
          COALESCE((ap.expected_outcome->'reviewDecision'->>'revisionRequested')::boolean,false) AS revision_requested,
          ap.updated_at
        FROM action_plans ap JOIN opportunities o ON o.id=ap.opportunity_id
        LEFT JOIN pages p ON p.id=o.page_id LEFT JOIN search_queries sq ON sq.id=o.query_id
        LEFT JOIN LATERAL (SELECT decision,reason,actor_id,decided_at FROM approvals WHERE action_plan_id=ap.id ORDER BY decided_at DESC LIMIT 1) latest_approval ON true
        WHERE ap.site_id=${readiness.siteId}::uuid
          AND ap.expected_outcome->>'planner'='dry_run_action_planner_v1'
          AND ap.expected_outcome->'qualityGate' IS NOT NULL
        ORDER BY (latest_approval.decision IS NULL) DESC,(ap.expected_outcome->>'lifecycleStage'='approval_ready') DESC,o.score DESC,ap.updated_at DESC LIMIT 200`,
      deployments: sql`SELECT d.id::text,d.provider,d.status,d.deployed_at,ap.risk_level,ap.rationale,v.status verification_status FROM deployments d JOIN action_plans ap ON ap.id=d.action_plan_id LEFT JOIN LATERAL (SELECT status FROM verifications WHERE deployment_id=d.id ORDER BY created_at DESC LIMIT 1) v ON true WHERE ap.site_id=${readiness.siteId}::uuid ORDER BY d.created_at DESC LIMIT 200`,
      findings: sql`SELECT f.id::text,f.title,f.category,f.severity,f.status,f.description,p.url FROM findings f LEFT JOIN pages p ON p.id=f.page_id WHERE f.site_id=${readiness.siteId}::uuid ORDER BY f.detected_at DESC LIMIT 200`,
    };
    return { readiness, rows: await queries[kind] };
  } catch { return { readiness: { state: "unavailable" as const, message: "Operational records could not be loaded.", siteId: readiness.siteId }, rows: [] as Record<string, unknown>[] }; }
  finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const boundedReason = (value: string | null | undefined) => value?.replace(/\s+/g, " ").trim().slice(0, 500) || null;

export type ProposalDecisionState = {
  status: string;
  opportunityStatus: string;
  expectedOutcome: Record<string, unknown>;
  priorDecisionCount: number;
};

export function validateProposalDecisionState(state: ProposalDecisionState, input: ProposalDecisionInput) {
  const expected = state.expectedOutcome;
  const quality = expected.qualityGate && typeof expected.qualityGate === "object" ? expected.qualityGate as Record<string, unknown> : null;
  const lifecycle = typeof expected.lifecycleStage === "string" ? expected.lifecycleStage : "draft_dry_run";
  const blockingReasons = Array.isArray(quality?.blockingReasons) ? quality.blockingReasons : [];
  const qualityEligible = quality?.approvalEligible === true && quality?.status !== "blocked" && Number(quality?.score ?? 0) >= 70 && blockingReasons.length === 0;
  if (expected.executionAuthorized !== false || expected.publicSiteWrites !== false || expected.dryRun !== true) throw new ProposalDecisionError("proposal_safety_invariant_failed", 409);
  if (!["new", "accepted", "planned"].includes(state.opportunityStatus) || lifecycle === "invalidated") throw new ProposalDecisionError("proposal_stale_or_ineligible", 409);
  if (state.priorDecisionCount > 0 || state.status !== "pending") throw new ProposalDecisionError("proposal_already_decided", 409);
  if (input.decision === "approved" && (lifecycle !== "approval_ready" || !qualityEligible)) throw new ProposalDecisionError("proposal_quality_blocked", 409);
  if (!quality) throw new ProposalDecisionError("proposal_quality_not_evaluated", 409);
  return { lifecycle, quality, qualityEligible };
}

export function buildProposalReviewDecision(input: ProposalDecisionInput, actorId: string, priorLifecycle: string, quality: Record<string, unknown>, decidedAt: string) {
  return {
    decision: input.decision,
    actorId,
    reason: boundedReason(input.reason),
    decidedAt,
    priorLifecycle,
    qualityScore: Number(quality.score ?? 0),
    qualityStatus: String(quality.status ?? "blocked"),
    revisionRequested: input.decision === "rejected" && input.requestRevision === true,
    executionAuthorized: false as const,
    publicSiteWrites: false as const,
  };
}

export async function decideProposalReview(planId: string, input: ProposalDecisionInput, actorId: string) {
  if (!uuidPattern.test(planId)) throw new ProposalDecisionError("proposal_not_found", 404);
  const expectedConfirmation = `${input.decision === "approved" ? "APPROVE" : "REJECT"}:${planId}`;
  if (input.confirmation !== expectedConfirmation) throw new ProposalDecisionError("explicit_confirmation_required", 400);
  const reason = boundedReason(input.reason);
  if (input.decision === "rejected" && (!reason || reason.length < 3)) throw new ProposalDecisionError("rejection_reason_required", 400);
  const readiness = await getRuntimeReadiness();
  if (readiness.state !== "live" || !readiness.siteId) throw new ProposalDecisionError("approval_runtime_unavailable", 503);
  const sql = database()!;
  try {
    return await sql.begin(async (tx) => {
      const rows = await tx<Array<{
        id: string;
        status: string;
        opportunityStatus: string;
        expectedOutcome: Record<string, unknown>;
      }>>`
        SELECT ap.id::text,ap.status,o.status AS "opportunityStatus",ap.expected_outcome AS "expectedOutcome"
        FROM action_plans ap JOIN opportunities o ON o.id=ap.opportunity_id
        WHERE ap.id=${planId}::uuid AND ap.site_id=${readiness.siteId}::uuid
        FOR UPDATE OF ap`;
      const row = rows[0];
      if (!row) throw new ProposalDecisionError("proposal_not_found", 404);
      const priorApprovals = await tx<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM approvals WHERE action_plan_id=${planId}::uuid`;
      const { lifecycle, quality } = validateProposalDecisionState({
        ...row,
        priorDecisionCount: Number(priorApprovals[0]?.count ?? 0),
      }, input);
      const safeActorId = actorId.replace(/[^A-Za-z0-9_.:@-]/g, "").slice(0, 120) || "same_origin_reviewer";
      const approvalRows = await tx<{ id: string; decidedAt: string }[]>`
        INSERT INTO approvals(action_plan_id,decision,actor_id,reason)
        VALUES(${planId}::uuid,${input.decision},${safeActorId},${reason})
        RETURNING id::text,decided_at::text AS "decidedAt"`;
      const lifecycleStage = input.decision === "approved" ? "approved_proposal" : "draft_dry_run";
      const reviewDecision = buildProposalReviewDecision(input, safeActorId, lifecycle, quality, approvalRows[0]!.decidedAt);
      await tx`
        UPDATE action_plans SET status='completed',
          expected_outcome=expected_outcome || ${tx.json({ lifecycleStage, reviewDecision, executionAuthorized: false, publicSiteWrites: false, automaticTransition: false })},
          updated_at=now()
        WHERE id=${planId}::uuid`;
      return {
        id: approvalRows[0]!.id,
        action_plan_id: planId,
        decision: input.decision,
        lifecycle: lifecycleStage,
        actor_id: safeActorId,
        reason,
        decided_at: approvalRows[0]!.decidedAt,
        revision_requested: reviewDecision.revisionRequested,
        execution_authorized: false,
        public_site_writes: false,
      };
    });
  } finally {
    await sql.end({ timeout: 2 }).catch(() => undefined);
  }
}

export async function loadOpportunities() {
  const readiness = await getRuntimeReadiness();
  if (readiness.state !== "live" || !readiness.siteId) return { readiness, rows: [] as Record<string, unknown>[], history: [] as Record<string, unknown>[] };
  const sql = database()!;
  const select = (active: boolean) => sql`
    SELECT o.id::text,
      COALESCE(o.impact_estimate->>'title',replace(o.opportunity_type,'_',' ')) AS title,
      o.opportunity_type,o.score,o.status,o.rationale,cardinality(o.evidence_ids)::int AS evidence_count,
      p.url,sq.query,
      COALESCE(o.impact_estimate->>'riskClassification','unclassified') AS risk_classification,
      COALESCE((o.impact_estimate->>'confidence')::float,0) AS confidence,
      COALESCE(o.impact_estimate->'scoreComponents','{}'::jsonb) AS score_components,
      COALESCE(o.impact_estimate->>'whyQualified',o.rationale) AS why_qualifies,
      COALESCE(ap.expected_outcome->>'recommendation',o.effort_estimate->>'recommendation','No dry-run recommendation available.') AS recommendation,
      CASE WHEN ap.expected_outcome->>'executionAuthorized'='true' THEN true ELSE false END AS execution_authorized,
      CASE WHEN ${active} THEN 'active' ELSE 'invalidated_or_superseded' END AS lifecycle,
      o.updated_at
    FROM opportunities o
    LEFT JOIN pages p ON p.id=o.page_id
    LEFT JOIN search_queries sq ON sq.id=o.query_id
    LEFT JOIN LATERAL (
      SELECT expected_outcome FROM action_plans WHERE opportunity_id=o.id ORDER BY created_at DESC LIMIT 1
    ) ap ON true
    WHERE o.site_id=${readiness.siteId}::uuid
      AND (${active} AND o.status IN ('new','accepted','planned') AND o.impact_estimate->>'engine'='opportunity_engine_v1'
        OR NOT ${active} AND o.status IN ('dismissed','completed') AND (o.impact_estimate->>'engine'='opportunity_engine_v1' OR o.opportunity_type='organic_ctr'))
    ORDER BY ${active} DESC,o.score DESC,o.updated_at DESC
    LIMIT 200`;
  try {
    const [rows, history] = await Promise.all([select(true), select(false)]);
    return { readiness, rows, history };
  } catch {
    return { readiness: { state: "unavailable" as const, message: "Opportunity records could not be loaded.", siteId: readiness.siteId }, rows: [] as Record<string, unknown>[], history: [] as Record<string, unknown>[] };
  } finally {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  }
}
export async function answerOperationalQuestion(question: string) {
  const q = question.toLowerCase();
  const readiness = await getRuntimeReadiness();
  if (q.includes("database") || q.includes("setup") || readiness.state !== "live") return readiness.message;
  if (q.includes("approval")) {
    const d = await loadOperationalList("approvals");
    const n = d.rows.filter((row) => row.decision == null && row.lifecycle === "approval_ready" && row.quality_approval_eligible === true).length;
    return n ? `${n} quality-gated proposal${n === 1 ? " is" : "s are"} awaiting a decision.` : "No quality-gated proposals are currently awaiting a decision.";
  }
  if (q.includes("opportun")) { const d = await loadOpportunities(); return d.rows.length ? d.rows.slice(0, 5).map((r, i) => `${i + 1}. ${String(r.title).replaceAll("_", " ")} — score ${Number(r.score ?? 0).toFixed(1)}`).join("\n") : "No currently valid persisted opportunities are available."; }
  return "I can answer read-only questions about approvals, opportunities, ranking queries, and runtime readiness.";
}