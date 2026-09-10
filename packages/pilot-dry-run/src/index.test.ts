import test from "node:test";
import assert from "node:assert/strict";
import { buildDryRunPlan, summarizeDryRun } from "./index.js";

const opportunity = {
  siteId: "site-diamond-shelf",
  opportunityId: "opp-1",
  pageId: "page-1",
  source: "ranking" as const,
  title: "Improve product title CTR",
  score: 88,
  confidence: 0.91,
  evidenceRef: "gsc:query-page:1",
  rationale: { impressions: 8420, position: 8.2 },
};

test("produces a non-executable low-risk dry-run plan with evidence and rollback intent", () => {
  const result = buildDryRunPlan({
    opportunity,
    actionType: "metadata.title",
    target: { productId: "gid://shopify/Product/1" },
    proposedChange: { seoTitle: "Premium Fragrance | Diamond Shelf" },
    expectedState: { seoTitle: "Premium Fragrance | Diamond Shelf" },
    rollbackIntent: { restore: "captured_before_state" },
    evidenceRefs: ["gsc:query-page:1"],
    reversible: true,
  });

  assert.equal(result.status, "ready");
  assert.equal(result.executionEnabled, false);
  assert.equal(result.plan?.riskLevel, "auto");
  assert.equal(result.plan?.expectedOutcome.executionEnabled, false);
  assert.deepEqual(result.evidenceRefs, ["gsc:query-page:1"]);
});

test("blocks proposals that drop the primary opportunity evidence", () => {
  const result = buildDryRunPlan({
    opportunity,
    actionType: "metadata.description",
    target: { productId: "gid://shopify/Product/1" },
    proposedChange: { seoDescription: "Updated description" },
    expectedState: { seoDescription: "Updated description" },
    rollbackIntent: { restore: "captured_before_state" },
    evidenceRefs: ["other:evidence"],
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.plan, null);
  assert.match(result.blockers.join(" "), /preserve the opportunity evidence reference/);
});

test("requires expected verification state and rollback intent", () => {
  const result = buildDryRunPlan({
    opportunity,
    actionType: "metadata.title",
    target: { productId: "gid://shopify/Product/1" },
    proposedChange: { seoTitle: "New title" },
    expectedState: {},
    rollbackIntent: {},
    evidenceRefs: ["gsc:query-page:1"],
  });

  assert.equal(result.status, "blocked");
  assert.match(result.blockers.join(" "), /expectedState/);
  assert.match(result.blockers.join(" "), /rollbackIntent/);
});

test("preserves approval classification for high-risk actions without enabling execution", () => {
  const result = buildDryRunPlan({
    opportunity,
    actionType: "url.change",
    target: { pageId: "page-1" },
    proposedChange: { path: "/new-path" },
    expectedState: { path: "/new-path" },
    rollbackIntent: { restorePath: "/old-path" },
    evidenceRefs: ["gsc:query-page:1"],
    affectsUrl: true,
  });

  assert.equal(result.status, "ready");
  assert.equal(result.executionEnabled, false);
  assert.equal(result.plan?.riskLevel, "approval");
});

test("weak policy tiers remain blocked by the safety engine", () => {
  const result = buildDryRunPlan({
    opportunity,
    actionType: "metadata.title",
    target: { productId: "gid://shopify/Product/1" },
    proposedChange: { seoTitle: "Speculative title" },
    expectedState: { seoTitle: "Speculative title" },
    rollbackIntent: { restore: "captured_before_state" },
    evidenceRefs: ["gsc:query-page:1"],
    policyConfidenceTier: "F",
  });

  assert.equal(result.status, "ready");
  assert.equal(result.plan?.riskLevel, "blocked");
  assert.equal(result.executionEnabled, false);
});

test("summary never reports execution enabled", () => {
  const ready = buildDryRunPlan({
    opportunity,
    actionType: "metadata.title",
    target: { productId: "gid://shopify/Product/1" },
    proposedChange: { seoTitle: "New title" },
    expectedState: { seoTitle: "New title" },
    rollbackIntent: { restore: "captured_before_state" },
    evidenceRefs: ["gsc:query-page:1"],
  });
  const blocked = buildDryRunPlan({
    opportunity,
    actionType: "metadata.title",
    target: {},
    proposedChange: {},
    expectedState: {},
    rollbackIntent: {},
    evidenceRefs: [],
  });

  const summary = summarizeDryRun([ready, blocked]);
  assert.equal(summary.total, 2);
  assert.equal(summary.ready, 1);
  assert.equal(summary.blocked, 1);
  assert.equal(summary.executionEnabled, false);
});
