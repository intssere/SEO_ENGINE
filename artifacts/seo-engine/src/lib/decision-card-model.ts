import type { OpportunityRecord } from "@workspace/api-client-react";

export type DecisionCardModel = Readonly<{
  id: string;
  problem: string;
  impact: string;
  risk: string;
  currentState: null;
  recommendedState: string;
  why: string;
  workflowLabel: string;
}>;

export function buildOpportunityDecisionCard(
  row: OpportunityRecord,
): DecisionCardModel {
  return Object.freeze({
    id: row.id,
    problem: row.title,
    impact: "Impact not available.",
    risk: row.risk_classification,
    currentState: null,
    recommendedState: row.recommendation,
    why: row.why_qualifies || row.rationale,
    workflowLabel: row.execution_authorized
      ? "Authorization recorded"
      : "Recommendation only",
  });
}

export function buildOpportunityDecisionCards(rows: readonly OpportunityRecord[]) {
  return rows.map(buildOpportunityDecisionCard);
}
