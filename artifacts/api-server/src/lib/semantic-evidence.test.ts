import assert from "node:assert/strict";
import test from "node:test";
import { createDryRunProposal } from "./action-planner.js";
import type { CrawlPageSignal, OpportunityCandidate } from "./opportunity-engine.js";
import { applyProposalQualityGate, evaluateProposalQuality } from "./proposal-quality.js";
import { buildSemanticPageProfile, generateMetaDescriptionFromProfile, type ShopifySemanticResource } from "./semantic-evidence.js";

const page: CrawlPageSignal = {
  pageId: "page-1",
  url: "https://diamondshelf.us/collections/bath-body",
  indexable: true,
  title: "Bath & Body – Diamond Shelf",
  description: null,
  h1: "Bath & Body",
  contentText: "Bath & Body. Filters. Lotion Cream Soap. The Bath & Body collection includes cleansers, lotions, and body-care products organized by product type.",
  links: ["https://diamondshelf.us/products/body-lotion"],
  headings: ["Featured Bath & Body products", "Body lotions"],
  structuredData: [{ "@type": "CollectionPage", description: "The Bath & Body collection presents cleansers, lotions, and body-care products grouped for easier browsing." }],
  internalAnchors: [{ text: "Body lotions", href: "https://diamondshelf.us/collections/body-lotions" }],
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

const shopifyCollection: ShopifySemanticResource = {
  kind: "collection",
  path: "/collections/bath-body",
  title: "Bath & Body",
  description: "The Bath & Body collection features body lotions, cleansers, scrubs, and hand care organized by product type.",
  productCount: 126,
};

test("exact-path Shopify metadata has deterministic priority and provenance", () => {
  const profile = buildSemanticPageProfile({
    page,
    candidate,
    shopifyResources: [shopifyCollection],
    shopifyEvidenceId: "shopify-1",
  });
  assert.equal(profile.candidateSentences[0]?.source, "shopify_collection");
  assert.equal(profile.identity.selected, "Bath & Body");
  assert.equal(profile.composition.productCount, 126);
  assert.deepEqual(profile.conflicts, []);
  assert.ok(profile.provenance.some((entry) => entry.source === "shopify_collection" && entry.evidenceId === "shopify-1" && entry.usedForCopy));
  assert.match(generateMetaDescriptionFromProfile(profile) ?? "", /features body lotions, cleansers, scrubs, and hand care/i);
});

test("structured data outranks semantic body when Shopify description is unavailable", () => {
  const profile = buildSemanticPageProfile({ page, candidate, shopifyResources: [{ ...shopifyCollection, description: null }] });
  assert.equal(profile.candidateSentences[0]?.source, "structured_data");
  assert.match(generateMetaDescriptionFromProfile(profile) ?? "", /presents cleansers, lotions, and body-care products/i);
});

test("conflicting first-party and page identity fails closed", () => {
  const profile = buildSemanticPageProfile({
    page,
    candidate,
    shopifyResources: [{ ...shopifyCollection, title: "Hair Care" }],
    shopifyEvidenceId: "shopify-1",
  });
  assert.deepEqual(profile.conflicts, ["identity_source_conflict"]);
  assert.equal(generateMetaDescriptionFromProfile(profile), null);
  const proposal = createDryRunProposal(candidate, page, ["crawl-1", "shopify-1", "opportunity-1"], profile);
  assert.equal(proposal.expectedOutcome.proposal.afterValue, null);
  assert.equal(proposal.expectedOutcome.proposal.blockedReason, "insufficient_clean_evidence");
});

test("insufficient keyword-list evidence remains a null blocked draft", () => {
  const thinPage = {
    ...page,
    structuredData: [],
    contentText: "Bath Body Lotion Soap Scrub Fragrance Beauty Categories Filters Products.",
  };
  const profile = buildSemanticPageProfile({ page: thinPage, candidate });
  assert.equal(profile.candidateSentences.length, 0);
  const proposal = createDryRunProposal(candidate, thinPage, ["crawl-1", "opportunity-1"], profile);
  assert.equal(proposal.expectedOutcome.lifecycleStage, "draft_dry_run");
  assert.equal(proposal.expectedOutcome.proposal.afterValue, null);
  assert.equal(proposal.expectedOutcome.proposal.blockedReason, "insufficient_clean_evidence");
});

test("residual template chrome never enters a semantic profile proposal", () => {
  const contaminated = {
    ...page,
    structuredData: [],
    contentText: "Diamond Shelf New & trending Categories Fragrance Beauty Bath & Body Fragrance Hair Discover All brands Scent profiles.",
  };
  const profile = buildSemanticPageProfile({ page: contaminated, candidate });
  assert.equal(generateMetaDescriptionFromProfile(profile), null);
  assert.doesNotMatch(JSON.stringify(profile.candidateSentences), /new & trending|discover all brands/i);
});

test("GSC query evidence is provenance-only and never proposal copy", () => {
  const ctrCandidate = {
    ...candidate,
    generationKey: "opportunity_engine_v1:organic_ctr:page-1:query-1",
    opportunityType: "organic_ctr" as const,
    queryId: "query-1",
    query: "lowest price guaranteed body lotion",
  };
  const profile = buildSemanticPageProfile({ page, candidate: ctrCandidate, shopifyResources: [shopifyCollection], gscEvidenceId: "gsc-1" });
  const value = generateMetaDescriptionFromProfile(profile) ?? "";
  assert.ok(profile.provenance.some((entry) => entry.source === "gsc_query" && entry.usedForCopy === false));
  assert.doesNotMatch(value, /lowest price|guaranteed/i);
});

test("product composition is retained without inventing promotional claims", () => {
  const productPage = { ...page, url: "https://diamondshelf.us/products/body-lotion", title: "Daily Body Lotion", h1: "Daily Body Lotion" };
  const product: ShopifySemanticResource = {
    kind: "product",
    path: "/products/body-lotion",
    title: "Daily Body Lotion",
    description: "Daily Body Lotion combines a lightweight lotion texture with a clean finish designed for routine body care.",
    productType: "Body Lotion",
    vendor: "Example Vendor",
    tags: ["body care", "lotion"],
  };
  const profile = buildSemanticPageProfile({ page: productPage, candidate: { ...candidate, pageId: productPage.pageId }, shopifyResources: [product] });
  const value = generateMetaDescriptionFromProfile(profile) ?? "";
  assert.equal(profile.composition.productType, "Body Lotion");
  assert.equal(profile.composition.vendor, "Example Vendor");
  assert.deepEqual(profile.composition.tags, ["body care", "lotion"]);
  assert.doesNotMatch(value, /best|guaranteed|free shipping/i);
});

test("quality gate still blocks duplicates and preserves zero-write invariants", () => {
  const profile = buildSemanticPageProfile({ page, candidate, shopifyResources: [shopifyCollection], shopifyEvidenceId: "shopify-1" });
  const base = createDryRunProposal(candidate, page, ["crawl-1", "shopify-1", "semantic-1", "opportunity-1"], profile);
  const gate = evaluateProposalQuality({
    proposal: base,
    candidate,
    page,
    activeProposalValues: [{ generationKey: "other", value: base.expectedOutcome.proposal.afterValue! }],
    evidence: { crawl: "crawl-1", shopify: "shopify-1", opportunity: "opportunity-1" },
  });
  const gated = applyProposalQualityGate(base, gate, candidate.generationKey);
  assert.equal(gate.checks.find((item) => item.id === "active_set_uniqueness")?.status, "blocked");
  assert.equal(gated.expectedOutcome.lifecycleStage, "draft_dry_run");
  assert.equal(gated.expectedOutcome.executionAuthorized, false);
  assert.equal(gated.expectedOutcome.publicSiteWrites, false);
  assert.equal(gated.expectedOutcome.automaticTransition, false);
});