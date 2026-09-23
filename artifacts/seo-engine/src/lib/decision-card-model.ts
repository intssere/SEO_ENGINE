import type {
  OpportunityRecord,
  ProposalRecord,
} from "@workspace/api-client-react";

export type DecisionCardMeasurement =
  | { state: "unavailable"; label: "Measurement unavailable"; detail: string }
  | { state: "pending"; label: "Measurement pending"; detail: string }
  | { state: "measured"; label: "Measured"; detail: string };

export type DecisionCardModel = Readonly<{
  id: string;
  source: "opportunity" | "proposal";
  title: string;
  subtitle: string;
  url: string | null;
  problem: string;
  impact: string;
  risk: string;
  currentState: string | null;
  recommendedState: string;
  why: string;
  previewAvailable: boolean;
  workflowLabel: string;
  workflowDetail: string;
  actionHref: string;
  actionLabel: string;
  measurement: DecisionCardMeasurement;
  confidence: number;
  score: number;
}>;

const MEASUREMENT_UNAVAILABLE: DecisionCardMeasurement = Object.freeze({
  state: "unavailable",
  label: "Measurement unavailable",
  detail: "This record does not expose a verified outcome measurement.",
});

const titleize = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function boundedPercent(value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error("ugp_2_3_invalid_confidence");
  }
  return value;
}

function boundedScore(value: number) {
  if (!Number.isFinite(value)) throw new Error("ugp_2_3_invalid_score");
  return value;
}

export function buildOpportunityDecisionCard(
  row: OpportunityRecord,
): DecisionCardModel {
  const workflowLabel = row.execution_authorized
    ? "Authorization recorded"
    : row.status === "completed"
      ? "Completed status recorded"
      : row.status === "planned"
        ? "Planned"
        : row.status === "accepted"
          ? "Accepted"
          : "Recommendation only";

  return Object.freeze({
    id: "opportunity:" + row.id,
    source: "opportunity" as const,
    title: row.title,
    subtitle: titleize(row.opportunity_type),
    url: row.url,
    problem: row.title,
    impact: "Expected impact is not exposed by this opportunity record.",
    risk: row.risk_classification,
    currentState: null,
    recommendedState: row.recommendation,
    why: row.why_qualifies || row.rationale,
    previewAvailable: false,
    workflowLabel,
    workflowDetail: row.execution_authorized
      ? "Authorization state is recorded, but this card does not execute changes."
      : "Open Automation to inspect any review or execution workflow tied to this recommendation.",
    actionHref: "/automation",
    actionLabel: row.execution_authorized ? "Inspect automation" : "Review workflow",
    measurement: MEASUREMENT_UNAVAILABLE,
    confidence: boundedPercent(row.confidence),
    score: boundedScore(row.score),
  });
}

export function buildProposalDecisionCard(
  row: ProposalRecord,
): DecisionCardModel {
  const decided = row.decision !== null;
  const workflowLabel = row.execution_authorized
    ? "Authorization recorded"
    : row.decision === "approved"
      ? "Approved for review flow"
      : row.decision === "rejected"
        ? "Returned for revision"
        : row.lifecycle === "approval_ready"
          ? "Ready for review"
          : "Review not ready";

  return Object.freeze({
    id: "proposal:" + row.id,
    source: "proposal" as const,
    title: row.title,
    subtitle: titleize(row.action_type) + " · " + titleize(row.field),
    url: row.url,
    problem: titleize(row.opportunity_type),
    impact: row.expected_benefit,
    risk: row.effectiveExecutionRisk,
    currentState: row.before_value,
    recommendedState: row.after_value ?? "No proposed value is exposed.",
    why: row.rationale,
    previewAvailable: row.before_value !== null || row.after_value !== null,
    workflowLabel,
    workflowDetail: row.execution_authorized
      ? "Authorization is recorded; execution still depends on the governed execution path."
      : decided
        ? "The recorded review decision does not itself authorize execution."
        : "This proposal remains inside the review workflow.",
    actionHref: "/automation/review",
    actionLabel: decided ? "Inspect review" : "Review proposal",
    measurement: MEASUREMENT_UNAVAILABLE,
    confidence: boundedPercent(row.confidence),
    score: boundedScore(row.score),
  });
}

export function buildOpportunityDecisionCards(rows: readonly OpportunityRecord[]) {
  return rows.map(buildOpportunityDecisionCard);
}

export function buildProposalDecisionCards(rows: readonly ProposalRecord[]) {
  return rows.map(buildProposalDecisionCard);
}
