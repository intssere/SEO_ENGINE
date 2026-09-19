import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGovernanceWorkspaceModel,
  type GovernanceOpportunityInput,
  type GovernanceProposalInput,
} from "./governance-workspace-model.js";

const opportunity = (id: string, overrides: Partial<GovernanceOpportunityInput> = {}): GovernanceOpportunityInput => ({
  id, title: "Opportunity " + id, opportunity_type: "content_alignment",
  score: 72, confidence: 0.8, risk_classification: "medium", ...overrides,
});
const proposal = (id: string, opportunityId: string, overrides: Partial<GovernanceProposalInput> = {}): GovernanceProposalInput => ({
  id, opportunity_id: opportunityId, proposal_fingerprint: "fingerprint-" + id,
  lifecycle: "approval_ready", decision: null, revision_requested: false,
  evaluatorRisk: "medium", planControlRisk: "blocked", effectiveExecutionRisk: "medium",
  execution_authorized: false, public_site_writes: false, quality_status: "pass",
  quality_approval_eligible: true, before_value: "Before", after_value: "After",
  evidence_count: 3, confidence: 0.8, title: "Proposal " + id,
  field: "meta_description", action_type: "update", ...overrides,
});

test("P8.1 reconciliation is deterministic and retains opportunity-only rows", () => {
  const p = proposal("p1", "o1");
  const one = buildGovernanceWorkspaceModel({
    opportunities: [opportunity("o2"), opportunity("o1")], proposals: [p], approvals: [p],
  });
  const two = buildGovernanceWorkspaceModel({
    opportunities: [opportunity("o1"), opportunity("o2")], proposals: [p], approvals: [p],
  });
  assert.equal(one.modelFingerprint, two.modelFingerprint);
  assert.deepEqual(one, two);
  assert.deepEqual(one.rows.map((row) => row.rowId), ["proposal:p1", "opportunity:o2"]);
  assert.deepEqual(one.counts, { opportunities: 2, proposals: 1, pending: 1, recordedReviews: 0 });
});

test("P8.1 projects descriptive approval states without granting authority", () => {
  const opportunities = ["pending", "approved", "rejected", "revision", "not-ready"].map(opportunity);
  const proposals = [
    proposal("p1", "pending"),
    proposal("p2", "approved", { lifecycle: "approved_proposal", decision: "approved" }),
    proposal("p3", "rejected", { decision: "rejected" }),
    proposal("p4", "revision", { decision: "rejected", revision_requested: true }),
    proposal("p5", "not-ready", { lifecycle: "generated", quality_status: "warning", quality_approval_eligible: false }),
  ];
  const model = buildGovernanceWorkspaceModel({ opportunities, proposals, approvals: proposals });
  const states = new Map(model.rows.map((row) => [row.opportunityId, row.approvalState]));
  assert.equal(states.get("pending"), "pending");
  assert.equal(states.get("approved"), "approved");
  assert.equal(states.get("rejected"), "rejected");
  assert.equal(states.get("revision"), "revision_requested");
  assert.equal(states.get("not-ready"), "not_ready");
  assert.equal(model.counts.recordedReviews, 3);
  assert.equal(model.semantics.approvalDisplayIsAuthority, false);
  assert.equal(model.semantics.approvedAuthorizesExecution, false);
});

test("duplicate IDs and dangling lineage fail closed", () => {
  const o = opportunity("o1");
  const p = proposal("p1", "o1");
  assert.throws(() => buildGovernanceWorkspaceModel({ opportunities: [o, o], proposals: [], approvals: [] }), /duplicate_governance_opportunity_id/);
  assert.throws(() => buildGovernanceWorkspaceModel({ opportunities: [o], proposals: [p, p], approvals: [] }), /duplicate_governance_proposal_id/);
  assert.throws(() => buildGovernanceWorkspaceModel({ opportunities: [o], proposals: [], approvals: [p, p] }), /duplicate_governance_approval_id/);
  assert.throws(() => buildGovernanceWorkspaceModel({ opportunities: [o], proposals: [proposal("x", "missing")], approvals: [] }), /governance_missing_opportunity/);
});

test("same proposal ID conflict fails closed instead of choosing a source winner", () => {
  const p = proposal("p1", "o1");
  assert.throws(() => buildGovernanceWorkspaceModel({
    opportunities: [opportunity("o1")], proposals: [p],
    approvals: [{ ...p, effectiveExecutionRisk: "high" }],
  }), /governance_control_lineage_conflict/);
  assert.throws(() => buildGovernanceWorkspaceModel({
    opportunities: [opportunity("o1")], proposals: [p],
    approvals: [{ ...p, after_value: "Different" }],
  }), /governance_projected_field_conflict/);
});

test("canonical order is serialization only", () => {
  const model = buildGovernanceWorkspaceModel({
    opportunities: [opportunity("z", { score: 99 }), opportunity("a", { score: 10 })],
    proposals: [], approvals: [],
  });
  assert.deepEqual(model.rows.map((row) => row.opportunityId), ["a", "z"]);
  assert.equal(model.semantics.orderingImpliesPriority, false);
  assert.equal(model.semantics.executionAuthorizedIsControl, false);
  assert.equal(model.semantics.publicSiteWritesIsPermissionGrant, false);
});
