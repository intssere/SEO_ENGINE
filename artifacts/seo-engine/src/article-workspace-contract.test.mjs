import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (relativePath) => readFileSync(join(here, relativePath), "utf8");

const page = read("pages/content.tsx");
const model = read("lib/article-workspace-model.ts");
const app = read("App.tsx");

test("article workspace exposes every required customer-facing area", () => {
  for (const label of [
    "Research progress",
    "Sources",
    "Outline",
    "Editor",
    "Claims & citations",
    "SEO checks",
    "Internal links",
    "Publication state",
  ]) {
    assert.ok(page.includes(label), label);
  }
});

test("article workspace is mounted under the customer Content domain without a dedicated runtime chunk", () => {
  assert.ok(app.includes('<Route path="/content/articles" component={ContentPage} />'));
  assert.doesNotMatch(app, /article-workspace/);
  assert.ok(page.includes('title: "Article workspace"'));
});

test("unbound runtime workspace does not synthesize article evidence", () => {
  assert.match(page, /NOT PUBLISHED/);
  assert.match(
    model,
    /No research progress, sources, draft text, citations, SEO results, internal links, or publication state are synthesized/,
  );
});

test("publication remains explicit and separate from generation completion", () => {
  assert.match(page, /NOT PUBLISHED/);
  assert.match(page, /NOT PUBLISHED/);
  assert.ok(model.includes("publicationAuthorized: false"));
});

test("quality gate remains separate from model confidence", () => {
  assert.ok(model.includes("modelConfidenceIsNotQualityGate: true"));
  assert.match(page, /Confidence ≠ quality gate/);
  assert.match(model, /Quality-gate status remains separate from model confidence/);
});

test("frozen snapshot contract preserves deterministic reproduction and inspectable provenance", () => {
  for (const value of [
    "deterministicFromFrozenInputs",
    "researchPlanFingerprint",
    "sourceEvidenceLedgerFingerprint",
    "briefFingerprint",
    "draftFingerprint",
    "qualityGateFingerprint",
  ]) {
    assert.ok(model.includes(value), value);
  }
});

test("article workspace capabilities remain fail-closed", () => {
  for (const value of [
    "networkExecutionEnabled: false",
    "productionEvidenceReadsAuthorized: false",
    "persistenceAuthorized: false",
    "publicationAuthorized: false",
    "schedulerEnabled: false",
    "workerEnabled: false",
    "publicSiteWrites: false",
  ]) {
    assert.ok(model.includes(value), value);
  }
});

test("runtime surface reuses the shipped Content composition", () => {
  assert.match(page, /CustomerDomainHub/);
  assert.match(page, /location\.pathname\.endsWith\("\/articles"\)/);
  assert.doesNotMatch(page, /lucide-react|StatusBadge|article-workspace-model/);
  assert.doesNotMatch(app, /ArticleWorkspacePage/);
});

test("article workspace frontend contains no direct execution primitive", () => {
  const source = [page, model].join("\n");
  assert.doesNotMatch(source, /fetch\(|XMLHttpRequest|WebSocket|EventSource/);
  assert.doesNotMatch(source, /postgres|drizzle|DATABASE_URL|process\.env/);
  assert.doesNotMatch(source, /publishArticle|executePublish|startWorker|startScheduler/);
});
