import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (relativePath) => readFileSync(join(here, relativePath), "utf8");

const app = read("App.tsx");
const nav = read("navigation.json");
const page = read("pages/reports.tsx");
const css = read("pages/reports.css");
const model = read("lib/executive-report-model.ts");
const accessibility = read("../e2e/accessibility-certification.spec.mjs");
const polish = read("../e2e/product-polish.spec.mjs");
const browser = read("../e2e/reporting.spec.mjs");
const packageJson = read("../package.json");

test("UGP-2.1 preserves Reports as an advanced surface under Performance", () => {
  const parsed = JSON.parse(nav);
  const primaryPaths = parsed.map((item) => item.path);
  assert.equal(primaryPaths.includes("/reports"), false);
  assert.equal(primaryPaths.includes("/performance"), true);
  assert.match(app, /import ReportsPage from ['"]\.\/pages\/reports['"]/);
  assert.match(app, /<Route path="\/reports" component=\{ReportsPage\} \/>/);
  assert.match(app, /<Route path="\/performance\/reports" component=\{ReportsPage\} \/>/);
});

test("P11.7 report route remains inside P11.5 and P11.6 inherited gates", () => {
  assert.ok(accessibility.includes('"/reports"'));
  assert.ok(polish.includes('"/reports"'));
  assert.ok(accessibility.includes('"wcag22aa"'));
  assert.ok(accessibility.includes("regardless of axe impact level"));
  assert.ok(polish.includes('name: "phone", width: 390'));
});

test("P11.7 frontend uses synthetic model and local-only browser primitives", () => {
  assert.match(page, /P11_7_SYNTHETIC_EXECUTIVE_REPORT_FIXTURE/);
  assert.match(page, /URL\.createObjectURL/);
  assert.match(page, /URL\.revokeObjectURL/);
  assert.match(page, /window\.print\(\)/);
  assert.match(page, /serializeExecutiveReportShareState/);
  assert.doesNotMatch(page, /fetch\(/);
  assert.doesNotMatch(page, /XMLHttpRequest/);
  assert.doesNotMatch(page, /mailto:/);
  assert.doesNotMatch(page, /https?:\/\//);
});

test("P11.7 print contract removes controls and preserves printable report layout", () => {
  assert.match(css, /@media print/);
  assert.match(css, /\.reportsControls/);
  assert.match(css, /\.reportsExportPanel/);
  assert.match(css, /display:\s*none !important/);
  assert.match(css, /break-inside:\s*avoid/);
});

test("P11.7 model explicitly denies external delivery and production export authority", () => {
  for (const marker of [
    "productionDataExportAuthorized: false",
    "externalFileDeliveryAuthorized: false",
    "emailDeliveryAuthorized: false",
    "slackDeliveryAuthorized: false",
    "webhookDeliveryAuthorized: false",
    "publicSharePublicationAuthorized: false",
    "providerNetworkReadAuthorized: false",
    "providerNetworkWriteAuthorized: false",
    "productionDbReadAuthorized: false",
    "productionDbWriteAuthorized: false",
    "deploymentAuthorized: false",
    "publicationAuthorized: false",
  ]) {
    assert.ok(model.includes(marker), marker);
  }
});

test("P11.7 browser suite validates download, share-state, malformed-state and print paths", () => {
  for (const marker of [
    "local CSV and JSON downloads are generated in-browser",
    "serialize only URL view state",
    "malformed share state fails closed",
    "print media hides local controls",
    "assertNetworkBoundary",
    "assertBrowserClean",
  ]) {
    assert.ok(browser.includes(marker), marker);
  }
});

test("P11.7 uses the existing browser command and dependencies only", () => {
  const pkg = JSON.parse(packageJson);
  assert.equal(pkg.scripts["test:e2e"], "playwright test");
  assert.equal(pkg.devDependencies["@playwright/test"], "1.63.0");
  assert.equal(pkg.devDependencies["@axe-core/playwright"], "4.13.0");
  assert.doesNotMatch(packageJson, /file-saver|jspdf|exceljs|xlsx|papaparse/);
});