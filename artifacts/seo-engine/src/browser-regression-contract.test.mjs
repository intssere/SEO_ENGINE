import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (relativePath) => readFileSync(join(here, relativePath), "utf8");

const config = read("../playwright.config.mjs");
const fixtures = read("../e2e/fixtures.mjs");
const critical = read("../e2e/critical-path.spec.mjs");
const visual = read("../e2e/visual-regression.spec.mjs");
const baselines = read("../e2e/visual-baselines.mjs");
const hash = read("../e2e/visual-hash.mjs");
const ci = read("../../../.github/workflows/ci.yml");
const lockfile = read("../../../pnpm-lock.yaml");

test("P4.10 browser server and browser are local deterministic Chromium", () => {
  assert.ok(config.includes('baseURL: "http://127.0.0.1:4174"'));
  assert.ok(config.includes('browserName: "chromium"'));
  assert.ok(config.includes('locale: "en-US"'));
  assert.ok(config.includes('timezoneId: "UTC"'));
  assert.ok(config.includes('reducedMotion: "reduce"'));
  assert.ok(config.includes('workers: 1'));
  assert.ok(config.includes('command: "pnpm run test:e2e:server"'));
});

test("synthetic browser network boundary blocks external and unmocked API traffic", () => {
  assert.ok(fixtures.includes('await page.route("**/*"'));
  assert.ok(fixtures.includes('externalRequests.push'));
  assert.ok(fixtures.includes('route.abort("blockedbyclient")'));
  assert.ok(fixtures.includes('unknownApiRequests.push'));
  assert.ok(fixtures.includes('unmocked_browser_test_api_request'));
  assert.ok(fixtures.includes('status = 200'));
  assert.ok(fixtures.includes('"/api/auth/session"'));
  assert.ok(fixtures.includes('"/api/dashboard"'));
  assert.ok(fixtures.includes('"/api/command"'));
  assert.doesNotMatch(fixtures, /DATABASE_URL|postgres:|googleapis\.com|myshopify\.com/);
});

test("critical paths include focus, grid, dialog, axe and browser-error gates", () => {
  assert.ok(critical.includes("hands route focus to main"));
  assert.ok(critical.includes("restores toggle focus"));
  assert.ok(critical.includes("DataGrid is keyboard-scrollable"));
  assert.ok(critical.includes("Ask dialog traps focus"));
  assert.ok(critical.includes("UGP-2.5 contextual guide is route-aware"));
  assert.ok(critical.includes("UGP-2.5 mobile Guide control"));
  assert.ok(critical.includes("UGP-3.1 URL onboarding stays network-closed"));
  assert.ok(critical.includes('new AxeBuilder({ page })'));
  assert.ok(critical.includes('"/technical-seo"'));
  assert.ok(critical.includes('"/connections"'));
  assert.ok(critical.includes('"/settings/add-website"'));
  assert.ok(critical.includes('"/ai-visibility"'));
  assert.ok(critical.includes('"/governance"'));
  assert.ok(critical.includes("assertNetworkBoundary"));
  assert.ok(critical.includes("assertBrowserClean"));
});

test("visual baselines are committed 512-bit hashes with bounded tolerance", () => {
  assert.ok(!baselines.includes('"CAPTURE"'));
  const hashes = [...baselines.matchAll(/hash: "([0-9a-f]+)"/g)].map((match) => match[1]);
  assert.equal(hashes.length, 4);
  for (const value of hashes) assert.match(value, /^[0-9a-f]{128}$/);
  const tolerances = [...baselines.matchAll(/maxDistance: (\d+)/g)].map((match) => Number(match[1]));
  assert.deepEqual(tolerances, [32, 32, 32, 32]);
  assert.ok(visual.includes("hammingDistance(actualHash, baseline.hash)"));
  assert.ok(visual.includes("toBeLessThanOrEqual(baseline.maxDistance)"));
  assert.ok(hash.includes("horizontalBits"));
  assert.ok(hash.includes("verticalBits"));
});

test("browser test dependencies are pinned in the workspace lockfile", () => {
  assert.ok(lockfile.includes("'@axe-core/playwright':"));
  assert.ok(lockfile.includes("specifier: 4.13.0"));
  assert.ok(lockfile.includes("4.13.0(playwright-core@1.63.0)"));
  assert.ok(lockfile.includes("'@playwright/test':"));
  assert.ok(lockfile.includes("specifier: 1.63.0"));
  assert.ok(lockfile.includes("'@playwright/test@1.63.0':"));
  assert.ok(lockfile.includes("playwright-core@1.63.0"));
  assert.ok(lockfile.includes("playwright@1.63.0"));
  assert.ok(lockfile.includes("pngjs@7.0.0"));
});

test("normal CI enforces browser regressions rather than capture mode", () => {
  assert.ok(ci.includes("Install Playwright Chromium"));
  assert.ok(ci.includes("playwright install --with-deps chromium"));
  assert.ok(ci.includes("Test P4.10 browser critical paths"));
  assert.ok(ci.includes("pnpm --filter @workspace/seo-engine test:e2e"));
  assert.ok(!ci.includes("P4_10_CAPTURE_VISUAL"));
  assert.ok(ci.includes("Upload Playwright failure artifacts"));
});

test("P4.10 sources remain isolated from production execution capabilities", () => {
  const source = [config, fixtures, critical, visual, hash].join("\n");
  assert.doesNotMatch(source, /startCrawl|resumeCrawl|fetchSitemap|PUBLIC_SITE_WRITES_ENABLED/);
  assert.doesNotMatch(source, /SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED|GSC_READONLY_OAUTH_RUNTIME_ENABLED/);
  assert.doesNotMatch(source, /process\.env\.DATABASE_URL|postgres\(/);
});
