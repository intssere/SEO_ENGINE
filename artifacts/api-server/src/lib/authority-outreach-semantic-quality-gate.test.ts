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
  assertAuthorityOutreachSemanticQualityGateIntegrity,
  buildAuthorityOutreachSemanticAssessment,
  buildAuthorityOutreachSemanticQualityGate,
  type AuthorityOutreachSemanticAssessment,
  type AuthorityOutreachSemanticCheckId,
} from "./authority-outreach-semantic-quality-gate.js";

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
  return {
    request:ready.request,
    candidate,
    mechanicalValidation,
  };
}

const CHECKS:readonly AuthorityOutreachSemanticCheckId[]=[
  "factual_claim_support",
  "relationship_history_integrity",
  "link_scheme_policy",
  "ranking_outcome_claims",
  "tone_reputation_safety",
  "contextual_fit",
];

function assessments(
  overrides:Partial<Record<
    AuthorityOutreachSemanticCheckId,
    "pass"|"blocked"
  >>={},
):AuthorityOutreachSemanticAssessment[]{
  return CHECKS.map((checkId,index)=>
    buildAuthorityOutreachSemanticAssessment({
      checkId,
      status:overrides[checkId]??"pass",
      summary:
        (overrides[checkId]??"pass")==="pass"
          ?"Assessment passed for "+checkId+"."
          :"Assessment blocked for "+checkId+".",
      evidenceRefs:["semantic-ref-"+String(index+1)],
    }),
  );
}

test("complete passing semantic assessments make a mechanically valid candidate eligible only for human send review",()=>{
  const f=fixture();
  const input={...f,assessments:assessments()};
  const result=buildAuthorityOutreachSemanticQualityGate(input);

  assert.equal(result.status,"pass");
  assert.equal(result.eligibleForHumanSendReview,true);
  assert.equal(result.blockingReasons.length,0);
  assert.equal(result.checks.length,7);
  assert.equal(result.semantics.failClosed,true);
  assert.equal(result.semantics.separateFromGeneration,true);
  assert.equal(result.semantics.externalSemanticAssessmentRequired,true);
  assert.equal(result.semantics.modelConfidenceIsNotQualityGate,true);
  assert.equal(result.semantics.eligibleForHumanSendReviewOnly,true);
  assert.equal(result.semantics.humanSendReviewRequired,true);
  assert.equal(result.semantics.sendAuthorizationGranted,false);
  assert.equal(result.semantics.contactDiscoveryAuthorized,false);
  assert.equal(result.semantics.modelExecutionAuthorized,false);
  assert.equal(result.semantics.performsModelCall,false);
  assert.equal(result.semantics.performsProviderCall,false);
  assert.equal(result.semantics.performsNetworkOperation,false);
  assert.equal(result.semantics.performsPersistence,false);
  assert.equal(result.semantics.outreachSendingAuthorized,false);
  assert.equal(result.semantics.publicSiteWrites,false);

  assertAuthorityOutreachSemanticQualityGateIntegrity(result,input);
});

test("one blocked semantic assessment blocks human-send-review eligibility",()=>{
  const f=fixture();
  const result=buildAuthorityOutreachSemanticQualityGate({
    ...f,
    assessments:assessments({tone_reputation_safety:"blocked"}),
  });
  assert.equal(result.status,"blocked");
  assert.equal(result.eligibleForHumanSendReview,false);
  assert.ok(
    result.blockingReasons.some(reason=>
      reason.startsWith("tone_reputation_safety:"),
    ),
  );
});

test("missing semantic assessment fails closed",()=>{
  const f=fixture();
  const incomplete=assessments().filter(
    item=>item.checkId!=="contextual_fit",
  );
  assert.throws(
    ()=>buildAuthorityOutreachSemanticQualityGate({
      ...f,
      assessments:incomplete,
    }),
    /ugp_outreach_semantic_quality_missing_assessment:contextual_fit/,
  );
});

test("tampered semantic assessment fingerprint is rejected",()=>{
  const f=fixture();
  const tampered=structuredClone(assessments());
  Object.assign(tampered[0]!,{
    summary:"Altered assessment summary.",
  });
  assert.throws(
    ()=>buildAuthorityOutreachSemanticQualityGate({
      ...f,
      assessments:tampered,
    }),
    /ugp_outreach_semantic_quality_assessment_fingerprint_mismatch/,
  );
});

test("mechanically blocked candidates cannot enter semantic quality gate",()=>{
  const f=fixture();
  const blockedCandidate={
    ...f.candidate,
    body:
      f.candidate.body+" See https://other.example/offer.",
  };
  const blockedValidation=validateAuthorityOutreachDraftCandidate({
    request:f.request,
    candidate:blockedCandidate,
  });
  assert.equal(blockedValidation.status,"candidate_blocked");
  assert.throws(
    ()=>buildAuthorityOutreachSemanticQualityGate({
      request:f.request,
      candidate:blockedCandidate,
      mechanicalValidation:blockedValidation,
      assessments:assessments(),
    }),
    /ugp_outreach_semantic_quality_mechanical_validation_required/,
  );
});

test("semantic quality gate is deterministic and tamper-evident",()=>{
  const f=fixture();
  const input={...f,assessments:assessments()};
  const first=buildAuthorityOutreachSemanticQualityGate(input);
  const second=buildAuthorityOutreachSemanticQualityGate(input);
  assert.deepEqual(second,first);

  const tampered=structuredClone(first);
  Object.assign(tampered,{eligibleForHumanSendReview:false});
  assert.throws(
    ()=>assertAuthorityOutreachSemanticQualityGateIntegrity(
      tampered,
      input,
    ),
    /ugp_outreach_semantic_quality_integrity_mismatch/,
  );
});
