import assert from "node:assert/strict";
import test from "node:test";
import { buildBacklinkEvidenceDataset } from "./backlink-evidence-contract.js";
import { discoverAuthorityOpportunities } from "./authority-opportunity-discovery.js";
import {
  loadAuthorityQualificationData,
  setAuthorityQualificationSourceForRuntime,
} from "./authority-qualification-data.js";

const FP=(c:string)=>c.repeat(64);

function snapshot(){
  const current=buildBacklinkEvidenceDataset({
    targetDomain:"example.com",
    source:{
      providerKey:"dataforseo",
      providerDataset:"backlinks.backlinks.live",
      sourceFingerprint:FP("a"),
      requestFingerprint:FP("b"),
      marketFingerprint:FP("c"),
      categoryFingerprint:FP("d"),
      observedAt:"2026-10-05T00:00:00Z",
      authorityMetric:{
        key:"domain_from_rank",
        min:0,
        max:1000,
        crossProviderComparable:false,
      },
      responseFingerprint:FP("e"),
    },
    backlinks:[{
      sourceUrl:"https://lost.example.org/old",
      sourceDomain:"lost.example.org",
      targetUrl:"https://example.com/guide",
      anchorText:"Guide",
      firstSeenAt:"2026-01-01T00:00:00Z",
      lastSeenAt:"2026-08-01T00:00:00Z",
      lostAt:"2026-09-01T00:00:00Z",
      state:"lost",
      followState:"follow",
      rel:[],
      providerAuthority:620,
      providerMetrics:[{key:"is_lost",value:1,unit:"boolean"}],
    }],
  });
  const discovery=discoverAuthorityOpportunities({current});
  const opportunity=discovery.opportunities[0];
  assert.ok(opportunity);
  return {
    current,
    discovery,
    signals:[{
      opportunityFingerprint:opportunity.opportunityFingerprint,
      topicalRelevance:{value:0.9,evidenceFingerprint:FP("1")},
      targetPageFit:{value:0.9,evidenceFingerprint:FP("2")},
      contactability:{value:1,evidenceFingerprint:FP("3")},
      spamRisk:{value:0.05,evidenceFingerprint:FP("4")},
    }],
  };
}

test("default qualification runtime is unavailable rather than synthetic",async()=>{
  setAuthorityQualificationSourceForRuntime(null);
  const result=await loadAuthorityQualificationData();
  assert.equal(result.state,"unavailable");
  assert.equal(result.qualification,null);
  assert.equal(result.semantics.syntheticFallback,false);
  assert.equal(result.semantics.contactDiscoveryAuthorized,false);
  assert.equal(result.semantics.outreachAuthorized,false);
});

test("validated snapshot returns evidence-bound qualification",async()=>{
  const input=snapshot();
  const result=await loadAuthorityQualificationData(async()=>input);
  assert.equal(result.state,"available");
  assert.equal(result.qualification?.summary.total,1);
  assert.equal(
    result.qualification?.prospects[0]?.status,
    "qualified_for_review",
  );
  assert.equal(result.qualification?.semantics.outreachAuthorized,false);
});

test("null source result remains unavailable",async()=>{
  const result=await loadAuthorityQualificationData(async()=>null);
  assert.equal(result.state,"unavailable");
  assert.equal(result.qualification,null);
});

test("source failure is sanitized",async()=>{
  const result=await loadAuthorityQualificationData(async()=>{
    throw new Error("secret qualification source detail");
  });
  assert.equal(result.state,"unavailable");
  assert.equal(
    result.reason,
    "Authority qualification evidence could not be validated.",
  );
  assert.doesNotMatch(result.reason??"",/secret/);
});

test("discovery and current dataset mismatch is rejected",async()=>{
  const input=snapshot();
  const other=buildBacklinkEvidenceDataset({
    ...input.current,
    targetDomain:"other.example",
  });
  const result=await loadAuthorityQualificationData(async()=>({
    ...input,
    current:other,
  }));
  assert.equal(result.state,"unavailable");
  assert.equal(result.qualification,null);
});
