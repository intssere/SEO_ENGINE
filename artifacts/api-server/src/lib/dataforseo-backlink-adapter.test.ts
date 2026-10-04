import assert from "node:assert/strict";
import test from "node:test";
import {
  UGP_DATAFORSEO_BACKLINK_ADAPTER_VERSION,
  assertDataForSeoBacklinkAdapterIntegrity,
  normalizeCapturedDataForSeoBacklinks,
} from "./dataforseo-backlink-adapter.js";

const FP=(c:string)=>c.repeat(64);

function envelope(items:unknown[],overrides:Record<string,unknown>={}){
  return {
    version:"0.1.20261004",
    status_code:20000,
    status_message:"Ok.",
    time:"0.1000 sec.",
    cost:0.02,
    tasks_count:1,
    tasks_error:0,
    tasks:[{
      id:"10041234-0000-0000-0000-000000000001",
      status_code:20000,
      status_message:"Ok.",
      time:"0.0900 sec.",
      cost:0.02,
      result_count:1,
      path:["v3","backlinks","backlinks","live"],
      data:{api:"backlinks",function:"backlinks",target:"example.com"},
      result:[{
        target:"example.com",
        mode:"as_is",
        total_count:items.length,
        items_count:items.length,
        items,
      }],
    }],
    ...overrides,
  };
}

function row(overrides:Record<string,unknown>={}){
  return {
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
    ...overrides,
  };
}

function normalize(provided:unknown,rankScale:"one_hundred"|"one_thousand"="one_thousand"){
  return normalizeCapturedDataForSeoBacklinks({
    targetDomain:"example.com",
    sourceFingerprint:FP("a"),
    requestFingerprint:FP("b"),
    marketFingerprint:FP("c"),
    categoryFingerprint:FP("d"),
    observedAt:"2026-10-04T00:00:00.000Z",
    rankScale,
    provided,
  });
}

test("maps captured DataForSEO backlink rows into the provider-neutral 9.1A contract",()=>{
  const result=normalize(envelope([
    row(),
    row({
      domain_from:"partner.example.net",
      url_from:"https://partner.example.net/resource",
      url_to:"https://example.com/",
      is_new:true,
      backlink_spam_score:5,
      rank:300,
      page_from_rank:400,
      domain_from_rank:350,
      first_seen:"2026-09-20 00:00:00 +00:00",
      last_seen:"2026-10-02 00:00:00 +00:00",
      attributes:["nofollow","sponsored"],
      dofollow:false,
      original:false,
      anchor:null,
      group_count:1,
      url_to_status_code:301,
      is_indirect_link:true,
    }),
  ]));

  assert.equal(result.version,UGP_DATAFORSEO_BACKLINK_ADAPTER_VERSION);
  assert.equal(result.providerKey,"dataforseo");
  assert.equal(result.providerDataset,"backlinks.backlinks.live");
  assert.equal(result.rankScale,"one_thousand");
  assert.equal(result.providerTaskId,"10041234-0000-0000-0000-000000000001");
  assert.equal(result.providerPath,"v3/backlinks/backlinks/live");
  assert.equal(result.dataset.targetDomain,"example.com");
  assert.equal(result.dataset.backlinks.length,2);
  assert.equal(result.dataset.referringDomains.length,2);
  assert.equal(result.dataset.summary.dofollowBacklinkCount,1);
  assert.equal(result.dataset.summary.nofollowBacklinkCount,1);
  assert.equal(result.dataset.summary.sponsoredBacklinkCount,1);

  const news=result.dataset.backlinks.find(x=>x.sourceDomain==="news.example.org")!;
  assert.equal(news.providerAuthority,610);
  assert.equal(news.followState,"follow");
  assert.deepEqual(news.rel,[]);
  assert.equal(news.firstSeenAt,"2026-08-01T00:00:00.000Z");
  assert.equal(news.lastSeenAt,"2026-10-03T00:00:00.000Z");
  assert.equal(news.providerMetrics.find(x=>x.key==="backlink_rank")!.value,420);
  assert.equal(news.providerMetrics.find(x=>x.key==="page_from_rank")!.value,510);

  const partner=result.dataset.backlinks.find(x=>x.sourceDomain==="partner.example.net")!;
  assert.equal(partner.followState,"nofollow");
  assert.deepEqual(partner.rel,["nofollow","sponsored"]);
  assert.equal(partner.providerMetrics.find(x=>x.key==="is_new")!.value,1);
  assert.equal(partner.providerMetrics.find(x=>x.key==="is_indirect_link")!.value,1);
  assertDataForSeoBacklinkAdapterIntegrity(result);
});

test("rank scale is explicit and constrains provider authority/rank metrics",()=>{
  const result=normalize(envelope([
    row({rank:80,page_from_rank:90,domain_from_rank:95}),
  ]),"one_hundred");

  assert.equal(result.dataset.source.authorityMetric!.max,100);
  assert.equal(result.dataset.backlinks[0]!.providerAuthority,95);

  assert.throws(()=>normalize(envelope([
    row({rank:101,page_from_rank:90,domain_from_rank:95}),
  ]),"one_hundred"),/ugp_dataforseo_backlink_invalid_rank/);
});

test("lost provider rows are retained without inventing a loss timestamp",()=>{
  const result=normalize(envelope([
    row({
      is_lost:true,
      last_seen:"2026-09-20 00:00:00 +00:00",
    }),
  ]));

  assert.equal(result.dataset.backlinks[0]!.state,"unknown");
  assert.equal(result.dataset.backlinks[0]!.lostAt,null);
  assert.equal(result.dataset.backlinks[0]!.providerMetrics.find(x=>x.key==="is_lost")!.value,1);
  assert.ok(result.limitations.includes(
    "dataforseo_is_lost_has_no_exact_loss_timestamp_in_backlinks_live",
  ));
  assert.equal(result.dataset.summary.lostBacklinkCount,0);
});

test("bounded provider pagination is explicit rather than treated as the whole backlink universe",()=>{
  const provided=envelope([row()]);
  const task=(provided.tasks as any[])[0];
  task.result[0].total_count=250;
  task.result[0].items_count=1;

  const result=normalize(provided);
  assert.ok(result.limitations.includes(
    "dataforseo_response_is_bounded_page_not_complete_backlink_universe",
  ));
  assert.equal(result.dataset.summary.backlinkCount,1);
});

test("unsupported DataForSEO rel attributes are not projected into canonical rel semantics",()=>{
  const result=normalize(envelope([
    row({attributes:["external","noopener"]}),
  ]));

  assert.deepEqual(result.dataset.backlinks[0]!.rel,[]);
  assert.ok(result.limitations.includes(
    "dataforseo_noncanonical_rel_attributes_not_projected",
  ));
});

test("nofollow provider boolean supplies canonical nofollow even if attributes are absent",()=>{
  const result=normalize(envelope([
    row({dofollow:false,attributes:null}),
  ]));

  assert.equal(result.dataset.backlinks[0]!.followState,"nofollow");
  assert.deepEqual(result.dataset.backlinks[0]!.rel,["nofollow"]);
});

test("provider contradictions, malformed envelopes, and count mismatches fail closed",()=>{
  assert.throws(()=>normalize(envelope([
    row({dofollow:true,attributes:["nofollow"]}),
  ])),/ugp_dataforseo_backlink_dofollow_attribute_contradiction/);

  assert.throws(()=>normalize({
    status_code:20000,
    tasks_error:0,
    tasks:[],
  }),/ugp_dataforseo_backlink_exactly_one_task_required/);

  const badCount=envelope([row()]);
  (badCount.tasks as any[])[0].result[0].items_count=2;
  assert.throws(()=>normalize(badCount),/ugp_dataforseo_backlink_items_count_mismatch/);

  assert.throws(()=>normalize(envelope([row()]),"bad" as any),
    /ugp_dataforseo_backlink_invalid_rank_scale/);
});

test("provider and target lineage errors fail closed through 9.1A normalization",()=>{
  assert.throws(()=>normalize(envelope([
    row({domain_from:"different.example.org"}),
  ])),/ugp_backlink_source_domain_url_mismatch/);

  assert.throws(()=>normalize(envelope([
    row({url_to:"https://other.example/guide"}),
  ])),/ugp_backlink_target_domain_url_mismatch/);
});

test("equivalent captured response key ordering produces deterministic adapter identity",()=>{
  const a=normalize(envelope([row()]));
  const provider=envelope([row()]);
  const reordered={
    tasks:provider.tasks,
    tasks_error:provider.tasks_error,
    status_message:provider.status_message,
    status_code:provider.status_code,
    version:provider.version,
    time:provider.time,
    cost:provider.cost,
    tasks_count:provider.tasks_count,
  };
  const b=normalize(reordered);

  assert.equal(a.dataset.source.responseFingerprint,b.dataset.source.responseFingerprint);
  assert.equal(a.dataset.datasetFingerprint,b.dataset.datasetFingerprint);
  assert.equal(a.adapterFingerprint,b.adapterFingerprint);
});

test("adapter integrity detects tampering and keeps every live/runtime gate closed",()=>{
  const result=normalize(envelope([row()]));
  assert.equal(result.semantics.capturedResponseNormalizationOnly,true);
  assert.equal(result.semantics.liveTransportAuthorized,false);
  assert.equal(result.semantics.providerEnrollmentAuthorized,false);
  assert.equal(result.semantics.credentialUseAuthorized,false);
  assert.equal(result.semantics.performsNetworkOperation,false);
  assert.equal(result.semantics.performsPersistence,false);
  assert.equal(result.semantics.schedulerEnabled,false);
  assert.equal(result.semantics.outreachAuthorized,false);

  assert.throws(()=>assertDataForSeoBacklinkAdapterIntegrity({
    ...result,
    limitations:[...result.limitations,"tampered"],
  }),/ugp_dataforseo_backlink_adapter_fingerprint_mismatch/);
});
