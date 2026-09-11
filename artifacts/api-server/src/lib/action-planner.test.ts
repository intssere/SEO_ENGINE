import assert from "node:assert/strict";
import test from "node:test";
import { ListActionsResponse } from "@workspace/api-zod";
import { createDryRunProposal, invalidateDryRunProposal, proposalLifecycleStages } from "./action-planner.js";
import type { CrawlPageSignal, OpportunityCandidate } from "./opportunity-engine.js";

const page: CrawlPageSignal = {
  pageId: "page-1", url: "https://diamondshelf.us/products/solitaire-ring", indexable: true,
  title: "Solitaire Diamond Ring", h1: "Solitaire Diamond Ring", description: null,
  contentText: "This solitaire diamond ring pairs a round brilliant diamond with a classic platinum setting for everyday wear.", links: [], evidenceId: "crawl-evidence",
};
const candidate: OpportunityCandidate = {
  generationKey: "opportunity_engine_v1:technical_remediation:finding-1", opportunityType: "technical_remediation",
  pageId: page.pageId, queryId: null, query: null, title: "Meta description is missing", confidence: 0.62, risk: "medium", score: 52,
  scoreComponents: { demand: 15, proximity: 8, confidence: 12, evidence: 10 }, rationale: "Current crawler evidence confirms the missing description.",
  recommendation: "Dry run only.", sourceEvidenceIds: ["crawl-evidence"], metrics: { findingId: "finding-1" },
};

test("metadata proposals use observed page content rather than generic filler", () => {
  const proposal = createDryRunProposal(candidate, page, ["crawl-evidence", "opportunity-signal"]);
  assert.equal(proposal.expectedOutcome.lifecycleStage, "approval_ready");
  assert.equal(proposal.expectedOutcome.proposal.beforeValue, null);
  assert.match(proposal.expectedOutcome.proposal.afterValue ?? "", /solitaire diamond ring/i);
  assert.doesNotMatch(proposal.expectedOutcome.proposal.afterValue ?? "", /discover|learn more|shop now/i);
  assert.deepEqual(proposal.expectedOutcome.proposal.supportingEvidenceIds, ["crawl-evidence", "opportunity-signal"]);
  assert.equal(proposal.expectedOutcome.page.url, page.url);
});

test("planner output is deterministic, reviewable, blocked, and reversible", () => {
  const first = createDryRunProposal(candidate, page, ["opportunity-signal", "crawl-evidence"]);
  const second = createDryRunProposal(candidate, page, ["crawl-evidence", "opportunity-signal"]);
  assert.deepEqual(first, second);
  assert.equal(first.riskLevel, "blocked");
  assert.equal(first.expectedOutcome.executionAuthorized, false);
  assert.equal(first.expectedOutcome.publicSiteWrites, false);
  assert.equal(first.expectedOutcome.automaticTransition, false);
  assert.match(first.expectedOutcome.proposal.rollback, /Restore/i);
});

test("insufficient persisted page evidence stays a blocked draft and never invents a change", () => {
  const proposal = createDryRunProposal(candidate, { ...page, contentText: "", h1: null, title: null }, ["crawl-evidence"]);
  assert.equal(proposal.expectedOutcome.lifecycleStage, "draft_dry_run");
  assert.equal(proposal.expectedOutcome.proposal.evidenceSufficient, false);
  assert.equal(proposal.expectedOutcome.proposal.afterValue, null);
  assert.equal(proposal.expectedOutcome.proposal.blockedReason, "insufficient_persisted_evidence");
});

test("reconciliation invalidates a proposal without authorizing it or discarding its review metadata", () => {
  const ready = createDryRunProposal(candidate, page, ["crawl-evidence", "opportunity-signal"]).expectedOutcome;
  const invalidated = invalidateDryRunProposal(ready, "source_opportunity_stale_or_ineligible");
  assert.equal(invalidated.lifecycleStage, "invalidated");
  assert.equal(invalidated.executionAuthorized, false);
  assert.equal(invalidated.publicSiteWrites, false);
  assert.equal((invalidated.proposal as { afterValue: string }).afterValue, ready.proposal.afterValue);
});

test("lifecycle model distinguishes every guarded proposal phase", () => {
  assert.deepEqual(proposalLifecycleStages, ["draft_dry_run", "approval_ready", "approved_proposal", "executable_action", "executed_change", "verified_result", "invalidated"]);
});

test("proposal API contract exposes review details without execution authority", () => {
  const response = ListActionsResponse.parse({
    readiness: { state: "live" },
    rows: [{
      id: "plan-1", opportunity_id: "opportunity-1", title: "Meta description is missing", opportunity_type: "technical_remediation",
      url: page.url, query: null, score: 52, confidence: 0.62, risk_classification: "medium", lifecycle: "approval_ready",
      plan_status: "pending", dry_run: true, execution_authorized: false, public_site_writes: false,
      action_type: "update_meta_description", field: "meta_description", before_value: null,
      after_value: "This solitaire diamond ring pairs a round brilliant diamond with a classic platinum setting for everyday wear.",
      rationale: "Current crawler evidence confirms the missing description.", expected_benefit: "Address the observed technical metadata gap.",
      rollback: "Restore the observed meta description exactly: (empty value).", evidence_ids: ["crawl-evidence", "opportunity-signal"],
      evidence_count: 2, evidence_sufficient: true, bounded_pilot: true, whole_site_coverage: false, updated_at: "2026-09-11T00:00:00.000Z",
    }],
  });
  assert.equal(response.rows[0]?.execution_authorized, false);
  assert.equal(response.rows[0]?.lifecycle, "approval_ready");
});