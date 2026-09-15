import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { compareFullSiteCrawlHistory, type CrawlHistoryComparison } from "./crawl-history-comparison.js";
import { assertIncrementalRecrawlPlanIntegrity, buildIncrementalRecrawlPlan } from "./incremental-recrawl-planner.js";
import { buildIncrementalRecrawlTestSource } from "./incremental-recrawl-planner-fixtures.js";

function stableSerialize(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(object[key])}`).join(",")}}`;
}

function refingerprint(comparison: CrawlHistoryComparison): CrawlHistoryComparison {
  const { fingerprint: _old, ...withoutFingerprint } = comparison;
  return {
    ...withoutFingerprint,
    fingerprint: createHash("sha256").update(stableSerialize(withoutFingerprint)).digest("hex"),
  };
}

test("P2.6 rejects a refingerprinted comparison that disagrees with supplied upstream snapshots", () => {
  const before = buildIncrementalRecrawlTestSource({ entries: [{ path: "/a" }] });
  const after = buildIncrementalRecrawlTestSource({ entries: [{ path: "/a" }] });
  const comparison = compareFullSiteCrawlHistory({ before, after });
  const changed = structuredClone(comparison);
  changed.inventoryChanges.added = [{ canonicalUrl: "https://diamondshelf.us/extra", lastmod: null }];
  changed.summary.inventoryMembershipChanged = true;
  changed.summary.changeDetected = true;

  assert.throws(
    () => buildIncrementalRecrawlPlan({
      comparison: refingerprint(changed),
      before,
      after,
      policy: { maxPlanUrls: 10, batchSize: 5 },
    }),
    /incremental_recrawl_comparison_lineage_mismatch/,
  );
});

test("P2.6 integrity validator rejects semantic priority tampering", () => {
  const source = buildIncrementalRecrawlTestSource({ entries: [{ path: "/a" }] });
  const comparison = compareFullSiteCrawlHistory({ before: source, after: source });
  const plan = buildIncrementalRecrawlPlan({
    comparison,
    before: source,
    after: source,
    policy: { maxPlanUrls: 10, batchSize: 5 },
    trustedCandidates: [{ canonicalUrl: "https://diamondshelf.us/a", signals: ["stale"] }],
  });
  const changed = structuredClone(plan);
  changed.items[0].priority = "p0_change";

  assert.throws(
    () => assertIncrementalRecrawlPlanIntegrity(changed),
    /incremental_recrawl_plan_items_priority_invalid/,
  );
});
