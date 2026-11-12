import test from "node:test";
import assert from "node:assert/strict";
import { assessCustomerReadiness } from "./customer-readiness-assessment.js";

const scope = { organizationId: "org-a", siteId: "site-a" };
const setup = { ...scope, complete: true, verifiedAt: "2026-10-19T00:00:00Z", authority: "site-setup-certifier" };
const analysis = { ...scope, complete: true, verifiedAt: "2026-10-19T00:00:00Z", authority: "analysis-certifier" };
const available = [{ status: "available" as const, observedAt: "2026-10-19T00:00:00Z" }];

test("observations alone never certify setup or analysis", () => {
  assert.deepEqual(assessCustomerReadiness({ scope, setup: null, initialAnalysis: null, sourceStatuses: available }),
    { state: "unverified", reason: "setup_attestation_unavailable" });
  assert.deepEqual(assessCustomerReadiness({ scope, setup, initialAnalysis: null, sourceStatuses: available }),
    { state: "unverified", reason: "analysis_attestation_unavailable" });
});

test("explicit negative completion evidence produces bounded setup and analysis states", () => {
  assert.equal(assessCustomerReadiness({ scope, setup: { ...setup, complete: false }, initialAnalysis: analysis, sourceStatuses: available }).state, "setup_required");
  assert.equal(assessCustomerReadiness({ scope, setup, initialAnalysis: { ...analysis, complete: false }, sourceStatuses: available }).state, "analysis_pending");
});

test("cross-tenant or malformed attestations are never accepted", () => {
  assert.equal(assessCustomerReadiness({ scope, setup: { ...setup, organizationId: "org-b" }, initialAnalysis: analysis, sourceStatuses: available }).state, "unverified");
  assert.equal(assessCustomerReadiness({ scope, setup: { ...setup, verifiedAt: "bad" }, initialAnalysis: analysis, sourceStatuses: available }).state, "unverified");
});

test("operational status requires verified completion and available timestamped sources", () => {
  assert.equal(assessCustomerReadiness({ scope, setup, initialAnalysis: analysis, sourceStatuses: available }).state, "site_operational");
  assert.equal(assessCustomerReadiness({ scope, setup, initialAnalysis: analysis, sourceStatuses: [] }).state, "site_degraded");
  assert.equal(assessCustomerReadiness({ scope, setup, initialAnalysis: analysis, sourceStatuses: [{ status: "stale", observedAt: null }] }).state, "site_degraded");
});
