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
  assertAuthorityOutreachHumanPolicyConsentDecisionIntegrity,
  prepareAuthorityOutreachHumanPolicyConsentDecision,
  type AuthorityOutreachHumanPolicyConsentDecisionRequest,
} from "./authority-outreach-human-policy-consent-decision.js";

const FP=(c:string)=>c.repeat(64);

function fixture(){
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

  const sourceDomain=contactVerificationSpecification.sourceDomain;
  const email="editor@publisher.example.org";
  const form="https://publisher.example.org/contact/editorial";
  const contactPointEvidenceRequest:AuthorityOutreachContactPointEvidenceRequest={
    contactVerificationSpecFingerprint:
      contactVerificationSpecification.contactVerificationSpecFingerprint,
    selectedRoleCandidateFingerprint:
      contactVerificationSpecification.selectedRoleCandidateFingerprint,
    candidateFingerprint:contactVerificationSpecification.candidateFingerprint,
    outcome:"contact_point_set",
    observations:[
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
    ],
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

  return {
    policyConsentReviewSpecification,
    policyConsentReviewSpecificationInput,
  };
}

function decisionRequest(
  f:ReturnType<typeof fixture>,
  decision:AuthorityOutreachHumanPolicyConsentDecisionRequest["decision"],
  reasonCode:
    AuthorityOutreachHumanPolicyConsentDecisionRequest["reasonCode"],
  selectedContactPointFingerprint:string|null,
):AuthorityOutreachHumanPolicyConsentDecisionRequest{
  const base={
    policyConsentReviewSpecFingerprint:
      f.policyConsentReviewSpecification.policyConsentReviewSpecFingerprint,
    selectedRoleCandidateFingerprint:
      f.policyConsentReviewSpecification.selectedRoleCandidateFingerprint,
    candidateFingerprint:
      f.policyConsentReviewSpecification.candidateFingerprint,
    decision,
    reasonCode,
    selectedContactPointFingerprint,
  };
  return {
    ...base,
    confirmation:[
      "REVIEW_OUTREACH_POLICY_CONSENT",
      decision,
      selectedContactPointFingerprint??"NONE",
      base.policyConsentReviewSpecFingerprint,
      base.selectedRoleCandidateFingerprint,
      base.candidateFingerprint,
    ].join(":"),
  };
}

test("human may approve exactly one reviewed contact point for deliverability-verification preparation eligibility only",()=>{
  const f=fixture();
  const selected=f.policyConsentReviewSpecification.reviewContactPoints[0];
  assert.ok(selected);

  const request=decisionRequest(
    f,
    "approve_for_deliverability_verification_preparation",
    "policy_and_context_review_sufficient",
    selected.contactPointFingerprint,
  );
  const input={
    policyConsentReviewSpecification:f.policyConsentReviewSpecification,
    policyConsentReviewSpecificationInput:
      f.policyConsentReviewSpecificationInput,
    decisionRequest:request,
    reviewerId:"operator@example.com",
    reviewedAt:"2026-10-06T13:00:00.000Z",
  };
  const result=prepareAuthorityOutreachHumanPolicyConsentDecision(input);

  assert.equal(
    result.resultingState,
    "deliverability_verification_preparation_eligible",
  );
  assert.equal(
    result.selectedContactPointFingerprint,
    selected.contactPointFingerprint,
  );
  assert.deepEqual(result.selectedContactPoint,selected);
  assert.equal(result.semantics.humanDecision,true);
  assert.equal(result.semantics.eligibilityOnly,true);
  assert.equal(result.semantics.policyConsentDecisionRecorded,true);
  assert.equal(result.semantics.policyConsentApprovalGranted,true);
  assert.equal(result.semantics.humanContactPointSelectionPerformed,true);
  assert.equal(
    result.semantics.deliverabilityVerificationPreparationEligibilityGranted,
    true,
  );
  assert.equal(
    result.semantics.deliverabilityVerificationPreparationExecuted,
    false,
  );
  assert.equal(result.semantics.consentInferred,false);
  assert.equal(
    result.semantics.legalComplianceDeterminationPerformed,
    false,
  );
  assert.equal(result.semantics.legalComplianceGuaranteed,false);
  assert.equal(result.semantics.deliverabilityVerificationAuthorized,false);
  assert.equal(result.semantics.verificationProviderCallAuthorized,false);
  assert.equal(result.semantics.mailboxProbeAuthorized,false);
  assert.equal(result.semantics.sendAuthorizationGranted,false);
  assert.equal(result.semantics.performsNetworkOperation,false);
  assert.equal(result.semantics.performsPersistence,false);

  assertAuthorityOutreachHumanPolicyConsentDecisionIntegrity(result,input);
});

test("reject and defer decisions carry no selected contact point or approval eligibility",()=>{
  const rejectedFixture=fixture();
  const rejected=prepareAuthorityOutreachHumanPolicyConsentDecision({
    policyConsentReviewSpecification:
      rejectedFixture.policyConsentReviewSpecification,
    policyConsentReviewSpecificationInput:
      rejectedFixture.policyConsentReviewSpecificationInput,
    decisionRequest:decisionRequest(
      rejectedFixture,
      "reject_contact_point_set",
      "prior_opt_out_or_suppression_concern",
      null,
    ),
    reviewerId:"operator@example.com",
    reviewedAt:"2026-10-06T13:01:00.000Z",
  });
  assert.equal(rejected.resultingState,"policy_consent_rejected");
  assert.equal(rejected.selectedContactPoint,null);
  assert.equal(rejected.selectedContactPointFingerprint,null);
  assert.equal(rejected.semantics.policyConsentApprovalGranted,false);
  assert.equal(
    rejected.semantics.deliverabilityVerificationPreparationEligibilityGranted,
    false,
  );

  const deferredFixture=fixture();
  const deferred=prepareAuthorityOutreachHumanPolicyConsentDecision({
    policyConsentReviewSpecification:
      deferredFixture.policyConsentReviewSpecification,
    policyConsentReviewSpecificationInput:
      deferredFixture.policyConsentReviewSpecificationInput,
    decisionRequest:decisionRequest(
      deferredFixture,
      "defer_policy_consent_review",
      "needs_more_policy_context",
      null,
    ),
    reviewerId:"operator@example.com",
    reviewedAt:"2026-10-06T13:02:00.000Z",
  });
  assert.equal(deferred.resultingState,"policy_consent_deferred");
  assert.equal(deferred.selectedContactPoint,null);
  assert.equal(deferred.semantics.policyConsentApprovalGranted,false);
  assert.equal(deferred.semantics.sendAuthorizationGranted,false);
});

test("approval requires exact reviewed contact-point membership and approval reason",()=>{
  const f=fixture();

  assert.throws(
    ()=>prepareAuthorityOutreachHumanPolicyConsentDecision({
      policyConsentReviewSpecification:f.policyConsentReviewSpecification,
      policyConsentReviewSpecificationInput:
        f.policyConsentReviewSpecificationInput,
      decisionRequest:decisionRequest(
        f,
        "approve_for_deliverability_verification_preparation",
        "policy_and_context_review_sufficient",
        FP("f"),
      ),
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-06T13:03:00.000Z",
    }),
    /ugp_outreach_human_policy_consent_decision_contact_point_not_in_review_set/,
  );

  const selected=f.policyConsentReviewSpecification.reviewContactPoints[0];
  assert.ok(selected);
  assert.throws(
    ()=>prepareAuthorityOutreachHumanPolicyConsentDecision({
      policyConsentReviewSpecification:f.policyConsentReviewSpecification,
      policyConsentReviewSpecificationInput:
        f.policyConsentReviewSpecificationInput,
      decisionRequest:decisionRequest(
        f,
        "approve_for_deliverability_verification_preparation",
        "needs_more_policy_context",
        selected.contactPointFingerprint,
      ),
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-06T13:03:00.000Z",
    }),
    /ugp_outreach_human_policy_consent_decision_approval_reason_invalid/,
  );
});

test("reject and defer cannot smuggle a selected contact point",()=>{
  const f=fixture();
  const selected=f.policyConsentReviewSpecification.reviewContactPoints[0];
  assert.ok(selected);

  for(const request of [
    decisionRequest(
      f,
      "reject_contact_point_set",
      "channel_not_appropriate",
      selected.contactPointFingerprint,
    ),
    decisionRequest(
      f,
      "defer_policy_consent_review",
      "evidence_needs_refresh",
      selected.contactPointFingerprint,
    ),
  ]){
    assert.throws(
      ()=>prepareAuthorityOutreachHumanPolicyConsentDecision({
        policyConsentReviewSpecification:f.policyConsentReviewSpecification,
        policyConsentReviewSpecificationInput:
          f.policyConsentReviewSpecificationInput,
        decisionRequest:request,
        reviewerId:"operator@example.com",
        reviewedAt:"2026-10-06T13:04:00.000Z",
      }),
      /ugp_outreach_human_policy_consent_decision_nonapproval_contact_point_forbidden/,
    );
  }
});

test("decision-specific reason codes fail closed",()=>{
  const f=fixture();

  assert.throws(
    ()=>prepareAuthorityOutreachHumanPolicyConsentDecision({
      policyConsentReviewSpecification:f.policyConsentReviewSpecification,
      policyConsentReviewSpecificationInput:
        f.policyConsentReviewSpecificationInput,
      decisionRequest:decisionRequest(
        f,
        "reject_contact_point_set",
        "evidence_needs_refresh",
        null,
      ),
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-06T13:05:00.000Z",
    }),
    /ugp_outreach_human_policy_consent_decision_reject_reason_invalid/,
  );

  assert.throws(
    ()=>prepareAuthorityOutreachHumanPolicyConsentDecision({
      policyConsentReviewSpecification:f.policyConsentReviewSpecification,
      policyConsentReviewSpecificationInput:
        f.policyConsentReviewSpecificationInput,
      decisionRequest:decisionRequest(
        f,
        "defer_policy_consent_review",
        "relationship_or_purpose_mismatch",
        null,
      ),
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-06T13:05:00.000Z",
    }),
    /ugp_outreach_human_policy_consent_decision_defer_reason_invalid/,
  );
});

test("exact confirmation and lineage are required",()=>{
  const f=fixture();
  const selected=f.policyConsentReviewSpecification.reviewContactPoints[0];
  assert.ok(selected);

  const badConfirmation=decisionRequest(
    f,
    "approve_for_deliverability_verification_preparation",
    "policy_and_context_review_sufficient",
    selected.contactPointFingerprint,
  );
  Object.assign(badConfirmation,{confirmation:"APPROVE"});
  assert.throws(
    ()=>prepareAuthorityOutreachHumanPolicyConsentDecision({
      policyConsentReviewSpecification:f.policyConsentReviewSpecification,
      policyConsentReviewSpecificationInput:
        f.policyConsentReviewSpecificationInput,
      decisionRequest:badConfirmation,
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-06T13:06:00.000Z",
    }),
    /ugp_outreach_human_policy_consent_decision_explicit_confirmation_required/,
  );

  const stale=decisionRequest(
    f,
    "approve_for_deliverability_verification_preparation",
    "policy_and_context_review_sufficient",
    selected.contactPointFingerprint,
  );
  Object.assign(stale,{policyConsentReviewSpecFingerprint:FP("0")});
  Object.assign(stale,{
    confirmation:[
      "REVIEW_OUTREACH_POLICY_CONSENT",
      stale.decision,
      stale.selectedContactPointFingerprint,
      FP("0"),
      stale.selectedRoleCandidateFingerprint,
      stale.candidateFingerprint,
    ].join(":"),
  });
  assert.throws(
    ()=>prepareAuthorityOutreachHumanPolicyConsentDecision({
      policyConsentReviewSpecification:f.policyConsentReviewSpecification,
      policyConsentReviewSpecificationInput:
        f.policyConsentReviewSpecificationInput,
      decisionRequest:stale,
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-06T13:06:00.000Z",
    }),
    /ugp_outreach_human_policy_consent_decision_stale_lineage/,
  );
});

test("reviewer identity and timestamp must be canonical",()=>{
  const f=fixture();
  const request=decisionRequest(
    f,
    "defer_policy_consent_review",
    "needs_more_policy_context",
    null,
  );

  assert.throws(
    ()=>prepareAuthorityOutreachHumanPolicyConsentDecision({
      policyConsentReviewSpecification:f.policyConsentReviewSpecification,
      policyConsentReviewSpecificationInput:
        f.policyConsentReviewSpecificationInput,
      decisionRequest:request,
      reviewerId:" operator@example.com ",
      reviewedAt:"2026-10-06T13:07:00.000Z",
    }),
    /ugp_outreach_human_policy_consent_decision_invalid_reviewer/,
  );

  assert.throws(
    ()=>prepareAuthorityOutreachHumanPolicyConsentDecision({
      policyConsentReviewSpecification:f.policyConsentReviewSpecification,
      policyConsentReviewSpecificationInput:
        f.policyConsentReviewSpecificationInput,
      decisionRequest:request,
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-06T13:07:00Z",
    }),
    /ugp_outreach_human_policy_consent_decision_invalid_reviewed_at/,
  );
});

test("human policy-consent decision is deterministic and tamper-evident",()=>{
  const f=fixture();
  const selected=f.policyConsentReviewSpecification.reviewContactPoints[0];
  assert.ok(selected);
  const input={
    policyConsentReviewSpecification:f.policyConsentReviewSpecification,
    policyConsentReviewSpecificationInput:
      f.policyConsentReviewSpecificationInput,
    decisionRequest:decisionRequest(
      f,
      "approve_for_deliverability_verification_preparation",
      "policy_and_context_review_sufficient",
      selected.contactPointFingerprint,
    ),
    reviewerId:"operator@example.com",
    reviewedAt:"2026-10-06T13:08:00.000Z",
  };
  const first=prepareAuthorityOutreachHumanPolicyConsentDecision(input);
  const second=prepareAuthorityOutreachHumanPolicyConsentDecision(input);
  assert.deepEqual(second,first);

  const tampered=structuredClone(first);
  Object.assign(tampered,{resultingState:"send_authorized"});
  assert.throws(
    ()=>assertAuthorityOutreachHumanPolicyConsentDecisionIntegrity(
      tampered,
      input,
    ),
    /ugp_outreach_human_policy_consent_decision_integrity_mismatch/,
  );
});
