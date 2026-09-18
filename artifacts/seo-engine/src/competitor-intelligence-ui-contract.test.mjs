import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (relativePath) => readFileSync(join(here, relativePath), "utf8");

const app = read("App.tsx");
const navigation = read("navigation.json");
const page = read("pages/search-intelligence.tsx");
const model = read("lib/competitor-intelligence-ui-model.ts");
const css = read("pages/search-intelligence.css");

test("P5.7 preserves the existing Search Intelligence route and Discover navigation", () => {
  assert.ok(app.includes('<Route path="/search-intelligence" component={SearchIntelligencePage} />'));
  assert.ok(navigation.includes('"label": "Search Intelligence"'));
  assert.ok(navigation.includes('"path": "/search-intelligence"'));
});

test("P5.7 renders deterministic fixture-backed workbenches with existing design-system components", () => {
  assert.ok(page.includes("P5_7_SYNTHETIC_REPORT_FIXTURE"));
  assert.ok(page.includes("buildCompetitorIntelligenceUiModel"));
  assert.ok(page.includes("<DataGrid"));
  assert.ok(page.includes("<StatusBadge"));
  assert.ok(page.includes('label="Competitor visibility"'));
  assert.ok(page.includes('label="Topic gap evidence"'));
  assert.ok(page.includes('label="Page semantic differences"'));
  assert.ok(page.includes('label="Link gap evidence"'));
  assert.ok(page.includes("SYNTHETIC READ-ONLY"));
  assert.ok(page.includes("DEFAULT-OFF"));
});

test("P5.7 interpretation boundary does not claim market share, missing-page proof, outreach suitability or P6 scoring", () => {
  assert.ok(model.includes("observedTopicVisibilityRatioIsMarketShare: false"));
  assert.ok(model.includes("pageSemanticDifferenceImpliesMissingOwnedPage: false"));
  assert.ok(model.includes("backlinkGapImpliesOutreachSuitability: false"));
  assert.ok(model.includes("crossSignalOpportunityScoreIncluded: false"));
  assert.ok(model.includes("opportunityScore: null"));
  assert.ok(page.includes("is not market share"));
  assert.ok(page.includes("do not establish that an owned page is missing"));
  assert.ok(page.includes("without link-quality or outreach inference"));
  assert.ok(page.includes("P6 owns cross-signal prioritization"));
});

test("P5.7 frontend sources contain no network, generated competitor API, database or execution primitive", () => {
  const source = [page, model].join("\n");

  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /XMLHttpRequest|WebSocket|EventSource/);
  assert.doesNotMatch(source, /useGet.*Competitor|useList.*Competitor|useMutation/);
  assert.doesNotMatch(source, /@workspace\/api-client-react/);
  assert.doesNotMatch(source, /process\.env|DATABASE_URL|postgres|drizzle/);
  assert.doesNotMatch(source, /executeCompetitorPilot|executeAuthorizedSignalCollectionJob/);
  assert.doesNotMatch(source, /setInterval|setTimeout|worker_threads|child_process/);
  assert.doesNotMatch(source, /PUBLIC_SITE_WRITES_ENABLED|SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED/);
});

test("P5.7 model hard-codes all runtime and mutation gates closed", () => {
  for (const value of [
    "readOnly: true",
    "syntheticFixtureOnly: true",
    "defaultOff: true",
    "liveProviderReadsAuthorized: false",
    "publicSiteReadsAuthorized: false",
    "runtimeApiBindingAuthorized: false",
    "sourceAdmissionAuthorized: false",
    "targetMutationAuthorized: false",
    "task64ExecutionAuthorized: false",
    "task70ExecutionAuthorized: false",
    "persistenceAuthorized: false",
    "databaseReadsAuthorized: false",
    "databaseWritesAuthorized: false",
    "schedulerEnabled: false",
    "workerEnabled: false",
    "opportunityScoringIncluded: false",
    "publicationAuthorized: false",
  ]) {
    assert.ok(model.includes(value), value);
  }
});

test("P5.7 workspace defines responsive desktop/tablet/mobile layout rules", () => {
  assert.match(css, /\.competitorSummaryGrid/);
  assert.match(css, /\.competitorScopeStrip/);
  assert.match(css, /\.competitorBottomGrid/);
  assert.match(css, /@media \(max-width: 1180px\)/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(max-width: 640px\)/);
});
