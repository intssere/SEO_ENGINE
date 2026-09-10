import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBatch, normalizeEvidence } from "./index.js";

test("normalizes timestamps and applies source confidence", () => {
  const evidence = normalizeEvidence({
    siteId: "site-1",
    source: "gsc",
    kind: "search_performance",
    observedAt: "2026-09-10T09:00:00Z",
    payload: { query: "perfume", impressions: 100 },
    provenance: { provider: "google-search-console" },
  });
  assert.equal(evidence.confidence, 0.98);
  assert.equal(evidence.observedAt, "2026-09-10T09:00:00.000Z");
  assert.equal(evidence.dedupeKey.length, 64);
});

test("dedupe key is deterministic for object key order", () => {
  const a = normalizeEvidence({
    siteId: "site-1",
    source: "crawler",
    kind: "page_snapshot",
    observedAt: "2026-09-10T09:00:00Z",
    payload: { title: "A", status: 200 },
    provenance: { provider: "seo-engine-crawler" },
  });
  const b = normalizeEvidence({
    siteId: "site-1",
    source: "crawler",
    kind: "page_snapshot",
    observedAt: "2026-09-10T09:00:00Z",
    payload: { status: 200, title: "A" },
    provenance: { provider: "seo-engine-crawler" },
  });
  assert.equal(a.dedupeKey, b.dedupeKey);
});

test("batch removes exact duplicate evidence", () => {
  const input = {
    siteId: "site-1",
    source: "seo_provider" as const,
    kind: "serp" as const,
    observedAt: "2026-09-10T09:00:00Z",
    payload: { keyword: "mens fragrance", rank: 8 },
    provenance: { provider: "openseo" },
  };
  assert.equal(normalizeBatch([input, input]).length, 1);
});

test("secrets are removed recursively from evidence payload", () => {
  const evidence = normalizeEvidence({
    siteId: "site-1",
    source: "ga4",
    kind: "analytics",
    observedAt: "2026-09-10T09:00:00Z",
    payload: { sessions: 12, nested: { accessToken: "do-not-store", value: 2 } },
    provenance: { provider: "ga4" },
  });
  assert.deepEqual(evidence.payload, { sessions: 12, nested: { value: 2 } });
});

test("rejects invalid confidence", () => {
  assert.throws(() => normalizeEvidence({
    siteId: "site-1",
    source: "manual",
    kind: "domain",
    observedAt: "2026-09-10T09:00:00Z",
    payload: {},
    provenance: { provider: "operator" },
    confidence: 1.2,
  }));
});
