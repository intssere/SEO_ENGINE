import test from "node:test";
import assert from "node:assert/strict";
import { buildCustomerHomeView } from "./customer-home-view.ts";

const candidate = {
  state: "analysis_pending" as const,
  site: { id: "site-a", name: "Site A", domain: "example.test" },
  reason: "Initial analysis pending",
  authorized: true,
  sources: [{ name: "GSC", status: "available" as const, observedAt: "2026-10-20T12:00:00Z" }],
  metrics: [{ label: "Clicks", value: 4, unit: "clicks", source: "GSC", observedAt: "2026-10-20T11:00:00Z" }],
};
test("customer home shows no identity or metrics without a verified payload", () => {
  assert.equal(buildCustomerHomeView(null).kind, "unverified");
  assert.equal(buildCustomerHomeView({ ...candidate, authorized: false }).kind, "unverified");
  assert.equal(buildCustomerHomeView({ ...candidate, site: { ...candidate.site, id: " " } }).kind, "unverified");
});
test("customer home keeps verified site identity and evidence without inventing values", () => {
  const view = buildCustomerHomeView(candidate);
  assert.equal(view.kind, "verified");
  if (view.kind !== "verified") return;
  assert.deepEqual(view.site, candidate.site);
  assert.equal(view.metrics[0].value, 4);
});
test("unmatched metrics cannot leak into customer home", () => {
  assert.equal(buildCustomerHomeView({ ...candidate, metrics: [{
    label: "Clicks", value: 4, unit: "clicks", source: "Unrelated", observedAt: "2026-10-20T11:00:00Z",
  }] }).kind, "unverified");
});

test("certified site without measurements preserves empty data and source freshness", () => {
  const view = buildCustomerHomeView({
    ...candidate, state: "site_degraded",
    sources: [{ name: "GSC", status: "stale", observedAt: "2026-10-18T12:00:00Z" }],
    metrics: [],
  });
  assert.equal(view.kind, "verified");
  if (view.kind !== "verified") return;
  assert.equal(view.state, "site_degraded");
  assert.deepEqual(view.metrics, []);
  assert.equal(view.sources[0].status, "stale");
});

test("operational claim with stale or absent evidence remains unverified", () => {
  for (const sources of [
    [], [{ name: "GSC", status: "stale" as const, observedAt: "2026-10-18T12:00:00Z" }],
    [{ name: "GSC", status: "available" as const, observedAt: null }],
  ]) {
    assert.equal(buildCustomerHomeView({
      ...candidate, state: "site_operational", sources, metrics: [],
    }).kind, "unverified");
  }
});

test("null measurements cannot be replaced by zero in the customer view", () => {
  const view = buildCustomerHomeView({
    ...candidate, metrics: [{ label: "Clicks", value: null, unit: "clicks", source: null, observedAt: null }],
  });
  assert.equal(view.kind, "verified");
  if (view.kind !== "verified") return;
  assert.equal(view.metrics[0].value, null);
});
