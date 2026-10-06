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
  assertAuthorityOutreachContactVerificationSpecIntegrity,
  buildAuthorityOutreachContactVerificationSpecification,
  type AuthorityOutreachContactVerificationSpecificationRequest,
} from "./authority-outreach-contact-verification-specification.js";

const FP=(c:string)=>c.repeat(64);

function fixture(
  allowedDeliveryChannelTypes:
    AuthorityOutreachDeliveryPreparationRequest["allowedDeliveryChannelTypes"]
      =["web_contact_form","email"],
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
    allowedDeliveryChannelTypes,
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

  return {
    selectionDecision,
    selectionDecisionInput,
    selectionReviewSpecification,
  };
}

function verificationRequest(
  f:ReturnType<typeof fixture>,
  overrides:Partial<AuthorityOutreachContactVerificationSpecificationRequest>
    ={},
):AuthorityOutreachContactVerificationSpecificationRequest{
  const selected=f.selectionDecision.selectedRoleCandidateFingerprint;
  assert.ok(selected);
  return {
    selectionDecisionFingerprint:
      f.selectionDecision.selectionDecisionFingerprint,
    selectedRoleCandidateFingerprint:selected,
    candidateFingerprint:f.selectionDecision.candidateFingerprint,
    ...overrides,
  };
}

test("eligible human selection becomes a provider-free contact-verification specification only",()=>{
  const f=fixture();
  const input={
    selectionDecision:f.selectionDecision,
    selectionDecisionInput:f.selectionDecisionInput,
    verificationRequest:verificationRequest(f),
  };
  const result=buildAuthorityOutreachContactVerificationSpecification(input);

  assert.equal(result.resultingState,"contact_verification_spec_ready");
  assert.equal(
    result.selectionDecisionFingerprint,
    f.selectionDecision.selectionDecisionFingerprint,
  );
  assert.equal(
    result.selectedRoleCandidateFingerprint,
    f.selectionDecision.selectedRoleCandidateFingerprint,
  );
  assert.deepEqual(
    result.selectedRoleCandidate,
    f.selectionDecision.selectedRoleCandidate,
  );
  assert.deepEqual(
    result.permittedContactPointTypes,
    ["email_address","web_contact_form"],
  );
  assert.deepEqual(result.allowedEvidenceSourceClasses,[
    "official_organization_profile",
    "source_domain_contact_page",
    "source_domain_staff_or_author_page",
  ]);
  assert.equal(result.verificationPolicy.maxContactPointsToValidate,3);
  assert.equal(result.verificationPolicy.publicBusinessContactOnly,true);
  assert.equal(
    result.verificationPolicy.privateOrBrokeredPersonalDataAllowed,
    false,
  );
  assert.equal(result.verificationPolicy.contactPointCollectionAllowed,false);
  assert.equal(result.verificationPolicy.verificationExecutionAllowed,false);
  assert.equal(result.verificationPolicy.providerVerificationAllowed,false);
  assert.equal(result.semantics.contactVerificationSpecificationOnly,true);
  assert.equal(result.semantics.actualContactPointIncluded,false);
  assert.equal(result.semantics.contactAddressIncluded,false);
  assert.equal(result.semantics.contactAddressCollectionAuthorized,false);
  assert.equal(result.semantics.contactAddressVerificationAuthorized,false);
  assert.equal(result.semantics.verificationProviderCallAuthorized,false);
  assert.equal(result.semantics.sendAuthorizationGranted,false);
  assert.equal(result.semantics.performsNetworkOperation,false);
  assert.equal(result.semantics.performsPersistence,false);

  assertAuthorityOutreachContactVerificationSpecIntegrity(result,input);
});

test("permitted contact-point types are inherited deterministically from delivery preparation",()=>{
  const emailOnly=fixture(["email"]);
  const emailSpec=buildAuthorityOutreachContactVerificationSpecification({
    selectionDecision:emailOnly.selectionDecision,
    selectionDecisionInput:emailOnly.selectionDecisionInput,
    verificationRequest:verificationRequest(emailOnly),
  });
  assert.deepEqual(emailSpec.permittedContactPointTypes,["email_address"]);

  const formOnly=fixture(["web_contact_form"]);
  const formSpec=buildAuthorityOutreachContactVerificationSpecification({
    selectionDecision:formOnly.selectionDecision,
    selectionDecisionInput:formOnly.selectionDecisionInput,
    verificationRequest:verificationRequest(formOnly),
  });
  assert.deepEqual(formSpec.permittedContactPointTypes,["web_contact_form"]);
});

test("stale selection, selected-role candidate, or draft-candidate lineage fails closed",()=>{
  const f=fixture();
  for(const request of [
    verificationRequest(f,{selectionDecisionFingerprint:FP("f")}),
    verificationRequest(f,{selectedRoleCandidateFingerprint:FP("0")}),
    verificationRequest(f,{candidateFingerprint:FP("9")}),
  ]){
    assert.throws(
      ()=>buildAuthorityOutreachContactVerificationSpecification({
        selectionDecision:f.selectionDecision,
        selectionDecisionInput:f.selectionDecisionInput,
        verificationRequest:request,
      }),
      /ugp_outreach_contact_verification_spec_stale_lineage/,
    );
  }
});

test("rejected or deferred human selection cannot produce a verification specification",()=>{
  for(const decision of [
    {
      decision:"reject_candidate_set" as const,
      reasonCode:"role_fit_not_sufficient" as const,
      resultingState:"recipient_selection_rejected" as const,
    },
    {
      decision:"defer_selection" as const,
      reasonCode:"needs_more_context" as const,
      resultingState:"recipient_selection_deferred" as const,
    },
  ]){
    const f=fixture();
    const selectionRequestBase={
      selectionReviewSpecFingerprint:
        f.selectionReviewSpecification.selectionReviewSpecFingerprint,
      candidateFingerprint:
        f.selectionReviewSpecification.candidateFingerprint,
      decision:decision.decision,
      reasonCode:decision.reasonCode,
      selectedRoleCandidateFingerprint:null,
    };
    const selectionRequest:AuthorityOutreachHumanRecipientSelectionRequest={
      ...selectionRequestBase,
      confirmation:[
        "REVIEW_OUTREACH_RECIPIENT_SELECTION",
        selectionRequestBase.decision,
        "NONE",
        selectionRequestBase.selectionReviewSpecFingerprint,
        selectionRequestBase.candidateFingerprint,
      ].join(":"),
    };
    const decisionInput={
      selectionReviewSpecification:f.selectionReviewSpecification,
      selectionReviewSpecificationInput:
        f.selectionDecisionInput.selectionReviewSpecificationInput,
      selectionRequest,
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-06T11:10:00.000Z",
    };
    const nonSelected=
      prepareAuthorityOutreachHumanRecipientSelectionDecision(decisionInput);
    assert.equal(nonSelected.resultingState,decision.resultingState);

    assert.throws(
      ()=>buildAuthorityOutreachContactVerificationSpecification({
        selectionDecision:nonSelected,
        selectionDecisionInput:decisionInput,
        verificationRequest:{
          selectionDecisionFingerprint:
            nonSelected.selectionDecisionFingerprint,
          selectedRoleCandidateFingerprint:FP("1"),
          candidateFingerprint:nonSelected.candidateFingerprint,
        },
      }),
      /ugp_outreach_contact_verification_spec_eligible_selection_required/,
    );
  }
});

test("contact-verification specification is deterministic and tamper-evident",()=>{
  const f=fixture();
  const input={
    selectionDecision:f.selectionDecision,
    selectionDecisionInput:f.selectionDecisionInput,
    verificationRequest:verificationRequest(f),
  };
  const first=buildAuthorityOutreachContactVerificationSpecification(input);
  const second=buildAuthorityOutreachContactVerificationSpecification(input);
  assert.deepEqual(second,first);

  const tampered=structuredClone(first);
  Object.assign(tampered,{resultingState:"contact_verified"});
  assert.throws(
    ()=>assertAuthorityOutreachContactVerificationSpecIntegrity(
      tampered,
      input,
    ),
    /ugp_outreach_contact_verification_spec_integrity_mismatch/,
  );
});
