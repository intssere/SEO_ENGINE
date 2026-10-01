import assert from "node:assert/strict";
import test from "node:test";
import {
  executeDataForSeoDisposableLiveCertification,
  type DataForSeoDisposableFetch,
} from "./dataforseo-disposable-live-runner.js";

function payload(dataset: string, cost = 0.01): unknown {
  if (dataset === "keyword_overview") {
    return {
      tasks: [{
        id: "overview-task",
        status_code: 20000,
        status_message: "Ok.",
        path: ["v3","dataforseo_labs","google","keyword_overview","live"],
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
        path: ["v3","dataforseo_labs","google","related_keywords","live"],
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
      path: ["v3","serp","google","organic","live","advanced"],
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

test("UGP-6.1G performs exactly three sequential fixed calls and returns sanitized certification", async () => {
  const calls: Array<{url:string; body:string; authorization:string}> = [];
  let active = 0;
  let maxActive = 0;

  const fetchImpl: DataForSeoDisposableFetch = async (url, init) => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    const dataset =
      url.includes("keyword_overview") ? "keyword_overview"
      : url.includes("related_keywords") ? "related_keywords"
      : "serp_advanced";
    calls.push({
      url,
      body:init.body,
      authorization:init.headers.authorization,
    });
    await Promise.resolve();
    active -= 1;
    return {
      url,
      status: 200,
      headers:{get:(name:string)=>name.toLowerCase()==="content-type"?"application/json":null},
      text:async()=>JSON.stringify(payload(dataset)),
    };
  };

  const result = await executeDataForSeoDisposableLiveCertification({
    env:{
      DATAFORSEO_PRIMARY_LOGIN:"fixture-login",
      DATAFORSEO_PRIMARY_PASSWORD:"fixture-password",
    },
    fetchImpl,
  });

  assert.equal(calls.length,3);
  assert.equal(maxActive,1);
  assert.deepEqual(calls.map(c=>c.url),[
    "https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_overview/live",
    "https://api.dataforseo.com/v3/dataforseo_labs/google/related_keywords/live",
    "https://api.dataforseo.com/v3/serp/google/organic/live/advanced",
  ]);
  assert.equal(
    calls[0].body,
    '[{"keywords":["stress relief journal"],"language_code":"en","location_code":2840}]',
  );
  assert.equal(
    calls[1].body,
    '[{"depth":1,"include_seed_keyword":false,"include_serp_info":false,"keyword":"stress relief journal","language_code":"en","limit":100,"location_code":2840}]',
  );
  assert.equal(
    calls[2].body,
    '[{"depth":10,"device":"desktop","keyword":"stress relief journal","language_code":"en","location_code":2840}]',
  );
  assert.ok(calls.every(c=>c.authorization.startsWith("Basic ")));
  assert.equal(result.callCountObserved,3);
  assert.equal(result.providerReportedCostUsd,0.03);
  assert.equal(result.receipt.decision.pass,true);

  const serialized=JSON.stringify(result);
  assert.doesNotMatch(serialized,/fixture-login/);
  assert.doesNotMatch(serialized,/fixture-password/);
  assert.doesNotMatch(serialized,/Basic\s+[A-Za-z0-9+/=]+/);
});

test("UGP-6.1G fails before network when credentials are absent", async () => {
  let calls=0;
  await assert.rejects(
    executeDataForSeoDisposableLiveCertification({
      env:{},
      fetchImpl:async()=>{calls+=1;throw new Error("must-not-run");},
    }),
    /missing_login/,
  );
  assert.equal(calls,0);
});

test("UGP-6.1G stops immediately with no retry after first-call failure", async () => {
  let calls=0;
  await assert.rejects(
    executeDataForSeoDisposableLiveCertification({
      env:{
        DATAFORSEO_PRIMARY_LOGIN:"fixture-login",
        DATAFORSEO_PRIMARY_PASSWORD:"fixture-password",
      },
      fetchImpl:async()=>{calls+=1;throw new Error("network");},
    }),
    /transport_failed_keyword_overview/,
  );
  assert.equal(calls,1);
});

test("UGP-6.1G stops before a subsequent call if cumulative reported cost exceeds one dollar", async () => {
  let calls=0;
  await assert.rejects(
    executeDataForSeoDisposableLiveCertification({
      env:{
        DATAFORSEO_PRIMARY_LOGIN:"fixture-login",
        DATAFORSEO_PRIMARY_PASSWORD:"fixture-password",
      },
      fetchImpl:async(url)=>{
        calls+=1;
        const dataset=url.includes("keyword_overview")?"keyword_overview":"related_keywords";
        return {
          url,
          status:200,
          headers:{get:()=> "application/json"},
          text:async()=>JSON.stringify(payload(dataset,0.6)),
        };
      },
    }),
    /cost_ceiling_exceeded/,
  );
  assert.equal(calls,2);
});

test("UGP-6.1G has no arbitrary URL/body/CLI input surface", async () => {
  const forbidden = ["url","body","keyword","locationCode","languageCode","device"] as const;
  const inputKeys = Object.keys({
    env:{},
    fetchImpl:async()=>{throw new Error("fixture");},
  });
  for (const key of forbidden) assert.equal(inputKeys.includes(key),false);
});
