import assert from "node:assert/strict";
import test from "node:test";
import { buildBacklinkEvidenceDataset } from "./backlink-evidence-contract.js";
import { discoverAuthorityOpportunities } from "./authority-opportunity-discovery.js";
import { qualifyAuthorityProspects } from "./authority-prospect-qualification.js";
import {
  loadAuthorityOutreachData,
  type AuthorityQualificationLoader,
} from "./authority-outreach-data.js";
import type { AuthorityQualificationApiResponse } from "./authority-qualification-data.js";

const FP=(c:string)=>c.repeat(64);

function qualified():AuthorityQualificationApiResponse{
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
      sourceUrl:"https://publisher.example.org/old-guide",
      sourceDomain:"publisher.example.org",
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
  const qualification=qualifyAuthorityProspects({
    current,
    discovery,
    signals:[{
      opportunityFingerprint:opportunity.opportunityFingerprint,
      topicalRelevance:{value:0.95,evidenceFingerprint:FP("1")},
      targetPageFit:{value:0.9,evidenceFingerprint:FP("2")},
      contactability:{value:1,evidenceFingerprint:FP("3")},
      spamRisk:{value:0.05,evidenceFingerprint:FP("4")},
    }],
  });
  return {
    version:"ugp-9-4b-prospect-qualification-api-v1",
    state:"available",
    reason:null,
    qualification,
    semantics:{
      authenticatedReadOnly:true,
      syntheticFallback:false,
      persistenceRequired:false,
      liveProviderExecutionAuthorized:false,
      contactDiscoveryAuthorized:false,
      outreachAuthorized:false,
      publicSiteWrites:false,
    },
  };
}

test("unavailable qualification remains truthful with no synthetic workspace",async()=>{
  const loader:AuthorityQualificationLoader=async()=>({
    version:"ugp-9-4b-prospect-qualification-api-v1",
    state:"unavailable",
    reason:"No durable authority qualification evidence source is configured.",
    qualification:null,
    semantics:{
      authenticatedReadOnly:true,
      syntheticFallback:false,
      persistenceRequired:false,
      liveProviderExecutionAuthorized:false,
      contactDiscoveryAuthorized:false,
      outreachAuthorized:false,
      publicSiteWrites:false,
    },
  });
  const result=await loadAuthorityOutreachData(loader,null);
  assert.equal(result.state,"unavailable");
  assert.equal(result.workspace,null);
  assert.equal(result.semantics.syntheticFallback,false);
  assert.equal(result.semantics.reviewMutationAuthorized,false);
  assert.equal(result.semantics.reviewPersistenceConfigured,false);
});

test("qualified prospects project into authenticated read-only review workspace",async()=>{
  const result=await loadAuthorityOutreachData(async()=>qualified(),null);
  assert.equal(result.state,"available");
  assert.equal(result.workspace?.summary.total,1);
  assert.equal(result.workspace?.summary.awaitingHumanReview,1);
  assert.equal(result.workspace?.items[0]?.state,"awaiting_human_review");
  assert.equal(result.semantics.humanReviewRequired,true);
  assert.equal(result.semantics.reviewMutationAuthorized,false);
  assert.equal(result.semantics.contactDiscoveryAuthorized,false);
  assert.equal(result.semantics.outreachDraftingAuthorized,false);
  assert.equal(result.semantics.outreachSendingAuthorized,false);
});

test("explicit review source projects reviewed state without authorizing execution",async()=>{
  const q=qualified();
  const prospect=q.qualification?.prospects[0];
  assert.ok(q.qualification);
  assert.ok(prospect);
  const result=await loadAuthorityOutreachData(
    async()=>q,
    async()=>[{
      qualificationFingerprint:q.qualification!.qualificationFingerprint,
      prospectFingerprint:prospect.prospectFingerprint,
      decision:"approved_for_draft",
      reasonCode:"editorial_fit_confirmed",
      reviewerId:"reviewer@example.com",
      reviewedAt:"2026-10-05T13:30:00.000Z",
    }],
  );
  assert.equal(result.state,"available");
  assert.equal(result.workspace?.items[0]?.state,"approved_for_draft");
  assert.equal(result.semantics.reviewPersistenceConfigured,true);
  assert.equal(result.workspace?.semantics.outreachDraftingPerformed,false);
  assert.equal(result.workspace?.semantics.outreachSendingAuthorized,false);
});

test("review source failures are sanitized instead of dropping review history",async()=>{
  const result=await loadAuthorityOutreachData(
    async()=>qualified(),
    async()=>{throw new Error("secret review store detail");},
  );
  assert.equal(result.state,"unavailable");
  assert.equal(result.workspace,null);
  assert.equal(
    result.reason,
    "Authority outreach review evidence could not be validated.",
  );
  assert.doesNotMatch(result.reason??"",/secret/);
});
