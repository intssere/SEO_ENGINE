import { createHash } from "node:crypto";
import {
  assertAuthorityOutreachDeliveryPreparationIntegrity,
  type AuthorityOutreachDeliveryPreparationContract,
  type AuthorityOutreachDeliveryChannelType,
  type AuthorityOutreachRecipientRoleCriterion,
} from "./authority-outreach-delivery-preparation.js";

export const UGP_AUTHORITY_OUTREACH_RECIPIENT_RESEARCH_SPEC_VERSION =
  "ugp-10-11-recipient-research-specification-v1" as const;

export type AuthorityOutreachRecipientResearchEvidenceSourceClass =
  | "source_domain_staff_or_team_page"
  | "source_domain_author_or_editor_page"
  | "source_domain_contact_or_editorial_page"
  | "official_organization_profile";

export type AuthorityOutreachRecipientResearchRequest = Readonly<{
  preparationFingerprint: string;
  candidateFingerprint: string;
  allowedEvidenceSourceClasses:
    readonly AuthorityOutreachRecipientResearchEvidenceSourceClass[];
}>;

export type AuthorityOutreachDeliveryPreparationIntegrityInput =
  Parameters<typeof assertAuthorityOutreachDeliveryPreparationIntegrity>[1];

export type AuthorityOutreachRecipientResearchSpecification = Readonly<{
  version: typeof UGP_AUTHORITY_OUTREACH_RECIPIENT_RESEARCH_SPEC_VERSION;
  researchSpecId: string;
  researchSpecFingerprint: string;
  deliveryPreparationId: string;
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
  requiredRecipientRoleCriteria:
    readonly AuthorityOutreachRecipientRoleCriterion[];
  allowedDeliveryChannelTypes:
    readonly AuthorityOutreachDeliveryChannelType[];
  allowedEvidenceSourceClasses:
    readonly AuthorityOutreachRecipientResearchEvidenceSourceClass[];
  candidateResearchPolicy: Readonly<{
    maxRoleCandidates: 5;
    publicBusinessIdentityOnly: true;
    exactRoleEvidenceRequired: true;
    publicSourceReferenceRequired: true;
    evidenceObservationTimestampRequired: true;
    sourceDomainRelationshipRequired: true;
    privateOrBrokeredPersonalDataAllowed: false;
    contactAddressCollectionAllowed: false;
    recipientSelectionAllowed: false;
  }>;
  resultingState: "recipient_research_spec_ready";
  semantics: Readonly<{
    deterministic: true;
    exactDeliveryPreparationRequired: true;
    recipientResearchSpecificationOnly: true;
    recipientResearchAuthorized: false;
    recipientResearchExecuted: false;
    actualRecipientIncluded: false;
    recipientIdentityIncluded: false;
    recipientSelectionAuthorized: false;
    recipientSelectionPerformed: false;
    contactDiscoveryAuthorized: false;
    contactDiscoveryPerformed: false;
    contactAddressIncluded: false;
    emailVerificationAuthorized: false;
    mailboxAccessAuthorized: false;
    providerBindingAuthorized: false;
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

const EVIDENCE_SOURCE_CLASSES=
  new Set<AuthorityOutreachRecipientResearchEvidenceSourceClass>([
    "source_domain_staff_or_team_page",
    "source_domain_author_or_editor_page",
    "source_domain_contact_or_editorial_page",
    "official_organization_profile",
  ]);

const CANDIDATE_RESEARCH_POLICY=Object.freeze({
  maxRoleCandidates:5 as const,
  publicBusinessIdentityOnly:true as const,
  exactRoleEvidenceRequired:true as const,
  publicSourceReferenceRequired:true as const,
  evidenceObservationTimestampRequired:true as const,
  sourceDomainRelationshipRequired:true as const,
  privateOrBrokeredPersonalDataAllowed:false as const,
  contactAddressCollectionAllowed:false as const,
  recipientSelectionAllowed:false as const,
});

const SEMANTICS=Object.freeze({
  deterministic:true as const,
  exactDeliveryPreparationRequired:true as const,
  recipientResearchSpecificationOnly:true as const,
  recipientResearchAuthorized:false as const,
  recipientResearchExecuted:false as const,
  actualRecipientIncluded:false as const,
  recipientIdentityIncluded:false as const,
  recipientSelectionAuthorized:false as const,
  recipientSelectionPerformed:false as const,
  contactDiscoveryAuthorized:false as const,
  contactDiscoveryPerformed:false as const,
  contactAddressIncluded:false as const,
  emailVerificationAuthorized:false as const,
  mailboxAccessAuthorized:false as const,
  providerBindingAuthorized:false as const,
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
    throw new Error("ugp_outreach_recipient_research_spec_invalid_"+field);
  }
  return value;
}

function normalizeEvidenceSourceClasses(
  values:unknown,
):readonly AuthorityOutreachRecipientResearchEvidenceSourceClass[]{
  if(!Array.isArray(values)||values.length===0){
    throw new Error(
      "ugp_outreach_recipient_research_spec_evidence_source_required",
    );
  }
  const seen=new Set<AuthorityOutreachRecipientResearchEvidenceSourceClass>();
  for(const value of values){
    if(
      typeof value!=="string"
      ||!EVIDENCE_SOURCE_CLASSES.has(
        value as AuthorityOutreachRecipientResearchEvidenceSourceClass,
      )
    ){
      throw new Error(
        "ugp_outreach_recipient_research_spec_evidence_source_invalid",
      );
    }
    const sourceClass=
      value as AuthorityOutreachRecipientResearchEvidenceSourceClass;
    if(seen.has(sourceClass)){
      throw new Error(
        "ugp_outreach_recipient_research_spec_evidence_source_duplicate",
      );
    }
    seen.add(sourceClass);
  }
  return Object.freeze(
    [...seen].sort() as AuthorityOutreachRecipientResearchEvidenceSourceClass[],
  );
}

export function buildAuthorityOutreachRecipientResearchSpecification(
  input:Readonly<{
    deliveryPreparation:AuthorityOutreachDeliveryPreparationContract;
    deliveryPreparationInput:AuthorityOutreachDeliveryPreparationIntegrityInput;
    researchRequest:AuthorityOutreachRecipientResearchRequest;
  }>,
):AuthorityOutreachRecipientResearchSpecification{
  if(!input||typeof input!=="object"||Array.isArray(input)){
    throw new Error("ugp_outreach_recipient_research_spec_invalid_input");
  }

  assertAuthorityOutreachDeliveryPreparationIntegrity(
    input.deliveryPreparation,
    input.deliveryPreparationInput,
  );

  if(
    input.deliveryPreparation.resultingState!=="delivery_preparation_spec_ready"
    ||input.deliveryPreparation.semantics.deliveryPreparationSpecificationOnly
      !==true
    ||input.deliveryPreparation.semantics.contactDiscoveryAuthorized!==false
    ||input.deliveryPreparation.semantics.sendAuthorizationGranted!==false
  ){
    throw new Error(
      "ugp_outreach_recipient_research_spec_preparation_required",
    );
  }

  const preparationFingerprint=fingerprint(
    input.researchRequest.preparationFingerprint,
    "preparation_fingerprint",
  );
  const candidateFingerprint=fingerprint(
    input.researchRequest.candidateFingerprint,
    "candidate_fingerprint",
  );
  if(
    preparationFingerprint
      !==input.deliveryPreparation.preparationFingerprint
    ||candidateFingerprint!==input.deliveryPreparation.candidateFingerprint
  ){
    throw new Error("ugp_outreach_recipient_research_spec_stale_lineage");
  }

  const allowedEvidenceSourceClasses=normalizeEvidenceSourceClasses(
    input.researchRequest.allowedEvidenceSourceClasses,
  );

  const base={
    version:UGP_AUTHORITY_OUTREACH_RECIPIENT_RESEARCH_SPEC_VERSION,
    deliveryPreparationId:input.deliveryPreparation.preparationId,
    deliveryPreparationFingerprint:
      input.deliveryPreparation.preparationFingerprint,
    sendReviewFingerprint:input.deliveryPreparation.sendReviewFingerprint,
    qualityGateFingerprint:input.deliveryPreparation.qualityGateFingerprint,
    requestId:input.deliveryPreparation.requestId,
    requestFingerprint:input.deliveryPreparation.requestFingerprint,
    candidateFingerprint:input.deliveryPreparation.candidateFingerprint,
    mechanicalValidationFingerprint:
      input.deliveryPreparation.mechanicalValidationFingerprint,
    prospectFingerprint:input.deliveryPreparation.prospectFingerprint,
    opportunityFingerprint:input.deliveryPreparation.opportunityFingerprint,
    approvalReviewFingerprint:
      input.deliveryPreparation.approvalReviewFingerprint,
    sourceDomain:input.deliveryPreparation.sourceDomain,
    sourceUrl:input.deliveryPreparation.sourceUrl,
    targetDomain:input.deliveryPreparation.targetDomain,
    targetUrl:input.deliveryPreparation.targetUrl,
    requiredRecipientRoleCriteria:
      input.deliveryPreparation.requiredRecipientRoleCriteria,
    allowedDeliveryChannelTypes:
      input.deliveryPreparation.allowedDeliveryChannelTypes,
    allowedEvidenceSourceClasses,
    candidateResearchPolicy:CANDIDATE_RESEARCH_POLICY,
    resultingState:"recipient_research_spec_ready" as const,
    semantics:SEMANTICS,
  };
  const researchSpecFingerprint=hash({
    purpose:"ugp_authority_outreach_recipient_research_specification",
    ...base,
  });

  return Object.freeze({
    ...base,
    researchSpecId:"uaorrs-"+researchSpecFingerprint.slice(0,24),
    researchSpecFingerprint,
  });
}

export function assertAuthorityOutreachRecipientResearchSpecificationIntegrity(
  result:AuthorityOutreachRecipientResearchSpecification,
  input:Readonly<{
    deliveryPreparation:AuthorityOutreachDeliveryPreparationContract;
    deliveryPreparationInput:AuthorityOutreachDeliveryPreparationIntegrityInput;
    researchRequest:AuthorityOutreachRecipientResearchRequest;
  }>,
):void{
  if(
    !result
    ||result.version!==UGP_AUTHORITY_OUTREACH_RECIPIENT_RESEARCH_SPEC_VERSION
  ){
    throw new Error(
      "ugp_outreach_recipient_research_spec_version_invalid",
    );
  }

  const p=result.candidateResearchPolicy;
  if(
    p.maxRoleCandidates!==5
    ||p.publicBusinessIdentityOnly!==true
    ||p.exactRoleEvidenceRequired!==true
    ||p.publicSourceReferenceRequired!==true
    ||p.evidenceObservationTimestampRequired!==true
    ||p.sourceDomainRelationshipRequired!==true
    ||p.privateOrBrokeredPersonalDataAllowed!==false
    ||p.contactAddressCollectionAllowed!==false
    ||p.recipientSelectionAllowed!==false
  ){
    throw new Error(
      "ugp_outreach_recipient_research_spec_unsafe_policy",
    );
  }

  const s=result.semantics;
  if(
    s.deterministic!==true
    ||s.exactDeliveryPreparationRequired!==true
    ||s.recipientResearchSpecificationOnly!==true
    ||s.recipientResearchAuthorized!==false
    ||s.recipientResearchExecuted!==false
    ||s.actualRecipientIncluded!==false
    ||s.recipientIdentityIncluded!==false
    ||s.recipientSelectionAuthorized!==false
    ||s.recipientSelectionPerformed!==false
    ||s.contactDiscoveryAuthorized!==false
    ||s.contactDiscoveryPerformed!==false
    ||s.contactAddressIncluded!==false
    ||s.emailVerificationAuthorized!==false
    ||s.mailboxAccessAuthorized!==false
    ||s.providerBindingAuthorized!==false
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
      "ugp_outreach_recipient_research_spec_unsafe_semantics",
    );
  }

  const expected=buildAuthorityOutreachRecipientResearchSpecification(input);
  if(stableJson(expected)!==stableJson(result)){
    throw new Error(
      "ugp_outreach_recipient_research_spec_integrity_mismatch",
    );
  }
}
