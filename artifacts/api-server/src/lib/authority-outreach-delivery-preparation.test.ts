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
  assertAuthorityOutreachDeliveryPreparationIntegrity,
  buildAuthorityOutreachDeliveryPreparationContract,
  type AuthorityOutreachDeliveryPreparationRequest,
} from "./authority-outreach-delivery-preparation.js";

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
  assert.equal(qualityGate.status,"pass");

  return {
    request:ready.request,
    candidate,
    mechanicalValidation,
    assessments,
    qualityGate,
  };
}

function reviewRequest(
  f:ReturnType<typeof fixture>,
  decision:AuthorityOutreachHumanSendReviewRequest["decision"],
  reasonCode:AuthorityOutreachHumanSendReviewRequest["reasonCode"],
):AuthorityOutreachHumanSendReviewRequest{
  return {
    qualityGateFingerprint:f.qualityGate.gateFingerprint,
    requestFingerprint:f.request.requestFingerprint,
    candidateFingerprint:f.qualityGate.candidateFingerprint,
    decision,
    reasonCode,
    confirmation:[
      "REVIEW_OUTREACH_SEND",
      decision,
      f.qualityGate.candidateFingerprint,
      f.qualityGate.gateFingerprint,
    ].join(":"),
  };
}

function approved(){
  const f=fixture();
  const sendReviewInput={
    ...f,
    reviewRequest:reviewRequest(
      f,
      "approved_for_delivery_preparation",
      "approved_as_validated",
    ),
    reviewerId:"operator@example.com",
    reviewedAt:"2026-10-06T09:30:00.000Z",
  };
  const sendReview=prepareAuthorityOutreachHumanSendReviewDecision(
    sendReviewInput,
  );
  return {f,sendReviewInput,sendReview};
}

function preparationRequest(
  sendReview:ReturnType<typeof prepareAuthorityOutreachHumanSendReviewDecision>,
):AuthorityOutreachDeliveryPreparationRequest{
  return {
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
}

test("eligible human review produces only an immutable delivery preparation specification",()=>{
  const a=approved();
  const request=preparationRequest(a.sendReview);
  const input={
    sendReview:a.sendReview,
    sendReviewInput:a.sendReviewInput,
    preparationRequest:request,
  };
  const result=buildAuthorityOutreachDeliveryPreparationContract(input);

  assert.equal(result.resultingState,"delivery_preparation_spec_ready");
  assert.equal(result.sendReviewFingerprint,a.sendReview.reviewFingerprint);
  assert.equal(result.candidateFingerprint,a.sendReview.candidateFingerprint);
  assert.equal(result.sourceDomain,"publisher.example.org");
  assert.equal(result.targetDomain,"diamondshelf.us");
  assert.equal(result.targetUrl,"https://diamondshelf.us/guide");
  assert.deepEqual(result.requiredRecipientRoleCriteria,[
    "editorial_responsibility",
    "resource_ownership_responsibility",
  ]);
  assert.deepEqual(result.allowedDeliveryChannelTypes,[
    "email",
    "web_contact_form",
  ]);
  assert.deepEqual(result.requiredFutureGates,[
    "recipient_research",
    "recipient_selection",
    "contact_address_verification",
    "policy_and_consent_review",
    "recipient_human_approval",
    "mailbox_or_provider_binding",
    "send_authorization",
    "transmission",
    "follow_up_scheduling",
  ]);
  assert.equal(result.semantics.deliveryPreparationSpecificationOnly,true);
  assert.equal(result.semantics.actualRecipientIncluded,false);
  assert.equal(result.semantics.recipientSelectionAuthorized,false);
  assert.equal(result.semantics.contactDiscoveryAuthorized,false);
  assert.equal(result.semantics.contactAddressIncluded,false);
  assert.equal(result.semantics.emailVerificationAuthorized,false);
  assert.equal(result.semantics.mailboxAccessAuthorized,false);
  assert.equal(result.semantics.providerBindingAuthorized,false);
  assert.equal(result.semantics.sendJobConstructionAuthorized,false);
  assert.equal(result.semantics.sendAuthorizationGranted,false);
  assert.equal(result.semantics.outreachSendingAuthorized,false);
  assert.equal(result.semantics.followUpSchedulingAuthorized,false);
  assert.equal(result.semantics.performsNetworkOperation,false);
  assert.equal(result.semantics.performsPersistence,false);

  assertAuthorityOutreachDeliveryPreparationIntegrity(result,input);

  const reordered=buildAuthorityOutreachDeliveryPreparationContract({
    ...input,
    preparationRequest:{
      ...request,
      requiredRecipientRoleCriteria:[
        "editorial_responsibility",
        "resource_ownership_responsibility",
      ],
      allowedDeliveryChannelTypes:[
        "email",
        "web_contact_form",
      ],
    },
  });
  assert.deepEqual(reordered,result);
});

test("rejected and deferred send reviews cannot produce a preparation specification",()=>{
  for(const item of [
    {
      decision:"rejected" as const,
      reasonCode:"brand_or_reputation_concern" as const,
      reviewedAt:"2026-10-06T09:31:00.000Z",
    },
    {
      decision:"deferred" as const,
      reasonCode:"needs_more_context" as const,
      reviewedAt:"2026-10-06T09:32:00.000Z",
    },
  ]){
    const f=fixture();
    const sendReviewInput={
      ...f,
      reviewRequest:reviewRequest(f,item.decision,item.reasonCode),
      reviewerId:"operator@example.com",
      reviewedAt:item.reviewedAt,
    };
    const sendReview=prepareAuthorityOutreachHumanSendReviewDecision(
      sendReviewInput,
    );
    assert.throws(
      ()=>buildAuthorityOutreachDeliveryPreparationContract({
        sendReview,
        sendReviewInput,
        preparationRequest:preparationRequest(sendReview),
      }),
      /ugp_outreach_delivery_preparation_eligible_review_required/,
    );
  }
});

test("stale review or candidate lineage fails closed",()=>{
  const a=approved();
  const base=preparationRequest(a.sendReview);
  for(const preparationRequestValue of [
    {...base,sendReviewFingerprint:FP("f")},
    {...base,candidateFingerprint:FP("0")},
  ]){
    assert.throws(
      ()=>buildAuthorityOutreachDeliveryPreparationContract({
        sendReview:a.sendReview,
        sendReviewInput:a.sendReviewInput,
        preparationRequest:preparationRequestValue,
      }),
      /ugp_outreach_delivery_preparation_stale_lineage/,
    );
  }
});

test("role/channel inputs are bounded and resulting contracts are tamper-evident",()=>{
  const a=approved();
  const base=preparationRequest(a.sendReview);

  assert.throws(
    ()=>buildAuthorityOutreachDeliveryPreparationContract({
      sendReview:a.sendReview,
      sendReviewInput:a.sendReviewInput,
      preparationRequest:{
        ...base,
        requiredRecipientRoleCriteria:[
          "editorial_responsibility",
          "editorial_responsibility",
        ],
      },
    }),
    /ugp_outreach_delivery_preparation_recipient_role_criterion_duplicate/,
  );

  assert.throws(
    ()=>buildAuthorityOutreachDeliveryPreparationContract({
      sendReview:a.sendReview,
      sendReviewInput:a.sendReviewInput,
      preparationRequest:{
        ...base,
        allowedDeliveryChannelTypes:[],
      },
    }),
    /ugp_outreach_delivery_preparation_delivery_channel_type_required/,
  );

  const input={
    sendReview:a.sendReview,
    sendReviewInput:a.sendReviewInput,
    preparationRequest:base,
  };
  const result=buildAuthorityOutreachDeliveryPreparationContract(input);
  const tampered=structuredClone(result);
  Object.assign(tampered,{targetUrl:"https://diamondshelf.us/other"});
  assert.throws(
    ()=>assertAuthorityOutreachDeliveryPreparationIntegrity(tampered,input),
    /ugp_outreach_delivery_preparation_integrity_mismatch/,
  );
});
