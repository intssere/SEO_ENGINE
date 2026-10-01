import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDataForSeoLiveCertificationPlan,
  evaluateDataForSeoLiveCertification,
  assertDataForSeoLiveTransportPolicy,
  UGP_DATAFORSEO_LIVE_SCOPE,
} from "./dataforseo-live-certification-gate.js";
import {
  buildKeywordSerpEvidenceRequest,
} from "./keyword-serp-evidence-contract.js";
import {
  attestCapturedDataForSeoEvidence,
  type CapturedDataForSeoObservation,
} from "./dataforseo-captured-certification.js";

const request = buildKeywordSerpEvidenceRequest({
  keyword: "stress relief journal",
  market: {
    searchEngine: "google",
    locationCode: 2840,
    languageCode: "en",
    device: "desktop",
  },
});

function payloads(cost = 0.01) {
  return {
    keyword_overview: {
      tasks: [{
        id: "overview-task",
        status_code: 20000,
        status_message: "Ok.",
        path: ["v3", "dataforseo_labs", "google", "keyword_overview", "live"],
        cost,
        result: [{
          items: [{
            keyword: "stress relief journal",
            keyword_info: { search_volume: 1900, cpc: 1.24, competition: 0.41 },
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
        cost,
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
        cost,
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

function observations(cost = 0.01): CapturedDataForSeoObservation[] {
  const p = payloads(cost);
  return [
    {
      dataset: "keyword_overview",
      effectiveUrl: "https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_overview/live",
      status: 200,
      contentType: "application/json",
      responseBytes: Buffer.byteLength(JSON.stringify(p.keyword_overview)),
      payload: p.keyword_overview,
    },
    {
      dataset: "related_keywords",
      effectiveUrl: "https://api.dataforseo.com/v3/dataforseo_labs/google/related_keywords/live",
      status: 200,
      contentType: "application/json",
      responseBytes: Buffer.byteLength(JSON.stringify(p.related_keywords)),
      payload: p.related_keywords,
    },
    {
      dataset: "serp_advanced",
      effectiveUrl: "https://api.dataforseo.com/v3/serp/google/organic/live/advanced",
      status: 200,
      contentType: "application/json",
      responseBytes: Buffer.byteLength(JSON.stringify(p.serp_advanced)),
      payload: p.serp_advanced,
    },
  ];
}

test("UGP-6.1D binds the exact one-shot live certification scope", () => {
  assertDataForSeoLiveTransportPolicy();
  const plan = buildDataForSeoLiveCertificationPlan({
    sourceCommitSha: "bf3d7c32c7dcbe6b9c49b8652788a0aab6e058aa",
    request,
  });

  assert.equal(plan.request.keyword, UGP_DATAFORSEO_LIVE_SCOPE.keyword);
  assert.deepEqual(plan.request.market, UGP_DATAFORSEO_LIVE_SCOPE.market);
  assert.equal(plan.maxCalls, 3);
  assert.equal(plan.maxAttemptsPerCall, 1);
  assert.equal(plan.automaticRetry, false);
  assert.equal(plan.maxConcurrency, 1);
  assert.equal(plan.maxProviderReportedCostUsd, 1);
  assert.equal(plan.providerWrites, false);
  assert.equal(plan.publicSiteWrites, false);
  assert.equal(plan.persistence, false);
  assert.equal(plan.scheduling, false);
  assert.equal(plan.autonomousExecution, false);
  assert.equal(plan.publication, false);
  assert.match(plan.planFingerprint, /^[0-9a-f]{64}$/);
});

test("UGP-6.1D rejects keyword, market, source and profile drift", () => {
  const wrongKeyword = buildKeywordSerpEvidenceRequest({
    keyword: "different keyword",
    market: request.market,
  });
  assert.throws(
    () => buildDataForSeoLiveCertificationPlan({
      sourceCommitSha: "bf3d7c32c7dcbe6b9c49b8652788a0aab6e058aa",
      request: wrongKeyword,
    }),
    /scope_drift/,
  );

  const wrongMarket = buildKeywordSerpEvidenceRequest({
    keyword: request.keyword,
    market: { ...request.market, device: "mobile" },
  });
  assert.throws(
    () => buildDataForSeoLiveCertificationPlan({
      sourceCommitSha: "bf3d7c32c7dcbe6b9c49b8652788a0aab6e058aa",
      request: wrongMarket,
    }),
    /scope_drift/,
  );
  assert.throws(
    () => buildDataForSeoLiveCertificationPlan({
      sourceCommitSha: "bad",
      request,
    }),
    /invalid_source_sha/,
  );
  assert.throws(
    () => buildDataForSeoLiveCertificationPlan({
      sourceCommitSha: "bf3d7c32c7dcbe6b9c49b8652788a0aab6e058aa",
      request,
      credentialProfileId: " bad ",
    }),
    /invalid_credential_profile/,
  );
});

test("UGP-6.1D passes a matching captured certification under the cost ceiling", () => {
  const plan = buildDataForSeoLiveCertificationPlan({
    sourceCommitSha: "bf3d7c32c7dcbe6b9c49b8652788a0aab6e058aa",
    request,
  });
  const certification = attestCapturedDataForSeoEvidence({
    sourceCommitSha: plan.sourceCommitSha,
    request,
    observations: observations(0.01),
  });
  const decision = evaluateDataForSeoLiveCertification({ plan, certification });
  assert.equal(decision.pass, true);
  assert.deepEqual(decision.reasons, []);
  assert.equal(decision.totalProviderReportedCostUsd, 0.03);
  assert.equal(decision.certificationFingerprint, certification.certificationFingerprint);
});

test("UGP-6.1D fails closed when provider-reported cost exceeds the ceiling", () => {
  const plan = buildDataForSeoLiveCertificationPlan({
    sourceCommitSha: "bf3d7c32c7dcbe6b9c49b8652788a0aab6e058aa",
    request,
  });
  const certification = attestCapturedDataForSeoEvidence({
    sourceCommitSha: plan.sourceCommitSha,
    request,
    observations: observations(0.5),
  });
  const decision = evaluateDataForSeoLiveCertification({ plan, certification });
  assert.equal(decision.pass, false);
  assert.equal(decision.totalProviderReportedCostUsd, 1.5);
  assert.ok(decision.reasons.includes("provider_cost_ceiling_exceeded"));
  assert.equal(decision.certificationFingerprint, null);
});

test("UGP-6.1D fails closed on source/request/endpoint drift", () => {
  const plan = buildDataForSeoLiveCertificationPlan({
    sourceCommitSha: "bf3d7c32c7dcbe6b9c49b8652788a0aab6e058aa",
    request,
  });
  const certification = attestCapturedDataForSeoEvidence({
    sourceCommitSha: plan.sourceCommitSha,
    request,
    observations: observations(),
  });

  const bad = {
    ...certification,
    sourceCommitSha: "0".repeat(40),
    requestFingerprint: "1".repeat(64),
    endpointFingerprints: {
      ...certification.endpointFingerprints,
      serp_advanced: "2".repeat(64),
    },
  };
  const decision = evaluateDataForSeoLiveCertification({
    plan,
    certification: bad,
  });
  assert.equal(decision.pass, false);
  assert.ok(decision.reasons.includes("source_commit_mismatch"));
  assert.ok(decision.reasons.includes("request_fingerprint_mismatch"));
  assert.ok(decision.reasons.includes("endpoint_fingerprint_mismatch:serp_advanced"));
});
