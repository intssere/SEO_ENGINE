import { createHash } from "node:crypto";
import {
  assertAuthorityOutreachDeliveryBindingPreparationSpecificationIntegrity,
  type AuthorityOutreachDeliveryBindingPreparationSpecification,
  type AuthorityOutreachDeliveryBindingRequirementClass,
} from "./authority-outreach-delivery-binding-preparation-specification.js";

export const UGP_AUTHORITY_OUTREACH_DELIVERY_BINDING_EVIDENCE_VERSION =
  "ugp-10-24-supplied-delivery-binding-evidence-validation-v1" as const;

export type AuthorityOutreachDeliveryBindingEvidenceObservationOutcome =
  | "supports_binding_readiness"
  | "contradicts_binding_readiness"
  | "inconclusive";

export type AuthorityOutreachDeliveryBindingEvidenceDisposition =
  | "delivery_binding_evidence_supporting"
  | "delivery_binding_evidence_contradictory"
  | "delivery_binding_evidence_inconclusive";

export type AuthorityOutreachSuppliedDeliveryBindingEvidenceObservation =
  Readonly<{
    requirementClass: AuthorityOutreachDeliveryBindingRequirementClass;
    observationOutcome:
      AuthorityOutreachDeliveryBindingEvidenceObservationOutcome;
    observedAt: string;
    technicalEvidenceFingerprint: string;
    publicBusinessBindingEvidenceAttested: true;
  }>;

export type AuthorityOutreachDeliveryBindingEvidenceRequest = Readonly<{
  deliveryBindingPreparationSpecFingerprint: string;
  selectedContactPointFingerprint: string;
  selectedRoleCandidateFingerprint: string;
  candidateFingerprint: string;
  observations:
    readonly AuthorityOutreachSuppliedDeliveryBindingEvidenceObservation[];
}>;

export type AuthorityOutreachDeliveryBindingPreparationIntegrityInput =
  Parameters<
    typeof assertAuthorityOutreachDeliveryBindingPreparationSpecificationIntegrity
  >[1];

export type AuthorityOutreachValidatedDeliveryBindingEvidenceObservation =
  Readonly<{
    observationId: string;
    observationFingerprint: string;
    requirementClass: AuthorityOutreachDeliveryBindingRequirementClass;
    observationOutcome:
      AuthorityOutreachDeliveryBindingEvidenceObservationOutcome;
    observedAt: string;
    technicalEvidenceFingerprint: string;
    publicBusinessBindingEvidenceAttested: true;
  }>;

export type AuthorityOutreachDeliveryBindingEvidenceContract = Readonly<{
  version: typeof UGP_AUTHORITY_OUTREACH_DELIVERY_BINDING_EVIDENCE_VERSION;
  deliveryBindingEvidenceId: string;
  deliveryBindingEvidenceFingerprint: string;
  deliveryBindingPreparationSpecId: string;
  deliveryBindingPreparationSpecFingerprint: string;
  deliverabilityEvidenceDecisionFingerprint: string;
  deliverabilityEvidenceReviewSpecFingerprint: string;
  deliverabilityEvidenceFingerprint: string;
  deliverabilityPreparationFingerprint: string;
  policyConsentDecisionFingerprint: string;
  policyConsentReviewSpecFingerprint: string;
  contactPointEvidenceFingerprint: string;
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
  selectedContactPointFingerprint: string;
  channelClass:
    AuthorityOutreachDeliveryBindingPreparationSpecification["channelClass"];
  frozenBindingRequirements:
    readonly AuthorityOutreachDeliveryBindingRequirementClass[];
  validatedObservations:
    readonly AuthorityOutreachValidatedDeliveryBindingEvidenceObservation[];
  evidenceCount: number;
  evidenceDisposition: AuthorityOutreachDeliveryBindingEvidenceDisposition;
  resultingState: "delivery_binding_evidence_validated";
  semantics: Readonly<{
    deterministic: true;
    exactDeliveryBindingPreparationSpecificationRequired: true;
    exactSelectedContactPointRequired: true;
    exactBindingRequirementSetRequired: true;
    suppliedBindingEvidenceValidationOnly: true;
    independentBindingVerificationPerformed: false;
    technicalEvidencePayloadIncluded: false;
    liveProviderIdentifierIncluded: false;
    senderMailboxIdentifierIncluded: false;
    providerCredentialIncluded: false;
    providerCredentialReferenceIncluded: false;
    providerCredentialActivationAuthorized: false;
    submissionMechanismReferenceIncluded: false;
    providerBindingAuthorized: false;
    providerBindingPerformed: false;
    mailboxBindingAuthorized: false;
    mailboxBindingPerformed: false;
    mailboxAccessAuthorized: false;
    mailboxProbeAuthorized: false;
    mailboxProbePerformed: false;
    webSubmissionExecutionAuthorized: false;
    webSubmissionExecutionPerformed: false;
    messageTransmissionAuthorized: false;
    messageTransmissionPerformed: false;
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

const OUTCOMES=
  new Set<AuthorityOutreachDeliveryBindingEvidenceObservationOutcome>([
    "supports_binding_readiness",
    "contradicts_binding_readiness",
    "inconclusive",
  ]);

const SEMANTICS=Object.freeze({
  deterministic:true as const,
  exactDeliveryBindingPreparationSpecificationRequired:true as const,
  exactSelectedContactPointRequired:true as const,
  exactBindingRequirementSetRequired:true as const,
  suppliedBindingEvidenceValidationOnly:true as const,
  independentBindingVerificationPerformed:false as const,
  technicalEvidencePayloadIncluded:false as const,
  liveProviderIdentifierIncluded:false as const,
  senderMailboxIdentifierIncluded:false as const,
  providerCredentialIncluded:false as const,
  providerCredentialReferenceIncluded:false as const,
  providerCredentialActivationAuthorized:false as const,
  submissionMechanismReferenceIncluded:false as const,
  providerBindingAuthorized:false as const,
  providerBindingPerformed:false as const,
  mailboxBindingAuthorized:false as const,
  mailboxBindingPerformed:false as const,
  mailboxAccessAuthorized:false as const,
  mailboxProbeAuthorized:false as const,
  mailboxProbePerformed:false as const,
  webSubmissionExecutionAuthorized:false as const,
  webSubmissionExecutionPerformed:false as const,
  messageTransmissionAuthorized:false as const,
  messageTransmissionPerformed:false as const,
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
      "ugp_outreach_delivery_binding_evidence_invalid_"+field,
    );
  }
  return value;
}

function canonicalObservedAt(value:unknown):string{
  if(
    typeof value!=="string"
    ||!CANONICAL_UTC.test(value)
    ||!Number.isFinite(Date.parse(value))
    ||new Date(value).toISOString()!==value
  ){
    throw new Error(
      "ugp_outreach_delivery_binding_evidence_invalid_observed_at",
    );
  }
  return value;
}

function normalizeObservation(
  observation:AuthorityOutreachSuppliedDeliveryBindingEvidenceObservation,
  preparation:AuthorityOutreachDeliveryBindingPreparationSpecification,
):AuthorityOutreachValidatedDeliveryBindingEvidenceObservation{
  if(!observation||typeof observation!=="object"||Array.isArray(observation)){
    throw new Error(
      "ugp_outreach_delivery_binding_evidence_invalid_observation",
    );
  }
  if(observation.publicBusinessBindingEvidenceAttested!==true){
    throw new Error(
      "ugp_outreach_delivery_binding_evidence_attestation_required",
    );
  }
  if(!preparation.futureBindingRequirements.includes(observation.requirementClass)){
    throw new Error(
      "ugp_outreach_delivery_binding_evidence_requirement_not_allowed",
    );
  }
  if(!OUTCOMES.has(observation.observationOutcome)){
    throw new Error(
      "ugp_outreach_delivery_binding_evidence_outcome_invalid",
    );
  }

  const observedAt=canonicalObservedAt(observation.observedAt);
  const technicalEvidenceFingerprint=fingerprint(
    observation.technicalEvidenceFingerprint,
    "technical_evidence_fingerprint",
  );
  const normalized={
    requirementClass:observation.requirementClass,
    observationOutcome:observation.observationOutcome,
    observedAt,
    technicalEvidenceFingerprint,
    publicBusinessBindingEvidenceAttested:true as const,
  };
  const observationFingerprint=hash({
    purpose:"ugp_authority_outreach_supplied_delivery_binding_evidence_observation",
    deliveryBindingPreparationSpecFingerprint:
      preparation.deliveryBindingPreparationSpecFingerprint,
    selectedContactPointFingerprint:
      preparation.selectedContactPointFingerprint,
    ...normalized,
  });

  return Object.freeze({
    observationId:"uaodbeo-"+observationFingerprint.slice(0,24),
    observationFingerprint,
    ...normalized,
  });
}

function normalizeObservations(
  observations:unknown,
  preparation:AuthorityOutreachDeliveryBindingPreparationSpecification,
):readonly AuthorityOutreachValidatedDeliveryBindingEvidenceObservation[]{
  if(!Array.isArray(observations)){
    throw new Error(
      "ugp_outreach_delivery_binding_evidence_observations_required",
    );
  }

  const expected=preparation.futureBindingRequirements;
  if(observations.length!==expected.length){
    throw new Error(
      "ugp_outreach_delivery_binding_evidence_complete_requirement_set_required",
    );
  }

  const normalized=observations.map(item=>normalizeObservation(
    item as AuthorityOutreachSuppliedDeliveryBindingEvidenceObservation,
    preparation,
  ));
  const requirementClasses=
    new Set<AuthorityOutreachDeliveryBindingRequirementClass>();
  const evidenceFingerprints=new Set<string>();

  for(const item of normalized){
    if(requirementClasses.has(item.requirementClass)){
      throw new Error(
        "ugp_outreach_delivery_binding_evidence_duplicate_requirement",
      );
    }
    if(evidenceFingerprints.has(item.technicalEvidenceFingerprint)){
      throw new Error(
        "ugp_outreach_delivery_binding_evidence_duplicate_technical_evidence",
      );
    }
    requirementClasses.add(item.requirementClass);
    evidenceFingerprints.add(item.technicalEvidenceFingerprint);
  }

  for(const requirementClass of expected){
    if(!requirementClasses.has(requirementClass)){
      throw new Error(
        "ugp_outreach_delivery_binding_evidence_complete_requirement_set_required",
      );
    }
  }

  const byRequirement=new Map(
    normalized.map(item=>[item.requirementClass,item] as const),
  );
  return Object.freeze(
    expected.map(requirementClass=>{
      const item=byRequirement.get(requirementClass);
      if(!item){
        throw new Error(
          "ugp_outreach_delivery_binding_evidence_complete_requirement_set_required",
        );
      }
      return item;
    }),
  );
}

function disposition(
  observations:
    readonly AuthorityOutreachValidatedDeliveryBindingEvidenceObservation[],
):AuthorityOutreachDeliveryBindingEvidenceDisposition{
  if(
    observations.some(
      item=>item.observationOutcome==="contradicts_binding_readiness",
    )
  ){
    return "delivery_binding_evidence_contradictory";
  }
  if(
    observations.every(
      item=>item.observationOutcome==="supports_binding_readiness",
    )
  ){
    return "delivery_binding_evidence_supporting";
  }
  return "delivery_binding_evidence_inconclusive";
}

export function buildAuthorityOutreachDeliveryBindingEvidenceContract(
  input:Readonly<{
    deliveryBindingPreparation:
      AuthorityOutreachDeliveryBindingPreparationSpecification;
    deliveryBindingPreparationInput:
      AuthorityOutreachDeliveryBindingPreparationIntegrityInput;
    evidenceRequest:AuthorityOutreachDeliveryBindingEvidenceRequest;
  }>,
):AuthorityOutreachDeliveryBindingEvidenceContract{
  if(!input||typeof input!=="object"||Array.isArray(input)){
    throw new Error(
      "ugp_outreach_delivery_binding_evidence_invalid_input",
    );
  }

  assertAuthorityOutreachDeliveryBindingPreparationSpecificationIntegrity(
    input.deliveryBindingPreparation,
    input.deliveryBindingPreparationInput,
  );

  const preparation=input.deliveryBindingPreparation;
  if(
    preparation.resultingState!=="delivery_binding_preparation_spec_ready"
    ||preparation.semantics.deliveryBindingPreparationSpecificationOnly!==true
    ||preparation.semantics.providerBindingAuthorized!==false
    ||preparation.semantics.providerBindingPerformed!==false
    ||preparation.semantics.mailboxBindingAuthorized!==false
    ||preparation.semantics.mailboxBindingPerformed!==false
    ||preparation.semantics.providerCredentialIncluded!==false
    ||preparation.semantics.providerCredentialReferenceIncluded!==false
    ||preparation.semantics.providerCredentialActivationAuthorized!==false
    ||preparation.semantics.sendAuthorizationGranted!==false
    ||preparation.preparationPolicy.bindingExecutionAllowed!==false
    ||preparation.preparationPolicy.messageTransmissionAllowed!==false
  ){
    throw new Error(
      "ugp_outreach_delivery_binding_evidence_preparation_required",
    );
  }

  const request=input.evidenceRequest;
  const preparationFingerprint=fingerprint(
    request.deliveryBindingPreparationSpecFingerprint,
    "delivery_binding_preparation_spec_fingerprint",
  );
  const selectedContactPointFingerprint=fingerprint(
    request.selectedContactPointFingerprint,
    "selected_contact_point_fingerprint",
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
    preparationFingerprint
      !==preparation.deliveryBindingPreparationSpecFingerprint
    ||selectedContactPointFingerprint
      !==preparation.selectedContactPointFingerprint
    ||selectedRoleCandidateFingerprint
      !==preparation.selectedRoleCandidateFingerprint
    ||candidateFingerprint!==preparation.candidateFingerprint
  ){
    throw new Error(
      "ugp_outreach_delivery_binding_evidence_stale_lineage",
    );
  }

  const validatedObservations=normalizeObservations(
    request.observations,
    preparation,
  );
  const evidenceDisposition=disposition(validatedObservations);

  const base={
    version:UGP_AUTHORITY_OUTREACH_DELIVERY_BINDING_EVIDENCE_VERSION,
    deliveryBindingPreparationSpecId:
      preparation.deliveryBindingPreparationSpecId,
    deliveryBindingPreparationSpecFingerprint:
      preparation.deliveryBindingPreparationSpecFingerprint,
    deliverabilityEvidenceDecisionFingerprint:
      preparation.deliverabilityEvidenceDecisionFingerprint,
    deliverabilityEvidenceReviewSpecFingerprint:
      preparation.deliverabilityEvidenceReviewSpecFingerprint,
    deliverabilityEvidenceFingerprint:
      preparation.deliverabilityEvidenceFingerprint,
    deliverabilityPreparationFingerprint:
      preparation.deliverabilityPreparationFingerprint,
    policyConsentDecisionFingerprint:
      preparation.policyConsentDecisionFingerprint,
    policyConsentReviewSpecFingerprint:
      preparation.policyConsentReviewSpecFingerprint,
    contactPointEvidenceFingerprint:
      preparation.contactPointEvidenceFingerprint,
    contactVerificationSpecFingerprint:
      preparation.contactVerificationSpecFingerprint,
    selectionDecisionFingerprint:
      preparation.selectionDecisionFingerprint,
    selectionReviewSpecFingerprint:
      preparation.selectionReviewSpecFingerprint,
    researchEvidenceFingerprint:preparation.researchEvidenceFingerprint,
    researchSpecFingerprint:preparation.researchSpecFingerprint,
    deliveryPreparationFingerprint:
      preparation.deliveryPreparationFingerprint,
    sendReviewFingerprint:preparation.sendReviewFingerprint,
    qualityGateFingerprint:preparation.qualityGateFingerprint,
    requestId:preparation.requestId,
    requestFingerprint:preparation.requestFingerprint,
    candidateFingerprint:preparation.candidateFingerprint,
    mechanicalValidationFingerprint:
      preparation.mechanicalValidationFingerprint,
    prospectFingerprint:preparation.prospectFingerprint,
    opportunityFingerprint:preparation.opportunityFingerprint,
    approvalReviewFingerprint:preparation.approvalReviewFingerprint,
    sourceDomain:preparation.sourceDomain,
    sourceUrl:preparation.sourceUrl,
    targetDomain:preparation.targetDomain,
    targetUrl:preparation.targetUrl,
    selectedRoleCandidateFingerprint:
      preparation.selectedRoleCandidateFingerprint,
    selectedContactPointFingerprint:
      preparation.selectedContactPointFingerprint,
    channelClass:preparation.channelClass,
    frozenBindingRequirements:Object.freeze([
      ...preparation.futureBindingRequirements,
    ]),
    validatedObservations,
    evidenceCount:validatedObservations.length,
    evidenceDisposition,
    resultingState:"delivery_binding_evidence_validated" as const,
    semantics:SEMANTICS,
  };

  const deliveryBindingEvidenceFingerprint=hash({
    purpose:"ugp_authority_outreach_delivery_binding_evidence_contract",
    ...base,
  });

  return Object.freeze({
    ...base,
    deliveryBindingEvidenceId:
      "uaodbe-"+deliveryBindingEvidenceFingerprint.slice(0,24),
    deliveryBindingEvidenceFingerprint,
  });
}

export function assertAuthorityOutreachDeliveryBindingEvidenceIntegrity(
  result:AuthorityOutreachDeliveryBindingEvidenceContract,
  input:Readonly<{
    deliveryBindingPreparation:
      AuthorityOutreachDeliveryBindingPreparationSpecification;
    deliveryBindingPreparationInput:
      AuthorityOutreachDeliveryBindingPreparationIntegrityInput;
    evidenceRequest:AuthorityOutreachDeliveryBindingEvidenceRequest;
  }>,
):void{
  if(
    !result
    ||result.version!==UGP_AUTHORITY_OUTREACH_DELIVERY_BINDING_EVIDENCE_VERSION
  ){
    throw new Error(
      "ugp_outreach_delivery_binding_evidence_version_invalid",
    );
  }

  const s=result.semantics;
  if(
    s.deterministic!==true
    ||s.exactDeliveryBindingPreparationSpecificationRequired!==true
    ||s.exactSelectedContactPointRequired!==true
    ||s.exactBindingRequirementSetRequired!==true
    ||s.suppliedBindingEvidenceValidationOnly!==true
    ||s.independentBindingVerificationPerformed!==false
    ||s.technicalEvidencePayloadIncluded!==false
    ||s.liveProviderIdentifierIncluded!==false
    ||s.senderMailboxIdentifierIncluded!==false
    ||s.providerCredentialIncluded!==false
    ||s.providerCredentialReferenceIncluded!==false
    ||s.providerCredentialActivationAuthorized!==false
    ||s.submissionMechanismReferenceIncluded!==false
    ||s.providerBindingAuthorized!==false
    ||s.providerBindingPerformed!==false
    ||s.mailboxBindingAuthorized!==false
    ||s.mailboxBindingPerformed!==false
    ||s.mailboxAccessAuthorized!==false
    ||s.mailboxProbeAuthorized!==false
    ||s.mailboxProbePerformed!==false
    ||s.webSubmissionExecutionAuthorized!==false
    ||s.webSubmissionExecutionPerformed!==false
    ||s.messageTransmissionAuthorized!==false
    ||s.messageTransmissionPerformed!==false
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
      "ugp_outreach_delivery_binding_evidence_unsafe_semantics",
    );
  }

  const expected=buildAuthorityOutreachDeliveryBindingEvidenceContract(input);
  if(stableJson(expected)!==stableJson(result)){
    throw new Error(
      "ugp_outreach_delivery_binding_evidence_integrity_mismatch",
    );
  }
}
