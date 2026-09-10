import test from "node:test";
import assert from "node:assert/strict";
import { runPilotOpportunityQueue } from "./index.js";

test("blocks when baseline is not certified", () => {
  const result = runPilotOpportunityQueue({ siteId: "diamond-shelf", baselineCertified: false });
  assert.equal(result.status, "blocked");
  assert.match(result.blockers.join(" "), /baseline must be certified/i);
});

test("blocks when public writes are enabled", () => {
  const result = runPilotOpportunityQueue({
    siteId: "diamond-shelf",
    baselineCertified: true,
    publicSiteWritesEnabled: true,
  });
  assert.equal(result.status, "blocked");
  assert.match(result.blockers.join(" "), /writes disabled/i);
});

test("combines technical, ranking, internal-link and AI visibility signals deterministically", () => {
  const result = runPilotOpportunityQueue({
    siteId: "diamond-shelf",
    baselineCertified: true,
    technicalFindings: [{
      siteId: "diamond-shelf",
      pageId: "p1",
      ruleId: "missing_meta_description",
      category: "metadata",
      severity: "high",
      title: "Missing meta description",
      description: "Product page has no meta description.",
      dedupeKey: "tech-1",
    }],
    rankingOpportunities: [{
      type: "striking_distance",
      query: "luxury perfume",
      pageUrl: "https://diamondshelf.us/products/a",
      score: 72,
      confidence: 0.9,
      currentPosition: 8.2,
      currentCtr: 0.02,
      impressions: 2200,
      details: { targetBand: "6-20" },
      dedupeKey: "rank-1",
    }],
    supplementalSignals: [
      {
        source: "internal_link",
        title: "Strengthen links to high-value collection",
        score: 80,
        confidence: 0.87,
        evidenceRef: "link-1",
        rationale: { target: "/collections/womens-fragrance" },
      },
      {
        source: "ai_visibility",
        title: "Brand mentioned but not cited",
        score: 66,
        confidence: 0.82,
        evidenceRef: "ai-1",
        rationale: { provider: "sample-provider" },
      },
    ],
  });

  assert.equal(result.status, "ready");
  assert.equal(result.summary.total, 4);
  assert.deepEqual(result.summary.bySource, {
    technical: 1,
    ranking: 1,
    internal_link: 1,
    ai_visibility: 1,
  });
  assert.equal(result.candidates[0]?.source, "internal_link");
  assert.ok(result.candidates.every((item) => item.evidenceRef.length > 0));
});
