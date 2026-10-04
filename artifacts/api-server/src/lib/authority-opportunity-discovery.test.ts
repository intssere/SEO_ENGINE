import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBacklinkEvidenceDataset,
  type BacklinkEvidenceDataset,
} from "./backlink-evidence-contract.js";
import { normalizeBacklinkFixtureBundle } from "./backlink-fixture-normalization.js";
import {
  assertAuthorityOpportunityDiscoveryIntegrity,
  discoverAuthorityOpportunities,
  type SupplementalAuthorityEvidence,
} from "./authority-opportunity-discovery.js";

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
    backlinks:[
      {
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
        providerMetrics:[
          {key:"is_lost",value:1,unit:"boolean"},
        ],
      },
      {
        sourceUrl:"https://reported.example.org/old",
        sourceDomain:"reported.example.org",
        targetUrl:"https://example.com/",
        anchorText:"Example",
        firstSeenAt:"2026-02-01T00:00:00Z",
        lastSeenAt:"2026-08-15T00:00:00Z",
        lostAt:null,
        state:"unknown",
        followState:"follow",
        rel:[],
        providerAuthority:510,
        providerMetrics:[
          {key:"is_lost",value:1,unit:"boolean"},
        ],
      },
    ],
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
          referringDomains:2,
          backlinks:2,
          dofollowReferringDomains:2,
          nofollowReferringDomains:0,
          sponsoredReferringDomains:0,
          ugcReferringDomains:0,
          newReferringDomains30d:0,
          lostReferringDomains30d:0,
        },
        referringDomains:[
          {
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
          },
          {
            domain:"single.example.org",
            authority:500,
            backlinks:1,
            relations:{dofollow:true,nofollow:false,sponsored:false,ugc:false},
            firstSeenAt:"2026-01-01T00:00:00Z",
            lastSeenAt:"2026-09-30T00:00:00Z",
            lostAt:null,
            change30d:"unchanged",
            anchorCountBasis:"backlink_count",
            anchors:[{text:"A",count:1,classification:"brand"}],
            targetUrls:["https://competitor-a.example/"],
          },
        ],
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

const supplemental:SupplementalAuthorityEvidence[]=[
  {
    kind:"broken_link_opportunity",
    sourceDomain:"broken.example.org",
    sourceUrl:"https://broken.example.org/resources",
    targetUrl:"https://example.com/guide",
    observedAt:"2026-10-03T00:00:00Z",
    evidenceFingerprint:FP("1"),
  },
  {
    kind:"unlinked_brand_mention",
    sourceDomain:"mention.example.org",
    sourceUrl:"https://mention.example.org/story",
    targetUrl:null,
    observedAt:"2026-10-03T00:00:00Z",
    evidenceFingerprint:FP("2"),
  },
  {
    kind:"resource_page_opportunity",
    sourceDomain:"resources.example.org",
    sourceUrl:"https://resources.example.org/links",
    targetUrl:"https://example.com/guide",
    observedAt:"2026-10-03T00:00:00Z",
    evidenceFingerprint:FP("3"),
  },
  {
    kind:"partner_supplier_citation",
    sourceDomain:"partner.example.org",
    sourceUrl:"https://partner.example.org/partners",
    targetUrl:"https://example.com/",
    observedAt:"2026-10-03T00:00:00Z",
    evidenceFingerprint:FP("4"),
  },
  {
    kind:"content_promotion_prospect",
    sourceDomain:"editorial.example.org",
    sourceUrl:"https://editorial.example.org/topic",
    targetUrl:"https://example.com/guide",
    observedAt:"2026-10-03T00:00:00Z",
    evidenceFingerprint:FP("5"),
  },
];

test("discovers all eight roadmap opportunity classes only from supplied evidence",()=>{
  const result=discoverAuthorityOpportunities({
    current:current(),
    competitorBundle:competitors(),
    supplementalEvidence:supplemental,
  });
  assert.equal(result.summary.total,9);
  assert.equal(result.summary.competitor_link_gap,2);
  assert.equal(result.summary.domain_intersection,1);
  assert.equal(result.summary.lost_link_recovery,1);
  assert.equal(result.summary.broken_link_opportunity,1);
  assert.equal(result.summary.unlinked_brand_mention,1);
  assert.equal(result.summary.resource_page_opportunity,1);
  assert.equal(result.summary.partner_supplier_citation,1);
  assert.equal(result.summary.content_promotion_prospect,1);
  assertAuthorityOpportunityDiscoveryIntegrity(result);
});

test("provider-reported loss without normalized lostAt is not a recovery opportunity",()=>{
  const result=discoverAuthorityOpportunities({current:current()});
  assert.equal(result.summary.lost_link_recovery,1);
  assert.equal(
    result.opportunities.find(x=>x.kind==="lost_link_recovery")?.sourceDomain,
    "lost.example.org",
  );
  assert.ok(!result.opportunities.some(x=>x.sourceDomain==="reported.example.org"));
  assert.ok(result.limitations.includes(
    "authority_opportunity_competitor_bundle_not_supplied",
  ));
  assert.ok(result.limitations.includes(
    "authority_opportunity_supplemental_evidence_not_supplied",
  ));
});

test("shared competitor domains emit an intersection while single-competitor gaps do not",()=>{
  const result=discoverAuthorityOpportunities({
    current:current(),
    competitorBundle:competitors(),
  });
  const intersections=result.opportunities.filter(x=>x.kind==="domain_intersection");
  assert.equal(intersections.length,1);
  assert.equal(intersections[0]!.sourceDomain,"shared.example.org");
  assert.deepEqual(intersections[0]!.competitorDomains,[
    "competitor-a.example",
    "competitor-b.example",
  ]);
});

test("discovery is deterministic across supplemental evidence input ordering",()=>{
  const a=discoverAuthorityOpportunities({
    current:current(),
    competitorBundle:competitors(),
    supplementalEvidence:supplemental,
  });
  const b=discoverAuthorityOpportunities({
    current:current(),
    competitorBundle:competitors(),
    supplementalEvidence:[...supplemental].reverse(),
  });
  assert.equal(a.discoveryFingerprint,b.discoveryFingerprint);
  assert.deepEqual(a,b);
});

test("competitor evidence on a different measurement basis fails closed",()=>{
  const bundle=competitors();
  assert.throws(
    ()=>discoverAuthorityOpportunities({
      current:current(),
      competitorBundle:{
        ...bundle,
        basis:{...bundle.basis,marketFingerprint:FP("9")},
      },
    }),
    /competitor_basis_mismatch/,
  );
});

test("supplemental evidence cannot point a target URL at another site",()=>{
  assert.throws(
    ()=>discoverAuthorityOpportunities({
      current:current(),
      supplementalEvidence:[{
        ...supplemental[0]!,
        targetUrl:"https://other.example/page",
      }],
    }),
    /target_domain_url_mismatch/,
  );
});

test("integrity rejects tampered opportunity evidence",()=>{
  const result=discoverAuthorityOpportunities({
    current:current(),
    supplementalEvidence:supplemental,
  });
  const tampered={
    ...result,
    opportunities:[
      {...result.opportunities[0]!,sourceDomain:"tampered.example.org"},
      ...result.opportunities.slice(1),
    ],
  };
  assert.throws(
    ()=>assertAuthorityOpportunityDiscoveryIntegrity(tampered),
    /fingerprint_mismatch/,
  );
});

test("discovery semantics remain read-only and do not grant scoring or outreach",()=>{
  const result=discoverAuthorityOpportunities({current:current()});
  assert.deepEqual(result.semantics,{
    deterministic:true,
    evidenceBackedOnly:true,
    discoveryOnly:true,
    scoringPerformed:false,
    prospectQualificationPerformed:false,
    contactDiscoveryPerformed:false,
    outreachAuthorized:false,
    liveAcquisitionAuthorized:false,
    performsNetworkOperation:false,
    performsPersistence:false,
    schedulerEnabled:false,
    providerWrites:false,
    publicSiteWrites:false,
  });
});
