import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (relativePath) => readFileSync(join(here, relativePath), "utf8");

const page = read("pages/technical-seo.tsx");
const app = read("App.tsx");
const navigation = read("navigation.json");
const model = read("lib/audit-workspace-model.ts");

test("P4.6 preserves the existing Technical SEO route and Audit navigation", () => {
  assert.ok(app.includes('<Route path="/technical-seo" component={TechnicalSeoPage} />'));
  assert.ok(navigation.includes('"label": "Technical SEO"'));
  assert.ok(navigation.includes('"path": "/technical-seo"'));
});

test("P4.6 uses only existing GET dashboard/findings hooks for exposed runtime data", () => {
  assert.ok(page.includes("useListTechnicalFindings"));
  assert.ok(page.includes("useGetDashboard"));
  assert.ok(page.includes("<DataGrid"));
  assert.doesNotMatch(page, /useMutation|getPilotAuthorization|startPilotRun/);
});

test("URL Explorer never synthesizes rows while the P2.7 read model is unbound", () => {
  assert.ok(model.includes('binding: "unavailable"'));
  assert.ok(model.includes("rows: []"));
  assert.ok(model.includes("No URL rows are synthesized"));
  assert.ok(page.includes("No URL inventory rows are synthesized"));
  assert.ok(page.includes("model.urlExplorer.rows"));
});

test("P4.6 exposes the P2.7 retained and unavailable dimension vocabulary", () => {
  for (const value of [
    '"canonicalUrl"',
    '"pathname"',
    '"sourceSitemaps"',
    '"lastmod"',
    '"recrawlStatus"',
    '"recrawlPriority"',
    '"recrawlReasons"',
    '"httpStatus"',
    '"fetchOutcome"',
    '"redirectTarget"',
    '"canonicalTarget"',
    '"indexability"',
    '"contentFingerprint"',
  ]) {
    assert.ok(model.includes(value));
  }
});

test("full-site network, sitemap, persistence and scheduler capabilities remain closed", () => {
  for (const value of [
    "networkExecutionEnabled: false",
    "crawlExecutionAuthorized: false",
    "sitemapNetworkFetchingEnabled: false",
    "productionEvidenceReadsAuthorized: false",
    "persistenceAuthorized: false",
    "schedulerEnabled: false",
    "workerEnabled: false",
    "publicSiteWrites: false",
  ]) {
    assert.ok(model.includes(value));
  }
});

test("frontend P4.6 sources contain no direct network/database/runtime execution primitive", () => {
  const source = [page, model].join("\n");
  assert.doesNotMatch(source, /fetch\(|XMLHttpRequest|WebSocket|EventSource/);
  assert.doesNotMatch(source, /postgres|drizzle|DATABASE_URL|process\.env/);
  assert.doesNotMatch(source, /startCrawl|resumeCrawl|retryCrawl|fetchSitemap/);
  assert.doesNotMatch(source, /PUBLIC_SITE_WRITES_ENABLED|SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED/);
});
