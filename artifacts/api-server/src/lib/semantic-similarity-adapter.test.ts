import assert from "node:assert/strict";
import test from "node:test";
import {
  finalizeKeywordSerpEvidenceBundle,
  stableEvidenceHash,
  type KeywordSerpEvidenceBundle,
} from "./keyword-serp-evidence-contract.js";
import {
  clusterKeywordSerpEvidence,
  type TopicClusteringCandidate,
} from "./topic-clustering-contract.js";
import {
  buildBoundedSemanticSimilarityMatrix,
  buildSemanticDocuments,
} from "./semantic-similarity-adapter.js";

const MARKET = Object.freeze({
  searchEngine: "google" as const,
  locationCode: 2840,
  languageCode: "en",
  device: "desktop" as const,
});

function evidence(keyword: string, intent: "informational" | "transactional"): KeywordSerpEvidenceBundle {
  return finalizeKeywordSerpEvidenceBundle({
    keyword:Object.freeze({
      keyword,
      market:MARKET,
      searchVolume:100,
      keywordDifficulty:20,
      cpcUsd:1,
      paidCompetition:0.2,
      paidCompetitionLevel:"low" as const,
      intent,
      monthlySearches:Object.freeze([]),
    }),
    relatedTopics:Object.freeze([]),
    serp:Object.freeze({
      keyword,
      market:MARKET,
      features:Object.freeze([]),
      rankingUrls:Object.freeze([]),
    }),
    provenance:Object.freeze([Object.freeze({
      provider:"dataforseo" as const,
      providerDataset:"serp_advanced" as const,
      providerTaskId:"fixture-"+keyword,
      providerStatusCode:20000,
      providerStatusMessage:"Ok.",
      providerPath:"fixture",
      costUsd:0,
      responseFingerprint:stableEvidenceHash({keyword}),
    })]),
  });
}

function candidate(
  bundle: KeywordSerpEvidenceBundle,
  categories: readonly string[] = [],
  entities: readonly string[] = [],
): TopicClusteringCandidate {
  return Object.freeze({
    evidence:bundle,
    context:Object.freeze({categories,entities}),
  });
}

function vector(seed: number): number[] {
  return [seed, 1, 0.5, 0.25, 0.125, 0.0625, 0.03125, 0.015625];
}

test("UGP-6.2B emits a complete 6.2A-compatible matrix with one bounded encoder call", async () => {
  const a=evidence("stress relief journal","informational");
  const b=evidence("stress relief journal prompts","informational");
  const c=evidence("buy daily planner","transactional");
  const candidates=[
    candidate(a,["journaling"],["stress"]),
    candidate(b,["journaling"],["stress"]),
    candidate(c,["planner"],["printable"]),
  ];

  let calls=0;
  const matrix=await buildBoundedSemanticSimilarityMatrix({
    candidates,
    modelId:"fixture-embed-v1",
    encoder:async ({modelId,documents})=>{
      calls+=1;
      assert.equal(modelId,"fixture-embed-v1");
      assert.equal(documents.length,3);
      return Object.freeze({
        modelId,
        vectors:Object.freeze([vector(1),vector(0.95),vector(-1)]),
      });
    },
  });

  assert.equal(calls,1);
  assert.equal(matrix.similarities.length,3);
  assert.equal(matrix.assertions.encoderCalls,1);
  assert.equal(matrix.assertions.automaticRetry,false);
  assert.equal(matrix.assertions.performsPersistence,false);

  const clustered=clusterKeywordSerpEvidence({
    candidates,
    semanticSimilarities:matrix.similarities,
  });
  assert.equal(clustered.pairAssessments.length,3);
});

test("UGP-6.2B document generation is deterministic under candidate/context reordering", () => {
  const a=evidence("stress relief journal","informational");
  const b=evidence("journal prompts for stress","informational");

  const first=buildSemanticDocuments([
    candidate(a,["Mental Health","Journaling"],["Stress","Journal"]),
    candidate(b,["Journaling","Mental Health"],["Journal","Stress"]),
  ]);
  const second=buildSemanticDocuments([
    candidate(b,["mental health","journaling"],["stress","journal"]),
    candidate(a,["journaling","mental health"],["journal","stress"]),
  ]);

  assert.deepEqual(first,second);
});

test("UGP-6.2B maps cosine similarity from [-1,1] into [0,1] deterministically", async () => {
  const a=evidence("alpha","informational");
  const b=evidence("beta","informational");
  const matrix=await buildBoundedSemanticSimilarityMatrix({
    candidates:[candidate(a),candidate(b)],
    modelId:"fixture-embed-v1",
    encoder:async ({modelId})=>({
      modelId,
      vectors:[
        [1,0,0,0,0,0,0,0],
        [-1,0,0,0,0,0,0,0],
      ],
    }),
  });
  assert.equal(matrix.similarities[0].similarity,0);
});

test("UGP-6.2B fails closed on model drift, vector-count drift and dimension drift", async () => {
  const a=evidence("alpha","informational");
  const b=evidence("beta","informational");
  const candidates=[candidate(a),candidate(b)];

  await assert.rejects(
    buildBoundedSemanticSimilarityMatrix({
      candidates,
      modelId:"fixture-embed-v1",
      encoder:async()=>({modelId:"other-model",vectors:[vector(1),vector(1)]}),
    }),
    /model_drift/,
  );

  await assert.rejects(
    buildBoundedSemanticSimilarityMatrix({
      candidates,
      modelId:"fixture-embed-v1",
      encoder:async ({modelId})=>({modelId,vectors:[vector(1)]}),
    }),
    /vector_count_mismatch/,
  );

  await assert.rejects(
    buildBoundedSemanticSimilarityMatrix({
      candidates,
      modelId:"fixture-embed-v1",
      encoder:async ({modelId})=>({
        modelId,
        vectors:[vector(1),[1,1,1,1,1,1,1,1,1]],
      }),
    }),
    /vector_dimension_drift/,
  );
});

test("UGP-6.2B fails closed on non-finite and zero vectors", async () => {
  const a=evidence("alpha","informational");
  const b=evidence("beta","informational");
  const candidates=[candidate(a),candidate(b)];

  await assert.rejects(
    buildBoundedSemanticSimilarityMatrix({
      candidates,
      modelId:"fixture-embed-v1",
      encoder:async ({modelId})=>({
        modelId,
        vectors:[vector(1),[1,1,1,1,1,1,1,Number.NaN]],
      }),
    }),
    /non_finite_vector/,
  );

  await assert.rejects(
    buildBoundedSemanticSimilarityMatrix({
      candidates,
      modelId:"fixture-embed-v1",
      encoder:async ({modelId})=>({
        modelId,
        vectors:[[0,0,0,0,0,0,0,0],vector(1)],
      }),
    }),
    /zero_vector/,
  );
});

test("UGP-6.2B makes no retry after encoder failure", async () => {
  const a=evidence("alpha","informational");
  const b=evidence("beta","informational");
  let calls=0;
  await assert.rejects(
    buildBoundedSemanticSimilarityMatrix({
      candidates:[candidate(a),candidate(b)],
      modelId:"fixture-embed-v1",
      encoder:async()=>{
        calls+=1;
        throw new Error("fixture failure");
      },
    }),
    /encoder_failed/,
  );
  assert.equal(calls,1);
});

test("UGP-6.2B does not expose arbitrary provider or credential fields", async () => {
  const a=evidence("alpha","informational");
  const b=evidence("beta","informational");
  const matrix=await buildBoundedSemanticSimilarityMatrix({
    candidates:[candidate(a),candidate(b)],
    modelId:"fixture-embed-v1",
    encoder:async ({modelId})=>({modelId,vectors:[vector(1),vector(0.9)]}),
  });
  const serialized=JSON.stringify(matrix);
  assert.doesNotMatch(serialized,/api[_-]?key|authorization|password|credential/i);
});
