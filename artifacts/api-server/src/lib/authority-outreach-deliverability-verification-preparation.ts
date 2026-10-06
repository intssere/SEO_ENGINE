import { createHash } from "node:crypto";
import {
  assertAuthorityOutreachHumanPolicyConsentDecisionIntegrity,
  type AuthorityOutreachHumanPolicyConsentDecisionRecord,
  type AuthorityOutreachPolicyConsentReviewContactPoint,
} from "./authority-outreach-human-policy-consent-decision.js";

export const UGP_AUTHORITY_OUTREACH_DELIVERABILITY_VERIFICATION_PREPARATION_VERSION =
  "ugp-10-19-deliverability-verification-preparation-v1" as const;

export type AuthorityOutreachDeliverabilityVerificationMethodClass =
  | "email_domain_mail_exchange_presence"
  | "email_external_deliverability_assessment"
  | "web_form_https_reachability"
  | "web_form_presence_assessment";

export type AuthorityOutreachDeliverabilityVerificationPreparationRequest =
  Readonly<{
    policyConsentDecisionFingerprint: string;
    selectedContactPointFingerprint: string;
    selectedRoleCandidateFingerprint: string;
    candidateFingerprint: string;
  }>;

export type AuthorityOutreachHumanPolicyConsentDecisionIntegrityInput =
  Parameters<
    typeof assertAuthorityOutreachHumanPolicyConsentDecisionIntegrity
  >[1];

export type AuthorityOutreachDeliverabilityVerificationPreparationContract =
  Readonly<{
    version:
      typeof UGP_AUTHORITY_OUTREACH_DELIVERABILITY_VERIFICATION_PREPARATION_VERSION;
    deliverabilityPreparationId: string;
    deliverabilityPreparationFingerprint: string;
    policyConsentDecisionId: string;
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
    selectedContactPoint:
      AuthorityOutreachPolicyConsentReviewContactPoint;
    selectedContactPointFingerprint: string;
    allowedVerificationMethodClasses:
      readonly AuthorityOutreachDeliverabilityVerificationMethodClass[];
    preparationPolicy: Readonly<{
      exactSelectedContactPointRequired: true;
      publicBusinessContactOnly: true;
      maxVerificationMethodClasses: 2;
      technicalEvidenceFingerprintRequired: true;
      verificationObservationTimestampRequired: true;
      deterministicResultRequired: true;
      providerCredentialReferenceAllowed: false;
      mailboxIdentifierAllowed: false;
      verificationExecutionAllowed: false;
      verificationProviderCallAllowed: false;
      mailboxProbeAllowed: false;
      messageTransmissionAllowed: false;
    }>;
    resultingState:
      "deliverability_verification_preparation_spec_ready";
    semantics: Readonly<{
      deterministic: true;
      exactHumanPolicyConsentDecisionRequired: true;
      exactSelectedContactPointRequired: true;
      deliverabilityVerificationPreparationSpecificationOnly: true;
      selectedContactPointFrozen: true;
      actualVerificationResultIncluded: false;
      deliverabilityVerificationAuthorized: false;
      deliverabilityVerificationPerformed: false;
      domainResolutionAuthorized: false;
      mailExchangeLookupAuthorized: false;
      endpointReachabilityCheckAuthorized: false;
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

const PREPARATION_POLICY=Object.freeze({
  exactSelectedContactPointRequired:true as const,
  publicBusinessContactOnly:true as const,
  maxVerificationMethodClasses:2 as const,
  technicalEvidenceFingerprintRequired:true as const,
  verificationObservationTimestampRequired:true as const,
  deterministicResultRequired:true as const,
  providerCredentialReferenceAllowed:false as const,
  mailboxIdentifierAllowed:false as const,
  verificationExecutionAllowed:false as const,
  verificationProviderCallAllowed:false as const,
  mailboxProbeAllowed:false as const,
  messageTransmissionAllowed:false as const,
});

const SEMANTICS=Object.freeze({
  deterministic:true as const,
  exactHumanPolicyConsentDecisionRequired:true as const,
  exactSelectedContactPointRequired:true as const,
  deliverabilityVerificationPreparationSpecificationOnly:true as const,
  selectedContactPointFrozen:true as const,
  actualVerificationResultIncluded:false as const,
  deliverabilityVerificationAuthorized:false as const,
  deliverabilityVerificationPerformed:false as const,
  domainResolutionAuthorized:false as const,
  mailExchangeLookupAuthorized:false as const,
  endpointReachabilityCheckAuthorized:false as const,
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
      "ugp_outreach_deliverability_preparation_invalid_"+field,
    );
  }
  return value;
}

function freezeContactPoint(
  contactPoint:AuthorityOutreachPolicyConsentReviewContactPoint,
):AuthorityOutreachPolicyConsentReviewContactPoint{
  return Object.freeze({...contactPoint});
}

function verificationMethodClasses(
  contactPoint:AuthorityOutreachPolicyConsentReviewContactPoint,
):readonly AuthorityOutreachDeliverabilityVerificationMethodClass[]{
  if(contactPoint.contactPointType==="email_address"){
    return Object.freeze([
      "email_domain_mail_exchange_presence",
      "email_external_deliverability_assessment",
    ] as const);
  }
  if(contactPoint.contactPointType==="web_contact_form"){
    return Object.freeze([
      "web_form_https_reachability",
      "web_form_presence_assessment",
    ] as const);
  }
  throw new Error(
    "ugp_outreach_deliverability_preparation_contact_point_type_invalid",
  );
}

export function buildAuthorityOutreachDeliverabilityVerificationPreparation(
  input:Readonly<{
    policyConsentDecision:
      AuthorityOutreachHumanPolicyConsentDecisionRecord;
    policyConsentDecisionInput:
      AuthorityOutreachHumanPolicyConsentDecisionIntegrityInput;
    preparationRequest:
      AuthorityOutreachDeliverabilityVerificationPreparationRequest;
  }>,
):AuthorityOutreachDeliverabilityVerificationPreparationContract{
  if(!input||typeof input!=="object"||Array.isArray(input)){
    throw new Error(
      "ugp_outreach_deliverability_preparation_invalid_input",
    );
  }

  assertAuthorityOutreachHumanPolicyConsentDecisionIntegrity(
    input.policyConsentDecision,
    input.policyConsentDecisionInput,
  );

  const decision=input.policyConsentDecision;
  if(
    decision.decision
      !=="approve_for_deliverability_verification_preparation"
    ||decision.resultingState
      !=="deliverability_verification_preparation_eligible"
    ||decision.selectedContactPoint===null
    ||decision.selectedContactPointFingerprint===null
    ||decision.semantics.eligibilityOnly!==true
    ||decision.semantics.policyConsentApprovalGranted!==true
    ||decision.semantics
      .deliverabilityVerificationPreparationEligibilityGranted!==true
    ||decision.semantics.deliverabilityVerificationPreparationExecuted!==false
    ||decision.semantics.deliverabilityVerificationAuthorized!==false
    ||decision.semantics.verificationProviderCallAuthorized!==false
    ||decision.semantics.sendAuthorizationGranted!==false
  ){
    throw new Error(
      "ugp_outreach_deliverability_preparation_eligible_decision_required",
    );
  }

  const request=input.preparationRequest;
  const policyConsentDecisionFingerprint=fingerprint(
    request.policyConsentDecisionFingerprint,
    "policy_consent_decision_fingerprint",
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
    policyConsentDecisionFingerprint
      !==decision.policyConsentDecisionFingerprint
    ||selectedContactPointFingerprint
      !==decision.selectedContactPointFingerprint
    ||selectedRoleCandidateFingerprint
      !==decision.selectedRoleCandidateFingerprint
    ||candidateFingerprint!==decision.candidateFingerprint
  ){
    throw new Error(
      "ugp_outreach_deliverability_preparation_stale_lineage",
    );
  }

  const selectedContactPoint=freezeContactPoint(
    decision.selectedContactPoint,
  );
  const allowedVerificationMethodClasses=
    verificationMethodClasses(selectedContactPoint);

  const base={
    version:
      UGP_AUTHORITY_OUTREACH_DELIVERABILITY_VERIFICATION_PREPARATION_VERSION,
    policyConsentDecisionId:decision.policyConsentDecisionId,
    policyConsentDecisionFingerprint:
      decision.policyConsentDecisionFingerprint,
    policyConsentReviewSpecFingerprint:
      decision.policyConsentReviewSpecFingerprint,
    contactPointEvidenceFingerprint:
      decision.contactPointEvidenceFingerprint,
    contactVerificationSpecFingerprint:
      decision.contactVerificationSpecFingerprint,
    selectionDecisionFingerprint:decision.selectionDecisionFingerprint,
    selectionReviewSpecFingerprint:decision.selectionReviewSpecFingerprint,
    researchEvidenceFingerprint:decision.researchEvidenceFingerprint,
    researchSpecFingerprint:decision.researchSpecFingerprint,
    deliveryPreparationFingerprint:
      decision.deliveryPreparationFingerprint,
    sendReviewFingerprint:decision.sendReviewFingerprint,
    qualityGateFingerprint:decision.qualityGateFingerprint,
    requestId:decision.requestId,
    requestFingerprint:decision.requestFingerprint,
    candidateFingerprint:decision.candidateFingerprint,
    mechanicalValidationFingerprint:
      decision.mechanicalValidationFingerprint,
    prospectFingerprint:decision.prospectFingerprint,
    opportunityFingerprint:decision.opportunityFingerprint,
    approvalReviewFingerprint:decision.approvalReviewFingerprint,
    sourceDomain:decision.sourceDomain,
    sourceUrl:decision.sourceUrl,
    targetDomain:decision.targetDomain,
    targetUrl:decision.targetUrl,
    selectedRoleCandidateFingerprint:
      decision.selectedRoleCandidateFingerprint,
    selectedContactPoint,
    selectedContactPointFingerprint:
      decision.selectedContactPointFingerprint,
    allowedVerificationMethodClasses,
    preparationPolicy:PREPARATION_POLICY,
    resultingState:
      "deliverability_verification_preparation_spec_ready" as const,
    semantics:SEMANTICS,
  };

  const deliverabilityPreparationFingerprint=hash({
    purpose:
      "ugp_authority_outreach_deliverability_verification_preparation",
    ...base,
  });

  return Object.freeze({
    ...base,
    deliverabilityPreparationId:
      "uaodvp-"+deliverabilityPreparationFingerprint.slice(0,24),
    deliverabilityPreparationFingerprint,
  });
}

export function assertAuthorityOutreachDeliverabilityPreparationIntegrity(
  result:AuthorityOutreachDeliverabilityVerificationPreparationContract,
  input:Readonly<{
    policyConsentDecision:
      AuthorityOutreachHumanPolicyConsentDecisionRecord;
    policyConsentDecisionInput:
      AuthorityOutreachHumanPolicyConsentDecisionIntegrityInput;
    preparationRequest:
      AuthorityOutreachDeliverabilityVerificationPreparationRequest;
  }>,
):void{
  if(
    !result
    ||result.version
      !==UGP_AUTHORITY_OUTREACH_DELIVERABILITY_VERIFICATION_PREPARATION_VERSION
  ){
    throw new Error(
      "ugp_outreach_deliverability_preparation_version_invalid",
    );
  }

  const p=result.preparationPolicy;
  if(
    p.exactSelectedContactPointRequired!==true
    ||p.publicBusinessContactOnly!==true
    ||p.maxVerificationMethodClasses!==2
    ||p.technicalEvidenceFingerprintRequired!==true
    ||p.verificationObservationTimestampRequired!==true
    ||p.deterministicResultRequired!==true
    ||p.providerCredentialReferenceAllowed!==false
    ||p.mailboxIdentifierAllowed!==false
    ||p.verificationExecutionAllowed!==false
    ||p.verificationProviderCallAllowed!==false
    ||p.mailboxProbeAllowed!==false
    ||p.messageTransmissionAllowed!==false
  ){
    throw new Error(
      "ugp_outreach_deliverability_preparation_unsafe_policy",
    );
  }

  const s=result.semantics;
  if(
    s.deterministic!==true
    ||s.exactHumanPolicyConsentDecisionRequired!==true
    ||s.exactSelectedContactPointRequired!==true
    ||s.deliverabilityVerificationPreparationSpecificationOnly!==true
    ||s.selectedContactPointFrozen!==true
    ||s.actualVerificationResultIncluded!==false
    ||s.deliverabilityVerificationAuthorized!==false
    ||s.deliverabilityVerificationPerformed!==false
    ||s.domainResolutionAuthorized!==false
    ||s.mailExchangeLookupAuthorized!==false
    ||s.endpointReachabilityCheckAuthorized!==false
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
      "ugp_outreach_deliverability_preparation_unsafe_semantics",
    );
  }

  const expected=
    buildAuthorityOutreachDeliverabilityVerificationPreparation(input);
  if(stableJson(expected)!==stableJson(result)){
    throw new Error(
      "ugp_outreach_deliverability_preparation_integrity_mismatch",
    );
  }
}
