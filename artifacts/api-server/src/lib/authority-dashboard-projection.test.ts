import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBacklinkEvidenceDataset,
  type BacklinkEvidenceDataset,
} from "./backlink-evidence-contract.js";
import { normalizeBacklinkFixtureBundle } from "./backlink-fixture-normalization.js";
import {
  assertAuthorityDashboardProjectionIntegrity,
  buildAuthorityDashboardProjection,
} from "./authority-dashboard-projection.js";

const FP=(c:string)=>c.repeat(64);

function currentDataset():BacklinkEvidenceDataset{
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
        sourceUrl:"https://news.example.org/a",
        sourceDomain:"news.example.org",
        targetUrl:"https://example.com/guide",
        anchorText:"SEO Guide",
        firstSeenAt:"2026-08-01T00:00:00Z",
        lastSeenAt:"2026-10-03T00:00:00Z",
        lostAt:null,
        state:"active",
        followState:"follow",
        rel:[],
        providerAuthority:610,
        providerMetrics:[
          {key:"domain_from_rank",value:610,unit:"provider_scale"},
          {key:"is_new",value:1,unit:"boolean"},
          {key:"is_lost",value:0,unit:"boolean"},
        ],
      },
      {
        sourceUrl:"https://news.example.org/b",
        sourceDomain:"news.example.org",
        targetUrl:"https://example.com/guide",
        anchorText:"SEO Guide",
        firstSeenAt:"2026-07-01T00:00:00Z",
        lastSeenAt:"2026-09-20T00:00:00Z",
        lostAt:null,
        state:"unknown",
        followState:"nofollow",
        rel:["nofollow"],
        providerAuthority:610,
        providerMetrics:[
          {key:"domain_from_rank",value:610,unit:"provider_scale"},
          {key:"is_new",value:0,unit:"boolean"},
          {key:"is_lost",value:1,unit:"boolean"},
        ],
      },
      {
        sourceUrl:"https://partner.example.net/post",
        sourceDomain:"partner.example.net",
        targetUrl:"https://example.com/",
        anchorText:"Example",
        firstSeenAt:"2026-09-01T00:00:00Z",
        lastSeenAt:"2026-10-02T00:00:00Z",
        lostAt:null,
        state:"active",
        followState:"nofollow",
        rel:["nofollow","sponsored"],
        providerAuthority:350,
        providerMetrics:[
          {key:"domain_from_rank",value:350,unit:"provider_scale"},
          {key:"is_new",value:0,unit:"boolean"},
          {key:"is_lost",value:0,unit:"boolean"},
        ],
      },
    ],
  });
}

function previousDataset():BacklinkEvidenceDataset{
  return buildBacklinkEvidenceDataset({
    targetDomain:"example.com",
    source:{
      providerKey:"dataforseo",
      providerDataset:"backlinks.backlinks.live",
      sourceFingerprint:FP("a"),
      requestFingerprint:FP("0"),
      marketFingerprint:FP("c"),
      categoryFingerprint:FP("d"),
      observedAt:"2026-09-01T00:00:00Z",
      authorityMetric:{
        key:"domain_from_rank",
        min:0,
        max:1000,
        crossProviderComparable:false,
      },
      responseFingerprint:FP("f"),
    },
    backlinks:[
      {
        sourceUrl:"https://news.example.org/a",
        sourceDomain:"news.example.org",
        targetUrl:"https://example.com/guide",
        anchorText:"SEO Guide",
        firstSeenAt:"2026-08-01T00:00:00Z",
        lastSeenAt:"2026-08-31T00:00:00Z",
        lostAt:null,
        state:"active",
        followState:"follow",
        rel:[],
        providerAuthority:610,
        providerMetrics:[
          {key:"domain_from_rank",value:610,unit:"provider_scale"},
          {key:"is_new",value:0,unit:"boolean"},
          {key:"is_lost",value:0,unit:"boolean"},
        ],
      },
    ],
  });
}

function competitorBundle(){
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
        referringDomains:1,
        backlinks:2,
        dofollowReferringDomains:1,
        nofollowReferringDomains:1,
        sponsoredReferringDomains:0,
        ugcReferringDomains:0,
        newReferringDomains30d:null,
        lostReferringDomains30d:null,
      },
      referringDomains:[{
        domain:"news.example.org",
        authority:610,
        backlinks:2,
        relations:{
          dofollow:true,
          nofollow:true,
          sponsored:false,
          ugc:false,
        },
        firstSeenAt:"2026-07-01T00:00:00Z",
        lastSeenAt:"2026-10-03T00:00:00Z",
        lostAt:null,
        change30d:"unknown",
        anchorCountBasis:"backlink_count",
        anchors:[
          {text:"SEO Guide",count:2,classification:"partial"},
        ],
        targetUrls:["https://example.com/guide"],
      }],
    },
    competitors:[
      {
        targetDomain:"competitor-one.example",
        summary:{
          authority:null,
          referringDomains:2,
          backlinks:2,
          dofollowReferringDomains:2,
          nofollowReferringDomains:0,
          sponsoredReferringDomains:0,
          ugcReferringDomains:0,
          newReferringDomains30d:null,
          lostReferringDomains30d:null,
        },
        referringDomains:[
          {
            domain:"news.example.org",
            authority:610,
            backlinks:1,
            relations:{
              dofollow:true,
              nofollow:false,
              sponsored:false,
              ugc:false,
            },
            firstSeenAt:"2026-08-01T00:00:00Z",
            lastSeenAt:"2026-10-02T00:00:00Z",
            lostAt:null,
            change30d:"unknown",
            anchorCountBasis:"backlink_count",
            anchors:[
              {text:"Competitor",count:1,classification:"brand"},
            ],
            targetUrls:["https://competitor-one.example/"],
          },
          {
            domain:"industry.example.org",
            authority:720,
            backlinks:1,
            relations:{
              dofollow:true,
              nofollow:false,
              sponsored:false,
              ugc:false,
            },
            firstSeenAt:"2026-08-10T00:00:00Z",
            lastSeenAt:"2026-10-01T00:00:00Z",
            lostAt:null,
            change30d:"unknown",
            anchorCountBasis:"backlink_count",
            anchors:[
              {text:"Resource",count:1,classification:"generic"},
            ],
            targetUrls:["https://competitor-one.example/resource"],
          },
        ],
      },
      {
        targetDomain:"competitor-two.example",
        summary:{
          authority:null,
          referringDomains:1,
          backlinks:1,
          dofollowReferringDomains:1,
          nofollowReferringDomains:0,
          sponsoredReferringDomains:0,
          ugcReferringDomains:0,
          newReferringDomains30d:null,
          lostReferringDomains30d:null,
        },
        referringDomains:[
          {
            domain:"industry.example.org",
            authority:720,
            backlinks:1,
            relations:{
              dofollow:true,
              nofollow:false,
              sponsored:false,
              ugc:false,
            },
            firstSeenAt:"2026-08-15T00:00:00Z",
            lastSeenAt:"2026-09-30T00:00:00Z",
            lostAt:null,
            change30d:"unknown",
            anchorCountBasis:"backlink_count",
            anchors:[
              {text:"Resource",count:1,classification:"generic"},
            ],
            targetUrls:["https://competitor-two.example/resource"],
          },
        ],
      },
    ],
  });
}

test("projects customer-facing authority summary, referring domains, pages and anchors",()=>{
  const projection=buildAuthorityDashboardProjection({
    current:currentDataset(),
  });

  assert.equal(projection.targetDomain,"example.com");
  assert.equal(projection.summary.backlinkCount,3);
  assert.equal(projection.summary.referringDomainCount,2);
  assert.equal(projection.summary.linkedPageCount,2);
  assert.equal(projection.summary.anchorCount,2);
  assert.equal(projection.summary.providerReportedNewBacklinkCount,1);
  assert.equal(projection.summary.providerReportedLostBacklinkCount,1);
  assert.equal(projection.summary.normalizedLostBacklinkCount,0);

  assert.equal(projection.referringDomains[0]!.domain,"news.example.org");
  assert.equal(projection.referringDomains[0]!.providerAuthority,610);
  assert.equal(
    projection.referringDomains[0]!.authorityCrossProviderComparable,
    false,
  );
  assert.equal(
    projection.referringDomains[0]!.providerReportedLostBacklinkCount,
    1,
  );

  assert.equal(projection.linkedPages[0]!.targetUrl,"https://example.com/guide");
  assert.equal(projection.linkedPages[0]!.backlinkCount,2);
  assert.equal(projection.anchors[0]!.anchorText,"SEO Guide");
  assert.equal(projection.anchors[0]!.backlinkCount,2);
  assert.equal(projection.anchors[0]!.share,0.666667);

  assert.ok(projection.limitations.includes(
    "authority_trend_previous_snapshot_not_supplied",
  ));
  assert.ok(projection.limitations.includes(
    "authority_competitor_gap_bundle_not_supplied",
  ));
  assert.ok(projection.limitations.includes(
    "provider_reported_lost_not_equivalent_to_normalized_exact_loss",
  ));
  assertAuthorityDashboardProjectionIntegrity(projection);
});

test("trend requires an earlier snapshot on the same measurement basis",()=>{
  const projection=buildAuthorityDashboardProjection({
    current:currentDataset(),
    previous:previousDataset(),
  });

  assert.deepEqual(projection.trend.backlinks,{
    current:3,
    previous:1,
    delta:2,
    direction:"up",
  });
  assert.deepEqual(projection.trend.referringDomains,{
    current:2,
    previous:1,
    delta:1,
    direction:"up",
  });
  assert.equal(
    projection.trend.providerReportedNewBacklinks.direction,
    "up",
  );
});

test("previous snapshots with a different provider measurement basis fail closed",()=>{
  const previous=previousDataset();
  assert.throws(()=>buildAuthorityDashboardProjection({
    current:currentDataset(),
    previous:{
      ...previous,
      source:{
        ...previous.source,
        marketFingerprint:FP("9"),
      },
    },
  }),/ugp_backlink_dataset_fingerprint_mismatch/);

  const rebuilt=buildBacklinkEvidenceDataset({
    targetDomain:"example.com",
    source:{
      ...previous.source,
      marketFingerprint:FP("9"),
      responseFingerprint:FP("8"),
    },
    backlinks:previous.backlinks.map((row)=>({
      sourceUrl:row.sourceUrl,
      sourceDomain:row.sourceDomain,
      targetUrl:row.targetUrl,
      anchorText:row.anchorText,
      firstSeenAt:row.firstSeenAt,
      lastSeenAt:row.lastSeenAt,
      lostAt:row.lostAt,
      state:row.state,
      followState:row.followState,
      rel:row.rel,
      providerAuthority:row.providerAuthority,
      providerMetrics:row.providerMetrics,
    })),
  });
  assert.throws(()=>buildAuthorityDashboardProjection({
    current:currentDataset(),
    previous:rebuilt,
  }),/ugp_authority_dashboard_measurement_basis_mismatch/);
});

test("competitor gaps are descriptive projections only and preserve exact provider basis",()=>{
  const projection=buildAuthorityDashboardProjection({
    current:currentDataset(),
    competitorGapBundle:competitorBundle(),
  });

  assert.equal(projection.competitorGaps.length,1);
  const gap=projection.competitorGaps[0]!;
  assert.equal(gap.referringDomain,"industry.example.org");
  assert.equal(gap.classification,"universal_competitor_gap");
  assert.equal(gap.competitorPresenceCount,2);
  assert.deepEqual(gap.competitorDomains,[
    "competitor-one.example",
    "competitor-two.example",
  ]);
  assert.equal(gap.providerAuthority,720);
  assert.equal(projection.semantics.competitorGapDescriptiveOnly,true);
  assert.equal(projection.semantics.opportunityScoringPerformed,false);
  assert.equal(projection.semantics.prospectQualificationPerformed,false);
});

test("competitor bundle target or provider basis mismatch fails closed",()=>{
  const bundle=competitorBundle();
  assert.throws(()=>buildAuthorityDashboardProjection({
    current:currentDataset(),
    competitorGapBundle:{
      ...bundle,
      owned:{...bundle.owned,targetDomain:"other.example"},
    },
  }),/ugp_authority_dashboard_competitor_gap_target_mismatch/);

  assert.throws(()=>buildAuthorityDashboardProjection({
    current:currentDataset(),
    competitorGapBundle:{
      ...bundle,
      basis:{...bundle.basis,marketFingerprint:FP("9")},
    },
  }),/ugp_authority_dashboard_competitor_gap_basis_mismatch/);
});

test("projection is deterministic under canonical input ordering",()=>{
  const a=buildAuthorityDashboardProjection({
    current:currentDataset(),
    previous:previousDataset(),
    competitorGapBundle:competitorBundle(),
  });
  const b=buildAuthorityDashboardProjection({
    current:currentDataset(),
    previous:previousDataset(),
    competitorGapBundle:competitorBundle(),
  });

  assert.equal(a.projectionFingerprint,b.projectionFingerprint);
  assert.deepEqual(a,b);
});

test("integrity detects tampering and all execution/outreach gates remain closed",()=>{
  const projection=buildAuthorityDashboardProjection({
    current:currentDataset(),
  });

  assert.equal(projection.semantics.readOnlyProjection,true);
  assert.equal(projection.semantics.providerAuthorityNotUniversal,true);
  assert.equal(projection.semantics.crossProviderAuthorityComparable,false);
  assert.equal(projection.semantics.outreachAuthorized,false);
  assert.equal(projection.semantics.liveAcquisitionAuthorized,false);
  assert.equal(projection.semantics.performsNetworkOperation,false);
  assert.equal(projection.semantics.performsPersistence,false);
  assert.equal(projection.semantics.schedulerEnabled,false);

  assert.throws(()=>assertAuthorityDashboardProjectionIntegrity({
    ...projection,
    summary:{...projection.summary,backlinkCount:999},
  }),/ugp_authority_dashboard_projection_fingerprint_mismatch/);
});
