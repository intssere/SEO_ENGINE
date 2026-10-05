import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import { buildBacklinkEvidenceDataset } from "./backlink-evidence-contract.js";
import { discoverAuthorityOpportunities } from "./authority-opportunity-discovery.js";
import { qualifyAuthorityProspects } from "./authority-prospect-qualification.js";
import { buildAuthorityOutreachWorkspace } from "./authority-outreach-workspace.js";
import type { AuthorityQualificationApiResponse } from "./authority-qualification-data.js";
import {
  AuthorityOutreachReviewStoreError,
  commitAuthorityOutreachReviewDecision,
  loadDurableAuthorityOutreachReviews,
  parseAuthorityOutreachReviewMutationRequest,
} from "./authority-outreach-review-store.js";

const FP=(c:string)=>c.repeat(64);

function databaseUrl():string|null{
  const raw=process.env.UGP_10_3_EPHEMERAL_DATABASE_URL?.trim();
  if(!raw) return null;
  const url=new URL(raw);
  if(!["127.0.0.1","localhost"].includes(url.hostname)){
    throw new Error("ugp10_3_ephemeral_database_must_be_localhost");
  }
  if(url.pathname.replace(/^\//,"")!=="seo_engine_test"){
    throw new Error("ugp10_3_ephemeral_database_name_invalid");
  }
  return raw;
}

function qualified():AuthorityQualificationApiResponse{
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
  assert.equal(qualification.prospects[0]?.status,"qualified_for_review");
  return {
    version:"ugp-9-4b-prospect-qualification-api-v1",
    state:"available",
    reason:null,
    qualification,
    semantics:{
      authenticatedReadOnly:true,
      syntheticFallback:false,
      persistenceRequired:false,
      liveProviderExecutionAuthorized:false,
      contactDiscoveryAuthorized:false,
      outreachAuthorized:false,
      publicSiteWrites:false,
    },
  };
}

function request(
  q:NonNullable<AuthorityQualificationApiResponse["qualification"]>,
  reviews:Awaited<ReturnType<typeof loadDurableAuthorityOutreachReviews>>,
  decision:"approved_for_draft"|"rejected"|"deferred",
){
  const workspace=buildAuthorityOutreachWorkspace({
    qualification:q,
    reviews,
  });
  const item=workspace.items[0];
  assert.ok(item);
  const body={
    workspaceFingerprint:workspace.workspaceFingerprint,
    workspaceItemId:item.workspaceItemId,
    workspaceItemFingerprint:item.workspaceItemFingerprint,
    qualificationFingerprint:workspace.qualificationFingerprint,
    prospectFingerprint:item.prospectFingerprint,
    expectedLatestReviewFingerprint:item.latestReview?.reviewFingerprint??null,
    decision,
    reasonCode:decision==="approved_for_draft"
      ?"editorial_fit_confirmed"
      :decision==="rejected"
        ?"target_not_appropriate"
        :"needs_more_context",
    confirmation:"",
  };
  body.confirmation=[
    "REVIEW_OUTREACH",
    body.decision,
    body.prospectFingerprint,
    body.workspaceFingerprint,
  ].join(":");
  return parseAuthorityOutreachReviewMutationRequest(body);
}

test("UGP-10.3 durable store appends, retries idempotently, chains review history and rejects stale writes",async(t)=>{
  const url=databaseUrl();
  if(!url){
    t.skip("UGP_10_3_EPHEMERAL_DATABASE_URL is not configured");
    return;
  }
  const qResponse=qualified();
  const q=qResponse.qualification;
  assert.ok(q);
  const loader=async()=>qResponse;
  const reviewer="subject:operator@example.com";

  const initialReviews=await loadDurableAuthorityOutreachReviews(q,url);
  assert.equal(initialReviews.length,0);

  const deferredRequest=request(q,initialReviews,"deferred");
  const first=await commitAuthorityOutreachReviewDecision(
    deferredRequest,
    reviewer,
    loader,
    url,
  );
  assert.equal(first.status,"committed");
  assert.equal(first.idempotent,false);
  assert.equal(first.event.sequence,1);
  assert.equal(first.event.previousEventFingerprint,null);
  assert.equal(first.event.decision,"deferred");
  assert.equal(first.event.reviewerId,reviewer);
  assert.equal(first.semantics.outreachDraftingAuthorized,false);
  assert.equal(first.semantics.outreachSendingAuthorized,false);
  assert.equal(first.semantics.liveProviderExecutionAuthorized,false);
  assert.equal(first.semantics.publicSiteWrites,false);

  const retry=await commitAuthorityOutreachReviewDecision(
    deferredRequest,
    reviewer,
    loader,
    url,
  );
  assert.equal(retry.idempotent,true);
  assert.equal(retry.event.eventFingerprint,first.event.eventFingerprint);

  const staleApproval={
    ...deferredRequest,
    decision:"approved_for_draft" as const,
    reasonCode:"editorial_fit_confirmed" as const,
    confirmation:[
      "REVIEW_OUTREACH",
      "approved_for_draft",
      deferredRequest.prospectFingerprint,
      deferredRequest.workspaceFingerprint,
    ].join(":"),
  };
  await assert.rejects(
    ()=>commitAuthorityOutreachReviewDecision(staleApproval,reviewer,loader,url),
    (error:unknown)=>{
      assert.ok(error instanceof AuthorityOutreachReviewStoreError);
      assert.equal(error.status,409);
      assert.equal(error.category,"ugp_outreach_review_stale_workspace");
      return true;
    },
  );

  const currentReviews=await loadDurableAuthorityOutreachReviews(q,url);
  assert.equal(currentReviews.length,1);
  const approvalRequest=request(q,currentReviews,"approved_for_draft");
  const second=await commitAuthorityOutreachReviewDecision(
    approvalRequest,
    reviewer,
    loader,
    url,
  );
  assert.equal(second.idempotent,false);
  assert.equal(second.event.sequence,2);
  assert.equal(
    second.event.previousEventFingerprint,
    first.event.eventFingerprint,
  );
  assert.equal(second.event.decision,"approved_for_draft");
  assert.equal(second.resultingState,"approved_for_draft");

  const finalReviews=await loadDurableAuthorityOutreachReviews(q,url);
  assert.equal(finalReviews.length,2);

  const sql=postgres(url,{max:1,prepare:false,connect_timeout:8,idle_timeout:2});
  t.after(async()=>sql.end({timeout:1}).catch(()=>undefined));
  const rows=await sql<{count:number}[]>\`
    SELECT COUNT(*)::int AS count
    FROM authority_outreach_review_events
    WHERE qualification_fingerprint=\${q.qualificationFingerprint}
  \`;
  assert.equal(rows[0]?.count,2);

  await assert.rejects(
    ()=>sql\`
      UPDATE authority_outreach_review_events
      SET reason_code='timing_not_right'
      WHERE event_id=\${first.event.eventId}
    \`,
    (error:unknown)=>{
      assert.equal((error as {code?:string}).code,"55000");
      return true;
    },
  );
});
