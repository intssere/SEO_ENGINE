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
  assertAuthorityOutreachRecipientSelectionReviewSpecIntegrity,
  buildAuthorityOutreachRecipientSelectionReviewSpecification,
  type AuthorityOutreachRecipientSelectionReviewRequest,
} from "./authority-outreach-recipient-selection-review-specification.js";

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

  const reviewRequest:AuthorityOutreachHumanSendReviewRequest={
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
    reviewRequest,
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

  return {
    researchEvidence,
    researchEvidenceInput,
    researchSpecification,
    researchSpecificationInput,
  };
}

function selectionReviewRequest(
  evidence:ReturnType<
    typeof buildAuthorityOutreachRecipientResearchEvidenceContract
  >,
):AuthorityOutreachRecipientSelectionReviewRequest{
  return {
    researchEvidenceFingerprint:evidence.researchEvidenceFingerprint,
    candidateFingerprint:evidence.candidateFingerprint,
  };
}

test("validated candidate set becomes human selection-review ready only",()=>{
  const f=fixture();
  const input={
    researchEvidence:f.researchEvidence,
    researchEvidenceInput:f.researchEvidenceInput,
    reviewRequest:selectionReviewRequest(f.researchEvidence),
  };
  const result=
    buildAuthorityOutreachRecipientSelectionReviewSpecification(input);

  assert.equal(result.resultingState,"recipient_selection_review_ready");
  assert.equal(
    result.researchEvidenceFingerprint,
    f.researchEvidence.researchEvidenceFingerprint,
  );
  assert.equal(result.candidateCount,2);
  assert.deepEqual(
    result.reviewCandidates,
    f.researchEvidence.roleCandidates,
  );
  assert.deepEqual(result.allowedFutureDecisions,[
    "defer_selection",
    "reject_candidate_set",
    "select_for_contact_verification",
  ]);
  assert.deepEqual(result.allowedFutureReasonCodes,[
    "evidence_needs_refresh",
    "identity_or_organization_ambiguous",
    "needs_more_context",
    "relationship_or_reputation_concern",
    "role_and_source_evidence_sufficient",
    "role_fit_not_sufficient",
  ]);
  assert.equal(
    result.futureSelectionConfirmationPrefix,
    "REVIEW_OUTREACH_RECIPIENT_SELECTION",
  );
  assert.equal(result.semantics.humanRecipientSelectionRequired,true);
  assert.equal(result.semantics.humanSelectionReviewPreparationOnly,true);
  assert.equal(result.semantics.recipientSelectionAuthorized,false);
  assert.equal(result.semantics.recipientSelectionPerformed,false);
  assert.equal(result.semantics.selectedRecipientIncluded,false);
  assert.equal(result.semantics.contactAddressVerificationAuthorized,false);
  assert.equal(result.semantics.sendAuthorizationGranted,false);
  assert.equal(result.semantics.performsNetworkOperation,false);
  assert.equal(result.semantics.performsPersistence,false);

  assertAuthorityOutreachRecipientSelectionReviewSpecIntegrity(result,input);
});

test("review packet is deterministic and freezes exact candidate set",()=>{
  const f=fixture();
  const input={
    researchEvidence:f.researchEvidence,
    researchEvidenceInput:f.researchEvidenceInput,
    reviewRequest:selectionReviewRequest(f.researchEvidence),
  };
  const first=
    buildAuthorityOutreachRecipientSelectionReviewSpecification(input);
  const second=
    buildAuthorityOutreachRecipientSelectionReviewSpecification(input);

  assert.deepEqual(second,first);
  assert.deepEqual(
    first.reviewCandidates.map(item=>item.roleCandidateFingerprint),
    f.researchEvidence.roleCandidates.map(
      item=>item.roleCandidateFingerprint,
    ),
  );
});

test("no-public-role-candidate evidence cannot create a selection review",()=>{
  const f=fixture();
  const noCandidateRequest:AuthorityOutreachRecipientResearchEvidenceRequest={
    researchSpecFingerprint:
      f.researchSpecification.researchSpecFingerprint,
    candidateFingerprint:f.researchSpecification.candidateFingerprint,
    researchOutcome:"no_public_role_candidate",
    observations:[],
  };
  const noCandidateInput={
    researchSpecification:f.researchSpecification,
    researchSpecificationInput:f.researchSpecificationInput,
    evidenceRequest:noCandidateRequest,
  };
  const noCandidateEvidence=
    buildAuthorityOutreachRecipientResearchEvidenceContract(noCandidateInput);

  assert.throws(
    ()=>buildAuthorityOutreachRecipientSelectionReviewSpecification({
      researchEvidence:noCandidateEvidence,
      researchEvidenceInput:noCandidateInput,
      reviewRequest:selectionReviewRequest(noCandidateEvidence),
    }),
    /ugp_outreach_recipient_selection_review_spec_candidate_set_required/,
  );
});

test("stale research-evidence or draft-candidate lineage fails closed",()=>{
  const f=fixture();
  for(const request of [
    {
      ...selectionReviewRequest(f.researchEvidence),
      researchEvidenceFingerprint:FP("f"),
    },
    {
      ...selectionReviewRequest(f.researchEvidence),
      candidateFingerprint:FP("0"),
    },
  ]){
    assert.throws(
      ()=>buildAuthorityOutreachRecipientSelectionReviewSpecification({
        researchEvidence:f.researchEvidence,
        researchEvidenceInput:f.researchEvidenceInput,
        reviewRequest:request,
      }),
      /ugp_outreach_recipient_selection_review_spec_stale_lineage/,
    );
  }
});

test("selection review specification is tamper-evident",()=>{
  const f=fixture();
  const input={
    researchEvidence:f.researchEvidence,
    researchEvidenceInput:f.researchEvidenceInput,
    reviewRequest:selectionReviewRequest(f.researchEvidence),
  };
  const result=
    buildAuthorityOutreachRecipientSelectionReviewSpecification(input);
  const tampered=structuredClone(result);
  Object.assign(tampered,{
    resultingState:"recipient_selected",
  });
  assert.throws(
    ()=>assertAuthorityOutreachRecipientSelectionReviewSpecIntegrity(
      tampered,
      input,
    ),
    /ugp_outreach_recipient_selection_review_spec_integrity_mismatch/,
  );
});
