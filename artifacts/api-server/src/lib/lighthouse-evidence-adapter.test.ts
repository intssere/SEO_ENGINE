import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicWebOnboardingPlan, normalizeSuppliedPublicWebResolution } from "./public-web-onboarding.js";
import { analyzeSuppliedReadOnlySite, type SuppliedReadOnlyPageObservation, type UniversalReadAnalysisCrawlSource } from "./universal-read-only-site-analysis.js";
import { assertLighthouseEvidenceIntegrity, normalizeSuppliedLighthouseEvidence, type SuppliedLighthouseResult } from "./lighthouse-evidence-adapter.js";

const FP = { crawl: "a".repeat(64), page: "b".repeat(64), report: "c".repeat(64) };

function analysis() {
  const plan = buildPublicWebOnboardingPlan({ url: "https://example.com/" });
  const resolution = normalizeSuppliedPublicWebResolution({
    plan,
    evidence: {
      redirectHops: [{ requestUrl: "https://example.com/", statusCode: 200, resolvedAddresses: ["93.184.216.34"], location: null }],
      robots: { requestUrl: "https://example.com/robots.txt", statusCode: 404, resolvedAddresses: ["93.184.216.34"], body: null },
    },
  });
  const crawlSource: UniversalReadAnalysisCrawlSource = {
    adapter: "existing_crawl_architecture",
    sourceVersion: "first_party_crawl_controller_v1",
    sourceFingerprint: FP.crawl,
    mode: "baseline",
    discoveredPages: 1,
    observedPages: 1,
    pageHardLimit: 30,
    truncated: false,
    controls: {
      method: "GET", sameOriginOnly: true, httpsOnly: true, robotsEnforced: true,
      redirectTargetRevalidation: true, queryPolicy: "reject_all", fragmentPolicy: "reject_all",
      responseBodyPersistence: false,
    },
    authorization: {
      networkReadAuthorized: false, crawlExecutionAuthorized: false, persistenceAuthorized: false,
      connectorCapabilityGranted: false, schedulerEnabled: false, autonomousWorkerEnabled: false,
      providerWrites: false, publicSiteWrites: false,
    },
  };
  const page: SuppliedReadOnlyPageObservation = {
    url: "https://example.com/", outcome: "success", statusCode: 200, robotsAllowed: true,
    redirectTarget: null, failureCode: null, noindex: false, canonicalUrl: "https://example.com/",
    title: "Example", metaDescription: "Example", h1: "Example", headings: ["Example"],
    contentText: "Example content", structuredData: { types: ["WebPage"], validity: "valid", issues: [] },
    internalLinks: [], images: [], performance: { responseTimeMs: 120, transferBytes: 1000 },
    sourceFingerprint: FP.page,
  };
  return analyzeSuppliedReadOnlySite({ plan, resolution, crawlSource, pages: [page] });
}

function report(overrides: Partial<SuppliedLighthouseResult> = {}): SuppliedLighthouseResult {
  return {
    lighthouseVersion: "12.8.2",
    requestedUrl: "https://example.com/",
    finalDisplayedUrl: "https://example.com/",
    fetchTime: "2026-09-25T12:00:00.000Z",
    categories: {
      performance: { score: 0.82 },
      accessibility: { score: 0.95 },
      "best-practices": { score: 1 },
      seo: { score: 0.91 },
    },
    audits: {
      "first-contentful-paint": { id: "first-contentful-paint", score: 0.8, numericValue: 1800, numericUnit: "millisecond", displayValue: "1.8 s" },
      "largest-contentful-paint": { id: "largest-contentful-paint", score: 0.7, numericValue: 3100, numericUnit: "millisecond", displayValue: "3.1 s" },
      "cumulative-layout-shift": { id: "cumulative-layout-shift", score: 0.95, numericValue: 0.03, numericUnit: "unitless", displayValue: "0.03" },
      "total-blocking-time": { id: "total-blocking-time", score: 0.85, numericValue: 240, numericUnit: "millisecond", displayValue: "240 ms" },
      "speed-index": { id: "speed-index", score: 0.8, numericValue: 2800, numericUnit: "millisecond", displayValue: "2.8 s" },
    },
    sourceFingerprint: FP.report,
    ...overrides,
  };
}

test("normalizes supplied Lighthouse lab evidence with closed authority", () => {
  const value = normalizeSuppliedLighthouseEvidence({ analysis: analysis(), report: report() });
  assert.equal(value.version, "ugp-3-5-lighthouse-evidence-v1");
  assert.equal(value.semantics.evidenceClass, "lighthouse_lab");
  assert.equal(value.semantics.fieldCoreWebVitalsInferred, false);
  assert.equal(value.semantics.cruxDataPresent, false);
  assert.equal(value.semantics.transportTimingEquivalent, false);
  assert.equal(value.semantics.wholeSiteCertified, false);
  assert.equal(value.categories.performance, 0.82);
  assert.deepEqual(value.opportunities, ["lighthouse.performance.review"]);
  assert.equal(value.metrics.find((m) => m.id === "largest-contentful-paint")?.value, 3100);
  assert.equal(value.metrics.find((m) => m.id === "interactive")?.availability, "unavailable");
  assert.equal(value.metrics.find((m) => m.id === "interactive")?.value, null);
  assert.deepEqual(Object.values(value.authorization), [false, false, false, false, false, false, false, false]);
  assert.match(value.provenance.reportFingerprint, /^[a-f0-9]{64}$/);
  assert.match(value.evidenceFingerprint, /^[a-f0-9]{64}$/);
  assertLighthouseEvidenceIntegrity(value);
});

test("is deterministic across supplied audit ordering", () => {
  const first = report();
  const reversed = Object.fromEntries(Object.entries(first.audits).reverse());
  const a = normalizeSuppliedLighthouseEvidence({ analysis: analysis(), report: first });
  const b = normalizeSuppliedLighthouseEvidence({ analysis: analysis(), report: { ...first, audits: reversed } });
  assert.equal(a.evidenceFingerprint, b.evidenceFingerprint);
  assert.deepEqual(a.audits.map((x) => x.id), [...a.audits.map((x) => x.id)].sort());
});

test("preserves missing metrics and categories as unavailable/null rather than zero", () => {
  const value = normalizeSuppliedLighthouseEvidence({
    analysis: analysis(),
    report: report({ categories: {}, audits: {} }),
  });
  assert.equal(value.categories.performance, null);
  assert.equal(value.metrics.every((metric) => metric.availability === "unavailable" && metric.value === null), true);
  assert.deepEqual(value.opportunities, []);
});

test("rejects category and audit score bounds violations", () => {
  assert.throws(() => normalizeSuppliedLighthouseEvidence({
    analysis: analysis(),
    report: report({ categories: { performance: { score: 1.01 } } }),
  }), /score_out_of_bounds/);
  assert.throws(() => normalizeSuppliedLighthouseEvidence({
    analysis: analysis(),
    report: report({ audits: { bad: { id: "bad", score: -0.1 } } }),
  }), /score_out_of_bounds/);
});

test("rejects invalid numeric metric values rather than coercing them", () => {
  assert.throws(() => normalizeSuppliedLighthouseEvidence({
    analysis: analysis(),
    report: report({ audits: { "largest-contentful-paint": { id: "largest-contentful-paint", score: 0.5, numericValue: Number.NaN } } }),
  }), /numeric_value_out_of_bounds/);
});

test("binds the report to the UGP-3.3 analysis origin and observed page", () => {
  assert.throws(() => normalizeSuppliedLighthouseEvidence({
    analysis: analysis(),
    report: report({ finalDisplayedUrl: "https://other.example/" }),
  }), /outside_analysis_origin/);
  assert.throws(() => normalizeSuppliedLighthouseEvidence({
    analysis: analysis(),
    report: report({ requestedUrl: "https://example.com/missing", finalDisplayedUrl: "https://example.com/missing" }),
  }), /target_page_not_in_analysis/);
});

test("rejects malformed provenance and oversized evidence", () => {
  assert.throws(() => normalizeSuppliedLighthouseEvidence({
    analysis: analysis(),
    report: report({ sourceFingerprint: "not-a-fingerprint" }),
  }), /invalid_fingerprint/);
  const audits: Record<string, any> = {};
  for (let i = 0; i < 2001; i += 1) audits[`audit-${i}`] = { id: `audit-${i}`, score: null };
  assert.throws(() => normalizeSuppliedLighthouseEvidence({
    analysis: analysis(),
    report: report({ audits }),
  }), /audits_oversized/);
});

test("rejects audit key/id mismatch", () => {
  assert.throws(() => normalizeSuppliedLighthouseEvidence({
    analysis: analysis(),
    report: report({ audits: { "audit-a": { id: "audit-b", score: 1 } } }),
  }), /identity_mismatch/);
});

test("integrity assertion rejects mutation", () => {
  const value = normalizeSuppliedLighthouseEvidence({ analysis: analysis(), report: report() });
  const mutated = { ...value, categories: { ...value.categories, performance: 1 } };
  assert.throws(() => assertLighthouseEvidenceIntegrity(mutated), /integrity_mismatch/);
});
