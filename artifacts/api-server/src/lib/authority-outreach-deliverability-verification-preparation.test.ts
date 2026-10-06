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
  assertAuthorityOutreachDeliverabilityPreparationIntegrity,
  buildAuthorityOutreachDeliverabilityVerificationPreparation,
  type AuthorityOutreachDeliverabilityVerificationPreparationRequest,
} from "./authority-outreach-deliverability-verification-preparation.js";

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
  overrides:
    Partial<AuthorityOutreachDeliverabilityVerificationPreparationRequest>
      ={},
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
    ...overrides,
  };
}

test("approved email contact point becomes provider-free deliverability preparation only",()=>{
  const f=fixture("email_address");
  const input={
    policyConsentDecision:f.policyConsentDecision,
    policyConsentDecisionInput:f.policyConsentDecisionInput,
    preparationRequest:preparationRequest(f),
  };
  const result=
    buildAuthorityOutreachDeliverabilityVerificationPreparation(input);

  assert.equal(
    result.resultingState,
    "deliverability_verification_preparation_spec_ready",
  );
  assert.equal(
    result.selectedContactPoint.contactPointType,
    "email_address",
  );
  assert.deepEqual(result.allowedVerificationMethodClasses,[
    "email_domain_mail_exchange_presence",
    "email_external_deliverability_assessment",
  ]);
  assert.equal(result.preparationPolicy.maxVerificationMethodClasses,2);
  assert.equal(result.preparationPolicy.verificationExecutionAllowed,false);
  assert.equal(result.preparationPolicy.verificationProviderCallAllowed,false);
  assert.equal(result.preparationPolicy.mailboxProbeAllowed,false);
  assert.equal(result.preparationPolicy.messageTransmissionAllowed,false);
  assert.equal(
    result.semantics.deliverabilityVerificationPreparationSpecificationOnly,
    true,
  );
  assert.equal(result.semantics.actualVerificationResultIncluded,false);
  assert.equal(result.semantics.deliverabilityVerificationAuthorized,false);
  assert.equal(result.semantics.domainResolutionAuthorized,false);
  assert.equal(result.semantics.mailExchangeLookupAuthorized,false);
  assert.equal(result.semantics.verificationProviderCallAuthorized,false);
  assert.equal(result.semantics.mailboxProbeAuthorized,false);
  assert.equal(result.semantics.sendAuthorizationGranted,false);
  assert.equal(result.semantics.performsNetworkOperation,false);
  assert.equal(result.semantics.performsPersistence,false);

  assertAuthorityOutreachDeliverabilityPreparationIntegrity(result,input);
});

test("approved web form derives only web-form verification method classes",()=>{
  const f=fixture("web_contact_form");
  const result=
    buildAuthorityOutreachDeliverabilityVerificationPreparation({
      policyConsentDecision:f.policyConsentDecision,
      policyConsentDecisionInput:f.policyConsentDecisionInput,
      preparationRequest:preparationRequest(f),
    });

  assert.equal(
    result.selectedContactPoint.contactPointType,
    "web_contact_form",
  );
  assert.deepEqual(result.allowedVerificationMethodClasses,[
    "web_form_https_reachability",
    "web_form_presence_assessment",
  ]);
  assert.equal(result.semantics.endpointReachabilityCheckAuthorized,false);
  assert.equal(result.semantics.outreachSendingAuthorized,false);
});

test("stale decision, contact-point, selected-role, or draft lineage fails closed",()=>{
  const f=fixture();
  for(const request of [
    preparationRequest(f,{policyConsentDecisionFingerprint:FP("f")}),
    preparationRequest(f,{selectedContactPointFingerprint:FP("0")}),
    preparationRequest(f,{selectedRoleCandidateFingerprint:FP("9")}),
    preparationRequest(f,{candidateFingerprint:FP("8")}),
  ]){
    assert.throws(
      ()=>buildAuthorityOutreachDeliverabilityVerificationPreparation({
        policyConsentDecision:f.policyConsentDecision,
        policyConsentDecisionInput:f.policyConsentDecisionInput,
        preparationRequest:request,
      }),
      /ugp_outreach_deliverability_preparation_stale_lineage/,
    );
  }
});

test("rejected or deferred policy-consent decisions cannot prepare deliverability verification",()=>{
  for(const decision of [
    "reject_contact_point_set" as const,
    "defer_policy_consent_review" as const,
  ]){
    const f=fixture("email_address",decision);
    assert.throws(
      ()=>buildAuthorityOutreachDeliverabilityVerificationPreparation({
        policyConsentDecision:f.policyConsentDecision,
        policyConsentDecisionInput:f.policyConsentDecisionInput,
        preparationRequest:{
          policyConsentDecisionFingerprint:
            f.policyConsentDecision.policyConsentDecisionFingerprint,
          selectedContactPointFingerprint:FP("1"),
          selectedRoleCandidateFingerprint:
            f.policyConsentDecision.selectedRoleCandidateFingerprint,
          candidateFingerprint:f.policyConsentDecision.candidateFingerprint,
        },
      }),
      /ugp_outreach_deliverability_preparation_eligible_decision_required/,
    );
  }
});

test("deliverability preparation is deterministic and tamper-evident",()=>{
  const f=fixture();
  const input={
    policyConsentDecision:f.policyConsentDecision,
    policyConsentDecisionInput:f.policyConsentDecisionInput,
    preparationRequest:preparationRequest(f),
  };
  const first=
    buildAuthorityOutreachDeliverabilityVerificationPreparation(input);
  const second=
    buildAuthorityOutreachDeliverabilityVerificationPreparation(input);
  assert.deepEqual(second,first);

  const tampered=structuredClone(first);
  Object.assign(tampered,{resultingState:"deliverability_verified"});
  assert.throws(
    ()=>assertAuthorityOutreachDeliverabilityPreparationIntegrity(
      tampered,
      input,
    ),
    /ugp_outreach_deliverability_preparation_integrity_mismatch/,
  );
});
