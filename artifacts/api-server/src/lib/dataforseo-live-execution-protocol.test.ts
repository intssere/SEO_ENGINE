import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildDataForSeoLiveExecutionAuthorization,
  buildDataForSeoOneShotCertificationPlan,
  runAuthorizedDataForSeoOneShotCertification,
  UGP_DATAFORSEO_CERTIFICATION_BASIS_COMMIT,
  type DataForSeoAuthorizedCallExecutor,
} from "./dataforseo-live-execution-protocol.js";

function providerResponse(dataset: string, cost = 0.01) {
  if (dataset === "keyword_overview") {
    return {
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
    };
  }
  if (dataset === "related_keywords") {
    return {
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
    };
  }
  return {
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
  };
}

function fixtureAuthorization() {
  const plan = buildDataForSeoOneShotCertificationPlan();
  const authorization = buildDataForSeoLiveExecutionAuthorization({
    authorizationId: "fixture-only-authorization",
    plan,
    explicitLiveProviderExecution: true,
    exactThreeCallsAuthorized: true,
    providerCostCeilingAccepted: true,
    zeroPersistenceRequired: true,
    zeroSchedulingRequired: true,
    zeroPublicationRequired: true,
    zeroProviderWritesRequired: true,
    zeroPublicSiteWritesRequired: true,
  });
  return { plan, authorization };
}

test("UGP-6.1E binds certification to the exact merged 6.1D basis commit", () => {
  const { plan, authorization } = fixtureAuthorization();
  assert.equal(plan.sourceCommitSha, UGP_DATAFORSEO_CERTIFICATION_BASIS_COMMIT);
  assert.equal(
    UGP_DATAFORSEO_CERTIFICATION_BASIS_COMMIT,
    "9526c9409b9d8ad22dc5759b7e80cc71da6ba718",
  );
  assert.equal(authorization.planFingerprint, plan.planFingerprint);
  assert.match(authorization.authorizationFingerprint, /^[0-9a-f]{64}$/);
});

test("UGP-6.1E performs exactly three sequential injected calls and emits sanitized certification receipt", async () => {
  const { plan, authorization } = fixtureAuthorization();
  const calls: string[] = [];

  const executor: DataForSeoAuthorizedCallExecutor = async (input) => {
    calls.push(input.dataset);
    return {
      effectiveUrl: input.url,
      status: 200,
      contentType: "application/json",
      bodyText: JSON.stringify(providerResponse(input.dataset)),
    };
  };

  const receipt = await runAuthorizedDataForSeoOneShotCertification({
    plan,
    authorization,
    executor,
  });

  assert.deepEqual(calls, [
    "keyword_overview",
    "related_keywords",
    "serp_advanced",
  ]);
  assert.equal(receipt.callCount, 3);
  assert.equal(receipt.decision.pass, true);
  assert.equal(receipt.decision.totalProviderReportedCostUsd, 0.03);
  assert.equal(receipt.assertions.automaticRetry, false);
  assert.equal(receipt.assertions.maxConcurrency, 1);
  assert.equal(receipt.assertions.persistence, false);
  assert.equal(receipt.assertions.scheduling, false);
  assert.equal(receipt.assertions.publication, false);
  assert.equal(receipt.assertions.providerWrites, false);
  assert.equal(receipt.assertions.publicSiteWrites, false);
  assert.equal(receipt.assertions.credentialsReturned, false);
  assert.match(receipt.receiptFingerprint, /^[0-9a-f]{64}$/);

  const serialized = JSON.stringify(receipt);
  assert.doesNotMatch(serialized, /authorization\s*:/i);
  assert.doesNotMatch(serialized, /password/i);
  assert.doesNotMatch(serialized, /bearer\s+/i);
});

test("UGP-6.1E rejects authorization tampering before any injected provider call", async () => {
  const { plan, authorization } = fixtureAuthorization();
  let calls = 0;

  await assert.rejects(
    runAuthorizedDataForSeoOneShotCertification({
      plan,
      authorization: {
        ...authorization,
        authorizationFingerprint: "0".repeat(64),
      },
      executor: async () => {
        calls += 1;
        throw new Error("must-not-run");
      },
    }),
    /authorization_integrity_failed/,
  );
  assert.equal(calls, 0);
});

test("UGP-6.1E performs no retry after a provider-call failure", async () => {
  const { plan, authorization } = fixtureAuthorization();
  let calls = 0;

  await assert.rejects(
    runAuthorizedDataForSeoOneShotCertification({
      plan,
      authorization,
      executor: async () => {
        calls += 1;
        throw new Error("provider unavailable");
      },
    }),
    /transport_failed_keyword_overview/,
  );
  assert.equal(calls, 1);
});

test("UGP-6.1E fails closed when captured provider cost exceeds the certification ceiling", async () => {
  const { plan, authorization } = fixtureAuthorization();

  const receipt = await runAuthorizedDataForSeoOneShotCertification({
    plan,
    authorization,
    executor: async (input) => ({
      effectiveUrl: input.url,
      status: 200,
      contentType: "application/json",
      bodyText: JSON.stringify(providerResponse(input.dataset, 0.5)),
    }),
  });

  assert.equal(receipt.decision.pass, false);
  assert.equal(receipt.decision.totalProviderReportedCostUsd, 1.5);
  assert.ok(receipt.decision.reasons.includes("provider_cost_ceiling_exceeded"));
  assert.equal(receipt.decision.certificationFingerprint, null);
});

test("UGP-6.1E protocol source is not runtime-wired and contains no credential or global-fetch implementation", () => {
  const source = readFileSync(new URL("./dataforseo-live-execution-protocol.ts", import.meta.url), "utf8");
  const apiIndex = readFileSync(new URL("../index.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /process\.env/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /password\s*:/i);
  assert.doesNotMatch(source, /client[_-]?secret/i);
  assert.doesNotMatch(apiIndex, /dataforseo-live-execution-protocol/);
  assert.doesNotMatch(apiIndex, /runAuthorizedDataForSeoOneShotCertification/);
});
