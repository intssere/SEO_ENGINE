import assert from "node:assert/strict";
import test from "node:test";
import { GetPilotAuthorizationResponse, GetPilotStatusResponse, StartPilotRunResponse } from "@workspace/api-zod";

test("pilot API contracts accept queued, running, completed, partial, and failed states", () => {
  assert.equal(GetPilotAuthorizationResponse.parse({ authorization: "signed-capability" }).authorization, "signed-capability");
  for (const status of ["not_started", "queued", "running", "completed", "partial", "failed"] as const) {
    const parsed = GetPilotStatusResponse.parse({
      runId: status === "not_started" ? null : "run",
      status,
      phase: status,
      readiness: status === "partial" ? "partial" : status === "completed" ? "ready" : "not_evaluated",
      freshness: null,
      blockers: [],
      counts: { products: 0, catalogProducts: 0, productsObserved: 0, shopifyComplete: false, gscRows: 0, gscDetailedRows: 0, ga4Rows: 0, pages: 0, findings: 0, opportunities: 0 },
      diagnostics: {
        shopify: { status: "failed", category: "not_evaluated", httpStatus: null },
        gsc: { status: "failed", category: "not_evaluated", httpStatus: null },
        gscAggregate: { status: "failed", category: "not_evaluated", httpStatus: null },
        ga4: { status: status === "partial" ? "failed" : "available", category: status === "partial" ? "permission_denied" : null, httpStatus: status === "partial" ? 403 : 200 },
        crawl: { status: "failed", category: "not_evaluated", httpStatus: null },
      },
      certification: status === "completed" ? {
        status: "pilot_ready",
        wholeSiteCertified: false,
        wholeSiteReason: "bounded_crawl",
        crawlCoverage: { fetched: 30, discovered: 120, percent: 25, boundedLimit: 30, truncated: true },
        technicalFindings: { total: 15, withValidEvidence: 15, valid: true },
        gscAggregate: { status: "available", metrics: { clicks: 5, impressions: 3160, ctr: 0.002, position: 53.5 }, reconciliation: { status: "partial_dimensional", detailedClicks: 0, detailedImpressions: 2709, clickCoverage: 0, impressionCoverage: 2709 / 3160 } },
      } : null,
      error: status === "failed" ? "pilot_internal_failure" : null,
    });
    assert.equal(parsed.status, status);
  }
  assert.equal(StartPilotRunResponse.parse({ accepted: true, runId: "run", status: "queued", error: null }).status, "queued");
});