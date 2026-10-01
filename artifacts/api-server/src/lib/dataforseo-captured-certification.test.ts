import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  attestCapturedDataForSeoEvidence,
  type CapturedDataForSeoObservation,
} from "./dataforseo-captured-certification.js";
import {
  buildKeywordSerpEvidenceRequest,
} from "./keyword-serp-evidence-contract.js";

const request = buildKeywordSerpEvidenceRequest({
  keyword: "stress relief journal",
  market: {
    searchEngine: "google",
    locationCode: 2840,
    languageCode: "en",
    device: "desktop",
  },
});

function payloads() {
  return {
    keyword_overview: {
      tasks: [{
        id: "overview-task",
        status_code: 20000,
        status_message: "Ok.",
        path: ["v3", "dataforseo_labs", "google", "keyword_overview", "live"],
        cost: 0.01,
        result: [{
          items: [{
            keyword: "stress relief journal",
            keyword_info: {
              search_volume: 1900,
              cpc: 1.24,
              competition: 0.41,
              competition_level: "MEDIUM",
              monthly_searches: [{ year: 2026, month: 8, search_volume: 1800 }],
            },
            keyword_properties: { keyword_difficulty: 38 },
            search_intent_info: { main_intent: "commercial" },
          }],
        }],
      }],
    },
    related_keywords: {
      tasks: [{
        id: "related-task",
        status_code: 20000,
        status_message: "Ok.",
        path: ["v3", "dataforseo_labs", "google", "related_keywords", "live"],
        cost: 0.01,
        result: [{
          items: [{
            keyword_data: {
              keyword: "calm journal prompts",
              keyword_info: { search_volume: 720, cpc: 0.88, competition: 0.27 },
              keyword_properties: { keyword_difficulty: 29 },
              search_intent_info: { main_intent: "informational" },
            },
          }],
        }],
      }],
    },
    serp_advanced: {
      tasks: [{
        id: "serp-task",
        status_code: 20000,
        status_message: "Ok.",
        path: ["v3", "serp", "google", "organic", "advanced", "live"],
        cost: 0.01,
        result: [{
          items: [{
            type: "organic",
            rank_group: 1,
            rank_absolute: 1,
            url: "https://example.com/journal",
            domain: "example.com",
            title: "Journal",
          }],
        }],
      }],
    },
  };
}

function observations(): CapturedDataForSeoObservation[] {
  const p = payloads();
  return [
    {
      dataset: "keyword_overview",
      effectiveUrl: "https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_overview/live",
      status: 200,
      contentType: "application/json; charset=utf-8",
      responseBytes: Buffer.byteLength(JSON.stringify(p.keyword_overview)),
      payload: p.keyword_overview,
    },
    {
      dataset: "related_keywords",
      effectiveUrl: "https://api.dataforseo.com/v3/dataforseo_labs/google/related_keywords/live",
      status: 200,
      contentType: "application/json; charset=utf-8",
      responseBytes: Buffer.byteLength(JSON.stringify(p.related_keywords)),
      payload: p.related_keywords,
    },
    {
      dataset: "serp_advanced",
      effectiveUrl: "https://api.dataforseo.com/v3/serp/google/organic/live/advanced",
      status: 200,
      contentType: "application/json; charset=utf-8",
      responseBytes: Buffer.byteLength(JSON.stringify(p.serp_advanced)),
      payload: p.serp_advanced,
    },
  ];
}

test("UGP-6.1C deterministically attests the exact captured three-response set offline", () => {
  const one = attestCapturedDataForSeoEvidence({
    sourceCommitSha: "a383082033e1b63fdde72e17e5f98408cb3cf6cd",
    request,
    observations: observations(),
  });
  const two = attestCapturedDataForSeoEvidence({
    sourceCommitSha: "a383082033e1b63fdde72e17e5f98408cb3cf6cd",
    request,
    observations: observations(),
  });

  assert.deepEqual(one, two);
  assert.match(one.certificationFingerprint, /^[0-9a-f]{64}$/);
  assert.equal(one.evidence.keyword.searchVolume, 1900);
  assert.equal(one.evidence.relatedTopics[0]?.keyword, "calm journal prompts");
  assert.equal(one.evidence.serp.rankingUrls[0]?.url, "https://example.com/journal");
  assert.deepEqual(one.assertions, {
    offlineOnly: true,
    networkCalls: false,
    credentialsPresent: false,
    providerWrites: false,
    publicSiteWrites: false,
    persistence: false,
    scheduling: false,
    autonomousExecution: false,
  });
});

test("UGP-6.1C fails closed on source, endpoint, dataset, status, type and response-bound drift", () => {
  assert.throws(
    () => attestCapturedDataForSeoEvidence({
      sourceCommitSha: "bad",
      request,
      observations: observations(),
    }),
    /invalid_source_sha/,
  );
  assert.throws(
    () => attestCapturedDataForSeoEvidence({
      sourceCommitSha: "a383082033e1b63fdde72e17e5f98408cb3cf6cd",
      request,
      observations: observations().slice(0, 2),
    }),
    /exact_three/,
  );

  const duplicate = observations();
  duplicate[2] = { ...duplicate[2], dataset: "keyword_overview" };
  assert.throws(
    () => attestCapturedDataForSeoEvidence({
      sourceCommitSha: "a383082033e1b63fdde72e17e5f98408cb3cf6cd",
      request,
      observations: duplicate,
    }),
    /dataset_set/,
  );

  for (const change of [
    { effectiveUrl: "https://evil.example/v3/serp/google/organic/live/advanced" },
    { status: 500 },
    { contentType: "text/html" },
    { responseBytes: 1 },
  ]) {
    const changed = observations();
    changed[2] = { ...changed[2], ...change };
    assert.throws(() => attestCapturedDataForSeoEvidence({
      sourceCommitSha: "a383082033e1b63fdde72e17e5f98408cb3cf6cd",
      request,
      observations: changed,
    }));
  }
});

test("UGP-6.1C payload tampering changes evidence and certification fingerprints", () => {
  const one = attestCapturedDataForSeoEvidence({
    sourceCommitSha: "a383082033e1b63fdde72e17e5f98408cb3cf6cd",
    request,
    observations: observations(),
  });
  const changed = observations();
  const payload = structuredClone(changed[0].payload) as any;
  payload.tasks[0].result[0].items[0].keyword_info.search_volume = 2000;
  changed[0] = {
    ...changed[0],
    responseBytes: Buffer.byteLength(JSON.stringify(payload)),
    payload,
  };
  const two = attestCapturedDataForSeoEvidence({
    sourceCommitSha: "a383082033e1b63fdde72e17e5f98408cb3cf6cd",
    request,
    observations: changed,
  });

  assert.notEqual(one.evidence.evidenceFingerprint, two.evidence.evidenceFingerprint);
  assert.notEqual(one.certificationFingerprint, two.certificationFingerprint);
});

test("UGP-6.1C attestation source has no network or credential path", () => {
  const source = readFileSync(new URL("./dataforseo-captured-certification.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /process\.env/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /authorization\s*:/i);
  assert.doesNotMatch(source, /password\s*:/i);
  assert.doesNotMatch(source, /client[_-]?secret/i);
});
