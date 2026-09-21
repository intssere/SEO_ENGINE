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

const expectedRoutes = [
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
  "/reports",
  "/connections",
  "/settings",
];

const items = navigation.flatMap((group) =>
  group.items.map((item) => ({ ...item, domain: group.domain })),
);

test("P4.1 exposes exactly the six primary navigation domains in order", () => {
  assert.deepEqual(
    navigation.map((group) => group.domain),
    expectedDomains,
  );
});

test("P4.1 preserves every existing route exactly once", () => {
  const paths = items.map((item) => item.path);
  assert.equal(new Set(paths).size, paths.length);
  assert.deepEqual([...paths].sort(), [...expectedRoutes].sort());

  const routedPaths = [...appSource.matchAll(/<Route path="([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.deepEqual([...routedPaths].sort(), [...expectedRoutes].sort());
});

test("Learning is subordinate to Measure and honestly marked planned", () => {
  const learning = items.find((item) => item.path === "/learning");
  assert.deepEqual(learning, {
    label: "Learning",
    path: "/learning",
    status: "planned",
    domain: "Measure",
  });
  assert.equal(expectedDomains.includes("Learning"), false);
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