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
  assertAuthorityOutreachRecipientResearchSpecificationIntegrity,
  buildAuthorityOutreachRecipientResearchSpecification,
  type AuthorityOutreachRecipientResearchRequest,
} from "./authority-outreach-recipient-research-specification.js";

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

  return {
    deliveryPreparation,
    deliveryPreparationInput,
  };
}

function researchRequest(
  preparation:ReturnType<typeof buildAuthorityOutreachDeliveryPreparationContract>,
):AuthorityOutreachRecipientResearchRequest{
  return {
    preparationFingerprint:preparation.preparationFingerprint,
    candidateFingerprint:preparation.candidateFingerprint,
    allowedEvidenceSourceClasses:[
      "source_domain_staff_or_team_page",
      "source_domain_author_or_editor_page",
      "source_domain_contact_or_editorial_page",
      "official_organization_profile",
    ],
  };
}

test("delivery preparation produces only a recipient research specification",()=>{
  const f=fixture();
  const input={
    deliveryPreparation:f.deliveryPreparation,
    deliveryPreparationInput:f.deliveryPreparationInput,
    researchRequest:researchRequest(f.deliveryPreparation),
  };
  const result=buildAuthorityOutreachRecipientResearchSpecification(input);

  assert.equal(result.resultingState,"recipient_research_spec_ready");
  assert.equal(
    result.deliveryPreparationFingerprint,
    f.deliveryPreparation.preparationFingerprint,
  );
  assert.equal(
    result.candidateFingerprint,
    f.deliveryPreparation.candidateFingerprint,
  );
  assert.equal(result.sourceDomain,"publisher.example.org");
  assert.equal(result.targetDomain,"diamondshelf.us");
  assert.deepEqual(result.requiredRecipientRoleCriteria,[
    "editorial_responsibility",
    "resource_ownership_responsibility",
  ]);
  assert.deepEqual(result.allowedDeliveryChannelTypes,[
    "email",
    "web_contact_form",
  ]);
  assert.deepEqual(result.allowedEvidenceSourceClasses,[
    "official_organization_profile",
    "source_domain_author_or_editor_page",
    "source_domain_contact_or_editorial_page",
    "source_domain_staff_or_team_page",
  ]);
  assert.equal(result.candidateResearchPolicy.maxRoleCandidates,5);
  assert.equal(result.candidateResearchPolicy.publicBusinessIdentityOnly,true);
  assert.equal(result.candidateResearchPolicy.exactRoleEvidenceRequired,true);
  assert.equal(
    result.candidateResearchPolicy.privateOrBrokeredPersonalDataAllowed,
    false,
  );
  assert.equal(
    result.candidateResearchPolicy.contactAddressCollectionAllowed,
    false,
  );
  assert.equal(result.candidateResearchPolicy.recipientSelectionAllowed,false);
  assert.equal(result.semantics.recipientResearchSpecificationOnly,true);
  assert.equal(result.semantics.recipientResearchAuthorized,false);
  assert.equal(result.semantics.recipientResearchExecuted,false);
  assert.equal(result.semantics.actualRecipientIncluded,false);
  assert.equal(result.semantics.recipientIdentityIncluded,false);
  assert.equal(result.semantics.contactDiscoveryAuthorized,false);
  assert.equal(result.semantics.contactAddressIncluded,false);
  assert.equal(result.semantics.sendAuthorizationGranted,false);
  assert.equal(result.semantics.performsNetworkOperation,false);
  assert.equal(result.semantics.performsPersistence,false);

  assertAuthorityOutreachRecipientResearchSpecificationIntegrity(result,input);
});

test("evidence-source order is canonical and deterministic",()=>{
  const f=fixture();
  const base=researchRequest(f.deliveryPreparation);
  const first=buildAuthorityOutreachRecipientResearchSpecification({
    deliveryPreparation:f.deliveryPreparation,
    deliveryPreparationInput:f.deliveryPreparationInput,
    researchRequest:base,
  });
  const second=buildAuthorityOutreachRecipientResearchSpecification({
    deliveryPreparation:f.deliveryPreparation,
    deliveryPreparationInput:f.deliveryPreparationInput,
    researchRequest:{
      ...base,
      allowedEvidenceSourceClasses:[
        "official_organization_profile",
        "source_domain_contact_or_editorial_page",
        "source_domain_author_or_editor_page",
        "source_domain_staff_or_team_page",
      ],
    },
  });
  assert.deepEqual(second,first);
});

test("stale preparation or candidate lineage fails closed",()=>{
  const f=fixture();
  const base=researchRequest(f.deliveryPreparation);
  for(const researchRequestValue of [
    {...base,preparationFingerprint:FP("f")},
    {...base,candidateFingerprint:FP("0")},
  ]){
    assert.throws(
      ()=>buildAuthorityOutreachRecipientResearchSpecification({
        deliveryPreparation:f.deliveryPreparation,
        deliveryPreparationInput:f.deliveryPreparationInput,
        researchRequest:researchRequestValue,
      }),
      /ugp_outreach_recipient_research_spec_stale_lineage/,
    );
  }
});

test("evidence source classes are bounded and duplicate-free",()=>{
  const f=fixture();
  const base=researchRequest(f.deliveryPreparation);

  assert.throws(
    ()=>buildAuthorityOutreachRecipientResearchSpecification({
      deliveryPreparation:f.deliveryPreparation,
      deliveryPreparationInput:f.deliveryPreparationInput,
      researchRequest:{
        ...base,
        allowedEvidenceSourceClasses:[],
      },
    }),
    /ugp_outreach_recipient_research_spec_evidence_source_required/,
  );

  assert.throws(
    ()=>buildAuthorityOutreachRecipientResearchSpecification({
      deliveryPreparation:f.deliveryPreparation,
      deliveryPreparationInput:f.deliveryPreparationInput,
      researchRequest:{
        ...base,
        allowedEvidenceSourceClasses:[
          "source_domain_staff_or_team_page",
          "source_domain_staff_or_team_page",
        ],
      },
    }),
    /ugp_outreach_recipient_research_spec_evidence_source_duplicate/,
  );

  const invalid={
    ...base,
    allowedEvidenceSourceClasses:[
      "data_broker",
    ],
  } as unknown as AuthorityOutreachRecipientResearchRequest;
  assert.throws(
    ()=>buildAuthorityOutreachRecipientResearchSpecification({
      deliveryPreparation:f.deliveryPreparation,
      deliveryPreparationInput:f.deliveryPreparationInput,
      researchRequest:invalid,
    }),
    /ugp_outreach_recipient_research_spec_evidence_source_invalid/,
  );
});

test("recipient research specification is tamper-evident",()=>{
  const f=fixture();
  const input={
    deliveryPreparation:f.deliveryPreparation,
    deliveryPreparationInput:f.deliveryPreparationInput,
    researchRequest:researchRequest(f.deliveryPreparation),
  };
  const result=buildAuthorityOutreachRecipientResearchSpecification(input);
  const tampered=structuredClone(result);
  Object.assign(tampered,{
    resultingState:"recipient_research_complete",
  });
  assert.throws(
    ()=>assertAuthorityOutreachRecipientResearchSpecificationIntegrity(
      tampered,
      input,
    ),
    /ugp_outreach_recipient_research_spec_integrity_mismatch/,
  );
});
