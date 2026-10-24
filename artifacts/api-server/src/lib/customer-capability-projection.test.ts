import test from "node:test";
import assert from "node:assert/strict";
import { projectCustomerCapability } from "./customer-capability-projection.js";

const scope = { organizationId: "org-a", siteId: "site-a" };
const evidence = {
  ...scope, name: "Site A", domain: "example.test",
  setupComplete: true, analysisComplete: true,
  sources: [{ name: "Search Console", status: "available" as const, observedAt: "2026-10-18T00:00:00Z" }],
  metrics: [{ label: "Clicks", value: 12, unit: "count", source: "Search Console", observedAt: "2026-10-18T00:00:00Z" }],
};

test("projects only exact authorized organization and site", () => {
  assert.equal(projectCustomerCapability(scope, { ...evidence, siteId: "site-b" }), null);
  assert.equal(projectCustomerCapability(scope, { ...evidence, organizationId: "org-b" }), null);
  assert.equal(projectCustomerCapability(scope, null), null);
});

test("uses evidence-backed operational state without changing the supplied snapshot", () => {
  const result = projectCustomerCapability(scope, evidence);
  assert.equal(result?.state, "site_operational");
  assert.equal(result?.metrics[0].value, 12);
  assert.notEqual(result?.sources, evidence.sources);
});

test("incomplete setup, unfinished analysis and unknown sources yield bounded states", () => {
  assert.equal(projectCustomerCapability(scope, { ...evidence, setupComplete: false })?.state, "setup_required");
  assert.equal(projectCustomerCapability(scope, { ...evidence, analysisComplete: false })?.state, "analysis_pending");
  assert.equal(projectCustomerCapability(scope, { ...evidence, sources: [] })?.state, "site_degraded");
  assert.equal(projectCustomerCapability(scope, { ...evidence, sources: [{ name: "GSC", status: "unknown" as const, observedAt: null }] })?.state, "site_degraded");
});

test("rejects improperly attributed metrics and malformed source freshness", () => {
  assert.equal(projectCustomerCapability(scope, { ...evidence, metrics: [{ ...evidence.metrics[0], source: null }] }), null);
  assert.equal(projectCustomerCapability(scope, { ...evidence, sources: [{ name: "GSC", status: "available" as const, observedAt: "invalid" }] }), null);
});

test("projection rejects unavailable, unmatched, and older source observations for metrics", () => {
  const metric = evidence.metrics[0];
  for (const sources of [
    [],
    [{ name: "GSC", status: "available" as const, observedAt: "2026-10-18T00:00:00Z" }],
    [{ name: "Search Console", status: "stale" as const, observedAt: "2026-10-18T00:00:00Z" }],
    [{ name: "Search Console", status: "available" as const, observedAt: "2026-10-17T00:00:00Z" }],
  ]) {
    assert.equal(projectCustomerCapability(scope, { ...evidence, sources, metrics: [metric] }), null);
  }
});
