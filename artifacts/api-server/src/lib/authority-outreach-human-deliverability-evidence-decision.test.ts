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
){
  const f=evidenceFixture(outcomes);
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

test("human may approve supporting evidence for provider-mailbox-binding preparation eligibility only",()=>{
  const f=reviewFixture();
  const request=decisionRequest(
    f,
    "approve_for_provider_mailbox_binding_preparation",
    "evidence_sufficient_for_binding_preparation",
  );
  const input={
    deliverabilityEvidenceReviewSpecification:
      f.deliverabilityEvidenceReviewSpecification,
    deliverabilityEvidenceReviewSpecificationInput:
      f.deliverabilityEvidenceReviewSpecificationInput,
    decisionRequest:request,
    reviewerId:"operator@example.com",
    reviewedAt:"2026-10-06T15:00:00.000Z",
  };
  const result=
    prepareAuthorityOutreachHumanDeliverabilityEvidenceDecision(input);

  assert.equal(
    result.resultingState,
    "provider_mailbox_binding_preparation_eligible",
  );
  assert.equal(
    result.evidenceDisposition,
    "deliverability_evidence_supporting",
  );
  assert.equal(result.semantics.humanDecision,true);
  assert.equal(result.semantics.eligibilityOnly,true);
  assert.equal(result.semantics.deliverabilityEvidenceDecisionRecorded,true);
  assert.equal(result.semantics.deliverabilityEvidenceApprovalGranted,true);
  assert.equal(
    result.semantics.providerMailboxBindingPreparationEligibilityGranted,
    true,
  );
  assert.equal(
    result.semantics.providerMailboxBindingPreparationExecuted,
    false,
  );
  assert.equal(result.semantics.providerBindingAuthorized,false);
  assert.equal(result.semantics.providerBindingPerformed,false);
  assert.equal(result.semantics.mailboxBindingAuthorized,false);
  assert.equal(result.semantics.mailboxAccessAuthorized,false);
  assert.equal(result.semantics.providerCredentialIncluded,false);
  assert.equal(result.semantics.sendAuthorizationGranted,false);
  assert.equal(result.semantics.performsNetworkOperation,false);
  assert.equal(result.semantics.performsPersistence,false);

  assertAuthorityOutreachHumanDeliverabilityEvidenceDecisionIntegrity(
    result,
    input,
  );
});

test("supporting evidence may be rejected or deferred without preparation eligibility",()=>{
  const rejectedFixture=reviewFixture();
  const rejected=
    prepareAuthorityOutreachHumanDeliverabilityEvidenceDecision({
      deliverabilityEvidenceReviewSpecification:
        rejectedFixture.deliverabilityEvidenceReviewSpecification,
      deliverabilityEvidenceReviewSpecificationInput:
        rejectedFixture.deliverabilityEvidenceReviewSpecificationInput,
      decisionRequest:decisionRequest(
        rejectedFixture,
        "reject_deliverability_evidence",
        "technical_method_context_unclear",
      ),
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-06T15:01:00.000Z",
    });
  assert.equal(rejected.resultingState,"deliverability_evidence_rejected");
  assert.equal(rejected.semantics.deliverabilityEvidenceApprovalGranted,false);
  assert.equal(
    rejected.semantics.providerMailboxBindingPreparationEligibilityGranted,
    false,
  );

  const deferredFixture=reviewFixture();
  const deferred=
    prepareAuthorityOutreachHumanDeliverabilityEvidenceDecision({
      deliverabilityEvidenceReviewSpecification:
        deferredFixture.deliverabilityEvidenceReviewSpecification,
      deliverabilityEvidenceReviewSpecificationInput:
        deferredFixture.deliverabilityEvidenceReviewSpecificationInput,
      decisionRequest:decisionRequest(
        deferredFixture,
        "defer_deliverability_evidence_review",
        "evidence_needs_refresh",
      ),
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-06T15:02:00.000Z",
    });
  assert.equal(deferred.resultingState,"deliverability_evidence_deferred");
  assert.equal(deferred.semantics.deliverabilityEvidenceApprovalGranted,false);
  assert.equal(deferred.semantics.sendAuthorizationGranted,false);
});

test("contradictory and inconclusive evidence cannot be approved",()=>{
  for(const outcomes of [
    ["supports_reachability","contradicts_reachability"] as const,
    ["supports_reachability","inconclusive"] as const,
  ]){
    const f=reviewFixture(outcomes);
    assert.throws(
      ()=>prepareAuthorityOutreachHumanDeliverabilityEvidenceDecision({
        deliverabilityEvidenceReviewSpecification:
          f.deliverabilityEvidenceReviewSpecification,
        deliverabilityEvidenceReviewSpecificationInput:
          f.deliverabilityEvidenceReviewSpecificationInput,
        decisionRequest:decisionRequest(
          f,
          "approve_for_provider_mailbox_binding_preparation",
          "evidence_sufficient_for_binding_preparation",
        ),
        reviewerId:"operator@example.com",
        reviewedAt:"2026-10-06T15:03:00.000Z",
      }),
      /ugp_outreach_human_deliverability_evidence_decision_not_allowed/,
    );
  }
});

test("decision-specific reason codes fail closed",()=>{
  const supporting=reviewFixture();
  assert.throws(
    ()=>prepareAuthorityOutreachHumanDeliverabilityEvidenceDecision({
      deliverabilityEvidenceReviewSpecification:
        supporting.deliverabilityEvidenceReviewSpecification,
      deliverabilityEvidenceReviewSpecificationInput:
        supporting.deliverabilityEvidenceReviewSpecificationInput,
      decisionRequest:decisionRequest(
        supporting,
        "approve_for_provider_mailbox_binding_preparation",
        "evidence_needs_refresh",
      ),
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-06T15:04:00.000Z",
    }),
    /ugp_outreach_human_deliverability_evidence_decision_approval_reason_invalid/,
  );

  const contradictory=reviewFixture(
    ["supports_reachability","contradicts_reachability"],
  );
  assert.throws(
    ()=>prepareAuthorityOutreachHumanDeliverabilityEvidenceDecision({
      deliverabilityEvidenceReviewSpecification:
        contradictory.deliverabilityEvidenceReviewSpecification,
      deliverabilityEvidenceReviewSpecificationInput:
        contradictory.deliverabilityEvidenceReviewSpecificationInput,
      decisionRequest:decisionRequest(
        contradictory,
        "reject_deliverability_evidence",
        "evidence_needs_refresh",
      ),
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-06T15:04:00.000Z",
    }),
    /ugp_outreach_human_deliverability_evidence_decision_reject_reason_invalid/,
  );

  const inconclusive=reviewFixture(
    ["supports_reachability","inconclusive"],
  );
  assert.throws(
    ()=>prepareAuthorityOutreachHumanDeliverabilityEvidenceDecision({
      deliverabilityEvidenceReviewSpecification:
        inconclusive.deliverabilityEvidenceReviewSpecification,
      deliverabilityEvidenceReviewSpecificationInput:
        inconclusive.deliverabilityEvidenceReviewSpecificationInput,
      decisionRequest:decisionRequest(
        inconclusive,
        "defer_deliverability_evidence_review",
        "inconclusive_technical_evidence",
      ),
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-06T15:04:00.000Z",
    }),
    /ugp_outreach_human_deliverability_evidence_decision_defer_reason_invalid/,
  );
});

test("exact review, evidence, contact-point, role-candidate, and draft lineage are required",()=>{
  const f=reviewFixture();
  for(const overrides of [
    {deliverabilityEvidenceReviewSpecFingerprint:FP("f")},
    {deliverabilityEvidenceFingerprint:FP("0")},
    {selectedContactPointFingerprint:FP("9")},
    {selectedRoleCandidateFingerprint:FP("8")},
    {candidateFingerprint:FP("7")},
  ]){
    assert.throws(
      ()=>prepareAuthorityOutreachHumanDeliverabilityEvidenceDecision({
        deliverabilityEvidenceReviewSpecification:
          f.deliverabilityEvidenceReviewSpecification,
        deliverabilityEvidenceReviewSpecificationInput:
          f.deliverabilityEvidenceReviewSpecificationInput,
        decisionRequest:decisionRequest(
          f,
          "approve_for_provider_mailbox_binding_preparation",
          "evidence_sufficient_for_binding_preparation",
          overrides,
        ),
        reviewerId:"operator@example.com",
        reviewedAt:"2026-10-06T15:05:00.000Z",
      }),
      /ugp_outreach_human_deliverability_evidence_decision_stale_lineage/,
    );
  }
});

test("exact confirmation, reviewer identity, and canonical timestamp are required",()=>{
  const f=reviewFixture();
  const request=decisionRequest(
    f,
    "defer_deliverability_evidence_review",
    "needs_more_technical_context",
  );

  assert.throws(
    ()=>prepareAuthorityOutreachHumanDeliverabilityEvidenceDecision({
      deliverabilityEvidenceReviewSpecification:
        f.deliverabilityEvidenceReviewSpecification,
      deliverabilityEvidenceReviewSpecificationInput:
        f.deliverabilityEvidenceReviewSpecificationInput,
      decisionRequest:{...request,confirmation:"APPROVE"},
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-06T15:06:00.000Z",
    }),
    /ugp_outreach_human_deliverability_evidence_decision_explicit_confirmation_required/,
  );

  assert.throws(
    ()=>prepareAuthorityOutreachHumanDeliverabilityEvidenceDecision({
      deliverabilityEvidenceReviewSpecification:
        f.deliverabilityEvidenceReviewSpecification,
      deliverabilityEvidenceReviewSpecificationInput:
        f.deliverabilityEvidenceReviewSpecificationInput,
      decisionRequest:request,
      reviewerId:" operator@example.com ",
      reviewedAt:"2026-10-06T15:06:00.000Z",
    }),
    /ugp_outreach_human_deliverability_evidence_decision_invalid_reviewer/,
  );

  assert.throws(
    ()=>prepareAuthorityOutreachHumanDeliverabilityEvidenceDecision({
      deliverabilityEvidenceReviewSpecification:
        f.deliverabilityEvidenceReviewSpecification,
      deliverabilityEvidenceReviewSpecificationInput:
        f.deliverabilityEvidenceReviewSpecificationInput,
      decisionRequest:request,
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-06T15:06:00Z",
    }),
    /ugp_outreach_human_deliverability_evidence_decision_invalid_reviewed_at/,
  );
});

test("human deliverability-evidence decision is deterministic and tamper-evident",()=>{
  const f=reviewFixture();
  const input={
    deliverabilityEvidenceReviewSpecification:
      f.deliverabilityEvidenceReviewSpecification,
    deliverabilityEvidenceReviewSpecificationInput:
      f.deliverabilityEvidenceReviewSpecificationInput,
    decisionRequest:decisionRequest(
      f,
      "approve_for_provider_mailbox_binding_preparation",
      "evidence_sufficient_for_binding_preparation",
    ),
    reviewerId:"operator@example.com",
    reviewedAt:"2026-10-06T15:07:00.000Z",
  };
  const first=
    prepareAuthorityOutreachHumanDeliverabilityEvidenceDecision(input);
  const second=
    prepareAuthorityOutreachHumanDeliverabilityEvidenceDecision(input);
  assert.deepEqual(second,first);

  const tampered=structuredClone(first);
  Object.assign(tampered,{resultingState:"send_authorized"});
  assert.throws(
    ()=>assertAuthorityOutreachHumanDeliverabilityEvidenceDecisionIntegrity(
      tampered,
      input,
    ),
    /ugp_outreach_human_deliverability_evidence_decision_integrity_mismatch/,
  );
});
