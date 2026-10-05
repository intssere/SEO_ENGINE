import assert from "node:assert/strict";
import test from "node:test";
import { buildBacklinkEvidenceDataset } from "./backlink-evidence-contract.js";
import { discoverAuthorityOpportunities } from "./authority-opportunity-discovery.js";
import {
  qualifyAuthorityProspects,
  type AuthorityProspectQualificationResult,
} from "./authority-prospect-qualification.js";
import {
  buildAuthorityOutreachWorkspace,
  type AuthorityOutreachReviewInput,
} from "./authority-outreach-workspace.js";
import {
  assertAuthorityOutreachReviewAuditHistoryIntegrity,
  prepareAuthorityOutreachReviewDecision,
  type AuthorityOutreachReviewAuditEvent,
  type AuthorityOutreachReviewMutationRequest,
} from "./authority-outreach-review-persistence-contract.js";

const FP=(c:string)=>c.repeat(64);

function qualification(withSignals=true):AuthorityProspectQualificationResult{
  const current=buildBacklinkEvidenceDataset({
    targetDomain:"example.com",
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
      targetUrl:"https://example.com/guide",
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
  return qualifyAuthorityProspects({
    current,
    discovery,
    signals:withSignals?[{
      opportunityFingerprint:opportunity.opportunityFingerprint,
      topicalRelevance:{value:0.95,evidenceFingerprint:FP("1")},
      targetPageFit:{value:0.9,evidenceFingerprint:FP("2")},
      contactability:{value:1,evidenceFingerprint:FP("3")},
      spamRisk:{value:0.05,evidenceFingerprint:FP("4")},
    }]:[],
  });
}

function request(
  q:AuthorityProspectQualificationResult,
  reviews:readonly AuthorityOutreachReviewInput[]=[],
  decision:AuthorityOutreachReviewMutationRequest["decision"]="approved_for_draft",
):AuthorityOutreachReviewMutationRequest{
  const workspace=buildAuthorityOutreachWorkspace({qualification:q,reviews});
  const item=workspace.items[0];
  assert.ok(item);
  const request:AuthorityOutreachReviewMutationRequest={
    workspaceFingerprint:workspace.workspaceFingerprint,
    workspaceItemId:item.workspaceItemId,
    workspaceItemFingerprint:item.workspaceItemFingerprint,
    qualificationFingerprint:workspace.qualificationFingerprint,
    prospectFingerprint:item.prospectFingerprint,
    expectedLatestReviewFingerprint:item.latestReview?.reviewFingerprint??null,
    decision,
    reasonCode:decision==="approved_for_draft"
      ?"editorial_fit_confirmed"
      :"needs_more_context",
    confirmation:"",
  };
  return {
    ...request,
    confirmation:[
      "REVIEW_OUTREACH",
      request.decision,
      request.prospectFingerprint,
      request.workspaceFingerprint,
    ].join(":"),
  };
}

test("prepares an append-only human review event without performing persistence or outreach",()=>{
  const q=qualification();
  const result=prepareAuthorityOutreachReviewDecision({
    qualification:q,
    request:request(q),
    reviewerId:"operator@example.com",
    reviewedAt:"2026-10-05T14:30:00.000Z",
  });

  assert.equal(result.resultingState,"approved_for_draft");
  assert.equal(result.auditEvent.sequence,1);
  assert.equal(result.auditEvent.previousEventFingerprint,null);
  assert.equal(result.auditEvent.decision,"approved_for_draft");
  assert.equal(result.auditEvent.semantics.humanDecision,true);
  assert.equal(result.auditEvent.semantics.appendOnlyAuditRequired,true);
  assert.equal(result.auditEvent.semantics.immutableAuditRequired,true);
  assert.equal(result.auditEvent.semantics.outreachDraftingAuthorized,false);
  assert.equal(result.auditEvent.semantics.outreachSendingAuthorized,false);
  assert.equal(result.semantics.performsPersistence,false);
  assert.equal(result.semantics.requiresAuthenticatedOperator,true);
  assert.equal(result.semantics.requiresCsrf,true);
  assert.equal(result.semantics.requiresSameOrigin,true);
  assertAuthorityOutreachReviewAuditHistoryIntegrity([result.auditEvent]);
});

test("rejects stale workspace decisions before producing a durable event",()=>{
  const q=qualification();
  const stale={...request(q),workspaceFingerprint:FP("f")};
  assert.throws(
    ()=>prepareAuthorityOutreachReviewDecision({
      qualification:q,
      request:stale,
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-05T14:30:00.000Z",
    }),
    /ugp_outreach_review_stale_workspace/,
  );
});

test("requires exact explicit confirmation bound to current workspace",()=>{
  const q=qualification();
  const invalid={...request(q),confirmation:"APPROVE"};
  assert.throws(
    ()=>prepareAuthorityOutreachReviewDecision({
      qualification:q,
      request:invalid,
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-05T14:30:00.000Z",
    }),
    /ugp_outreach_review_explicit_confirmation_required/,
  );
});

test("detects concurrent review history changes",()=>{
  const q=qualification();
  const first=prepareAuthorityOutreachReviewDecision({
    qualification:q,
    request:request(q,[],"deferred"),
    reviewerId:"operator@example.com",
    reviewedAt:"2026-10-05T14:30:00.000Z",
  });
  const reviews=[first.review];
  const current=buildAuthorityOutreachWorkspace({qualification:q,reviews});
  const item=current.items[0];
  assert.ok(item?.latestReview);
  const stale=request(q,reviews,"approved_for_draft");
  const wrong={
    ...stale,
    expectedLatestReviewFingerprint:null,
  };
  assert.throws(
    ()=>prepareAuthorityOutreachReviewDecision({
      qualification:q,
      existingReviews:reviews,
      existingAuditEvents:[first.auditEvent],
      request:wrong,
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-05T14:31:00.000Z",
    }),
    /ugp_outreach_review_concurrent_change/,
  );
});

test("terminal approved or rejected decisions cannot be silently reversed",()=>{
  const q=qualification();
  const first=prepareAuthorityOutreachReviewDecision({
    qualification:q,
    request:request(q),
    reviewerId:"operator@example.com",
    reviewedAt:"2026-10-05T14:30:00.000Z",
  });
  assert.throws(
    ()=>prepareAuthorityOutreachReviewDecision({
      qualification:q,
      existingReviews:[first.review],
      existingAuditEvents:[first.auditEvent],
      request:request(q,[first.review],"deferred"),
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-05T14:31:00.000Z",
    }),
    /ugp_outreach_review_decision_terminal/,
  );
});

test("audit chain is deterministic and binds each persisted review fingerprint",()=>{
  const q=qualification();
  const first=prepareAuthorityOutreachReviewDecision({
    qualification:q,
    request:request(q,[],"deferred"),
    reviewerId:"operator@example.com",
    reviewedAt:"2026-10-05T14:30:00.000Z",
  });
  const second=prepareAuthorityOutreachReviewDecision({
    qualification:q,
    existingReviews:[first.review],
    existingAuditEvents:[first.auditEvent],
    request:request(q,[first.review],"approved_for_draft"),
    reviewerId:"operator@example.com",
    reviewedAt:"2026-10-05T14:31:00.000Z",
  });

  assert.equal(second.auditEvent.sequence,2);
  assert.equal(
    second.auditEvent.previousEventFingerprint,
    first.auditEvent.eventFingerprint,
  );
  assert.equal(second.auditEvent.reviewFingerprint.length,64);
  assertAuthorityOutreachReviewAuditHistoryIntegrity([
    first.auditEvent,
    second.auditEvent,
  ]);
});

test("audit tampering is detected",()=>{
  const q=qualification();
  const prepared=prepareAuthorityOutreachReviewDecision({
    qualification:q,
    request:request(q,[],"deferred"),
    reviewerId:"operator@example.com",
    reviewedAt:"2026-10-05T14:30:00.000Z",
  });
  const tampered=structuredClone(prepared.auditEvent) as unknown as {
    reviewerId:string;
  };
  tampered.reviewerId="attacker@example.com";
  assert.throws(
    ()=>assertAuthorityOutreachReviewAuditHistoryIntegrity([
      tampered as unknown as AuthorityOutreachReviewAuditEvent,
    ]),
    /ugp_outreach_review_audit_fingerprint_mismatch/,
  );
});

test("insufficient evidence cannot be elevated through the persistence contract",()=>{
  const q=qualification(false);
  assert.equal(q.prospects[0]?.status,"insufficient_evidence");
  const r=request(q,[],"approved_for_draft");
  assert.throws(
    ()=>prepareAuthorityOutreachReviewDecision({
      qualification:q,
      request:r,
      reviewerId:"operator@example.com",
      reviewedAt:"2026-10-05T14:30:00.000Z",
    }),
    /ugp_outreach_review_requires_reviewable_prospect/,
  );
});
