import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (relativePath) => readFileSync(join(here, relativePath), "utf8");

const app = read("App.tsx");
const polish = read("../e2e/product-polish.spec.mjs");
const accessibility = read("../e2e/accessibility-certification.spec.mjs");
const css = read("index.css");
const packageJson = read("../package.json");

const EXPECTED_ROUTES = [
  "/",
  "/opportunities",
  "/content",
  "/site-audit",
  "/authority",
  "/automation",
  "/performance",
  "/settings",
  "/settings/add-website",
  "/governance",
  "/actions",
  "/approvals",
  "/deployments",
  "/technical-seo",
  "/rankings",
  "/internal-links",
  "/ai-visibility",
  "/experiments",
  "/search-intelligence",
  "/learning",
  "/impact",
  "/reports",
  "/connections",
];

test("UGP-2.1 product-polish certifies every distinct rendered surface", () => {
  const actual = [...app.matchAll(/<Route path="([^"]+)"/g)].map((match) => match[1]);
  for (const route of EXPECTED_ROUTES) {
    assert.ok(actual.includes(route), `missing app surface ${route}`);
    assert.ok(polish.includes(JSON.stringify(route)), `missing P11.6 route ${route}`);
  }
  assert.ok(actual.length > EXPECTED_ROUTES.length, "customer aliases should map to already-certified surfaces");
  assert.ok(polish.includes('"/__p11-6-not-found"'));
});

test("P11.6 certifies four representative responsive viewport classes", () => {
  for (const marker of [
    '{ name: "desktop", width: 1440, height: 1000 }',
    '{ name: "compact-desktop", width: 1024, height: 900 }',
    '{ name: "tablet", width: 768, height: 1024 }',
    '{ name: "phone", width: 390, height: 844 }',
  ]) {
    assert.ok(polish.includes(marker), marker);
  }
});

test("P11.6 checks overflow, clipping, interactive overlap and internal table scrolling", () => {
  assert.ok(polish.includes("document.documentElement.scrollWidth"));
  assert.ok(polish.includes("document.body.scrollWidth"));
  assert.ok(polish.includes("isVisuallyHidden"));
  assert.ok(polish.includes("clippingFailures"));
  assert.ok(polish.includes("overlapFailures"));
  assert.ok(polish.includes("scrollRegionFailures"));
  assert.ok(polish.includes('".dataGridWrap, .tableWrap"'));
});

test("P11.6 retains compact-shell and 44px primary touch-control assertions", () => {
  assert.ok(polish.includes("viewport.width <= 820"));
  assert.ok(polish.includes("sidebarVisible"));
  assert.ok(polish.includes("mobileNavVisible"));
  assert.ok(polish.includes("viewport.width <= 420"));
  assert.ok(polish.includes("touchFailures"));
  assert.ok(polish.includes("rect.height + EPSILON < 44"));
  assert.ok(polish.includes('["checkbox", "radio"].includes(element.type)'));
  assert.ok(polish.includes("labelRect.height + EPSILON >= 44"));
  assert.ok(polish.includes("mobile navigation panel remains viewport-safe"));
});

test("P11.6 preserves the P4.7 responsive presentation foundation", () => {
  assert.ok(css.includes("/* P4.7 responsive/mobile/tablet professional polish */"));
  assert.ok(css.includes("@media (max-width: 820px)"));
  assert.ok(css.includes(".mobileNavPanel .primaryNav a"));
  assert.ok(css.includes("min-height: 44px"));
  assert.ok(css.includes(".dataGridWrap table"));
  assert.ok(css.includes("min-width: 720px"));
  assert.ok(css.includes(".linkButton {\n    min-height: 44px;"));
  assert.ok(css.includes(".filters select {\n    min-height: 44px;"));
});

test("P11.6 does not weaken the P11.5 accessibility certification contract", () => {
  for (const tag of [
    '"wcag2a"',
    '"wcag2aa"',
    '"wcag21a"',
    '"wcag21aa"',
    '"wcag22a"',
    '"wcag22aa"',
  ]) {
    assert.ok(accessibility.includes(tag), `missing P11.5 axe tag ${tag}`);
  }
  assert.ok(accessibility.includes("regardless of axe impact level"));
  assert.ok(accessibility.includes("{ width: 320, height: 800 }"));
  assert.ok(accessibility.includes("target.width >= 24 && target.height >= 24"));
  assert.ok(accessibility.includes("toBeFocused()"));
  assert.ok(accessibility.includes("prefers-reduced-motion: reduce"));
});

test("P11.6 stays inside the existing local synthetic browser command and dependencies", () => {
  const pkg = JSON.parse(packageJson);
  assert.equal(pkg.scripts["test:e2e"], "playwright test");
  assert.equal(pkg.devDependencies["@playwright/test"], "1.63.0");
  assert.equal(pkg.devDependencies["@axe-core/playwright"], "4.13.0");
  assert.ok(polish.includes("installSyntheticNetwork"));
  assert.ok(polish.includes("assertNetworkBoundary"));
  assert.ok(polish.includes("assertBrowserClean"));
  assert.doesNotMatch(
    polish,
    /DATABASE_URL|postgres\(|pg_dump|pg_restore|PUBLIC_SITE_WRITES_ENABLED/,
  );
  assert.doesNotMatch(
    polish,
    /SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED|GSC_READONLY_OAUTH_RUNTIME_ENABLED/,
  );
});