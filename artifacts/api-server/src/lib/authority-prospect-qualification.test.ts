import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBacklinkEvidenceDataset,
  type BacklinkEvidenceDataset,
} from "./backlink-evidence-contract.js";
import { normalizeBacklinkFixtureBundle } from "./backlink-fixture-normalization.js";
import { discoverAuthorityOpportunities } from "./authority-opportunity-discovery.js";
import {
  assertAuthorityProspectQualificationIntegrity,
  qualifyAuthorityProspects,
  type AuthorityProspectQualificationSignal,
} from "./authority-prospect-qualification.js";

const FP=(c:string)=>c.repeat(64);

function current():BacklinkEvidenceDataset{
  return buildBacklinkEvidenceDataset({
    targetDomain:"example.com",
    source:{
      providerKey:"dataforseo",
      providerDataset:"backlinks.backlinks.live",
      sourceFingerprint:FP("a"),
      requestFingerprint:FP("b"),
      marketFingerprint:FP("c"),
      categoryFingerprint:FP("d"),
      observedAt:"2026-10-04T00:00:00Z",
      authorityMetric:{
        key:"domain_from_rank",
        min:0,
        max:1000,
        crossProviderComparable:false,
      },
      responseFingerprint:FP("e"),
    },
    backlinks:[{
      sourceUrl:"https://lost.example.org/old",
      sourceDomain:"lost.example.org",
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
}

function competitors(){
  return normalizeBacklinkFixtureBundle({
    basis:{
      providerKey:"dataforseo",
      providerMethod:"backlinks.backlinks.live",
      sourceFingerprint:FP("a"),
      marketFingerprint:FP("c"),
      categoryFingerprint:FP("d"),
      authorityMetric:{
        name:"domain_from_rank",
        min:0,
        max:1000,
        crossProviderComparable:false,
      },
    },
    observedAt:"2026-10-04T00:00:00Z",
    referenceTime:"2026-10-04T00:00:00Z",
    owned:{
      targetDomain:"example.com",
      summary:{
        authority:null,
        referringDomains:0,
        backlinks:0,
        dofollowReferringDomains:0,
        nofollowReferringDomains:0,
        sponsoredReferringDomains:0,
        ugcReferringDomains:0,
        newReferringDomains30d:0,
        lostReferringDomains30d:0,
      },
      referringDomains:[],
    },
    competitors:[
      {
        targetDomain:"competitor-a.example",
        summary:{
          authority:null,
          referringDomains:1,
          backlinks:1,
          dofollowReferringDomains:1,
          nofollowReferringDomains:0,
          sponsoredReferringDomains:0,
          ugcReferringDomains:0,
          newReferringDomains30d:0,
          lostReferringDomains30d:0,
        },
        referringDomains:[{
          domain:"shared.example.org",
          authority:700,
          backlinks:1,
          relations:{dofollow:true,nofollow:false,sponsored:false,ugc:false},
          firstSeenAt:"2026-01-01T00:00:00Z",
          lastSeenAt:"2026-10-01T00:00:00Z",
          lostAt:null,
          change30d:"unchanged",
          anchorCountBasis:"backlink_count",
          anchors:[{text:"A",count:1,classification:"brand"}],
          targetUrls:["https://competitor-a.example/"],
        }],
      },
      {
        targetDomain:"competitor-b.example",
        summary:{
          authority:null,
          referringDomains:1,
          backlinks:1,
          dofollowReferringDomains:1,
          nofollowReferringDomains:0,
          sponsoredReferringDomains:0,
          ugcReferringDomains:0,
          newReferringDomains30d:0,
          lostReferringDomains30d:0,
        },
        referringDomains:[{
          domain:"shared.example.org",
          authority:700,
          backlinks:1,
          relations:{dofollow:true,nofollow:false,sponsored:false,ugc:false},
          firstSeenAt:"2026-01-01T00:00:00Z",
          lastSeenAt:"2026-10-01T00:00:00Z",
          lostAt:null,
          change30d:"unchanged",
          anchorCountBasis:"backlink_count",
          anchors:[{text:"B",count:1,classification:"brand"}],
          targetUrls:["https://competitor-b.example/"],
        }],
      },
    ],
  });
}

function discovery(){
  const data=current();
  return {
    current:data,
    discovery:discoverAuthorityOpportunities({
      current:data,
      competitorBundle:competitors(),
    }),
  };
}

function fullSignal(
  opportunityFingerprint:string,
  spamRisk=0.05,
):AuthorityProspectQualificationSignal{
  return {
    opportunityFingerprint,
    topicalRelevance:{value:0.95,evidenceFingerprint:FP("1")},
    targetPageFit:{value:0.95,evidenceFingerprint:FP("2")},
    contactability:{value:1,evidenceFingerprint:FP("3")},
    spamRisk:{value:spamRisk,evidenceFingerprint:FP("4")},
  };
}

test("missing evidence remains unavailable and reduces coverage instead of scoring zero",()=>{
  const input=discovery();
  const result=qualifyAuthorityProspects(input);
  const lost=result.prospects.find(row=>row.kind==="lost_link_recovery");
  assert.ok(lost);
  assert.equal(lost.status,"insufficient_evidence");
  assert.equal(lost.components.topicalRelevance.state,"unavailable");
  assert.equal(lost.components.topicalRelevance.points,null);
  assert.equal(lost.components.competitorPrecedent.state,"not_applicable");
  assert.ok(lost.evidenceCoverage<0.7);
  assert.equal(result.semantics.missingEvidenceScoredAsZero,false);
  assert.equal(result.semantics.outreachAuthorized,false);
});

test("sufficient explicit evidence can qualify a prospect for review only",()=>{
  const input=discovery();
  const lostOpportunity=input.discovery.opportunities.find(
    row=>row.kind==="lost_link_recovery",
  );
  assert.ok(lostOpportunity);
  const signals=[fullSignal(lostOpportunity.opportunityFingerprint)];
  const result=qualifyAuthorityProspects({...input,signals});
  const lost=result.prospects.find(row=>row.kind==="lost_link_recovery");
  assert.ok(lost);
  assert.equal(lost.status,"qualified_for_review");
  assert.equal(lost.evidenceCoverage,1);
  assert.ok(lost.score>=70);
  assert.equal(lost.riskClass,"low");
  assert.equal(result.semantics.contactDiscoveryPerformed,false);
  assert.equal(result.semantics.outreachAuthorized,false);
  assert.equal(result.semantics.linkSchemeAutomationAuthorized,false);
});

test("explicit high spam risk hard-disqualifies even with otherwise strong evidence",()=>{
  const input=discovery();
  const opportunity=input.discovery.opportunities[0];
  assert.ok(opportunity);
  const result=qualifyAuthorityProspects({
    ...input,
    signals:[fullSignal(opportunity.opportunityFingerprint,0.9)],
  });
  const row=result.prospects.find(
    value=>value.opportunityFingerprint===opportunity.opportunityFingerprint,
  );
  assert.ok(row);
  assert.equal(row.status,"disqualified");
  assert.equal(row.reasonCode,"high_risk_signal");
  assert.equal(row.riskClass,"high");
});

test("competitor precedent is scored only for competitor-backed opportunity classes",()=>{
  const input=discovery();
  const result=qualifyAuthorityProspects(input);
  const intersection=result.prospects.find(row=>row.kind==="domain_intersection");
  const lost=result.prospects.find(row=>row.kind==="lost_link_recovery");
  assert.ok(intersection);
  assert.ok(lost);
  assert.equal(intersection.components.competitorPrecedent.state,"available");
  assert.equal(intersection.components.competitorPrecedent.raw,2);
  assert.equal(lost.components.competitorPrecedent.state,"not_applicable");
});

test("signals cannot be attached to an unknown opportunity",()=>{
  const input=discovery();
  assert.throws(
    ()=>qualifyAuthorityProspects({
      ...input,
      signals:[fullSignal(FP("9"))],
    }),
    /unknown_opportunity_signal/,
  );
});

test("qualification integrity binds the result to discovery, dataset, and signals",()=>{
  const input=discovery();
  const opportunity=input.discovery.opportunities[0];
  assert.ok(opportunity);
  const signals=[fullSignal(opportunity.opportunityFingerprint)];
  const result=qualifyAuthorityProspects({...input,signals});
  assert.doesNotThrow(
    ()=>assertAuthorityProspectQualificationIntegrity(
      result,
      {...input,signals},
    ),
  );
  const tampered={
    ...result,
    prospects:[
      {...result.prospects[0],score:99.99},
      ...result.prospects.slice(1),
    ],
  };
  assert.throws(
    ()=>assertAuthorityProspectQualificationIntegrity(
      tampered as typeof result,
      {...input,signals},
    ),
    /integrity_mismatch/,
  );
});
