import test from "node:test";
import assert from "node:assert/strict";
import { validateCustomerSiteCapability } from "./customer-site-capability.ts";

const base = {
  state: "analysis_pending",
  site: { id: "site-1", name: "Example", domain: "example.test" },
  reason: "First analysis not completed",
  authorized: true,
  sources: [{ name: "Search Console", status: "unknown", observedAt: null }],
  metrics: [{ label: "Clicks", value: null, unit: "count", observedAt: null, source: null }],
};

test("no site requires null site and no invented metrics", () => {
  assert.equal(validateCustomerSiteCapability({
    ...base, state: "no_site", site: null, metrics: [], authorized: false,
  }), true);
  assert.equal(validateCustomerSiteCapability({ ...base, state: "no_site", site: null }), false);
});

test("nonempty site state requires explicit authorization and identity", () => {
  assert.equal(validateCustomerSiteCapability(base), true);
  assert.equal(validateCustomerSiteCapability({ ...base, authorized: false }), false);
  assert.equal(validateCustomerSiteCapability({ ...base, site: null }), false);
  assert.equal(validateCustomerSiteCapability({ ...base, reason: "" }), false);
});

test("operational state rejects unknown or stale source statuses", () => {
  assert.equal(validateCustomerSiteCapability({ ...base, state: "site_operational" }), false);
  assert.equal(validateCustomerSiteCapability({
    ...base, state: "site_operational", sources: [{ name: "Search Console", status: "available", observedAt: "2026-10-18T00:00:00Z" }],
  }), true);
});

test("positive metrics require provenance and finite numbers", () => {
  assert.equal(validateCustomerSiteCapability({
    ...base, metrics: [{ label: "Clicks", unit: "count", value: 12, source: null, observedAt: null }],
  }), false);
  assert.equal(validateCustomerSiteCapability({
    ...base, metrics: [{ label: "Clicks", unit: "count", value: Infinity, source: "GSC", observedAt: "2026-10-18T00:00:00Z" }],
  }), false);
  assert.equal(validateCustomerSiteCapability({
    ...base, metrics: [{ label: "Clicks", unit: "count", value: 0, source: "GSC", observedAt: "2026-10-18T00:00:00Z" }],
  }), true);
});
