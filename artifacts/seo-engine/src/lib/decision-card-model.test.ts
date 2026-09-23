import test from "node:test";
import assert from "node:assert/strict";
import {
  buildOpportunityDecisionCard,
  buildProposalDecisionCard,
} from "./decision-card-model.js";

test("UGP-2.3 maps opportunity records without inventing current state, impact, preview, or measurement", () => {
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
  assert.equal(card.impact, "Expected impact is not exposed by this opportunity record.");
  assert.equal(card.currentState, null);
  assert.equal(card.recommendedState, "Rewrite the meta description.");
  assert.equal(card.previewAvailable, false);
  assert.equal(card.workflowLabel, "Recommendation only");
  assert.equal(card.measurement.state, "unavailable");
  assert.match(card.measurement.detail, /does not expose a verified outcome measurement/);
});

test("UGP-2.3 maps proposal records to exact before/recommended preview and review state", () => {
  const card = buildProposalDecisionCard({
    id: "proposal-1",
    opportunity_id: "opp-1",
    title: "Product meta description",
    opportunity_type: "organic_ctr",
    url: "https://example.com/products/a",
    path: "/products/a",
    query: "example query",
    score: 82.4,
    confidence: 0.91,
    risk_classification: "low",
    evaluatorRisk: "low",
    planControlRisk: "low",
    effectiveExecutionRisk: "low",
    lifecycle: "approval_ready",
    plan_status: "pending",
    dry_run: true,
    execution_authorized: false,
    public_site_writes: false,
    action_type: "update_meta_description",
    field: "meta_description",
    before_value: "Old description",
    after_value: "New description",
    rationale: "CTR trails the expected range.",
    expected_benefit: "Improve qualified organic clicks.",
    rollback: "Restore old description.",
    evidence_ids: ["e-1"],
    evidence_count: 1,
    evidence_sufficient: true,
    bounded_pilot: true,
    whole_site_coverage: false,
    quality_status: "pass",
    quality_score: 96,
    quality_approval_eligible: true,
    quality_checks: [],
    quality_blocking_reasons: [],
    quality_warnings: [],
    quality_evidence_ids: ["e-1"],
    decision: null,
    decision_reason: null,
    decided_by: null,
    decided_at: null,
    revision_requested: false,
    updated_at: "2026-09-23T12:00:00.000Z",
  } as any);

  assert.equal(card.problem, "Organic Ctr");
  assert.equal(card.impact, "Improve qualified organic clicks.");
  assert.equal(card.currentState, "Old description");
  assert.equal(card.recommendedState, "New description");
  assert.equal(card.previewAvailable, true);
  assert.equal(card.workflowLabel, "Ready for review");
  assert.equal(card.measurement.state, "unavailable");
});

test("UGP-2.3 never turns approval into execution or measurement", () => {
  const card = buildProposalDecisionCard({
    id: "proposal-2",
    opportunity_id: "opp-2",
    title: "SEO title",
    opportunity_type: "content_alignment",
    url: "https://example.com/a",
    path: "/a",
    query: null,
    score: 70,
    confidence: 0.8,
    risk_classification: "low",
    evaluatorRisk: "low",
    planControlRisk: "low",
    effectiveExecutionRisk: "low",
    lifecycle: "approved_proposal",
    plan_status: "approved",
    dry_run: true,
    execution_authorized: false,
    public_site_writes: false,
    action_type: "update_seo_title",
    field: "title",
    before_value: "Before",
    after_value: "After",
    rationale: "Align the page title.",
    expected_benefit: "Improve relevance.",
    rollback: "Restore title.",
    evidence_ids: [],
    evidence_count: 0,
    evidence_sufficient: true,
    bounded_pilot: true,
    whole_site_coverage: false,
    quality_status: "pass",
    quality_score: 95,
    quality_approval_eligible: true,
    quality_checks: [],
    quality_blocking_reasons: [],
    quality_warnings: [],
    quality_evidence_ids: [],
    decision: "approved",
    decision_reason: null,
    decided_by: "reviewer",
    decided_at: "2026-09-23T12:00:00.000Z",
    revision_requested: false,
    updated_at: "2026-09-23T12:00:00.000Z",
  } as any);

  assert.equal(card.workflowLabel, "Approved for review flow");
  assert.match(card.workflowDetail, /does not itself authorize execution/);
  assert.equal(card.measurement.state, "unavailable");
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
    /ugp_2_3_invalid_confidence|ugp_2_3_invalid_score/,
  );
});
