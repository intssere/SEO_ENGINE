import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDraftRevision,
  ProposalDecisionError,
  validateProposalDraftState,
  type ProposalDraftInput,
} from "./operational-data.js";

const planId = "11111111-1111-4111-8111-111111111111";
const baseExpected = {
  planner: "dry_run_action_planner_v1",
  lifecycleStage: "approval_ready",
  dryRun: true,
  executionAuthorized: false,
  publicSiteWrites: false,
  automaticTransition: false,
  proposalFingerprint: "proposal-fingerprint",
  proposal: {
    field: "meta_description",
    afterValue: "Generated shopper-facing copy.",
  },
};
const state = {
  status: "pending",
  opportunityStatus: "planned",
  expectedOutcome: baseExpected,
  priorDecisionCount: 0,
};
const input: ProposalDraftInput = {
  mode: "save",
  value: "Edited shopper-facing copy.",
  revisionToken: "proposal-fingerprint",
  fingerprint: "proposal-fingerprint",
  confirmation: `SAVE:${planId}:proposal-fingerprint`,
};

test("editable proposal state preserves all zero-write invariants", () => {
  const result = validateProposalDraftState(state, input);
  assert.equal(result.expected.executionAuthorized, false);
  assert.equal(result.expected.publicSiteWrites, false);
  assert.equal(result.expected.automaticTransition, false);
});

test("decided and stale proposal states fail closed", () => {
  assert.throws(
    () =>
      validateProposalDraftState({ ...state, priorDecisionCount: 1 }, input),
    (error: unknown) =>
      error instanceof ProposalDecisionError &&
      error.category === "proposal_already_decided",
  );
  assert.throws(
    () =>
      validateProposalDraftState(
        { ...state, opportunityStatus: "dismissed" },
        input,
      ),
    (error: unknown) =>
      error instanceof ProposalDecisionError &&
      error.category === "proposal_stale_or_ineligible",
  );
});

test("draft revisions are immutable value snapshots for save and reset", () => {
  const saved = buildDraftRevision(
    input,
    "reviewer name",
    "Generated copy.",
    "Edited copy.",
    "2026-09-11T10:00:00.000Z",
  );
  const reset = buildDraftRevision(
    { ...input, mode: "reset", value: null },
    "reviewer name",
    "Edited copy.",
    "Generated copy.",
    "2026-09-11T10:01:00.000Z",
  );
  assert.deepEqual(
    { mode: saved.mode, value: saved.value, actor: saved.actor },
    { mode: "save", value: "Edited copy.", actor: "reviewername" },
  );
  assert.equal(saved.toFingerprint, reset.fromFingerprint);
  assert.equal(reset.mode, "reset");
  assert.equal(reset.value, "Generated copy.");
  assert.notEqual(saved.fromFingerprint, saved.toFingerprint);
});
