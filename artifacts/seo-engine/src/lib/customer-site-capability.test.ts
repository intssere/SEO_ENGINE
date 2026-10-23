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
    ...base, state: "no_site", site: null, metrics: [], sources: [], authorized: false,
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
    ...base, sources: [{ name: "GSC", status: "available", observedAt: "2026-10-18T00:00:00Z" }],
    metrics: [{ label: "Clicks", unit: "count", value: 0, source: "GSC", observedAt: "2026-10-18T00:00:00Z" }],
  }), true);
});

test("no-site state rejects authorization and source leakage", () => {
  assert.equal(validateCustomerSiteCapability({ ...base, state: "no_site", site: null, metrics: [], sources: [], authorized: true }), false);
  assert.equal(validateCustomerSiteCapability({ ...base, state: "no_site", site: null, metrics: [], authorized: false }), false);
});

test("unknown or stale provider evidence cannot certify operational readiness", () => {
  assert.equal(validateCustomerSiteCapability({ ...base, state: "site_operational", sources: [] }), false);
  assert.equal(validateCustomerSiteCapability({ ...base, state: "site_operational", sources: [{ name: "GSC", status: "available", observedAt: null }] }), false);
  assert.equal(validateCustomerSiteCapability({ ...base, sources: [{ name: "GSC", status: "invented", observedAt: null }] }), false);
});

test("missing or malformed metric provenance fails closed", () => {
  assert.equal(validateCustomerSiteCapability({ ...base, metrics: [{ label: "Clicks", unit: "count", value: null, source: "GSC", observedAt: null }] }), false);
  assert.equal(validateCustomerSiteCapability({ ...base, metrics: [{ label: "Clicks", unit: "count", value: 2, source: "GSC", observedAt: "not a time" }] }), false);
});

test("frontend rejects metrics without a matching available evidence source", () => {
  const metric = { label: "Clicks", value: 10, unit: "count", source: "GSC", observedAt: "2026-10-18T12:00:00Z" };
  for (const sources of [
    [],
    [{ name: "Other", status: "available", observedAt: "2026-10-18T13:00:00Z" }],
    [{ name: "GSC", status: "stale", observedAt: "2026-10-18T13:00:00Z" }],
    [{ name: "GSC", status: "available", observedAt: "2026-10-18T11:00:00Z" }],
  ]) {
    assert.equal(validateCustomerSiteCapability({ ...base, sources, metrics: [metric] }), false);
  }
  assert.equal(validateCustomerSiteCapability({
    ...base,
    sources: [{ name: "GSC", status: "available", observedAt: "2026-10-18T13:00:00Z" }],
    metrics: [metric],
  }), true);
});

test("site identity must have a nonempty name", () => {
  assert.equal(validateCustomerSiteCapability({ ...base, site: { ...base.site, name: "" } }), false);
});
