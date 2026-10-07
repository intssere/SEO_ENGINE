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
import {
  assertAuthorityOutreachDeliverabilityEvidenceIntegrity,
  buildAuthorityOutreachDeliverabilityEvidenceContract,
  type AuthorityOutreachDeliverabilityEvidenceObservationOutcome,
  type AuthorityOutreachDeliverabilityEvidenceRequest,
  type AuthorityOutreachSuppliedDeliverabilityEvidenceObservation,
} from "./authority-outreach-deliverability-evidence-validation.js";

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

test("complete supplied email verification evidence validates without executing verification",()=>{
  const f=prepared("email_address");
  const input={
    deliverabilityPreparation:f.deliverabilityPreparation,
    deliverabilityPreparationInput:f.deliverabilityPreparationInput,
    evidenceRequest:evidenceRequest(f),
  };
  const result=buildAuthorityOutreachDeliverabilityEvidenceContract(input);

  assert.equal(
    result.resultingState,
    "deliverability_verification_evidence_validated",
  );
  assert.equal(
    result.evidenceDisposition,
    "deliverability_evidence_supporting",
  );
  assert.equal(result.evidenceCount,2);
  assert.deepEqual(
    result.verificationMethodClasses,
    [
      "email_domain_mail_exchange_presence",
      "email_external_deliverability_assessment",
    ],
  );
  assert.equal(
    result.semantics.suppliedTechnicalEvidenceValidationOnly,
    true,
  );
  assert.equal(
    result.semantics.independentTechnicalVerificationPerformed,
    false,
  );
  assert.equal(result.semantics.technicalEvidencePayloadIncluded,false);
  assert.equal(result.semantics.domainResolutionPerformed,false);
  assert.equal(result.semantics.mailExchangeLookupPerformed,false);
  assert.equal(result.semantics.verificationProviderCallPerformed,false);
  assert.equal(result.semantics.mailboxProbePerformed,false);
  assert.equal(result.semantics.sendAuthorizationGranted,false);
  assert.equal(result.semantics.performsNetworkOperation,false);
  assert.equal(result.semantics.performsPersistence,false);

  assertAuthorityOutreachDeliverabilityEvidenceIntegrity(result,input);
});

test("web-form evidence disposition is contradictory when any supplied observation contradicts reachability",()=>{
  const f=prepared("web_contact_form");
  const result=buildAuthorityOutreachDeliverabilityEvidenceContract({
    deliverabilityPreparation:f.deliverabilityPreparation,
    deliverabilityPreparationInput:f.deliverabilityPreparationInput,
    evidenceRequest:evidenceRequest(f,{
      observations:suppliedObservations(
        f,
        ["supports_reachability","contradicts_reachability"],
      ),
    }),
  });

  assert.deepEqual(result.verificationMethodClasses,[
    "web_form_https_reachability",
    "web_form_presence_assessment",
  ]);
  assert.equal(
    result.evidenceDisposition,
    "deliverability_evidence_contradictory",
  );
  assert.equal(result.semantics.endpointReachabilityCheckPerformed,false);
});

test("supplied evidence becomes inconclusive unless every required method supports reachability",()=>{
  const f=prepared();
  const result=buildAuthorityOutreachDeliverabilityEvidenceContract({
    deliverabilityPreparation:f.deliverabilityPreparation,
    deliverabilityPreparationInput:f.deliverabilityPreparationInput,
    evidenceRequest:evidenceRequest(f,{
      observations:suppliedObservations(
        f,
        ["supports_reachability","inconclusive"],
      ),
    }),
  });
  assert.equal(
    result.evidenceDisposition,
    "deliverability_evidence_inconclusive",
  );
});

test("the complete exact UGP-10.19 verification-method set is required",()=>{
  const f=prepared();
  const observations=suppliedObservations(f);
  assert.throws(
    ()=>buildAuthorityOutreachDeliverabilityEvidenceContract({
      deliverabilityPreparation:f.deliverabilityPreparation,
      deliverabilityPreparationInput:f.deliverabilityPreparationInput,
      evidenceRequest:evidenceRequest(f,{
        observations:[observations[0]!],
      }),
    }),
    /ugp_outreach_deliverability_evidence_complete_method_set_required/,
  );

  assert.throws(
    ()=>buildAuthorityOutreachDeliverabilityEvidenceContract({
      deliverabilityPreparation:f.deliverabilityPreparation,
      deliverabilityPreparationInput:f.deliverabilityPreparationInput,
      evidenceRequest:evidenceRequest(f,{
        observations:[observations[0]!,{
          ...observations[1]!,
          methodClass:observations[0]!.methodClass,
        }],
      }),
    }),
    /ugp_outreach_deliverability_evidence_duplicate_method/,
  );
});

test("stale preparation, contact-point, role-candidate, or draft lineage fails closed",()=>{
  const f=prepared();
  for(const request of [
    evidenceRequest(f,{deliverabilityPreparationFingerprint:FP("f")}),
    evidenceRequest(f,{selectedContactPointFingerprint:FP("0")}),
    evidenceRequest(f,{selectedRoleCandidateFingerprint:FP("9")}),
    evidenceRequest(f,{candidateFingerprint:FP("8")}),
  ]){
    assert.throws(
      ()=>buildAuthorityOutreachDeliverabilityEvidenceContract({
        deliverabilityPreparation:f.deliverabilityPreparation,
        deliverabilityPreparationInput:f.deliverabilityPreparationInput,
        evidenceRequest:request,
      }),
      /ugp_outreach_deliverability_evidence_stale_lineage/,
    );
  }
});

test("timestamps, technical fingerprints, attestation, outcomes, and method membership fail closed",()=>{
  const f=prepared();
  const base=suppliedObservations(f);
  const invalids=[
    [{...base[0]!,observedAt:"2026-10-06T14:00:00Z"},base[1]!],
    [{...base[0]!,technicalEvidenceFingerprint:"not-a-fingerprint"},base[1]!],
    [{
      ...base[0]!,
      publicBusinessTechnicalEvidenceAttested:false,
    },base[1]!],
    [{
      ...base[0]!,
      observationOutcome:"verified",
    },base[1]!],
    [{
      ...base[0]!,
      methodClass:"web_form_https_reachability",
    },base[1]!],
  ];

  for(const observations of invalids){
    assert.throws(
      ()=>buildAuthorityOutreachDeliverabilityEvidenceContract({
        deliverabilityPreparation:f.deliverabilityPreparation,
        deliverabilityPreparationInput:f.deliverabilityPreparationInput,
        evidenceRequest:evidenceRequest(f,{
          observations:
            observations as unknown as
              readonly AuthorityOutreachSuppliedDeliverabilityEvidenceObservation[],
        }),
      }),
      /ugp_outreach_deliverability_evidence_/,
    );
  }
});

test("one technical evidence fingerprint cannot satisfy multiple required methods",()=>{
  const f=prepared();
  const observations=suppliedObservations(f);
  assert.throws(
    ()=>buildAuthorityOutreachDeliverabilityEvidenceContract({
      deliverabilityPreparation:f.deliverabilityPreparation,
      deliverabilityPreparationInput:f.deliverabilityPreparationInput,
      evidenceRequest:evidenceRequest(f,{
        observations:[
          observations[0]!,
          {
            ...observations[1]!,
            technicalEvidenceFingerprint:
              observations[0]!.technicalEvidenceFingerprint,
          },
        ],
      }),
    }),
    /ugp_outreach_deliverability_evidence_duplicate_technical_evidence/,
  );
});

test("deliverability evidence validation is canonical, deterministic, and tamper-evident",()=>{
  const f=prepared();
  const input={
    deliverabilityPreparation:f.deliverabilityPreparation,
    deliverabilityPreparationInput:f.deliverabilityPreparationInput,
    evidenceRequest:evidenceRequest(f),
  };
  const first=buildAuthorityOutreachDeliverabilityEvidenceContract(input);
  const reversed=buildAuthorityOutreachDeliverabilityEvidenceContract({
    ...input,
    evidenceRequest:evidenceRequest(f,{
      observations:[...suppliedObservations(f)].reverse(),
    }),
  });
  assert.deepEqual(reversed,first);

  const tampered=structuredClone(first);
  Object.assign(tampered,{evidenceDisposition:"deliverability_verified"});
  assert.throws(
    ()=>assertAuthorityOutreachDeliverabilityEvidenceIntegrity(
      tampered,
      input,
    ),
    /ugp_outreach_deliverability_evidence_integrity_mismatch/,
  );
});
