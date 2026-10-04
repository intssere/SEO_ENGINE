import assert from "node:assert/strict";
import test from "node:test";
import {
  DATAFORSEO_BACKLINK_ACQUISITION_POLICY,
  DATAFORSEO_BACKLINK_ENDPOINT,
  UGP_DATAFORSEO_BACKLINK_ACQUISITION_VERSION,
  assertDataForSeoBacklinkCertificationPlanIntegrity,
  buildDataForSeoBacklinkCertificationPlan,
  buildDataForSeoBacklinkControlledRequest,
  buildDataForSeoBacklinkExecutionAuthorization,
  runAuthorizedDataForSeoBacklinkOneShot,
} from "./dataforseo-backlink-controlled-acquisition.js";

const FP=(c:string)=>c.repeat(64);
const SHA="1".repeat(40);

function plan(){
  return buildDataForSeoBacklinkCertificationPlan({
    sourceCommitSha:SHA,
    targetDomain:"Example.COM.",
    rankScale:"one_thousand",
    sourceFingerprint:FP("a"),
    evidenceRequestFingerprint:FP("b"),
    marketFingerprint:FP("c"),
    categoryFingerprint:FP("d"),
  });
}

function authorization(p=plan()){
  return buildDataForSeoBacklinkExecutionAuthorization({
    authorizationId:"cert-ugp-9-1c-001",
    plan:p,
    explicitLiveProviderExecution:true,
    exactOneCallAuthorized:true,
    providerCostCeilingAccepted:true,
    zeroPersistenceRequired:true,
    zeroSchedulingRequired:true,
    zeroAutonomousExecutionRequired:true,
    zeroOutreachRequired:true,
    zeroProviderWritesRequired:true,
    zeroPublicSiteWritesRequired:true,
  });
}

function providerPayload(cost=0.02){
  return {
    version:"0.1.20261004",
    status_code:20000,
    status_message:"Ok.",
    time:"0.1000 sec.",
    cost,
    tasks_count:1,
    tasks_error:0,
    tasks:[{
      id:"10041234-0000-0000-0000-000000000001",
      status_code:20000,
      status_message:"Ok.",
      time:"0.0900 sec.",
      cost,
      result_count:1,
      path:["v3","backlinks","backlinks","live"],
      data:{api:"backlinks",function:"backlinks",target:"example.com"},
      result:[{
        target:"example.com",
        mode:"as_is",
        total_count:1,
        items_count:1,
        items:[{
          type:"backlink",
          domain_from:"news.example.org",
          url_from:"https://news.example.org/article",
          url_from_https:true,
          domain_to:"example.com",
          url_to:"https://example.com/guide",
          url_to_https:true,
          tld_from:"org",
          is_new:false,
          is_lost:false,
          backlink_spam_score:2,
          rank:420,
          page_from_rank:510,
          domain_from_rank:610,
          page_from_status_code:200,
          first_seen:"2026-08-01 00:00:00 +00:00",
          prev_seen:"2026-09-15 00:00:00 +00:00",
          last_seen:"2026-10-03 00:00:00 +00:00",
          item_type:"anchor",
          attributes:null,
          dofollow:true,
          original:true,
          anchor:"Example Guide",
          links_count:1,
          group_count:2,
          is_broken:false,
          url_to_status_code:200,
          url_to_spam_score:1,
          is_indirect_link:false,
        }],
      }],
    }],
  };
}

test("controlled request freezes one exact bounded provider call",()=>{
  const request=buildDataForSeoBacklinkControlledRequest({
    targetDomain:"Example.COM.",
    rankScale:"one_thousand",
    evidenceRequestFingerprint:FP("b"),
  });

  assert.equal(request.version,UGP_DATAFORSEO_BACKLINK_ACQUISITION_VERSION);
  assert.equal(
    request.url,
    DATAFORSEO_BACKLINK_ACQUISITION_POLICY.origin+DATAFORSEO_BACKLINK_ENDPOINT,
  );
  assert.equal(request.targetDomain,"example.com");
  assert.equal(request.limit,100);

  const parsed=JSON.parse(request.body);
  assert.deepEqual(parsed,[{
    target:"example.com",
    mode:"as_is",
    backlinks_status_type:"all",
    include_subdomains:true,
    exclude_internal_backlinks:true,
    offset:0,
    limit:100,
    rank_scale:"one_thousand",
  }]);
});

test("certification plan is single-call, no-retry, non-persistent, and integrity bound",()=>{
  const p=plan();
  assert.equal(p.maxCalls,1);
  assert.equal(p.maxAttemptsPerCall,1);
  assert.equal(p.automaticRetry,false);
  assert.equal(p.maxConcurrency,1);
  assert.equal(p.persistence,false);
  assert.equal(p.scheduling,false);
  assert.equal(p.autonomousExecution,false);
  assert.equal(p.outreach,false);
  assert.equal(p.providerWrites,false);
  assert.equal(p.publicSiteWrites,false);
  assertDataForSeoBacklinkCertificationPlanIntegrity(p);

  assert.throws(
    ()=>assertDataForSeoBacklinkCertificationPlanIntegrity({
      ...p,
      maxCalls:2 as any,
    }),
    /ugp_dataforseo_backlink_acquisition_plan_unsafe/,
  );
});

test("authorization is explicit and exactly bound to the certified plan",()=>{
  const p=plan();
  const a=authorization(p);
  assert.equal(a.sourceCommitSha,p.sourceCommitSha);
  assert.equal(a.planFingerprint,p.planFingerprint);
  assert.equal(a.credentialProfileId,"dataforseo-primary");
  assert.equal(a.explicitLiveProviderExecution,true);
  assert.equal(a.exactOneCallAuthorized,true);
  assert.equal(a.zeroPersistenceRequired,true);
  assert.equal(a.zeroOutreachRequired,true);

  assert.throws(()=>buildDataForSeoBacklinkExecutionAuthorization({
    authorizationId:"cert-ugp-9-1c-002",
    plan:p,
    explicitLiveProviderExecution:true,
    exactOneCallAuthorized:false as any,
    providerCostCeilingAccepted:true,
    zeroPersistenceRequired:true,
    zeroSchedulingRequired:true,
    zeroAutonomousExecutionRequired:true,
    zeroOutreachRequired:true,
    zeroProviderWritesRequired:true,
    zeroPublicSiteWritesRequired:true,
  }),/ugp_dataforseo_backlink_acquisition_authorization_incomplete/);
});

test("authorized one-shot uses exactly one injected call and returns normalized evidence receipt",async()=>{
  const p=plan();
  const a=authorization(p);
  let calls=0;
  const receipt=await runAuthorizedDataForSeoBacklinkOneShot({
    plan:p,
    authorization:a,
    executor:async(input)=>{
      calls++;
      assert.equal(input.url,p.controlledRequest.url);
      assert.equal(input.body,p.controlledRequest.body);
      assert.equal(input.timeoutMs,15_000);
      assert.equal(input.credentialProfileId,"dataforseo-primary");
      return {
        effectiveUrl:input.url,
        status:200,
        contentType:"application/json; charset=utf-8",
        bodyText:JSON.stringify(providerPayload()),
        observedAt:"2026-10-04T09:30:00Z",
      };
    },
  });

  assert.equal(calls,1);
  assert.equal(receipt.callCount,1);
  assert.equal(receipt.providerReportedCostUsd,0.02);
  assert.equal(receipt.evidence.dataset.backlinks.length,1);
  assert.equal(receipt.evidence.dataset.targetDomain,"example.com");
  assert.equal(receipt.assertions.oneShot,true);
  assert.equal(receipt.assertions.automaticRetry,false);
  assert.equal(receipt.assertions.persistence,false);
  assert.equal(receipt.assertions.scheduling,false);
  assert.equal(receipt.assertions.outreach,false);
  assert.equal(receipt.assertions.credentialsReturned,false);
});

test("authorization mismatch fails before executor is invoked",async()=>{
  const p=plan();
  const a=authorization(p);
  let called=false;
  await assert.rejects(
    runAuthorizedDataForSeoBacklinkOneShot({
      plan:p,
      authorization:{...a,planFingerprint:FP("f")},
      executor:async()=>{
        called=true;
        throw new Error("must not run");
      },
    }),
    /ugp_dataforseo_backlink_acquisition_authorization_mismatch/,
  );
  assert.equal(called,false);
});

test("effective URL drift, non-JSON, and cost ceiling fail closed",async()=>{
  const p=plan();
  const a=authorization(p);

  await assert.rejects(
    runAuthorizedDataForSeoBacklinkOneShot({
      plan:p,
      authorization:a,
      executor:async()=>({
        effectiveUrl:"https://evil.example/backlinks",
        status:200,
        contentType:"application/json",
        bodyText:JSON.stringify(providerPayload()),
        observedAt:"2026-10-04T09:30:00Z",
      }),
    }),
    /ugp_dataforseo_backlink_acquisition_effective_url_drift/,
  );

  await assert.rejects(
    runAuthorizedDataForSeoBacklinkOneShot({
      plan:p,
      authorization:a,
      executor:async()=>({
        effectiveUrl:p.controlledRequest.url,
        status:200,
        contentType:"text/html",
        bodyText:"{}",
        observedAt:"2026-10-04T09:30:00Z",
      }),
    }),
    /ugp_dataforseo_backlink_acquisition_json_required/,
  );

  await assert.rejects(
    runAuthorizedDataForSeoBacklinkOneShot({
      plan:p,
      authorization:a,
      executor:async()=>({
        effectiveUrl:p.controlledRequest.url,
        status:200,
        contentType:"application/json",
        bodyText:JSON.stringify(providerPayload(1.01)),
        observedAt:"2026-10-04T09:30:00Z",
      }),
    }),
    /ugp_dataforseo_backlink_acquisition_cost_ceiling_exceeded/,
  );
});

test("provider response remains bounded; no automatic pagination or retry is introduced",async()=>{
  const p=plan();
  const a=authorization(p);
  const payload=providerPayload();
  const result=(payload.tasks as any[])[0].result[0];
  result.total_count=1000;
  result.items_count=1;
  let calls=0;

  const receipt=await runAuthorizedDataForSeoBacklinkOneShot({
    plan:p,
    authorization:a,
    executor:async(input)=>{
      calls++;
      return {
        effectiveUrl:input.url,
        status:200,
        contentType:"application/json",
        bodyText:JSON.stringify(payload),
        observedAt:"2026-10-04T09:30:00Z",
      };
    },
  });

  assert.equal(calls,1);
  assert.ok(receipt.evidence.limitations.includes(
    "dataforseo_response_is_bounded_page_not_complete_backlink_universe",
  ));
});

test("source/request/market/category fingerprints are preserved into normalized evidence lineage",async()=>{
  const p=plan();
  const receipt=await runAuthorizedDataForSeoBacklinkOneShot({
    plan:p,
    authorization:authorization(p),
    executor:async(input)=>({
      effectiveUrl:input.url,
      status:200,
      contentType:"application/json",
      bodyText:JSON.stringify(providerPayload()),
      observedAt:"2026-10-04T09:30:00Z",
    }),
  });

  assert.equal(receipt.evidence.dataset.source.sourceFingerprint,FP("a"));
  assert.equal(receipt.evidence.dataset.source.requestFingerprint,FP("b"));
  assert.equal(receipt.evidence.dataset.source.marketFingerprint,FP("c"));
  assert.equal(receipt.evidence.dataset.source.categoryFingerprint,FP("d"));
});

test("implementation itself does not provide credentials, scheduling, persistence, or outreach authority",()=>{
  assert.equal(DATAFORSEO_BACKLINK_ACQUISITION_POLICY.maxCalls,1);
  assert.equal(DATAFORSEO_BACKLINK_ACQUISITION_POLICY.maxAttemptsPerCall,1);
  assert.equal(DATAFORSEO_BACKLINK_ACQUISITION_POLICY.automaticRetry,false);
  assert.equal(DATAFORSEO_BACKLINK_ACQUISITION_POLICY.persistence,false);
  assert.equal(DATAFORSEO_BACKLINK_ACQUISITION_POLICY.scheduling,false);
  assert.equal(DATAFORSEO_BACKLINK_ACQUISITION_POLICY.autonomousExecution,false);
  assert.equal(DATAFORSEO_BACKLINK_ACQUISITION_POLICY.outreach,false);
  assert.equal(DATAFORSEO_BACKLINK_ACQUISITION_POLICY.providerWrites,false);
  assert.equal(DATAFORSEO_BACKLINK_ACQUISITION_POLICY.publicSiteWrites,false);
});
