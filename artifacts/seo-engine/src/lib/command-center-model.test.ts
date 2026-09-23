import test from "node:test";
import assert from "node:assert/strict";
import type { DashboardSnapshot } from "@workspace/api-client-react";
import { buildCommandCenterModel } from "./command-center-model";

function fixture(overrides: Partial<DashboardSnapshot> = {}): DashboardSnapshot {
  return {
    state: "live",
    reason: null,
    siteName: "Diamond Shelf",
    domain: "diamondshelf.us",
    generatedAt: "2026-09-18T00:00:00.000Z",
    dataFreshness: "2026-09-18T00:00:00.000Z",
    stale: false,
    approvalsPending: 0,
    metrics: [],
    engine: {
      pagesAnalyzed: 30,
      activeCandidatesRefreshed: 2,
      dryRunPlansPrepared: 2,
      executableActionsPrepared: 0,
      opportunities: 2,
      actionsPrepared: 0,
      executed: 0,
      verified: 0,
      regressions: 0,
    },
    opportunities: [
      {
        title: "Improve title",
        page: "/a",
        score: "80",
        evidence: "2 refs",
        risk: "low",
        state: "new",
      },
    ],
    activity: [],
    verification: {
      verified: 0,
      total: 0,
      pending: 0,
      rolledBack: 0,
      regressions: 0,
    },
    aiVisibility: {
      citationRate: "—",
      brandMentionRate: "—",
      citationShare: "—",
    },
    learning: { signalCount: 0, averageConfidence: "—" },
    impact: {
      verifiedOptimizations: 0,
      completedExperiments: 0,
      rollbacks: 0,
      regressionsDetected: 0,
    },
    pilot: {
      status: "completed",
      readiness: "ready",
      phase: "completed",
      freshness: "2026-09-18T00:00:00.000Z",
      blockers: [],
      counts: {
        products: 30,
        catalogProducts: 3000,
        productsObserved: 30,
        shopifyComplete: false,
        gscRows: 20,
        gscDetailedRows: 20,
        ga4Rows: 0,
        pages: 30,
        findings: 4,
        opportunities: 1,
      },
      diagnostics: {
        shopify: { status: "available", category: null, httpStatus: null },
        gsc: { status: "available", category: null, httpStatus: null },
        gscAggregate: { status: "available", category: null, httpStatus: null },
        ga4: { status: "empty", category: null, httpStatus: null },
        crawl: { status: "available", category: null, httpStatus: null },
      },
      certification: {
        status: "pilot_ready",
        wholeSiteCertified: false,
        wholeSiteReason: "bounded_crawl",
        crawlCoverage: {
          fetched: 30,
          discovered: 120,
          percent: 25,
          boundedLimit: 30,
          truncated: true,
        },
        technicalFindings: { total: 4, withValidEvidence: 4, valid: true },
        gscAggregate: {
          status: "available",
          metrics: { clicks: 5, impressions: 3000, ctr: 0.002, position: 50 },
          reconciliation: {
            status: "reconciled",
            detailedClicks: 5,
            detailedImpressions: 3000,
            clickCoverage: 1,
            impressionCoverage: 1,
          },
        },
      },
    },
    ...overrides,
  } as DashboardSnapshot;
}

test("live fresh data is healthy but bounded coverage remains warning", () => {
  const model = buildCommandCenterModel(fixture());
  assert.equal(model.dataState.tone, "success");
  assert.equal(model.coverageState.tone, "warning");
  assert.equal(model.isBoundedCoverage, true);
  assert.match(model.coverageState.label, /bounded/i);
});

test("stale live data is warning, not success", () => {
  const model = buildCommandCenterModel(fixture({ stale: true }));
  assert.equal(model.dataState.tone, "warning");
  assert.match(model.dataState.label, /stale/i);
});

test("unavailable dashboard fails visibly closed", () => {
  const model = buildCommandCenterModel(
    fixture({
      state: "unavailable",
      reason: "Production reads disabled",
      stale: false,
    }),
  );
  assert.equal(model.dataState.tone, "danger");
  assert.equal(model.dataState.detail, "Production reads disabled");
});

test("whole-site certification is the only successful coverage state", () => {
  const base = fixture();
  const model = buildCommandCenterModel(
    fixture({
      pilot: {
        ...base.pilot,
        certification: {
          ...base.pilot.certification,
          wholeSiteCertified: true,
          crawlCoverage: {
            ...base.pilot.certification.crawlCoverage,
            fetched: 120,
            discovered: 120,
            percent: 100,
            truncated: false,
          },
        },
      },
    }),
  );
  assert.equal(model.coverageState.tone, "success");
  assert.equal(model.isBoundedCoverage, false);
});

test("pending approvals are surfaced as human-review warning", () => {
  const model = buildCommandCenterModel(fixture({ approvalsPending: 3 }));
  const card = model.cards.find((item) => item.id === "decisions");
  assert.equal(card?.tone, "warning");
  assert.equal(card?.href, "/automation");
  assert.match(card?.detail ?? "", /waiting for review/i);
});

test("regressions fail verification and measurement states visibly", () => {
  const model = buildCommandCenterModel(
    fixture({
      verification: {
        verified: 4,
        total: 5,
        pending: 0,
        rolledBack: 0,
        regressions: 1,
      },
      impact: {
        verifiedOptimizations: 4,
        completedExperiments: 1,
        rollbacks: 0,
        regressionsDetected: 1,
      },
    }),
  );
  assert.equal(
    model.cards.find((item) => item.id === "verification")?.tone,
    "danger",
  );
  assert.equal(
    model.cards.find((item) => item.id === "measurement")?.tone,
    "danger",
  );
  assert.equal(model.verificationPercent, 80);
});

test("zero AI and learning observations stay neutral instead of success", () => {
  const model = buildCommandCenterModel(fixture());
  const card = model.cards.find((item) => item.id === "intelligence");
  assert.equal(model.hasAiVisibility, false);
  assert.equal(model.hasLearningSignals, false);
  assert.equal(card?.tone, "neutral");
  assert.match(card?.value ?? "", /no persisted/i);
});

test("persisted AI or learning signals become informational, not health success", () => {
  const model = buildCommandCenterModel(
    fixture({
      aiVisibility: {
        citationRate: "12%",
        brandMentionRate: "20%",
        citationShare: "8%",
      },
      learning: { signalCount: 4, averageConfidence: "81%" },
    }),
  );
  const card = model.cards.find((item) => item.id === "intelligence");
  assert.equal(card?.tone, "info");
  assert.equal(model.hasAiVisibility, true);
  assert.equal(model.hasLearningSignals, true);
});
