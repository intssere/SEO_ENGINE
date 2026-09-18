import test from "node:test";
import assert from "node:assert/strict";
import type { DashboardCertification } from "@workspace/api-client-react";
import { buildAuditWorkspaceModel } from "./audit-workspace-model";

function boundedCertification(): DashboardCertification {
  return {
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
    technicalFindings: {
      total: 4,
      withValidEvidence: 4,
      valid: true,
    },
    gscAggregate: {
      status: "available",
      metrics: null,
      reconciliation: {
        status: "aggregate_unavailable",
        detailedClicks: 0,
        detailedImpressions: 0,
        clickCoverage: null,
        impressionCoverage: null,
      },
    },
  };
}

test("bounded certification remains warning and explicitly not whole-site", () => {
  const model = buildAuditWorkspaceModel({
    readiness: { state: "live", message: "ready" },
    certification: boundedCertification(),
  });
  assert.equal(model.coverage.state, "bounded");
  assert.equal(model.coverage.tone, "warning");
  assert.match(model.coverage.detail, /not whole-site/i);
});

test("whole-site success requires explicit wholeSiteCertified true", () => {
  const certification = boundedCertification();
  certification.wholeSiteCertified = true;
  certification.crawlCoverage = {
    ...certification.crawlCoverage,
    fetched: 120,
    discovered: 120,
    percent: 100,
    truncated: false,
  };
  const model = buildAuditWorkspaceModel({ certification });
  assert.equal(model.coverage.state, "whole_site");
  assert.equal(model.coverage.tone, "success");
});

test("technical findings normalize defensively without mutating source rows", () => {
  const rows = [
    {
      id: "f-1",
      title: "Canonical mismatch",
      category: "indexability",
      severity: "HIGH",
      status: "open",
      description: "Declared canonical differs.",
      url: "https://example.com/a",
    },
    { severity: "unexpected", title: "" },
  ];
  const snapshot = structuredClone(rows);
  const model = buildAuditWorkspaceModel({
    readiness: { state: "live", message: "ready" },
    findingRows: rows,
  });
  assert.equal(model.findings.total, 2);
  assert.equal(model.findings.bySeverity.high, 1);
  assert.equal(model.findings.bySeverity.unclassified, 1);
  assert.equal(model.findings.rows[0]?.severityTone, "danger");
  assert.equal(model.findings.rows[1]?.title, "Untitled technical finding");
  assert.deepEqual(rows, snapshot);
});

test("findings never imply full URL inventory completeness", () => {
  const model = buildAuditWorkspaceModel({
    findingRows: [{ id: "f-1", title: "Issue" }],
  });
  assert.match(model.findings.completenessNote, /do not prove/i);
  assert.equal(model.urlExplorer.rows.length, 0);
});

test("URL Explorer dimensions mirror the safe P2.7 contract and remain unbound", () => {
  const model = buildAuditWorkspaceModel({});
  assert.equal(model.urlExplorer.binding, "unavailable");
  assert.deepEqual(model.urlExplorer.retainedColumns, [
    "canonicalUrl",
    "pathname",
    "sourceSitemaps",
    "lastmod",
    "recrawlStatus",
    "recrawlPriority",
    "recrawlReasons",
  ]);
  assert.deepEqual(model.urlExplorer.unavailableDimensions, [
    "httpStatus",
    "fetchOutcome",
    "redirectTarget",
    "canonicalTarget",
    "indexability",
    "contentFingerprint",
  ]);
  assert.match(model.urlExplorer.reason, /no URL rows are synthesized/i);
});

test("crawl history and incremental recrawl remain unavailable, not zero", () => {
  const model = buildAuditWorkspaceModel({});
  assert.equal(model.history.binding, "unavailable");
  assert.equal(model.recrawl.binding, "unavailable");
  assert.match(model.history.reason, /no frontend history snapshot/i);
  assert.match(model.recrawl.reason, /no frontend recrawl plan/i);
});

test("all runtime execution and persistence authorizations stay false", () => {
  const model = buildAuditWorkspaceModel({});
  assert.ok(Object.values(model.authorization).every((value) => value === false));
});

test("unknown readiness fails closed to unavailable", () => {
  const model = buildAuditWorkspaceModel({
    readiness: { state: "mystery", message: "unknown" },
  });
  assert.equal(model.readiness.state, "unavailable");
  assert.equal(model.readiness.tone, "danger");
});
