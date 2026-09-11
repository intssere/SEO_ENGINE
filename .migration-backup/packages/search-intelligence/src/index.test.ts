import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPolicyPack,
  classifySource,
  deriveAlgorithmUpdateMode,
  evaluatePolicyImpact,
  normalizePolicyChange,
  normalizePolicyChanges,
} from "./index.js";

test("maps source kinds to the locked confidence hierarchy", () => {
  assert.deepEqual(classifySource("official_policy"), { tier: "A", disposition: "production_rule", confidence: 1 });
  assert.equal(classifySource("controlled_experiment").tier, "C");
  assert.equal(classifySource("community_rumor").disposition, "ignore_for_automation");
});

test("normalizes and deterministically fingerprints official policy changes", () => {
  const input = {
    engine: "google" as const,
    sourceKind: "official_documentation" as const,
    sourceUrl: "https://developers.google.com/search/docs/example#section",
    title: "Example change",
    summary: "A documented search change.",
    publishedAt: "2026-09-08",
    category: "regional_policy" as const,
    affectedAreas: [" Ecommerce ", "ecommerce", "regional"],
  };
  const first = normalizePolicyChange(input);
  const second = normalizePolicyChange(input);
  assert.equal(first.fingerprint, second.fingerprint);
  assert.deepEqual(first.affectedAreas, ["ecommerce", "regional"]);
  assert.equal(first.confirmed, true);
  assert.equal(first.tier, "A");
});

test("deduplicates exact policy changes and versions a provider-specific policy pack", () => {
  const raw = {
    engine: "google" as const,
    sourceKind: "official_policy" as const,
    sourceUrl: "https://example.com/policy",
    title: "Spam policy clarification",
    summary: "Clarification.",
    publishedAt: "2026-09-01T00:00:00Z",
    category: "spam_policy" as const,
    affectedAreas: ["content"],
  };
  const changes = normalizePolicyChanges([raw, raw]);
  assert.equal(changes.length, 1);
  const pack = buildPolicyPack("google", "2026.09", changes, "2026-09-10T00:00:00Z");
  assert.equal(pack.changes.length, 1);
  assert.ok(pack.fingerprint.length > 20);
});

test("evaluates site impact using affected-area overlap", () => {
  const change = normalizePolicyChange({
    engine: "google",
    sourceKind: "official_documentation",
    sourceUrl: "https://example.com/docs",
    title: "Structured data change",
    summary: "Product structured data behavior changed.",
    publishedAt: "2026-09-09T00:00:00Z",
    category: "structured_data",
    affectedAreas: ["product_schema", "ecommerce"],
  });
  const pack = buildPolicyPack("google", "2026.09", [change], "2026-09-10T00:00:00Z");
  const signals = evaluatePolicyImpact(pack, { siteId: "site-1", engine: "google", features: ["ecommerce", "shopify"] });
  assert.equal(signals.length, 1);
  assert.deepEqual(signals[0]?.matchedAreas, ["ecommerce"]);
  assert.ok((signals[0]?.relevance ?? 0) > 0.5);
});

test("algorithm update mode activates only for confirmed official ranking/core signals", () => {
  const official = normalizePolicyChange({
    engine: "google",
    sourceKind: "official_status",
    sourceUrl: "https://status.example.com/update",
    title: "Core update",
    summary: "Core update rollout.",
    publishedAt: "2026-09-10T00:00:00Z",
    category: "core_update",
    confirmed: true,
  });
  const rumor = normalizePolicyChange({
    engine: "google",
    sourceKind: "community_rumor",
    sourceUrl: "https://example.com/thread",
    title: "Possible update",
    summary: "Unverified chatter.",
    publishedAt: "2026-09-10T00:00:00Z",
    category: "ranking_update",
    confirmed: true,
  });
  const mode = deriveAlgorithmUpdateMode([rumor, official]);
  assert.equal(mode.active, true);
  assert.equal(mode.freezeHighRiskChanges, true);
  assert.equal(mode.activeChangeFingerprints.length, 1);
  assert.equal(mode.activeChangeFingerprints[0], official.fingerprint);
});
