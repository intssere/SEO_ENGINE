import test from "node:test";
import assert from "node:assert/strict";
import { buildOpportunityDecisionCard } from "./decision-card-model.js";

const base = {
  id: "opp-1",
  title: "Improve product meta description",
  opportunity_type: "organic_ctr",
  score: 82.4,
  status: "new",
  rationale: "CTR trails the expected range.",
  evidence_count: 3,
  url: "https://example.com/products/a",
  query: "example query",
  risk_classification: "low",
  confidence: 0.91,
  score_components: {},
  why_qualifies: "Strong impressions with below-expected CTR.",
  recommendation: "Rewrite the meta description.",
  execution_authorized: false,
  lifecycle: "active",
  updated_at: "2026-09-23T12:00:00.000Z",
} as any;

test("UGP-2.3 projects source-backed opportunity decision state deterministically", () => {
  const first = buildOpportunityDecisionCard(base);
  const replay = buildOpportunityDecisionCard({ ...base });

  assert.deepEqual(first, replay);
  assert.equal(first.problem, base.title);
  assert.equal(first.impact, "Impact not available.");
  assert.equal(first.risk, "low");
  assert.equal(first.currentState, null);
  assert.equal(first.recommendedState, base.recommendation);
  assert.equal(first.workflowLabel, "Recommendation only");
});

test("UGP-2.3 exposes authorization without inferring workflow from optional status", () => {
  assert.equal(
    buildOpportunityDecisionCard({ ...base, status: "planned" }).workflowLabel,
    "Recommendation only",
  );
  assert.equal(
    buildOpportunityDecisionCard({
      ...base,
      execution_authorized: true,
    }).workflowLabel,
    "Authorization recorded",
  );
});


test("UGP-2.3 missing or unknown opportunity status falls back without inventing workflow", () => {
  const base = {
    id: "opp-missing-status",
    title: "Missing status",
    opportunity_type: "content_alignment",
    score: 60,
    rationale: "Rationale",
    evidence_count: 1,
    url: null,
    query: null,
    risk_classification: "low",
    confidence: 0.8,
    score_components: {},
    why_qualifies: "Evidence-backed",
    recommendation: "Change",
    execution_authorized: false,
    lifecycle: "active",
    updated_at: "2026-09-23T12:00:00.000Z",
  } as any;

  assert.equal(
    buildOpportunityDecisionCard(base).workflowLabel,
    "Recommendation only",
  );
  assert.equal(
    buildOpportunityDecisionCard({ ...base, status: "unknown_future_state" }).workflowLabel,
    "Recommendation only",
  );
});
