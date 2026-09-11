import assert from "node:assert/strict";
import test from "node:test";
import { createDryRunProposal } from "./action-planner.js";
import type { CrawlPageSignal, OpportunityCandidate } from "./opportunity-engine.js";
import { applyProposalQualityGate, evaluateProposalQuality } from "./proposal-quality.js";
import {
  buildSemanticPageProfile,
  generateMetaDescriptionFromProfile,
  hasSafeSnippetIntegrity,
  validateCollectionMembershipCertification,
  type ShopifySemanticResource,
} from "./semantic-evidence.js";

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

test("benign Brands and All Brands identity aliases do not create a conflict", () => {
  const brandsPage = { ...page, url: "https://diamondshelf.us/pages/brands", title: "Brands", h1: "All Brands", contentText: "" };
  const profile = buildSemanticPageProfile({
    page: brandsPage,
    candidate: { ...candidate, pageId: brandsPage.pageId },
    shopifyResources: [{ kind: "page", path: "/pages/brands", title: "Brands", description: null }],
  });
  assert.deepEqual(profile.conflicts, []);
  assert.equal(profile.identity.selected, "Brands");
});

test("benign Scent Profiles identity alias normalizes punctuation and remains page-specific", () => {
  const scentsPage = {
    ...page,
    url: "https://diamondshelf.us/pages/scents",
    title: "Scent Profiles",
    h1: "Find Your Scent Profile",
    structuredData: [],
    contentText: "Diamond Shelf groups the catalog into twelve shopper-friendly scent profiles while preserving each fragrance's detailed family on the product page..",
  };
  const profile = buildSemanticPageProfile({
    page: scentsPage,
    candidate: { ...candidate, pageId: scentsPage.pageId },
    shopifyResources: [{ kind: "page", path: "/pages/scents", title: "Scent Profiles", description: null }],
  });
  const value = generateMetaDescriptionFromProfile(profile) ?? "";
  assert.deepEqual(profile.conflicts, []);
  assert.doesNotMatch(value, /\.\./);
  assert.equal(value, "Diamond Shelf groups the catalog into twelve shopper-friendly scent profiles while preserving each fragrance's detailed family on the product page.");
  assert.equal(hasSafeSnippetIntegrity(value), true);
  assert.ok(profile.confidence >= 0.7);
});

test("Contact legal and trademark copy is excluded from candidates", () => {
  const contactPage = {
    ...page,
    url: "https://diamondshelf.us/pages/contact",
    title: "Contact",
    h1: "Contact",
    structuredData: [],
    contentText: "Brand names and trademarks are the property of their respective owners. All rights reserved.",
  };
  const profile = buildSemanticPageProfile({
    page: contactPage,
    candidate: { ...candidate, pageId: contactPage.pageId },
    shopifyResources: [{ kind: "page", path: "/pages/contact", title: "Contact", description: null }],
  });
  assert.deepEqual(profile.candidateSentences, []);
  assert.equal(generateMetaDescriptionFromProfile(profile), null);
});

test("collection composition requires complete exact-path Shopify membership", () => {
  const members = [
    { path: "/products/body-lotion", title: "Daily Body Lotion", productType: "Body Lotion", tags: ["body care"] },
    { path: "/products/body-scrub", title: "Body Scrub", productType: "Body Scrub", tags: ["body care"] },
    { path: "/products/bath-soak", title: "Mineral Bath Soak", productType: "Bath Soak", tags: ["bath"] },
  ];
  const collection: ShopifySemanticResource = {
    ...shopifyCollection,
    description: null,
    productCount: 3,
    collectionMembership: {
      collectionPath: "/collections/bath-body",
      sourceEndpoint: "/admin/api/2025-10/collections/42/products.json",
      expectedCount: 3,
      observedCount: 3,
      coverageRatio: 1,
      cardinalityValid: true,
      catalogProductCount: 2_997,
      limit: 500,
      complete: true,
      truncated: false,
      suspiciouslyBroad: false,
      members,
    },
  };
  const profile = buildSemanticPageProfile({ page, candidate, shopifyResources: [collection], shopifyEvidenceId: "shopify-1" });
  const value = generateMetaDescriptionFromProfile(profile) ?? "";
  assert.equal(profile.candidateSentences[0]?.source, "shopify_collection_composition");
  assert.deepEqual(profile.composition.categoryTypes, ["Bath Soak", "Body Lotion", "Body Scrub"]);
  assert.equal(profile.composition.matchedProducts, 3);
  assert.equal(profile.composition.membershipComplete, true);
  assert.deepEqual(profile.composition.membershipCertification, {
    collectionPath: "/collections/bath-body",
    sourceEndpoint: "/admin/api/2025-10/collections/42/products.json",
    expectedMemberCount: 3,
    observedMemberCount: 3,
    coverageRatio: 1,
    cardinalityValid: true,
    catalogProductCount: 2_997,
    boundedLimit: 500,
    complete: true,
    truncated: false,
    suspiciouslyBroad: false,
    evidenceId: "shopify-1",
  });
  assert.match(value, /in this Shopify collection/i);
  assert.match(value, /[.!?]$/);
  assert.doesNotMatch(value, /best|premium|guaranteed|free shipping/i);
  assert.ok(profile.provenance.some((entry) => entry.source === "shopify_collection_membership" && entry.field === "exact_collection_membership"));
  assert.ok(profile.provenance.some((entry) => entry.source === "shopify_collection_composition" && entry.usedForCopy));
  const proposal = createDryRunProposal(candidate, page, ["crawl-1", "shopify-1", "semantic-1", "opportunity-1"], profile);
  const gate = evaluateProposalQuality({
    proposal,
    candidate,
    page,
    activeProposalValues: [],
    evidence: { crawl: "crawl-1", shopify: "shopify-1", opportunity: "opportunity-1" },
  });
  assert.equal(gate.status, "pass");
  assert.equal(gate.approvalEligible, true);
  assert.equal(gate.checks.find((item) => item.id === "collection_membership_certification")?.status, "pass");
  const corruptedProposal = structuredClone(proposal);
  corruptedProposal.expectedOutcome.semanticProfile!.composition.membershipCertification!.sourceEndpoint = "";
  const corruptedGate = evaluateProposalQuality({
    proposal: corruptedProposal,
    candidate,
    page,
    activeProposalValues: [],
    evidence: { crawl: "crawl-1", shopify: "shopify-1", opportunity: "opportunity-1" },
  });
  assert.equal(corruptedGate.checks.find((item) => item.id === "collection_membership_certification")?.status, "blocked");
  assert.equal(corruptedGate.approvalEligible, false);
  assert.equal(profile.blockers.length, 0);
});

test("collection membership certification rejects missing or inconsistent evidence and permits explicit null expected count", () => {
  const members = [
    { path: "/products/body-lotion", title: "Body Lotion", productType: "Body Lotion", tags: [] },
    { path: "/products/body-scrub", title: "Body Scrub", productType: "Body Scrub", tags: [] },
  ];
  const valid: NonNullable<ShopifySemanticResource["collectionMembership"]> = {
    collectionPath: "/collections/bath-body",
    sourceEndpoint: "/admin/api/2025-10/collections/42/products.json",
    expectedCount: 2,
    observedCount: 2,
    coverageRatio: 1,
    cardinalityValid: true,
    catalogProductCount: 100,
    limit: 500,
    complete: true,
    truncated: false,
    suspiciouslyBroad: false,
    members,
  };
  const cases: Array<{ name: string; membership: NonNullable<ShopifySemanticResource["collectionMembership"]>; valid: boolean }> = [
    { name: "valid exact membership", membership: valid, valid: true },
    { name: "missing endpoint", membership: { ...valid, sourceEndpoint: "" }, valid: false },
    { name: "missing expected count field", membership: (() => { const value = { ...valid } as Record<string, unknown>; delete value.expectedCount; return value as NonNullable<ShopifySemanticResource["collectionMembership"]>; })(), valid: false },
    { name: "missing observed count field", membership: (() => { const value = { ...valid } as Record<string, unknown>; delete value.observedCount; return value as NonNullable<ShopifySemanticResource["collectionMembership"]>; })(), valid: false },
    { name: "null expected count", membership: { ...valid, expectedCount: null }, valid: true },
    { name: "partial retrieval", membership: { ...valid, expectedCount: 3, observedCount: 2, coverageRatio: 2 / 3, cardinalityValid: false, complete: false, truncated: true }, valid: false },
    { name: "truncated retrieval", membership: { ...valid, complete: false, truncated: true }, valid: false },
    { name: "overbroad counts", membership: { ...valid, expectedCount: 80, observedCount: 80, catalogProductCount: 100, members: Array.from({ length: 80 }, (_, index) => ({ path: `/products/${index}`, title: `Product ${index}`, productType: index % 2 ? "Body Lotion" : "Body Scrub", tags: [] })), suspiciouslyBroad: false }, valid: false },
    { name: "path mismatch", membership: { ...valid, collectionPath: "/collections/other" }, valid: false },
  ];
  for (const item of cases) {
    const profile = buildSemanticPageProfile({
      page: { ...page, structuredData: [], contentText: "" },
      candidate,
      shopifyResources: [{ ...shopifyCollection, description: null, collectionMembership: item.membership }],
      shopifyEvidenceId: "shopify-1",
    });
    const certification = profile.composition.membershipCertification;
    assert.equal(validateCollectionMembershipCertification(certification, "/collections/bath-body").valid, item.valid, item.name);
    assert.equal(profile.candidateSentences.some((candidateSentence) => candidateSentence.source === "shopify_collection_composition"), item.valid, item.name);
    assert.equal(generateMetaDescriptionFromProfile(profile) !== null, item.valid, item.name);
  }
});

test("Task 48 collection paths cannot synthesize from broad catalog similarity", () => {
  const paths = ["beauty", "fragrance", "fragrance-gift-sets", "hair", "home-fragrance", "unisex-fragrance", "womens-fragrance", "bath-body"];
  const broadProducts: ShopifySemanticResource[] = [
    { kind: "product", path: "/products/body-lotion", title: "Fragrance Body Lotion", description: null, productType: "Body Lotion", tags: ["beauty", "hair"] },
    { kind: "product", path: "/products/candle", title: "Home Fragrance Candle", description: null, productType: "Candles", tags: ["fragrance", "gift sets"] },
  ];
  for (const handle of paths) {
    const identity = handle.split("-").map((part) => part[0]!.toUpperCase() + part.slice(1)).join(" ");
    const testPage = { ...page, url: `https://diamondshelf.us/collections/${handle}`, title: identity, h1: identity, structuredData: [], contentText: "" };
    const resource: ShopifySemanticResource = { kind: "collection", path: `/collections/${handle}`, title: identity, description: null };
    const profile = buildSemanticPageProfile({ page: testPage, candidate: { ...candidate, pageId: testPage.pageId }, shopifyResources: [resource, ...broadProducts], shopifyEvidenceId: "shopify-1" });
    assert.equal(profile.candidateSentences.some((item) => item.source === "shopify_collection_composition"), false, handle);
    assert.equal(generateMetaDescriptionFromProfile(profile), null, handle);
  }
});

test("incomplete, mismatched, and suspiciously broad collection membership fails closed", () => {
  const baseMembership: NonNullable<ShopifySemanticResource["collectionMembership"]> = {
    collectionPath: "/collections/bath-body",
    sourceEndpoint: "/admin/api/2025-10/collections/42/products.json",
    expectedCount: 3,
    observedCount: 2,
    coverageRatio: 2 / 3,
    cardinalityValid: false,
    catalogProductCount: 100,
    limit: 2,
    complete: false,
    truncated: true,
    suspiciouslyBroad: false,
    members: [
      { path: "/products/body-lotion", title: "Body Lotion", productType: "Body Lotion", tags: [] },
      { path: "/products/body-scrub", title: "Body Scrub", productType: "Body Scrub", tags: [] },
    ],
  };
  for (const membership of [
    baseMembership,
    { ...baseMembership, collectionPath: "/collections/other", expectedCount: 2, observedCount: 2, complete: true, truncated: false },
    { ...baseMembership, expectedCount: 2, observedCount: 2, complete: true, truncated: false, suspiciouslyBroad: true },
  ]) {
    const profile = buildSemanticPageProfile({
      page: { ...page, structuredData: [], contentText: "" },
      candidate,
      shopifyResources: [{ ...shopifyCollection, description: null, collectionMembership: membership }],
      shopifyEvidenceId: "shopify-1",
    });
    assert.equal(generateMetaDescriptionFromProfile(profile), null);
    assert.equal(profile.composition.categoryTypes.length, 0);
  }
});

test("snippet integrity rejects Task 48 dangling and malformed endings", () => {
  const malformed = [
    "Scent Profiles. Diamond Shelf groups the catalog into twelve shopper-friendly scent profiles while preserving each fragrance's detailed family on the.",
    "Women’s Fragrance includes Body Lotion and Body Mist products represented in the observed Shopify.",
    "Bath & Body includes lotions and cleansers..",
    "Beauty includes cosmetics and eye care products while.",
  ];
  for (const value of malformed) assert.equal(hasSafeSnippetIntegrity(value), false, value);
});