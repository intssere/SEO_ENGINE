import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (relativePath) => readFileSync(join(here, relativePath), "utf8");

const app = read("App.tsx");
const cert = read("../e2e/accessibility-certification.spec.mjs");
const css = read("index.css");
const packageJson = read("../package.json");

const EXPECTED_ROUTES = [
  "/",
  "/opportunities",
  "/governance",
  "/actions",
  "/approvals",
  "/performance",
  "/deployments",
  "/technical-seo",
  "/rankings",
  "/internal-links",
  "/ai-visibility",
  "/experiments",
  "/search-intelligence",
  "/learning",
  "/impact",
  "/connections",
  "/settings",
];

test("P11.5 certifies every explicit routed surface plus the not-found fallback", () => {
  const actual = [...app.matchAll(/<Route path="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(actual, EXPECTED_ROUTES);

  for (const route of EXPECTED_ROUTES) {
    assert.ok(
      cert.includes(JSON.stringify(route)),
      `P11.5 browser certification missing route ${route}`,
    );
  }
  assert.ok(cert.includes('"/__p11-5-not-found"'));
});

test("P11.5 axe gate covers WCAG 2.2 A/AA and blocks every violation impact", () => {
  for (const tag of [
    '"wcag2a"',
    '"wcag2aa"',
    '"wcag21a"',
    '"wcag21aa"',
    '"wcag22a"',
    '"wcag22aa"',
  ]) {
    assert.ok(cert.includes(tag), `missing axe tag ${tag}`);
  }
  assert.ok(cert.includes("results.violations.map"));
  assert.ok(cert.includes(').toEqual([])'));
  assert.ok(cert.includes("regardless of axe impact level"));
  assert.doesNotMatch(cert, /violation\.impact\s*===/);
  assert.doesNotMatch(cert, /filter\(\(violation\).*impact/s);
});

test("P11.5 browser contract includes 320px reflow and 24px target-size checks", () => {
  assert.ok(cert.includes("{ width: 320, height: 800 }"));
  assert.ok(cert.includes("document.documentElement.scrollWidth"));
  assert.ok(cert.includes("document.body.scrollWidth"));
  assert.ok(cert.includes("width < 24 || height < 24"));
  assert.ok(cert.includes("isInlineTextLinkException"));
  assert.ok(cert.includes("hasSpacingException"));
  assert.ok(cert.includes("circleIntersectsRect"));
  assert.ok(cert.includes("Scroll horizontally") === false);
});

test("P11.5 browser contract verifies focus visibility, focus handoff and obscuring", () => {
  assert.ok(cert.includes('name: "Skip to main content"'));
  assert.ok(cert.includes("outlineVisible || shadowVisible"));
  assert.ok(cert.includes("hitIsFocusedElement"));
  assert.ok(cert.includes('page.locator("#main-content")'));
  assert.ok(cert.includes("toBeFocused()"));
});

test("P11.5 browser contract verifies reduced-motion rendering", () => {
  assert.ok(cert.includes('matchMedia("(prefers-reduced-motion: reduce)")'));
  assert.ok(cert.includes("style.animationDuration"));
  assert.ok(cert.includes("style.transitionDuration"));
  assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(css.includes("animation-duration: 0.01ms !important"));
  assert.ok(css.includes("transition-duration: 0.01ms !important"));
});

test("P11.5 Playwright suite is part of the existing browser command without dependency expansion", () => {
  const pkg = JSON.parse(packageJson);
  assert.equal(pkg.scripts["test:e2e"], "playwright test");
  assert.equal(pkg.devDependencies["@playwright/test"], "1.63.0");
  assert.equal(pkg.devDependencies["@axe-core/playwright"], "4.13.0");
  assert.ok(!packageJson.includes("pa11y"));
  assert.ok(!packageJson.includes("lighthouse"));
});

test("P11.5 remains local/synthetic frontend certification only", () => {
  assert.ok(cert.includes("installSyntheticNetwork"));
  assert.ok(cert.includes("assertNetworkBoundary"));
  assert.ok(cert.includes("assertBrowserClean"));
  assert.doesNotMatch(
    cert,
    /DATABASE_URL|postgres\(|pg_dump|pg_restore|PUBLIC_SITE_WRITES_ENABLED/,
  );
  assert.doesNotMatch(
    cert,
    /SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED|GSC_READONLY_OAUTH_RUNTIME_ENABLED/,
  );
});