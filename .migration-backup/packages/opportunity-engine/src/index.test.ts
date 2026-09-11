import test from "node:test";
import assert from "node:assert/strict";
import { buildOpportunityQueue, toOpportunityInsert } from "./index.js";

test("combines technical and ranking opportunities into a deterministic prioritized queue", () => {
  const queue = buildOpportunityQueue({
    siteId: "site-1",
    technicalFindings: [{
      siteId: "site-1",
      pageId: "page-1",
      ruleId: "crawl.http_5xx",
      category: "crawl",
      severity: "critical",
      title: "Server error response",
      description: "Page returned HTTP 503.",
      dedupeKey: "tech-1",
    }],
    rankingOpportunities: [{
      type: "striking_distance",
      query: "designer perfume",
      pageUrl: "https://example.com/perfume",
      score: 72,
      confidence: 0.9,
      currentPosition: 8.2,
      currentCtr: 0.02,
      impressions: 1200,
      details: { proximity: 0.7 },
      dedupeKey: "rank-1",
    }],
    businessContext: [
      { pageId: "page-1", commercialValue: 1.2, implementationCost: 1 },
      { pageUrl: "https://example.com/perfume", pageId: "page-2", commercialValue: 1.1, implementationCost: 1 },
    ],
  });

  assert.equal(queue.length, 2);
  assert.equal(queue[0]?.source, "technical");
  assert.equal(queue[0]?.priority, "critical");
  assert.equal(queue[1]?.source, "ranking");
  assert.equal(queue[1]?.pageId, "page-2");
  assert.ok((queue[0]?.score ?? 0) >= (queue[1]?.score ?? 0));
});

test("deduplicates identical source opportunities and produces stable keys", () => {
  const finding = {
    siteId: "site-1",
    pageId: "page-1",
    ruleId: "metadata.missing_title",
    category: "metadata",
    severity: "high" as const,
    title: "Missing title",
    description: "Missing title",
    dedupeKey: "same",
  };
  const first = buildOpportunityQueue({ siteId: "site-1", technicalFindings: [finding, finding] });
  const second = buildOpportunityQueue({ siteId: "site-1", technicalFindings: [finding] });
  assert.equal(first.length, 1);
  assert.equal(first[0]?.dedupeKey, second[0]?.dedupeKey);
});

test("business value and implementation cost affect ranking priority deterministically", () => {
  const ranking = {
    type: "ctr_underperformance" as const,
    query: "luxury fragrance",
    pageUrl: "https://example.com/a",
    score: 60,
    confidence: 0.85,
    currentPosition: 5,
    currentCtr: 0.02,
    impressions: 1000,
    details: {},
    dedupeKey: "r1",
  };
  const lowCost = buildOpportunityQueue({ siteId: "s", rankingOpportunities: [ranking], businessContext: [{ pageUrl: ranking.pageUrl, implementationCost: 0.5 }] });
  const highCost = buildOpportunityQueue({ siteId: "s", rankingOpportunities: [ranking], businessContext: [{ pageUrl: ranking.pageUrl, implementationCost: 2 }] });
  assert.ok((lowCost[0]?.score ?? 0) > (highCost[0]?.score ?? 0));
});

test("maps unified opportunity to persistence shape without executing anything", () => {
  const item = buildOpportunityQueue({
    siteId: "s",
    technicalFindings: [{
      siteId: "s", pageId: null, ruleId: "canonical.missing", category: "canonical", severity: "medium",
      title: "Missing canonical", description: "No canonical", dedupeKey: "k",
    }],
  })[0]!;
  const insert = toOpportunityInsert(item);
  assert.equal(insert.status, "open");
  assert.equal(insert.type, "technical.canonical.missing");
  assert.equal((insert.rationale as { priority: string }).priority, item.priority);
});
