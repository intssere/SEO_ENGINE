import type { OpportunityRecord } from "@workspace/api-client-react";

export type DecisionCardModel = Readonly<{
  id: string;
  subtitle: string;
  url: string | null;
  problem: string;
  impact: string;
  risk: string;
  currentState: null;
  recommendedState: string;
  why: string;
  workflowLabel: string;
  confidence: number;
  score: number;
}>;

const titleize = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function buildOpportunityDecisionCard(
  row: OpportunityRecord,
): DecisionCardModel {
  if (!Number.isFinite(row.confidence) || row.confidence < 0 || row.confidence > 1) {
    throw new Error("ugp_2_3_invalid_confidence");
  }
  if (!Number.isFinite(row.score)) throw new Error("ugp_2_3_invalid_score");

  return Object.freeze({
    id: "opportunity:" + row.id,
    subtitle: titleize(row.opportunity_type),
    url: row.url,
    problem: row.title,
    impact: "Expected impact is not exposed by this opportunity.",
    risk: row.risk_classification,
    currentState: null,
    recommendedState: row.recommendation,
    why: row.why_qualifies || row.rationale,
    workflowLabel: row.execution_authorized
      ? "Authorization recorded"
      : row.status === "planned"
        ? "Planned"
        : row.status === "accepted"
          ? "Accepted"
          : "Recommendation only",
    confidence: row.confidence,
    score: row.score,
  });
}

export function buildOpportunityDecisionCards(rows: readonly OpportunityRecord[]) {
  return rows.map(buildOpportunityDecisionCard);
}
