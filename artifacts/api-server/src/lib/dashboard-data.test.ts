import assert from "node:assert/strict";
import test from "node:test";
import { GetDashboardResponse } from "@workspace/api-zod";
import { activeCandidateActivity, dashboardEngineCounts, dashboardOpportunityFromRow, isCurrentOpportunity, pilotCountsFromPayload, selectGscHeadlineMetrics } from "./dashboard-data.js";

test("dashboard distinguishes Shopify catalog total from products observed", () => {
  assert.deepEqual(pilotCountsFromPayload({
    products: 272,
    catalogProducts: 2997,
    productsObserved: 272,
    shopifyComplete: false,
    gscRows: 2088,
    gscDetailedRows: 2088,
    ga4Rows: 0,
    pages: 30,
  }), {
    products: 272,
    catalogProducts: 2997,
    productsObserved: 272,
    shopifyComplete: false,
    gscRows: 2088,
    gscDetailedRows: 2088,
    ga4Rows: 0,
    pages: 30,
    findings: 0,
    opportunities: 0,
  });
});

test("dashboard remains compatible with pre-diagnostic pilot counts", () => {
  assert.deepEqual(pilotCountsFromPayload({ products: 272 }).catalogProducts, 272);
  assert.deepEqual(pilotCountsFromPayload({ products: 272 }).productsObserved, 272);
});

test("dashboard retains the last credible catalog total after a false-zero run", () => {
  assert.deepEqual(pilotCountsFromPayload({
    products: 0,
    catalogProducts: 0,
    productsObserved: 0,
    shopifyComplete: true,
  }, {
    productCount: 2997,
    productsObserved: 272,
    truncated: true,
  }), {
    products: 0,
    catalogProducts: 2997,
    productsObserved: 0,
    shopifyComplete: false,
    gscRows: 0,
    gscDetailedRows: 0,
    ga4Rows: 0,
    pages: 0,
    findings: 0,
    opportunities: 0,
  });
});

test("dashboard headline KPIs use property aggregate without summing incomplete dimensional rows", () => {
  const dimensional = { clicks: 0, impressions: 2709, position: 58.7 };
  const aggregate = { clicks: 5, impressions: 3160, ctr: 0.002, position: 53.5 };
  assert.deepEqual(selectGscHeadlineMetrics(dimensional, aggregate, true), { ...aggregate, source: "property_aggregate" });
  assert.deepEqual(selectGscHeadlineMetrics(dimensional, aggregate, false), { clicks: 0, impressions: 2709, ctr: 0, position: 58.7, source: "dimensional" });
});

test("dashboard current opportunity semantics exclude invalidated and legacy candidates", () => {
  assert.equal(isCurrentOpportunity({ status: "new", engine: "opportunity_engine_v1" }), true);
  assert.equal(isCurrentOpportunity({ status: "accepted", engine: "opportunity_engine_v1" }), true);
  assert.equal(isCurrentOpportunity({ status: "dismissed", engine: "opportunity_engine_v1" }), false);
  assert.equal(isCurrentOpportunity({ status: "new", engine: null }), false);
});

test("dashboard separates blocked dry-run plans from authorized executable actions", () => {
  const counts = dashboardEngineCounts({
    pages_analyzed: 30,
    active_candidates_refreshed: 14,
    dry_run_plans_prepared: 14,
    executable_actions_prepared: 0,
  });
  assert.equal(counts.activeCandidatesRefreshed, 14);
  assert.equal(counts.dryRunPlansPrepared, 14);
  assert.equal(counts.executableActionsPrepared, 0);
  assert.equal(counts.opportunities, 14);
  assert.equal(counts.actionsPrepared, 0);
});

test("recent opportunity activity describes refreshed active candidates rather than creations", () => {
  assert.deepEqual(activeCandidateActivity(2), {
    title: "Active opportunities refreshed",
    detail: "2 active candidates refreshed in the last 24 hours",
    result: "Current queue ranked from persisted evidence",
    tone: "ready",
  });
  assert.equal(activeCandidateActivity(0), null);
});

test("duplicate opportunity titles retain distinct affected-page identity", () => {
  const base = { opportunity_type: "Meta description is missing", score: 46.12, evidence_count: 2, risk_level: "medium", status: "new" };
  const first = dashboardOpportunityFromRow({ ...base, path: "/collections/fragrance", url: "https://diamondshelf.us/collections/fragrance" });
  const second = dashboardOpportunityFromRow({ ...base, path: "/collections/beauty", url: "https://diamondshelf.us/collections/beauty" });
  assert.equal(first.title, second.title);
  assert.notEqual(first.page, second.page);
});

test("dashboard API contract exposes refreshed candidates, plan/action separation, and page identity", () => {
  const engine = GetDashboardResponse.shape.engine.parse({
    pagesAnalyzed: 30,
    activeCandidatesRefreshed: 14,
    dryRunPlansPrepared: 14,
    executableActionsPrepared: 0,
    opportunities: 14,
    actionsPrepared: 0,
    executed: 0,
    verified: 0,
    regressions: 0,
  });
  const opportunity = GetDashboardResponse.shape.opportunities.element.parse({
    title: "Meta description is missing",
    page: "/collections/fragrance",
    score: "46.1",
    evidence: "2 refs",
    risk: "medium",
    state: "new",
  });
  assert.equal(engine.dryRunPlansPrepared, 14);
  assert.equal(engine.executableActionsPrepared, 0);
  assert.equal(opportunity.page, "/collections/fragrance");
});