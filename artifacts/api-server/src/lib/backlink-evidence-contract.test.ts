import assert from "node:assert/strict";
import test from "node:test";
import {
  UGP_BACKLINK_EVIDENCE_VERSION,
  assertBacklinkEvidenceDatasetIntegrity,
  buildBacklinkEvidenceDataset,
  type BacklinkEvidenceSource,
} from "./backlink-evidence-contract.js";

const FP=(c:string)=>c.repeat(64);

function source():BacklinkEvidenceSource{
  return {
    providerKey:"dataforseo",
    providerDataset:"backlinks.summary_and_backlinks",
    sourceFingerprint:FP("a"),
    requestFingerprint:FP("b"),
    marketFingerprint:FP("c"),
    categoryFingerprint:FP("d"),
    observedAt:"2026-10-04T00:00:00.000Z",
    authorityMetric:{
      key:"rank",
      min:0,
      max:1000,
      crossProviderComparable:false,
    },
    responseFingerprint:FP("e"),
  };
}

test("normalizes individual backlink evidence and referring-domain aggregates deterministically",()=>{
  const input={
    targetDomain:"Example.COM.",
    source:source(),
    backlinks:[
      {
        sourceUrl:"https://News.EXAMPLE.org/article?b=2&a=1#part",
        sourceDomain:"news.example.org",
        targetUrl:"https://example.com/guides/seo",
        anchorText:"SEO Guide",
        firstSeenAt:"2026-08-01T00:00:00Z",
        lastSeenAt:"2026-10-03T00:00:00Z",
        lostAt:null,
        state:"active" as const,
        followState:"follow" as const,
        rel:[],
        providerAuthority:420,
        providerMetrics:[
          {key:"page_rank",value:220,unit:"provider_scale"},
          {key:"spam_score",value:2,unit:"provider_scale"},
        ],
      },
      {
        sourceUrl:"https://news.example.org/older",
        sourceDomain:"news.example.org",
        targetUrl:"https://example.com/",
        anchorText:"Example",
        firstSeenAt:"2026-06-01T00:00:00Z",
        lastSeenAt:"2026-09-01T00:00:00Z",
        lostAt:"2026-09-20T00:00:00Z",
        state:"lost" as const,
        followState:"nofollow" as const,
        rel:["nofollow" as const],
        providerAuthority:420,
        providerMetrics:[
          {key:"page_rank",value:180,unit:"provider_scale"},
          {key:"spam_score",value:3,unit:"provider_scale"},
        ],
      },
      {
        sourceUrl:"https://partner.example.net/resource",
        sourceDomain:"partner.example.net",
        targetUrl:"https://example.com/guides/seo",
        anchorText:null,
        firstSeenAt:"2026-09-15T00:00:00Z",
        lastSeenAt:"2026-10-02T00:00:00Z",
        lostAt:null,
        state:"active" as const,
        followState:"nofollow" as const,
        rel:["nofollow" as const,"sponsored" as const],
        providerAuthority:300,
        providerMetrics:[{key:"page_rank",value:150,unit:"provider_scale"}],
      },
    ],
  };

  const a=buildBacklinkEvidenceDataset(input);
  const b=buildBacklinkEvidenceDataset({
    ...input,
    backlinks:[...input.backlinks].reverse(),
  });

  assert.equal(a.version,UGP_BACKLINK_EVIDENCE_VERSION);
  assert.equal(a.targetDomain,"example.com");
  assert.equal(a.datasetFingerprint,b.datasetFingerprint);
  assert.equal(a.summary.backlinkCount,3);
  assert.equal(a.summary.activeBacklinkCount,2);
  assert.equal(a.summary.lostBacklinkCount,1);
  assert.equal(a.summary.referringDomainCount,2);
  assert.equal(a.summary.activeReferringDomainCount,2);
  assert.equal(a.summary.dofollowBacklinkCount,1);
  assert.equal(a.summary.nofollowBacklinkCount,2);
  assert.equal(a.summary.sponsoredBacklinkCount,1);

  const news=a.referringDomains.find(row=>row.domain==="news.example.org")!;
  assert.equal(news.backlinkCount,2);
  assert.equal(news.activeBacklinkCount,1);
  assert.equal(news.lostBacklinkCount,1);
  assert.equal(news.providerAuthority,420);
  assert.deepEqual(news.targetUrls,[
    "https://example.com/",
    "https://example.com/guides/seo",
  ]);
  assert.deepEqual(news.anchorTexts,["Example","SEO Guide"]);
  assert.equal(
    news.providerMetrics.find(metric=>metric.key==="page_rank")!.value,
    220,
  );
  assertBacklinkEvidenceDatasetIntegrity(a);
});

test("provider authority remains provider-scoped and requires an explicit metric definition",()=>{
  const noAuthoritySource={...source(),authorityMetric:null};
  assert.throws(()=>buildBacklinkEvidenceDataset({
    targetDomain:"example.com",
    source:noAuthoritySource,
    backlinks:[{
      sourceUrl:"https://ref.example.org/a",
      sourceDomain:"ref.example.org",
      targetUrl:"https://example.com/",
      anchorText:"Example",
      firstSeenAt:null,
      lastSeenAt:null,
      lostAt:null,
      state:"unknown",
      followState:"unknown",
      rel:[],
      providerAuthority:10,
      providerMetrics:[],
    }],
  }),/ugp_backlink_authority_without_metric_definition/);

  assert.equal(source().authorityMetric!.crossProviderComparable,false);
});

test("source and target URL lineage fail closed",()=>{
  const row={
    sourceUrl:"https://a.example.org/post",
    sourceDomain:"b.example.org",
    targetUrl:"https://example.com/page",
    anchorText:"Example",
    firstSeenAt:null,
    lastSeenAt:null,
    lostAt:null,
    state:"unknown" as const,
    followState:"unknown" as const,
    rel:[],
    providerAuthority:null,
    providerMetrics:[],
  };
  assert.throws(()=>buildBacklinkEvidenceDataset({
    targetDomain:"example.com",
    source:source(),
    backlinks:[row],
  }),/ugp_backlink_source_domain_url_mismatch/);

  assert.throws(()=>buildBacklinkEvidenceDataset({
    targetDomain:"different.example",
    source:source(),
    backlinks:[{...row,sourceDomain:"a.example.org"}],
  }),/ugp_backlink_target_domain_url_mismatch/);
});

test("link state and rel contradictions fail closed",()=>{
  const base={
    sourceUrl:"https://ref.example.org/post",
    sourceDomain:"ref.example.org",
    targetUrl:"https://example.com/page",
    anchorText:"Example",
    firstSeenAt:"2026-08-01T00:00:00Z",
    lastSeenAt:"2026-09-01T00:00:00Z",
    lostAt:null,
    state:"active" as const,
    followState:"follow" as const,
    rel:[] as const,
    providerAuthority:null,
    providerMetrics:[],
  };

  assert.throws(()=>buildBacklinkEvidenceDataset({
    targetDomain:"example.com",
    source:source(),
    backlinks:[{...base,state:"lost" as const}],
  }),/ugp_backlink_lost_state_requires_lost_at/);

  assert.throws(()=>buildBacklinkEvidenceDataset({
    targetDomain:"example.com",
    source:source(),
    backlinks:[{...base,followState:"follow" as const,rel:["nofollow" as const]}],
  }),/ugp_backlink_follow_rel_contradiction/);

  assert.throws(()=>buildBacklinkEvidenceDataset({
    targetDomain:"example.com",
    source:source(),
    backlinks:[{...base,followState:"nofollow" as const,rel:[]}],
  }),/ugp_backlink_nofollow_rel_required/);
});

test("future provider timestamps and invalid chronology fail closed",()=>{
  const base={
    sourceUrl:"https://ref.example.org/post",
    sourceDomain:"ref.example.org",
    targetUrl:"https://example.com/page",
    anchorText:null,
    firstSeenAt:"2026-08-01T00:00:00Z",
    lastSeenAt:"2026-09-01T00:00:00Z",
    lostAt:null,
    state:"active" as const,
    followState:"unknown" as const,
    rel:[],
    providerAuthority:null,
    providerMetrics:[],
  };

  assert.throws(()=>buildBacklinkEvidenceDataset({
    targetDomain:"example.com",
    source:source(),
    backlinks:[{...base,lastSeenAt:"2026-10-05T00:00:00Z"}],
  }),/ugp_backlink_last_seen_after_observation/);

  assert.throws(()=>buildBacklinkEvidenceDataset({
    targetDomain:"example.com",
    source:source(),
    backlinks:[{
      ...base,
      firstSeenAt:"2026-09-05T00:00:00Z",
      lastSeenAt:"2026-09-01T00:00:00Z",
    }],
  }),/ugp_backlink_first_seen_after_last_seen/);
});

test("conflicting authority for one referring domain fails instead of inventing an aggregate",()=>{
  const make=(path:string,authority:number)=>({
    sourceUrl:"https://ref.example.org/"+path,
    sourceDomain:"ref.example.org",
    targetUrl:"https://example.com/",
    anchorText:"Example",
    firstSeenAt:null,
    lastSeenAt:null,
    lostAt:null,
    state:"unknown" as const,
    followState:"unknown" as const,
    rel:[],
    providerAuthority:authority,
    providerMetrics:[],
  });

  assert.throws(()=>buildBacklinkEvidenceDataset({
    targetDomain:"example.com",
    source:source(),
    backlinks:[make("a",100),make("b",200)],
  }),/ugp_backlink_conflicting_referring_domain_authority/);
});

test("duplicate exact backlink evidence and conflicting provider metric units fail closed",()=>{
  const row={
    sourceUrl:"https://ref.example.org/post",
    sourceDomain:"ref.example.org",
    targetUrl:"https://example.com/",
    anchorText:"Example",
    firstSeenAt:null,
    lastSeenAt:null,
    lostAt:null,
    state:"unknown" as const,
    followState:"unknown" as const,
    rel:[],
    providerAuthority:null,
    providerMetrics:[{key:"rank",value:10,unit:"score"}],
  };

  assert.throws(()=>buildBacklinkEvidenceDataset({
    targetDomain:"example.com",
    source:source(),
    backlinks:[row,row],
  }),/ugp_backlink_duplicate_evidence/);

  assert.throws(()=>buildBacklinkEvidenceDataset({
    targetDomain:"example.com",
    source:source(),
    backlinks:[
      row,
      {...row,sourceUrl:"https://ref.example.org/other",providerMetrics:[{key:"rank",value:20,unit:"points"}]},
    ],
  }),/ugp_backlink_provider_metric_unit_conflict/);
});

test("dataset integrity detects tampering and keeps all live authority gates closed",()=>{
  const dataset=buildBacklinkEvidenceDataset({
    targetDomain:"example.com",
    source:source(),
    backlinks:[],
  });
  assert.equal(dataset.semantics.readOnly,true);
  assert.equal(dataset.semantics.crossProviderAuthorityComparable,false);
  assert.equal(dataset.semantics.grantsAuthorization,false);
  assert.equal(dataset.semantics.outreachAuthorized,false);
  assert.equal(dataset.semantics.providerEnrollmentAuthorized,false);
  assert.equal(dataset.semantics.credentialUseAuthorized,false);
  assert.equal(dataset.semantics.performsNetworkOperation,false);
  assert.equal(dataset.semantics.performsPersistence,false);
  assert.equal(dataset.semantics.schedulerEnabled,false);

  assert.throws(()=>assertBacklinkEvidenceDatasetIntegrity({
    ...dataset,
    summary:{...dataset.summary,backlinkCount:99},
  }),/ugp_backlink_dataset_fingerprint_mismatch/);
});
