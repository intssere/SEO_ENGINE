import test from "node:test";
import assert from "node:assert/strict";
import { analyzeInternalLinks, toOpportunityInsert, type InternalLinkPageInput } from "./index.js";

function page(input: Partial<InternalLinkPageInput> & Pick<InternalLinkPageInput, "url" | "pageId">): InternalLinkPageInput {
  return {
    siteId: "site-1",
    statusCode: 200,
    indexable: true,
    title: null,
    h1: null,
    headings: [],
    links: [],
    priorityScore: 50,
    ...input,
  };
}

test("builds a deduplicated internal link graph and ignores nofollow authority edges", () => {
  const result = analyzeInternalLinks([
    page({ pageId: "home", url: "https://example.com/", links: [
      { href: "https://example.com/a", internal: true },
      { href: "https://example.com/a", internal: true },
      { href: "https://example.com/b", internal: true, rel: "nofollow" },
    ] }),
    page({ pageId: "a", url: "https://example.com/a", links: [{ href: "https://example.com/", internal: true }] }),
    page({ pageId: "b", url: "https://example.com/b" }),
  ], { rootUrl: "https://example.com/" });

  const a = result.nodes.find((node) => node.pageId === "a")!;
  const b = result.nodes.find((node) => node.pageId === "b")!;
  const home = result.nodes.find((node) => node.pageId === "home")!;
  assert.equal(a.inboundLinks, 1);
  assert.equal(home.outboundLinks, 1);
  assert.equal(b.inboundLinks, 0);
  assert.equal(b.orphaned, true);
  const authorityTotal = result.nodes.reduce((sum, node) => sum + node.authorityShare, 0);
  assert.ok(Math.abs(authorityTotal - 100) < 0.2);
});

test("excludes the configured root from orphan classification", () => {
  const result = analyzeInternalLinks([
    page({ pageId: "home", url: "https://example.com/" }),
    page({ pageId: "orphan", url: "https://example.com/orphan" }),
  ], { rootUrl: "https://example.com/" });

  assert.equal(result.nodes.find((node) => node.pageId === "home")?.orphaned, false);
  assert.equal(result.nodes.find((node) => node.pageId === "orphan")?.orphaned, true);
  assert.equal(result.opportunities.filter((item) => item.type === "orphan_page").length, 1);
});

test("finds high-priority underlinked targets and recommends semantically relevant sources", () => {
  const result = analyzeInternalLinks([
    page({
      pageId: "home",
      url: "https://example.com/",
      title: "Luxury Fragrance Store",
      h1: "Luxury Fragrance",
      links: [{ href: "https://example.com/perfume", internal: true, text: "perfume" }],
    }),
    page({
      pageId: "guide",
      url: "https://example.com/fragrance-guide",
      title: "Designer Fragrance and Perfume Guide",
      h1: "Designer Perfume Guide",
      headings: [{ level: 2, text: "Choosing a luxury fragrance" }],
      priorityScore: 45,
    }),
    page({
      pageId: "unrelated",
      url: "https://example.com/skincare",
      title: "Skincare Routine",
      h1: "Daily Skin Care",
    }),
    page({
      pageId: "target",
      url: "https://example.com/perfume",
      title: "Designer Perfume Collection",
      h1: "Designer Perfumes",
      targetTerms: ["luxury fragrance"],
      priorityScore: 90,
    }),
  ], { rootUrl: "https://example.com/", underlinkedMaxInbound: 1, minPriorityScore: 55, minRelevance: 0.12 });

  const target = result.nodes.find((node) => node.pageId === "target")!;
  assert.equal(target.inboundLinks, 1);
  assert.equal(target.underlinked, true);

  const underlinked = result.opportunities.find((item) => item.type === "underlinked_priority_page" && item.targetPageId === "target");
  assert.ok(underlinked);

  const suggestions = result.opportunities.filter((item) => item.type === "link_suggestion" && item.targetPageId === "target");
  assert.ok(suggestions.length >= 1);
  assert.equal(suggestions[0]?.sourcePageId, "guide");
  assert.equal(suggestions.some((item) => item.sourcePageId === "home"), false, "existing links must not be suggested again");
  assert.equal(suggestions.some((item) => item.sourcePageId === "unrelated"), false, "irrelevant pages should not pass relevance threshold");
  assert.equal(suggestions[0]?.recommendedAnchor, "Designer Perfumes");
});

test("produces deterministic opportunity ordering and dedupe keys", () => {
  const pages = [
    page({ pageId: "a", url: "https://example.com/a", title: "Perfume Guide", h1: "Perfume Guide" }),
    page({ pageId: "b", url: "https://example.com/b", title: "Perfume Collection", h1: "Perfume Collection", priorityScore: 80 }),
  ];
  const first = analyzeInternalLinks(pages, { rootUrl: "https://example.com/a" });
  const second = analyzeInternalLinks([...pages].reverse(), { rootUrl: "https://example.com/a" });
  assert.deepEqual(first.opportunities.map((item) => item.dedupeKey), second.opportunities.map((item) => item.dedupeKey));
});

test("maps an internal-link signal to the existing opportunity persistence shape", () => {
  const result = analyzeInternalLinks([
    page({ pageId: "home", url: "https://example.com/" }),
    page({ pageId: "target", url: "https://example.com/perfume", title: "Perfume", priorityScore: 80 }),
  ], { rootUrl: "https://example.com/" });
  const item = result.opportunities.find((opportunity) => opportunity.type === "orphan_page")!;
  const insert = toOpportunityInsert(item);
  assert.equal(insert.siteId, "site-1");
  assert.equal(insert.pageId, "target");
  assert.equal(insert.type, "internal_link.orphan_page");
  assert.equal(insert.status, "open");
});
