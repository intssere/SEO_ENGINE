import postgres from "postgres";
import { getRuntimeReadiness } from "./operational-data.js";

export const MEASUREMENT_WINDOW_DAYS = 28;
export const MIN_OBSERVED_DAYS = 21;
export const MIN_BASELINE_IMPRESSIONS = 100;

export type MeasurementRecommendation =
  | "not_eligible"
  | "measurement_pending"
  | "retain"
  | "replace_candidate"
  | "rollback_candidate";

export type MeasurementConfidence = "insufficient" | "low" | "medium" | "high";

export type MeasurementWindow = {
  observedDays: number;
  clicks: number;
  impressions: number;
  ctr: number;
  averagePosition: number | null;
};

export type MeasurementEvaluationInput = {
  deploymentStatus: string;
  deployedAt: string | null;
  lifecycle: string | null;
  deploymentMeasurementEligible: boolean;
  executionMeasurementEligible: boolean;
  verificationStatus: string | null;
  pageId: string | null;
  completedRollbackCount: number;
  baseline: MeasurementWindow;
  comparison: MeasurementWindow;
  now?: string | Date;
};

const DAY_MS = 86_400_000;

const toUtcDay = (value: string | Date | null | undefined) => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  return Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
};

const isoDay = (value: number | null) => value === null ? null : new Date(value).toISOString().slice(0, 10);
const round = (value: number | null, places = 4) => value === null || !Number.isFinite(value) ? null : Number(value.toFixed(places));
const ratioDelta = (current: number, baseline: number) => baseline > 0 ? (current - baseline) / baseline : null;

export function evaluateMeasurementImpact(input: MeasurementEvaluationInput) {
  const blockers: string[] = [];
  const deploymentDay = toUtcDay(input.deployedAt);
  if (input.deploymentStatus !== "completed") blockers.push("deployment_not_completed");
  if (!deploymentDay) blockers.push("deployment_timestamp_missing");
  if (!input.deploymentMeasurementEligible) blockers.push("deployment_not_measurement_eligible");
  if (!input.executionMeasurementEligible) blockers.push("execution_not_measurement_eligible");
  if (input.lifecycle !== "production_change_verified_live") blockers.push("change_not_verified_live");
  if (input.verificationStatus !== "verified") blockers.push("verification_not_verified");
  if (!input.pageId) blockers.push("page_identity_missing");
  if (input.completedRollbackCount > 0) blockers.push("rollback_record_present");

  const baselineStart = deploymentDay === null ? null : deploymentDay - MEASUREMENT_WINDOW_DAYS * DAY_MS;
  const baselineEnd = deploymentDay === null ? null : deploymentDay - DAY_MS;
  const comparisonStart = deploymentDay === null ? null : deploymentDay + DAY_MS;
  const comparisonEnd = deploymentDay === null ? null : deploymentDay + MEASUREMENT_WINDOW_DAYS * DAY_MS;
  const cooldownEndsAt = deploymentDay === null ? null : deploymentDay + (MEASUREMENT_WINDOW_DAYS + 1) * DAY_MS;
  const nowDay = toUtcDay(input.now ?? new Date());
  const cooldownComplete = cooldownEndsAt !== null && nowDay !== null && nowDay >= cooldownEndsAt;

  const anyData = input.baseline.observedDays > 0 || input.comparison.observedDays > 0;
  const strongCoverage = input.baseline.observedDays >= MEASUREMENT_WINDOW_DAYS
    && input.comparison.observedDays >= MEASUREMENT_WINDOW_DAYS
    && input.baseline.impressions >= 500
    && input.comparison.impressions >= 500;
  const usableCoverage = input.baseline.observedDays >= MIN_OBSERVED_DAYS
    && input.comparison.observedDays >= MIN_OBSERVED_DAYS
    && input.baseline.impressions >= MIN_BASELINE_IMPRESSIONS
    && input.comparison.impressions >= MIN_BASELINE_IMPRESSIONS;
  const confidence: MeasurementConfidence = strongCoverage ? "high" : usableCoverage ? "medium" : anyData ? "low" : "insufficient";

  const clicksPct = ratioDelta(input.comparison.clicks, input.baseline.clicks);
  const impressionsPct = ratioDelta(input.comparison.impressions, input.baseline.impressions);
  const ctrPct = ratioDelta(input.comparison.ctr, input.baseline.ctr);
  const positionDelta = input.baseline.averagePosition !== null && input.comparison.averagePosition !== null
    ? input.comparison.averagePosition - input.baseline.averagePosition
    : null;

  const deltas = {
    clicks: input.comparison.clicks - input.baseline.clicks,
    clicksPct: round(clicksPct),
    impressions: input.comparison.impressions - input.baseline.impressions,
    impressionsPct: round(impressionsPct),
    ctrPoints: round((input.comparison.ctr - input.baseline.ctr) * 100),
    ctrPct: round(ctrPct),
    averagePosition: round(positionDelta),
  };

  let recommendation: MeasurementRecommendation = "measurement_pending";
  let recommendationBasis = "measurement_window_or_evidence_incomplete";
  if (blockers.length > 0) {
    recommendation = "not_eligible";
    recommendationBasis = "deployment_not_eligible_for_persistent_change_measurement";
  } else if (!cooldownComplete || !usableCoverage) {
    recommendation = "measurement_pending";
  } else {
    const moderateNegativeSignals = [
      clicksPct !== null && clicksPct <= -0.15,
      impressionsPct !== null && impressionsPct <= -0.15,
      ctrPct !== null && ctrPct <= -0.15,
      positionDelta !== null && positionDelta >= 2,
    ].filter(Boolean).length;
    const strongRegression = clicksPct !== null && clicksPct <= -0.30
      && impressionsPct !== null && impressionsPct <= -0.20
      && ((ctrPct !== null && ctrPct <= -0.20) || (positionDelta !== null && positionDelta >= 3));

    if (strongRegression) {
      recommendation = "rollback_candidate";
      recommendationBasis = "multi_signal_observational_regression";
    } else if (moderateNegativeSignals >= 2) {
      recommendation = "replace_candidate";
      recommendationBasis = "multiple_observational_metrics_declined";
    } else {
      recommendation = "retain";
      recommendationBasis = "no_material_multi_signal_regression_observed";
    }
  }

  return {
    measurementEligible: blockers.length === 0,
    measurementState: blockers.length > 0 ? "not_eligible" : cooldownComplete && usableCoverage ? "ready" : "pending",
    eligibilityBlockers: blockers,
    windowDays: MEASUREMENT_WINDOW_DAYS,
    baselineWindow: { start: isoDay(baselineStart), end: isoDay(baselineEnd), ...input.baseline },
    comparisonWindow: { start: isoDay(comparisonStart), end: isoDay(comparisonEnd), ...input.comparison },
    cooldownEndsAt: isoDay(cooldownEndsAt),
    cooldownComplete,
    confidence,
    deltas,
    recommendation,
    recommendationBasis,
    advisoryOnly: true as const,
    causalAttribution: false as const,
    executionAuthorized: false as const,
    publicSiteWrites: false as const,
    automaticTransition: false as const,
  };
}

function database() {
  const url = process.env.DATABASE_URL?.trim();
  return url ? postgres(url, { max: 1, prepare: false, connect_timeout: 5, idle_timeout: 2 }) : null;
}

type MeasurementDbRow = {
  id: string;
  action_plan_id: string;
  provider: string;
  status: string;
  deployed_at: string | null;
  risk_level: string;
  planControlRisk: string;
  evaluatorRisk: string;
  effectiveExecutionRisk: string;
  rationale: string;
  lifecycle: string | null;
  deployment_measurement_eligible: string | null;
  execution_measurement_eligible: string | null;
  field: string | null;
  before_value: string | null;
  after_value: string | null;
  final_state: string | null;
  provider_write_stage: string | null;
  action_id: string | null;
  page_id: string | null;
  url: string | null;
  verification_id: string | null;
  verification_status: string | null;
  verified_at: string | null;
  completed_rollback_count: number | string | null;
  pre_observed_days: number | string | null;
  pre_clicks: number | string | null;
  pre_impressions: number | string | null;
  pre_position: number | string | null;
  post_observed_days: number | string | null;
  post_clicks: number | string | null;
  post_impressions: number | string | null;
  post_position: number | string | null;
  gsc_evidence_count: number | string | null;
  ga4_evidence_count: number | string | null;
  latest_gsc_evidence_at: string | null;
  latest_ga4_evidence_at: string | null;
};

const numeric = (value: number | string | null | undefined) => Number(value ?? 0);
const aggregateWindow = (days: number | string | null, clicks: number | string | null, impressions: number | string | null, position: number | string | null): MeasurementWindow => {
  const safeImpressions = numeric(impressions);
  const safeClicks = numeric(clicks);
  return {
    observedDays: numeric(days),
    clicks: safeClicks,
    impressions: safeImpressions,
    ctr: safeImpressions > 0 ? safeClicks / safeImpressions : 0,
    averagePosition: position === null ? null : numeric(position),
  };
};

export async function loadMeasurementImpact() {
  const readiness = await getRuntimeReadiness();
  if (readiness.state !== "live" || !readiness.siteId) return { readiness, rows: [] as Record<string, unknown>[] };
  const sql = database();
  if (!sql) return { readiness: { state: "unavailable" as const, message: "Database connection is not configured.", siteId: readiness.siteId }, rows: [] as Record<string, unknown>[] };

  try {
    const rows = await sql<MeasurementDbRow[]>`
      SELECT
        d.id::text AS id,
        d.action_plan_id::text AS action_plan_id,
        d.provider,
        d.status,
        d.deployed_at::text AS deployed_at,
        ap.risk_level,
        ap.risk_level AS "planControlRisk",
        COALESCE(ap.expected_outcome->>'riskClassification',o.impact_estimate->>'riskClassification','unclassified') AS "evaluatorRisk",
        COALESCE(o.impact_estimate->>'riskClassification',ap.risk_level,'blocked') AS "effectiveExecutionRisk",
        ap.rationale,
        ap.expected_outcome->>'lifecycleStage' AS lifecycle,
        d.metadata->>'measurementEligible' AS deployment_measurement_eligible,
        ap.expected_outcome #>> '{executionFoundation,measurementEligible}' AS execution_measurement_eligible,
        d.metadata->>'field' AS field,
        d.metadata->>'beforeValue' AS before_value,
        d.metadata->>'afterValue' AS after_value,
        d.metadata->>'finalState' AS final_state,
        d.metadata->>'providerWriteStage' AS provider_write_stage,
        a.id::text AS action_id,
        a.page_id::text AS page_id,
        p.url,
        verification.id::text AS verification_id,
        verification.status AS verification_status,
        verification.verified_at::text AS verified_at,
        COALESCE(rollback.completed_count,0)::int AS completed_rollback_count,
        COALESCE(metrics.pre_observed_days,0)::int AS pre_observed_days,
        COALESCE(metrics.pre_clicks,0)::bigint AS pre_clicks,
        COALESCE(metrics.pre_impressions,0)::bigint AS pre_impressions,
        metrics.pre_position,
        COALESCE(metrics.post_observed_days,0)::int AS post_observed_days,
        COALESCE(metrics.post_clicks,0)::bigint AS post_clicks,
        COALESCE(metrics.post_impressions,0)::bigint AS post_impressions,
        metrics.post_position,
        COALESCE(evidence_counts.gsc_count,0)::int AS gsc_evidence_count,
        COALESCE(evidence_counts.ga4_count,0)::int AS ga4_evidence_count,
        evidence_counts.latest_gsc::text AS latest_gsc_evidence_at,
        evidence_counts.latest_ga4::text AS latest_ga4_evidence_at
      FROM deployments d
      JOIN action_plans ap ON ap.id=d.action_plan_id
      LEFT JOIN opportunities o ON o.id=ap.opportunity_id
      LEFT JOIN actions a ON a.action_plan_id=ap.id AND a.id::text=d.metadata->>'actionId'
      LEFT JOIN pages p ON p.id=a.page_id AND p.id::text=d.metadata->>'pageId'
      LEFT JOIN LATERAL (
        SELECT v.id,v.status,v.verified_at
        FROM verifications v
        WHERE v.deployment_id=d.id
        ORDER BY v.created_at DESC
        LIMIT 1
      ) verification ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) FILTER (WHERE r.status='completed')::int AS completed_count
        FROM rollbacks r
        WHERE r.deployment_id=d.id
      ) rollback ON true
      LEFT JOIN LATERAL (
        SELECT
          COUNT(DISTINCT sm.metric_date) FILTER (WHERE sm.metric_date BETWEEN d.deployed_at::date - ${MEASUREMENT_WINDOW_DAYS} AND d.deployed_at::date - 1)::int AS pre_observed_days,
          COALESCE(SUM(sm.clicks) FILTER (WHERE sm.metric_date BETWEEN d.deployed_at::date - ${MEASUREMENT_WINDOW_DAYS} AND d.deployed_at::date - 1),0) AS pre_clicks,
          COALESCE(SUM(sm.impressions) FILTER (WHERE sm.metric_date BETWEEN d.deployed_at::date - ${MEASUREMENT_WINDOW_DAYS} AND d.deployed_at::date - 1),0) AS pre_impressions,
          CASE WHEN COALESCE(SUM(sm.impressions) FILTER (WHERE sm.metric_date BETWEEN d.deployed_at::date - ${MEASUREMENT_WINDOW_DAYS} AND d.deployed_at::date - 1 AND sm.average_position IS NOT NULL),0)>0
            THEN SUM(sm.average_position*sm.impressions) FILTER (WHERE sm.metric_date BETWEEN d.deployed_at::date - ${MEASUREMENT_WINDOW_DAYS} AND d.deployed_at::date - 1 AND sm.average_position IS NOT NULL)
              / SUM(sm.impressions) FILTER (WHERE sm.metric_date BETWEEN d.deployed_at::date - ${MEASUREMENT_WINDOW_DAYS} AND d.deployed_at::date - 1 AND sm.average_position IS NOT NULL)
            ELSE NULL END AS pre_position,
          COUNT(DISTINCT sm.metric_date) FILTER (WHERE sm.metric_date BETWEEN d.deployed_at::date + 1 AND d.deployed_at::date + ${MEASUREMENT_WINDOW_DAYS})::int AS post_observed_days,
          COALESCE(SUM(sm.clicks) FILTER (WHERE sm.metric_date BETWEEN d.deployed_at::date + 1 AND d.deployed_at::date + ${MEASUREMENT_WINDOW_DAYS}),0) AS post_clicks,
          COALESCE(SUM(sm.impressions) FILTER (WHERE sm.metric_date BETWEEN d.deployed_at::date + 1 AND d.deployed_at::date + ${MEASUREMENT_WINDOW_DAYS}),0) AS post_impressions,
          CASE WHEN COALESCE(SUM(sm.impressions) FILTER (WHERE sm.metric_date BETWEEN d.deployed_at::date + 1 AND d.deployed_at::date + ${MEASUREMENT_WINDOW_DAYS} AND sm.average_position IS NOT NULL),0)>0
            THEN SUM(sm.average_position*sm.impressions) FILTER (WHERE sm.metric_date BETWEEN d.deployed_at::date + 1 AND d.deployed_at::date + ${MEASUREMENT_WINDOW_DAYS} AND sm.average_position IS NOT NULL)
              / SUM(sm.impressions) FILTER (WHERE sm.metric_date BETWEEN d.deployed_at::date + 1 AND d.deployed_at::date + ${MEASUREMENT_WINDOW_DAYS} AND sm.average_position IS NOT NULL)
            ELSE NULL END AS post_position
        FROM search_metrics sm
        JOIN search_queries sq ON sq.id=sm.query_id AND sq.site_id=ap.site_id
        WHERE sm.page_id=a.page_id AND sm.source='gsc' AND d.deployed_at IS NOT NULL
          AND sm.metric_date BETWEEN d.deployed_at::date - ${MEASUREMENT_WINDOW_DAYS} AND d.deployed_at::date + ${MEASUREMENT_WINDOW_DAYS}
          AND sm.metric_date<>d.deployed_at::date
      ) metrics ON true
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) FILTER (WHERE e.source='gsc')::int AS gsc_count,
          COUNT(*) FILTER (WHERE e.source='ga4')::int AS ga4_count,
          MAX(e.observed_at) FILTER (WHERE e.source='gsc') AS latest_gsc,
          MAX(e.observed_at) FILTER (WHERE e.source='ga4') AS latest_ga4
        FROM evidence e
        WHERE e.site_id=ap.site_id AND (e.page_id=a.page_id OR e.page_id IS NULL)
      ) evidence_counts ON true
      WHERE ap.site_id=${readiness.siteId}::uuid
      ORDER BY d.created_at DESC
      LIMIT 100`;

    return {
      readiness,
      rows: rows.map((row) => {
        const baseline = aggregateWindow(row.pre_observed_days,row.pre_clicks,row.pre_impressions,row.pre_position);
        const comparison = aggregateWindow(row.post_observed_days,row.post_clicks,row.post_impressions,row.post_position);
        const evaluation = evaluateMeasurementImpact({
          deploymentStatus: row.status,
          deployedAt: row.deployed_at,
          lifecycle: row.lifecycle,
          deploymentMeasurementEligible: row.deployment_measurement_eligible === "true",
          executionMeasurementEligible: row.execution_measurement_eligible === "true",
          verificationStatus: row.verification_status,
          pageId: row.page_id,
          completedRollbackCount: numeric(row.completed_rollback_count),
          baseline,
          comparison,
        });
        return {
          id: row.id,
          action_plan_id: row.action_plan_id,
          action_id: row.action_id,
          page_id: row.page_id,
          url: row.url,
          provider: row.provider,
          status: row.status,
          deployed_at: row.deployed_at,
          field: row.field,
          before_value: row.before_value,
          after_value: row.after_value,
          final_state: row.final_state,
          provider_write_stage: row.provider_write_stage,
          lifecycle: row.lifecycle,
          risk_level: row.risk_level,
          planControlRisk: row.planControlRisk,
          evaluatorRisk: row.evaluatorRisk,
          effectiveExecutionRisk: row.effectiveExecutionRisk,
          rationale: row.rationale,
          verification_id: row.verification_id,
          verification_status: row.verification_status,
          verified_at: row.verified_at,
          gsc_evidence_count: numeric(row.gsc_evidence_count),
          ga4_evidence_count: numeric(row.ga4_evidence_count),
          latest_gsc_evidence_at: row.latest_gsc_evidence_at,
          latest_ga4_evidence_at: row.latest_ga4_evidence_at,
          ...evaluation,
        };
      }),
    };
  } catch {
    return { readiness: { state: "unavailable" as const, message: "Measurement data could not be loaded.", siteId: readiness.siteId }, rows: [] as Record<string, unknown>[] };
  } finally {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  }
}
