import assert from "node:assert/strict";
import test from "node:test";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";
import { UGP_RESEARCH_PLAN_VERSION, type ResearchPlan } from "./research-plan-contract.js";
import { CVI_EDITORIAL_REPORT_BRIDGE_VERSION, type CviEditorialBridgeResult } from "./cvi-editorial-report-bridge.js";
import { prepareCviUgpResearchHandoff } from "./cvi-ugp-research-handoff.js";

const fp=(s:string)=>s.repeat(64);
const opportunityId=fp("a");
const opportunityFingerprint=fp("b");
const semantics={
  readOnly:true,deterministic:true,planningOnly:true,performsNetworkOperation:false,
  performsSourceAcquisition:false,performsPersistence:false,generatesArticleText:false,
  generatesClaims:false,verifiesClaims:false,grantsAuthorization:false,
  publicationAuthorized:false,executionAuthorized:false,
} as const;
const planBase={
  version:UGP_RESEARCH_PLAN_VERSION,opportunityId,opportunityFingerprint,
  targetTopic:"CVI research handoff",recommendedAction:"create_candidate",
  searchIntent:"informational",recommendedContentType:"article_or_guide",
  objective:"Evidence-based research only",
  questions:[{questionId:fp("c"),question:"Which facts are supportable?",purposeCode:"verify",
    requiredEvidenceClasses:["claim_verification"],questionFingerprint:fp("d")}],
  requiredEvidenceClasses:["claim_verification","primary_authoritative_sources"],
  discoveryPlan:[{stepId:fp("e"),order:1,channel:"official_primary_sources",
    purposeCode:"verify",requiredEvidenceClasses:["claim_verification"],
    stopCondition:"Find independent sources",stepFingerprint:fp("f")}],
  limitations:["research_only"],
  provenance:{contentOpportunityModelFingerprint:fp("1"),
    contentOpportunityFingerprint:opportunityFingerprint,topicClusteringFingerprint:fp("2"),
    coverageAssessmentFingerprint:fp("3"),cannibalizationAssessmentFingerprint:fp("4"),
    businessRelevanceEvidenceFingerprint:fp("5")},
  semantics,
};
const planFingerprint=stableEvidenceHash({purpose:"ugp_research_plan",...planBase});
const researchPlan={
  ...planBase,planFingerprint,
  planId:stableEvidenceHash({purpose:"ugp_research_plan_id",
    version:UGP_RESEARCH_PLAN_VERSION,opportunityId,planFingerprint}),
} as ResearchPlan;
const editorialBridge:CviEditorialBridgeResult={
  version:CVI_EDITORIAL_REPORT_BRIDGE_VERSION,
  status:"RESEARCH_AND_HUMAN_REVIEW_ONLY",reasons:[],
  sourceReportFingerprints:[fp("6"),fp("7")],outputFingerprint:fp("8"),
  externalFactsIndependentlyVerified:false,tenantAccessIndependentlyVerified:false,
  executionAuthorized:false,publicationAuthorized:false,
};
const base={
  tenantId:"tenant-1",siteId:"site-1",
  expectedOpportunityId:opportunityId,expectedOpportunityFingerprint:opportunityFingerprint,
  expectedEditorialBridgeFingerprint:editorialBridge.outputFingerprint,
  researchPlan,editorialBridge,
  documentedEvidenceClasses:["claim_verification","primary_authoritative_sources"],
};

import { buildSourceEvidenceLedger } from "./source-evidence-ledger-contract.js";
import { bindCviCapturedSourcesToResearch } from "./cvi-ugp-captured-source-handoff.js";

const source = {
 sourceId:"official-1",sourceKind:"official_primary" as const,acquisitionMethod:"manual_import" as const,
 locator:"https://example.test/facts",title:"Source record",publisher:"Example",
 acquiredAt:"2026-10-09T04:00:00Z",publishedAt:"2026-10-08T04:00:00Z",
 sourceFingerprint:fp("d"),qualitySignals:{
  publisherIdentityKnown:true,authorIdentityKnown:false,publicationDateAvailable:true,
  updateDateAvailable:false,provenanceComplete:true,firstPartyOrOfficial:true,independentlyProduced:false,
 },
};
const captured=(classes: ("claim_verification" | "primary_authoritative_sources")[]) =>
 buildSourceEvidenceLedger({researchPlan,sources:[source],evidence:[{
  sourceId:"official-1",extractedEvidence:"Captured source statement for later factual review.",
  questionIds:[researchPlan.questions[0]!.questionId],evidenceClasses:classes,
  claimRefs:[{claimKey:"claim-1",relevance:"direct"}],
 }]});
const handoff=prepareCviUgpResearchHandoff(base);
test("captured UGP ledger evidence yields review only, not publication or fact certification",()=>{
 const r=bindCviCapturedSourcesToResearch({
  handoff,researchPlan,sourceLedger:captured(["claim_verification","primary_authoritative_sources"]),
 });
 assert.equal(r.status,"CAPTURED_EVIDENCE_REVIEW_ONLY");
 assert.deepEqual(r.reasons,[]);
 assert.equal(r.sourceTransportAuthenticated,false);
 assert.equal(r.sourceFactsIndependentlyVerified,false);
 assert.equal(r.sourceLicensingVerified,false);
 assert.equal(r.executionAuthorized,false);
 assert.equal(r.publicationAuthorized,false);
});
test("actual missing captured evidence blocks despite claimed coverage",()=>{
 const r=bindCviCapturedSourcesToResearch({
  handoff,researchPlan,sourceLedger:captured(["claim_verification"]),
 });
 assert.equal(r.status,"BLOCKED");
 assert.deepEqual(r.missingEvidenceClasses,["primary_authoritative_sources"]);
});
test("ledger tampering, mismatched UGP plan and unsafe handoff deny",()=>{
 const ledger=captured(["claim_verification","primary_authoritative_sources"]);
 assert.equal(bindCviCapturedSourcesToResearch({
  handoff,researchPlan,sourceLedger:{...ledger,opportunityId:fp("f")},
 }).status,"BLOCKED");
 assert.equal(bindCviCapturedSourcesToResearch({
  handoff:{...handoff,status:"BLOCKED"},researchPlan,sourceLedger:ledger,
 }).status,"BLOCKED");
 assert.equal(bindCviCapturedSourcesToResearch({
  handoff:{...handoff,publicationAuthorized:true as false},researchPlan,sourceLedger:ledger,
 }).status,"BLOCKED");
});
