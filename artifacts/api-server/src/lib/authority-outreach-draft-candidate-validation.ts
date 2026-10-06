import { createHash } from "node:crypto";
import {
  UGP_AUTHORITY_OUTREACH_DRAFT_GENERATION_REQUEST_VERSION,
  type AuthorityOutreachDraftGenerationRequest,
} from "./authority-outreach-draft-generation-request.js";

export const UGP_AUTHORITY_OUTREACH_DRAFT_CANDIDATE_VALIDATION_VERSION =
  "ugp-10-7-outreach-draft-candidate-validation-v1" as const;

export type AuthorityOutreachDraftCandidate = Readonly<{
  requestFingerprint: string;
  subject: string;
  body: string;
}>;

export type AuthorityOutreachDraftCandidateCheckId =
  | "request_lineage"
  | "plain_text_shape"
  | "recipient_contact_data"
  | "target_url_integrity";

export type AuthorityOutreachDraftCandidateValidation = Readonly<{
  version: typeof UGP_AUTHORITY_OUTREACH_DRAFT_CANDIDATE_VALIDATION_VERSION;
  validationId: string;
  validationFingerprint: string;
  requestId: string;
  requestFingerprint: string;
  prospectFingerprint: string;
  opportunityFingerprint: string;
  approvalReviewFingerprint: string;
  targetUrl: string;
  candidateFingerprint: string;
  subject: string;
  body: string;
  status: "candidate_valid" | "candidate_blocked";
  mechanicalValidationPassed: boolean;
  checks: readonly Readonly<{
    checkId: AuthorityOutreachDraftCandidateCheckId;
    status: "pass" | "blocked";
    summary: string;
    checkFingerprint: string;
  }>[];
  blockingReasons: readonly string[];
  semantics: Readonly<{
    deterministic: true;
    evidenceBoundRequestRequired: true;
    candidateValidationOnly: true;
    providerNeutral: true;
    builtInNetworkTransport: false;
    recipientDataAccepted: false;
    contactDiscoveryAuthorized: false;
    contactDiscoveryPerformed: false;
    modelExecutionAuthorized: false;
    performsModelCall: false;
    performsProviderCall: false;
    performsNetworkOperation: false;
    performsPersistence: false;
    semanticQualityGatePassed: false;
    requiresUGP108SemanticQualityGate: true;
    humanReviewRequiredBeforeSend: true;
    outreachSendingAuthorized: false;
    outreachSendingPerformed: false;
    schedulerEnabled: false;
    workerEnabled: false;
    providerWrites: false;
    publicSiteWrites: false;
    linkSchemeAutomationAuthorized: false;
  }>;
}>;

const HEX64=/^[0-9a-f]{64}$/;
const REQUEST_ID=/^uaodr-[0-9a-f]{24}$/;
const CONTROL=/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const EMAIL=/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const MAILTO_OR_TEL=/\b(?:mailto|tel):/i;
const HTML_TAG=/<\/?[A-Za-z][^>]*>/;
const URL_PATTERN=/https?:\/\/[^\s<>"'()[\]{}]+/gi;

const SEMANTICS=Object.freeze({
  deterministic:true as const,
  evidenceBoundRequestRequired:true as const,
  candidateValidationOnly:true as const,
  providerNeutral:true as const,
  builtInNetworkTransport:false as const,
  recipientDataAccepted:false as const,
  contactDiscoveryAuthorized:false as const,
  contactDiscoveryPerformed:false as const,
  modelExecutionAuthorized:false as const,
  performsModelCall:false as const,
  performsProviderCall:false as const,
  performsNetworkOperation:false as const,
  performsPersistence:false as const,
  semanticQualityGatePassed:false as const,
  requiresUGP108SemanticQualityGate:true as const,
  humanReviewRequiredBeforeSend:true as const,
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

function exactFingerprint(value:unknown,field:string):string{
  if(typeof value!=="string"||!HEX64.test(value)){
    throw new Error("ugp_outreach_draft_candidate_invalid_"+field);
  }
  return value;
}

function exactText(
  value:unknown,
  field:string,
  max:number,
):string{
  if(
    typeof value!=="string"
    ||value!==value.trim()
    ||value.length<1
    ||value.length>max
    ||CONTROL.test(value)
  ){
    throw new Error("ugp_outreach_draft_candidate_invalid_"+field);
  }
  return value;
}

function assertRequestTarget(
  targetDomain:string,
  targetUrl:string,
):void{
  let parsed:URL;
  try{parsed=new URL(targetUrl);}catch{
    throw new Error("ugp_outreach_draft_candidate_request_target_invalid");
  }
  if(
    parsed.protocol!=="https:"
    ||parsed.username
    ||parsed.password
    ||parsed.search
    ||parsed.hash
    ||parsed.hostname.toLowerCase()!==targetDomain.toLowerCase()
  ){
    throw new Error("ugp_outreach_draft_candidate_request_target_mismatch");
  }
}

export function assertAuthorityOutreachDraftGenerationRequestIntegrity(
  request:AuthorityOutreachDraftGenerationRequest,
):void{
  if(
    !request
    ||request.version!==UGP_AUTHORITY_OUTREACH_DRAFT_GENERATION_REQUEST_VERSION
  ){
    throw new Error("ugp_outreach_draft_candidate_request_version_invalid");
  }
  if(!REQUEST_ID.test(request.requestId)){
    throw new Error("ugp_outreach_draft_candidate_request_id_invalid");
  }
  const supplied=exactFingerprint(
    request.requestFingerprint,
    "request_fingerprint",
  );
  exactFingerprint(
    request.targetBindingProjectionFingerprint,
    "target_binding_projection_fingerprint",
  );
  exactFingerprint(
    request.preparationFingerprint,
    "preparation_fingerprint",
  );
  exactFingerprint(request.workspaceFingerprint,"workspace_fingerprint");
  exactFingerprint(
    request.workspaceItemFingerprint,
    "workspace_item_fingerprint",
  );
  exactFingerprint(
    request.qualificationFingerprint,
    "qualification_fingerprint",
  );
  exactFingerprint(request.prospectFingerprint,"prospect_fingerprint");
  exactFingerprint(
    request.opportunityFingerprint,
    "opportunity_fingerprint",
  );
  exactFingerprint(
    request.approvalReviewFingerprint,
    "approval_review_fingerprint",
  );
  if(request.targetBindingFingerprint!==null){
    exactFingerprint(
      request.targetBindingFingerprint,
      "target_binding_fingerprint",
    );
  }
  if(request.resourceIdentityFingerprint!==null){
    exactFingerprint(
      request.resourceIdentityFingerprint,
      "resource_identity_fingerprint",
    );
  }
  if(
    (request.targetBindingFingerprint===null)
    !==(request.resourceIdentityFingerprint===null)
  ){
    throw new Error(
      "ugp_outreach_draft_candidate_request_binding_lineage_incomplete",
    );
  }
  if(
    !Array.isArray(request.evidenceFingerprints)
    ||request.evidenceFingerprints.some(value=>!HEX64.test(value))
  ){
    throw new Error(
      "ugp_outreach_draft_candidate_request_evidence_invalid",
    );
  }
  assertRequestTarget(request.targetDomain,request.targetUrl);
  if(
    request.requestedOutput.format!=="plain_text"
    ||request.requestedOutput.subjectRequired!==true
    ||request.requestedOutput.subjectMaxChars!==120
    ||request.requestedOutput.bodyRequired!==true
    ||request.requestedOutput.bodyMaxChars!==3000
    ||request.requestedOutput.oneMessageOnly!==true
  ){
    throw new Error(
      "ugp_outreach_draft_candidate_request_output_contract_invalid",
    );
  }
  const constraints=request.constraints;
  if(
    constraints.useOnlySuppliedEvidenceForFactualClaims!==true
    ||constraints.doNotInventRelationshipHistory!==true
    ||constraints.doNotInventRecipientIdentity!==true
    ||constraints.doNotInventContactDetails!==true
    ||constraints.doNotUsePrivateOrUnverifiedContactData!==true
    ||constraints.targetUrlMustRemainExact!==true
    ||constraints.doNotOfferPaymentForLinks!==true
    ||constraints.doNotOfferReciprocalLinks!==true
    ||constraints.doNotPromiseRankingOutcomes!==true
    ||constraints.doNotRepresentMessageAsAlreadySent!==true
    ||constraints.humanReviewRequiredBeforeSend!==true
    ||constraints.sendingNotAuthorized!==true
  ){
    throw new Error(
      "ugp_outreach_draft_candidate_request_constraints_invalid",
    );
  }

  const {
    requestId:_requestId,
    requestFingerprint:_requestFingerprint,
    ...base
  }=request;
  const expected=hash({
    purpose:"ugp_authority_outreach_draft_generation_request",
    ...base,
  });
  if(supplied!==expected){
    throw new Error(
      "ugp_outreach_draft_candidate_request_fingerprint_mismatch",
    );
  }
  if(request.requestId!=="uaodr-"+expected.slice(0,24)){
    throw new Error(
      "ugp_outreach_draft_candidate_request_id_mismatch",
    );
  }
}

function urls(text:string):readonly string[]{
  return Object.freeze(
    [...text.matchAll(URL_PATTERN)].map(match=>
      match[0].replace(/[.,;:!?]+$/,""),
    ),
  );
}

function checkRecord(
  checkId:AuthorityOutreachDraftCandidateCheckId,
  status:"pass"|"blocked",
  summary:string,
){
  const base={
    checkId,
    status,
    summary,
  };
  return Object.freeze({
    ...base,
    checkFingerprint:hash({
      purpose:"ugp_authority_outreach_draft_candidate_check",
      version:UGP_AUTHORITY_OUTREACH_DRAFT_CANDIDATE_VALIDATION_VERSION,
      ...base,
    }),
  });
}

export function validateAuthorityOutreachDraftCandidate(input:Readonly<{
  request:AuthorityOutreachDraftGenerationRequest;
  candidate:AuthorityOutreachDraftCandidate;
}>):AuthorityOutreachDraftCandidateValidation{
  if(!input||typeof input!=="object"||Array.isArray(input)){
    throw new Error("ugp_outreach_draft_candidate_invalid_input");
  }
  assertAuthorityOutreachDraftGenerationRequestIntegrity(input.request);

  const candidateRequestFingerprint=exactFingerprint(
    input.candidate?.requestFingerprint,
    "candidate_request_fingerprint",
  );
  if(candidateRequestFingerprint!==input.request.requestFingerprint){
    throw new Error("ugp_outreach_draft_candidate_request_lineage_mismatch");
  }
  const subject=exactText(
    input.candidate?.subject,
    "subject",
    input.request.requestedOutput.subjectMaxChars,
  );
  const body=exactText(
    input.candidate?.body,
    "body",
    input.request.requestedOutput.bodyMaxChars,
  );

  const checkLineage=checkRecord(
    "request_lineage",
    "pass",
    "Candidate is bound to the exact validated UGP-10.6 request fingerprint.",
  );

  const containsHtml=HTML_TAG.test(subject)||HTML_TAG.test(body);
  const checkShape=checkRecord(
    "plain_text_shape",
    containsHtml?"blocked":"pass",
    containsHtml
      ?"HTML-like markup is not permitted by the plain-text output contract."
      :"Subject and body satisfy the bounded plain-text output shape.",
  );

  const containsContact=
    EMAIL.test(subject)
    ||EMAIL.test(body)
    ||MAILTO_OR_TEL.test(subject)
    ||MAILTO_OR_TEL.test(body);
  const checkContact=checkRecord(
    "recipient_contact_data",
    containsContact?"blocked":"pass",
    containsContact
      ?"Candidate contains contact-address material even though UGP-10.6 is recipient-free."
      :"Candidate contains no mechanically detectable email, mailto, or tel contact material.",
  );

  const discoveredUrls=[...urls(subject),...urls(body)];
  const unexpectedUrls=discoveredUrls.filter(
    value=>value!==input.request.targetUrl,
  );
  const checkTarget=checkRecord(
    "target_url_integrity",
    unexpectedUrls.length>0?"blocked":"pass",
    unexpectedUrls.length>0
      ?"Candidate contains a URL other than the exact UGP-10.6 owned target."
      :"Every detected URL, if any, equals the exact UGP-10.6 owned target.",
  );

  const checks=Object.freeze([
    checkLineage,
    checkShape,
    checkContact,
    checkTarget,
  ]);
  const blockingReasons=Object.freeze(
    checks
      .filter(check=>check.status==="blocked")
      .map(check=>check.checkId+":"+check.summary)
      .sort(),
  );
  const candidateBase={
    requestFingerprint:input.request.requestFingerprint,
    subject,
    body,
  };
  const candidateFingerprint=hash({
    purpose:"ugp_authority_outreach_draft_candidate",
    version:UGP_AUTHORITY_OUTREACH_DRAFT_CANDIDATE_VALIDATION_VERSION,
    ...candidateBase,
  });
  const status=blockingReasons.length===0
    ?"candidate_valid" as const
    :"candidate_blocked" as const;
  const base={
    version:UGP_AUTHORITY_OUTREACH_DRAFT_CANDIDATE_VALIDATION_VERSION,
    requestId:input.request.requestId,
    requestFingerprint:input.request.requestFingerprint,
    prospectFingerprint:input.request.prospectFingerprint,
    opportunityFingerprint:input.request.opportunityFingerprint,
    approvalReviewFingerprint:input.request.approvalReviewFingerprint,
    targetUrl:input.request.targetUrl,
    candidateFingerprint,
    subject,
    body,
    status,
    mechanicalValidationPassed:status==="candidate_valid",
    checks,
    blockingReasons,
    semantics:SEMANTICS,
  };
  const validationFingerprint=hash({
    purpose:"ugp_authority_outreach_draft_candidate_validation",
    ...base,
  });
  return Object.freeze({
    ...base,
    validationId:"uaodv-"+validationFingerprint.slice(0,24),
    validationFingerprint,
  });
}

export function assertAuthorityOutreachDraftCandidateValidationIntegrity(
  result:AuthorityOutreachDraftCandidateValidation,
  input:Readonly<{
    request:AuthorityOutreachDraftGenerationRequest;
    candidate:AuthorityOutreachDraftCandidate;
  }>,
):void{
  if(
    !result
    ||result.version
      !==UGP_AUTHORITY_OUTREACH_DRAFT_CANDIDATE_VALIDATION_VERSION
  ){
    throw new Error("ugp_outreach_draft_candidate_version_invalid");
  }
  const s=result.semantics;
  if(
    s.deterministic!==true
    ||s.evidenceBoundRequestRequired!==true
    ||s.candidateValidationOnly!==true
    ||s.providerNeutral!==true
    ||s.builtInNetworkTransport!==false
    ||s.recipientDataAccepted!==false
    ||s.contactDiscoveryAuthorized!==false
    ||s.contactDiscoveryPerformed!==false
    ||s.modelExecutionAuthorized!==false
    ||s.performsModelCall!==false
    ||s.performsProviderCall!==false
    ||s.performsNetworkOperation!==false
    ||s.performsPersistence!==false
    ||s.semanticQualityGatePassed!==false
    ||s.requiresUGP108SemanticQualityGate!==true
    ||s.humanReviewRequiredBeforeSend!==true
    ||s.outreachSendingAuthorized!==false
    ||s.outreachSendingPerformed!==false
    ||s.schedulerEnabled!==false
    ||s.workerEnabled!==false
    ||s.providerWrites!==false
    ||s.publicSiteWrites!==false
    ||s.linkSchemeAutomationAuthorized!==false
  ){
    throw new Error("ugp_outreach_draft_candidate_unsafe_semantics");
  }
  const expected=validateAuthorityOutreachDraftCandidate(input);
  if(stableJson(expected)!==stableJson(result)){
    throw new Error("ugp_outreach_draft_candidate_integrity_mismatch");
  }
}
