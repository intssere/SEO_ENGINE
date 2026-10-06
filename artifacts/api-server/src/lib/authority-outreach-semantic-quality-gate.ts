import { createHash } from "node:crypto";
import {
  assertAuthorityOutreachDraftCandidateValidationIntegrity,
  type AuthorityOutreachDraftCandidate,
  type AuthorityOutreachDraftCandidateValidation,
} from "./authority-outreach-draft-candidate-validation.js";
import type {
  AuthorityOutreachDraftGenerationRequest,
} from "./authority-outreach-draft-generation-request.js";

export const UGP_AUTHORITY_OUTREACH_SEMANTIC_QUALITY_GATE_VERSION =
  "ugp-10-8-outreach-semantic-quality-gate-v1" as const;

export type AuthorityOutreachSemanticCheckId =
  | "factual_claim_support"
  | "relationship_history_integrity"
  | "link_scheme_policy"
  | "ranking_outcome_claims"
  | "tone_reputation_safety"
  | "contextual_fit";

export type AuthorityOutreachSemanticAssessment = Readonly<{
  checkId: AuthorityOutreachSemanticCheckId;
  status: "pass" | "blocked";
  summary: string;
  evidenceRefs: readonly string[];
  assessmentFingerprint: string;
}>;

export type AuthorityOutreachSemanticQualityGate = Readonly<{
  version: typeof UGP_AUTHORITY_OUTREACH_SEMANTIC_QUALITY_GATE_VERSION;
  gateId: string;
  gateFingerprint: string;
  requestId: string;
  requestFingerprint: string;
  candidateFingerprint: string;
  mechanicalValidationFingerprint: string;
  prospectFingerprint: string;
  opportunityFingerprint: string;
  approvalReviewFingerprint: string;
  targetUrl: string;
  status: "pass" | "blocked";
  eligibleForHumanSendReview: boolean;
  checks: readonly Readonly<{
    checkId:
      | "mechanical_validation"
      | AuthorityOutreachSemanticCheckId;
    status: "pass" | "blocked";
    summary: string;
    evidenceRefs: readonly string[];
    checkFingerprint: string;
  }>[];
  blockingReasons: readonly string[];
  semantics: Readonly<{
    deterministic: true;
    failClosed: true;
    separateFromGeneration: true;
    externalSemanticAssessmentRequired: true;
    modelConfidenceIsNotQualityGate: true;
    mechanicallyValidCandidateRequired: true;
    eligibleForHumanSendReviewOnly: true;
    humanSendReviewRequired: true;
    sendAuthorizationGranted: false;
    contactDiscoveryAuthorized: false;
    contactDiscoveryPerformed: false;
    modelExecutionAuthorized: false;
    performsModelCall: false;
    performsProviderCall: false;
    performsNetworkOperation: false;
    performsPersistence: false;
    outreachSendingAuthorized: false;
    outreachSendingPerformed: false;
    schedulerEnabled: false;
    workerEnabled: false;
    providerWrites: false;
    publicSiteWrites: false;
    linkSchemeAutomationAuthorized: false;
  }>;
}>;

const CHECK_IDS:readonly AuthorityOutreachSemanticCheckId[]=Object.freeze([
  "factual_claim_support",
  "relationship_history_integrity",
  "link_scheme_policy",
  "ranking_outcome_claims",
  "tone_reputation_safety",
  "contextual_fit",
]);

const HEX64=/^[0-9a-f]{64}$/;
const CONTROL=/[\u0000-\u001f\u007f]/;

const SEMANTICS=Object.freeze({
  deterministic:true as const,
  failClosed:true as const,
  separateFromGeneration:true as const,
  externalSemanticAssessmentRequired:true as const,
  modelConfidenceIsNotQualityGate:true as const,
  mechanicallyValidCandidateRequired:true as const,
  eligibleForHumanSendReviewOnly:true as const,
  humanSendReviewRequired:true as const,
  sendAuthorizationGranted:false as const,
  contactDiscoveryAuthorized:false as const,
  contactDiscoveryPerformed:false as const,
  modelExecutionAuthorized:false as const,
  performsModelCall:false as const,
  performsProviderCall:false as const,
  performsNetworkOperation:false as const,
  performsPersistence:false as const,
  outreachSendingAuthorized:false as const,
  outreachSendingPerformed:false as const,
  schedulerEnabled:false as const,
  workerEnabled:false as const,
  providerWrites:false as const,
  publicSiteWrites:false as const,
  linkSchemeAutomationAuthorized:false as const,
});

function stableJson(value:unknown):string{
  if(value===undefined) return "null";
  if(value===null||typeof value!=="object") return JSON.stringify(value);
  if(Array.isArray(value)) return "["+value.map(stableJson).join(",")+"]";
  const object=value as Record<string,unknown>;
  return "{"+Object.keys(object).sort().map(
    key=>JSON.stringify(key)+":"+stableJson(object[key]),
  ).join(",")+"}";
}

function hash(value:unknown):string{
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function exactText(value:unknown,field:string,max=2048):string{
  if(
    typeof value!=="string"
    ||value!==value.trim()
    ||value.length<1
    ||value.length>max
    ||CONTROL.test(value)
  ){
    throw new Error("ugp_outreach_semantic_quality_invalid_"+field);
  }
  return value;
}

function exactFingerprint(value:unknown,field:string):string{
  if(typeof value!=="string"||!HEX64.test(value)){
    throw new Error("ugp_outreach_semantic_quality_invalid_"+field);
  }
  return value;
}

function uniqueSorted(values:readonly string[]):readonly string[]{
  return Object.freeze([...new Set(values)].sort());
}

export function buildAuthorityOutreachSemanticAssessment(input:Readonly<{
  checkId:AuthorityOutreachSemanticCheckId;
  status:"pass"|"blocked";
  summary:string;
  evidenceRefs:readonly string[];
}>):AuthorityOutreachSemanticAssessment{
  if(
    !input
    ||typeof input!=="object"
    ||Array.isArray(input)
    ||!CHECK_IDS.includes(input.checkId)
    ||!["pass","blocked"].includes(input.status)
    ||!Array.isArray(input.evidenceRefs)
    ||input.evidenceRefs.length<1
  ){
    throw new Error("ugp_outreach_semantic_quality_invalid_assessment");
  }
  const base={
    checkId:input.checkId,
    status:input.status,
    summary:exactText(input.summary,"assessment_summary"),
    evidenceRefs:uniqueSorted(
      input.evidenceRefs.map(value=>
        exactText(value,"assessment_evidence_ref",512),
      ),
    ),
  };
  return Object.freeze({
    ...base,
    assessmentFingerprint:hash({
      purpose:"ugp_authority_outreach_semantic_assessment",
      version:UGP_AUTHORITY_OUTREACH_SEMANTIC_QUALITY_GATE_VERSION,
      ...base,
    }),
  });
}

function normalizeAssessments(
  assessments:readonly AuthorityOutreachSemanticAssessment[],
):ReadonlyMap<
  AuthorityOutreachSemanticCheckId,
  AuthorityOutreachSemanticAssessment
>{
  if(!Array.isArray(assessments)){
    throw new Error(
      "ugp_outreach_semantic_quality_invalid_assessments",
    );
  }
  const map=new Map<
    AuthorityOutreachSemanticCheckId,
    AuthorityOutreachSemanticAssessment
  >();
  for(const assessment of assessments){
    if(
      !assessment
      ||!CHECK_IDS.includes(assessment.checkId)
      ||!["pass","blocked"].includes(assessment.status)
      ||map.has(assessment.checkId)
    ){
      throw new Error(
        "ugp_outreach_semantic_quality_invalid_assessment",
      );
    }
    const rebuilt=buildAuthorityOutreachSemanticAssessment({
      checkId:assessment.checkId,
      status:assessment.status,
      summary:assessment.summary,
      evidenceRefs:assessment.evidenceRefs,
    });
    if(rebuilt.assessmentFingerprint!==assessment.assessmentFingerprint){
      throw new Error(
        "ugp_outreach_semantic_quality_assessment_fingerprint_mismatch",
      );
    }
    map.set(assessment.checkId,rebuilt);
  }
  for(const checkId of CHECK_IDS){
    if(!map.has(checkId)){
      throw new Error(
        "ugp_outreach_semantic_quality_missing_assessment:"+checkId,
      );
    }
  }
  return map;
}

function checkRecord(input:Readonly<{
  checkId:"mechanical_validation"|AuthorityOutreachSemanticCheckId;
  status:"pass"|"blocked";
  summary:string;
  evidenceRefs:readonly string[];
}>){
  const base={
    checkId:input.checkId,
    status:input.status,
    summary:exactText(input.summary,"check_summary"),
    evidenceRefs:uniqueSorted(
      input.evidenceRefs.map(value=>
        exactText(value,"check_evidence_ref",512),
      ),
    ),
  };
  return Object.freeze({
    ...base,
    checkFingerprint:hash({
      purpose:"ugp_authority_outreach_semantic_quality_check",
      version:UGP_AUTHORITY_OUTREACH_SEMANTIC_QUALITY_GATE_VERSION,
      ...base,
    }),
  });
}

export function buildAuthorityOutreachSemanticQualityGate(input:Readonly<{
  request:AuthorityOutreachDraftGenerationRequest;
  candidate:AuthorityOutreachDraftCandidate;
  mechanicalValidation:AuthorityOutreachDraftCandidateValidation;
  assessments:readonly AuthorityOutreachSemanticAssessment[];
}>):AuthorityOutreachSemanticQualityGate{
  if(!input||typeof input!=="object"||Array.isArray(input)){
    throw new Error("ugp_outreach_semantic_quality_invalid_input");
  }
  assertAuthorityOutreachDraftCandidateValidationIntegrity(
    input.mechanicalValidation,
    {request:input.request,candidate:input.candidate},
  );
  if(
    input.mechanicalValidation.status!=="candidate_valid"
    ||input.mechanicalValidation.mechanicalValidationPassed!==true
  ){
    throw new Error(
      "ugp_outreach_semantic_quality_mechanical_validation_required",
    );
  }

  const candidateFingerprint=exactFingerprint(
    input.mechanicalValidation.candidateFingerprint,
    "candidate_fingerprint",
  );
  const validationFingerprint=exactFingerprint(
    input.mechanicalValidation.validationFingerprint,
    "mechanical_validation_fingerprint",
  );
  if(
    input.mechanicalValidation.requestFingerprint
      !==input.request.requestFingerprint
    ||input.mechanicalValidation.prospectFingerprint
      !==input.request.prospectFingerprint
    ||input.mechanicalValidation.opportunityFingerprint
      !==input.request.opportunityFingerprint
    ||input.mechanicalValidation.approvalReviewFingerprint
      !==input.request.approvalReviewFingerprint
    ||input.mechanicalValidation.targetUrl!==input.request.targetUrl
  ){
    throw new Error(
      "ugp_outreach_semantic_quality_lineage_mismatch",
    );
  }

  const assessments=normalizeAssessments(input.assessments);
  const mechanical=checkRecord({
    checkId:"mechanical_validation",
    status:"pass",
    summary:
      "UGP-10.7 mechanical candidate validation passed for the exact frozen request.",
    evidenceRefs:[
      "candidate:"+candidateFingerprint,
      "mechanical_validation:"+validationFingerprint,
      "request:"+input.request.requestFingerprint,
    ],
  });

  const semanticChecks=CHECK_IDS.map(checkId=>{
    const assessment=assessments.get(checkId)!;
    return checkRecord({
      checkId,
      status:assessment.status,
      summary:assessment.summary,
      evidenceRefs:[
        "assessment:"+assessment.assessmentFingerprint,
        ...assessment.evidenceRefs,
      ],
    });
  });
  const checks=Object.freeze([mechanical,...semanticChecks]);
  const blockingReasons=uniqueSorted(
    checks
      .filter(check=>check.status==="blocked")
      .map(check=>check.checkId+":"+check.summary),
  );
  const status=blockingReasons.length===0
    ?"pass" as const
    :"blocked" as const;

  const base={
    version:UGP_AUTHORITY_OUTREACH_SEMANTIC_QUALITY_GATE_VERSION,
    requestId:input.request.requestId,
    requestFingerprint:input.request.requestFingerprint,
    candidateFingerprint,
    mechanicalValidationFingerprint:validationFingerprint,
    prospectFingerprint:input.request.prospectFingerprint,
    opportunityFingerprint:input.request.opportunityFingerprint,
    approvalReviewFingerprint:input.request.approvalReviewFingerprint,
    targetUrl:input.request.targetUrl,
    status,
    eligibleForHumanSendReview:status==="pass",
    checks,
    blockingReasons,
    semantics:SEMANTICS,
  };
  const gateFingerprint=hash({
    purpose:"ugp_authority_outreach_semantic_quality_gate",
    ...base,
  });
  return Object.freeze({
    ...base,
    gateId:"uaoqg-"+gateFingerprint.slice(0,24),
    gateFingerprint,
  });
}

export function assertAuthorityOutreachSemanticQualityGateIntegrity(
  result:AuthorityOutreachSemanticQualityGate,
  input:Readonly<{
    request:AuthorityOutreachDraftGenerationRequest;
    candidate:AuthorityOutreachDraftCandidate;
    mechanicalValidation:AuthorityOutreachDraftCandidateValidation;
    assessments:readonly AuthorityOutreachSemanticAssessment[];
  }>,
):void{
  if(
    !result
    ||result.version
      !==UGP_AUTHORITY_OUTREACH_SEMANTIC_QUALITY_GATE_VERSION
  ){
    throw new Error("ugp_outreach_semantic_quality_version_invalid");
  }
  const s=result.semantics;
  if(
    s.deterministic!==true
    ||s.failClosed!==true
    ||s.separateFromGeneration!==true
    ||s.externalSemanticAssessmentRequired!==true
    ||s.modelConfidenceIsNotQualityGate!==true
    ||s.mechanicallyValidCandidateRequired!==true
    ||s.eligibleForHumanSendReviewOnly!==true
    ||s.humanSendReviewRequired!==true
    ||s.sendAuthorizationGranted!==false
    ||s.contactDiscoveryAuthorized!==false
    ||s.contactDiscoveryPerformed!==false
    ||s.modelExecutionAuthorized!==false
    ||s.performsModelCall!==false
    ||s.performsProviderCall!==false
    ||s.performsNetworkOperation!==false
    ||s.performsPersistence!==false
    ||s.outreachSendingAuthorized!==false
    ||s.outreachSendingPerformed!==false
    ||s.schedulerEnabled!==false
    ||s.workerEnabled!==false
    ||s.providerWrites!==false
    ||s.publicSiteWrites!==false
    ||s.linkSchemeAutomationAuthorized!==false
  ){
    throw new Error("ugp_outreach_semantic_quality_unsafe_semantics");
  }
  const expected=buildAuthorityOutreachSemanticQualityGate(input);
  if(stableJson(expected)!==stableJson(result)){
    throw new Error(
      "ugp_outreach_semantic_quality_integrity_mismatch",
    );
  }
}
