import assert from "node:assert/strict";
import test from "node:test";
import { evaluateTechnicalSeo, type CanonicalEvidenceLike } from "./index.js";

function page(
  id: string,
  url: string,
  payload: Record<string, unknown>,
): CanonicalEvidenceLike {
  return {
    siteId: "site-1",
    pageId: id,
    kind: "page_snapshot",
    dedupeKey: `evidence-${id}`,
    payload: {
      url,
      statusCode: 200,
      title: "Unique title",
      metaDescription: "Description",
      canonicalUrl: url,
      robots: "index,follow",
      h1: "Heading",
      headings: [{ tag: "h1", text: "Heading" }],
      links: [],
      images: [],
      indexable: true,
      ...payload,
    },
  };
}

test("detects deterministic page-level metadata and indexability defects", () => {
  const findings = evaluateTechnicalSeo([
    page("p1", "https://example.com/a", {
      title: "",
      metaDescription: "",
      canonicalUrl: "",
      robots: "noindex,follow",
      h1: "",
      headings: [],
      images: [{ src: "/image.jpg", alt: "" }],
    }),
  ]);
  const rules = new Set(findings.map((f) => f.ruleId));
  assert.equal(rules.has("metadata.missing_title"), true);
  assert.equal(rules.has("metadata.missing_meta_description"), true);
  assert.equal(rules.has("canonical.missing"), true);
  assert.equal(rules.has("headings.missing_h1"), true);
  assert.equal(rules.has("indexability.noindex_conflict"), true);
  assert.equal(rules.has("images.missing_alt"), true);
});

test("detects 4xx, 5xx and broken same-origin internal links", () => {
  const source = page("source", "https://example.com/", {
    links: [{ href: "/missing" }, { href: "https://other.example/missing" }],
  });
  const missing = page("missing", "https://example.com/missing", { statusCode: 404 });
  const serverError = page("server", "https://example.com/server", { statusCode: 503 });
  const findings = evaluateTechnicalSeo([source, missing, serverError]);
  const rules = findings.map((f) => f.ruleId);
  assert.equal(rules.includes("crawl.http_4xx"), true);
  assert.equal(rules.includes("crawl.http_5xx"), true);
  assert.equal(rules.filter((r) => r === "links.broken_internal").length, 1);
});

test("detects duplicate titles only across indexable pages", () => {
  const findings = evaluateTechnicalSeo([
    page("p1", "https://example.com/a", { title: "Same title" }),
    page("p2", "https://example.com/b", { title: "Same title" }),
    page("p3", "https://example.com/c", { title: "Same title", indexable: false }),
  ]);
  assert.equal(findings.filter((f) => f.ruleId === "metadata.duplicate_title").length, 2);
});

test("detects non-self canonical on an indexable successful page", () => {
  const findings = evaluateTechnicalSeo([
    page("p1", "https://example.com/a", { canonicalUrl: "https://example.com/b" }),
  ]);
  assert.equal(findings.some((f) => f.ruleId === "canonical.non_self"), true);
});

test("produces stable unique finding dedupe keys", () => {
  const input = [page("p1", "https://example.com/a", { title: "" })];
  const first = evaluateTechnicalSeo(input);
  const second = evaluateTechnicalSeo(input);
  assert.deepEqual(first.map((f) => f.dedupeKey), second.map((f) => f.dedupeKey));
  assert.equal(new Set(first.map((f) => f.dedupeKey)).size, first.length);
});
