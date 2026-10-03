import assert from "node:assert/strict";
import test from "node:test";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";
import { buildUniversalResourceLocator, buildUniversalSiteIdentity } from "./universal-site-resource-identity.js";
import { buildInternalLinkingEvidenceIntegration, assertInternalLinkingEvidenceIntegrationIntegrity } from "./internal-linking-evidence-integration.js";
import type { ContentBriefOutline } from "./content-brief-outline-contract.js";
import type { SourceEvidenceLedger } from "./source-evidence-ledger-contract.js";

const fp=(c:string)=>c.repeat(64);
const site=buildUniversalSiteIdentity({siteId:"site-1",canonicalOrigin:"https://example.test"});
const newContent=buildUniversalResourceLocator({site,provider:"public_web",kind:"article",externalId:"new:guide",canonicalUrl:"https://example.test/guides/new"});
const pageA=buildUniversalResourceLocator({site,provider:"public_web",kind:"page",externalId:"page:a",canonicalUrl:"https://example.test/a"});
const pageB=buildUniversalResourceLocator({site,provider:"public_web",kind:"page",externalId:"page:b",canonicalUrl:"https://example.test/b"});

function fixtures(){
 const ledgerBase={version:"ugp-7-2-source-evidence-ledger-v1" as const,researchPlanId:fp("1"),researchPlanFingerprint:fp("2"),opportunityId:fp("3"),targetTopic:"topic",sources:Object.freeze([{sourceId:"source-1",sourceKind:"official_primary" as const,acquisitionMethod:"captured_http" as const,locator:"https://authority.test/source",canonicalLocator:"https://authority.test/source",title:"Authority Source",publisher:"Authority",author:"Author",publishedAt:"2026-09-01T00:00:00.000Z",updatedAt:null,acquiredAt:"2026-10-01T00:00:00.000Z",sourceFingerprint:fp("0"),qualitySignals:Object.freeze({publisherIdentityKnown:true,authorIdentityKnown:true,publicationDateAvailable:true,updateDateAvailable:false,provenanceComplete:true,firstPartyOrOfficial:true,independentlyProduced:true}),supportTier:"strong" as const,sourceRecordFingerprint:fp("5")}]),evidence:Object.freeze([{evidenceId:fp("4"),sourceId:"source-1",sourceRecordFingerprint:fp("5"),extractedEvidence:"evidence",questionIds:Object.freeze([fp("6")]),evidenceClasses:Object.freeze(["primary_authoritative_sources"] as const),claimRefs:Object.freeze([]),evidenceFingerprint:fp("7")}]),coverage:Object.freeze([]),unresolvedEvidenceClasses:Object.freeze([]),provenance:Object.freeze({contentOpportunityModelFingerprint:fp("8"),contentOpportunityFingerprint:fp("9"),topicClusteringFingerprint:fp("a"),coverageAssessmentFingerprint:fp("b"),cannibalizationAssessmentFingerprint:fp("c"),businessRelevanceEvidenceFingerprint:fp("d")}),semantics:Object.freeze({deterministic:true as const,capturedAcquisitionOnly:true as const,performsNetworkOperation:false as const,performsLiveSourceAcquisition:false as const,performsPersistence:false as const,extractedEvidenceIsNotVerifiedClaim:true as const,conflictingEvidenceMayCoexist:true as const,sourceQualityDoesNotEstablishTruth:true as const,generatesArticleText:false as const,publicationAuthorized:false as const,executionAuthorized:false as const,providerWrites:false as const,publicSiteWrites:false as const})};
 const ledgerFingerprint=stableEvidenceHash({purpose:"ugp_source_evidence_ledger",...ledgerBase});
 const ledger=Object.freeze({...ledgerBase,ledgerId:stableEvidenceHash({purpose:"ugp_source_evidence_ledger_id",version:"ugp-7-2-source-evidence-ledger-v1",researchPlanId:ledgerBase.researchPlanId,ledgerFingerprint}),ledgerFingerprint}) as SourceEvidenceLedger;
 const briefBase={version:"ugp-7-3-content-brief-outline-v1" as const,researchPlanId:fp("1"),researchPlanFingerprint:fp("2"),sourceEvidenceLedgerId:ledger.ledgerId,sourceEvidenceLedgerFingerprint:ledger.ledgerFingerprint,opportunityId:fp("3"),targetTopic:"topic",contentGoal:"goal",audience:"audience",intent:"informational" as const,recommendedContentType:"article_or_guide" as const,recommendedAction:"create_candidate" as const,questions:Object.freeze([]),claimIntents:Object.freeze([]),entities:Object.freeze([]),internalLinkTargets:Object.freeze([{targetUrl:"https://example.test/a",targetLabel:"Page A",supportingEvidenceIds:Object.freeze([fp("4")]),linkTargetFingerprint:fp("e")}]),outline:Object.freeze([]),unresolvedEvidenceClasses:Object.freeze([]),limitations:Object.freeze([]),provenance:ledger.provenance,semantics:Object.freeze({deterministic:true as const,evidenceGrounded:true as const,planningOnly:true as const,claimsRemainUnverified:true as const,performsNetworkOperation:false as const,performsPersistence:false as const,generatesArticleProse:false as const,grantsAuthorization:false as const,publicationAuthorized:false as const,executionAuthorized:false as const})};
 const briefFingerprint=stableEvidenceHash({purpose:"ugp_content_brief_outline",...briefBase});
 const brief=Object.freeze({...briefBase,briefId:stableEvidenceHash({purpose:"ugp_content_brief_outline_id",version:"ugp-7-3-content-brief-outline-v1",opportunityId:briefBase.opportunityId,briefFingerprint}),briefFingerprint}) as ContentBriefOutline;
 return {ledger,brief};
}
function assessment(source:any,target:any,char:string){
 const evidenceFingerprints=Object.freeze([fp(char)]);
 const base={sourceLocatorFingerprint:source.resourceLocatorFingerprint,targetLocatorFingerprint:target.resourceLocatorFingerprint,topicalRelevance:0.9,contextualFit:0.8,businessRelevance:0.7,anchorText:"relevant guide",context:"Observed page context supports a relevant internal link.",evidenceFingerprints};
 return Object.freeze({source,target,topicalRelevance:0.9,contextualFit:0.8,businessRelevance:0.7,anchorText:"relevant guide",context:"Observed page context supports a relevant internal link.",evidenceFingerprints,assessmentFingerprint:stableEvidenceHash({purpose:"ugp_internal_link_relevance_assessment",...base})});
}

test("UGP-8.2B binds brief targets and reverse page evidence into 8.2A candidates",()=>{
 const {brief,ledger}=fixtures();
 const result=buildInternalLinkingEvidenceIntegration({brief,sourceEvidenceLedger:ledger,newContent,newContentStateFingerprint:fp("f"),pageEvidence:[
  {page:pageA,stateFingerprint:fp("1"),evidenceFingerprint:fp("2"),internalAnchors:[]},
  {page:pageB,stateFingerprint:fp("3"),evidenceFingerprint:fp("4"),internalAnchors:[]},
 ],relevanceAssessments:[assessment(newContent,pageA,"5"),assessment(pageB,newContent,"6")]});
 assert.equal(result.candidateInputs.length,2);
 assert.equal(result.recommendations.summary.newContentToExisting,1);
 assert.equal(result.recommendations.summary.existingToNewContent,1);
 assert.equal(result.semantics.performsNetworkOperation,false);
 assertInternalLinkingEvidenceIntegrationIntegrity(result);
});

test("UGP-8.2B derives already-linked reverse state and fails closed through 8.2A",()=>{
 const {brief,ledger}=fixtures();
 assert.throws(()=>buildInternalLinkingEvidenceIntegration({brief,sourceEvidenceLedger:ledger,newContent,newContentStateFingerprint:fp("f"),pageEvidence:[
  {page:pageA,stateFingerprint:fp("1"),evidenceFingerprint:fp("2"),internalAnchors:[]},
  {page:pageB,stateFingerprint:fp("3"),evidenceFingerprint:fp("4"),internalAnchors:[{href:"https://example.test/guides/new#section",text:"New guide"}]},
 ],relevanceAssessments:[assessment(newContent,pageA,"5"),assessment(pageB,newContent,"6")]}),/already_linked/);
});

test("UGP-8.2B requires observed evidence for every brief target",()=>{
 const {brief,ledger}=fixtures();
 assert.throws(()=>buildInternalLinkingEvidenceIntegration({brief,sourceEvidenceLedger:ledger,newContent,newContentStateFingerprint:fp("f"),pageEvidence:[],relevanceAssessments:[]}),/brief_target_not_observed/);
});

test("UGP-8.2B requires explicit outbound relevance assessment",()=>{
 const {brief,ledger}=fixtures();
 assert.throws(()=>buildInternalLinkingEvidenceIntegration({brief,sourceEvidenceLedger:ledger,newContent,newContentStateFingerprint:fp("f"),pageEvidence:[{page:pageA,stateFingerprint:fp("1"),evidenceFingerprint:fp("2"),internalAnchors:[]}],relevanceAssessments:[]}),/outbound_assessment_missing/);
});

test("UGP-8.2B rejects brief/ledger lineage drift",()=>{
 const {brief,ledger}=fixtures();
 assert.throws(()=>buildInternalLinkingEvidenceIntegration({brief:{...brief,sourceEvidenceLedgerFingerprint:fp("0")},sourceEvidenceLedger:ledger,newContent,newContentStateFingerprint:fp("f"),pageEvidence:[],relevanceAssessments:[]}),/brief_outline_fingerprint_mismatch|brief_ledger_lineage_mismatch/);
});
