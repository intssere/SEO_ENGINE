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

import { inspectCviNestedSourceIntegrity } from "./cvi-ugp-nested-source-integrity.js";

const ledger=captured(["claim_verification","primary_authoritative_sources"]);
const sourceHandoff=bindCviCapturedSourcesToResearch({handoff,researchPlan,sourceLedger:ledger});
const inspect=(l=ledger,h=sourceHandoff)=>inspectCviNestedSourceIntegrity({ledger:l,capturedHandoff:h});
test("nested source and evidence records check out but never attest reality or authorize publication",()=>{
 const result=inspect();
 assert.equal(result.status,"INTEGRITY_REVIEW_ONLY");
 assert.equal(result.nestedRecordFingerprintsVerified,true);
 assert.equal(result.sourceAuthenticityIndependentlyVerified,false);
 assert.equal(result.factualAccuracyIndependentlyVerified,false);
 assert.equal(result.licensingIndependentlyVerified,false);
 assert.equal(result.executionAuthorized,false);
 assert.equal(result.publicationAuthorized,false);
});
test("rehashing the outer ledger cannot conceal modified nested source metadata",()=>{
 const tampered={...ledger,sources:ledger.sources.map(s=>({...s,title:"Altered title"}))};
 const {ledgerId:_id,ledgerFingerprint:_fp,...rest}=tampered;
 const fingerprint=stableEvidenceHash({purpose:"ugp_source_evidence_ledger",...rest});
 const rebuilt={...tampered,ledgerFingerprint:fingerprint,ledgerId:stableEvidenceHash({
  purpose:"ugp_source_evidence_ledger_id",version:ledger.version,
  researchPlanId:ledger.researchPlanId,ledgerFingerprint:fingerprint,
 })};
 const result=inspect(rebuilt);
 assert.equal(result.status,"BLOCKED");
 assert.ok(result.reasons.includes("source_record_integrity_mismatch"));
});
test("altered captured evidence excerpt and evidence ID cannot pass nested checks",()=>{
 const tampered={...ledger,evidence:ledger.evidence.map(e=>({...e,extractedEvidence:"different"}))};
 const result=inspect(tampered);
 assert.equal(result.status,"BLOCKED");
 assert.ok(result.reasons.includes("evidence_record_integrity_mismatch"));
 const changedId={...ledger,evidence:ledger.evidence.map(e=>({...e,evidenceId:fp("f")}))};
 assert.ok(inspect(changedId).reasons.includes("evidence_id_integrity_mismatch"));
});
test("lying coverage counts and unsafe captured-handoff status block",()=>{
 const changed={...ledger,coverage:ledger.coverage.map(c=>({...c,evidenceCount:99}))};
 assert.ok(inspect(changed).reasons.includes("evidence_coverage_inconsistent"));
 assert.equal(inspect(ledger,{...sourceHandoff,publicationAuthorized:true as false}).status,"BLOCKED");
});
