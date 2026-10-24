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
test("UGP plan and matching CVI editorial packet only permit research planning review",()=>{
  const r=prepareCviUgpResearchHandoff(base);
  assert.equal(r.status,"RESEARCH_PLANNING_REVIEW_ONLY");
  assert.deepEqual(r.reasons,[]);
  assert.equal(r.publicationAuthorized,false);
  assert.equal(r.executionAuthorized,false);
  assert.equal(r.authenticatedProviderEvidenceVerified,false);
  assert.equal(r.independentlyVerifiedBusinessTruth,false);
  assert.equal(r.trustedHumanApprovalVerified,false);
  assert.equal(r.handoffFingerprint,prepareCviUgpResearchHandoff(base).handoffFingerprint);
});
test("wrong opportunity identity or tampered plan blocks handoff",()=>{
  assert.equal(prepareCviUgpResearchHandoff({...base,expectedOpportunityId:fp("9")}).status,"BLOCKED");
  assert.equal(prepareCviUgpResearchHandoff({...base,
    researchPlan:{...researchPlan,objective:"changed without integrity update"}}).status,"BLOCKED");
});
test("blocked, forged or mismatched editorial report denies even if plan valid",()=>{
  assert.equal(prepareCviUgpResearchHandoff({...base,
    editorialBridge:{...editorialBridge,status:"BLOCKED"}}).status,"BLOCKED");
  assert.equal(prepareCviUgpResearchHandoff({...base,
    expectedEditorialBridgeFingerprint:fp("0")}).status,"BLOCKED");
  assert.equal(prepareCviUgpResearchHandoff({...base,
    editorialBridge:{...editorialBridge,publicationAuthorized:true as false}}).status,"BLOCKED");
});
test("missing required evidence classes blocks and identifies missing evidence",()=>{
  const r=prepareCviUgpResearchHandoff({...base,documentedEvidenceClasses:["claim_verification"]});
  assert.equal(r.status,"BLOCKED");
  assert.deepEqual(r.missingEvidenceClasses,["primary_authoritative_sources"]);
});
