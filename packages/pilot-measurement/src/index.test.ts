import test from "node:test";
import assert from "node:assert/strict";
import { measureControlledPilot } from "./index.js";

const definition = {
  siteId: "site-1",
  name: "Product title optimization",
  hypothesis: "A clearer title improves organic clicks relative to a comparable control page.",
  metric: "organic_clicks",
  baseline: { start: "2026-08-01T00:00:00Z", end: "2026-08-07T23:59:59Z" },
  measurement: { start: "2026-08-15T00:00:00Z", end: "2026-08-21T23:59:59Z" },
  minPagesPerCohort: 1,
  neutralThreshold: 0.1,
};

function baseInput() {
  return {
    siteId: "site-1",
    siteDomain: "diamondshelf.us",
    experimentId: "exp-1",
    deploymentId: "dep-1",
    treatmentPageId: "page-treatment",
    controlPageIds: ["page-control"],
    deploymentStatus: "completed" as const,
    verificationStatus: "verified" as const,
    definition,
    metricSource: "gsc" as const,
    publicSiteWritesEnabled: false,
    observations: [
      { pageId: "page-treatment", observedAt: "2026-08-03T00:00:00Z", value: 10 },
      { pageId: "page-treatment", observedAt: "2026-08-18T00:00:00Z", value: 16 },
      { pageId: "page-control", observedAt: "2026-08-03T00:00:00Z", value: 10 },
      { pageId: "page-control", observedAt: "2026-08-18T00:00:00Z", value: 11 },
    ],
  };
}

test("blocks measurement before controlled deployment is verified", () => {
  const result = measureControlledPilot({ ...baseInput(), verificationStatus: "pending" });
  assert.equal(result.status, "blocked");
  assert.equal(result.provenance.causalClaimAllowed, false);
  assert.equal(result.outcomeInserts.length, 0);
});

test("blocks when public-site writes remain enabled during measurement", () => {
  const result = measureControlledPilot({ ...baseInput(), publicSiteWritesEnabled: true });
  assert.equal(result.status, "blocked");
  assert.match(result.blockers.join(" "), /read-only/);
});

test("does not claim an effect when measurement data is incomplete", () => {
  const result = measureControlledPilot({
    ...baseInput(),
    observations: baseInput().observations.filter((row) => row.pageId === "page-treatment"),
  });
  assert.equal(result.status, "awaiting_data");
  assert.equal(result.evaluation?.status, "insufficient_data");
  assert.equal(result.provenance.causalClaimAllowed, false);
  assert.equal(result.outcomeInserts.length, 0);
});

test("measures verified treatment against control and persists provenance", () => {
  const result = measureControlledPilot(baseInput());
  assert.equal(result.status, "measured");
  assert.equal(result.evaluation?.status, "positive");
  assert.equal(result.evaluation?.treatmentEffect, 5);
  assert.equal(result.provenance.causalClaimAllowed, true);
  assert.equal(result.provenance.metricSource, "gsc");
  assert.equal(result.outcomeInserts.length, 2);
  assert.ok(result.outcomeInserts.every((row) => row.experimentId === "exp-1"));
});
