import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateGeoVisibilitySignals,
  normalizeAiVisibilityBatch,
  normalizeAiVisibilityObservation,
  summarizeAiVisibility,
} from "./index.js";

test("normalizes provider/model provenance and deduplicates citations", () => {
  const observation = normalizeAiVisibilityObservation({
    siteId: "site-1",
    provider: "OpenAI",
    modelFamily: "GPT",
    modelVersion: "5.6",
    query: "best fragrance retailer",
    location: "US",
    language: "en",
    observedAt: "2026-09-10T10:00:00Z",
    answer: "Diamond Shelf is one option.",
    citations: [
      { url: "https://diamondshelf.us/products/a" },
      { url: "https://diamondshelf.us/products/a" },
    ],
    mentionedBrands: ["Diamond Shelf", "Diamond Shelf"],
    samplingMethod: "single-pass",
  });

  assert.equal(observation.citations.length, 1);
  assert.equal(observation.citations[0]?.domain, "diamondshelf.us");
  assert.equal(observation.mentionedBrands.length, 1);
  assert.equal(observation.modelVersion, "5.6");
});

test("batch normalization removes exact duplicate observations", () => {
  const input = {
    siteId: "s",
    provider: "provider",
    modelFamily: "model",
    query: "q",
    observedAt: "2026-09-10T10:00:00Z",
    answer: "answer",
  };
  const batch = normalizeAiVisibilityBatch([input, input]);
  assert.equal(batch.length, 1);
});

test("summarizes brand mentions, target citations, and competitor share", () => {
  const observations = normalizeAiVisibilityBatch([
    {
      siteId: "site-1",
      provider: "provider",
      modelFamily: "model-a",
      modelVersion: "v1",
      query: "q1",
      observedAt: "2026-09-10T10:00:00Z",
      answer: "Diamond Shelf and Sephora are relevant.",
      citations: [{ url: "https://diamondshelf.us/a" }, { url: "https://sephora.com/b" }],
      mentionedBrands: ["Diamond Shelf"],
      competitors: ["Sephora"],
    },
    {
      siteId: "site-1",
      provider: "provider",
      modelFamily: "model-a",
      modelVersion: "v1",
      query: "q2",
      observedAt: "2026-09-10T11:00:00Z",
      answer: "Sephora is a common option.",
      citations: [{ url: "https://sephora.com/c" }],
      competitors: ["Sephora"],
    },
  ]);

  const summary = summarizeAiVisibility(observations, {
    targetDomain: "diamondshelf.us",
    brandNames: ["Diamond Shelf"],
    competitors: ["Sephora"],
  })[0]!;

  assert.equal(summary.observations, 2);
  assert.equal(summary.brandMentionRate, 0.5);
  assert.equal(summary.targetCitationRate, 0.5);
  assert.equal(summary.targetCitationShare, 0.3333);
  assert.equal(summary.competitorMentionShare, 0.6667);
});

test("detects mention-without-citation and competitor visibility gaps", () => {
  const observations = normalizeAiVisibilityBatch([
    {
      siteId: "site-1",
      provider: "provider",
      modelFamily: "model",
      query: "brand query",
      observedAt: "2026-09-10T10:00:00Z",
      answer: "Diamond Shelf offers fragrances.",
      citations: [{ url: "https://example.com/source" }],
    },
    {
      siteId: "site-1",
      provider: "provider",
      modelFamily: "model",
      query: "competitor query",
      observedAt: "2026-09-10T11:00:00Z",
      answer: "Sephora is frequently recommended.",
      citations: [{ url: "https://sephora.com/fragrance" }],
      competitors: ["Sephora"],
    },
  ]);

  const signals = evaluateGeoVisibilitySignals(observations, {
    targetDomain: "diamondshelf.us",
    brandNames: ["Diamond Shelf"],
    competitors: ["Sephora"],
  });

  assert.ok(signals.some((signal) => signal.type === "mention_without_citation"));
  assert.ok(signals.some((signal) => signal.type === "competitor_visibility_gap"));
  assert.ok(signals.every((signal) => signal.dedupeKey.length === 64));
});
