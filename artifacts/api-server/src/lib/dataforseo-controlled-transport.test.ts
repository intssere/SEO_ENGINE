import assert from "node:assert/strict";
import test from "node:test";
import {
  acquireDataForSeoKeywordSerpEvidence,
  buildDataForSeoControlledRequest,
  buildDataForSeoLiveCertificationGate,
  DATAFORSEO_ENDPOINTS,
  DATAFORSEO_TRANSPORT_POLICY,
  type DataForSeoHttpClient,
} from "./dataforseo-controlled-transport.js";
import {
  buildKeywordSerpEvidenceRequest,
} from "./keyword-serp-evidence-contract.js";

const request = buildKeywordSerpEvidenceRequest({
  keyword: "stress relief journal",
  market: {
    searchEngine: "google",
    locationCode: 2840,
    languageCode: "en",
    device: "mobile",
  },
});

const gate = buildDataForSeoLiveCertificationGate({
  certificationId: "offline-fixture-certification",
  commercialUseAccepted: true,
  credentialInjectionReviewed: true,
  endpointAllowlistCertified: true,
  costBoundaryAccepted: true,
  providerWriteSeparationCertified: true,
});

function envelope(path: string[], result: unknown) {
  return {
    tasks: [{
      id: "task-1",
      status_code: 20000,
      status_message: "Ok.",
      path,
      cost: 0.01,
      result: [result],
    }],
  };
}

test("UGP-6.1B builds only the three allowlisted one-task POST requests", () => {
  const overview = buildDataForSeoControlledRequest({
    dataset: "keyword_overview",
    request,
  });
  const related = buildDataForSeoControlledRequest({
    dataset: "related_keywords",
    request,
  });
  const serp = buildDataForSeoControlledRequest({
    dataset: "serp_advanced",
    request,
  });

  assert.equal(overview.url, DATAFORSEO_TRANSPORT_POLICY.origin + DATAFORSEO_ENDPOINTS.keyword_overview);
  assert.equal(related.url, DATAFORSEO_TRANSPORT_POLICY.origin + DATAFORSEO_ENDPOINTS.related_keywords);
  assert.equal(serp.url, DATAFORSEO_TRANSPORT_POLICY.origin + DATAFORSEO_ENDPOINTS.serp_advanced);
  assert.equal(JSON.parse(overview.body).length, 1);
  assert.equal(JSON.parse(related.body).length, 1);
  assert.equal(JSON.parse(serp.body).length, 1);
  assert.deepEqual(JSON.parse(overview.body)[0].keywords, ["stress relief journal"]);
  assert.equal(JSON.parse(serp.body)[0].device, "mobile");
  assert.equal(JSON.parse(serp.body)[0].depth, 10);
  assert.equal(DATAFORSEO_TRANSPORT_POLICY.maxAttemptsPerCall, 1);
  assert.equal(DATAFORSEO_TRANSPORT_POLICY.automaticRetry, false);
  assert.equal(DATAFORSEO_TRANSPORT_POLICY.maxConcurrency, 1);
});

test("UGP-6.1B gate integrity is deterministic and explicit", () => {
  const again = buildDataForSeoLiveCertificationGate({
    certificationId: "offline-fixture-certification",
    commercialUseAccepted: true,
    credentialInjectionReviewed: true,
    endpointAllowlistCertified: true,
    costBoundaryAccepted: true,
    providerWriteSeparationCertified: true,
  });
  assert.deepEqual(gate, again);
  assert.match(gate.gateFingerprint, /^[0-9a-f]{64}$/);
});

test("UGP-6.1B controlled acquisition keeps credentials internal and returns normalized evidence only", async () => {
  const calls: Array<{
    url: string;
    headers: Readonly<Record<string, string>>;
    body: string;
  }> = [];

  const responses = [
    envelope(
      ["v3", "dataforseo_labs", "google", "keyword_overview", "live"],
      {
        keyword_info: {
          search_volume: 1900,
          cpc: 1.24,
          competition: 0.41,
          competition_level: "MEDIUM",
          monthly_searches: [{ year: 2026, month: 8, search_volume: 1800 }],
        },
        keyword_properties: { keyword_difficulty: 38 },
        search_intent_info: { main_intent: "commercial" },
      },
    ),
    envelope(
      ["v3", "dataforseo_labs", "google", "related_keywords", "live"],
      {
        items: [{
          keyword_data: {
            keyword: "calm journal prompts",
            keyword_info: { search_volume: 720, cpc: 0.88, competition: 0.27 },
            keyword_properties: { keyword_difficulty: 29 },
            search_intent_info: { main_intent: "informational" },
          },
        }],
      },
    ),
    envelope(
      ["v3", "serp", "google", "organic", "advanced", "live"],
      {
        items: [{
          type: "organic",
          rank_group: 1,
          rank_absolute: 1,
          url: "https://example.com/journal",
          domain: "example.com",
          title: "Journal",
        }],
      },
    ),
  ];

  const client: DataForSeoHttpClient = async (input) => {
    calls.push({ url: input.url, headers: input.headers, body: input.body });
    const next = responses.shift();
    if (!next) throw new Error("unexpected_call");
    return {
      status: 200,
      contentType: "application/json; charset=utf-8",
      bodyText: JSON.stringify(next),
    };
  };

  const bundle = await acquireDataForSeoKeywordSerpEvidence({
    request,
    credentialProfileId: "dataforseo-primary",
    gate,
    resolveCredentials: async (profileId) => {
      assert.equal(profileId, "dataforseo-primary");
      return { login: "fixture-login", password: "fixture-password" };
    },
    httpClient: client,
  });

  assert.equal(calls.length, 3);
  assert.ok(calls.every((call) => call.headers.authorization.startsWith("Basic ")));
  assert.equal(bundle.keyword.searchVolume, 1900);
  assert.equal(bundle.relatedTopics[0]?.keyword, "calm journal prompts");
  assert.equal(bundle.serp.rankingUrls[0]?.url, "https://example.com/journal");
  assert.deepEqual(
    bundle.provenance.map((p) => p.providerPath),
    [
      "v3/dataforseo_labs/google/keyword_overview/live",
      "v3/dataforseo_labs/google/related_keywords/live",
      "v3/serp/google/organic/advanced/live",
    ],
  );

  const serialized = JSON.stringify(bundle);
  assert.doesNotMatch(serialized, /fixture-login/);
  assert.doesNotMatch(serialized, /fixture-password/);
  assert.doesNotMatch(serialized, /Basic\s+/);
  assert.equal(bundle.semantics.grantsAuthorization, false);
});

test("UGP-6.1B fails closed before credential resolution when live gate is invalid", async () => {
  let credentialReads = 0;
  let httpCalls = 0;
  const badGate = { ...gate, gateFingerprint: "0".repeat(64) };

  await assert.rejects(
    acquireDataForSeoKeywordSerpEvidence({
      request,
      credentialProfileId: "dataforseo-primary",
      gate: badGate,
      resolveCredentials: async () => {
        credentialReads += 1;
        return { login: "x", password: "y" };
      },
      httpClient: async () => {
        httpCalls += 1;
        throw new Error("must_not_run");
      },
    }),
    /ugp_dataforseo_live_gate_integrity_failed/,
  );
  assert.equal(credentialReads, 0);
  assert.equal(httpCalls, 0);
});

test("UGP-6.1B performs no automatic retry after a transport failure", async () => {
  let calls = 0;
  await assert.rejects(
    acquireDataForSeoKeywordSerpEvidence({
      request,
      credentialProfileId: "dataforseo-primary",
      gate,
      resolveCredentials: async () => ({ login: "fixture-login", password: "fixture-password" }),
      httpClient: async () => {
        calls += 1;
        throw new Error("provider unavailable");
      },
    }),
    /ugp_dataforseo_transport_failed_keyword_overview/,
  );
  assert.equal(calls, 1);
});

test("UGP-6.1B rejects HTTP errors, non-JSON, malformed JSON, and oversized response bodies", async () => {
  const cases = [
    { response: { status: 429, contentType: "application/json", bodyText: "{}" }, pattern: /http_failed/ },
    { response: { status: 200, contentType: "text/html", bodyText: "{}" }, pattern: /non_json/ },
    { response: { status: 200, contentType: "application/json", bodyText: "{" }, pattern: /invalid_json/ },
    {
      response: {
        status: 200,
        contentType: "application/json",
        bodyText: "x".repeat(DATAFORSEO_TRANSPORT_POLICY.maxResponseBytes + 1),
      },
      pattern: /response_size/,
    },
  ] as const;

  for (const item of cases) {
    await assert.rejects(
      acquireDataForSeoKeywordSerpEvidence({
        request,
        credentialProfileId: "dataforseo-primary",
        gate,
        resolveCredentials: async () => ({ login: "fixture-login", password: "fixture-password" }),
        httpClient: async () => item.response,
      }),
      item.pattern,
    );
  }
});
