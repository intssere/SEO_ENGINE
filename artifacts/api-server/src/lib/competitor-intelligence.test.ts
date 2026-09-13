import assert from "node:assert/strict";
import test from "node:test";
import {
  compareCompetitorSignals,
  COMPETITOR_EVIDENCE_KIND,
  COMPETITOR_EVIDENCE_SCHEMA_VERSION,
  deduplicateCompetitorEvidence,
  normalizeCompetitorObservation,
  type CompetitorObservationInput,
} from "./competitor-intelligence.js";

const base: CompetitorObservationInput = {
  source: "SERP Research",
  sourceUrl: "https://example-competitor.com/collections/unisex?utm_source=research#details",
  competitorDomain: "www.example-competitor.com",
  pageType: "Collection",
  observedAt: "2026-09-13T12:00:00.000Z",
  confidence: 0.8,
  title: "Unisex Fragrance Collection",
  metaDescription: "A competitor meta description that must not be retained verbatim.",
  h1: "Unisex Fragrance",
  bodyText: "Sensitive competitor body copy that must not be retained anywhere in normalized evidence output.",
  keywordThemes: ["Unisex Fragrance", "Gift Sets", "unisex fragrance"],
  taxonomyLabels: ["Perfume Oils", "Gift Sets"],
  schemaTypes: ["CollectionPage", "ItemList", "collectionpage"],
  entityTypes: ["Brand", "Product"],
  internalLinkPatterns: ["collection-to-product", "Collection-To-Product"],
};

const requireRecord = (input: CompetitorObservationInput = base, ownDomain = "diamondshelf.us") => {
  const result = normalizeCompetitorObservation(input, ownDomain);
  if (!result.ok) throw new Error(`competitor observation normalization failed: ${result.reason}`);
  assert.equal(result.ok, true);
  return result.record;
};

test("normalization is deterministic across duplicate and reordered derived signals", () => {
  const first = requireRecord();
  const second = requireRecord({
    ...base,
    sourceUrl: "https://example-competitor.com/collections/unisex?different=tracking#other-fragment",
    keywordThemes: ["gift sets", "UNISEX FRAGRANCE", "gift sets"],
    taxonomyLabels: ["gift sets", "perfume oils"],
    schemaTypes: ["itemlist", "COLLECTIONPAGE", "itemlist"],
    entityTypes: ["product", "brand"],
    internalLinkPatterns: ["COLLECTION-TO-PRODUCT"],
  });

  assert.equal(first.kind, COMPETITOR_EVIDENCE_KIND);
  assert.equal(first.payload.schemaVersion, COMPETITOR_EVIDENCE_SCHEMA_VERSION);
  assert.equal(first.payload.fingerprint, second.payload.fingerprint);
  assert.deepEqual(first.payload.signals.keywordThemes, ["gift sets", "unisex fragrance"]);
  assert.deepEqual(first.payload.signals.schemaTypes, ["collectionpage", "itemlist"]);
  assert.equal(first.payload.sourceUrl, "https://example-competitor.com/collections/unisex");
});

test("own-domain, owned subdomains, and mismatched-domain observations fail closed", () => {
  const own = normalizeCompetitorObservation({ ...base, sourceUrl: "https://diamondshelf.us/collections/unisex", competitorDomain: "diamondshelf.us" }, "www.diamondshelf.us");
  assert.deepEqual(own, { ok: false, reason: "own_domain_observation" });

  const ownedSubdomain = normalizeCompetitorObservation({ ...base, sourceUrl: "https://shop.diamondshelf.us/collections/unisex", competitorDomain: "shop.diamondshelf.us" }, "diamondshelf.us");
  assert.deepEqual(ownedSubdomain, { ok: false, reason: "own_domain_observation" });

  const mismatch = normalizeCompetitorObservation({ ...base, competitorDomain: "different-example.com" }, "diamondshelf.us");
  assert.deepEqual(mismatch, { ok: false, reason: "domain_url_mismatch" });
});

test("normalization retains derived structure but never raw competitor copy", () => {
  const record = requireRecord();
  const serialized = JSON.stringify(record);

  assert.equal(serialized.includes(base.bodyText as string), false);
  assert.equal(serialized.includes(base.metaDescription as string), false);
  assert.equal(serialized.includes(base.title as string), false);
  assert.equal(serialized.includes(base.h1 as string), false);
  assert.equal(serialized.includes("utm_source"), false);
  assert.equal(record.payload.signals.titleLength, "Unisex Fragrance Collection".length);
  assert.equal(record.payload.signals.metaDescriptionLength, (base.metaDescription as string).length);
  assert.equal(record.payload.signals.h1Present, true);
  assert.ok(record.payload.signals.wordCount > 0);
  assert.equal(record.payload.advisoryOnly, true);
  assert.equal(record.payload.executionAuthorized, false);
  assert.equal(record.payload.publicSiteWrites, false);
});

test("same normalized competitor content deduplicates to the newest observation", () => {
  const older = requireRecord({ ...base, observedAt: "2026-09-12T12:00:00.000Z" });
  const newer = requireRecord({ ...base, observedAt: "2026-09-13T12:00:00.000Z" });
  const unique = deduplicateCompetitorEvidence([older, newer]);

  assert.equal(unique.length, 1);
  assert.equal(unique[0]?.observedAt, "2026-09-13T12:00:00.000Z");
});

test("gap comparison is advisory only and never authorizes execution", () => {
  const competitor = requireRecord().payload;
  const result = compareCompetitorSignals({
    keywordThemes: ["unisex fragrance"],
    taxonomyLabels: ["gift sets"],
    schemaTypes: ["collectionpage"],
    entityTypes: ["brand"],
    internalLinkPatterns: [],
  }, competitor);

  assert.deepEqual(result.gaps.keywordThemes, ["gift sets"]);
  assert.deepEqual(result.gaps.taxonomyLabels, ["perfume oils"]);
  assert.deepEqual(result.gaps.schemaTypes, ["itemlist"]);
  assert.deepEqual(result.gaps.entityTypes, ["product"]);
  assert.deepEqual(result.gaps.internalLinkPatterns, ["collection-to-product"]);
  assert.equal(result.gapCount, 5);
  assert.equal(result.advisoryOnly, true);
  assert.equal(result.causalAttribution, false);
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.publicSiteWrites, false);
  assert.equal(result.automaticTransition, false);
});

test("malformed or credential-bearing URLs, timestamps, confidence, and source fail closed", () => {
  assert.deepEqual(normalizeCompetitorObservation({ ...base, source: "   " }, "diamondshelf.us"), { ok: false, reason: "invalid_source" });
  assert.deepEqual(normalizeCompetitorObservation({ ...base, sourceUrl: "not-a-url" }, "diamondshelf.us"), { ok: false, reason: "invalid_source_url" });
  assert.deepEqual(normalizeCompetitorObservation({ ...base, sourceUrl: "https://user:secret@example-competitor.com/collections/unisex" }, "diamondshelf.us"), { ok: false, reason: "invalid_source_url" });
  assert.deepEqual(normalizeCompetitorObservation({ ...base, observedAt: "not-a-date" }, "diamondshelf.us"), { ok: false, reason: "invalid_observed_at" });
  assert.deepEqual(normalizeCompetitorObservation({ ...base, confidence: 1.5 }, "diamondshelf.us"), { ok: false, reason: "invalid_confidence" });
});
