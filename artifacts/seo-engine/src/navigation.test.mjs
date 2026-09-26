import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const navigation = JSON.parse(
  readFileSync(join(here, "navigation.json"), "utf8"),
);
const appSource = readFileSync(join(here, "App.tsx"), "utf8");
const layoutSource = readFileSync(
  join(here, "components", "layout.tsx"),
  "utf8",
);
const cssSource = readFileSync(join(here, "index.css"), "utf8");

const expectedDomains = [
  "Command Center",
  "Discover",
  "Audit",
  "Execute",
  "Measure",
  "System",
];

const expectedPrimaryRoutes = [
  "/",
  "/opportunities",
  "/governance",
  "/actions",
  "/approvals",
  "/performance",
  "/deployments",
  "/technical-seo",
  "/connections",
  "/settings",
];

const engineeringOnlyRoutes = [
  "/rankings",
  "/internal-links",
  "/ai-visibility",
  "/experiments",
  "/search-intelligence",
  "/learning",
  "/impact",
  "/reports",
];

const expectedRoutedPaths = [
  ...expectedPrimaryRoutes,
  ...engineeringOnlyRoutes,
];

const items = navigation.flatMap((group) =>
  group.items.map((item) => ({ ...item, domain: group.domain })),
);

test("P4.1 preserves exactly the six primary navigation domains in order", () => {
  assert.deepEqual(
    navigation.map((group) => group.domain),
    expectedDomains,
  );
});

test("P12.1 primary navigation exposes only production-operational surfaces", () => {
  const paths = items.map((item) => item.path);
  assert.equal(new Set(paths).size, paths.length);
  assert.deepEqual([...paths].sort(), [...expectedPrimaryRoutes].sort());
  assert.equal(items.some((item) => item.status === "planned"), false);

  for (const route of engineeringOnlyRoutes) {
    assert.equal(paths.includes(route), false, route);
  }
});

test("P12.1 engineering-only surfaces remain routed for direct certification", () => {
  const routedPaths = [...appSource.matchAll(/<Route path="([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.equal(new Set(routedPaths).size, routedPaths.length);
  assert.deepEqual([...routedPaths].sort(), [...expectedRoutedPaths].sort());

  for (const route of engineeringOnlyRoutes) {
    assert.ok(routedPaths.includes(route), route);
  }
});

test("active route and mobile accessibility contracts remain explicit", () => {
  assert.match(layoutSource, /aria-current=\{isActive \? "page" : undefined\}/);
  assert.match(layoutSource, /aria-expanded=\{isMobileNavOpen\}/);
  assert.match(layoutSource, /aria-controls="mobile-primary-navigation"/);
  assert.match(layoutSource, /id="mobile-primary-navigation"/);
  assert.match(layoutSource, /location === item\.path/);
});

test("mobile navigation replaces the hidden desktop sidebar below 640px", () => {
  assert.match(cssSource, /@media \(max-width: 640px\)/);
  assert.match(
    cssSource,
    /\.mobileNavBar\s*\{[\s\S]*?display:\s*flex;/,
  );
  assert.match(
    cssSource,
    /\.mobileNavPanel\s*\{[\s\S]*?display:\s*block;/,
  );
});
