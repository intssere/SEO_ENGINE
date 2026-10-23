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
