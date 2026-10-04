import assert from "node:assert/strict";
import test from "node:test";
import {
  loadAuthorityOpportunityData,
  setAuthorityOpportunityProjectionSourceForRuntime,
} from "./authority-opportunity-data.js";
import {
  discoverAuthorityOpportunities,
} from "./authority-opportunity-discovery.js";
import { buildBacklinkEvidenceDataset } from "./backlink-evidence-contract.js";

const FP=(c:string)=>c.repeat(64);

function discovery(){
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
      authorityMetric:{key:"domain_from_rank",min:0,max:1000,crossProviderComparable:false},
      responseFingerprint:FP("e"),
    },
    backlinks:[],
  });
  return discoverAuthorityOpportunities({current});
}

test("defaults to unavailable without a durable source",async()=>{
  setAuthorityOpportunityProjectionSourceForRuntime(null);
  const result=await loadAuthorityOpportunityData();
  assert.equal(result.state,"unavailable");
  assert.equal(result.discovery,null);
  assert.equal(result.semantics.syntheticFallback,false);
});

test("returns validated discovery without granting execution authority",async()=>{
  setAuthorityOpportunityProjectionSourceForRuntime(async()=>discovery());
  const result=await loadAuthorityOpportunityData();
  assert.equal(result.state,"available");
  assert.ok(result.discovery);
  assert.equal(result.semantics.liveProviderExecutionAuthorized,false);
  assert.equal(result.semantics.scoringAuthorized,false);
  assert.equal(result.semantics.prospectQualificationAuthorized,false);
  assert.equal(result.semantics.outreachAuthorized,false);
});

test("null source result stays unavailable",async()=>{
  setAuthorityOpportunityProjectionSourceForRuntime(async()=>null);
  const result=await loadAuthorityOpportunityData();
  assert.equal(result.state,"unavailable");
});

test("source failures do not leak internals",async()=>{
  setAuthorityOpportunityProjectionSourceForRuntime(async()=>{throw new Error("secret-provider-detail");});
  const result=await loadAuthorityOpportunityData();
  assert.equal(result.state,"unavailable");
  assert.ok(!result.reason?.includes("secret-provider-detail"));
});
