import assert from "node:assert/strict";
import test from "node:test";
import {
  dryRunActionPlan,
  generateOpportunityCandidates,
  opportunityConfidence,
  reconcileManagedOpportunities,
  scoreOpportunity,
  type OpportunityEngineInput,
} from "./opportunity-engine.js";

const page = {
  pageId: "page-1",
  url: "https://diamondshelf.us/rings",
  indexable: true,
  title: "Diamond Rings",
  description: "Explore diamond rings and wedding jewelry.",
  h1: "Diamond Rings",
  contentText: "Shop diamond rings and wedding jewelry.",
  links: [] as string[],
  evidenceId: "evidence-page-1",
};

function input(overrides: Partial<OpportunityEngineInput> = {}): OpportunityEngineInput {
  return {
    pilotReady: true,
    aggregateAvailable: true,
    reconciliation: "consistent",
    crawl: { fetched: 30, discovered: 120, boundedLimit: 30, truncated: true },
    gsc: [],
    crawlPages: [page],
    technicalFindings: [],
    ...overrides,
  };
}

test("CTR and striking-distance opportunities are mutually separated by ranking range", () => {
  const candidates = generateOpportunityCandidates(input({
    gsc: [
      { pageId: "page-1", queryId: "ctr", query: "diamond rings", url: page.url, clicks: 1, impressions: 100, ctr: 0.01, position: 7 },
      { pageId: "page-1", queryId: "rank", query: "engagement rings", url: page.url, clicks: 1, impressions: 100, ctr: 0.01, position: 14 },
      { pageId: "page-1", queryId: "far", query: "wedding rings", url: page.url, clicks: 0, impressions: 100, ctr: 0, position: 42 },
    ],
  }));
  assert.equal(candidates.some((item) => item.opportunityType === "organic_ctr" && item.queryId === "ctr"), true);
  assert.equal(candidates.some((item) => item.opportunityType === "organic_ctr" && item.queryId === "rank"), false);
  assert.equal(candidates.some((item) => item.opportunityType === "striking_distance" && item.queryId === "rank"), true);
  assert.equal(candidates.some((item) => item.queryId === "far"), false);
});

test("opportunity discovery fails closed without pilot-ready aggregate context", () => {
  const signal = [{ pageId: "page-1", queryId: "q", query: "diamond rings", url: page.url, clicks: 0, impressions: 100, ctr: 0, position: 7 }];
  assert.deepEqual(generateOpportunityCandidates(input({ pilotReady: false, gsc: signal })), []);
  assert.deepEqual(generateOpportunityCandidates(input({ aggregateAvailable: false, gsc: signal })), []);
  assert.deepEqual(generateOpportunityCandidates(input({ reconciliation: "inconsistent", gsc: signal })), []);
});

test("technical and internal-link opportunities require matching crawl evidence", () => {
  const source = { ...page, pageId: "page-2", url: "https://diamondshelf.us/guides", evidenceId: "evidence-page-2", contentText: "How to select engagement rings.", links: [] };
  const candidates = generateOpportunityCandidates(input({
    crawlPages: [page, source],
    gsc: [{ pageId: "page-1", queryId: "q", query: "engagement rings", url: page.url, clicks: 1, impressions: 80, ctr: 0.0125, position: 12 }],
    technicalFindings: [{ findingId: "finding-1", pageId: "page-1", title: "Missing description", severity: "medium", evidenceId: "evidence-page-1" }],
  }));
  const internal = candidates.find((item) => item.opportunityType === "internal_link");
  const technical = candidates.find((item) => item.opportunityType === "technical_remediation");
  assert.deepEqual(internal?.sourceEvidenceIds, ["evidence-page-1", "evidence-page-2"]);
  assert.deepEqual(technical?.sourceEvidenceIds, ["evidence-page-1"]);
  assert.equal(generateOpportunityCandidates(input({ technicalFindings: [{ findingId: "orphan", pageId: "missing", title: "Orphan", severity: "high", evidenceId: "e" }] })).length, 0);
});

test("non-indexable and utility pages fail closed for every opportunity class", () => {
  const variants = [
    { ...page, indexable: false },
    { ...page, url: "https://diamondshelf.us/customer_authentication/redirect" },
    { ...page, url: "https://diamondshelf.us/account/login" },
    { ...page, url: "https://diamondshelf.us/cart" },
    { ...page, url: "https://diamondshelf.us/checkout" },
    { ...page, url: "https://diamondshelf.us/search?q=diamond" },
  ];
  for (const blockedPage of variants) {
    const candidates = generateOpportunityCandidates(input({
      crawlPages: [blockedPage],
      gsc: [{ pageId: blockedPage.pageId, queryId: "q", query: "diamond rings", url: blockedPage.url, clicks: 0, impressions: 100, ctr: 0, position: 7 }],
      technicalFindings: [{ findingId: "finding", pageId: blockedPage.pageId, title: "Page title is missing", severity: "medium", evidenceId: blockedPage.evidenceId }],
    }));
    assert.deepEqual(candidates, [], blockedPage.url);
  }
});

test("utility-page candidates become stale while historical rows remain untouched", () => {
  const result = reconcileManagedOpportunities([
    { id: "utility-active", status: "new", generationKey: "opportunity_engine_v1:technical_remediation:utility-finding" },
    { id: "valid-active", status: "accepted", generationKey: "opportunity_engine_v1:technical_remediation:valid-finding" },
    { id: "utility-history", status: "dismissed", generationKey: "opportunity_engine_v1:technical_remediation:old-utility" },
  ], [{
    generationKey: "opportunity_engine_v1:technical_remediation:valid-finding",
    opportunityType: "technical_remediation",
    pageId: "page-1",
    queryId: null,
    query: null,
    title: "Missing description",
    confidence: 0.5,
    risk: "medium",
    score: 40,
    scoreComponents: { demand: 10, proximity: 10, confidence: 10, evidence: 10 },
    rationale: "Valid page evidence.",
    recommendation: "Dry run.",
    sourceEvidenceIds: ["evidence"],
    metrics: {},
  }]);
  assert.deepEqual(result, { retainedIds: ["valid-active"], staleIds: ["utility-active"] });
});

test("managed opportunity reconciliation identifies stale candidates without rewriting history", () => {
  const candidates = generateOpportunityCandidates(input({
    gsc: [{ pageId: "page-1", queryId: "q", query: "diamond rings", url: page.url, clicks: 0, impressions: 100, ctr: 0, position: 7 }],
  }));
  const currentKey = candidates.find((item) => item.opportunityType === "organic_ctr")!.generationKey;
  assert.deepEqual(reconcileManagedOpportunities([
    { id: "keep", status: "accepted", generationKey: currentKey },
    { id: "stale", status: "new", generationKey: "opportunity_engine_v1:organic_ctr:old" },
    { id: "history", status: "dismissed", generationKey: "opportunity_engine_v1:organic_ctr:older" },
  ], candidates), { retainedIds: ["keep"], staleIds: ["stale"] });
});

test("scoring is deterministic and confidence is reduced by bounded crawl and partial dimensional coverage", () => {
  const first = scoreOpportunity({ impressions: 100, position: 12, confidence: 0.8, evidenceCount: 2 });
  const second = scoreOpportunity({ impressions: 100, position: 12, confidence: 0.8, evidenceCount: 2 });
  assert.deepEqual(first, second);
  const consistent = opportunityConfidence(input(), 0.96);
  const partial = opportunityConfidence(input({ reconciliation: "partial_dimensional" }), 0.96);
  assert.ok(consistent < 0.96);
  assert.ok(partial < consistent);
});

test("action plans are blocked dry runs and never execution-authorized", () => {
  const candidate = generateOpportunityCandidates(input({
    gsc: [{ pageId: "page-1", queryId: "q", query: "diamond rings", url: page.url, clicks: 0, impressions: 100, ctr: 0, position: 7 }],
  })).find((item) => item.opportunityType === "organic_ctr")!;
  assert.deepEqual(dryRunActionPlan(candidate), {
    status: "pending",
    riskLevel: "blocked",
    rationale: candidate.recommendation,
    expectedOutcome: {
      dryRun: true,
      executionAuthorized: false,
      publicSiteWrites: false,
      opportunityType: "organic_ctr",
      riskClassification: "low",
      confidence: candidate.confidence,
      recommendation: candidate.recommendation,
    },
  });
});