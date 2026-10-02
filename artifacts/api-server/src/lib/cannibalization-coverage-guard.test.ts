import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTopicPageObservation,
  evaluateCannibalizationCoverage,
} from "./cannibalization-coverage-guard.js";
import {
  buildSemanticSimilarityEvidence,
  clusterKeywordSerpEvidence,
  type TopicClusteringCandidate,
} from "./topic-clustering-contract.js";
import {
  finalizeKeywordSerpEvidenceBundle,
  stableEvidenceHash,
  type KeywordSerpEvidenceBundle,
} from "./keyword-serp-evidence-contract.js";

function evidence(keyword: string, volume = 100): KeywordSerpEvidenceBundle {
  return finalizeKeywordSerpEvidenceBundle({
    keyword: {
      keyword,
      market: {
        searchEngine: "google",
        locationCode: 2840,
        languageCode: "en",
        device: "desktop",
      },
      searchVolume: volume,
      keywordDifficulty: 10,
      cpcUsd: 0.2,
      paidCompetition: 0.1,
      paidCompetitionLevel: "low",
      intent: "informational",
      monthlySearches: [],
    },
    relatedTopics: [],
    serp: {
      keyword,
      market: {
        searchEngine: "google",
        locationCode: 2840,
        languageCode: "en",
        device: "desktop",
      },
      features: [],
      rankingUrls: [],
    },
    provenance: [],
  });
}

function clustering() {
  const a=evidence("stress relief journal",720);
  const b=evidence("stress relief journal prompts",480);
  const c=evidence("sleep journal",390);
  const candidates: TopicClusteringCandidate[]=[
    {evidence:a,context:{categories:["wellness"],entities:["stress"]}},
    {evidence:b,context:{categories:["wellness"],entities:["stress"]}},
    {evidence:c,context:{categories:["wellness"],entities:["sleep"]}},
  ];
  const semantic=[
    buildSemanticSimilarityEvidence({
      leftEvidenceFingerprint:a.evidenceFingerprint,
      rightEvidenceFingerprint:b.evidenceFingerprint,
      similarity:0.96,
      modelId:"fixture",
    }),
    buildSemanticSimilarityEvidence({
      leftEvidenceFingerprint:a.evidenceFingerprint,
      rightEvidenceFingerprint:c.evidenceFingerprint,
      similarity:0.20,
      modelId:"fixture",
    }),
    buildSemanticSimilarityEvidence({
      leftEvidenceFingerprint:b.evidenceFingerprint,
      rightEvidenceFingerprint:c.evidenceFingerprint,
      similarity:0.20,
      modelId:"fixture",
    }),
  ];
  return clusterKeywordSerpEvidence({candidates,semanticSimilarities:semantic});
}

test("UGP-6.3A classifies one strong page as single owner",()=>{
  const clusters=clustering();
  const topic=clusters.clusters.find(c=>c.members.length===2)!;
  const obs=buildTopicPageObservation({
    clusterFingerprint:topic.clusterFingerprint,
    canonicalUrl:"https://example.com/stress-relief-journal/",
    inInventory:true,
    contentRelevance:0.92,
    matchedKeywords:["stress relief journal","stress relief journal prompts"],
    gsc:{impressions:120,clicks:12,weightedPosition:5.2},
  });
  const result=evaluateCannibalizationCoverage({
    clustering:clusters,
    observations:[obs],
  });
  const assessment=result.assessments.find(
    x=>x.clusterFingerprint===topic.clusterFingerprint,
  )!;
  assert.equal(assessment.state,"single_owner");
  assert.equal(assessment.primaryUrl,"https://example.com/stress-relief-journal");
  assert.deepEqual(assessment.competingUrls,[]);
  assert.equal(result.semantics.grantsAuthorization,false);
  assert.equal(result.semantics.proposesRemediation,false);
});

test("UGP-6.3A flags balanced multiple owners as cannibalization risk",()=>{
  const clusters=clustering();
  const topic=clusters.clusters.find(c=>c.members.length===2)!;
  const observations=[
    buildTopicPageObservation({
      clusterFingerprint:topic.clusterFingerprint,
      canonicalUrl:"https://example.com/stress-journal",
      inInventory:true,
      contentRelevance:0.88,
      matchedKeywords:["stress relief journal","stress relief journal prompts"],
      gsc:{impressions:100,clicks:8,weightedPosition:6},
    }),
    buildTopicPageObservation({
      clusterFingerprint:topic.clusterFingerprint,
      canonicalUrl:"https://example.com/stress-prompts",
      inInventory:true,
      contentRelevance:0.86,
      matchedKeywords:["stress relief journal","stress relief journal prompts"],
      gsc:{impressions:90,clicks:7,weightedPosition:6.5},
    }),
  ];
  const result=evaluateCannibalizationCoverage({
    clustering:clusters,
    observations,
  });
  const assessment=result.assessments.find(
    x=>x.clusterFingerprint===topic.clusterFingerprint,
  )!;
  assert.equal(assessment.state,"cannibalization_risk");
  assert.equal(assessment.primaryUrl,"https://example.com/stress-journal");
  assert.deepEqual(assessment.competingUrls,["https://example.com/stress-prompts"]);
  assert.ok(assessment.reasons.includes("multiple_competing_owners"));
});

test("UGP-6.3A reports coverage gap when measured pages fail ownership thresholds",()=>{
  const clusters=clustering();
  const topic=clusters.clusters.find(c=>c.members.length===1)!;
  const obs=buildTopicPageObservation({
    clusterFingerprint:topic.clusterFingerprint,
    canonicalUrl:"https://example.com/general",
    inInventory:true,
    contentRelevance:0.10,
    matchedKeywords:[],
    gsc:{impressions:1,clicks:0,weightedPosition:88},
  });
  const result=evaluateCannibalizationCoverage({
    clustering:clusters,
    observations:[obs],
  });
  const assessment=result.assessments.find(
    x=>x.clusterFingerprint===topic.clusterFingerprint,
  )!;
  assert.equal(assessment.state,"coverage_gap");
  assert.equal(assessment.primaryUrl,null);
});

test("UGP-6.3A preserves insufficient-evidence state when no observations exist",()=>{
  const clusters=clustering();
  const result=evaluateCannibalizationCoverage({
    clustering:clusters,
    observations:[],
  });
  assert.equal(
    result.assessments.every(x=>x.state==="insufficient_evidence"),
    true,
  );
  assert.equal(
    result.summary.insufficientEvidence,
    clusters.clusters.length,
  );
});

test("UGP-6.3A is deterministic under observation ordering",()=>{
  const clusters=clustering();
  const topic=clusters.clusters.find(c=>c.members.length===2)!;
  const first=buildTopicPageObservation({
    clusterFingerprint:topic.clusterFingerprint,
    canonicalUrl:"https://example.com/a/",
    inInventory:true,
    contentRelevance:0.80,
    matchedKeywords:["stress relief journal"],
    gsc:{impressions:70,clicks:5,weightedPosition:7},
  });
  const second=buildTopicPageObservation({
    clusterFingerprint:topic.clusterFingerprint,
    canonicalUrl:"https://example.com/b/",
    inInventory:true,
    contentRelevance:0.79,
    matchedKeywords:["stress relief journal prompts"],
    gsc:{impressions:65,clicks:4,weightedPosition:8},
  });
  const a=evaluateCannibalizationCoverage({
    clustering:clusters,
    observations:[first,second],
  });
  const b=evaluateCannibalizationCoverage({
    clustering:clusters,
    observations:[second,first],
  });
  assert.equal(a.guardFingerprint,b.guardFingerprint);
  assert.deepEqual(a,b);
});

test("UGP-6.3A fails closed on observation integrity drift",()=>{
  const clusters=clustering();
  const topic=clusters.clusters[0];
  const obs=buildTopicPageObservation({
    clusterFingerprint:topic.clusterFingerprint,
    canonicalUrl:"https://example.com/page",
    inInventory:true,
    contentRelevance:0.8,
    matchedKeywords:[topic.members[0].keyword],
    gsc:null,
  });
  assert.throws(
    ()=>evaluateCannibalizationCoverage({
      clustering:clusters,
      observations:[{
        ...obs,
        evidenceFingerprint:stableEvidenceHash({tampered:true}),
      }],
    }),
    /observation_integrity_failed/,
  );
});

test("UGP-6.3A rejects matched keywords outside their topic cluster",()=>{
  const clusters=clustering();
  const topic=clusters.clusters[0];
  const obs=buildTopicPageObservation({
    clusterFingerprint:topic.clusterFingerprint,
    canonicalUrl:"https://example.com/page",
    inInventory:true,
    contentRelevance:0.8,
    matchedKeywords:["totally unrelated keyword"],
    gsc:null,
  });
  assert.throws(
    ()=>evaluateCannibalizationCoverage({
      clustering:clusters,
      observations:[obs],
    }),
    /keyword_outside_cluster/,
  );
});
