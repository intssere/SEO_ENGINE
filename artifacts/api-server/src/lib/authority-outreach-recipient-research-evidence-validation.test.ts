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
  assertAuthorityOutreachRecipientResearchEvidenceIntegrity,
  buildAuthorityOutreachRecipientResearchEvidenceContract,
  type AuthorityOutreachRecipientResearchEvidenceRequest,
  type AuthorityOutreachRecipientResearchObservation,
} from "./authority-outreach-recipient-research-evidence-validation.js";

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

  return {
    researchSpecification,
    researchSpecificationInput,
  };
}

function observations():readonly AuthorityOutreachRecipientResearchObservation[]{
  return [
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
}

function evidenceRequest(
  researchSpecification:ReturnType<
    typeof buildAuthorityOutreachRecipientResearchSpecification
  >,
  overrides:Partial<AuthorityOutreachRecipientResearchEvidenceRequest>={},
):AuthorityOutreachRecipientResearchEvidenceRequest{
  return {
    researchSpecFingerprint:researchSpecification.researchSpecFingerprint,
    candidateFingerprint:researchSpecification.candidateFingerprint,
    researchOutcome:"candidate_set",
    observations:observations(),
    ...overrides,
  };
}

test("supplied public role evidence validates without selecting a recipient",()=>{
  const f=fixture();
  const input={
    researchSpecification:f.researchSpecification,
    researchSpecificationInput:f.researchSpecificationInput,
    evidenceRequest:evidenceRequest(f.researchSpecification),
  };
  const result=buildAuthorityOutreachRecipientResearchEvidenceContract(input);

  assert.equal(
    result.resultingState,
    "recipient_research_evidence_validated",
  );
  assert.equal(
    result.researchSpecFingerprint,
    f.researchSpecification.researchSpecFingerprint,
  );
  assert.equal(result.candidateCount,2);
  assert.equal(result.researchOutcome,"candidate_set");
  assert.equal(result.sourceDomain,"publisher.example.org");
  assert.equal(result.targetDomain,"diamondshelf.us");
  assert.equal(result.roleCandidates.length,2);
  for(const roleCandidate of result.roleCandidates){
    assert.equal(roleCandidate.publicBusinessIdentityAttested,true);
    assert.match(roleCandidate.evidenceUrl,/^https:\/\//);
    assert.match(roleCandidate.roleCandidateFingerprint,/^[0-9a-f]{64}$/);
  }
  assert.equal(result.semantics.suppliedResearchEvidenceValidationOnly,true);
  assert.equal(result.semantics.externalRecipientResearchAuthorized,false);
  assert.equal(result.semantics.externalRecipientResearchPerformed,false);
  assert.equal(result.semantics.publicBusinessRoleCandidateRecordsOnly,true);
  assert.equal(result.semantics.privateOrBrokeredPersonalDataAllowed,false);
  assert.equal(result.semantics.recipientSelectionAuthorized,false);
  assert.equal(result.semantics.contactDiscoveryAuthorized,false);
  assert.equal(result.semantics.contactAddressIncluded,false);
  assert.equal(result.semantics.sendAuthorizationGranted,false);
  assert.equal(result.semantics.performsNetworkOperation,false);
  assert.equal(result.semantics.performsPersistence,false);

  assertAuthorityOutreachRecipientResearchEvidenceIntegrity(result,input);
});

test("candidate order is canonical and deterministic",()=>{
  const f=fixture();
  const firstInput={
    researchSpecification:f.researchSpecification,
    researchSpecificationInput:f.researchSpecificationInput,
    evidenceRequest:evidenceRequest(f.researchSpecification),
  };
  const first=buildAuthorityOutreachRecipientResearchEvidenceContract(
    firstInput,
  );
  const second=buildAuthorityOutreachRecipientResearchEvidenceContract({
    ...firstInput,
    evidenceRequest:evidenceRequest(f.researchSpecification,{
      observations:[...observations()].reverse(),
    }),
  });
  assert.deepEqual(second,first);
});

test("explicit empty research outcome is supported but cannot contain candidates",()=>{
  const f=fixture();
  const input={
    researchSpecification:f.researchSpecification,
    researchSpecificationInput:f.researchSpecificationInput,
    evidenceRequest:evidenceRequest(f.researchSpecification,{
      researchOutcome:"no_public_role_candidate",
      observations:[],
    }),
  };
  const result=buildAuthorityOutreachRecipientResearchEvidenceContract(input);
  assert.equal(result.researchOutcome,"no_public_role_candidate");
  assert.equal(result.candidateCount,0);
  assert.deepEqual(result.roleCandidates,[]);

  assert.throws(
    ()=>buildAuthorityOutreachRecipientResearchEvidenceContract({
      ...input,
      evidenceRequest:evidenceRequest(f.researchSpecification,{
        researchOutcome:"no_public_role_candidate",
        observations:observations(),
      }),
    }),
    /ugp_outreach_recipient_research_evidence_empty_result_required/,
  );
  assert.throws(
    ()=>buildAuthorityOutreachRecipientResearchEvidenceContract({
      ...input,
      evidenceRequest:evidenceRequest(f.researchSpecification,{
        researchOutcome:"candidate_set",
        observations:[],
      }),
    }),
    /ugp_outreach_recipient_research_evidence_candidate_set_required/,
  );
});

test("stale research-spec or draft-candidate lineage fails closed",()=>{
  const f=fixture();
  for(const evidenceRequestValue of [
    evidenceRequest(f.researchSpecification,{
      researchSpecFingerprint:FP("f"),
    }),
    evidenceRequest(f.researchSpecification,{
      candidateFingerprint:FP("0"),
    }),
  ]){
    assert.throws(
      ()=>buildAuthorityOutreachRecipientResearchEvidenceContract({
        researchSpecification:f.researchSpecification,
        researchSpecificationInput:f.researchSpecificationInput,
        evidenceRequest:evidenceRequestValue,
      }),
      /ugp_outreach_recipient_research_evidence_stale_lineage/,
    );
  }
});

test("role criteria and source classes remain bounded by UGP-10.11",()=>{
  const f=fixture();
  const base=observations()[0];
  assert.ok(base);

  const invalidRole={
    ...base,
    matchedRoleCriteria:["partnerships_responsibility"],
  } as AuthorityOutreachRecipientResearchObservation;
  assert.throws(
    ()=>buildAuthorityOutreachRecipientResearchEvidenceContract({
      researchSpecification:f.researchSpecification,
      researchSpecificationInput:f.researchSpecificationInput,
      evidenceRequest:evidenceRequest(f.researchSpecification,{
        observations:[invalidRole],
      }),
    }),
    /ugp_outreach_recipient_research_evidence_role_criterion_invalid/,
  );

  const invalidSource={
    ...base,
    evidenceSourceClass:"unapproved_source",
  } as unknown as AuthorityOutreachRecipientResearchObservation;
  assert.throws(
    ()=>buildAuthorityOutreachRecipientResearchEvidenceContract({
      researchSpecification:f.researchSpecification,
      researchSpecificationInput:f.researchSpecificationInput,
      evidenceRequest:evidenceRequest(f.researchSpecification,{
        observations:[invalidSource],
      }),
    }),
    /ugp_outreach_recipient_research_evidence_source_class_not_allowed/,
  );
});

test("candidate count, source-domain relationship, and contact leakage fail closed",()=>{
  const f=fixture();
  const base=observations()[0];
  assert.ok(base);

  const tooMany=Array.from({length:6},(_,index)=>({
    ...base,
    displayName:"Editor "+String.fromCharCode(65+index),
    evidenceUrl:
      "https://publisher.example.org/team/editor-"+String(index+1),
    evidenceFingerprint:String(index+1).repeat(64).slice(0,64),
  }));
  assert.throws(
    ()=>buildAuthorityOutreachRecipientResearchEvidenceContract({
      researchSpecification:f.researchSpecification,
      researchSpecificationInput:f.researchSpecificationInput,
      evidenceRequest:evidenceRequest(f.researchSpecification,{
        observations:tooMany,
      }),
    }),
    /ugp_outreach_recipient_research_evidence_candidate_limit_exceeded/,
  );

  for(const invalidObservation of [
    {...base,evidenceUrl:"https://other.example.org/team/alex"},
    {...base,evidenceUrl:"http://publisher.example.org/team/alex"},
    {...base,displayName:"alex@publisher.example.org"},
    {...base,roleTitle:"+1 (555) 123-4567"},
  ]){
    assert.throws(
      ()=>buildAuthorityOutreachRecipientResearchEvidenceContract({
        researchSpecification:f.researchSpecification,
        researchSpecificationInput:f.researchSpecificationInput,
        evidenceRequest:evidenceRequest(f.researchSpecification,{
          observations:[
            invalidObservation as AuthorityOutreachRecipientResearchObservation,
          ],
        }),
      }),
      /ugp_outreach_recipient_research_evidence_/,
    );
  }
});

test("duplicate candidate identities and evidence URLs fail closed",()=>{
  const f=fixture();
  const first=observations()[0];
  assert.ok(first);

  assert.throws(
    ()=>buildAuthorityOutreachRecipientResearchEvidenceContract({
      researchSpecification:f.researchSpecification,
      researchSpecificationInput:f.researchSpecificationInput,
      evidenceRequest:evidenceRequest(f.researchSpecification,{
        observations:[
          first,
          {
            ...first,
            evidenceUrl:"https://publisher.example.org/team/alex-editor-2",
            evidenceFingerprint:FP("7"),
          },
        ],
      }),
    }),
    /ugp_outreach_recipient_research_evidence_duplicate_candidate/,
  );

  assert.throws(
    ()=>buildAuthorityOutreachRecipientResearchEvidenceContract({
      researchSpecification:f.researchSpecification,
      researchSpecificationInput:f.researchSpecificationInput,
      evidenceRequest:evidenceRequest(f.researchSpecification,{
        observations:[
          first,
          {
            ...first,
            displayName:"Taylor Editor",
            evidenceFingerprint:FP("8"),
          },
        ],
      }),
    }),
    /ugp_outreach_recipient_research_evidence_duplicate_evidence_url/,
  );
});

test("validated recipient research evidence is tamper-evident",()=>{
  const f=fixture();
  const input={
    researchSpecification:f.researchSpecification,
    researchSpecificationInput:f.researchSpecificationInput,
    evidenceRequest:evidenceRequest(f.researchSpecification),
  };
  const result=buildAuthorityOutreachRecipientResearchEvidenceContract(input);
  const tampered=structuredClone(result);
  Object.assign(tampered,{candidateCount:99});
  assert.throws(
    ()=>assertAuthorityOutreachRecipientResearchEvidenceIntegrity(
      tampered,
      input,
    ),
    /ugp_outreach_recipient_research_evidence_integrity_mismatch/,
  );
});
