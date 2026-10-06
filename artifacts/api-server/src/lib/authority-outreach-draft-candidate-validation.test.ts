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
  assertAuthorityOutreachDraftCandidateValidationIntegrity,
  assertAuthorityOutreachDraftGenerationRequestIntegrity,
  validateAuthorityOutreachDraftCandidate,
} from "./authority-outreach-draft-candidate-validation.js";

const FP=(c:string)=>c.repeat(64);

function request(){
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
  return ready.request;
}

test("valid plain-text candidate passes mechanical validation without authorizing generation or sending",()=>{
  const generationRequest=request();
  const candidate={
    requestFingerprint:generationRequest.requestFingerprint,
    subject:"A note about your older fragrance guide",
    body:[
      "I noticed the older fragrance reference on publisher.example.org.",
      "Our current guide is available at https://diamondshelf.us/guide.",
      "If it is useful for your readers, please feel free to review it.",
    ].join("\n"),
  };
  const result=validateAuthorityOutreachDraftCandidate({
    request:generationRequest,
    candidate,
  });

  assert.equal(result.status,"candidate_valid");
  assert.equal(result.mechanicalValidationPassed,true);
  assert.equal(result.blockingReasons.length,0);
  assert.equal(result.semantics.providerNeutral,true);
  assert.equal(result.semantics.builtInNetworkTransport,false);
  assert.equal(result.semantics.modelExecutionAuthorized,false);
  assert.equal(result.semantics.performsModelCall,false);
  assert.equal(result.semantics.performsProviderCall,false);
  assert.equal(result.semantics.performsNetworkOperation,false);
  assert.equal(result.semantics.performsPersistence,false);
  assert.equal(result.semantics.semanticQualityGatePassed,false);
  assert.equal(result.semantics.requiresUGP108SemanticQualityGate,true);
  assert.equal(result.semantics.outreachSendingAuthorized,false);

  assertAuthorityOutreachDraftCandidateValidationIntegrity(
    result,
    {request:generationRequest,candidate},
  );
});

test("candidate containing a foreign URL is blocked while the exact target URL remains allowed",()=>{
  const generationRequest=request();
  const result=validateAuthorityOutreachDraftCandidate({
    request:generationRequest,
    candidate:{
      requestFingerprint:generationRequest.requestFingerprint,
      subject:"Resource update",
      body:
        "Our guide is https://diamondshelf.us/guide but see https://other.example/offer too.",
    },
  });
  assert.equal(result.status,"candidate_blocked");
  assert.equal(result.mechanicalValidationPassed,false);
  assert.ok(
    result.blockingReasons.some(reason=>
      reason.startsWith("target_url_integrity:"),
    ),
  );
});

test("recipient/contact material and HTML-like markup are blocked mechanically",()=>{
  const generationRequest=request();
  const result=validateAuthorityOutreachDraftCandidate({
    request:generationRequest,
    candidate:{
      requestFingerprint:generationRequest.requestFingerprint,
      subject:"Resource update",
      body:
        "<p>Email editor@publisher.example or mailto:editor@publisher.example about https://diamondshelf.us/guide.</p>",
    },
  });
  assert.equal(result.status,"candidate_blocked");
  assert.ok(
    result.blockingReasons.some(reason=>
      reason.startsWith("plain_text_shape:"),
    ),
  );
  assert.ok(
    result.blockingReasons.some(reason=>
      reason.startsWith("recipient_contact_data:"),
    ),
  );
});

test("candidate must bind the exact frozen request fingerprint",()=>{
  const generationRequest=request();
  assert.throws(
    ()=>validateAuthorityOutreachDraftCandidate({
      request:generationRequest,
      candidate:{
        requestFingerprint:FP("f"),
        subject:"Resource update",
        body:"Please review https://diamondshelf.us/guide.",
      },
    }),
    /ugp_outreach_draft_candidate_request_lineage_mismatch/,
  );
});

test("tampered UGP-10.6 request fails before candidate validation",()=>{
  const generationRequest=request();
  const tampered=structuredClone(generationRequest);
  Object.assign(tampered,{targetUrl:"https://diamondshelf.us/other"});
  assert.throws(
    ()=>assertAuthorityOutreachDraftGenerationRequestIntegrity(tampered),
    /ugp_outreach_draft_candidate_request_fingerprint_mismatch/,
  );
});

test("candidate validation is deterministic and tamper-evident",()=>{
  const generationRequest=request();
  const candidate={
    requestFingerprint:generationRequest.requestFingerprint,
    subject:"Resource update",
    body:"Please review https://diamondshelf.us/guide.",
  };
  const first=validateAuthorityOutreachDraftCandidate({
    request:generationRequest,
    candidate,
  });
  const second=validateAuthorityOutreachDraftCandidate({
    request:generationRequest,
    candidate,
  });
  assert.deepEqual(second,first);

  const tampered=structuredClone(first);
  Object.assign(tampered,{body:"Different body"});
  assert.throws(
    ()=>assertAuthorityOutreachDraftCandidateValidationIntegrity(
      tampered,
      {request:generationRequest,candidate},
    ),
    /ugp_outreach_draft_candidate_integrity_mismatch/,
  );
});
