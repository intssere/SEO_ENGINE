import { createHash } from "node:crypto";
import {
  assertAuthorityOutreachContactVerificationSpecIntegrity,
  type AuthorityOutreachContactPointType,
  type AuthorityOutreachContactVerificationEvidenceSourceClass,
  type AuthorityOutreachContactVerificationSpecification,
} from "./authority-outreach-contact-verification-specification.js";

export const UGP_AUTHORITY_OUTREACH_CONTACT_POINT_EVIDENCE_VERSION =
  "ugp-10-16-supplied-contact-point-evidence-validation-v1" as const;

export type AuthorityOutreachContactPointEvidenceOutcome =
  | "contact_point_set"
  | "no_public_contact_point";

export type AuthorityOutreachSuppliedContactPointEvidenceObservation =
  Readonly<{
    contactPointType: AuthorityOutreachContactPointType;
    contactPointValue: string;
    evidenceSourceClass:
      AuthorityOutreachContactVerificationEvidenceSourceClass;
    evidenceUrl: string;
    observedAt: string;
    contactPointFingerprint: string;
    publicBusinessContactAttested: true;
  }>;

export type AuthorityOutreachContactPointEvidenceRequest = Readonly<{
  contactVerificationSpecFingerprint: string;
  selectedRoleCandidateFingerprint: string;
  candidateFingerprint: string;
  outcome: AuthorityOutreachContactPointEvidenceOutcome;
  observations:
    readonly AuthorityOutreachSuppliedContactPointEvidenceObservation[];
}>;

export type AuthorityOutreachContactVerificationSpecIntegrityInput =
  Parameters<typeof assertAuthorityOutreachContactVerificationSpecIntegrity>[1];

export type AuthorityOutreachValidatedContactPoint = Readonly<{
  contactPointId: string;
  contactPointFingerprint: string;
  observationFingerprint: string;
  contactPointType: AuthorityOutreachContactPointType;
  contactPointValue: string;
  evidenceSourceClass:
    AuthorityOutreachContactVerificationEvidenceSourceClass;
  evidenceUrl: string;
  observedAt: string;
  publicBusinessContactAttested: true;
}>;

export type AuthorityOutreachContactPointEvidenceContract = Readonly<{
  version: typeof UGP_AUTHORITY_OUTREACH_CONTACT_POINT_EVIDENCE_VERSION;
  contactPointEvidenceId: string;
  contactPointEvidenceFingerprint: string;
  contactVerificationSpecId: string;
  contactVerificationSpecFingerprint: string;
  selectionDecisionFingerprint: string;
  selectionReviewSpecFingerprint: string;
  researchEvidenceFingerprint: string;
  researchSpecFingerprint: string;
  deliveryPreparationFingerprint: string;
  sendReviewFingerprint: string;
  qualityGateFingerprint: string;
  requestId: string;
  requestFingerprint: string;
  candidateFingerprint: string;
  mechanicalValidationFingerprint: string;
  prospectFingerprint: string;
  opportunityFingerprint: string;
  approvalReviewFingerprint: string;
  sourceDomain: string;
  sourceUrl: string | null;
  targetDomain: string;
  targetUrl: string;
  selectedRoleCandidateFingerprint: string;
  outcome: AuthorityOutreachContactPointEvidenceOutcome;
  validatedContactPoints: readonly AuthorityOutreachValidatedContactPoint[];
  contactPointCount: number;
  resultingState: "contact_point_evidence_validated";
  semantics: Readonly<{
    deterministic: true;
    exactContactVerificationSpecificationRequired: true;
    exactSelectedRoleCandidateRequired: true;
    suppliedPublicContactPointEvidenceValidationOnly: true;
    externalContactDiscoveryAuthorized: false;
    externalContactDiscoveryPerformed: false;
    privateOrBrokeredPersonalDataAllowed: false;
    deliverabilityVerificationAuthorized: false;
    deliverabilityVerificationPerformed: false;
    verificationProviderCallAuthorized: false;
    mailboxProbeAuthorized: false;
    mailboxProbePerformed: false;
    mailboxAccessAuthorized: false;
    providerBindingAuthorized: false;
    policyAndConsentReviewAuthorized: false;
    sendJobConstructionAuthorized: false;
    sendAuthorizationGranted: false;
    outreachSendingAuthorized: false;
    outreachSendingPerformed: false;
    followUpSchedulingAuthorized: false;
    performsModelCall: false;
    performsProviderCall: false;
    performsNetworkOperation: false;
    performsPersistence: false;
    schedulerEnabled: false;
    workerEnabled: false;
    providerWrites: false;
    publicSiteWrites: false;
    linkSchemeAutomationAuthorized: false;
  }>;
}>;

const HEX64=/^[0-9a-f]{64}$/;
const CANONICAL_UTC=
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const EMAIL=
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?$/;

const SEMANTICS=Object.freeze({
  deterministic:true as const,
  exactContactVerificationSpecificationRequired:true as const,
  exactSelectedRoleCandidateRequired:true as const,
  suppliedPublicContactPointEvidenceValidationOnly:true as const,
  externalContactDiscoveryAuthorized:false as const,
  externalContactDiscoveryPerformed:false as const,
  privateOrBrokeredPersonalDataAllowed:false as const,
  deliverabilityVerificationAuthorized:false as const,
  deliverabilityVerificationPerformed:false as const,
  verificationProviderCallAuthorized:false as const,
  mailboxProbeAuthorized:false as const,
  mailboxProbePerformed:false as const,
  mailboxAccessAuthorized:false as const,
  providerBindingAuthorized:false as const,
  policyAndConsentReviewAuthorized:false as const,
  sendJobConstructionAuthorized:false as const,
  sendAuthorizationGranted:false as const,
  outreachSendingAuthorized:false as const,
  outreachSendingPerformed:false as const,
  followUpSchedulingAuthorized:false as const,
  performsModelCall:false as const,
  performsProviderCall:false as const,
  performsNetworkOperation:false as const,
  performsPersistence:false as const,
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

function fingerprint(value:unknown,field:string):string{
  if(typeof value!=="string"||!HEX64.test(value)){
    throw new Error(
      "ugp_outreach_contact_point_evidence_invalid_"+field,
    );
  }
  return value;
}

function relatedHost(host:string,sourceDomain:string):boolean{
  const normalizedHost=host.toLowerCase().replace(/\.$/,"");
  const normalizedDomain=sourceDomain.toLowerCase().replace(/\.$/,"");
  return normalizedHost===normalizedDomain
    ||normalizedHost.endsWith("."+normalizedDomain);
}

function canonicalPublicUrl(
  value:unknown,
  field:string,
  sourceDomain:string,
):string{
  if(typeof value!=="string"||value.length>2048){
    throw new Error("ugp_outreach_contact_point_evidence_invalid_"+field);
  }
  let parsed:URL;
  try{
    parsed=new URL(value);
  }catch{
    throw new Error("ugp_outreach_contact_point_evidence_invalid_"+field);
  }
  if(
    parsed.protocol!=="https:"
    ||parsed.username!==""
    ||parsed.password!==""
    ||parsed.hash!==""
    ||!relatedHost(parsed.hostname,sourceDomain)
  ){
    throw new Error("ugp_outreach_contact_point_evidence_invalid_"+field);
  }
  return parsed.href;
}

function canonicalEmail(value:unknown,sourceDomain:string):string{
  if(typeof value!=="string"||value.length>254||value.trim()!==value){
    throw new Error(
      "ugp_outreach_contact_point_evidence_invalid_contact_point_value",
    );
  }
  const normalized=value.toLowerCase();
  if(!EMAIL.test(normalized)){
    throw new Error(
      "ugp_outreach_contact_point_evidence_invalid_contact_point_value",
    );
  }
  const at=normalized.lastIndexOf("@");
  const domain=normalized.slice(at+1);
  if(!relatedHost(domain,sourceDomain)){
    throw new Error(
      "ugp_outreach_contact_point_evidence_contact_domain_mismatch",
    );
  }
  return normalized;
}

function canonicalContactPointValue(
  type:AuthorityOutreachContactPointType,
  value:unknown,
  sourceDomain:string,
):string{
  if(type==="email_address") return canonicalEmail(value,sourceDomain);
  if(type==="web_contact_form"){
    return canonicalPublicUrl(value,"contact_point_value",sourceDomain);
  }
  throw new Error(
    "ugp_outreach_contact_point_evidence_contact_point_type_invalid",
  );
}

function canonicalObservedAt(value:unknown):string{
  if(
    typeof value!=="string"
    ||!CANONICAL_UTC.test(value)
    ||!Number.isFinite(Date.parse(value))
    ||new Date(value).toISOString()!==value
  ){
    throw new Error(
      "ugp_outreach_contact_point_evidence_invalid_observed_at",
    );
  }
  return value;
}

export function authorityOutreachPublicContactPointFingerprint(
  type:AuthorityOutreachContactPointType,
  value:string,
  sourceDomain:string,
):string{
  const normalized=canonicalContactPointValue(type,value,sourceDomain);
  return hash({
    purpose:"ugp_authority_outreach_public_business_contact_point",
    contactPointType:type,
    contactPointValue:normalized,
    sourceDomain:sourceDomain.toLowerCase().replace(/\.$/,""),
  });
}

function normalizeObservation(
  observation:AuthorityOutreachSuppliedContactPointEvidenceObservation,
  specification:AuthorityOutreachContactVerificationSpecification,
):AuthorityOutreachValidatedContactPoint{
  if(!observation||typeof observation!=="object"||Array.isArray(observation)){
    throw new Error(
      "ugp_outreach_contact_point_evidence_invalid_observation",
    );
  }
  if(observation.publicBusinessContactAttested!==true){
    throw new Error(
      "ugp_outreach_contact_point_evidence_public_business_attestation_required",
    );
  }
  if(
    !specification.permittedContactPointTypes.includes(
      observation.contactPointType,
    )
  ){
    throw new Error(
      "ugp_outreach_contact_point_evidence_contact_point_type_not_permitted",
    );
  }
  if(
    !specification.allowedEvidenceSourceClasses.includes(
      observation.evidenceSourceClass,
    )
  ){
    throw new Error(
      "ugp_outreach_contact_point_evidence_source_class_not_allowed",
    );
  }

  const contactPointValue=canonicalContactPointValue(
    observation.contactPointType,
    observation.contactPointValue,
    specification.sourceDomain,
  );
  const evidenceUrl=canonicalPublicUrl(
    observation.evidenceUrl,
    "evidence_url",
    specification.sourceDomain,
  );
  const observedAt=canonicalObservedAt(observation.observedAt);
  const contactPointFingerprint=fingerprint(
    observation.contactPointFingerprint,
    "contact_point_fingerprint",
  );
  const expectedFingerprint=authorityOutreachPublicContactPointFingerprint(
    observation.contactPointType,
    contactPointValue,
    specification.sourceDomain,
  );
  if(contactPointFingerprint!==expectedFingerprint){
    throw new Error(
      "ugp_outreach_contact_point_evidence_contact_point_fingerprint_mismatch",
    );
  }

  const normalized={
    contactPointFingerprint,
    contactPointType:observation.contactPointType,
    contactPointValue,
    evidenceSourceClass:observation.evidenceSourceClass,
    evidenceUrl,
    observedAt,
    publicBusinessContactAttested:true as const,
  };
  const observationFingerprint=hash({
    purpose:"ugp_authority_outreach_public_contact_point_evidence_observation",
    contactVerificationSpecFingerprint:
      specification.contactVerificationSpecFingerprint,
    selectedRoleCandidateFingerprint:
      specification.selectedRoleCandidateFingerprint,
    ...normalized,
  });
  return Object.freeze({
    contactPointId:"uaocp-"+contactPointFingerprint.slice(0,24),
    observationFingerprint,
    ...normalized,
  });
}

function normalizeObservations(
  observations:unknown,
  specification:AuthorityOutreachContactVerificationSpecification,
):readonly AuthorityOutreachValidatedContactPoint[]{
  if(!Array.isArray(observations)){
    throw new Error(
      "ugp_outreach_contact_point_evidence_observations_required",
    );
  }
  if(observations.length>specification.verificationPolicy.maxContactPointsToValidate){
    throw new Error(
      "ugp_outreach_contact_point_evidence_contact_point_limit_exceeded",
    );
  }
  const normalized=observations.map(item=>normalizeObservation(
    item as AuthorityOutreachSuppliedContactPointEvidenceObservation,
    specification,
  ));
  const contactPoints=new Set<string>();
  const observationFingerprints=new Set<string>();
  for(const item of normalized){
    if(contactPoints.has(item.contactPointFingerprint)){
      throw new Error(
        "ugp_outreach_contact_point_evidence_duplicate_contact_point",
      );
    }
    if(observationFingerprints.has(item.observationFingerprint)){
      throw new Error(
        "ugp_outreach_contact_point_evidence_duplicate_observation",
      );
    }
    contactPoints.add(item.contactPointFingerprint);
    observationFingerprints.add(item.observationFingerprint);
  }
  return Object.freeze(
    normalized.sort(
      (a,b)=>a.contactPointFingerprint.localeCompare(b.contactPointFingerprint),
    ),
  );
}

export function buildAuthorityOutreachContactPointEvidenceContract(
  input:Readonly<{
    contactVerificationSpecification:
      AuthorityOutreachContactVerificationSpecification;
    contactVerificationSpecificationInput:
      AuthorityOutreachContactVerificationSpecIntegrityInput;
    evidenceRequest:AuthorityOutreachContactPointEvidenceRequest;
  }>,
):AuthorityOutreachContactPointEvidenceContract{
  if(!input||typeof input!=="object"||Array.isArray(input)){
    throw new Error(
      "ugp_outreach_contact_point_evidence_invalid_input",
    );
  }

  assertAuthorityOutreachContactVerificationSpecIntegrity(
    input.contactVerificationSpecification,
    input.contactVerificationSpecificationInput,
  );

  const specification=input.contactVerificationSpecification;
  if(
    specification.resultingState!=="contact_verification_spec_ready"
    ||specification.semantics.contactVerificationSpecificationOnly!==true
    ||specification.semantics.contactAddressVerificationAuthorized!==false
    ||specification.semantics.verificationProviderCallAuthorized!==false
    ||specification.semantics.sendAuthorizationGranted!==false
  ){
    throw new Error(
      "ugp_outreach_contact_point_evidence_specification_required",
    );
  }

  const request=input.evidenceRequest;
  const contactVerificationSpecFingerprint=fingerprint(
    request.contactVerificationSpecFingerprint,
    "contact_verification_spec_fingerprint",
  );
  const selectedRoleCandidateFingerprint=fingerprint(
    request.selectedRoleCandidateFingerprint,
    "selected_role_candidate_fingerprint",
  );
  const candidateFingerprint=fingerprint(
    request.candidateFingerprint,
    "candidate_fingerprint",
  );
  if(
    contactVerificationSpecFingerprint
      !==specification.contactVerificationSpecFingerprint
    ||selectedRoleCandidateFingerprint
      !==specification.selectedRoleCandidateFingerprint
    ||candidateFingerprint!==specification.candidateFingerprint
  ){
    throw new Error(
      "ugp_outreach_contact_point_evidence_stale_lineage",
    );
  }

  const validatedContactPoints=normalizeObservations(
    request.observations,
    specification,
  );
  if(
    request.outcome==="contact_point_set"
    &&validatedContactPoints.length===0
  ){
    throw new Error(
      "ugp_outreach_contact_point_evidence_contact_point_set_required",
    );
  }
  if(
    request.outcome==="no_public_contact_point"
    &&validatedContactPoints.length!==0
  ){
    throw new Error(
      "ugp_outreach_contact_point_evidence_empty_result_required",
    );
  }
  if(
    request.outcome!=="contact_point_set"
    &&request.outcome!=="no_public_contact_point"
  ){
    throw new Error(
      "ugp_outreach_contact_point_evidence_outcome_invalid",
    );
  }

  const base={
    version:UGP_AUTHORITY_OUTREACH_CONTACT_POINT_EVIDENCE_VERSION,
    contactVerificationSpecId:specification.contactVerificationSpecId,
    contactVerificationSpecFingerprint:
      specification.contactVerificationSpecFingerprint,
    selectionDecisionFingerprint:specification.selectionDecisionFingerprint,
    selectionReviewSpecFingerprint:specification.selectionReviewSpecFingerprint,
    researchEvidenceFingerprint:specification.researchEvidenceFingerprint,
    researchSpecFingerprint:specification.researchSpecFingerprint,
    deliveryPreparationFingerprint:specification.deliveryPreparationFingerprint,
    sendReviewFingerprint:specification.sendReviewFingerprint,
    qualityGateFingerprint:specification.qualityGateFingerprint,
    requestId:specification.requestId,
    requestFingerprint:specification.requestFingerprint,
    candidateFingerprint:specification.candidateFingerprint,
    mechanicalValidationFingerprint:
      specification.mechanicalValidationFingerprint,
    prospectFingerprint:specification.prospectFingerprint,
    opportunityFingerprint:specification.opportunityFingerprint,
    approvalReviewFingerprint:specification.approvalReviewFingerprint,
    sourceDomain:specification.sourceDomain,
    sourceUrl:specification.sourceUrl,
    targetDomain:specification.targetDomain,
    targetUrl:specification.targetUrl,
    selectedRoleCandidateFingerprint:
      specification.selectedRoleCandidateFingerprint,
    outcome:request.outcome,
    validatedContactPoints,
    contactPointCount:validatedContactPoints.length,
    resultingState:"contact_point_evidence_validated" as const,
    semantics:SEMANTICS,
  };
  const contactPointEvidenceFingerprint=hash({
    purpose:"ugp_authority_outreach_contact_point_evidence_contract",
    ...base,
  });
  return Object.freeze({
    ...base,
    contactPointEvidenceId:
      "uaocpe-"+contactPointEvidenceFingerprint.slice(0,24),
    contactPointEvidenceFingerprint,
  });
}

export function assertAuthorityOutreachContactPointEvidenceIntegrity(
  result:AuthorityOutreachContactPointEvidenceContract,
  input:Readonly<{
    contactVerificationSpecification:
      AuthorityOutreachContactVerificationSpecification;
    contactVerificationSpecificationInput:
      AuthorityOutreachContactVerificationSpecIntegrityInput;
    evidenceRequest:AuthorityOutreachContactPointEvidenceRequest;
  }>,
):void{
  if(
    !result
    ||result.version!==UGP_AUTHORITY_OUTREACH_CONTACT_POINT_EVIDENCE_VERSION
  ){
    throw new Error(
      "ugp_outreach_contact_point_evidence_version_invalid",
    );
  }
  const s=result.semantics;
  if(
    s.deterministic!==true
    ||s.exactContactVerificationSpecificationRequired!==true
    ||s.exactSelectedRoleCandidateRequired!==true
    ||s.suppliedPublicContactPointEvidenceValidationOnly!==true
    ||s.externalContactDiscoveryAuthorized!==false
    ||s.externalContactDiscoveryPerformed!==false
    ||s.privateOrBrokeredPersonalDataAllowed!==false
    ||s.deliverabilityVerificationAuthorized!==false
    ||s.deliverabilityVerificationPerformed!==false
    ||s.verificationProviderCallAuthorized!==false
    ||s.mailboxProbeAuthorized!==false
    ||s.mailboxProbePerformed!==false
    ||s.mailboxAccessAuthorized!==false
    ||s.providerBindingAuthorized!==false
    ||s.policyAndConsentReviewAuthorized!==false
    ||s.sendJobConstructionAuthorized!==false
    ||s.sendAuthorizationGranted!==false
    ||s.outreachSendingAuthorized!==false
    ||s.outreachSendingPerformed!==false
    ||s.followUpSchedulingAuthorized!==false
    ||s.performsModelCall!==false
    ||s.performsProviderCall!==false
    ||s.performsNetworkOperation!==false
    ||s.performsPersistence!==false
    ||s.schedulerEnabled!==false
    ||s.workerEnabled!==false
    ||s.providerWrites!==false
    ||s.publicSiteWrites!==false
    ||s.linkSchemeAutomationAuthorized!==false
  ){
    throw new Error(
      "ugp_outreach_contact_point_evidence_unsafe_semantics",
    );
  }

  const expected=buildAuthorityOutreachContactPointEvidenceContract(input);
  if(stableJson(expected)!==stableJson(result)){
    throw new Error(
      "ugp_outreach_contact_point_evidence_integrity_mismatch",
    );
  }
}
