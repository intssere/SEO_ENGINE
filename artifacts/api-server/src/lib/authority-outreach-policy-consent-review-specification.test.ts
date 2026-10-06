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
  assertAuthorityOutreachPolicyConsentReviewSpecIntegrity,
  buildAuthorityOutreachPolicyConsentReviewSpecification,
  type AuthorityOutreachPolicyConsentReviewRequest,
} from "./authority-outreach-policy-consent-review-specification.js";

const FP=(c:string)=>c.repeat(64);

function fixture(
  contactOutcome:"contact_point_set"|"no_public_contact_point"
    ="contact_point_set",
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
      "resource_ownership_responsibility",
      "editorial_responsibility",
    ],
    allowedDeliveryChannelTypes:["web_contact_form","email"],
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
      "source_domain_staff_or_team_page",
      "source_domain_author_or_editor_page",
      "source_domain_contact_or_editorial_page",
      "official_organization_profile",
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

  const selected=selectionReviewSpecification.reviewCandidates[0];
  assert.ok(selected);
  const selectionRequestBase={
    selectionReviewSpecFingerprint:
      selectionReviewSpecification.selectionReviewSpecFingerprint,
    candidateFingerprint:selectionReviewSpecification.candidateFingerprint,
    decision:"select_for_contact_verification" as const,
    reasonCode:"role_and_source_evidence_sufficient" as const,
    selectedRoleCandidateFingerprint:selected.roleCandidateFingerprint,
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

  const sourceDomain=contactVerificationSpecification.sourceDomain;
  const email="editor@publisher.example.org";
  const form="https://publisher.example.org/contact/editorial";
  const evidenceRequest:AuthorityOutreachContactPointEvidenceRequest={
    contactVerificationSpecFingerprint:
      contactVerificationSpecification.contactVerificationSpecFingerprint,
    selectedRoleCandidateFingerprint:
      contactVerificationSpecification.selectedRoleCandidateFingerprint,
    candidateFingerprint:contactVerificationSpecification.candidateFingerprint,
    outcome:contactOutcome,
    observations:contactOutcome==="contact_point_set"
      ?[
        {
          contactPointType:"email_address",
          contactPointValue:email,
          evidenceSourceClass:"source_domain_staff_or_author_page",
          evidenceUrl:"https://publisher.example.org/team/alex-editor",
          observedAt:"2026-10-06T12:00:00.000Z",
          contactPointFingerprint:
            authorityOutreachPublicContactPointFingerprint(
              "email_address",
              email,
              sourceDomain,
            ),
          publicBusinessContactAttested:true,
        },
        {
          contactPointType:"web_contact_form",
          contactPointValue:form,
          evidenceSourceClass:"source_domain_contact_page",
          evidenceUrl:"https://publisher.example.org/contact",
          observedAt:"2026-10-06T12:01:00.000Z",
          contactPointFingerprint:
            authorityOutreachPublicContactPointFingerprint(
              "web_contact_form",
              form,
              sourceDomain,
            ),
          publicBusinessContactAttested:true,
        },
      ]
      :[],
  };
  const contactPointEvidenceInput={
    contactVerificationSpecification,
    contactVerificationSpecificationInput,
    evidenceRequest,
  };
  const contactPointEvidence=
    buildAuthorityOutreachContactPointEvidenceContract(
      contactPointEvidenceInput,
    );

  return {
    contactPointEvidence,
    contactPointEvidenceInput,
  };
}

function reviewRequest(
  f:ReturnType<typeof fixture>,
  overrides:Partial<AuthorityOutreachPolicyConsentReviewRequest>={},
):AuthorityOutreachPolicyConsentReviewRequest{
  return {
    contactPointEvidenceFingerprint:
      f.contactPointEvidence.contactPointEvidenceFingerprint,
    selectedRoleCandidateFingerprint:
      f.contactPointEvidence.selectedRoleCandidateFingerprint,
    candidateFingerprint:f.contactPointEvidence.candidateFingerprint,
    ...overrides,
  };
}

test("validated public contact-point set becomes human policy-consent review ready only",()=>{
  const f=fixture();
  const input={
    contactPointEvidence:f.contactPointEvidence,
    contactPointEvidenceInput:f.contactPointEvidenceInput,
    reviewRequest:reviewRequest(f),
  };
  const result=buildAuthorityOutreachPolicyConsentReviewSpecification(input);

  assert.equal(result.resultingState,"policy_consent_review_ready");
  assert.equal(
    result.contactPointEvidenceFingerprint,
    f.contactPointEvidence.contactPointEvidenceFingerprint,
  );
  assert.equal(result.contactPointCount,2);
  assert.deepEqual(
    result.reviewContactPoints,
    f.contactPointEvidence.validatedContactPoints,
  );
  assert.deepEqual(result.allowedFutureDecisions,[
    "approve_for_deliverability_verification_preparation",
    "defer_policy_consent_review",
    "reject_contact_point_set",
  ]);
  assert.equal(
    result.futureDecisionConfirmationPrefix,
    "REVIEW_OUTREACH_POLICY_CONSENT",
  );
  assert.equal(
    result.reviewRequirements.priorOptOutOrSuppressionReviewRequired,
    true,
  );
  assert.equal(
    result.reviewRequirements.noImplicitConsentInference,
    true,
  );
  assert.equal(
    result.reviewRequirements.noAutomaticLegalComplianceDetermination,
    true,
  );
  assert.equal(result.semantics.humanPolicyConsentReviewRequired,true);
  assert.equal(result.semantics.policyConsentReviewPreparationOnly,true);
  assert.equal(result.semantics.policyConsentDecisionRecorded,false);
  assert.equal(result.semantics.policyConsentApprovalGranted,false);
  assert.equal(result.semantics.contactPointSelectionAuthorized,false);
  assert.equal(result.semantics.consentInferred,false);
  assert.equal(
    result.semantics.legalComplianceDeterminationPerformed,
    false,
  );
  assert.equal(result.semantics.legalComplianceGuaranteed,false);
  assert.equal(result.semantics.deliverabilityVerificationAuthorized,false);
  assert.equal(result.semantics.verificationProviderCallAuthorized,false);
  assert.equal(result.semantics.sendAuthorizationGranted,false);
  assert.equal(result.semantics.performsNetworkOperation,false);
  assert.equal(result.semantics.performsPersistence,false);

  assertAuthorityOutreachPolicyConsentReviewSpecIntegrity(result,input);
});

test("policy-consent review freezes exact contact-point set deterministically",()=>{
  const f=fixture();
  const input={
    contactPointEvidence:f.contactPointEvidence,
    contactPointEvidenceInput:f.contactPointEvidenceInput,
    reviewRequest:reviewRequest(f),
  };
  const first=buildAuthorityOutreachPolicyConsentReviewSpecification(input);
  const second=buildAuthorityOutreachPolicyConsentReviewSpecification(input);

  assert.deepEqual(second,first);
  assert.deepEqual(
    first.reviewContactPoints.map(item=>item.contactPointFingerprint),
    f.contactPointEvidence.validatedContactPoints.map(
      item=>item.contactPointFingerprint,
    ),
  );
});

test("no-public-contact-point evidence cannot create a policy-consent review",()=>{
  const f=fixture("no_public_contact_point");
  assert.throws(
    ()=>buildAuthorityOutreachPolicyConsentReviewSpecification({
      contactPointEvidence:f.contactPointEvidence,
      contactPointEvidenceInput:f.contactPointEvidenceInput,
      reviewRequest:reviewRequest(f),
    }),
    /ugp_outreach_policy_consent_review_spec_contact_point_set_required/,
  );
});

test("stale contact-point evidence, selected candidate, or draft lineage fails closed",()=>{
  const f=fixture();
  for(const request of [
    reviewRequest(f,{contactPointEvidenceFingerprint:FP("f")}),
    reviewRequest(f,{selectedRoleCandidateFingerprint:FP("0")}),
    reviewRequest(f,{candidateFingerprint:FP("9")}),
  ]){
    assert.throws(
      ()=>buildAuthorityOutreachPolicyConsentReviewSpecification({
        contactPointEvidence:f.contactPointEvidence,
        contactPointEvidenceInput:f.contactPointEvidenceInput,
        reviewRequest:request,
      }),
      /ugp_outreach_policy_consent_review_spec_stale_lineage/,
    );
  }
});

test("policy-consent review specification is tamper-evident",()=>{
  const f=fixture();
  const input={
    contactPointEvidence:f.contactPointEvidence,
    contactPointEvidenceInput:f.contactPointEvidenceInput,
    reviewRequest:reviewRequest(f),
  };
  const result=buildAuthorityOutreachPolicyConsentReviewSpecification(input);
  const tampered=structuredClone(result);
  Object.assign(tampered,{resultingState:"send_authorized"});
  assert.throws(
    ()=>assertAuthorityOutreachPolicyConsentReviewSpecIntegrity(
      tampered,
      input,
    ),
    /ugp_outreach_policy_consent_review_spec_integrity_mismatch/,
  );
});
