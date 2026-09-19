import assert from "node:assert/strict";
import test from "node:test";
import { buildGovernanceActionCardModel } from "./governance-action-card-model.js";
import {
  buildGovernanceWorkspaceModel,
  type GovernanceOpportunityInput,
  type GovernanceProposalInput,
} from "./governance-workspace-model.js";

const opportunity: GovernanceOpportunityInput = {
  id: "o1",
  title: "Opportunity o1",
  opportunity_type: "content_alignment",
  score: 72,
  confidence: 0.8,
  risk_classification: "medium",
};

const proposal = (overrides: Partial<GovernanceProposalInput> = {}): GovernanceProposalInput => ({
  id: "p1",
  opportunity_id: "o1",
  proposal_fingerprint: "fingerprint-p1",
  lifecycle: "verified_result",
  decision: "approved",
  revision_requested: false,
  evaluatorRisk: "medium",
  planControlRisk: "blocked",
  effectiveExecutionRisk: "medium",
  execution_authorized: false,
  public_site_writes: false,
  quality_status: "pass",
  quality_score: 96,
  quality_approval_eligible: true,
  before_value: "",
  after_value: null,
  evidence_count: 0,
  evidence_sufficient: false,
  confidence: 0.8,
  title: "Proposal p1",
  field: "meta_description",
  action_type: "update",
  url: "https://example.test/p1",
  path: "/p1",
  rationale: "Exact supplied rationale",
  expected_benefit: "Exact supplied expected benefit",
  rollback: "Restore prior value",
  bounded_pilot: true,
  whole_site_coverage: false,
  ...overrides,
});

function rowsFor(p: GovernanceProposalInput = proposal()) {
  return buildGovernanceWorkspaceModel({
    opportunities: [opportunity],
    proposals: [p],
    approvals: [p],
  }).rows;
}

test("P8.2 preserves evidence, risk, preview and rollback-plan facts exactly", () => {
  const model = buildGovernanceActionCardModel(rowsFor());
  assert.equal(model.cards.length, 1);
  const card = model.cards[0];
  assert.equal(card.evidence.count, 0);
  assert.equal(card.evidence.sufficient, false);
  assert.equal(card.evidence.qualityScore, 96);
  assert.equal(card.risk.evaluator, "medium");
  assert.equal(card.risk.planControl, "blocked");
  assert.equal(card.risk.effectiveExecution, "medium");
  assert.equal(card.preview.before, "");
  assert.equal(card.preview.proposed, null);
  assert.equal(card.rollback.plan, "Restore prior value");
  assert.equal(card.rollback.planAvailability, "available");
  assert.equal(card.rollback.statusAvailability, "unavailable");
});

test("P8.2 never turns lifecycle into per-action verification proof", () => {
  const card = buildGovernanceActionCardModel(rowsFor()).cards[0];
  assert.equal(card.recordedLifecycle, "verified_result");
  assert.equal(card.verification.detailAvailability, "unavailable");
  assert.match(card.verification.reason, /not verification proof/);
  assert.equal(card.rollback.statusAvailability, "unavailable");
  assert.equal(card.risk.executionAuthorized, false);
  assert.equal(card.risk.publicSiteWrites, false);
});

test("P8.2 semantics are explicitly read-only and non-authorizing", () => {
  const model = buildGovernanceActionCardModel(rowsFor());
  assert.deepEqual(model.counts, {
    cards: 1,
    verificationDetailUnavailable: 1,
    rollbackPlanAvailable: 1,
  });
  assert.equal(model.semantics.readOnly, true);
  assert.equal(model.semantics.verificationInferredFromLifecycle, false);
  assert.equal(model.semantics.rollbackPlanIsRollbackState, false);
  assert.equal(model.semantics.approvalStateAuthorizesExecution, false);
  assert.equal(model.semantics.executionFlagsAreControls, false);
  assert.equal(model.semantics.allowsExecution, false);
  assert.equal(model.semantics.allowsRollback, false);
  assert.equal(model.semantics.orderingImpliesPriority, false);
});

test("P8.2 model is deterministic, ignores opportunity-only rows, and does not mutate input", () => {
  const p = proposal();
  const workspace = buildGovernanceWorkspaceModel({
    opportunities: [
      opportunity,
      { ...opportunity, id: "o2", title: "Opportunity o2" },
    ],
    proposals: [p],
    approvals: [p],
  });
  const snapshot = structuredClone(workspace.rows);
  const one = buildGovernanceActionCardModel(workspace.rows);
  const two = buildGovernanceActionCardModel([...workspace.rows].reverse());
  assert.equal(one.modelFingerprint, two.modelFingerprint);
  assert.deepEqual(one, two);
  assert.deepEqual(workspace.rows, snapshot);
  assert.equal(one.cards.length, 1);
});

test("P8.2 fails closed on missing proposal card facts and invalid numeric facts", () => {
  const base = rowsFor()[0];
  assert.throws(
    () => buildGovernanceActionCardModel([{ ...base, qualityScore: null }]),
    /p8_2_missing_quality_score/,
  );
  assert.throws(
    () => buildGovernanceActionCardModel([{ ...base, evidenceCount: -1 }]),
    /p8_2_invalid_evidence_count/,
  );
  assert.throws(
    () => buildGovernanceActionCardModel([{ ...base, qualityScore: 101 }]),
    /p8_2_invalid_quality_score/,
  );
});
