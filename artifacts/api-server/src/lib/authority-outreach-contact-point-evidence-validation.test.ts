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
  assertAuthorityOutreachContactPointEvidenceIntegrity,
  authorityOutreachPublicContactPointFingerprint,
  buildAuthorityOutreachContactPointEvidenceContract,
  type AuthorityOutreachContactPointEvidenceRequest,
  type AuthorityOutreachSuppliedContactPointEvidenceObservation,
} from "./authority-outreach-contact-point-evidence-validation.js";

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

  return {
    contactVerificationSpecification,
    contactVerificationSpecificationInput,
  };
}

function suppliedObservations(
  f:ReturnType<typeof fixture>,
):readonly AuthorityOutreachSuppliedContactPointEvidenceObservation[]{
  const sourceDomain=f.contactVerificationSpecification.sourceDomain;
  const email="editor@publisher.example.org";
  const form="https://publisher.example.org/contact/editorial";
  return [
    {
      contactPointType:"email_address",
      contactPointValue:email,
      evidenceSourceClass:"source_domain_staff_or_author_page",
      evidenceUrl:"https://publisher.example.org/team/alex-editor",
      observedAt:"2026-10-06T12:00:00.000Z",
      contactPointFingerprint:authorityOutreachPublicContactPointFingerprint(
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
      contactPointFingerprint:authorityOutreachPublicContactPointFingerprint(
        "web_contact_form",
        form,
        sourceDomain,
      ),
      publicBusinessContactAttested:true,
    },
  ];
}

function evidenceRequest(
  f:ReturnType<typeof fixture>,
  overrides:Partial<AuthorityOutreachContactPointEvidenceRequest>={},
):AuthorityOutreachContactPointEvidenceRequest{
  return {
    contactVerificationSpecFingerprint:
      f.contactVerificationSpecification.contactVerificationSpecFingerprint,
    selectedRoleCandidateFingerprint:
      f.contactVerificationSpecification.selectedRoleCandidateFingerprint,
    candidateFingerprint:
      f.contactVerificationSpecification.candidateFingerprint,
    outcome:"contact_point_set",
    observations:suppliedObservations(f),
    ...overrides,
  };
}

test("supplied public contact-point evidence validates structurally without deliverability verification",()=>{
  const f=fixture();
  const input={
    contactVerificationSpecification:f.contactVerificationSpecification,
    contactVerificationSpecificationInput:
      f.contactVerificationSpecificationInput,
    evidenceRequest:evidenceRequest(f),
  };
  const result=buildAuthorityOutreachContactPointEvidenceContract(input);

  assert.equal(result.resultingState,"contact_point_evidence_validated");
  assert.equal(result.outcome,"contact_point_set");
  assert.equal(result.contactPointCount,2);
  assert.deepEqual(
    result.validatedContactPoints.map(item=>item.contactPointType).sort(),
    ["email_address","web_contact_form"],
  );
  assert.ok(
    result.validatedContactPoints.some(
      item=>item.contactPointValue==="editor@publisher.example.org",
    ),
  );
  assert.equal(
    result.semantics.suppliedPublicContactPointEvidenceValidationOnly,
    true,
  );
  assert.equal(result.semantics.externalContactDiscoveryAuthorized,false);
  assert.equal(result.semantics.deliverabilityVerificationAuthorized,false);
  assert.equal(result.semantics.deliverabilityVerificationPerformed,false);
  assert.equal(result.semantics.verificationProviderCallAuthorized,false);
  assert.equal(result.semantics.mailboxProbeAuthorized,false);
  assert.equal(result.semantics.mailboxAccessAuthorized,false);
  assert.equal(result.semantics.sendAuthorizationGranted,false);
  assert.equal(result.semantics.performsNetworkOperation,false);
  assert.equal(result.semantics.performsPersistence,false);

  assertAuthorityOutreachContactPointEvidenceIntegrity(result,input);
});

test("contact-point ordering is canonical and deterministic",()=>{
  const f=fixture();
  const firstInput={
    contactVerificationSpecification:f.contactVerificationSpecification,
    contactVerificationSpecificationInput:
      f.contactVerificationSpecificationInput,
    evidenceRequest:evidenceRequest(f),
  };
  const first=buildAuthorityOutreachContactPointEvidenceContract(firstInput);
  const second=buildAuthorityOutreachContactPointEvidenceContract({
    ...firstInput,
    evidenceRequest:evidenceRequest(f,{
      observations:[...suppliedObservations(f)].reverse(),
    }),
  });
  assert.deepEqual(second,first);
});

test("explicit no-public-contact-point outcome is supported but cannot contain values",()=>{
  const f=fixture();
  const base={
    contactVerificationSpecification:f.contactVerificationSpecification,
    contactVerificationSpecificationInput:
      f.contactVerificationSpecificationInput,
  };
  const emptyInput={
    ...base,
    evidenceRequest:evidenceRequest(f,{
      outcome:"no_public_contact_point",
      observations:[],
    }),
  };
  const result=buildAuthorityOutreachContactPointEvidenceContract(emptyInput);
  assert.equal(result.outcome,"no_public_contact_point");
  assert.equal(result.contactPointCount,0);
  assert.deepEqual(result.validatedContactPoints,[]);

  assert.throws(
    ()=>buildAuthorityOutreachContactPointEvidenceContract({
      ...base,
      evidenceRequest:evidenceRequest(f,{
        outcome:"no_public_contact_point",
        observations:suppliedObservations(f),
      }),
    }),
    /ugp_outreach_contact_point_evidence_empty_result_required/,
  );
  assert.throws(
    ()=>buildAuthorityOutreachContactPointEvidenceContract({
      ...base,
      evidenceRequest:evidenceRequest(f,{
        outcome:"contact_point_set",
        observations:[],
      }),
    }),
    /ugp_outreach_contact_point_evidence_contact_point_set_required/,
  );
});

test("exact UGP-10.15 and selected-candidate lineage is required",()=>{
  const f=fixture();
  for(const request of [
    evidenceRequest(f,{contactVerificationSpecFingerprint:FP("f")}),
    evidenceRequest(f,{selectedRoleCandidateFingerprint:FP("0")}),
    evidenceRequest(f,{candidateFingerprint:FP("9")}),
  ]){
    assert.throws(
      ()=>buildAuthorityOutreachContactPointEvidenceContract({
        contactVerificationSpecification:f.contactVerificationSpecification,
        contactVerificationSpecificationInput:
          f.contactVerificationSpecificationInput,
        evidenceRequest:request,
      }),
      /ugp_outreach_contact_point_evidence_stale_lineage/,
    );
  }
});

test("contact-point types remain bounded by exact UGP-10.15 channels",()=>{
  const emailOnly=fixture(["email"]);
  const formObservation=suppliedObservations(emailOnly).find(
    item=>item.contactPointType==="web_contact_form",
  );
  assert.ok(formObservation);
  assert.throws(
    ()=>buildAuthorityOutreachContactPointEvidenceContract({
      contactVerificationSpecification:
        emailOnly.contactVerificationSpecification,
      contactVerificationSpecificationInput:
        emailOnly.contactVerificationSpecificationInput,
      evidenceRequest:evidenceRequest(emailOnly,{
        observations:[formObservation],
      }),
    }),
    /ugp_outreach_contact_point_evidence_contact_point_type_not_permitted/,
  );
});

test("source-domain relationship, source class, timestamp, and public-business attestation fail closed",()=>{
  const f=fixture();
  const base=suppliedObservations(f)[0];
  assert.ok(base);

  const invalids=[
    {...base,contactPointValue:"editor@other.example.org"},
    {...base,evidenceUrl:"https://other.example.org/team/editor"},
    {...base,evidenceSourceClass:"unapproved_source"},
    {...base,observedAt:"2026-10-06T12:00:00Z"},
    {...base,publicBusinessContactAttested:false},
  ];

  for(const invalid of invalids){
    assert.throws(
      ()=>buildAuthorityOutreachContactPointEvidenceContract({
        contactVerificationSpecification:f.contactVerificationSpecification,
        contactVerificationSpecificationInput:
          f.contactVerificationSpecificationInput,
        evidenceRequest:evidenceRequest(f,{
          observations:[
            invalid as unknown as
              AuthorityOutreachSuppliedContactPointEvidenceObservation,
          ],
        }),
      }),
      /ugp_outreach_contact_point_evidence_/,
    );
  }
});

test("contact-point fingerprint must bind the normalized supplied value",()=>{
  const f=fixture();
  const base=suppliedObservations(f)[0];
  assert.ok(base);

  assert.throws(
    ()=>buildAuthorityOutreachContactPointEvidenceContract({
      contactVerificationSpecification:f.contactVerificationSpecification,
      contactVerificationSpecificationInput:
        f.contactVerificationSpecificationInput,
      evidenceRequest:evidenceRequest(f,{
        observations:[{
          ...base,
          contactPointFingerprint:FP("1"),
        }],
      }),
    }),
    /ugp_outreach_contact_point_evidence_contact_point_fingerprint_mismatch/,
  );
});

test("contact-point count and duplicates fail closed",()=>{
  const f=fixture();
  const sourceDomain=f.contactVerificationSpecification.sourceDomain;
  const tooMany=Array.from({length:4},(_,index)=>{
    const email="editor"+String(index+1)+"@publisher.example.org";
    return {
      contactPointType:"email_address" as const,
      contactPointValue:email,
      evidenceSourceClass:"source_domain_staff_or_author_page" as const,
      evidenceUrl:
        "https://publisher.example.org/team/editor-"+String(index+1),
      observedAt:"2026-10-06T12:0"+String(index)+":00.000Z",
      contactPointFingerprint:authorityOutreachPublicContactPointFingerprint(
        "email_address",
        email,
        sourceDomain,
      ),
      publicBusinessContactAttested:true as const,
    };
  });
  assert.throws(
    ()=>buildAuthorityOutreachContactPointEvidenceContract({
      contactVerificationSpecification:f.contactVerificationSpecification,
      contactVerificationSpecificationInput:
        f.contactVerificationSpecificationInput,
      evidenceRequest:evidenceRequest(f,{observations:tooMany}),
    }),
    /ugp_outreach_contact_point_evidence_contact_point_limit_exceeded/,
  );

  const first=suppliedObservations(f)[0];
  assert.ok(first);
  assert.throws(
    ()=>buildAuthorityOutreachContactPointEvidenceContract({
      contactVerificationSpecification:f.contactVerificationSpecification,
      contactVerificationSpecificationInput:
        f.contactVerificationSpecificationInput,
      evidenceRequest:evidenceRequest(f,{observations:[first,first]}),
    }),
    /ugp_outreach_contact_point_evidence_duplicate_contact_point/,
  );
});

test("validated contact-point evidence is tamper-evident",()=>{
  const f=fixture();
  const input={
    contactVerificationSpecification:f.contactVerificationSpecification,
    contactVerificationSpecificationInput:
      f.contactVerificationSpecificationInput,
    evidenceRequest:evidenceRequest(f),
  };
  const result=buildAuthorityOutreachContactPointEvidenceContract(input);
  const tampered=structuredClone(result);
  Object.assign(tampered,{resultingState:"send_authorized"});
  assert.throws(
    ()=>assertAuthorityOutreachContactPointEvidenceIntegrity(
      tampered,
      input,
    ),
    /ugp_outreach_contact_point_evidence_integrity_mismatch/,
  );
});
