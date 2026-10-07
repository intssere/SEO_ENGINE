import assert from "node:assert/strict";
import test from "node:test";
import { buildBacklinkEvidenceDataset } from "./backlink-evidence-contract.js";
import { discoverAuthorityOpportunities } from "./authority-opportunity-discovery.js";
import { qualifyAuthorityProspects } from "./authority-prospect-qualification.js";
import type { AuthorityOutreachReviewInput } from "./authority-outreach-workspace.js";
import {
  buildAuthorityOutreachDraftGenerationRequestProjection,
} from "./authority-outreach-draft-generation-request.js";
import {
  validateAuthorityOutreachDraftCandidate,
} from "./authority-outreach-draft-candidate-validation.js";
import {
  buildAuthorityOutreachSemanticAssessment,
  buildAuthorityOutreachSemanticQualityGate,
  type AuthorityOutreachSemanticAssessment,
  type AuthorityOutreachSemanticCheckId,
} from "./authority-outreach-semantic-quality-gate.js";
import {
  prepareAuthorityOutreachHumanSendReviewDecision,
  type AuthorityOutreachHumanSendReviewRequest,
} from "./authority-outreach-human-send-review.js";
import {
  buildAuthorityOutreachDeliveryPreparationContract,
  type AuthorityOutreachDeliveryPreparationRequest,
} from "./authority-outreach-delivery-preparation.js";
import {
  buildAuthorityOutreachRecipientResearchSpecification,
  type AuthorityOutreachRecipientResearchRequest,
} from "./authority-outreach-recipient-research-specification.js";
import {
  buildAuthorityOutreachRecipientResearchEvidenceContract,
  type AuthorityOutreachRecipientResearchEvidenceRequest,
  type AuthorityOutreachRecipientResearchObservation,
} from "./authority-outreach-recipient-research-evidence-validation.js";
import {
  buildAuthorityOutreachRecipientSelectionReviewSpecification,
  type AuthorityOutreachRecipientSelectionReviewRequest,
} from "./authority-outreach-recipient-selection-review-specification.js";
import {
  prepareAuthorityOutreachHumanRecipientSelectionDecision,
  type AuthorityOutreachHumanRecipientSelectionRequest,
} from "./authority-outreach-human-recipient-selection.js";
import {
  buildAuthorityOutreachContactVerificationSpecification,
  type AuthorityOutreachContactVerificationSpecificationRequest,
} from "./authority-outreach-contact-verification-specification.js";
import {
  authorityOutreachPublicContactPointFingerprint,
  buildAuthorityOutreachContactPointEvidenceContract,
  type AuthorityOutreachContactPointEvidenceRequest,
} from "./authority-outreach-contact-point-evidence-validation.js";
import {
  buildAuthorityOutreachPolicyConsentReviewSpecification,
  type AuthorityOutreachPolicyConsentReviewRequest,
} from "./authority-outreach-policy-consent-review-specification.js";
import {
  prepareAuthorityOutreachHumanPolicyConsentDecision,
  type AuthorityOutreachHumanPolicyConsentDecisionRequest,
} from "./authority-outreach-human-policy-consent-decision.js";
import {
  buildAuthorityOutreachDeliverabilityVerificationPreparation,
  type AuthorityOutreachDeliverabilityVerificationPreparationRequest,
} from "./authority-outreach-deliverability-verification-preparation.js";
import {
  buildAuthorityOutreachDeliverabilityEvidenceContract,
  type AuthorityOutreachDeliverabilityEvidenceObservationOutcome,
  type AuthorityOutreachDeliverabilityEvidenceRequest,
  type AuthorityOutreachSuppliedDeliverabilityEvidenceObservation,
} from "./authority-outreach-deliverability-evidence-validation.js";
import {
  buildAuthorityOutreachDeliverabilityEvidenceReviewSpecification,
  type AuthorityOutreachDeliverabilityEvidenceReviewRequest,
} from "./authority-outreach-deliverability-evidence-review-specification.js";
import {
  assertAuthorityOutreachHumanDeliverabilityEvidenceDecisionIntegrity,
  prepareAuthorityOutreachHumanDeliverabilityEvidenceDecision,
  type AuthorityOutreachHumanDeliverabilityEvidenceDecisionRequest,
} from "./authority-outreach-human-deliverability-evidence-decision.js";
import {
  buildAuthorityOutreachDeliveryBindingPreparationSpecification,
  type AuthorityOutreachDeliveryBindingPreparationRequest,
} from "./authority-outreach-delivery-binding-preparation-specification.js";
import {
  assertAuthorityOutreachDeliveryBindingEvidenceIntegrity,
  buildAuthorityOutreachDeliveryBindingEvidenceContract,
  type AuthorityOutreachDeliveryBindingEvidenceObservationOutcome,
  type AuthorityOutreachDeliveryBindingEvidenceRequest,
} from "./authority-outreach-delivery-binding-evidence-validation.js";
import {
  assertAuthorityOutreachDeliveryBindingEvidenceReviewSpecIntegrity,
  buildAuthorityOutreachDeliveryBindingEvidenceReviewSpecification,
  type AuthorityOutreachDeliveryBindingEvidenceReviewRequest,
} from "./authority-outreach-delivery-binding-evidence-review-specification.js";
import {
  assertAuthorityOutreachHumanDeliveryBindingEvidenceDecisionIntegrity,
  prepareAuthorityOutreachHumanDeliveryBindingEvidenceDecision,
  type AuthorityOutreachHumanDeliveryBindingEvidenceDecisionRequest,
} from "./authority-outreach-human-delivery-binding-evidence-decision.js";
import {
  assertAuthorityOutreachDeliveryBindingAuthorizationPreparationSpecIntegrity,
  buildAuthorityOutreachDeliveryBindingAuthorizationPreparationSpecification,
  type AuthorityOutreachDeliveryBindingAuthorizationPreparationRequest,
} from "./authority-outreach-delivery-binding-authorization-preparation-specification.js";
import {
  assertAuthorityOutreachDeliveryBindingAuthorizationReviewSpecIntegrity,
  buildAuthorityOutreachDeliveryBindingAuthorizationReviewSpecification,
  type AuthorityOutreachDeliveryBindingAuthorizationReviewRequest,
} from "./authority-outreach-delivery-binding-authorization-review-specification.js";
import {
  assertAuthorityOutreachHumanDeliveryBindingAuthorizationDecisionIntegrity,
  prepareAuthorityOutreachHumanDeliveryBindingAuthorizationDecision,
  type AuthorityOutreachHumanDeliveryBindingAuthorizationDecisionRequest,
} from "./authority-outreach-human-delivery-binding-authorization-decision.js";

const FP=(c:string)=>c.repeat(64);

type ContactKind="email_address"|"web_contact_form";
type PolicyDecision=
  |"approve_for_deliverability_verification_preparation"
  |"reject_contact_point_set"
  |"defer_policy_consent_review";

function fixture(
  contactKind:ContactKind="email_address",
  policyDecision:PolicyDecision=
    "approve_for_deliverability_verification_preparation",
){
  const current=buildBacklinkEvidenceDataset({
    targetDomain:"diamondshelf.us",
    source:{
      providerKey:"dataforseo",
      providerDataset:"backlinks.backlinks.live",
      sourceFingerprint:FP("a"),
      requestFingerprint:FP("b"),
      marketFingerprint:FP("c"),
      categoryFingerprint:FP("d"),
      observedAt:"2026-10-05T00:00:00Z",
      authorityMetric:{
        key:"domain_from_rank",
        min:0,
        max:1000,
        crossProviderComparable:false,
      },
      responseFingerprint:FP("e"),
    },
    backlinks:[{
      sourceUrl:"https://publisher.example.org/old-guide",
      sourceDomain:"publisher.example.org",
      targetUrl:"https://diamondshelf.us/guide",
      anchorText:"Guide",
      firstSeenAt:"2026-01-01T00:00:00Z",
      lastSeenAt:"2026-08-01T00:00:00Z",
      lostAt:"2026-09-01T00:00:00Z",
      state:"lost",
      followState:"follow",
      rel:[],
      providerAuthority:620,
      providerMetrics:[{key:"is_lost",value:1,unit:"boolean"}],
    }],
  });
  const discovery=discoverAuthorityOpportunities({current});
  const opportunity=discovery.opportunities[0];
  assert.ok(opportunity);

  const qualification=qualifyAuthorityProspects({
    current,
    discovery,
    signals:[{
      opportunityFingerprint:opportunity.opportunityFingerprint,
      topicalRelevance:{value:0.95,evidenceFingerprint:FP("1")},
      targetPageFit:{value:0.9,evidenceFingerprint:FP("2")},
      contactability:{value:1,evidenceFingerprint:FP("3")},
      spamRisk:{value:0.05,evidenceFingerprint:FP("4")},
    }],
  });
  const prospect=qualification.prospects[0];
  assert.ok(prospect);

  const reviews:AuthorityOutreachReviewInput[]=[{
    qualificationFingerprint:qualification.qualificationFingerprint,
    prospectFingerprint:prospect.prospectFingerprint,
    decision:"approved_for_draft",
    reasonCode:"editorial_fit_confirmed",
    reviewerId:"operator@example.com",
    reviewedAt:"2026-10-05T14:30:00.000Z",
  }];
  const projection=buildAuthorityOutreachDraftGenerationRequestProjection({
    qualification,
    reviews,
  });
  const ready=projection.items.find(
    item=>item.state==="generation_request_ready",
  );
  assert.ok(ready?.request);

  const candidate={
    requestFingerprint:ready.request.requestFingerprint,
    subject:"A note about your older fragrance guide",
    body:[
      "I noticed the older fragrance reference on publisher.example.org.",
      "Our current guide is available at https://diamondshelf.us/guide.",
      "If it is useful for your readers, please feel free to review it.",
    ].join("\n"),
  };
  const mechanicalValidation=validateAuthorityOutreachDraftCandidate({
    request:ready.request,
    candidate,
  });
  assert.equal(mechanicalValidation.status,"candidate_valid");

  const checkIds:readonly AuthorityOutreachSemanticCheckId[]=[
    "factual_claim_support",
    "relationship_history_integrity",
    "link_scheme_policy",
    "ranking_outcome_claims",
    "tone_reputation_safety",
    "contextual_fit",
  ];
  const assessments:AuthorityOutreachSemanticAssessment[]=checkIds.map(
    (checkId,index)=>buildAuthorityOutreachSemanticAssessment({
      checkId,
      status:"pass",
      summary:"Assessment passed for "+checkId+".",
      evidenceRefs:["semantic-ref-"+String(index+1)],
    }),
  );
  const qualityGate=buildAuthorityOutreachSemanticQualityGate({
    request:ready.request,
    candidate,
    mechanicalValidation,
    assessments,
  });

  const sendReviewRequest:AuthorityOutreachHumanSendReviewRequest={
    qualityGateFingerprint:qualityGate.gateFingerprint,
    requestFingerprint:ready.request.requestFingerprint,
    candidateFingerprint:qualityGate.candidateFingerprint,
    decision:"approved_for_delivery_preparation",
    reasonCode:"approved_as_validated",
    confirmation:[
      "REVIEW_OUTREACH_SEND",
      "approved_for_delivery_preparation",
      qualityGate.candidateFingerprint,
      qualityGate.gateFingerprint,
    ].join(":"),
  };
  const sendReviewInput={
    request:ready.request,
    candidate,
    mechanicalValidation,
    assessments,
    qualityGate,
    reviewRequest:sendReviewRequest,
    reviewerId:"operator@example.com",
    reviewedAt:"2026-10-06T09:30:00.000Z",
  };
  const sendReview=prepareAuthorityOutreachHumanSendReviewDecision(
    sendReviewInput,
  );

  const preparationRequest:AuthorityOutreachDeliveryPreparationRequest={
    sendReviewFingerprint:sendReview.reviewFingerprint,
    candidateFingerprint:sendReview.candidateFingerprint,
    requiredRecipientRoleCriteria:[
      "editorial_responsibility",
    ],
    allowedDeliveryChannelTypes:[
      contactKind==="email_address"?"email":"web_contact_form",
    ],
  };
  const deliveryPreparationInput={
    sendReview,
    sendReviewInput,
    preparationRequest,
  };
  const deliveryPreparation=buildAuthorityOutreachDeliveryPreparationContract(
    deliveryPreparationInput,
  );

  const researchRequest:AuthorityOutreachRecipientResearchRequest={
    preparationFingerprint:deliveryPreparation.preparationFingerprint,
    candidateFingerprint:deliveryPreparation.candidateFingerprint,
    allowedEvidenceSourceClasses:[
      "source_domain_author_or_editor_page",
    ],
  };
  const researchSpecificationInput={
    deliveryPreparation,
    deliveryPreparationInput,
    researchRequest,
  };
  const researchSpecification=
    buildAuthorityOutreachRecipientResearchSpecification(
      researchSpecificationInput,
    );

  const researchObservations:
    readonly AuthorityOutreachRecipientResearchObservation[]=[{
      displayName:"Alex Editor",
      organizationName:"Publisher Example",
      roleTitle:"Senior Editor",
      matchedRoleCriteria:["editorial_responsibility"],
      evidenceSourceClass:"source_domain_author_or_editor_page",
      evidenceUrl:"https://publisher.example.org/team/alex-editor",
      observedAt:"2026-10-06T10:00:00.000Z",
      evidenceFingerprint:FP("5"),
      publicBusinessIdentityAttested:true,
    }];
  const researchEvidenceRequest:AuthorityOutreachRecipientResearchEvidenceRequest={
    researchSpecFingerprint:researchSpecification.researchSpecFingerprint,
    candidateFingerprint:researchSpecification.candidateFingerprint,
    researchOutcome:"candidate_set",
    observations:researchObservations,
  };
  const researchEvidenceInput={
    researchSpecification,
    researchSpecificationInput,
    evidenceRequest:researchEvidenceRequest,
  };
  const researchEvidence=
    buildAuthorityOutreachRecipientResearchEvidenceContract(
      researchEvidenceInput,
    );

  const selectionReviewRequest:AuthorityOutreachRecipientSelectionReviewRequest={
    researchEvidenceFingerprint:researchEvidence.researchEvidenceFingerprint,
    candidateFingerprint:researchEvidence.candidateFingerprint,
  };
  const selectionReviewSpecificationInput={
    researchEvidence,
    researchEvidenceInput,
    reviewRequest:selectionReviewRequest,
  };
  const selectionReviewSpecification=
    buildAuthorityOutreachRecipientSelectionReviewSpecification(
      selectionReviewSpecificationInput,
    );

  const selectedRoleCandidate=selectionReviewSpecification.reviewCandidates[0];
  assert.ok(selectedRoleCandidate);
  const selectionRequestBase={
    selectionReviewSpecFingerprint:
      selectionReviewSpecification.selectionReviewSpecFingerprint,
    candidateFingerprint:selectionReviewSpecification.candidateFingerprint,
    decision:"select_for_contact_verification" as const,
    reasonCode:"role_and_source_evidence_sufficient" as const,
    selectedRoleCandidateFingerprint:
      selectedRoleCandidate.roleCandidateFingerprint,
  };
  const selectionRequest:AuthorityOutreachHumanRecipientSelectionRequest={
    ...selectionRequestBase,
    confirmation:[
      "REVIEW_OUTREACH_RECIPIENT_SELECTION",
      selectionRequestBase.decision,
      selectionRequestBase.selectedRoleCandidateFingerprint,
      selectionRequestBase.selectionReviewSpecFingerprint,
      selectionRequestBase.candidateFingerprint,
    ].join(":"),
  };
  const selectionDecisionInput={
    selectionReviewSpecification,
    selectionReviewSpecificationInput,
    selectionRequest,
    reviewerId:"operator@example.com",
    reviewedAt:"2026-10-06T11:00:00.000Z",
  };
  const selectionDecision=
    prepareAuthorityOutreachHumanRecipientSelectionDecision(
      selectionDecisionInput,
    );

  const verificationRequest:AuthorityOutreachContactVerificationSpecificationRequest={
    selectionDecisionFingerprint:
      selectionDecision.selectionDecisionFingerprint,
    selectedRoleCandidateFingerprint:
      selectionDecision.selectedRoleCandidateFingerprint!,
    candidateFingerprint:selectionDecision.candidateFingerprint,
  };
  const contactVerificationSpecificationInput={
    selectionDecision,
    selectionDecisionInput,
    verificationRequest,
  };
  const contactVerificationSpecification=
    buildAuthorityOutreachContactVerificationSpecification(
      contactVerificationSpecificationInput,
    );

  const contactPointValue=
    contactKind==="email_address"
      ?"editor@publisher.example.org"
      :"https://publisher.example.org/contact/editorial";
  const evidenceSourceClass=
    contactKind==="email_address"
      ?"source_domain_staff_or_author_page" as const
      :"source_domain_contact_page" as const;
  const evidenceUrl=
    contactKind==="email_address"
      ?"https://publisher.example.org/team/alex-editor"
      :"https://publisher.example.org/contact";
  const contactPointFingerprint=
    authorityOutreachPublicContactPointFingerprint(
      contactKind,
      contactPointValue,
      contactVerificationSpecification.sourceDomain,
    );

  const contactPointEvidenceRequest:AuthorityOutreachContactPointEvidenceRequest={
    contactVerificationSpecFingerprint:
      contactVerificationSpecification.contactVerificationSpecFingerprint,
    selectedRoleCandidateFingerprint:
      contactVerificationSpecification.selectedRoleCandidateFingerprint,
    candidateFingerprint:contactVerificationSpecification.candidateFingerprint,
    outcome:"contact_point_set",
    observations:[{
      contactPointType:contactKind,
      contactPointValue,
      evidenceSourceClass,
      evidenceUrl,
      observedAt:"2026-10-06T12:00:00.000Z",
      contactPointFingerprint,
      publicBusinessContactAttested:true,
    }],
  };
  const contactPointEvidenceInput={
    contactVerificationSpecification,
    contactVerificationSpecificationInput,
    evidenceRequest:contactPointEvidenceRequest,
  };
  const contactPointEvidence=
    buildAuthorityOutreachContactPointEvidenceContract(
      contactPointEvidenceInput,
    );

  const policyReviewRequest:AuthorityOutreachPolicyConsentReviewRequest={
    contactPointEvidenceFingerprint:
      contactPointEvidence.contactPointEvidenceFingerprint,
    selectedRoleCandidateFingerprint:
      contactPointEvidence.selectedRoleCandidateFingerprint,
    candidateFingerprint:contactPointEvidence.candidateFingerprint,
  };
  const policyConsentReviewSpecificationInput={
    contactPointEvidence,
    contactPointEvidenceInput,
    reviewRequest:policyReviewRequest,
  };
  const policyConsentReviewSpecification=
    buildAuthorityOutreachPolicyConsentReviewSpecification(
      policyConsentReviewSpecificationInput,
    );

  const selectedContactPoint=
    policyConsentReviewSpecification.reviewContactPoints[0];
  assert.ok(selectedContactPoint);

  const reasonCode=
    policyDecision==="approve_for_deliverability_verification_preparation"
      ?"policy_and_context_review_sufficient" as const
      :policyDecision==="reject_contact_point_set"
        ?"channel_not_appropriate" as const
        :"needs_more_policy_context" as const;
  const selectedContactPointFingerprint=
    policyDecision==="approve_for_deliverability_verification_preparation"
      ?selectedContactPoint.contactPointFingerprint
      :null;

  const policyDecisionBase={
    policyConsentReviewSpecFingerprint:
      policyConsentReviewSpecification.policyConsentReviewSpecFingerprint,
    selectedRoleCandidateFingerprint:
      policyConsentReviewSpecification.selectedRoleCandidateFingerprint,
    candidateFingerprint:
      policyConsentReviewSpecification.candidateFingerprint,
    decision:policyDecision,
    reasonCode,
    selectedContactPointFingerprint,
  };
  const policyDecisionRequest:AuthorityOutreachHumanPolicyConsentDecisionRequest={
    ...policyDecisionBase,
    confirmation:[
      "REVIEW_OUTREACH_POLICY_CONSENT",
      policyDecisionBase.decision,
      policyDecisionBase.selectedContactPointFingerprint??"NONE",
      policyDecisionBase.policyConsentReviewSpecFingerprint,
      policyDecisionBase.selectedRoleCandidateFingerprint,
      policyDecisionBase.candidateFingerprint,
    ].join(":"),
  };
  const policyConsentDecisionInput={
    policyConsentReviewSpecification,
    policyConsentReviewSpecificationInput,
    decisionRequest:policyDecisionRequest,
    reviewerId:"operator@example.com",
    reviewedAt:"2026-10-06T13:00:00.000Z",
  };
  const policyConsentDecision=
    prepareAuthorityOutreachHumanPolicyConsentDecision(
      policyConsentDecisionInput,
    );

  return {
    policyConsentDecision,
    policyConsentDecisionInput,
  };
}


function preparationRequest(
  f:ReturnType<typeof fixture>,
):AuthorityOutreachDeliverabilityVerificationPreparationRequest{
  const selected=f.policyConsentDecision.selectedContactPointFingerprint;
  assert.ok(selected);
  return {
    policyConsentDecisionFingerprint:
      f.policyConsentDecision.policyConsentDecisionFingerprint,
    selectedContactPointFingerprint:selected,
    selectedRoleCandidateFingerprint:
      f.policyConsentDecision.selectedRoleCandidateFingerprint,
    candidateFingerprint:f.policyConsentDecision.candidateFingerprint,
  };
}

function prepared(contactKind:ContactKind="email_address"){
  const f=fixture(contactKind);
  const preparationRequestValue=preparationRequest(f);
  const deliverabilityPreparationInput={
    policyConsentDecision:f.policyConsentDecision,
    policyConsentDecisionInput:f.policyConsentDecisionInput,
    preparationRequest:preparationRequestValue,
  };
  const deliverabilityPreparation=
    buildAuthorityOutreachDeliverabilityVerificationPreparation(
      deliverabilityPreparationInput,
    );
  return {
    ...f,
    deliverabilityPreparation,
    deliverabilityPreparationInput,
  };
}

function suppliedObservations(
  f:ReturnType<typeof prepared>,
  outcomes:
    readonly AuthorityOutreachDeliverabilityEvidenceObservationOutcome[]
      =["supports_reachability","supports_reachability"],
):readonly AuthorityOutreachSuppliedDeliverabilityEvidenceObservation[]{
  assert.equal(
    outcomes.length,
    f.deliverabilityPreparation.allowedVerificationMethodClasses.length,
  );
  return f.deliverabilityPreparation.allowedVerificationMethodClasses.map(
    (methodClass,index)=>({
      methodClass,
      observationOutcome:outcomes[index]!,
      observedAt:
        "2026-10-06T14:0"+String(index)+":00.000Z",
      technicalEvidenceFingerprint:index===0?FP("6"):FP("7"),
      publicBusinessTechnicalEvidenceAttested:true,
    }),
  );
}

function evidenceRequest(
  f:ReturnType<typeof prepared>,
  overrides:Partial<AuthorityOutreachDeliverabilityEvidenceRequest>={},
):AuthorityOutreachDeliverabilityEvidenceRequest{
  return {
    deliverabilityPreparationFingerprint:
      f.deliverabilityPreparation.deliverabilityPreparationFingerprint,
    selectedContactPointFingerprint:
      f.deliverabilityPreparation.selectedContactPointFingerprint,
    selectedRoleCandidateFingerprint:
      f.deliverabilityPreparation.selectedRoleCandidateFingerprint,
    candidateFingerprint:f.deliverabilityPreparation.candidateFingerprint,
    observations:suppliedObservations(f),
    ...overrides,
  };
}


function evidenceFixture(
  outcomes:
    readonly AuthorityOutreachDeliverabilityEvidenceObservationOutcome[]
      =["supports_reachability","supports_reachability"],
  contactKind:ContactKind="email_address",
){
  const f=prepared(contactKind);
  const evidenceRequestValue=evidenceRequest(f,{
    observations:suppliedObservations(f,outcomes),
  });
  const deliverabilityEvidenceInput={
    deliverabilityPreparation:f.deliverabilityPreparation,
    deliverabilityPreparationInput:f.deliverabilityPreparationInput,
    evidenceRequest:evidenceRequestValue,
  };
  const deliverabilityEvidence=
    buildAuthorityOutreachDeliverabilityEvidenceContract(
      deliverabilityEvidenceInput,
    );
  return {
    ...f,
    deliverabilityEvidence,
    deliverabilityEvidenceInput,
  };
}

function reviewRequest(
  f:ReturnType<typeof evidenceFixture>,
  overrides:Partial<AuthorityOutreachDeliverabilityEvidenceReviewRequest>={},
):AuthorityOutreachDeliverabilityEvidenceReviewRequest{
  return {
    deliverabilityEvidenceFingerprint:
      f.deliverabilityEvidence.deliverabilityEvidenceFingerprint,
    selectedContactPointFingerprint:
      f.deliverabilityEvidence.selectedContactPointFingerprint,
    selectedRoleCandidateFingerprint:
      f.deliverabilityEvidence.selectedRoleCandidateFingerprint,
    candidateFingerprint:f.deliverabilityEvidence.candidateFingerprint,
    ...overrides,
  };
}


function reviewFixture(
  outcomes:
    readonly AuthorityOutreachDeliverabilityEvidenceObservationOutcome[]
      =["supports_reachability","supports_reachability"],
  contactKind:ContactKind="email_address",
){
  const f=evidenceFixture(outcomes,contactKind);
  const reviewRequestValue=reviewRequest(f);
  const deliverabilityEvidenceReviewSpecificationInput={
    deliverabilityEvidence:f.deliverabilityEvidence,
    deliverabilityEvidenceInput:f.deliverabilityEvidenceInput,
    reviewRequest:reviewRequestValue,
  };
  const deliverabilityEvidenceReviewSpecification=
    buildAuthorityOutreachDeliverabilityEvidenceReviewSpecification(
      deliverabilityEvidenceReviewSpecificationInput,
    );
  return {
    ...f,
    deliverabilityEvidenceReviewSpecification,
    deliverabilityEvidenceReviewSpecificationInput,
  };
}

function decisionRequest(
  f:ReturnType<typeof reviewFixture>,
  decision:
    AuthorityOutreachHumanDeliverabilityEvidenceDecisionRequest["decision"],
  reasonCode:
    AuthorityOutreachHumanDeliverabilityEvidenceDecisionRequest["reasonCode"],
  overrides:
    Partial<AuthorityOutreachHumanDeliverabilityEvidenceDecisionRequest>
      ={},
):AuthorityOutreachHumanDeliverabilityEvidenceDecisionRequest{
  const base={
    deliverabilityEvidenceReviewSpecFingerprint:
      f.deliverabilityEvidenceReviewSpecification
        .deliverabilityEvidenceReviewSpecFingerprint,
    deliverabilityEvidenceFingerprint:
      f.deliverabilityEvidenceReviewSpecification
        .deliverabilityEvidenceFingerprint,
    selectedContactPointFingerprint:
      f.deliverabilityEvidenceReviewSpecification
        .selectedContactPointFingerprint,
    selectedRoleCandidateFingerprint:
      f.deliverabilityEvidenceReviewSpecification
        .selectedRoleCandidateFingerprint,
    candidateFingerprint:
      f.deliverabilityEvidenceReviewSpecification.candidateFingerprint,
    decision,
    reasonCode,
  };
  const merged={...base,...overrides};
  return {
    ...merged,
    confirmation:[
      "REVIEW_OUTREACH_DELIVERABILITY_EVIDENCE",
      merged.decision,
      merged.deliverabilityEvidenceReviewSpecFingerprint,
      merged.deliverabilityEvidenceFingerprint,
      merged.selectedContactPointFingerprint,
      merged.selectedRoleCandidateFingerprint,
      merged.candidateFingerprint,
    ].join(":"),
  };
}


function approvedDecision(contactKind:ContactKind="email_address"){
  const f=reviewFixture(
    ["supports_reachability","supports_reachability"],
    contactKind,
  );
  const request=decisionRequest(
    f,
    "approve_for_provider_mailbox_binding_preparation",
    "evidence_sufficient_for_binding_preparation",
  );
  const deliverabilityEvidenceDecisionInput={
    deliverabilityEvidenceReviewSpecification:
      f.deliverabilityEvidenceReviewSpecification,
    deliverabilityEvidenceReviewSpecificationInput:
      f.deliverabilityEvidenceReviewSpecificationInput,
    decisionRequest:request,
    reviewerId:"operator@example.com",
    reviewedAt:"2026-10-07T10:00:00.000Z",
  };
  const deliverabilityEvidenceDecision=
    prepareAuthorityOutreachHumanDeliverabilityEvidenceDecision(
      deliverabilityEvidenceDecisionInput,
    );
  return {
    ...f,
    deliverabilityEvidenceDecision,
    deliverabilityEvidenceDecisionInput,
  };
}

function bindingRequest(
  f:ReturnType<typeof approvedDecision>,
  overrides:Partial<AuthorityOutreachDeliveryBindingPreparationRequest>={},
):AuthorityOutreachDeliveryBindingPreparationRequest{
  return {
    deliverabilityEvidenceDecisionFingerprint:
      f.deliverabilityEvidenceDecision
        .deliverabilityEvidenceDecisionFingerprint,
    deliverabilityEvidenceReviewSpecFingerprint:
      f.deliverabilityEvidenceDecision
        .deliverabilityEvidenceReviewSpecFingerprint,
    deliverabilityEvidenceFingerprint:
      f.deliverabilityEvidenceDecision.deliverabilityEvidenceFingerprint,
    selectedContactPointFingerprint:
      f.deliverabilityEvidenceDecision.selectedContactPointFingerprint,
    selectedRoleCandidateFingerprint:
      f.deliverabilityEvidenceDecision.selectedRoleCandidateFingerprint,
    candidateFingerprint:
      f.deliverabilityEvidenceDecision.candidateFingerprint,
    ...overrides,
  };
}


function bindingPreparation(contactKind:ContactKind="email_address"){
  const f=approvedDecision(contactKind);
  const deliveryBindingPreparationInput={
    deliverabilityEvidenceDecision:f.deliverabilityEvidenceDecision,
    deliverabilityEvidenceDecisionInput:
      f.deliverabilityEvidenceDecisionInput,
    preparationRequest:bindingRequest(f),
  };
  const deliveryBindingPreparation=
    buildAuthorityOutreachDeliveryBindingPreparationSpecification(
      deliveryBindingPreparationInput,
    );
  return {
    ...f,
    deliveryBindingPreparation,
    deliveryBindingPreparationInput,
  };
}

function bindingEvidenceRequest(
  f:ReturnType<typeof bindingPreparation>,
  outcomes:readonly AuthorityOutreachDeliveryBindingEvidenceObservationOutcome[]=
    f.deliveryBindingPreparation.futureBindingRequirements.map(
      ()=>"supports_binding_readiness" as const,
    ),
  overrides:Partial<AuthorityOutreachDeliveryBindingEvidenceRequest>={},
):AuthorityOutreachDeliveryBindingEvidenceRequest{
  assert.equal(
    outcomes.length,
    f.deliveryBindingPreparation.futureBindingRequirements.length,
  );
  const chars=["1","2","3","4","5","6","7","8","9"];
  return {
    deliveryBindingPreparationSpecFingerprint:
      f.deliveryBindingPreparation.deliveryBindingPreparationSpecFingerprint,
    selectedContactPointFingerprint:
      f.deliveryBindingPreparation.selectedContactPointFingerprint,
    selectedRoleCandidateFingerprint:
      f.deliveryBindingPreparation.selectedRoleCandidateFingerprint,
    candidateFingerprint:f.deliveryBindingPreparation.candidateFingerprint,
    observations:f.deliveryBindingPreparation.futureBindingRequirements.map(
      (requirementClass,index)=>({
        requirementClass,
        observationOutcome:outcomes[index]!,
        observedAt:`2026-10-07T11:0${index}:00.000Z`,
        technicalEvidenceFingerprint:FP(chars[index]!),
        publicBusinessBindingEvidenceAttested:true as const,
      }),
    ),
    ...overrides,
  };
}


function bindingEvidence(
  contactKind:ContactKind="email_address",
  outcomes?:readonly AuthorityOutreachDeliveryBindingEvidenceObservationOutcome[],
){
  const f=bindingPreparation(contactKind);
  const deliveryBindingEvidenceInput={
    deliveryBindingPreparation:f.deliveryBindingPreparation,
    deliveryBindingPreparationInput:f.deliveryBindingPreparationInput,
    evidenceRequest:bindingEvidenceRequest(f,outcomes),
  };
  const deliveryBindingEvidence=
    buildAuthorityOutreachDeliveryBindingEvidenceContract(
      deliveryBindingEvidenceInput,
    );
  return {
    ...f,
    deliveryBindingEvidence,
    deliveryBindingEvidenceInput,
  };
}

function bindingReviewRequest(
  f:ReturnType<typeof bindingEvidence>,
  overrides:Partial<AuthorityOutreachDeliveryBindingEvidenceReviewRequest>={},
):AuthorityOutreachDeliveryBindingEvidenceReviewRequest{
  return {
    deliveryBindingEvidenceFingerprint:
      f.deliveryBindingEvidence.deliveryBindingEvidenceFingerprint,
    deliveryBindingPreparationSpecFingerprint:
      f.deliveryBindingEvidence.deliveryBindingPreparationSpecFingerprint,
    selectedContactPointFingerprint:
      f.deliveryBindingEvidence.selectedContactPointFingerprint,
    selectedRoleCandidateFingerprint:
      f.deliveryBindingEvidence.selectedRoleCandidateFingerprint,
    candidateFingerprint:f.deliveryBindingEvidence.candidateFingerprint,
    ...overrides,
  };
}



function authorizationBindingReview27(
  contactKind:ContactKind="email_address",
  outcomes?:readonly AuthorityOutreachDeliveryBindingEvidenceObservationOutcome[],
){
  const f=bindingEvidence(contactKind,outcomes);
  const deliveryBindingEvidenceReviewSpecificationInput={
    deliveryBindingEvidence:f.deliveryBindingEvidence,
    deliveryBindingEvidenceInput:f.deliveryBindingEvidenceInput,
    reviewRequest:bindingReviewRequest(f),
  };
  const deliveryBindingEvidenceReviewSpecification=
    buildAuthorityOutreachDeliveryBindingEvidenceReviewSpecification(
      deliveryBindingEvidenceReviewSpecificationInput,
    );
  return {
    ...f,
    deliveryBindingEvidenceReviewSpecification,
    deliveryBindingEvidenceReviewSpecificationInput,
  };
}

function authorizationDecisionRequest27(
  f:ReturnType<typeof authorizationBindingReview27>,
  decision:AuthorityOutreachHumanDeliveryBindingEvidenceDecisionRequest["decision"],
  reasonCode:AuthorityOutreachHumanDeliveryBindingEvidenceDecisionRequest["reasonCode"],
):AuthorityOutreachHumanDeliveryBindingEvidenceDecisionRequest{
  const request={
    deliveryBindingEvidenceReviewSpecFingerprint:
      f.deliveryBindingEvidenceReviewSpecification
        .deliveryBindingEvidenceReviewSpecFingerprint,
    deliveryBindingEvidenceFingerprint:
      f.deliveryBindingEvidenceReviewSpecification
        .deliveryBindingEvidenceFingerprint,
    deliveryBindingPreparationSpecFingerprint:
      f.deliveryBindingEvidenceReviewSpecification
        .deliveryBindingPreparationSpecFingerprint,
    selectedContactPointFingerprint:
      f.deliveryBindingEvidenceReviewSpecification
        .selectedContactPointFingerprint,
    selectedRoleCandidateFingerprint:
      f.deliveryBindingEvidenceReviewSpecification
        .selectedRoleCandidateFingerprint,
    candidateFingerprint:
      f.deliveryBindingEvidenceReviewSpecification.candidateFingerprint,
    decision,
    reasonCode,
  };
  return {
    ...request,
    confirmation:[
      "REVIEW_OUTREACH_DELIVERY_BINDING_EVIDENCE",
      request.decision,
      request.deliveryBindingEvidenceReviewSpecFingerprint,
      request.deliveryBindingEvidenceFingerprint,
      request.deliveryBindingPreparationSpecFingerprint,
      request.selectedContactPointFingerprint,
      request.selectedRoleCandidateFingerprint,
      request.candidateFingerprint,
    ].join(":"),
  };
}

function humanBindingDecision27(
  contactKind:ContactKind="email_address",
  decision:
    AuthorityOutreachHumanDeliveryBindingEvidenceDecisionRequest["decision"]=
      "approve_for_delivery_binding_authorization_preparation",
  reasonCode:
    AuthorityOutreachHumanDeliveryBindingEvidenceDecisionRequest["reasonCode"]=
      "evidence_sufficient_for_binding_authorization_preparation",
){
  const f=authorizationBindingReview27(contactKind);
  const decisionRequest=authorizationDecisionRequest27(
    f,
    decision,
    reasonCode,
  );
  const deliveryBindingEvidenceDecisionInput={
    deliveryBindingEvidenceReviewSpecification:
      f.deliveryBindingEvidenceReviewSpecification,
    deliveryBindingEvidenceReviewSpecificationInput:
      f.deliveryBindingEvidenceReviewSpecificationInput,
    decisionRequest,
    reviewerId:"operator@example.com",
    reviewedAt:"2026-10-07T12:30:00.000Z",
  };
  const deliveryBindingEvidenceDecision=
    prepareAuthorityOutreachHumanDeliveryBindingEvidenceDecision(
      deliveryBindingEvidenceDecisionInput,
    );
  return {
    ...f,
    deliveryBindingEvidenceDecision,
    deliveryBindingEvidenceDecisionInput,
  };
}

function authorizationPreparationRequest27(
  f:ReturnType<typeof humanBindingDecision27>,
  overrides:
    Partial<AuthorityOutreachDeliveryBindingAuthorizationPreparationRequest>={},
):AuthorityOutreachDeliveryBindingAuthorizationPreparationRequest{
  return {
    deliveryBindingEvidenceDecisionFingerprint:
      f.deliveryBindingEvidenceDecision
        .deliveryBindingEvidenceDecisionFingerprint,
    deliveryBindingEvidenceReviewSpecFingerprint:
      f.deliveryBindingEvidenceDecision
        .deliveryBindingEvidenceReviewSpecFingerprint,
    deliveryBindingEvidenceFingerprint:
      f.deliveryBindingEvidenceDecision.deliveryBindingEvidenceFingerprint,
    deliveryBindingPreparationSpecFingerprint:
      f.deliveryBindingEvidenceDecision
        .deliveryBindingPreparationSpecFingerprint,
    selectedContactPointFingerprint:
      f.deliveryBindingEvidenceDecision.selectedContactPointFingerprint,
    selectedRoleCandidateFingerprint:
      f.deliveryBindingEvidenceDecision.selectedRoleCandidateFingerprint,
    candidateFingerprint:
      f.deliveryBindingEvidenceDecision.candidateFingerprint,
    ...overrides,
  };
}


function authorizationPreparation28(
  contactKind:ContactKind="email_address",
){
  const f=humanBindingDecision27(contactKind);
  const deliveryBindingAuthorizationPreparationSpecificationInput={
    deliveryBindingEvidenceDecision:f.deliveryBindingEvidenceDecision,
    deliveryBindingEvidenceDecisionInput:
      f.deliveryBindingEvidenceDecisionInput,
    preparationRequest:authorizationPreparationRequest27(f),
  };
  const deliveryBindingAuthorizationPreparationSpecification=
    buildAuthorityOutreachDeliveryBindingAuthorizationPreparationSpecification(
      deliveryBindingAuthorizationPreparationSpecificationInput,
    );
  return {
    ...f,
    deliveryBindingAuthorizationPreparationSpecification,
    deliveryBindingAuthorizationPreparationSpecificationInput,
  };
}

function authorizationReviewRequest28(
  f:ReturnType<typeof authorizationPreparation28>,
  overrides:Partial<AuthorityOutreachDeliveryBindingAuthorizationReviewRequest>={},
):AuthorityOutreachDeliveryBindingAuthorizationReviewRequest{
  return {
    deliveryBindingAuthorizationPreparationSpecFingerprint:
      f.deliveryBindingAuthorizationPreparationSpecification
        .deliveryBindingAuthorizationPreparationSpecFingerprint,
    deliveryBindingEvidenceDecisionFingerprint:
      f.deliveryBindingAuthorizationPreparationSpecification
        .deliveryBindingEvidenceDecisionFingerprint,
    selectedContactPointFingerprint:
      f.deliveryBindingAuthorizationPreparationSpecification
        .selectedContactPointFingerprint,
    selectedRoleCandidateFingerprint:
      f.deliveryBindingAuthorizationPreparationSpecification
        .selectedRoleCandidateFingerprint,
    candidateFingerprint:
      f.deliveryBindingAuthorizationPreparationSpecification
        .candidateFingerprint,
    ...overrides,
  };
}


function authorizationReview29(
  contactKind:ContactKind="email_address",
){
  const f=authorizationPreparation28(contactKind);
  const deliveryBindingAuthorizationReviewSpecificationInput={
    deliveryBindingAuthorizationPreparationSpecification:
      f.deliveryBindingAuthorizationPreparationSpecification,
    deliveryBindingAuthorizationPreparationSpecificationInput:
      f.deliveryBindingAuthorizationPreparationSpecificationInput,
    reviewRequest:authorizationReviewRequest28(f),
  };
  const deliveryBindingAuthorizationReviewSpecification=
    buildAuthorityOutreachDeliveryBindingAuthorizationReviewSpecification(
      deliveryBindingAuthorizationReviewSpecificationInput,
    );
  return {
    ...f,
    deliveryBindingAuthorizationReviewSpecification,
    deliveryBindingAuthorizationReviewSpecificationInput,
  };
}

function authorizationDecisionRequest29(
  f:ReturnType<typeof authorizationReview29>,
  decision:AuthorityOutreachHumanDeliveryBindingAuthorizationDecisionRequest["decision"],
  reasonCode:AuthorityOutreachHumanDeliveryBindingAuthorizationDecisionRequest["reasonCode"],
  overrides:Partial<AuthorityOutreachHumanDeliveryBindingAuthorizationDecisionRequest>={},
):AuthorityOutreachHumanDeliveryBindingAuthorizationDecisionRequest{
  const request={
    deliveryBindingAuthorizationReviewSpecFingerprint:
      f.deliveryBindingAuthorizationReviewSpecification
        .deliveryBindingAuthorizationReviewSpecFingerprint,
    deliveryBindingAuthorizationPreparationSpecFingerprint:
      f.deliveryBindingAuthorizationReviewSpecification
        .deliveryBindingAuthorizationPreparationSpecFingerprint,
    deliveryBindingEvidenceDecisionFingerprint:
      f.deliveryBindingAuthorizationReviewSpecification
        .deliveryBindingEvidenceDecisionFingerprint,
    selectedContactPointFingerprint:
      f.deliveryBindingAuthorizationReviewSpecification
        .selectedContactPointFingerprint,
    selectedRoleCandidateFingerprint:
      f.deliveryBindingAuthorizationReviewSpecification
        .selectedRoleCandidateFingerprint,
    candidateFingerprint:
      f.deliveryBindingAuthorizationReviewSpecification.candidateFingerprint,
    decision,
    reasonCode,
    ...overrides,
  };
  return {
    ...request,
    confirmation:[
      "REVIEW_OUTREACH_DELIVERY_BINDING_AUTHORIZATION",
      request.decision,
      request.deliveryBindingAuthorizationReviewSpecFingerprint,
      request.deliveryBindingAuthorizationPreparationSpecFingerprint,
      request.deliveryBindingEvidenceDecisionFingerprint,
      request.selectedContactPointFingerprint,
      request.selectedRoleCandidateFingerprint,
      request.candidateFingerprint,
    ].join(":"),
  };
}

test("approved email authorization review records operational-authorization eligibility only",()=>{
  const f=authorizationReview29("email_address");
  const request=authorizationDecisionRequest29(
    f,
    "approve_for_separate_delivery_binding_operational_authorization",
    "authorization_preparation_sufficient_for_separate_operational_authorization",
  );
  const input={
    deliveryBindingAuthorizationReviewSpecification:
      f.deliveryBindingAuthorizationReviewSpecification,
    deliveryBindingAuthorizationReviewSpecificationInput:
      f.deliveryBindingAuthorizationReviewSpecificationInput,
    decisionRequest:request,
    reviewerId:"operator@example.com",
    reviewedAt:"2026-10-07T14:15:00.000Z",
  };
  const result=
    prepareAuthorityOutreachHumanDeliveryBindingAuthorizationDecision(input);

  assert.equal(
    result.resultingState,
    "delivery_binding_operational_authorization_eligible",
  );
  assert.equal(
    result.decision,
    "approve_for_separate_delivery_binding_operational_authorization",
  );
  assert.equal(result.channelClass,"email_delivery_binding");
  assert.equal(result.semantics.humanDecision,true);
  assert.equal(result.semantics.eligibilityOnly,true);
  assert.equal(result.semantics.deliveryBindingAuthorizationDecisionRecorded,true);
  assert.equal(result.semantics.deliveryBindingAuthorizationApproved,true);
  assert.equal(
    result.semantics.separateOperationalAuthorizationEligibilityGranted,
    true,
  );
  assert.equal(result.semantics.separateOperationalAuthorizationExecuted,false);
  assert.equal(result.semantics.deliveryBindingAuthorizationGranted,false);
  assert.equal(result.semantics.deliveryBindingAuthorizationRecorded,false);
  assert.equal(result.semantics.deliveryBindingExecutionAuthorized,false);
  assert.equal(result.semantics.deliveryBindingExecutionPerformed,false);
  assert.equal(result.semantics.providerBindingAuthorized,false);
  assert.equal(result.semantics.providerBindingPerformed,false);
  assert.equal(result.semantics.mailboxBindingAuthorized,false);
  assert.equal(result.semantics.mailboxBindingPerformed,false);
  assert.equal(result.semantics.providerCredentialActivationAuthorized,false);
  assert.equal(result.semantics.webSubmissionExecutionAuthorized,false);
  assert.equal(result.semantics.sendJobConstructionAuthorized,false);
  assert.equal(result.semantics.sendAuthorizationGranted,false);
  assert.equal(result.semantics.outreachSendingAuthorized,false);
  assert.equal(result.semantics.performsProviderCall,false);
  assert.equal(result.semantics.performsNetworkOperation,false);
  assert.equal(result.semantics.performsPersistence,false);

  assertAuthorityOutreachHumanDeliveryBindingAuthorizationDecisionIntegrity(
    result,
    input,
  );
});

test("approved web-contact-form authorization review remains eligibility-only and channel-specific",()=>{
  const f=authorizationReview29("web_contact_form");
  const request=authorizationDecisionRequest29(
    f,
    "approve_for_separate_delivery_binding_operational_authorization",
    "authorization_preparation_sufficient_for_separate_operational_authorization",
  );
  const result=
    prepareAuthorityOutreachHumanDeliveryBindingAuthorizationDecision({
      deliveryBindingAuthorizationReviewSpecification:
        f.deliveryBindingAuthorizationReviewSpecification,
      deliveryBindingAuthorizationReviewSpecificationInput:
        f.deliveryBindingAuthorizationReviewSpecificationInput,
      decisionRequest:request,
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-07T14:16:00.000Z",
    });

  assert.equal(
    result.channelClass,
    "web_contact_form_submission_binding",
  );
  assert.equal(
    result.frozenAuthorizationMaterialClasses.includes(
      "sender_mailbox_binding_authorization_required",
    ),
    false,
  );
  assert.equal(
    result.frozenAuthorizationMaterialClasses.includes(
      "submission_mechanism_binding_authorization_required",
    ),
    true,
  );
  assert.equal(result.semantics.senderMailboxIdentifierIncluded,false);
  assert.equal(result.semantics.submissionMechanismReferenceIncluded,false);
  assert.equal(result.semantics.webSubmissionExecutionAuthorized,false);
  assert.equal(result.semantics.webSubmissionExecutionPerformed,false);
});

test("reject and defer decisions remain non-eligible bounded terminal states",()=>{
  const rejectedFlow=authorizationReview29();
  const rejected=
    prepareAuthorityOutreachHumanDeliveryBindingAuthorizationDecision({
      deliveryBindingAuthorizationReviewSpecification:
        rejectedFlow.deliveryBindingAuthorizationReviewSpecification,
      deliveryBindingAuthorizationReviewSpecificationInput:
        rejectedFlow.deliveryBindingAuthorizationReviewSpecificationInput,
      decisionRequest:authorizationDecisionRequest29(
        rejectedFlow,
        "reject_delivery_binding_authorization_preparation",
        "authorization_preparation_rejected",
      ),
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-07T14:17:00.000Z",
    });
  assert.equal(
    rejected.resultingState,
    "delivery_binding_authorization_preparation_rejected",
  );
  assert.equal(rejected.semantics.deliveryBindingAuthorizationApproved,false);
  assert.equal(
    rejected.semantics.separateOperationalAuthorizationEligibilityGranted,
    false,
  );

  const deferredFlow=authorizationReview29();
  const deferred=
    prepareAuthorityOutreachHumanDeliveryBindingAuthorizationDecision({
      deliveryBindingAuthorizationReviewSpecification:
        deferredFlow.deliveryBindingAuthorizationReviewSpecification,
      deliveryBindingAuthorizationReviewSpecificationInput:
        deferredFlow.deliveryBindingAuthorizationReviewSpecificationInput,
      decisionRequest:authorizationDecisionRequest29(
        deferredFlow,
        "defer_delivery_binding_authorization_review",
        "needs_more_authorization_context",
      ),
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-07T14:18:00.000Z",
    });
  assert.equal(
    deferred.resultingState,
    "delivery_binding_authorization_review_deferred",
  );
  assert.equal(
    deferred.semantics.separateOperationalAuthorizationEligibilityGranted,
    false,
  );
});

test("UGP-10.29 requires exact explicit confirmation and exact UGP-10.28 through-draft lineage",()=>{
  const f=authorizationReview29();
  const valid=authorizationDecisionRequest29(
    f,
    "approve_for_separate_delivery_binding_operational_authorization",
    "authorization_preparation_sufficient_for_separate_operational_authorization",
  );

  assert.throws(
    ()=>prepareAuthorityOutreachHumanDeliveryBindingAuthorizationDecision({
      deliveryBindingAuthorizationReviewSpecification:
        f.deliveryBindingAuthorizationReviewSpecification,
      deliveryBindingAuthorizationReviewSpecificationInput:
        f.deliveryBindingAuthorizationReviewSpecificationInput,
      decisionRequest:{...valid,confirmation:"WRONG"},
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-07T14:19:00.000Z",
    }),
    /ugp_outreach_human_delivery_binding_authorization_decision_explicit_confirmation_required/,
  );

  for(const overrides of [
    {deliveryBindingAuthorizationReviewSpecFingerprint:FP("f")},
    {deliveryBindingAuthorizationPreparationSpecFingerprint:FP("0")},
    {deliveryBindingEvidenceDecisionFingerprint:FP("9")},
    {selectedContactPointFingerprint:FP("8")},
    {selectedRoleCandidateFingerprint:FP("7")},
    {candidateFingerprint:FP("6")},
  ]){
    assert.throws(
      ()=>prepareAuthorityOutreachHumanDeliveryBindingAuthorizationDecision({
        deliveryBindingAuthorizationReviewSpecification:
          f.deliveryBindingAuthorizationReviewSpecification,
        deliveryBindingAuthorizationReviewSpecificationInput:
          f.deliveryBindingAuthorizationReviewSpecificationInput,
        decisionRequest:authorizationDecisionRequest29(
          f,
          "approve_for_separate_delivery_binding_operational_authorization",
          "authorization_preparation_sufficient_for_separate_operational_authorization",
          overrides,
        ),
        reviewerId:"operator@example.com",
        reviewedAt:"2026-10-07T14:20:00.000Z",
      }),
      /ugp_outreach_human_delivery_binding_authorization_decision_stale_lineage/,
    );
  }
});

test("UGP-10.29 enforces decision-specific reason codes",()=>{
  const f=authorizationReview29();
  assert.throws(
    ()=>prepareAuthorityOutreachHumanDeliveryBindingAuthorizationDecision({
      deliveryBindingAuthorizationReviewSpecification:
        f.deliveryBindingAuthorizationReviewSpecification,
      deliveryBindingAuthorizationReviewSpecificationInput:
        f.deliveryBindingAuthorizationReviewSpecificationInput,
      decisionRequest:authorizationDecisionRequest29(
        f,
        "approve_for_separate_delivery_binding_operational_authorization",
        "authorization_scope_unclear",
      ),
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-07T14:21:00.000Z",
    }),
    /ugp_outreach_human_delivery_binding_authorization_decision_approval_reason_invalid/,
  );

  assert.throws(
    ()=>prepareAuthorityOutreachHumanDeliveryBindingAuthorizationDecision({
      deliveryBindingAuthorizationReviewSpecification:
        f.deliveryBindingAuthorizationReviewSpecification,
      deliveryBindingAuthorizationReviewSpecificationInput:
        f.deliveryBindingAuthorizationReviewSpecificationInput,
      decisionRequest:authorizationDecisionRequest29(
        f,
        "reject_delivery_binding_authorization_preparation",
        "needs_more_authorization_context",
      ),
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-07T14:22:00.000Z",
    }),
    /ugp_outreach_human_delivery_binding_authorization_decision_reject_reason_invalid/,
  );
});

test("human delivery-binding authorization decision is deterministic and tamper-evident",()=>{
  const f=authorizationReview29();
  const request=authorizationDecisionRequest29(
    f,
    "approve_for_separate_delivery_binding_operational_authorization",
    "authorization_preparation_sufficient_for_separate_operational_authorization",
  );
  const input={
    deliveryBindingAuthorizationReviewSpecification:
      f.deliveryBindingAuthorizationReviewSpecification,
    deliveryBindingAuthorizationReviewSpecificationInput:
      f.deliveryBindingAuthorizationReviewSpecificationInput,
    decisionRequest:request,
    reviewerId:"operator@example.com",
    reviewedAt:"2026-10-07T14:23:00.000Z",
  };
  const first=
    prepareAuthorityOutreachHumanDeliveryBindingAuthorizationDecision(input);
  const second=
    prepareAuthorityOutreachHumanDeliveryBindingAuthorizationDecision(input);
  assert.deepEqual(second,first);

  const tampered=structuredClone(first);
  Object.assign(tampered,{resultingState:"delivery_binding_executed"});
  assert.throws(
    ()=>assertAuthorityOutreachHumanDeliveryBindingAuthorizationDecisionIntegrity(
      tampered,
      input,
    ),
    /ugp_outreach_human_delivery_binding_authorization_decision_integrity_mismatch/,
  );
});
