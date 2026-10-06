import assert from "node:assert/strict";
import test from "node:test";
import { buildBacklinkEvidenceDataset } from "./backlink-evidence-contract.js";
import { discoverAuthorityOpportunities } from "./authority-opportunity-discovery.js";
import { qualifyAuthorityProspects } from "./authority-prospect-qualification.js";
import type { AuthorityOutreachReviewInput } from "./authority-outreach-workspace.js";
import {
  assertAuthorityOutreachDraftPreparationIntegrity,
  buildAuthorityOutreachDraftPreparation,
} from "./authority-outreach-draft-brief.js";

const FP=(c:string)=>c.repeat(64);

function qualification(){
  const current=buildBacklinkEvidenceDataset({
    targetDomain:"diamondshelf.us",
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
      targetUrl:"https://diamondshelf.us/guide",
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
  const discovery=discoverAuthorityOpportunities({
    current,
    supplementalEvidence:[{
      kind:"content_promotion_prospect",
      sourceDomain:"editorial.example.net",
      sourceUrl:"https://editorial.example.net/resources",
      targetUrl:null,
      observedAt:"2026-09-15T00:00:00Z",
      evidenceFingerprint:FP("f"),
    }],
  });
  const signals=discovery.opportunities.map((opportunity,index)=>({
    opportunityFingerprint:opportunity.opportunityFingerprint,
    topicalRelevance:{value:0.95,evidenceFingerprint:FP(index===0?"1":"5")},
    targetPageFit:{value:0.9,evidenceFingerprint:FP(index===0?"2":"6")},
    contactability:{value:1,evidenceFingerprint:FP(index===0?"3":"7")},
    spamRisk:{value:0.05,evidenceFingerprint:FP(index===0?"4":"8")},
  }));
  const result=qualifyAuthorityProspects({current,discovery,signals});
  assert.equal(result.prospects.length,2);
  for(const prospect of result.prospects){
    assert.equal(prospect.status,"qualified_for_review");
  }
  return result;
}

function approvalReviews(
  q:ReturnType<typeof qualification>,
):AuthorityOutreachReviewInput[]{
  return q.prospects.map((prospect,index)=>({
    qualificationFingerprint:q.qualificationFingerprint,
    prospectFingerprint:prospect.prospectFingerprint,
    decision:"approved_for_draft" as const,
    reasonCode:"editorial_fit_confirmed" as const,
    reviewerId:"operator@example.com",
    reviewedAt:index===0
      ?"2026-10-05T14:30:00.000Z"
      :"2026-10-05T14:31:00.000Z",
  }));
}

test("only approved prospects with an existing owned target page become draft-brief ready",()=>{
  const q=qualification();
  const result=buildAuthorityOutreachDraftPreparation({
    qualification:q,
    reviews:approvalReviews(q),
  });

  assert.equal(result.summary.total,2);
  assert.equal(result.summary.draftBriefReady,1);
  assert.equal(result.summary.targetBindingRequired,1);
  assert.equal(result.semantics.contactDiscoveryAuthorized,false);
  assert.equal(result.semantics.outreachDraftTextGenerationAuthorized,false);
  assert.equal(result.semantics.outreachSendingAuthorized,false);
  assert.equal(result.semantics.performsModelCall,false);
  assert.equal(result.semantics.performsNetworkOperation,false);
  assert.equal(result.semantics.performsPersistence,false);

  const ready=result.items.find(item=>item.state==="draft_brief_ready");
  assert.ok(ready?.brief);
  assert.equal(ready.kind,"lost_link_recovery");
  assert.equal(ready.brief.targetUrl,"https://diamondshelf.us/guide");
  assert.equal(ready.brief.draftPurposeCode,"lost_link_recovery_context");
  assert.equal(ready.brief.constraints.claimsMustBeEvidenceBacked,true);
  assert.equal(ready.brief.constraints.relationshipClaimsMayNotBeInvented,true);
  assert.equal(ready.brief.constraints.contactDetailsMayNotBeInvented,true);
  assert.equal(
    ready.brief.constraints.paidOrReciprocalLinkSchemeAuthorized,
    false,
  );

  const blocked=result.items.find(
    item=>item.state==="target_binding_required",
  );
  assert.ok(blocked);
  assert.equal(blocked.kind,"content_promotion_prospect");
  assert.equal(blocked.targetUrl,null);
  assert.equal(blocked.blockerCode,"owned_target_page_missing");
  assert.equal(blocked.brief,null);

  assertAuthorityOutreachDraftPreparationIntegrity(result,{
    qualification:q,
    reviews:approvalReviews(q),
  });
});

test("qualified prospects without a human approval never receive a draft brief",()=>{
  const q=qualification();
  const result=buildAuthorityOutreachDraftPreparation({qualification:q});
  assert.equal(result.summary.draftBriefReady,0);
  assert.equal(result.summary.targetBindingRequired,0);
  assert.equal(result.summary.humanReviewRequired,2);
  assert.ok(result.items.every(item=>item.brief===null));
});

test("rejected and deferred reviews remain non-draftable",()=>{
  const q=qualification();
  const reviews:AuthorityOutreachReviewInput[]=q.prospects.map(
    (prospect,index)=>({
      qualificationFingerprint:q.qualificationFingerprint,
      prospectFingerprint:prospect.prospectFingerprint,
      decision:index===0?"rejected":"deferred",
      reasonCode:index===0?"target_not_appropriate":"needs_more_context",
      reviewerId:"operator@example.com",
      reviewedAt:index===0
        ?"2026-10-05T14:30:00.000Z"
        :"2026-10-05T14:31:00.000Z",
    }),
  );
  const result=buildAuthorityOutreachDraftPreparation({
    qualification:q,
    reviews,
  });
  assert.equal(result.summary.rejected,1);
  assert.equal(result.summary.deferred,1);
  assert.equal(result.summary.draftBriefReady,0);
  assert.ok(result.items.every(item=>item.brief===null));
});

test("draft preparation is deterministic for identical evidence and reviews",()=>{
  const q=qualification();
  const reviews=approvalReviews(q);
  const first=buildAuthorityOutreachDraftPreparation({
    qualification:q,
    reviews,
  });
  const second=buildAuthorityOutreachDraftPreparation({
    qualification:q,
    reviews,
  });
  assert.deepEqual(second,first);
  assert.equal(second.preparationFingerprint,first.preparationFingerprint);
});

test("draft preparation integrity detects tampering",()=>{
  const q=qualification();
  const reviews=approvalReviews(q);
  const result=buildAuthorityOutreachDraftPreparation({
    qualification:q,
    reviews,
  });
  const tampered=structuredClone(result);
  const ready=tampered.items.find(item=>item.brief!==null);
  assert.ok(ready?.brief);
  Object.assign(ready.brief,{targetUrl:"https://attacker.example/landing"});
  assert.throws(
    ()=>assertAuthorityOutreachDraftPreparationIntegrity(
      tampered,
      {qualification:q,reviews},
    ),
    /ugp_outreach_draft_integrity_mismatch/,
  );
});
