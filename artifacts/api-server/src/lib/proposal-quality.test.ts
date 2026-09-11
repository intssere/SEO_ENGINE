import assert from "node:assert/strict";
import test from "node:test";
import { createDryRunProposal } from "./action-planner.js";
import type { CrawlPageSignal, OpportunityCandidate } from "./opportunity-engine.js";
import { buildPageSpecificMetaDescription, cleanPageEvidence, extractSemanticPageText } from "./proposal-content.js";
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
  assert.equal(result.base.expectedOutcome.lifecycleStage, "draft_dry_run");
  assert.equal(result.gate.status, "pass");
  assert.equal(result.gate.approvalEligible, true);
  assert.ok(result.gate.score >= 70);
  assert.equal(result.proposal.expectedOutcome.lifecycleStage, "approval_ready");
  assert.equal(result.proposal.expectedOutcome.executionAuthorized, false);
  assert.equal(result.proposal.expectedOutcome.publicSiteWrites, false);
  assert.equal(result.proposal.expectedOutcome.automaticTransition, false);
  assert.equal(result.proposal.expectedOutcome.proposal.blockedReason, null);
});

test("final quality gate promotes a preliminary draft without creating execution authority", () => {
  const result = gated();
  assert.equal(result.base.expectedOutcome.lifecycleStage, "draft_dry_run");
  assert.equal(result.proposal.expectedOutcome.lifecycleStage, "approval_ready");
  assert.equal(result.proposal.expectedOutcome.executionAuthorized, false);
  assert.equal(result.proposal.expectedOutcome.publicSiteWrites, false);
  assert.equal(result.proposal.expectedOutcome.automaticTransition, false);
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

test("semantic snippet integrity blocks dangling endings even when evidence is relevant", () => {
  const result = gated({ afterValue: "Classic Solitaire Diamond Ring pairs a round brilliant center diamond with a refined platinum setting designed for the." });
  assert.equal(result.gate.checks.find((item) => item.id === "snippet_integrity")?.status, "blocked");
  assert.equal(result.gate.approvalEligible, false);
  assert.equal(result.proposal.expectedOutcome.lifecycleStage, "draft_dry_run");
});

test("missing required provider evidence blocks product-page approval readiness", () => {
  const result = gated({ evidence: { shopify: undefined } });
  assert.equal(result.gate.checks.find((item) => item.id === "evidence_consistency")?.status, "blocked");
  assert.equal(result.proposal.expectedOutcome.lifecycleStage, "draft_dry_run");
});

test("exact production navigation and promotional patterns hard-block approval", () => {
  const patterns = [
    "Skip to content",
    "FREE SHIPPING $69+",
    "SECURE CHECKOUT",
    "Home Shop",
    "CURATED FRAGRANCE",
    "Diamond Shelf New & trending Categories",
    "Bath &amp; Body",
  ];
  for (const pattern of patterns) {
    const result = gated({ afterValue: `Classic Solitaire Diamond Ring. ${pattern} with a refined platinum setting designed for everyday wear.` });
    assert.equal(result.gate.approvalEligible, false, pattern);
    assert.equal(result.proposal.expectedOutcome.lifecycleStage, "draft_dry_run", pattern);
    assert.ok(
      result.gate.checks.some((item) => item.status === "blocked" && ["template_boilerplate", "format_integrity", "unsupported_claims"].includes(item.id)),
      pattern,
    );
  }
});

test("raw production crawl prefix is cleaned out and cannot become a proposal", () => {
  const contaminatedPage: CrawlPageSignal = {
    ...page,
    title: "Fragrance Gift Sets – Diamond Shelf",
    h1: "Fragrance Gift Sets",
    contentText: "Fragrance Gift Sets – Diamond Shelf Skip to content FREE SHIPPING $69+ · CURATED FRAGRANCE · SECURE CHECKOUT Home Shop Shop Diamond Shelf Shop all New &amp; trending",
  };
  assert.equal(buildPageSpecificMetaDescription(contaminatedPage), null);
  const proposal = createDryRunProposal(candidate, contaminatedPage, ["crawl-1", "shopify-1", "opportunity-1"]);
  assert.equal(proposal.expectedOutcome.proposal.afterValue, null);
  assert.equal(proposal.expectedOutcome.lifecycleStage, "draft_dry_run");
  assert.doesNotMatch(cleanPageEvidence(contaminatedPage.contentText), /skip to content|free shipping|secure checkout|curated fragrance|home shop|&amp;/i);
});

test("clean page-specific evidence regenerates a deterministic metadata proposal", () => {
  const cleanPage: CrawlPageSignal = {
    ...page,
    title: "Classic Solitaire Diamond Ring",
    h1: "Classic Solitaire Diamond Ring",
    contentText: "This classic solitaire ring pairs a round brilliant diamond with a refined platinum setting. Its minimal four-prong profile keeps attention on the center stone.",
  };
  const first = createDryRunProposal(candidate, cleanPage, ["crawl-1", "shopify-1", "opportunity-1"]);
  const second = createDryRunProposal(candidate, cleanPage, ["opportunity-1", "shopify-1", "crawl-1"]);
  assert.equal(first.expectedOutcome.proposal.afterValue, second.expectedOutcome.proposal.afterValue);
  assert.match(first.expectedOutcome.proposal.afterValue ?? "", /Classic Solitaire Diamond Ring/);
  assert.doesNotMatch(first.expectedOutcome.proposal.afterValue ?? "", /skip to content|free shipping|secure checkout|home shop|curated fragrance|&amp;/i);
  const gate = evaluateProposalQuality({
    proposal: first,
    candidate,
    page: cleanPage,
    activeProposalValues: [],
    evidence: { crawl: "crawl-1", shopify: "shopify-1", opportunity: "opportunity-1" },
  });
  assert.equal(gate.status, "pass");
  assert.equal(gate.approvalEligible, true);
});

test("clean regenerated values still enforce duplicate and unsupported-claim blocks", () => {
  const clean = gated();
  const duplicate = gated({ activeProposalValues: [{ generationKey: "another-page", value: clean.base.expectedOutcome.proposal.afterValue! }] });
  assert.equal(duplicate.gate.checks.find((item) => item.id === "active_set_uniqueness")?.status, "blocked");
  const unsupported = gated({ afterValue: "Classic Solitaire Diamond Ring. Guaranteed to be the best conflict-free ring at the lowest price." });
  assert.equal(unsupported.gate.checks.find((item) => item.id === "unsupported_claims")?.status, "blocked");
});

test("HTML entities are decoded from meaningful source evidence but forbidden in output", () => {
  const encodedPage: CrawlPageSignal = {
    ...page,
    title: "Bath & Body Collection",
    h1: "Bath & Body Collection",
    contentText: "The Bath &amp; Body collection includes cleansers, lotions, and body-care products organized by product type. Each collection page presents the currently observed catalog items.",
  };
  const proposal = createDryRunProposal(candidate, encodedPage, ["crawl-1", "shopify-1", "opportunity-1"]);
  const proposed = proposal.expectedOutcome.proposal.afterValue ?? "";
  assert.match(proposed, /Bath & Body/);
  assert.doesNotMatch(proposed, /&amp;/);
  const gate = evaluateProposalQuality({
    proposal,
    candidate,
    page: encodedPage,
    activeProposalValues: [],
    evidence: { crawl: "crawl-1", shopify: "shopify-1", opportunity: "opportunity-1" },
  });
  assert.equal(gate.status, "pass");
});

test("current production residual menu pattern becomes an insufficient-clean-evidence draft", () => {
  const residualPage: CrawlPageSignal = {
    ...page,
    url: "https://diamondshelf.us/collections/trending-now",
    title: "Trending Now – Diamond Shelf",
    h1: "Trending Now",
    contentText: "Trending Now – Diamond Shelf · · Diamond Shelf New & trending Categories Fragrance Beauty Bath & Body Fragrance Hair Discover All brands Scent profiles the latest.",
  };
  const proposal = createDryRunProposal(candidate, residualPage, ["crawl-1", "opportunity-1"]);
  assert.equal(buildPageSpecificMetaDescription(residualPage), null);
  assert.equal(proposal.expectedOutcome.proposal.afterValue, null);
  assert.equal(proposal.expectedOutcome.proposal.blockedReason, "insufficient_clean_evidence");
  assert.equal(proposal.expectedOutcome.lifecycleStage, "draft_dry_run");
});

test("semantic main content wins over header and footer template regions", () => {
  const html = `<header>Diamond Shelf New & trending Categories Fragrance Beauty Bath & Body</header>
    <main><h1>Bath & Body Collection</h1><p>The Bath &amp; Body collection includes cleansers, lotions, and body-care products organized by product type.</p></main>
    <footer>Discover All brands Scent profiles Secure checkout</footer>`;
  const contentText = extractSemanticPageText(html);
  assert.doesNotMatch(contentText, /new & trending|categories|secure checkout|all brands/i);
  assert.match(contentText, /Bath & Body collection includes cleansers/i);
  const collectionPage: CrawlPageSignal = {
    ...page,
    url: "https://diamondshelf.us/collections/bath-body",
    title: "Bath & Body – Diamond Shelf",
    h1: "Bath & Body Collection",
    contentText,
  };
  const proposal = createDryRunProposal(candidate, collectionPage, ["crawl-1", "opportunity-1"]);
  assert.match(proposal.expectedOutcome.proposal.afterValue ?? "", /includes cleansers, lotions, and body-care products/i);
  assert.equal(proposal.expectedOutcome.lifecycleStage, "draft_dry_run");
});

test("collection descriptions require page-specific natural sentences rather than keyword lists", () => {
  const collectionPage: CrawlPageSignal = {
    ...page,
    url: "https://diamondshelf.us/collections/home-fragrance",
    title: "Home Fragrance – Diamond Shelf",
    h1: "Home Fragrance",
    contentText: "Home Fragrance. Fragrance candles diffusers room sprays beauty bath body brands scents profiles.",
  };
  const proposal = createDryRunProposal(candidate, collectionPage, ["crawl-1", "opportunity-1"]);
  assert.equal(proposal.expectedOutcome.proposal.afterValue, null);
  assert.equal(proposal.expectedOutcome.proposal.blockedReason, "insufficient_clean_evidence");
});

test("GSC query evidence never supplies invented meta-description copy", () => {
  const ctrCandidate: OpportunityCandidate = {
    ...candidate,
    generationKey: "opportunity_engine_v1:organic_ctr:page-1:query-1",
    opportunityType: "organic_ctr",
    queryId: "query-1",
    query: "lowest price guaranteed diamond ring",
    title: "Low CTR for an already-ranking query",
  };
  const proposal = createDryRunProposal(ctrCandidate, page, ["crawl-1", "gsc-1", "shopify-1", "opportunity-1"]);
  assert.ok(proposal.expectedOutcome.proposal.afterValue);
  assert.doesNotMatch(proposal.expectedOutcome.proposal.afterValue ?? "", /lowest price|guaranteed/i);
  const gate = evaluateProposalQuality({
    proposal,
    candidate: ctrCandidate,
    page,
    activeProposalValues: [],
    evidence: { crawl: "crawl-1", gsc: "gsc-1", shopify: "shopify-1", opportunity: "opportunity-1" },
  });
  assert.equal(gate.status, "pass");
});