import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (relativePath) =>
  readFileSync(join(here, relativePath), "utf8");

const navigation = JSON.parse(read("navigation.json"));
const appSource = read("App.tsx");
const informational = read("components/informational-page.tsx");
const searchIntelligence = read("pages/search-intelligence.tsx");
const aiVisibility = read("pages/ai-visibility.tsx");
const impact = read("pages/impact.tsx");
const reports = read("pages/reports.tsx");
const learning = read("pages/learning.tsx");

const primaryPaths = navigation.flatMap((group) =>
  group.items.map((item) => item.path),
);

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

test("P12.1 primary navigation has no planned or engineering-only surfaces", () => {
  const items = navigation.flatMap((group) => group.items);
  assert.equal(items.some((item) => item.status === "planned"), false);
  assert.equal(new Set(primaryPaths).size, primaryPaths.length);

  for (const path of engineeringOnlyRoutes) {
    assert.equal(primaryPaths.includes(path), false, path);
  }
});

test("P12.1 engineering-only surfaces remain directly routed", () => {
  for (const path of engineeringOnlyRoutes) {
    assert.ok(appSource.includes('<Route path="' + path + '"'), path);
  }
});

test("P12.1 informational surfaces explicitly refuse fake production metrics", () => {
  assert.match(informational, /No synthetic data/);
  assert.match(
    informational,
    /we do not display placeholder or generated metrics/,
  );
  assert.match(informational, /EVIDENCE-FIRST POLICY ENFORCED/);
  assert.match(learning, /status="coming_soon"/);
});

test("P12.1 synthetic engineering workspaces remain visibly disclosed", () => {
  for (const [name, source] of [
    ["search-intelligence", searchIntelligence],
    ["ai-visibility", aiVisibility],
    ["impact", impact],
    ["reports", reports],
  ]) {
    assert.match(source, /SYNTHETIC READ-ONLY/, name);
  }

  assert.match(searchIntelligence, /No live competitor collection/);
  assert.match(aiVisibility, /LIVE DISABLED/);
  assert.match(impact, /synthetic/i);
  assert.match(reports, /LOCAL EXPORT ONLY/);
  assert.match(reports, /NO PUBLIC SHARE/);
});

test("P12.1 primary surface list remains a strict subset of mounted routes", () => {
  const routedPaths = [...appSource.matchAll(/<Route path="([^"]+)"/g)].map(
    (match) => match[1],
  );
  for (const path of primaryPaths) {
    assert.ok(routedPaths.includes(path), path);
  }
  assert.ok(routedPaths.length > primaryPaths.length);
});
