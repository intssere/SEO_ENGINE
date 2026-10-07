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

test("approved email decision yields provider-free authorization-preparation requirement classes only",()=>{
  const f=humanBindingDecision27("email_address");
  const input={
    deliveryBindingEvidenceDecision:f.deliveryBindingEvidenceDecision,
    deliveryBindingEvidenceDecisionInput:
      f.deliveryBindingEvidenceDecisionInput,
    preparationRequest:authorizationPreparationRequest27(f),
  };
  const result=
    buildAuthorityOutreachDeliveryBindingAuthorizationPreparationSpecification(
      input,
    );

  assert.equal(
    result.resultingState,
    "delivery_binding_authorization_preparation_spec_ready",
  );
  assert.equal(result.channelClass,"email_delivery_binding");
  assert.equal(
    result.approvedDecision,
    "approve_for_delivery_binding_authorization_preparation",
  );
  assert.equal(
    result.approvedReasonCode,
    "evidence_sufficient_for_binding_authorization_preparation",
  );
  assert.deepEqual(result.futureAuthorizationMaterialClasses,[
    "exact_human_binding_evidence_decision_required",
    "bounded_binding_scope_authorization_required",
    "rollback_unbind_plan_required",
    "post_binding_verification_plan_required",
    "sender_identity_binding_authorization_required",
    "sender_mailbox_binding_authorization_required",
    "email_delivery_provider_binding_authorization_required",
    "provider_credential_activation_authorization_required",
  ]);
  assert.equal(
    result.semantics.deliveryBindingAuthorizationPreparationSpecificationOnly,
    true,
  );
  assert.equal(result.semantics.deliveryBindingAuthorizationGranted,false);
  assert.equal(result.semantics.deliveryBindingAuthorizationRecorded,false);
  assert.equal(
    result.semantics.deliveryBindingAuthorizationPreparationExecuted,
    false,
  );
  assert.equal(result.semantics.deliveryBindingExecutionAuthorized,false);
  assert.equal(result.semantics.deliveryBindingExecutionPerformed,false);
  assert.equal(result.semantics.liveProviderIdentifierIncluded,false);
  assert.equal(result.semantics.senderMailboxIdentifierIncluded,false);
  assert.equal(result.semantics.providerCredentialIncluded,false);
  assert.equal(result.semantics.providerCredentialReferenceIncluded,false);
  assert.equal(result.semantics.providerCredentialActivationAuthorized,false);
  assert.equal(result.semantics.providerBindingAuthorized,false);
  assert.equal(result.semantics.providerBindingPerformed,false);
  assert.equal(result.semantics.mailboxBindingAuthorized,false);
  assert.equal(result.semantics.mailboxBindingPerformed,false);
  assert.equal(result.semantics.sendJobConstructionAuthorized,false);
  assert.equal(result.semantics.sendAuthorizationGranted,false);
  assert.equal(result.semantics.outreachSendingAuthorized,false);
  assert.equal(result.semantics.outreachSendingPerformed,false);
  assert.equal(result.semantics.performsProviderCall,false);
  assert.equal(result.semantics.performsNetworkOperation,false);
  assert.equal(result.semantics.performsPersistence,false);

  assertAuthorityOutreachDeliveryBindingAuthorizationPreparationSpecIntegrity(
    result,
    input,
  );
});

test("approved web-contact-form decision yields only web authorization-material classes",()=>{
  const f=humanBindingDecision27("web_contact_form");
  const result=
    buildAuthorityOutreachDeliveryBindingAuthorizationPreparationSpecification({
      deliveryBindingEvidenceDecision:f.deliveryBindingEvidenceDecision,
      deliveryBindingEvidenceDecisionInput:
        f.deliveryBindingEvidenceDecisionInput,
      preparationRequest:authorizationPreparationRequest27(f),
    });

  assert.equal(
    result.channelClass,
    "web_contact_form_submission_binding",
  );
  assert.deepEqual(result.futureAuthorizationMaterialClasses,[
    "exact_human_binding_evidence_decision_required",
    "bounded_binding_scope_authorization_required",
    "rollback_unbind_plan_required",
    "post_binding_verification_plan_required",
    "submission_actor_binding_authorization_required",
    "web_contact_form_target_binding_authorization_required",
    "submission_mechanism_binding_authorization_required",
    "web_submission_capability_activation_authorization_required",
  ]);
  assert.equal(
    result.futureAuthorizationMaterialClasses.includes(
      "sender_mailbox_binding_authorization_required",
    ),
    false,
  );
  assert.equal(
    result.futureAuthorizationMaterialClasses.includes(
      "email_delivery_provider_binding_authorization_required",
    ),
    false,
  );
  assert.equal(result.semantics.senderMailboxIdentifierIncluded,false);
  assert.equal(result.semantics.submissionMechanismReferenceIncluded,false);
  assert.equal(result.semantics.webSubmissionExecutionAuthorized,false);
  assert.equal(result.semantics.webSubmissionExecutionPerformed,false);
});

test("rejected or deferred UGP-10.26 decisions cannot produce an authorization-preparation specification",()=>{
  const rejected=humanBindingDecision27(
    "email_address",
    "reject_delivery_binding_evidence",
    "binding_context_unclear",
  );
  assert.throws(
    ()=>buildAuthorityOutreachDeliveryBindingAuthorizationPreparationSpecification({
      deliveryBindingEvidenceDecision:rejected.deliveryBindingEvidenceDecision,
      deliveryBindingEvidenceDecisionInput:
        rejected.deliveryBindingEvidenceDecisionInput,
      preparationRequest:authorizationPreparationRequest27(rejected),
    }),
    /ugp_outreach_delivery_binding_authorization_preparation_approved_decision_required/,
  );

  const deferred=humanBindingDecision27(
    "email_address",
    "defer_delivery_binding_evidence_review",
    "evidence_needs_refresh",
  );
  assert.throws(
    ()=>buildAuthorityOutreachDeliveryBindingAuthorizationPreparationSpecification({
      deliveryBindingEvidenceDecision:deferred.deliveryBindingEvidenceDecision,
      deliveryBindingEvidenceDecisionInput:
        deferred.deliveryBindingEvidenceDecisionInput,
      preparationRequest:authorizationPreparationRequest27(deferred),
    }),
    /ugp_outreach_delivery_binding_authorization_preparation_approved_decision_required/,
  );
});

test("UGP-10.27 requires exact UGP-10.26 through-draft lineage",()=>{
  const f=humanBindingDecision27();
  for(const overrides of [
    {deliveryBindingEvidenceDecisionFingerprint:FP("f")},
    {deliveryBindingEvidenceReviewSpecFingerprint:FP("0")},
    {deliveryBindingEvidenceFingerprint:FP("9")},
    {deliveryBindingPreparationSpecFingerprint:FP("8")},
    {selectedContactPointFingerprint:FP("7")},
    {selectedRoleCandidateFingerprint:FP("6")},
    {candidateFingerprint:FP("5")},
  ]){
    assert.throws(
      ()=>buildAuthorityOutreachDeliveryBindingAuthorizationPreparationSpecification({
        deliveryBindingEvidenceDecision:f.deliveryBindingEvidenceDecision,
        deliveryBindingEvidenceDecisionInput:
          f.deliveryBindingEvidenceDecisionInput,
        preparationRequest:authorizationPreparationRequest27(f,overrides),
      }),
      /ugp_outreach_delivery_binding_authorization_preparation_stale_lineage/,
    );
  }
});

test("delivery-binding authorization preparation specification is deterministic and tamper-evident",()=>{
  const f=humanBindingDecision27();
  const input={
    deliveryBindingEvidenceDecision:f.deliveryBindingEvidenceDecision,
    deliveryBindingEvidenceDecisionInput:
      f.deliveryBindingEvidenceDecisionInput,
    preparationRequest:authorizationPreparationRequest27(f),
  };
  const first=
    buildAuthorityOutreachDeliveryBindingAuthorizationPreparationSpecification(
      input,
    );
  const second=
    buildAuthorityOutreachDeliveryBindingAuthorizationPreparationSpecification(
      input,
    );
  assert.deepEqual(second,first);

  const tampered=structuredClone(first);
  Object.assign(tampered,{resultingState:"delivery_binding_authorized"});
  assert.throws(
    ()=>assertAuthorityOutreachDeliveryBindingAuthorizationPreparationSpecIntegrity(
      tampered,
      input,
    ),
    /ugp_outreach_delivery_binding_authorization_preparation_integrity_mismatch/,
  );
});
