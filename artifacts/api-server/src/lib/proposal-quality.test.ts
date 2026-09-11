import assert from "node:assert/strict";
import test from "node:test";
import { createDryRunProposal } from "./action-planner.js";
import type { CrawlPageSignal, OpportunityCandidate } from "./opportunity-engine.js";
import { applyProposalQualityGate, evaluateProposalQuality } from "./proposal-quality.js";

const page: CrawlPageSignal = {
  pageId: "page-1",
  url: "https://diamondshelf.us/products/classic-solitaire-ring",
  indexable: true,
  title: "Classic Solitaire Diamond Ring",
  description: null,
  h1: "Classic Solitaire Diamond Ring",
  contentText: "A classic solitaire diamond ring pairs a round brilliant center diamond with a refined platinum setting designed for everyday wear.",
  links: [],
  evidenceId: "crawl-1",
};
const candidate: OpportunityCandidate = {
  generationKey: "opportunity_engine_v1:technical_remediation:finding-1",
  opportunityType: "technical_remediation",
  pageId: page.pageId,
  queryId: null,
  query: null,
  title: "Meta description is missing",
  confidence: 0.82,
  risk: "medium",
  score: 72,
  scoreComponents: { demand: 10, proximity: 10, confidence: 20, evidence: 20 },
  rationale: "Current crawl evidence confirms a missing meta description.",
  recommendation: "Prepare a reviewed dry-run description.",
  sourceEvidenceIds: ["crawl-1"],
  metrics: { findingId: "finding-1" },
};

function gated(overrides: {
  afterValue?: string;
  activeProposalValues?: Array<{ generationKey: string; value: string }>;
  evidence?: Partial<{ crawl: string; shopify: string; gsc: string; opportunity: string }>;
} = {}) {
  const base = createDryRunProposal(candidate, page, ["crawl-1", "shopify-1", "opportunity-1"]);
  if (overrides.afterValue !== undefined) base.expectedOutcome.proposal.afterValue = overrides.afterValue;
  const gate = evaluateProposalQuality({
    proposal: base,
    candidate,
    page,
    activeProposalValues: overrides.activeProposalValues ?? [],
    evidence: { crawl: "crawl-1", shopify: "shopify-1", opportunity: "opportunity-1", ...overrides.evidence },
  });
  return { base, gate, proposal: applyProposalQualityGate(base, gate, candidate.generationKey) };
}

test("evidence-grounded relevant proposal passes deterministic quality scoring", () => {
  const result = gated();
  assert.equal(result.gate.status, "pass");
  assert.equal(result.gate.approvalEligible, true);
  assert.ok(result.gate.score >= 70);
  assert.equal(result.proposal.expectedOutcome.lifecycleStage, "approval_ready");
  assert.equal(result.proposal.expectedOutcome.executionAuthorized, false);
  assert.equal(result.proposal.expectedOutcome.publicSiteWrites, false);
});

test("duplicate proposed values across the active set are blocked", () => {
  const base = gated();
  const result = gated({ activeProposalValues: [{ generationKey: "other", value: base.base.expectedOutcome.proposal.afterValue! }] });
  assert.equal(result.gate.checks.find((item) => item.id === "active_set_uniqueness")?.status, "blocked");
  assert.equal(result.gate.approvalEligible, false);
  assert.equal(result.proposal.expectedOutcome.lifecycleStage, "draft_dry_run");
});

test("unsupported promotional claims fail closed", () => {
  const result = gated({ afterValue: "The best guaranteed conflict-free solitaire diamond ring with free shipping for every customer." });
  assert.equal(result.gate.checks.find((item) => item.id === "unsupported_claims")?.status, "blocked");
  assert.ok(result.gate.blockingReasons.some((reason) => reason.startsWith("unsupported_claims:")));
});

test("snippet length and page relevance block malformed proposals", () => {
  const short = gated({ afterValue: "Great diamond ring." });
  assert.equal(short.gate.checks.find((item) => item.id === "snippet_length")?.status, "blocked");
  const irrelevant = gated({ afterValue: "Comprehensive accounting software automates quarterly payroll reporting for distributed companies worldwide." });
  assert.equal(irrelevant.gate.checks.find((item) => item.id === "page_relevance")?.status, "blocked");
});

test("missing required provider evidence blocks product-page approval readiness", () => {
  const result = gated({ evidence: { shopify: undefined } });
  assert.equal(result.gate.checks.find((item) => item.id === "evidence_consistency")?.status, "blocked");
  assert.equal(result.proposal.expectedOutcome.lifecycleStage, "draft_dry_run");
});