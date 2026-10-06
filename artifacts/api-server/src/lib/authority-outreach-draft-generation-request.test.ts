import assert from "node:assert/strict";
import test from "node:test";
import { buildBacklinkEvidenceDataset } from "./backlink-evidence-contract.js";
import { discoverAuthorityOpportunities } from "./authority-opportunity-discovery.js";
import { qualifyAuthorityProspects } from "./authority-prospect-qualification.js";
import type { AuthorityOutreachReviewInput } from "./authority-outreach-workspace.js";
import {
  buildAuthorityOutreachTargetBindingProjection,
} from "./authority-outreach-target-binding.js";
import {
  buildUniversalResourceIdentity,
  buildUniversalResourceLocator,
  buildUniversalSiteIdentity,
} from "./universal-site-resource-identity.js";
import {
  assertAuthorityOutreachDraftGenerationRequestProjectionIntegrity,
  buildAuthorityOutreachDraftGenerationRequestProjection,
} from "./authority-outreach-draft-generation-request.js";

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
  return result;
}

function reviews(q:ReturnType<typeof qualification>):AuthorityOutreachReviewInput[]{
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

function resource(){
  const site=buildUniversalSiteIdentity({
    siteId:"diamond-shelf",
    canonicalOrigin:"https://diamondshelf.us",
  });
  const locator=buildUniversalResourceLocator({
    site,
    provider:"shopify",
    kind:"article",
    externalId:"gid://shopify/Article/123456789",
    canonicalUrl:"https://diamondshelf.us/blogs/news/best-fall-fragrances",
    locale:"en-US",
  });
  return buildUniversalResourceIdentity({
    locator,
    stateFingerprint:FP("9"),
    observedAt:"2026-10-05T13:00:00.000Z",
  });
}

function boundInput(){
  const q=qualification();
  const r=reviews(q);
  const owned=resource();
  const initial=buildAuthorityOutreachTargetBindingProjection({
    qualification:q,
    reviews:r,
    resources:[owned],
  });
  const missing=initial.items.find(
    item=>item.state==="target_binding_required",
  );
  assert.ok(missing);
  const bindings=[{
    preparationFingerprint:initial.preparationFingerprint,
    prospectFingerprint:missing.prospectFingerprint,
    resourceIdentityFingerprint:owned.resourceIdentityFingerprint,
    binderId:"operator@example.com",
    boundAt:"2026-10-05T14:45:00.000Z",
  }];
  return {q,r,owned,bindings};
}

test("ready existing-target and human-bound-target prospects produce recipient-free generation requests",()=>{
  const {q,r,owned,bindings}=boundInput();
  const result=buildAuthorityOutreachDraftGenerationRequestProjection({
    qualification:q,
    reviews:r,
    resources:[owned],
    bindings,
  });

  assert.equal(result.summary.total,2);
  assert.equal(result.summary.generationRequestReady,2);
  assert.equal(result.summary.targetBindingRequired,0);
  assert.equal(result.semantics.requestEnvelopeOnly,true);
  assert.equal(result.semantics.recipientDataIncluded,false);
  assert.equal(result.semantics.contactDiscoveryAuthorized,false);
  assert.equal(result.semantics.outreachDraftTextGenerationAuthorized,false);
  assert.equal(result.semantics.modelExecutionAuthorized,false);
  assert.equal(result.semantics.performsModelCall,false);
  assert.equal(result.semantics.performsProviderCall,false);
  assert.equal(result.semantics.performsNetworkOperation,false);
  assert.equal(result.semantics.performsPersistence,false);
  assert.equal(result.semantics.outreachSendingAuthorized,false);

  const requests=result.items.map(item=>item.request).filter(Boolean);
  assert.equal(requests.length,2);
  for(const request of requests){
    assert.ok(request);
    assert.equal(request.requestedOutput.format,"plain_text");
    assert.equal(request.requestedOutput.subjectRequired,true);
    assert.equal(request.requestedOutput.subjectMaxChars,120);
    assert.equal(request.requestedOutput.bodyRequired,true);
    assert.equal(request.requestedOutput.bodyMaxChars,3000);
    assert.equal(request.constraints.doNotInventRecipientIdentity,true);
    assert.equal(request.constraints.doNotInventContactDetails,true);
    assert.equal(request.constraints.doNotUsePrivateOrUnverifiedContactData,true);
    assert.equal(request.constraints.doNotOfferPaymentForLinks,true);
    assert.equal(request.constraints.doNotOfferReciprocalLinks,true);
    assert.equal(request.constraints.humanReviewRequiredBeforeSend,true);
    assert.equal(request.constraints.sendingNotAuthorized,true);
    assert.equal("recipient" in request,false);
    assert.equal("email" in request,false);
    assert.equal("contact" in request,false);
  }

  const existing=requests.find(
    request=>request?.targetUrl==="https://diamondshelf.us/guide",
  );
  assert.ok(existing);
  assert.equal(existing.targetBindingFingerprint,null);
  assert.equal(existing.resourceIdentityFingerprint,null);

  const bound=requests.find(
    request=>
      request?.targetUrl
      ==="https://diamondshelf.us/blogs/news/best-fall-fragrances",
  );
  assert.ok(bound);
  assert.ok(bound.targetBindingFingerprint);
  assert.equal(
    bound.resourceIdentityFingerprint,
    owned.resourceIdentityFingerprint,
  );
  assert.equal(bound.draftPurposeCode,"content_promotion_context");
  assert.equal(bound.approvalReviewFingerprint.length,64);

  assertAuthorityOutreachDraftGenerationRequestProjectionIntegrity(
    result,
    {
      qualification:q,
      reviews:r,
      resources:[owned],
      bindings,
    },
  );
});

test("missing target without explicit binding remains non-generative",()=>{
  const q=qualification();
  const r=reviews(q);
  const result=buildAuthorityOutreachDraftGenerationRequestProjection({
    qualification:q,
    reviews:r,
    resources:[resource()],
  });
  assert.equal(result.summary.generationRequestReady,1);
  assert.equal(result.summary.targetBindingRequired,1);
  const blocked=result.items.find(
    item=>item.state==="target_binding_required",
  );
  assert.ok(blocked);
  assert.equal(blocked.request,null);
});

test("unreviewed prospects never receive generation requests",()=>{
  const q=qualification();
  const result=buildAuthorityOutreachDraftGenerationRequestProjection({
    qualification:q,
  });
  assert.equal(result.summary.generationRequestReady,0);
  assert.equal(result.summary.humanReviewRequired,2);
  assert.ok(result.items.every(item=>item.request===null));
});

test("rejected and deferred prospects remain non-generative",()=>{
  const q=qualification();
  const r:AuthorityOutreachReviewInput[]=q.prospects.map(
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
  const result=buildAuthorityOutreachDraftGenerationRequestProjection({
    qualification:q,
    reviews:r,
  });
  assert.equal(result.summary.generationRequestReady,0);
  assert.equal(result.summary.rejected,1);
  assert.equal(result.summary.deferred,1);
  assert.ok(result.items.every(item=>item.request===null));
});

test("generation request projection is deterministic and tamper-evident",()=>{
  const {q,r,owned,bindings}=boundInput();
  const input={
    qualification:q,
    reviews:r,
    resources:[owned],
    bindings,
  };
  const first=buildAuthorityOutreachDraftGenerationRequestProjection(input);
  const second=buildAuthorityOutreachDraftGenerationRequestProjection(input);
  assert.deepEqual(second,first);

  const tampered=structuredClone(first);
  const ready=tampered.items.find(item=>item.request!==null);
  assert.ok(ready?.request);
  Object.assign(ready.request,{targetUrl:"https://diamondshelf.us/other"});
  assert.throws(
    ()=>assertAuthorityOutreachDraftGenerationRequestProjectionIntegrity(
      tampered,
      input,
    ),
    /ugp_outreach_draft_request_integrity_mismatch/,
  );
});
