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
const read = (relativePath) => readFileSync(join(here, relativePath), "utf8");
const customerSources = [
  "components/customer-domain-hub.tsx",
  "pages/content.tsx",
  "pages/site-audit-hub.tsx",
  "pages/authority.tsx",
  "pages/automation.tsx",
  "pages/dashboard.tsx",
  "pages/settings.tsx",
].map(read);

const expectedPrimaryLabels = [
  "Home",
  "Opportunities",
  "Content",
  "Site Audit",
  "Authority",
  "Automation",
  "Performance",
  "Settings",
];

const expectedPrimaryRoutes = [
  "/",
  "/opportunities",
  "/content",
  "/site-audit",
  "/authority",
  "/automation",
  "/performance",
  "/settings",
];

const customerMappedRoutes = [
  "/content/research",
  "/content/rankings",
  "/content/ai-visibility",
  "/site-audit/technical",
  "/site-audit/internal-links",
  "/authority/backlinks",
  "/authority/competitors",
  "/automation/review",
  "/automation/changes",
  "/automation/history",
  "/automation/safety",
  "/performance/impact",
  "/performance/reports",
  "/performance/experiments",
  "/performance/learning",
  "/settings/connections",
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
  "/governance",
  "/actions",
  "/approvals",
  "/deployments",
  "/technical-seo",
  "/connections",
];

const expectedRoutedPaths = [
  ...expectedPrimaryRoutes,
  ...customerMappedRoutes,
  ...engineeringOnlyRoutes,
];

test("UGP-2.1 exposes exactly eight customer product domains in order", () => {
  assert.deepEqual(
    navigation.map((item) => item.label),
    expectedPrimaryLabels,
  );
  assert.deepEqual(
    navigation.map((item) => item.path),
    expectedPrimaryRoutes,
  );
});

test("UGP-2.1 primary navigation excludes engineering and compatibility URLs", () => {
  const paths = navigation.map((item) => item.path);
  assert.equal(new Set(paths).size, paths.length);
  assert.equal(navigation.some((item) => item.status === "planned"), false);

  for (const route of [...engineeringOnlyRoutes, ...customerMappedRoutes]) {
    assert.equal(paths.includes(route), false, route);
  }
});

test("UGP-2.1 legacy engineering routes map to exactly one customer domain", () => {
  const aliasOwners = new Map();
  for (const item of navigation) {
    for (const alias of item.aliases ?? []) {
      assert.equal(aliasOwners.has(alias), false, alias);
      aliasOwners.set(alias, item.label);
    }
  }

  assert.deepEqual(
    [...aliasOwners.keys()].sort(),
    [...engineeringOnlyRoutes].sort(),
  );
  assert.equal(aliasOwners.get("/technical-seo"), "Site Audit");
  assert.equal(aliasOwners.get("/approvals"), "Automation");
  assert.equal(aliasOwners.get("/search-intelligence"), "Authority");
  assert.equal(aliasOwners.get("/connections"), "Settings");
});

test("UGP-2.1 customer routes and legacy certification routes remain mounted", () => {
  const routedPaths = [...appSource.matchAll(/<Route path="([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.equal(new Set(routedPaths).size, routedPaths.length);
  assert.deepEqual([...routedPaths].sort(), [...expectedRoutedPaths].sort());
});

test("active route and mobile accessibility contracts remain explicit", () => {
  assert.match(layoutSource, /aria-current={isActive ? "page" : undefined}/);
  assert.match(layoutSource, /aria-expanded={isMobileNavOpen}/);
  assert.match(layoutSource, /aria-controls="mobile-primary-navigation"/);
  assert.match(layoutSource, /id="mobile-primary-navigation"/);
  assert.match(layoutSource, /location.startsWith(item.path + "\/")/);
  assert.match(layoutSource, /item.aliases?.includes(location)/);
});

test("customer navigation uses list semantics and mobile replacement below 640px", () => {
  assert.match(layoutSource, /<ul className="navList">/);
  assert.match(layoutSource, /<li key={item.path}>/);
  assert.match(cssSource, /@media (max-width: 640px)/);
  assert.match(
    cssSource,
    /.mobileNavBars*{[sS]*?display:s*flex;/,
  );
  assert.match(
    cssSource,
    /.mobileNavPanels*{[sS]*?display:s*block;/,
  );
});


test("UGP-2.1 customer-facing surfaces do not expose engineering task identifiers", () => {
  const source = customerSources.join("\n");
  assert.doesNotMatch(source, /Task\s*#/);
  assert.doesNotMatch(source, /UGP-[0-9]/);
  assert.doesNotMatch(source, /P[0-9]+\.[0-9]+/);
});

test("UGP-2.1 keeps unavailable and future capability states explicit", () => {
  const source = customerSources.join("\n");
  assert.match(source, /COMING NEXT/);
  assert.match(source, /NOT CONNECTED/);
  assert.match(source, /PREVIEW/);
  assert.match(source, /No ranking metrics are invented/);
});
