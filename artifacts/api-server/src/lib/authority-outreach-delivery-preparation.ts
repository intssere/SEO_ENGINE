import { createHash } from "node:crypto";
import {
  assertAuthorityOutreachHumanSendReviewIntegrity,
  type AuthorityOutreachHumanSendReviewRecord,
} from "./authority-outreach-human-send-review.js";

export const UGP_AUTHORITY_OUTREACH_DELIVERY_PREPARATION_VERSION =
  "ugp-10-10-delivery-preparation-contract-v1" as const;

export type AuthorityOutreachRecipientRoleCriterion =
  | "editorial_responsibility"
  | "resource_ownership_responsibility"
  | "partnerships_responsibility";

export type AuthorityOutreachDeliveryChannelType =
  | "email"
  | "web_contact_form";

export type AuthorityOutreachDeliveryFutureGate =
  | "recipient_research"
  | "recipient_selection"
  | "contact_address_verification"
  | "policy_and_consent_review"
  | "recipient_human_approval"
  | "mailbox_or_provider_binding"
  | "send_authorization"
  | "transmission"
  | "follow_up_scheduling";

export type AuthorityOutreachDeliveryPreparationRequest = Readonly<{
  sendReviewFingerprint: string;
  candidateFingerprint: string;
  requiredRecipientRoleCriteria:
    readonly AuthorityOutreachRecipientRoleCriterion[];
  allowedDeliveryChannelTypes:
    readonly AuthorityOutreachDeliveryChannelType[];
}>;

type AuthorityOutreachHumanSendReviewIntegrityInput =
  Parameters<typeof assertAuthorityOutreachHumanSendReviewIntegrity>[1];

export type AuthorityOutreachDeliveryPreparationContract = Readonly<{
  version: typeof UGP_AUTHORITY_OUTREACH_DELIVERY_PREPARATION_VERSION;
  preparationId: string;
  preparationFingerprint: string;
  sendReviewId: string;
  sendReviewFingerprint: string;
  decisionRequestFingerprint: string;
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
  requiredFutureGates: readonly AuthorityOutreachDeliveryFutureGate[];
  resultingState: "delivery_preparation_spec_ready";
  semantics: Readonly<{
    deterministic: true;
    exactHumanSendReviewRequired: true;
    exactValidatedCandidateRequired: true;
    deliveryPreparationSpecificationOnly: true;
    recipientRoleCriteriaOnly: true;
    deliveryChannelTypesOnly: true;
    actualRecipientIncluded: false;
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

const ROLE_CRITERIA=new Set<AuthorityOutreachRecipientRoleCriterion>([
  "editorial_responsibility",
  "resource_ownership_responsibility",
  "partnerships_responsibility",
]);

const CHANNEL_TYPES=new Set<AuthorityOutreachDeliveryChannelType>([
  "email",
  "web_contact_form",
]);

const REQUIRED_FUTURE_GATES=Object.freeze([
  "recipient_research",
  "recipient_selection",
  "contact_address_verification",
  "policy_and_consent_review",
  "recipient_human_approval",
  "mailbox_or_provider_binding",
  "send_authorization",
  "transmission",
  "follow_up_scheduling",
] as const satisfies readonly AuthorityOutreachDeliveryFutureGate[]);

const SEMANTICS=Object.freeze({
  deterministic:true as const,
  exactHumanSendReviewRequired:true as const,
  exactValidatedCandidateRequired:true as const,
  deliveryPreparationSpecificationOnly:true as const,
  recipientRoleCriteriaOnly:true as const,
  deliveryChannelTypesOnly:true as const,
  actualRecipientIncluded:false as const,
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
    throw new Error("ugp_outreach_delivery_preparation_invalid_"+field);
  }
  return value;
}

function normalizeRoleCriteria(
  values:unknown,
):readonly AuthorityOutreachRecipientRoleCriterion[]{
  if(!Array.isArray(values)||values.length===0){
    throw new Error(
      "ugp_outreach_delivery_preparation_recipient_role_criteria_required",
    );
  }
  const seen=new Set<AuthorityOutreachRecipientRoleCriterion>();
  for(const value of values){
    if(typeof value!=="string"||!ROLE_CRITERIA.has(
      value as AuthorityOutreachRecipientRoleCriterion,
    )){
      throw new Error(
        "ugp_outreach_delivery_preparation_recipient_role_criterion_invalid",
      );
    }
    const role=value as AuthorityOutreachRecipientRoleCriterion;
    if(seen.has(role)){
      throw new Error(
        "ugp_outreach_delivery_preparation_recipient_role_criterion_duplicate",
      );
    }
    seen.add(role);
  }
  return Object.freeze(
    [...seen].sort() as AuthorityOutreachRecipientRoleCriterion[],
  );
}

function normalizeChannelTypes(
  values:unknown,
):readonly AuthorityOutreachDeliveryChannelType[]{
  if(!Array.isArray(values)||values.length===0){
    throw new Error(
      "ugp_outreach_delivery_preparation_delivery_channel_type_required",
    );
  }
  const seen=new Set<AuthorityOutreachDeliveryChannelType>();
  for(const value of values){
    if(typeof value!=="string"||!CHANNEL_TYPES.has(
      value as AuthorityOutreachDeliveryChannelType,
    )){
      throw new Error(
        "ugp_outreach_delivery_preparation_delivery_channel_type_invalid",
      );
    }
    const channel=value as AuthorityOutreachDeliveryChannelType;
    if(seen.has(channel)){
      throw new Error(
        "ugp_outreach_delivery_preparation_delivery_channel_type_duplicate",
      );
    }
    seen.add(channel);
  }
  return Object.freeze(
    [...seen].sort() as AuthorityOutreachDeliveryChannelType[],
  );
}

export function buildAuthorityOutreachDeliveryPreparationContract(
  input:Readonly<{
    sendReview:AuthorityOutreachHumanSendReviewRecord;
    sendReviewInput:AuthorityOutreachHumanSendReviewIntegrityInput;
    preparationRequest:AuthorityOutreachDeliveryPreparationRequest;
  }>,
):AuthorityOutreachDeliveryPreparationContract{
  if(!input||typeof input!=="object"||Array.isArray(input)){
    throw new Error("ugp_outreach_delivery_preparation_invalid_input");
  }

  assertAuthorityOutreachHumanSendReviewIntegrity(
    input.sendReview,
    input.sendReviewInput,
  );

  if(
    input.sendReview.decision!=="approved_for_delivery_preparation"
    ||input.sendReview.resultingState!=="delivery_preparation_eligible"
    ||input.sendReview.semantics.eligibilityOnly!==true
    ||input.sendReview.semantics.sendAuthorizationGranted!==false
  ){
    throw new Error(
      "ugp_outreach_delivery_preparation_eligible_review_required",
    );
  }

  const request=input.preparationRequest;
  const sendReviewFingerprint=fingerprint(
    request.sendReviewFingerprint,
    "send_review_fingerprint",
  );
  const candidateFingerprint=fingerprint(
    request.candidateFingerprint,
    "candidate_fingerprint",
  );
  if(
    sendReviewFingerprint!==input.sendReview.reviewFingerprint
    ||candidateFingerprint!==input.sendReview.candidateFingerprint
  ){
    throw new Error("ugp_outreach_delivery_preparation_stale_lineage");
  }

  const requiredRecipientRoleCriteria=normalizeRoleCriteria(
    request.requiredRecipientRoleCriteria,
  );
  const allowedDeliveryChannelTypes=normalizeChannelTypes(
    request.allowedDeliveryChannelTypes,
  );

  const sourceDomain=input.sendReviewInput.request.sourceDomain;
  const sourceUrl=input.sendReviewInput.request.sourceUrl;
  const targetDomain=input.sendReviewInput.request.targetDomain;
  const targetUrl=input.sendReviewInput.request.targetUrl;

  if(targetUrl!==input.sendReview.targetUrl){
    throw new Error("ugp_outreach_delivery_preparation_target_url_mismatch");
  }

  const base={
    version:UGP_AUTHORITY_OUTREACH_DELIVERY_PREPARATION_VERSION,
    sendReviewId:input.sendReview.reviewId,
    sendReviewFingerprint:input.sendReview.reviewFingerprint,
    decisionRequestFingerprint:input.sendReview.decisionRequestFingerprint,
    qualityGateFingerprint:input.sendReview.qualityGateFingerprint,
    requestId:input.sendReview.requestId,
    requestFingerprint:input.sendReview.requestFingerprint,
    candidateFingerprint:input.sendReview.candidateFingerprint,
    mechanicalValidationFingerprint:
      input.sendReview.mechanicalValidationFingerprint,
    prospectFingerprint:input.sendReview.prospectFingerprint,
    opportunityFingerprint:input.sendReview.opportunityFingerprint,
    approvalReviewFingerprint:input.sendReview.approvalReviewFingerprint,
    sourceDomain,
    sourceUrl,
    targetDomain,
    targetUrl,
    requiredRecipientRoleCriteria,
    allowedDeliveryChannelTypes,
    requiredFutureGates:REQUIRED_FUTURE_GATES,
    resultingState:"delivery_preparation_spec_ready" as const,
    semantics:SEMANTICS,
  };
  const preparationFingerprint=hash({
    purpose:"ugp_authority_outreach_delivery_preparation_contract",
    ...base,
  });

  return Object.freeze({
    ...base,
    preparationId:"uaodp-"+preparationFingerprint.slice(0,24),
    preparationFingerprint,
  });
}

export function assertAuthorityOutreachDeliveryPreparationIntegrity(
  result:AuthorityOutreachDeliveryPreparationContract,
  input:Readonly<{
    sendReview:AuthorityOutreachHumanSendReviewRecord;
    sendReviewInput:AuthorityOutreachHumanSendReviewIntegrityInput;
    preparationRequest:AuthorityOutreachDeliveryPreparationRequest;
  }>,
):void{
  if(
    !result
    ||result.version!==UGP_AUTHORITY_OUTREACH_DELIVERY_PREPARATION_VERSION
  ){
    throw new Error("ugp_outreach_delivery_preparation_version_invalid");
  }

  const s=result.semantics;
  if(
    s.deterministic!==true
    ||s.exactHumanSendReviewRequired!==true
    ||s.exactValidatedCandidateRequired!==true
    ||s.deliveryPreparationSpecificationOnly!==true
    ||s.recipientRoleCriteriaOnly!==true
    ||s.deliveryChannelTypesOnly!==true
    ||s.actualRecipientIncluded!==false
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
    throw new Error("ugp_outreach_delivery_preparation_unsafe_semantics");
  }

  const expected=buildAuthorityOutreachDeliveryPreparationContract(input);
  if(stableJson(expected)!==stableJson(result)){
    throw new Error("ugp_outreach_delivery_preparation_integrity_mismatch");
  }
}
