import assert from "node:assert/strict";
import test from "node:test";
import { buildUniversalResourceLocator, buildUniversalSiteIdentity } from "./universal-site-resource-identity.js";
import { assertInternalLinkingRecommendationIntegrity, buildInternalLinkingRecommendations } from "./internal-linking-recommendation-contract.js";

const site=buildUniversalSiteIdentity({siteId:"site-1",canonicalOrigin:"https://example.test"});
const newContent=buildUniversalResourceLocator({site,provider:"public_web",kind:"article",externalId:"new:guide",canonicalUrl:"https://example.test/guides/new"});
const existingA=buildUniversalResourceLocator({site,provider:"public_web",kind:"page",externalId:"page:a",canonicalUrl:"https://example.test/a"});
const existingB=buildUniversalResourceLocator({site,provider:"public_web",kind:"page",externalId:"page:b",canonicalUrl:"https://example.test/b"});
const fp=(c:string)=>c.repeat(64);

test("UGP-8.2A builds evidence-backed recommendations in both directions",()=>{
 const result=buildInternalLinkingRecommendations({newContent,candidates:[
  {direction:"new_content_to_existing",source:newContent,target:existingA,sourceStateFingerprint:fp("1"),targetStateFingerprint:fp("2"),anchorText:"existing topic guide",context:"Relevant section discussing the existing topic.",topicalRelevance:0.9,contextualFit:0.8,businessRelevance:0.5,supportingEvidenceFingerprints:[fp("a")],alreadyLinked:false},
  {direction:"existing_to_new_content",source:existingB,target:newContent,sourceStateFingerprint:fp("3"),targetStateFingerprint:fp("1"),anchorText:"new topic guide",context:"Existing page contains a relevant passage that can reference the new guide.",topicalRelevance:0.85,contextualFit:0.9,businessRelevance:0.6,supportingEvidenceFingerprints:[fp("b")],alreadyLinked:false},
 ]});
 assert.equal(result.summary.newContentToExisting,1);
 assert.equal(result.summary.existingToNewContent,1);
 assert.equal(result.summary.total,2);
 assert.equal(result.recommendations[0]?.score,0.815);
 assert.equal(result.semantics.mutatesContent,false);
 assertInternalLinkingRecommendationIntegrity(result);
});

test("UGP-8.2A rejects self-links and direction identity drift",()=>{
 assert.throws(()=>buildInternalLinkingRecommendations({newContent,candidates:[{direction:"new_content_to_existing",source:newContent,target:newContent,sourceStateFingerprint:fp("1"),targetStateFingerprint:fp("1"),anchorText:"self",context:"Self link context.",topicalRelevance:1,contextualFit:1,businessRelevance:1,supportingEvidenceFingerprints:[fp("a")],alreadyLinked:false}]}),/self_link/);
 assert.throws(()=>buildInternalLinkingRecommendations({newContent,candidates:[{direction:"existing_to_new_content",source:existingA,target:existingB,sourceStateFingerprint:fp("2"),targetStateFingerprint:fp("3"),anchorText:"wrong target",context:"Wrong directional target.",topicalRelevance:1,contextualFit:1,businessRelevance:1,supportingEvidenceFingerprints:[fp("a")],alreadyLinked:false}]}),/direction_target_mismatch/);
});

test("UGP-8.2A rejects already-linked and duplicate recommendations",()=>{
 const c={direction:"new_content_to_existing" as const,source:newContent,target:existingA,sourceStateFingerprint:fp("1"),targetStateFingerprint:fp("2"),anchorText:"existing topic guide",context:"Relevant context.",topicalRelevance:0.9,contextualFit:0.8,businessRelevance:0.5,supportingEvidenceFingerprints:[fp("a")],alreadyLinked:false};
 assert.throws(()=>buildInternalLinkingRecommendations({newContent,candidates:[{...c,alreadyLinked:true}]}),/already_linked/);
 assert.throws(()=>buildInternalLinkingRecommendations({newContent,candidates:[c,c]}),/duplicate_candidate/);
});

test("UGP-8.2A rejects cross-site candidates",()=>{
 const otherSite=buildUniversalSiteIdentity({siteId:"site-2",canonicalOrigin:"https://other.test"});
 const other=buildUniversalResourceLocator({site:otherSite,provider:"public_web",kind:"page",externalId:"other",canonicalUrl:"https://other.test/page"});
 assert.throws(()=>buildInternalLinkingRecommendations({newContent,candidates:[{direction:"new_content_to_existing",source:newContent,target:other,sourceStateFingerprint:fp("1"),targetStateFingerprint:fp("2"),anchorText:"other",context:"Cross-site context.",topicalRelevance:1,contextualFit:1,businessRelevance:1,supportingEvidenceFingerprints:[fp("a")],alreadyLinked:false}]}),/cross_site_candidate/);
});

test("UGP-8.2A rejects evidence-free candidates",()=>{
 assert.throws(()=>buildInternalLinkingRecommendations({newContent,candidates:[{direction:"new_content_to_existing",source:newContent,target:existingA,sourceStateFingerprint:fp("1"),targetStateFingerprint:fp("2"),anchorText:"existing topic guide",context:"Relevant context.",topicalRelevance:0.9,contextualFit:0.8,businessRelevance:0.5,supportingEvidenceFingerprints:[],alreadyLinked:false}]}),/invalid_evidence/);
});

test("UGP-8.2A integrity detects tampering",()=>{
 const result=buildInternalLinkingRecommendations({newContent,candidates:[{direction:"new_content_to_existing",source:newContent,target:existingA,sourceStateFingerprint:fp("1"),targetStateFingerprint:fp("2"),anchorText:"existing topic guide",context:"Relevant context.",topicalRelevance:0.9,contextualFit:0.8,businessRelevance:0.5,supportingEvidenceFingerprints:[fp("a")],alreadyLinked:false}]});
 assert.throws(()=>assertInternalLinkingRecommendationIntegrity({...result,resultFingerprint:fp("0")}),/result_fingerprint_mismatch/);
});
