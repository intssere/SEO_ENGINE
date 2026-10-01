import assert from "node:assert/strict";
import test from "node:test";
import {
  assertKeywordSerpEvidenceSafety,
  buildKeywordSerpEvidenceRequest,
  finalizeKeywordSerpEvidenceBundle,
} from "./keyword-serp-evidence-contract.js";

const market = {
  searchEngine: "google" as const,
  locationCode: 2840,
  languageCode: "en",
  device: "desktop" as const,
};

test("UGP-6.1A request fingerprint binds keyword and explicit market scope", () => {
  const base = buildKeywordSerpEvidenceRequest({ keyword: "skin care", market });
  const changedLocation = buildKeywordSerpEvidenceRequest({
    keyword: "skin care",
    market: { ...market, locationCode: 2826 },
  });
  const changedLanguage = buildKeywordSerpEvidenceRequest({
    keyword: "skin care",
    market: { ...market, languageCode: "es" },
  });
  const changedDevice = buildKeywordSerpEvidenceRequest({
    keyword: "skin care",
    market: { ...market, device: "mobile" },
  });

  assert.match(base.requestFingerprint, /^[0-9a-f]{64}$/);
  assert.notEqual(base.requestFingerprint, changedLocation.requestFingerprint);
  assert.notEqual(base.requestFingerprint, changedLanguage.requestFingerprint);
  assert.notEqual(base.requestFingerprint, changedDevice.requestFingerprint);
});

test("UGP-6.1A rejects missing or invalid market scope", () => {
  assert.throws(
    () => buildKeywordSerpEvidenceRequest({
      keyword: "skin care",
      market: { ...market, locationCode: 0 },
    }),
    /ugp_keyword_serp_invalid_location_code/,
  );
  assert.throws(
    () => buildKeywordSerpEvidenceRequest({
      keyword: "skin care",
      market: { ...market, languageCode: "" },
    }),
    /ugp_keyword_serp_invalid_language_code/,
  );
});

test("UGP-6.1A evidence semantics are permanently read-only and non-authorizing", () => {
  const request = buildKeywordSerpEvidenceRequest({ keyword: "skin care", market });
  const bundle = finalizeKeywordSerpEvidenceBundle({
    keyword: {
      keyword: request.keyword,
      market: request.market,
      searchVolume: null,
      keywordDifficulty: null,
      cpcUsd: null,
      paidCompetition: null,
      paidCompetitionLevel: null,
      intent: "unknown",
      monthlySearches: [],
    },
    relatedTopics: [],
    serp: {
      keyword: request.keyword,
      market: request.market,
      features: [],
      rankingUrls: [],
    },
    provenance: [],
  });

  assertKeywordSerpEvidenceSafety(bundle);
  assert.deepEqual(bundle.semantics, {
    readOnly: true,
    grantsAuthorization: false,
    grantsProviderWrite: false,
    grantsPublicSiteWrite: false,
    performsNetworkOperation: false,
  });
  assert.match(bundle.evidenceFingerprint, /^[0-9a-f]{64}$/);
});
