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
  assertAuthorityOutreachHumanSendReviewIntegrity,
  prepareAuthorityOutreachHumanSendReviewDecision,
  type AuthorityOutreachHumanSendReviewRequest,
} from "./authority-outreach-human-send-review.js";

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
  assert.equal(qualityGate.eligibleForHumanSendReview,true);

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

test("passing quality gate can be human-approved only for delivery preparation eligibility",()=>{
  const f=fixture();
  const request=reviewRequest(
    f,
    "approved_for_delivery_preparation",
    "approved_as_validated",
  );
  const input={
    ...f,
    reviewRequest:request,
    reviewerId:"operator@example.com",
    reviewedAt:"2026-10-06T09:30:00.000Z",
  };
  const result=prepareAuthorityOutreachHumanSendReviewDecision(input);

  assert.equal(result.decision,"approved_for_delivery_preparation");
  assert.equal(result.resultingState,"delivery_preparation_eligible");
  assert.equal(result.reasonCode,"approved_as_validated");
  assert.equal(result.semantics.humanDecision,true);
  assert.equal(result.semantics.exactValidatedCandidateRequired,true);
  assert.equal(result.semantics.qualityGatePassRequired,true);
  assert.equal(result.semantics.explicitConfirmationRequired,true);
  assert.equal(result.semantics.eligibilityOnly,true);
  assert.equal(result.semantics.deliveryPreparationExecuted,false);
  assert.equal(result.semantics.candidateMutationAuthorized,false);
  assert.equal(result.semantics.recipientSelectionAuthorized,false);
  assert.equal(result.semantics.contactDiscoveryAuthorized,false);
  assert.equal(result.semantics.emailVerificationAuthorized,false);
  assert.equal(result.semantics.mailboxAccessAuthorized,false);
  assert.equal(result.semantics.sendAuthorizationGranted,false);
  assert.equal(result.semantics.outreachSendingAuthorized,false);
  assert.equal(result.semantics.performsNetworkOperation,false);
  assert.equal(result.semantics.performsPersistence,false);

  assertAuthorityOutreachHumanSendReviewIntegrity(result,input);
});

test("reject and defer decisions stay terminally non-send-authorizing",()=>{
  const rejectedFixture=fixture();
  const rejected=prepareAuthorityOutreachHumanSendReviewDecision({
    ...rejectedFixture,
    reviewRequest:reviewRequest(
      rejectedFixture,
      "rejected",
      "brand_or_reputation_concern",
    ),
    reviewerId:"operator@example.com",
    reviewedAt:"2026-10-06T09:31:00.000Z",
  });
  assert.equal(rejected.resultingState,"send_review_rejected");
  assert.equal(rejected.semantics.sendAuthorizationGranted,false);

  const deferredFixture=fixture();
  const deferred=prepareAuthorityOutreachHumanSendReviewDecision({
    ...deferredFixture,
    reviewRequest:reviewRequest(
      deferredFixture,
      "deferred",
      "needs_more_context",
    ),
    reviewerId:"operator@example.com",
    reviewedAt:"2026-10-06T09:32:00.000Z",
  });
  assert.equal(deferred.resultingState,"send_review_deferred");
  assert.equal(deferred.semantics.sendAuthorizationGranted,false);
});

test("approval requires the exact approval reason and explicit confirmation",()=>{
  const f=fixture();
  const wrongReason=reviewRequest(
    f,
    "approved_for_delivery_preparation",
    "approved_as_validated",
  );
  Object.assign(wrongReason,{reasonCode:"needs_more_context"});
  assert.throws(
    ()=>prepareAuthorityOutreachHumanSendReviewDecision({
      ...f,
      reviewRequest:wrongReason,
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-06T09:30:00.000Z",
    }),
    /ugp_outreach_send_review_approval_reason_invalid/,
  );

  const wrongConfirmation=reviewRequest(
    f,
    "approved_for_delivery_preparation",
    "approved_as_validated",
  );
  Object.assign(wrongConfirmation,{confirmation:"APPROVE"});
  assert.throws(
    ()=>prepareAuthorityOutreachHumanSendReviewDecision({
      ...f,
      reviewRequest:wrongConfirmation,
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-06T09:30:00.000Z",
    }),
    /ugp_outreach_send_review_explicit_confirmation_required/,
  );
});

test("stale quality-gate or candidate lineage fails closed",()=>{
  const f=fixture();
  const staleGate=reviewRequest(
    f,
    "approved_for_delivery_preparation",
    "approved_as_validated",
  );
  Object.assign(staleGate,{qualityGateFingerprint:FP("f")});
  Object.assign(staleGate,{
    confirmation:[
      "REVIEW_OUTREACH_SEND",
      staleGate.decision,
      staleGate.candidateFingerprint,
      FP("f"),
    ].join(":"),
  });
  assert.throws(
    ()=>prepareAuthorityOutreachHumanSendReviewDecision({
      ...f,
      reviewRequest:staleGate,
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-06T09:30:00.000Z",
    }),
    /ugp_outreach_send_review_stale_lineage/,
  );

  const staleCandidate=reviewRequest(
    f,
    "approved_for_delivery_preparation",
    "approved_as_validated",
  );
  Object.assign(staleCandidate,{candidateFingerprint:FP("0")});
  Object.assign(staleCandidate,{
    confirmation:[
      "REVIEW_OUTREACH_SEND",
      staleCandidate.decision,
      FP("0"),
      staleCandidate.qualityGateFingerprint,
    ].join(":"),
  });
  assert.throws(
    ()=>prepareAuthorityOutreachHumanSendReviewDecision({
      ...f,
      reviewRequest:staleCandidate,
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-06T09:30:00.000Z",
    }),
    /ugp_outreach_send_review_stale_lineage/,
  );
});

test("blocked semantic quality gate cannot enter human send review",()=>{
  const f=fixture();
  const blockedAssessments=f.assessments.map((assessment,index)=>
    index===0
      ?buildAuthorityOutreachSemanticAssessment({
          checkId:assessment.checkId,
          status:"blocked",
          summary:"Blocked factual claim support.",
          evidenceRefs:["semantic-ref-blocked"],
        })
      :assessment,
  );
  const blockedGate=buildAuthorityOutreachSemanticQualityGate({
    request:f.request,
    candidate:f.candidate,
    mechanicalValidation:f.mechanicalValidation,
    assessments:blockedAssessments,
  });
  assert.equal(blockedGate.status,"blocked");

  const request:AuthorityOutreachHumanSendReviewRequest={
    qualityGateFingerprint:blockedGate.gateFingerprint,
    requestFingerprint:f.request.requestFingerprint,
    candidateFingerprint:blockedGate.candidateFingerprint,
    decision:"deferred",
    reasonCode:"needs_more_context",
    confirmation:[
      "REVIEW_OUTREACH_SEND",
      "deferred",
      blockedGate.candidateFingerprint,
      blockedGate.gateFingerprint,
    ].join(":"),
  };
  assert.throws(
    ()=>prepareAuthorityOutreachHumanSendReviewDecision({
      request:f.request,
      candidate:f.candidate,
      mechanicalValidation:f.mechanicalValidation,
      assessments:blockedAssessments,
      qualityGate:blockedGate,
      reviewRequest:request,
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-06T09:30:00.000Z",
    }),
    /ugp_outreach_send_review_quality_gate_pass_required/,
  );
});

test("human send-review record is deterministic and tamper-evident",()=>{
  const f=fixture();
  const input={
    ...f,
    reviewRequest:reviewRequest(
      f,
      "approved_for_delivery_preparation",
      "approved_as_validated",
    ),
    reviewerId:"operator@example.com",
    reviewedAt:"2026-10-06T09:30:00.000Z",
  };
  const first=prepareAuthorityOutreachHumanSendReviewDecision(input);
  const second=prepareAuthorityOutreachHumanSendReviewDecision(input);
  assert.deepEqual(second,first);

  const tampered=structuredClone(first);
  Object.assign(tampered,{resultingState:"send_review_rejected"});
  assert.throws(
    ()=>assertAuthorityOutreachHumanSendReviewIntegrity(tampered,input),
    /ugp_outreach_send_review_integrity_mismatch/,
  );
});
