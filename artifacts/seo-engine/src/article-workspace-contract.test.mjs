import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (relativePath) => readFileSync(join(here, relativePath), "utf8");

const page = read("pages/article-workspace.tsx");
const model = read("lib/article-workspace-model.ts");
const app = read("App.tsx");
const content = read("pages/content.tsx");

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
  assert.ok(page.includes("Quality gate"));
  assert.ok(page.includes("Provenance"));
});

test("article workspace is mounted under the customer Content domain", () => {
  assert.ok(app.includes('import ArticleWorkspacePage from \'./pages/article-workspace\';'));
  assert.ok(app.includes('<Route path="/content/articles" component={ArticleWorkspacePage} />'));
  assert.ok(content.includes('href: "/content/articles"'));
  assert.ok(content.includes('title: "Article workspace"'));
  assert.ok(content.includes('status: "preview"'));
});

test("unbound article workspace does not synthesize product data", () => {
  assert.ok(page.includes("buildArticleWorkspaceModel(null)"));
  assert.match(
    model,
    /No research progress, sources, draft text, citations, SEO results, internal links, or publication state are synthesized/,
  );
  assert.match(page, /No certified draft is bound/);
  assert.match(page, /No source ledger bound/);
  assert.match(page, /No claim provenance bound/);
  assert.match(page, /No SEO quality result bound/);
  assert.match(page, /No internal-link targets bound/);
});

test("draft editor is inspectable but read-only and non-publishing", () => {
  assert.ok(page.includes('aria-label="Article draft editor"'));
  assert.ok(page.includes("readOnly"));
  assert.match(page, /Read-only · no persistence · no publish action/);
  assert.match(page, /NOT PUBLISHED/);
  assert.match(
    page,
    /A completed draft or passing quality gate cannot publish content on its own/,
  );
});

test("quality gate remains separate from model confidence", () => {
  assert.ok(model.includes("modelConfidenceIsNotQualityGate: true"));
  assert.match(page, /Model confidence is not the quality gate/);
  assert.match(
    model,
    /Quality-gate status remains separate from model confidence/,
  );
});

test("frozen snapshot preserves deterministic reproduction and inspectable provenance", () => {
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
  assert.match(page, /Reproducible from the frozen artifact chain/);
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

test("article workspace frontend contains no direct execution primitive", () => {
  const source = [page, model].join("\n");
  assert.doesNotMatch(source, /fetch\(|XMLHttpRequest|WebSocket|EventSource/);
  assert.doesNotMatch(source, /postgres|drizzle|DATABASE_URL|process\.env/);
  assert.doesNotMatch(source, /publishArticle|executePublish|startWorker|startScheduler/);
});
