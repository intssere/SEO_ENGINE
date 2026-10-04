import assert from "node:assert/strict";
import test from "node:test";
import { buildBacklinkEvidenceDataset } from "./backlink-evidence-contract.js";
import { buildAuthorityDashboardProjection } from "./authority-dashboard-projection.js";
import {
  loadAuthorityDashboardData,
  setAuthorityDashboardProjectionSourceForRuntime,
} from "./authority-dashboard-data.js";

const FP=(c:string)=>c.repeat(64);

function projection(){
  const current=buildBacklinkEvidenceDataset({
    targetDomain:"example.com",
    source:{
      providerKey:"dataforseo",
      providerDataset:"backlinks.backlinks.live",
      sourceFingerprint:FP("a"),
      requestFingerprint:FP("b"),
      marketFingerprint:FP("c"),
      categoryFingerprint:FP("d"),
      observedAt:"2026-10-04T00:00:00Z",
      authorityMetric:{
        key:"domain_from_rank",
        min:0,
        max:1000,
        crossProviderComparable:false,
      },
      responseFingerprint:FP("e"),
    },
    backlinks:[{
      sourceUrl:"https://news.example.org/article",
      sourceDomain:"news.example.org",
      targetUrl:"https://example.com/guide",
      anchorText:"Guide",
      firstSeenAt:"2026-09-01T00:00:00Z",
      lastSeenAt:"2026-10-03T00:00:00Z",
      lostAt:null,
      state:"active",
      followState:"follow",
      rel:[],
      providerAuthority:600,
      providerMetrics:[
        {key:"domain_from_rank",value:600,unit:"provider_scale"},
        {key:"is_new",value:1,unit:"boolean"},
        {key:"is_lost",value:0,unit:"boolean"},
      ],
    }],
  });
  return buildAuthorityDashboardProjection({current});
}

test("default runtime is unavailable rather than synthetic",async()=>{
  setAuthorityDashboardProjectionSourceForRuntime(null);
  const result=await loadAuthorityDashboardData();
  assert.equal(result.state,"unavailable");
  assert.equal(result.projection,null);
  assert.equal(result.readiness.evidence,"unavailable");
  assert.match(result.reason??"",/No durable authority evidence source/);
  assert.equal(result.semantics.syntheticFallback,false);
  assert.equal(result.semantics.liveProviderExecutionAuthorized,false);
  assert.equal(result.semantics.outreachAuthorized,false);
});

test("validated projection source is exposed as partial when optional trend and competitor gap are absent",async()=>{
  const result=await loadAuthorityDashboardData(async()=>projection());
  assert.equal(result.state,"partial");
  assert.equal(result.readiness.evidence,"available");
  assert.equal(result.readiness.trend,"unavailable");
  assert.equal(result.readiness.competitorGap,"unavailable");
  assert.equal(result.readiness.providerKey,"dataforseo");
  assert.equal(result.projection?.summary.backlinkCount,1);
});

test("null source result remains unavailable",async()=>{
  const result=await loadAuthorityDashboardData(async()=>null);
  assert.equal(result.state,"unavailable");
  assert.equal(result.projection,null);
  assert.match(result.reason??"",/No normalized backlink evidence snapshot/);
});

test("source failure remains unavailable and does not leak provider/runtime details",async()=>{
  const result=await loadAuthorityDashboardData(async()=>{
    throw new Error("secret provider transport detail");
  });
  assert.equal(result.state,"unavailable");
  assert.equal(result.projection,null);
  assert.equal(
    result.reason,
    "Authority evidence could not be loaded from the configured source.",
  );
  assert.doesNotMatch(result.reason??"",/secret provider/);
});

test("tampered projection fails integrity and is not displayed",async()=>{
  const valid=projection();
  const tampered={
    ...valid,
    summary:{...valid.summary,backlinkCount:999},
  };
  const result=await loadAuthorityDashboardData(
    async()=>tampered as typeof valid,
  );
  assert.equal(result.state,"unavailable");
  assert.equal(result.projection,null);
  assert.match(result.reason??"",/failed integrity validation/);
});
