import assert from "node:assert/strict";
import test from "node:test";
import {
  buildKeywordSerpEvidenceRequest,
} from "./keyword-serp-evidence-contract.js";
import {
  normalizeDataForSeoKeywordSerpFixtures,
} from "./dataforseo-keyword-serp-adapter.js";

const request = buildKeywordSerpEvidenceRequest({
  keyword: "stress relief journal",
  market: {
    searchEngine: "google",
    locationCode: 2840,
    languageCode: "en",
    device: "desktop",
  },
});

function envelope(dataset: string, result: unknown, overrides: Record<string, unknown> = {}) {
  return {
    tasks: [{
      id: dataset + "-task-1",
      status_code: 20000,
      status_message: "Ok.",
      path: ["keyword_overview", "related_keywords"].includes(dataset)
        ? "v3/dataforseo_labs/google/" + dataset + "/live"
        : "v3/serp/google/organic/live/advanced",
      cost: 0.01,
      result: [result],
      ...overrides,
    }],
  };
}

const overview = envelope("keyword_overview", {
  keyword: "stress relief journal",
  keyword_info: {
    search_volume: 1900,
    cpc: 1.24,
    competition: 0.41,
    competition_level: "MEDIUM",
    monthly_searches: [
      { year: 2026, month: 8, search_volume: 1800 },
      { year: 2026, month: 7, search_volume: 1700 },
    ],
  },
  keyword_properties: { keyword_difficulty: 38 },
  search_intent_info: { main_intent: "commercial" },
});

const related = envelope("related_keywords", {
  items: [
    {
      keyword: "5 minute stress journal",
      keyword_info: { search_volume: 720, cpc: 0.88, competition: 0.27 },
      keyword_properties: { keyword_difficulty: 29 },
      search_intent_info: { main_intent: "informational" },
    },
    {
      keyword: "calm journal prompts",
      keyword_info: { search_volume: null, cpc: null, competition: null },
      keyword_properties: { keyword_difficulty: null },
      search_intent_info: { main_intent: "new_provider_intent" },
    },
  ],
});

const serp = envelope("serp_advanced", {
  items: [
    {
      type: "organic",
      rank_group: 1,
      rank_absolute: 1,
      url: "https://example.com/stress-journal",
      domain: "example.com",
      title: "Stress Journal",
    },
    {
      type: "people_also_ask",
      rank_group: 1,
      rank_absolute: 2,
      url: "https://example.com/questions",
      domain: "example.com",
      title: "Questions",
    },
    {
      type: "paid",
      rank_group: 1,
      rank_absolute: 3,
      url: "https://ads.example.net/journal",
      domain: "ads.example.net",
      title: "Journal Ad",
    },
  ],
});

test("UGP-6.1A deterministically normalizes keyword, related-topic and SERP evidence", () => {
  const one = normalizeDataForSeoKeywordSerpFixtures({
    request,
    keywordOverview: overview,
    relatedKeywords: related,
    serpAdvanced: serp,
  });
  const two = normalizeDataForSeoKeywordSerpFixtures({
    request,
    keywordOverview: structuredClone(overview),
    relatedKeywords: structuredClone(related),
    serpAdvanced: structuredClone(serp),
  });

  assert.deepEqual(one, two);
  assert.equal(one.evidenceFingerprint, two.evidenceFingerprint);
  assert.equal(one.keyword.searchVolume, 1900);
  assert.equal(one.keyword.keywordDifficulty, 38);
  assert.equal(one.keyword.cpcUsd, 1.24);
  assert.equal(one.keyword.paidCompetition, 0.41);
  assert.equal(one.keyword.paidCompetitionLevel, "medium");
  assert.equal(one.keyword.intent, "commercial");
  assert.deepEqual(one.keyword.monthlySearches, [
    { year: 2026, month: 8, searchVolume: 1800 },
    { year: 2026, month: 7, searchVolume: 1700 },
  ]);
});

test("UGP-6.1A preserves nulls and maps unknown intent to unknown", () => {
  const bundle = normalizeDataForSeoKeywordSerpFixtures({
    request,
    keywordOverview: overview,
    relatedKeywords: related,
    serpAdvanced: serp,
  });
  const sparse = bundle.relatedTopics[1];
  assert.equal(sparse.searchVolume, null);
  assert.equal(sparse.keywordDifficulty, null);
  assert.equal(sparse.cpcUsd, null);
  assert.equal(sparse.paidCompetition, null);
  assert.equal(sparse.intent, "unknown");
});

test("UGP-6.1A preserves ranking type and does not fabricate organic status", () => {
  const bundle = normalizeDataForSeoKeywordSerpFixtures({
    request,
    keywordOverview: overview,
    relatedKeywords: related,
    serpAdvanced: serp,
  });

  assert.deepEqual(bundle.serp.features, ["paid", "people_also_ask"]);
  assert.deepEqual(
    bundle.serp.rankingUrls.map((row) => ({
      rank: row.rankAbsolute,
      type: row.resultType,
      organic: row.isOrganic,
      url: row.url,
    })),
    [
      { rank: 1, type: "organic", organic: true, url: "https://example.com/stress-journal" },
      { rank: 2, type: "people_also_ask", organic: false, url: "https://example.com/questions" },
      { rank: 3, type: "paid", organic: false, url: "https://ads.example.net/journal" },
    ],
  );
});

test("UGP-6.1A retains bounded provider provenance and excludes credential material", () => {
  const bundle = normalizeDataForSeoKeywordSerpFixtures({
    request,
    keywordOverview: overview,
    relatedKeywords: related,
    serpAdvanced: serp,
  });
  assert.equal(bundle.provenance.length, 3);
  for (const source of bundle.provenance) {
    assert.equal(source.provider, "dataforseo");
    assert.equal(source.providerStatusCode, 20000);
    assert.equal(source.costUsd, 0.01);
    assert.match(source.responseFingerprint, /^[0-9a-f]{64}$/);
  }

  const serialized = JSON.stringify(bundle);
  assert.doesNotMatch(serialized, /authorization[_-]?header/i);
  assert.doesNotMatch(serialized, /bearer\s+[A-Za-z0-9._~-]+/i);
  assert.doesNotMatch(serialized, /api[_-]?key/i);
  assert.doesNotMatch(serialized, /client[_-]?secret/i);
  assert.doesNotMatch(serialized, /password/i);
  assert.equal(bundle.semantics.grantsAuthorization, false);
});

test("UGP-6.1A fails closed on DataForSEO task-level failure even with a fixture envelope", () => {
  const failed = envelope("keyword_overview", {}, {
    status_code: 40501,
    status_message: "Invalid Field",
  });
  assert.throws(
    () => normalizeDataForSeoKeywordSerpFixtures({
      request,
      keywordOverview: failed,
      relatedKeywords: related,
      serpAdvanced: serp,
    }),
    /ugp_dataforseo_task_failed_keyword_overview/,
  );
});

test("UGP-6.1A fails closed on malformed provider envelopes", () => {
  assert.throws(
    () => normalizeDataForSeoKeywordSerpFixtures({
      request,
      keywordOverview: { tasks: [] },
      relatedKeywords: related,
      serpAdvanced: serp,
    }),
    /ugp_dataforseo_invalid_keyword_overview_envelope/,
  );
});
