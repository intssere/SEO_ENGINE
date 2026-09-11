import assert from "node:assert/strict";
import test from "node:test";
import { DecideApprovalResponse } from "@workspace/api-zod";
import {
  buildProposalReviewDecision,
  decideProposalReview,
  ProposalDecisionError,
  validateProposalDecisionState,
  type ProposalDecisionInput,
} from "./operational-data.js";

const approvedInput: ProposalDecisionInput = { decision: "approved", confirmation: "APPROVE:plan" };
const safeExpected = {
  lifecycleStage: "approval_ready",
  dryRun: true,
  executionAuthorized: false,
  publicSiteWrites: false,
  qualityGate: { status: "pass", score: 94, approvalEligible: true, blockingReasons: [] },
};
const state = { status: "pending", opportunityStatus: "new", expectedOutcome: safeExpected, priorDecisionCount: 0 };

test("quality-passing proposal accepts an explicit non-executable approval decision", () => {
  const result = validateProposalDecisionState(state, approvedInput);
  assert.equal(result.lifecycle, "approval_ready");
  assert.equal(result.qualityEligible, true);
  const audit = buildProposalReviewDecision(approvedInput, "same_origin_reviewer", result.lifecycle, result.quality, "2026-09-11T00:00:00.000Z");
  assert.equal(audit.decision, "approved");
  assert.equal(audit.executionAuthorized, false);
  assert.equal(audit.publicSiteWrites, false);
  assert.equal(audit.qualityScore, 94);
});

test("blocking quality result prevents approval", () => {
  const blocked = {
    ...state,
    expectedOutcome: {
      ...safeExpected,
      lifecycleStage: "draft_dry_run",
      qualityGate: { status: "blocked", score: 62, approvalEligible: false, blockingReasons: ["unsupported_claims"] },
    },
  };
  assert.throws(
    () => validateProposalDecisionState(blocked, approvedInput),
    (error: unknown) => error instanceof ProposalDecisionError && error.category === "proposal_quality_blocked",
  );
});

test("stale or invalidated proposal cannot receive any new decision", () => {
  assert.throws(
    () => validateProposalDecisionState({ ...state, opportunityStatus: "dismissed" }, { decision: "rejected", confirmation: "REJECT:plan", reason: "Stale." }),
    (error: unknown) => error instanceof ProposalDecisionError && error.category === "proposal_stale_or_ineligible",
  );
});

test("rejection audit metadata preserves history and explicit revision request", () => {
  const input: ProposalDecisionInput = { decision: "rejected", confirmation: "REJECT:plan", reason: "Revise the unsupported wording.", requestRevision: true };
  const result = validateProposalDecisionState(state, input);
  const audit = buildProposalReviewDecision(input, "reviewer-1", result.lifecycle, result.quality, "2026-09-11T00:00:00.000Z");
  assert.equal(audit.decision, "rejected");
  assert.equal(audit.revisionRequested, true);
  assert.equal(audit.reason, "Revise the unsupported wording.");
  assert.equal(audit.executionAuthorized, false);
  assert.equal(audit.publicSiteWrites, false);
});

test("previously decided proposal cannot be implicitly or repeatedly approved", () => {
  assert.throws(
    () => validateProposalDecisionState({ ...state, status: "completed", priorDecisionCount: 1 }, approvedInput),
    (error: unknown) => error instanceof ProposalDecisionError && error.category === "proposal_already_decided",
  );
});

test("proposal decision requires the exact per-proposal confirmation", async () => {
  await assert.rejects(
    () => decideProposalReview("11111111-1111-4111-8111-111111111111", { decision: "approved", confirmation: "APPROVE:wrong-plan" }, "reviewer"),
    (error: unknown) => error instanceof ProposalDecisionError && error.category === "explicit_confirmation_required",
  );
});

test("approval response contract cannot represent an executable or public-site write", () => {
  const response = DecideApprovalResponse.parse({
    id: "approval-1",
    action_plan_id: "plan-1",
    decision: "approved",
    lifecycle: "approved_proposal",
    actor_id: "reviewer-1",
    reason: null,
    decided_at: "2026-09-11T00:00:00.000Z",
    revision_requested: false,
    execution_authorized: false,
    public_site_writes: false,
  });
  assert.equal(response.execution_authorized, false);
  assert.equal(response.public_site_writes, false);
});