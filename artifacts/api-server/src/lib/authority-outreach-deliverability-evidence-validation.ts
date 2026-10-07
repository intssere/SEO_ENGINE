import { createHash } from "node:crypto";
import {
  assertAuthorityOutreachDeliverabilityPreparationIntegrity,
  type AuthorityOutreachDeliverabilityVerificationMethodClass,
  type AuthorityOutreachDeliverabilityVerificationPreparationContract,
} from "./authority-outreach-deliverability-verification-preparation.js";

export const UGP_AUTHORITY_OUTREACH_DELIVERABILITY_EVIDENCE_VERSION =
  "ugp-10-20-supplied-deliverability-evidence-validation-v1" as const;

export type AuthorityOutreachDeliverabilityEvidenceObservationOutcome =
  | "supports_reachability"
  | "contradicts_reachability"
  | "inconclusive";

export type AuthorityOutreachDeliverabilityEvidenceDisposition =
  | "deliverability_evidence_supporting"
  | "deliverability_evidence_contradictory"
  | "deliverability_evidence_inconclusive";

export type AuthorityOutreachSuppliedDeliverabilityEvidenceObservation =
  Readonly<{
    methodClass: AuthorityOutreachDeliverabilityVerificationMethodClass;
    observationOutcome:
      AuthorityOutreachDeliverabilityEvidenceObservationOutcome;
    observedAt: string;
    technicalEvidenceFingerprint: string;
    publicBusinessTechnicalEvidenceAttested: true;
  }>;

export type AuthorityOutreachDeliverabilityEvidenceRequest = Readonly<{
  deliverabilityPreparationFingerprint: string;
  selectedContactPointFingerprint: string;
  selectedRoleCandidateFingerprint: string;
  candidateFingerprint: string;
  observations:
    readonly AuthorityOutreachSuppliedDeliverabilityEvidenceObservation[];
}>;

export type AuthorityOutreachDeliverabilityPreparationIntegrityInput =
  Parameters<
    typeof assertAuthorityOutreachDeliverabilityPreparationIntegrity
  >[1];

export type AuthorityOutreachValidatedDeliverabilityEvidenceObservation =
  Readonly<{
    observationId: string;
    observationFingerprint: string;
    methodClass: AuthorityOutreachDeliverabilityVerificationMethodClass;
    observationOutcome:
      AuthorityOutreachDeliverabilityEvidenceObservationOutcome;
    observedAt: string;
    technicalEvidenceFingerprint: string;
    publicBusinessTechnicalEvidenceAttested: true;
  }>;

export type AuthorityOutreachDeliverabilityEvidenceContract = Readonly<{
  version: typeof UGP_AUTHORITY_OUTREACH_DELIVERABILITY_EVIDENCE_VERSION;
  deliverabilityEvidenceId: string;
  deliverabilityEvidenceFingerprint: string;
  deliverabilityPreparationId: string;
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
  verificationMethodClasses:
    readonly AuthorityOutreachDeliverabilityVerificationMethodClass[];
  validatedObservations:
    readonly AuthorityOutreachValidatedDeliverabilityEvidenceObservation[];
  evidenceCount: number;
  evidenceDisposition: AuthorityOutreachDeliverabilityEvidenceDisposition;
  resultingState: "deliverability_verification_evidence_validated";
  semantics: Readonly<{
    deterministic: true;
    exactDeliverabilityPreparationRequired: true;
    exactSelectedContactPointRequired: true;
    exactVerificationMethodSetRequired: true;
    suppliedTechnicalEvidenceValidationOnly: true;
    independentTechnicalVerificationPerformed: false;
    technicalEvidencePayloadIncluded: false;
    domainResolutionAuthorized: false;
    domainResolutionPerformed: false;
    mailExchangeLookupAuthorized: false;
    mailExchangeLookupPerformed: false;
    endpointReachabilityCheckAuthorized: false;
    endpointReachabilityCheckPerformed: false;
    verificationProviderCallAuthorized: false;
    verificationProviderCallPerformed: false;
    mailboxProbeAuthorized: false;
    mailboxProbePerformed: false;
    mailboxAccessAuthorized: false;
    providerBindingAuthorized: false;
    providerCredentialIncluded: false;
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

const OUTCOMES=new Set<AuthorityOutreachDeliverabilityEvidenceObservationOutcome>([
  "supports_reachability",
  "contradicts_reachability",
  "inconclusive",
]);

const SEMANTICS=Object.freeze({
  deterministic:true as const,
  exactDeliverabilityPreparationRequired:true as const,
  exactSelectedContactPointRequired:true as const,
  exactVerificationMethodSetRequired:true as const,
  suppliedTechnicalEvidenceValidationOnly:true as const,
  independentTechnicalVerificationPerformed:false as const,
  technicalEvidencePayloadIncluded:false as const,
  domainResolutionAuthorized:false as const,
  domainResolutionPerformed:false as const,
  mailExchangeLookupAuthorized:false as const,
  mailExchangeLookupPerformed:false as const,
  endpointReachabilityCheckAuthorized:false as const,
  endpointReachabilityCheckPerformed:false as const,
  verificationProviderCallAuthorized:false as const,
  verificationProviderCallPerformed:false as const,
  mailboxProbeAuthorized:false as const,
  mailboxProbePerformed:false as const,
  mailboxAccessAuthorized:false as const,
  providerBindingAuthorized:false as const,
  providerCredentialIncluded:false as const,
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
      "ugp_outreach_deliverability_evidence_invalid_"+field,
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
      "ugp_outreach_deliverability_evidence_invalid_observed_at",
    );
  }
  return value;
}

function normalizeObservation(
  observation:AuthorityOutreachSuppliedDeliverabilityEvidenceObservation,
  preparation:AuthorityOutreachDeliverabilityVerificationPreparationContract,
):AuthorityOutreachValidatedDeliverabilityEvidenceObservation{
  if(!observation||typeof observation!=="object"||Array.isArray(observation)){
    throw new Error(
      "ugp_outreach_deliverability_evidence_invalid_observation",
    );
  }
  if(observation.publicBusinessTechnicalEvidenceAttested!==true){
    throw new Error(
      "ugp_outreach_deliverability_evidence_attestation_required",
    );
  }
  if(
    !preparation.allowedVerificationMethodClasses.includes(
      observation.methodClass,
    )
  ){
    throw new Error(
      "ugp_outreach_deliverability_evidence_method_not_allowed",
    );
  }
  if(!OUTCOMES.has(observation.observationOutcome)){
    throw new Error(
      "ugp_outreach_deliverability_evidence_outcome_invalid",
    );
  }

  const observedAt=canonicalObservedAt(observation.observedAt);
  const technicalEvidenceFingerprint=fingerprint(
    observation.technicalEvidenceFingerprint,
    "technical_evidence_fingerprint",
  );
  const normalized={
    methodClass:observation.methodClass,
    observationOutcome:observation.observationOutcome,
    observedAt,
    technicalEvidenceFingerprint,
    publicBusinessTechnicalEvidenceAttested:true as const,
  };
  const observationFingerprint=hash({
    purpose:"ugp_authority_outreach_supplied_deliverability_evidence_observation",
    deliverabilityPreparationFingerprint:
      preparation.deliverabilityPreparationFingerprint,
    selectedContactPointFingerprint:
      preparation.selectedContactPointFingerprint,
    ...normalized,
  });

  return Object.freeze({
    observationId:"uaodveo-"+observationFingerprint.slice(0,24),
    observationFingerprint,
    ...normalized,
  });
}

function normalizeObservations(
  observations:unknown,
  preparation:AuthorityOutreachDeliverabilityVerificationPreparationContract,
):readonly AuthorityOutreachValidatedDeliverabilityEvidenceObservation[]{
  if(!Array.isArray(observations)){
    throw new Error(
      "ugp_outreach_deliverability_evidence_observations_required",
    );
  }

  const expected=preparation.allowedVerificationMethodClasses;
  if(observations.length!==expected.length){
    throw new Error(
      "ugp_outreach_deliverability_evidence_complete_method_set_required",
    );
  }

  const normalized=observations.map(item=>normalizeObservation(
    item as AuthorityOutreachSuppliedDeliverabilityEvidenceObservation,
    preparation,
  ));
  const methodClasses=new Set<string>();
  const evidenceFingerprints=new Set<string>();

  for(const item of normalized){
    if(methodClasses.has(item.methodClass)){
      throw new Error(
        "ugp_outreach_deliverability_evidence_duplicate_method",
      );
    }
    if(evidenceFingerprints.has(item.technicalEvidenceFingerprint)){
      throw new Error(
        "ugp_outreach_deliverability_evidence_duplicate_technical_evidence",
      );
    }
    methodClasses.add(item.methodClass);
    evidenceFingerprints.add(item.technicalEvidenceFingerprint);
  }

  for(const methodClass of expected){
    if(!methodClasses.has(methodClass)){
      throw new Error(
        "ugp_outreach_deliverability_evidence_complete_method_set_required",
      );
    }
  }

  return Object.freeze(
    normalized.sort((a,b)=>a.methodClass.localeCompare(b.methodClass)),
  );
}

function disposition(
  observations:
    readonly AuthorityOutreachValidatedDeliverabilityEvidenceObservation[],
):AuthorityOutreachDeliverabilityEvidenceDisposition{
  if(
    observations.some(
      item=>item.observationOutcome==="contradicts_reachability",
    )
  ){
    return "deliverability_evidence_contradictory";
  }
  if(
    observations.every(
      item=>item.observationOutcome==="supports_reachability",
    )
  ){
    return "deliverability_evidence_supporting";
  }
  return "deliverability_evidence_inconclusive";
}

export function buildAuthorityOutreachDeliverabilityEvidenceContract(
  input:Readonly<{
    deliverabilityPreparation:
      AuthorityOutreachDeliverabilityVerificationPreparationContract;
    deliverabilityPreparationInput:
      AuthorityOutreachDeliverabilityPreparationIntegrityInput;
    evidenceRequest:AuthorityOutreachDeliverabilityEvidenceRequest;
  }>,
):AuthorityOutreachDeliverabilityEvidenceContract{
  if(!input||typeof input!=="object"||Array.isArray(input)){
    throw new Error(
      "ugp_outreach_deliverability_evidence_invalid_input",
    );
  }

  assertAuthorityOutreachDeliverabilityPreparationIntegrity(
    input.deliverabilityPreparation,
    input.deliverabilityPreparationInput,
  );

  const preparation=input.deliverabilityPreparation;
  if(
    preparation.resultingState
      !=="deliverability_verification_preparation_spec_ready"
    ||preparation.semantics
      .deliverabilityVerificationPreparationSpecificationOnly!==true
    ||preparation.semantics.deliverabilityVerificationAuthorized!==false
    ||preparation.semantics.verificationProviderCallAuthorized!==false
    ||preparation.semantics.sendAuthorizationGranted!==false
  ){
    throw new Error(
      "ugp_outreach_deliverability_evidence_preparation_required",
    );
  }

  const request=input.evidenceRequest;
  const deliverabilityPreparationFingerprint=fingerprint(
    request.deliverabilityPreparationFingerprint,
    "deliverability_preparation_fingerprint",
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
    deliverabilityPreparationFingerprint
      !==preparation.deliverabilityPreparationFingerprint
    ||selectedContactPointFingerprint
      !==preparation.selectedContactPointFingerprint
    ||selectedRoleCandidateFingerprint
      !==preparation.selectedRoleCandidateFingerprint
    ||candidateFingerprint!==preparation.candidateFingerprint
  ){
    throw new Error(
      "ugp_outreach_deliverability_evidence_stale_lineage",
    );
  }

  const validatedObservations=normalizeObservations(
    request.observations,
    preparation,
  );
  const evidenceDisposition=disposition(validatedObservations);

  const base={
    version:UGP_AUTHORITY_OUTREACH_DELIVERABILITY_EVIDENCE_VERSION,
    deliverabilityPreparationId:preparation.deliverabilityPreparationId,
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
    selectionDecisionFingerprint:preparation.selectionDecisionFingerprint,
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
    verificationMethodClasses:Object.freeze(
      [...preparation.allowedVerificationMethodClasses],
    ),
    validatedObservations,
    evidenceCount:validatedObservations.length,
    evidenceDisposition,
    resultingState:"deliverability_verification_evidence_validated" as const,
    semantics:SEMANTICS,
  };

  const deliverabilityEvidenceFingerprint=hash({
    purpose:"ugp_authority_outreach_deliverability_evidence_contract",
    ...base,
  });

  return Object.freeze({
    ...base,
    deliverabilityEvidenceId:
      "uaodve-"+deliverabilityEvidenceFingerprint.slice(0,24),
    deliverabilityEvidenceFingerprint,
  });
}

export function assertAuthorityOutreachDeliverabilityEvidenceIntegrity(
  result:AuthorityOutreachDeliverabilityEvidenceContract,
  input:Readonly<{
    deliverabilityPreparation:
      AuthorityOutreachDeliverabilityVerificationPreparationContract;
    deliverabilityPreparationInput:
      AuthorityOutreachDeliverabilityPreparationIntegrityInput;
    evidenceRequest:AuthorityOutreachDeliverabilityEvidenceRequest;
  }>,
):void{
  if(
    !result
    ||result.version!==UGP_AUTHORITY_OUTREACH_DELIVERABILITY_EVIDENCE_VERSION
  ){
    throw new Error(
      "ugp_outreach_deliverability_evidence_version_invalid",
    );
  }

  const s=result.semantics;
  if(
    s.deterministic!==true
    ||s.exactDeliverabilityPreparationRequired!==true
    ||s.exactSelectedContactPointRequired!==true
    ||s.exactVerificationMethodSetRequired!==true
    ||s.suppliedTechnicalEvidenceValidationOnly!==true
    ||s.independentTechnicalVerificationPerformed!==false
    ||s.technicalEvidencePayloadIncluded!==false
    ||s.domainResolutionAuthorized!==false
    ||s.domainResolutionPerformed!==false
    ||s.mailExchangeLookupAuthorized!==false
    ||s.mailExchangeLookupPerformed!==false
    ||s.endpointReachabilityCheckAuthorized!==false
    ||s.endpointReachabilityCheckPerformed!==false
    ||s.verificationProviderCallAuthorized!==false
    ||s.verificationProviderCallPerformed!==false
    ||s.mailboxProbeAuthorized!==false
    ||s.mailboxProbePerformed!==false
    ||s.mailboxAccessAuthorized!==false
    ||s.providerBindingAuthorized!==false
    ||s.providerCredentialIncluded!==false
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
      "ugp_outreach_deliverability_evidence_unsafe_semantics",
    );
  }

  const expected=buildAuthorityOutreachDeliverabilityEvidenceContract(input);
  if(stableJson(expected)!==stableJson(result)){
    throw new Error(
      "ugp_outreach_deliverability_evidence_integrity_mismatch",
    );
  }
}
