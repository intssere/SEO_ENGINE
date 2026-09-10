import postgres from "postgres";

export type DashboardState = "live" | "unavailable";

export interface DashboardMetric {
  label: string;
  value: string;
  delta: string;
}

export interface DashboardOpportunity {
  title: string;
  score: string;
  evidence: string;
  risk: string;
  state: string;
}

export interface DashboardActivity {
  title: string;
  detail: string;
  result: string;
  tone: "verified" | "ready" | "approval" | "normal";
}

export interface DashboardSnapshot {
  state: DashboardState;
  reason: string | null;
  siteName: string;
  domain: string;
  generatedAt: string;
  dataFreshness: string;
  stale: boolean;
  approvalsPending: number;
  metrics: DashboardMetric[];
  engine: {
    pagesAnalyzed: number;
    opportunities: number;
    actionsPrepared: number;
    executed: number;
    verified: number;
    regressions: number;
  };
  opportunities: DashboardOpportunity[];
  activity: DashboardActivity[];
  verification: {
    verified: number;
    total: number;
    pending: number;
    rolledBack: number;
    regressions: number;
  };
  aiVisibility: {
    citationRate: string;
    brandMentionRate: string;
    citationShare: string;
  };
  learning: {
    signalCount: number;
    averageConfidence: string;
  };
  impact: {
    verifiedOptimizations: number;
    completedExperiments: number;
    rollbacks: number;
    regressionsDetected: number;
  };
}
export interface DashboardFilters { days: 7 | 28 | 90; country: string; device: "all" | "desktop" | "mobile" | "tablet" }

function unavailable(reason: string): DashboardSnapshot {
  return {
    state: "unavailable",
    reason,
    siteName: "Diamond Shelf",
    domain: "diamondshelf.us",
    generatedAt: new Date().toISOString(),
    dataFreshness: "No live dataset",
    stale: true,
    approvalsPending: 0,
    metrics: [
      { label: "Organic clicks", value: "—", delta: "No live GSC data" },
      { label: "Impressions", value: "—", delta: "No live GSC data" },
      { label: "Top-10 keywords", value: "—", delta: "No live GSC data" },
      { label: "Average position", value: "—", delta: "No live GSC data" },
      { label: "AI citation rate", value: "—", delta: "No live AI observations" },
      { label: "Open findings", value: "—", delta: "No live baseline" },
    ],
    engine: { pagesAnalyzed: 0, opportunities: 0, actionsPrepared: 0, executed: 0, verified: 0, regressions: 0 },
    opportunities: [],
    activity: [],
    verification: { verified: 0, total: 0, pending: 0, rolledBack: 0, regressions: 0 },
    aiVisibility: { citationRate: "—", brandMentionRate: "—", citationShare: "—" },
    learning: { signalCount: 0, averageConfidence: "—" },
    impact: { verifiedOptimizations: 0, completedExperiments: 0, rollbacks: 0, regressionsDetected: 0 },
  };
}

function n(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function integer(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function delta(current: number, previous: number, suffix = "%"): string {
  if (previous <= 0) return current > 0 ? "New live data" : "No change";
  const change = ((current - previous) / previous) * 100;
  return `${change >= 0 ? "+" : ""}${change.toFixed(1)}${suffix}`;
}

export async function loadDashboardData(filters: DashboardFilters = { days: 28, country: "all", device: "all" }): Promise<DashboardSnapshot> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) return unavailable("DATABASE_URL is not configured. Preview fixtures are disabled.");

  const sql = postgres(databaseUrl, { max: 1, prepare: false, connect_timeout: 5, idle_timeout: 2 });
  try {
    const sites = await sql<{ id: string; name: string; domain: string }[]>`
      SELECT id::text, name, domain
      FROM sites
      WHERE lower(domain) = 'diamondshelf.us' AND is_active = true
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    const site = sites[0];
    if (!site) return unavailable("Diamond Shelf is not present in the production database.");

    const [searchRows, topTenRows, findingsRows, engineRows, approvalsRows, verificationRows, aiRows, learningRows, impactRows, opportunityRows, freshnessRows] = await Promise.all([
      sql`
        SELECT
           COALESCE(SUM(clicks) FILTER (WHERE metric_date >= current_date - (${filters.days - 1}::int)), 0)::bigint AS current_clicks,
           COALESCE(SUM(clicks) FILTER (WHERE metric_date BETWEEN current_date - (${filters.days * 2 - 1}::int) AND current_date - (${filters.days}::int)), 0)::bigint AS previous_clicks,
           COALESCE(SUM(impressions) FILTER (WHERE metric_date >= current_date - (${filters.days - 1}::int)), 0)::bigint AS current_impressions,
           COALESCE(SUM(impressions) FILTER (WHERE metric_date BETWEEN current_date - (${filters.days * 2 - 1}::int) AND current_date - (${filters.days}::int)), 0)::bigint AS previous_impressions,
           AVG(average_position) FILTER (WHERE metric_date >= current_date - (${filters.days - 1}::int) AND average_position IS NOT NULL) AS current_position,
           AVG(average_position) FILTER (WHERE metric_date BETWEEN current_date - (${filters.days * 2 - 1}::int) AND current_date - (${filters.days}::int) AND average_position IS NOT NULL) AS previous_position
        FROM search_metrics sm
        JOIN search_queries sq ON sq.id = sm.query_id
         WHERE sq.site_id = ${site.id}::uuid AND sm.source = 'gsc'
           AND sm.metric_date >= current_date - (${filters.days * 2 - 1}::int)
           AND (${filters.country} = 'all' OR upper(coalesce(sq.country,'')) = ${filters.country})
           AND (${filters.device} = 'all' OR lower(coalesce(sq.device,'')) = ${filters.device})
      `,
      sql`
        SELECT COUNT(*)::int AS top_ten
        FROM (
          SELECT sm.query_id
          FROM search_metrics sm
          JOIN search_queries sq ON sq.id = sm.query_id
         WHERE sq.site_id = ${site.id}::uuid
            AND sm.source = 'gsc'
            AND sm.metric_date >= current_date - (${filters.days - 1}::int)
            AND (${filters.country} = 'all' OR upper(coalesce(sq.country,'')) = ${filters.country})
            AND (${filters.device} = 'all' OR lower(coalesce(sq.device,'')) = ${filters.device})
            AND sm.average_position IS NOT NULL
          GROUP BY sm.query_id
          HAVING AVG(sm.average_position) <= 10
        ) ranked
      `,
      sql`SELECT COUNT(*)::int AS open_findings FROM findings WHERE site_id = ${site.id}::uuid AND status = 'open'`,
      sql`
        SELECT
          COALESCE((SELECT pages_fetched FROM crawl_runs WHERE site_id = ${site.id}::uuid AND status = 'completed' ORDER BY completed_at DESC NULLS LAST, created_at DESC LIMIT 1), 0)::int AS pages_analyzed,
          (SELECT COUNT(*) FROM opportunities WHERE site_id = ${site.id}::uuid AND created_at >= now() - interval '24 hours')::int AS opportunities,
          (SELECT COUNT(*) FROM actions a JOIN action_plans ap ON ap.id = a.action_plan_id WHERE ap.site_id = ${site.id}::uuid AND a.created_at >= now() - interval '24 hours')::int AS actions_prepared,
          (SELECT COUNT(*) FROM actions a JOIN action_plans ap ON ap.id = a.action_plan_id WHERE ap.site_id = ${site.id}::uuid AND a.status = 'completed' AND a.updated_at >= now() - interval '24 hours')::int AS executed,
          (SELECT COUNT(*) FROM verifications v JOIN deployments d ON d.id = v.deployment_id JOIN action_plans ap ON ap.id = d.action_plan_id WHERE ap.site_id = ${site.id}::uuid AND v.status = 'verified' AND v.verified_at >= now() - interval '24 hours')::int AS verified,
          (SELECT COUNT(*) FROM verifications v JOIN deployments d ON d.id = v.deployment_id JOIN action_plans ap ON ap.id = d.action_plan_id WHERE ap.site_id = ${site.id}::uuid AND v.status = 'regressed' AND v.created_at >= now() - interval '24 hours')::int AS regressions
      `,
      sql`
        SELECT COUNT(*)::int AS pending
        FROM action_plans ap
        WHERE ap.site_id = ${site.id}::uuid
          AND ap.risk_level = 'approval'
          AND ap.status = 'pending'
          AND NOT EXISTS (SELECT 1 FROM approvals a WHERE a.action_plan_id = ap.id)
      `,
      sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE v.status = 'verified')::int AS verified,
          COUNT(*) FILTER (WHERE v.status = 'pending')::int AS pending,
          COUNT(*) FILTER (WHERE v.status = 'regressed')::int AS regressions,
          (SELECT COUNT(*) FROM rollbacks r JOIN deployments rd ON rd.id = r.deployment_id JOIN action_plans rap ON rap.id = rd.action_plan_id WHERE rap.site_id = ${site.id}::uuid AND r.status = 'completed')::int AS rolled_back
        FROM verifications v
        JOIN deployments d ON d.id = v.deployment_id
        JOIN action_plans ap ON ap.id = d.action_plan_id
        WHERE ap.site_id = ${site.id}::uuid
      `,
      sql`
        SELECT
          COUNT(DISTINCT ar.id)::int AS responses,
          COUNT(DISTINCT ar.id) FILTER (WHERE ar.brand_mentioned)::int AS brand_mentions,
          COUNT(DISTINCT ar.id) FILTER (WHERE EXISTS (SELECT 1 FROM ai_citations ac WHERE ac.ai_response_id = ar.id AND ac.is_own_domain))::int AS own_cited_responses,
          (SELECT COUNT(*) FROM ai_citations ac2 JOIN ai_responses ar2 ON ar2.id = ac2.ai_response_id JOIN ai_queries aq2 ON aq2.id = ar2.ai_query_id WHERE aq2.site_id = ${site.id}::uuid)::int AS all_citations,
          (SELECT COUNT(*) FROM ai_citations ac3 JOIN ai_responses ar3 ON ar3.id = ac3.ai_response_id JOIN ai_queries aq3 ON aq3.id = ar3.ai_query_id WHERE aq3.site_id = ${site.id}::uuid AND ac3.is_own_domain)::int AS own_citations
        FROM ai_responses ar
        JOIN ai_queries aq ON aq.id = ar.ai_query_id
        WHERE aq.site_id = ${site.id}::uuid
      `,
      sql`SELECT COUNT(*)::int AS signal_count, AVG(confidence) AS average_confidence FROM learning_signals WHERE site_id = ${site.id}::uuid`,
      sql`
        SELECT
          (SELECT COUNT(*) FROM verifications v JOIN deployments d ON d.id = v.deployment_id JOIN action_plans ap ON ap.id = d.action_plan_id WHERE ap.site_id = ${site.id}::uuid AND v.status = 'verified')::int AS verified_optimizations,
          (SELECT COUNT(*) FROM experiments WHERE site_id = ${site.id}::uuid AND status = 'completed')::int AS completed_experiments,
          (SELECT COUNT(*) FROM rollbacks r JOIN deployments d ON d.id = r.deployment_id JOIN action_plans ap ON ap.id = d.action_plan_id WHERE ap.site_id = ${site.id}::uuid AND r.status = 'completed')::int AS rollbacks,
          (SELECT COUNT(*) FROM verifications v JOIN deployments d ON d.id = v.deployment_id JOIN action_plans ap ON ap.id = d.action_plan_id WHERE ap.site_id = ${site.id}::uuid AND v.status = 'regressed')::int AS regressions_detected
      `,
      sql`
        SELECT
          o.opportunity_type,
          o.score,
          cardinality(o.evidence_ids) AS evidence_count,
          o.status,
          COALESCE(ap.risk_level, 'unplanned') AS risk_level
        FROM opportunities o
        LEFT JOIN LATERAL (
          SELECT risk_level FROM action_plans WHERE opportunity_id = o.id ORDER BY created_at DESC LIMIT 1
        ) ap ON true
        WHERE o.site_id = ${site.id}::uuid AND o.status IN ('new','accepted','planned')
        ORDER BY o.score DESC, o.created_at DESC
        LIMIT 5
      `,
      sql`
        SELECT GREATEST(
          COALESCE((SELECT MAX(completed_at) FROM crawl_runs WHERE site_id = ${site.id}::uuid), '-infinity'::timestamptz),
          COALESCE((SELECT MAX(sm.metric_date)::timestamptz FROM search_metrics sm JOIN search_queries sq ON sq.id = sm.query_id WHERE sq.site_id = ${site.id}::uuid), '-infinity'::timestamptz),
          COALESCE((SELECT MAX(ar.observed_at) FROM ai_responses ar JOIN ai_queries aq ON aq.id = ar.ai_query_id WHERE aq.site_id = ${site.id}::uuid), '-infinity'::timestamptz)
        ) AS freshest
      `,
    ]);

    const search = searchRows[0] ?? {};
    const topTen = n(topTenRows[0]?.top_ten);
    const openFindings = n(findingsRows[0]?.open_findings);
    const currentClicks = n(search.current_clicks);
    const previousClicks = n(search.previous_clicks);
    const currentImpressions = n(search.current_impressions);
    const previousImpressions = n(search.previous_impressions);
    const currentPosition = n(search.current_position);
    const previousPosition = n(search.previous_position);
    const ai = aiRows[0] ?? {};
    const responses = n(ai.responses);
    const ownCitedResponses = n(ai.own_cited_responses);
    const allCitations = n(ai.all_citations);
    const ownCitations = n(ai.own_citations);
    const citationRate = responses > 0 ? ownCitedResponses / responses : 0;
    const mentionRate = responses > 0 ? n(ai.brand_mentions) / responses : 0;
    const citationShare = allCitations > 0 ? ownCitations / allCitations : 0;
    const engine = engineRows[0] ?? {};
    const verification = verificationRows[0] ?? {};
    const learning = learningRows[0] ?? {};
    const impact = impactRows[0] ?? {};
    const freshestRaw = freshnessRows[0]?.freshest;
    const freshestCandidate = freshestRaw ? new Date(String(freshestRaw)) : null;
    const freshest = freshestCandidate && Number.isFinite(freshestCandidate.getTime())
      ? freshestCandidate
      : null;
    const stale = !freshest || Date.now() - freshest.getTime() > 72 * 60 * 60 * 1000;

    const opportunities: DashboardOpportunity[] = opportunityRows.map((row) => ({
      title: String(row.opportunity_type).replaceAll("_", " ").replaceAll(".", " · "),
      score: n(row.score).toFixed(1),
      evidence: `${n(row.evidence_count)} refs`,
      risk: String(row.risk_level),
      state: String(row.status),
    }));

    const activity: DashboardActivity[] = [];
    if (n(engine.verified) > 0) activity.push({ title: "Verification completed", detail: `${n(engine.verified)} changes verified in the last 24 hours`, result: "Persisted verification evidence", tone: "verified" });
    if (n(engine.opportunities) > 0) activity.push({ title: "Opportunities discovered", detail: `${n(engine.opportunities)} candidates created in the last 24 hours`, result: "Ranked from persisted evidence", tone: "ready" });
    if (n(approvalsRows[0]?.pending) > 0) activity.push({ title: "Approval required", detail: `${n(approvalsRows[0]?.pending)} plans awaiting a decision`, result: "No approval bypass", tone: "approval" });
    if (activity.length === 0) activity.push({ title: "No recent operational events", detail: "No verified actions, new opportunities or pending approvals in the last 24 hours", result: "Live database checked", tone: "normal" });

    return {
      state: "live",
      reason: null,
      siteName: site.name,
      domain: site.domain,
      generatedAt: new Date().toISOString(),
      dataFreshness: freshest ? freshest.toISOString() : "No observations",
      stale,
      approvalsPending: n(approvalsRows[0]?.pending),
      metrics: [
        { label: "Organic clicks", value: integer(currentClicks), delta: delta(currentClicks, previousClicks) },
        { label: "Impressions", value: integer(currentImpressions), delta: delta(currentImpressions, previousImpressions) },
         { label: "Top-10 keywords", value: integer(topTen), delta: `Live GSC · ${filters.days} days` },
        { label: "Average position", value: currentPosition > 0 ? currentPosition.toFixed(1) : "—", delta: previousPosition > 0 && currentPosition > 0 ? `${(previousPosition - currentPosition) >= 0 ? "+" : ""}${(previousPosition - currentPosition).toFixed(1)} positions` : "No prior comparison" },
        { label: "AI citation rate", value: responses > 0 ? percent(citationRate) : "—", delta: responses > 0 ? `${responses} observations` : "No live AI observations" },
        { label: "Open findings", value: integer(openFindings), delta: "Persisted technical findings" },
      ],
      engine: {
        pagesAnalyzed: n(engine.pages_analyzed), opportunities: n(engine.opportunities), actionsPrepared: n(engine.actions_prepared), executed: n(engine.executed), verified: n(engine.verified), regressions: n(engine.regressions),
      },
      opportunities,
      activity,
      verification: { verified: n(verification.verified), total: n(verification.total), pending: n(verification.pending), rolledBack: n(verification.rolled_back), regressions: n(verification.regressions) },
      aiVisibility: { citationRate: responses > 0 ? percent(citationRate) : "—", brandMentionRate: responses > 0 ? percent(mentionRate) : "—", citationShare: allCitations > 0 ? percent(citationShare) : "—" },
      learning: { signalCount: n(learning.signal_count), averageConfidence: learning.average_confidence == null ? "—" : percent(n(learning.average_confidence)) },
      impact: { verifiedOptimizations: n(impact.verified_optimizations), completedExperiments: n(impact.completed_experiments), rollbacks: n(impact.rollbacks), regressionsDetected: n(impact.regressions_detected) },
    };
  } catch (error) {
    return unavailable(`Live dashboard query failed: ${error instanceof Error ? error.message : "unknown database error"}`);
  } finally {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  }
}
