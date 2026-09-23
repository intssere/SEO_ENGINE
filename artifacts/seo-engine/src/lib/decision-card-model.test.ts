import test from "node:test";
import assert from "node:assert/strict";
import { buildOpportunityDecisionCard } from "./decision-card-model.js";

test("UGP-2.3 maps opportunity records without inventing current state or impact", () => {
  const card = buildOpportunityDecisionCard({
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
  } as any);

  assert.equal(card.problem, "Improve product meta description");
  assert.equal(card.impact, "Expected impact is not exposed by this opportunity.");
  assert.equal(card.currentState, null);
  assert.equal(card.recommendedState, "Rewrite the meta description.");
  assert.equal(card.workflowLabel, "Recommendation only");
});

test("UGP-2.3 reflects source workflow state without implying execution", () => {
  const planned = buildOpportunityDecisionCard({
    id: "opp-2",
    title: "Review collection title",
    opportunity_type: "technical_remediation",
    score: 55,
    status: "planned",
    rationale: "Rationale",
    evidence_count: 1,
    url: null,
    query: null,
    risk_classification: "medium",
    confidence: 0.7,
    score_components: {},
    why_qualifies: "Evidence-backed",
    recommendation: "Update title",
    execution_authorized: false,
    lifecycle: "active",
    updated_at: "2026-09-23T12:00:00.000Z",
  } as any);

  assert.equal(planned.workflowLabel, "Planned");

  const authorized = buildOpportunityDecisionCard({
    ...({
      id: "opp-3",
      title: "Authorized example",
      opportunity_type: "content_alignment",
      score: 60,
      status: "accepted",
      rationale: "Rationale",
      evidence_count: 1,
      url: null,
      query: null,
      risk_classification: "low",
      confidence: 0.8,
      score_components: {},
      why_qualifies: "Evidence-backed",
      recommendation: "Change",
      execution_authorized: true,
      lifecycle: "active",
      updated_at: "2026-09-23T12:00:00.000Z",
    } as any),
  });
  assert.equal(authorized.workflowLabel, "Authorization recorded");
});

test("UGP-2.3 fails closed on invalid confidence or score", () => {
  assert.throws(
    () =>
      buildOpportunityDecisionCard({
        id: "opp-invalid",
        title: "Invalid",
        opportunity_type: "organic_ctr",
        score: Number.NaN,
        status: "new",
        rationale: "x",
        evidence_count: 0,
        url: null,
        query: null,
        risk_classification: "low",
        confidence: 1.2,
        score_components: {},
        why_qualifies: "x",
        recommendation: "x",
        execution_authorized: false,
        lifecycle: "active",
        updated_at: "2026-09-23T12:00:00.000Z",
      } as any),
    /ugp_2_3_invalid_confidence/,
  );
});
