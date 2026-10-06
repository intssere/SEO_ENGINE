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
  assertAuthorityOutreachHumanRecipientSelectionIntegrity,
  prepareAuthorityOutreachHumanRecipientSelectionDecision,
  type AuthorityOutreachHumanRecipientSelectionRequest,
} from "./authority-outreach-human-recipient-selection.js";

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
    allowedDeliveryChannelTypes:[
      "web_contact_form",
      "email",
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

  const observations:readonly AuthorityOutreachRecipientResearchObservation[]=[
    {
      displayName:"Alex Editor",
      organizationName:"Publisher Example",
      roleTitle:"Senior Editor",
      matchedRoleCriteria:["editorial_responsibility"],
      evidenceSourceClass:"source_domain_author_or_editor_page",
      evidenceUrl:"https://publisher.example.org/team/alex-editor",
      observedAt:"2026-10-06T10:00:00.000Z",
      evidenceFingerprint:FP("5"),
      publicBusinessIdentityAttested:true,
    },
    {
      displayName:"Riley Resources",
      organizationName:"Publisher Example",
      roleTitle:"Resource Library Manager",
      matchedRoleCriteria:["resource_ownership_responsibility"],
      evidenceSourceClass:"source_domain_staff_or_team_page",
      evidenceUrl:"https://publisher.example.org/team/riley-resources",
      observedAt:"2026-10-06T10:01:00.000Z",
      evidenceFingerprint:FP("6"),
      publicBusinessIdentityAttested:true,
    },
  ];
  const evidenceRequest:AuthorityOutreachRecipientResearchEvidenceRequest={
    researchSpecFingerprint:researchSpecification.researchSpecFingerprint,
    candidateFingerprint:researchSpecification.candidateFingerprint,
    researchOutcome:"candidate_set",
    observations,
  };
  const researchEvidenceInput={
    researchSpecification,
    researchSpecificationInput,
    evidenceRequest,
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

  return {
    selectionReviewSpecification,
    selectionReviewSpecificationInput,
  };
}

function request(
  f:ReturnType<typeof fixture>,
  decision:AuthorityOutreachHumanRecipientSelectionRequest["decision"],
  reasonCode:AuthorityOutreachHumanRecipientSelectionRequest["reasonCode"],
  selectedRoleCandidateFingerprint:string|null,
):AuthorityOutreachHumanRecipientSelectionRequest{
  const base={
    selectionReviewSpecFingerprint:
      f.selectionReviewSpecification.selectionReviewSpecFingerprint,
    candidateFingerprint:f.selectionReviewSpecification.candidateFingerprint,
    decision,
    reasonCode,
    selectedRoleCandidateFingerprint,
  };
  return {
    ...base,
    confirmation:[
      "REVIEW_OUTREACH_RECIPIENT_SELECTION",
      decision,
      selectedRoleCandidateFingerprint??"NONE",
      base.selectionReviewSpecFingerprint,
      base.candidateFingerprint,
    ].join(":"),
  };
}

test("human may select exactly one reviewed role candidate for contact-verification eligibility only",()=>{
  const f=fixture();
  const selected=f.selectionReviewSpecification.reviewCandidates[0];
  assert.ok(selected);
  const selectionRequest=request(
    f,
    "select_for_contact_verification",
    "role_and_source_evidence_sufficient",
    selected.roleCandidateFingerprint,
  );
  const input={
    selectionReviewSpecification:f.selectionReviewSpecification,
    selectionReviewSpecificationInput:f.selectionReviewSpecificationInput,
    selectionRequest,
    reviewerId:"operator@example.com",
    reviewedAt:"2026-10-06T11:00:00.000Z",
  };
  const result=prepareAuthorityOutreachHumanRecipientSelectionDecision(input);

  assert.equal(result.decision,"select_for_contact_verification");
  assert.equal(result.resultingState,"contact_verification_eligible");
  assert.equal(
    result.selectedRoleCandidateFingerprint,
    selected.roleCandidateFingerprint,
  );
  assert.deepEqual(result.selectedRoleCandidate,selected);
  assert.equal(result.semantics.humanDecision,true);
  assert.equal(result.semantics.eligibilityOnly,true);
  assert.equal(result.semantics.automatedRecipientSelectionAuthorized,false);
  assert.equal(result.semantics.contactDiscoveryAuthorized,false);
  assert.equal(result.semantics.contactAddressIncluded,false);
  assert.equal(result.semantics.contactAddressCollectionAuthorized,false);
  assert.equal(result.semantics.contactAddressVerificationAuthorized,false);
  assert.equal(result.semantics.contactAddressVerificationPerformed,false);
  assert.equal(result.semantics.emailVerificationAuthorized,false);
  assert.equal(result.semantics.mailboxAccessAuthorized,false);
  assert.equal(result.semantics.providerBindingAuthorized,false);
  assert.equal(result.semantics.sendAuthorizationGranted,false);
  assert.equal(result.semantics.performsNetworkOperation,false);
  assert.equal(result.semantics.performsPersistence,false);

  assertAuthorityOutreachHumanRecipientSelectionIntegrity(result,input);
});

test("reject and defer decisions contain no selected role candidate",()=>{
  const rejectedFixture=fixture();
  const rejected=prepareAuthorityOutreachHumanRecipientSelectionDecision({
    selectionReviewSpecification:
      rejectedFixture.selectionReviewSpecification,
    selectionReviewSpecificationInput:
      rejectedFixture.selectionReviewSpecificationInput,
    selectionRequest:request(
      rejectedFixture,
      "reject_candidate_set",
      "role_fit_not_sufficient",
      null,
    ),
    reviewerId:"operator@example.com",
    reviewedAt:"2026-10-06T11:01:00.000Z",
  });
  assert.equal(rejected.resultingState,"recipient_selection_rejected");
  assert.equal(rejected.selectedRoleCandidate,null);
  assert.equal(rejected.selectedRoleCandidateFingerprint,null);

  const deferredFixture=fixture();
  const deferred=prepareAuthorityOutreachHumanRecipientSelectionDecision({
    selectionReviewSpecification:
      deferredFixture.selectionReviewSpecification,
    selectionReviewSpecificationInput:
      deferredFixture.selectionReviewSpecificationInput,
    selectionRequest:request(
      deferredFixture,
      "defer_selection",
      "needs_more_context",
      null,
    ),
    reviewerId:"operator@example.com",
    reviewedAt:"2026-10-06T11:02:00.000Z",
  });
  assert.equal(deferred.resultingState,"recipient_selection_deferred");
  assert.equal(deferred.selectedRoleCandidate,null);
  assert.equal(deferred.semantics.sendAuthorizationGranted,false);
});

test("selection requires exact candidate membership and selection reason",()=>{
  const f=fixture();

  assert.throws(
    ()=>prepareAuthorityOutreachHumanRecipientSelectionDecision({
      selectionReviewSpecification:f.selectionReviewSpecification,
      selectionReviewSpecificationInput:f.selectionReviewSpecificationInput,
      selectionRequest:request(
        f,
        "select_for_contact_verification",
        "role_and_source_evidence_sufficient",
        FP("f"),
      ),
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-06T11:00:00.000Z",
    }),
    /ugp_outreach_human_recipient_selection_candidate_not_in_review_set/,
  );

  const selected=f.selectionReviewSpecification.reviewCandidates[0];
  assert.ok(selected);
  const wrongReason=request(
    f,
    "select_for_contact_verification",
    "needs_more_context",
    selected.roleCandidateFingerprint,
  );
  assert.throws(
    ()=>prepareAuthorityOutreachHumanRecipientSelectionDecision({
      selectionReviewSpecification:f.selectionReviewSpecification,
      selectionReviewSpecificationInput:f.selectionReviewSpecificationInput,
      selectionRequest:wrongReason,
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-06T11:00:00.000Z",
    }),
    /ugp_outreach_human_recipient_selection_approval_reason_invalid/,
  );
});

test("reject and defer cannot smuggle a selected candidate",()=>{
  const f=fixture();
  const selected=f.selectionReviewSpecification.reviewCandidates[0];
  assert.ok(selected);

  for(const selectionRequest of [
    request(
      f,
      "reject_candidate_set",
      "role_fit_not_sufficient",
      selected.roleCandidateFingerprint,
    ),
    request(
      f,
      "defer_selection",
      "needs_more_context",
      selected.roleCandidateFingerprint,
    ),
  ]){
    assert.throws(
      ()=>prepareAuthorityOutreachHumanRecipientSelectionDecision({
        selectionReviewSpecification:f.selectionReviewSpecification,
        selectionReviewSpecificationInput:f.selectionReviewSpecificationInput,
        selectionRequest,
        reviewerId:"operator@example.com",
        reviewedAt:"2026-10-06T11:03:00.000Z",
      }),
      /ugp_outreach_human_recipient_selection_nonselection_candidate_forbidden/,
    );
  }
});

test("decision-specific reason codes fail closed",()=>{
  const f=fixture();

  assert.throws(
    ()=>prepareAuthorityOutreachHumanRecipientSelectionDecision({
      selectionReviewSpecification:f.selectionReviewSpecification,
      selectionReviewSpecificationInput:f.selectionReviewSpecificationInput,
      selectionRequest:request(
        f,
        "reject_candidate_set",
        "evidence_needs_refresh",
        null,
      ),
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-06T11:04:00.000Z",
    }),
    /ugp_outreach_human_recipient_selection_reject_reason_invalid/,
  );

  assert.throws(
    ()=>prepareAuthorityOutreachHumanRecipientSelectionDecision({
      selectionReviewSpecification:f.selectionReviewSpecification,
      selectionReviewSpecificationInput:f.selectionReviewSpecificationInput,
      selectionRequest:request(
        f,
        "defer_selection",
        "relationship_or_reputation_concern",
        null,
      ),
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-06T11:05:00.000Z",
    }),
    /ugp_outreach_human_recipient_selection_defer_reason_invalid/,
  );
});

test("exact explicit confirmation and lineage are required",()=>{
  const f=fixture();
  const selected=f.selectionReviewSpecification.reviewCandidates[0];
  assert.ok(selected);

  const wrongConfirmation=request(
    f,
    "select_for_contact_verification",
    "role_and_source_evidence_sufficient",
    selected.roleCandidateFingerprint,
  );
  Object.assign(wrongConfirmation,{confirmation:"APPROVE"});
  assert.throws(
    ()=>prepareAuthorityOutreachHumanRecipientSelectionDecision({
      selectionReviewSpecification:f.selectionReviewSpecification,
      selectionReviewSpecificationInput:f.selectionReviewSpecificationInput,
      selectionRequest:wrongConfirmation,
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-06T11:00:00.000Z",
    }),
    /ugp_outreach_human_recipient_selection_explicit_confirmation_required/,
  );

  const staleSpec=request(
    f,
    "select_for_contact_verification",
    "role_and_source_evidence_sufficient",
    selected.roleCandidateFingerprint,
  );
  Object.assign(staleSpec,{selectionReviewSpecFingerprint:FP("0")});
  Object.assign(staleSpec,{
    confirmation:[
      "REVIEW_OUTREACH_RECIPIENT_SELECTION",
      staleSpec.decision,
      staleSpec.selectedRoleCandidateFingerprint,
      FP("0"),
      staleSpec.candidateFingerprint,
    ].join(":"),
  });
  assert.throws(
    ()=>prepareAuthorityOutreachHumanRecipientSelectionDecision({
      selectionReviewSpecification:f.selectionReviewSpecification,
      selectionReviewSpecificationInput:f.selectionReviewSpecificationInput,
      selectionRequest:staleSpec,
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-06T11:00:00.000Z",
    }),
    /ugp_outreach_human_recipient_selection_stale_lineage/,
  );
});

test("reviewer identity and timestamp must be canonical",()=>{
  const f=fixture();
  const selectionRequest=request(
    f,
    "defer_selection",
    "needs_more_context",
    null,
  );

  assert.throws(
    ()=>prepareAuthorityOutreachHumanRecipientSelectionDecision({
      selectionReviewSpecification:f.selectionReviewSpecification,
      selectionReviewSpecificationInput:f.selectionReviewSpecificationInput,
      selectionRequest,
      reviewerId:" operator@example.com ",
      reviewedAt:"2026-10-06T11:06:00.000Z",
    }),
    /ugp_outreach_human_recipient_selection_invalid_reviewer/,
  );

  assert.throws(
    ()=>prepareAuthorityOutreachHumanRecipientSelectionDecision({
      selectionReviewSpecification:f.selectionReviewSpecification,
      selectionReviewSpecificationInput:f.selectionReviewSpecificationInput,
      selectionRequest,
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-06T11:06:00Z",
    }),
    /ugp_outreach_human_recipient_selection_invalid_reviewed_at/,
  );
});

test("human recipient selection record is deterministic and tamper-evident",()=>{
  const f=fixture();
  const selected=f.selectionReviewSpecification.reviewCandidates[0];
  assert.ok(selected);
  const input={
    selectionReviewSpecification:f.selectionReviewSpecification,
    selectionReviewSpecificationInput:f.selectionReviewSpecificationInput,
    selectionRequest:request(
      f,
      "select_for_contact_verification",
      "role_and_source_evidence_sufficient",
      selected.roleCandidateFingerprint,
    ),
    reviewerId:"operator@example.com",
    reviewedAt:"2026-10-06T11:00:00.000Z",
  };
  const first=prepareAuthorityOutreachHumanRecipientSelectionDecision(input);
  const second=prepareAuthorityOutreachHumanRecipientSelectionDecision(input);
  assert.deepEqual(second,first);

  const tampered=structuredClone(first);
  Object.assign(tampered,{resultingState:"send_authorized"});
  assert.throws(
    ()=>assertAuthorityOutreachHumanRecipientSelectionIntegrity(
      tampered,
      input,
    ),
    /ugp_outreach_human_recipient_selection_integrity_mismatch/,
  );
});
