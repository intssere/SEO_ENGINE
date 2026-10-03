import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  buildContentDecayEvidenceAdapterResult,
  assertContentDecayEvidenceAdapterIntegrity,
} from "./content-decay-evidence-adapter.js";
import {
  type GscSearchAnalyticsBinding,
} from "./gsc-search-analytics-runner.js";
import {
  dataForSeoSerpAdapterCapability,
  P5_2_DATAFORSEO_SERP_ADAPTER_VERSION,
  type SerpOrganicRankItem,
  type SerpRankingProjection,
} from "./dataforseo-serp-adapter.js";
import {
  SIGNAL_OBSERVATION_NORMALIZATION_VERSION,
  signalObservationNormalizationCapability,
  type NormalizedSignalObservation,
  type NormalizedMetric,
} from "./signal-observation-normalization.js";

const PAGE = "https://example.com/blog/guide";
const SOURCE_FP = "1".repeat(64);
const MARKET_FP = "2".repeat(64);
const CATEGORY_FP = "3".repeat(64);
const PAGE_FP = "4".repeat(64);
const OPPORTUNITY_FP = "5".repeat(64);

function hashJson(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function gscObservation(input: {
  requestFingerprint: string;
  observedAt: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}): NormalizedSignalObservation {
  const metrics: NormalizedMetric[] = [
    { key: "clicks", value: input.clicks, unit: "count" },
    { key: "ctr", value: input.ctr, unit: "ratio" },
    { key: "impressions", value: input.impressions, unit: "count" },
    { key: "position", value: input.position, unit: "position" },
  ];
  const streamFingerprint = hashJson({
    version: SIGNAL_OBSERVATION_NORMALIZATION_VERSION,
    sourceFingerprint: SOURCE_FP,
    marketFingerprint: MARKET_FP,
    categoryFingerprint: CATEGORY_FP,
    signalType: "keyword",
  });
  const streamId = `sos-${streamFingerprint.slice(0, 24)}`;
  const identity = {
    streamId,
    requestId: `sar-${input.requestFingerprint.slice(0, 24)}`,
    requestFingerprint: input.requestFingerprint,
    sourceId: "src-111111111111111111111111",
    sourceFingerprint: SOURCE_FP,
    sourceClass: "first_party" as const,
    trustClass: "first_party_authoritative" as const,
    marketFingerprint: MARKET_FP,
    categoryFingerprint: CATEGORY_FP,
    signalType: "keyword" as const,
    observedAt: input.observedAt,
    status: "success" as const,
    metrics,
    diagnostics: [] as string[],
    errorCode: null,
    sourceQuality: 1,
    completeness: 1,
    confidence: 1,
    positiveEvidence: true,
  };
  const observationFingerprint = hashJson({
    version: SIGNAL_OBSERVATION_NORMALIZATION_VERSION,
    ...identity,
  });
  return {
    version: SIGNAL_OBSERVATION_NORMALIZATION_VERSION,
    observationId: `sno-${observationFingerprint.slice(0, 24)}`,
    observationFingerprint,
    ...identity,
    normalizedAt: input.observedAt,
    safety: signalObservationNormalizationCapability(),
  };
}

function gscBinding(input: {
  requestFingerprint: string;
  startDate: string;
  endDate: string;
  filters?: GscSearchAnalyticsBinding["filters"];
  dimensions?: GscSearchAnalyticsBinding["dimensions"];
}): GscSearchAnalyticsBinding {
  return {
    sourceFingerprint: SOURCE_FP,
    requestFingerprint: input.requestFingerprint,
    property: "sc-domain:example.com",
    startDate: input.startDate,
    endDate: input.endDate,
    dimensions: input.dimensions ?? [],
    filters: input.filters ?? [{ dimension: "page", operator: "equals", expression: PAGE }],
    rowLimit: 1000,
    maxPages: 1,
    timeoutMs: 5000,
  };
}

function organic(rankAbsolute: number, url: string, domain = "example.com"): SerpOrganicRankItem {
  return {
    rankGroup: rankAbsolute,
    rankAbsolute,
    page: Math.ceil(rankAbsolute / 10),
    domain,
    url,
  };
}

function serpRanking(input: {
  observedAt: string;
  organicItems: SerpOrganicRankItem[];
  trackedMatches: SerpOrganicRankItem[];
}): SerpRankingProjection {
  const identity = {
    providerKey: "dataforseo" as const,
    adapterRequestFingerprint: input.observedAt.startsWith("2026-01") ? "6".repeat(64) : "7".repeat(64),
    task68RequestFingerprint: input.observedAt.startsWith("2026-01") ? "8".repeat(64) : "9".repeat(64),
    sourceFingerprint: SOURCE_FP,
    marketFingerprint: MARKET_FP,
    categoryFingerprint: CATEGORY_FP,
    keyword: "example guide",
    trackedDomain: "example.com",
    observedAt: input.observedAt,
    checkedDepth: 20,
    searchEngineResultsCount: 1000,
    providerItemsCount: input.organicItems.length,
    organicItems: input.organicItems,
    trackedMatches: input.trackedMatches,
  };
  const rankingFingerprint = hashJson({
    version: P5_2_DATAFORSEO_SERP_ADAPTER_VERSION,
    ...identity,
  });
  return {
    version: P5_2_DATAFORSEO_SERP_ADAPTER_VERSION,
    rankingId: `p52-rank-${rankingFingerprint.slice(0, 20)}`,
    rankingFingerprint,
    ...identity,
    safety: dataForSeoSerpAdapterCapability(),
  };
}

function fixture() {
  const beforeRequest = "a".repeat(64);
  const afterRequest = "b".repeat(64);
  const beforePage = organic(4, PAGE);
  const afterPage = organic(8, PAGE);
  const beforeSerp = serpRanking({
    observedAt: "2026-01-28T12:00:00.000Z",
    organicItems: [
      organic(1, "https://competitor-a.example/a", "competitor-a.example"),
      organic(2, "https://competitor-b.example/b", "competitor-b.example"),
      beforePage,
      organic(5, "https://competitor-c.example/c", "competitor-c.example"),
    ],
    trackedMatches: [beforePage],
  });
  const afterSerp = serpRanking({
    observedAt: "2026-02-28T12:00:00.000Z",
    organicItems: [
      organic(1, "https://competitor-a.example/a", "competitor-a.example"),
      organic(2, "https://competitor-b.example/b", "competitor-b.example"),
      organic(5, "https://competitor-c.example/c", "competitor-c.example"),
      afterPage,
    ],
    trackedMatches: [afterPage],
  });
  return {
    pageUrl: PAGE,
    pageIdentityFingerprint: PAGE_FP,
    contentOpportunityFingerprint: OPPORTUNITY_FP,
    gsc: {
      before: {
        binding: gscBinding({
          requestFingerprint: beforeRequest,
          startDate: "2026-01-01",
          endDate: "2026-01-28",
        }),
        observation: gscObservation({
          requestFingerprint: beforeRequest,
          observedAt: "2026-01-29T12:00:00.000Z",
          clicks: 100,
          impressions: 1000,
          ctr: 0.1,
          position: 5,
        }),
      },
      after: {
        binding: gscBinding({
          requestFingerprint: afterRequest,
          startDate: "2026-02-01",
          endDate: "2026-02-28",
        }),
        observation: gscObservation({
          requestFingerprint: afterRequest,
          observedAt: "2026-03-01T12:00:00.000Z",
          clicks: 60,
          impressions: 700,
          ctr: 60 / 700,
          position: 9,
        }),
      },
    },
    serp: {
      before: beforeSerp,
      after: afterSerp,
    },
  };
}

test("maps exact page-level GSC plus bounded DataForSEO SERP evidence into UGP-8.4A", () => {
  const result = buildContentDecayEvidenceAdapterResult(fixture());

  assert.equal(result.assessment.classification, "refresh_candidate");
  assert.equal(result.assessment.signals.gscClicksDeclined, true);
  assert.equal(result.assessment.signals.gscImpressionsDeclined, true);
  assert.equal(result.assessment.signals.gscPositionWorsened, true);
  assert.equal(result.assessment.signals.rankingWorsened, true);
  assert.equal(result.assessment.signals.serpMateriallyChanged, true);
  assert.deepEqual(result.assessment.evidenceClassesMaterial, [
    "gsc_performance",
    "ranking",
    "serp_change",
  ]);
  assert.equal(result.mappedInput.freshness, undefined);
  assert.equal(result.mappedInput.contentChange, undefined);
  assert.ok(result.adapterLimitations.includes("freshness_evidence_adapter_not_available"));
  assert.ok(result.adapterLimitations.includes("per_url_content_change_evidence_adapter_not_available"));
  assertContentDecayEvidenceAdapterIntegrity(result);
});

test("does not convert a page missing from bounded SERP depth into a false unranked observation", () => {
  const input = fixture();
  const absent = serpRanking({
    observedAt: "2026-02-28T12:00:00.000Z",
    organicItems: [
      organic(1, "https://competitor-a.example/a", "competitor-a.example"),
      organic(2, "https://competitor-b.example/b", "competitor-b.example"),
      organic(5, "https://competitor-c.example/c", "competitor-c.example"),
      organic(8, "https://competitor-d.example/d", "competitor-d.example"),
    ],
    trackedMatches: [],
  });
  const result = buildContentDecayEvidenceAdapterResult({
    ...input,
    serp: { before: input.serp.before, after: absent },
  });

  assert.equal(result.mappedInput.ranking, undefined);
  assert.ok(result.adapterLimitations.includes("bounded_serp_cannot_prove_page_unranked"));
  assert.equal(result.assessment.limitations.includes("ranking_evidence_not_supplied"), true);
});

test("rejects GSC evidence unless it is an exact aggregate for the assessed page", () => {
  const input = fixture();
  const invalid = {
    ...input,
    gsc: {
      ...input.gsc,
      before: {
        ...input.gsc.before,
        binding: gscBinding({
          requestFingerprint: input.gsc.before.binding.requestFingerprint,
          startDate: "2026-01-01",
          endDate: "2026-01-28",
          filters: [
            { dimension: "page", operator: "equals", expression: PAGE },
            { dimension: "query", operator: "contains", expression: "guide" },
          ],
        }),
      },
    },
  };
  assert.throws(
    () => buildContentDecayEvidenceAdapterResult(invalid),
    /ugp_decay_adapter_gsc_before_page_aggregate_required/,
  );
});

test("rejects tampered upstream normalized-observation fingerprints", () => {
  const input = fixture();
  const tampered = {
    ...input,
    gsc: {
      ...input.gsc,
      before: {
        ...input.gsc.before,
        observation: {
          ...input.gsc.before.observation,
          observationFingerprint: "f".repeat(64),
        },
      },
    },
  };
  assert.throws(
    () => buildContentDecayEvidenceAdapterResult(tampered),
    /ugp_decay_adapter_gsc_observation_integrity_invalid/,
  );
});

test("adapter output is deterministic and integrity assertion rejects tampering", () => {
  const a = buildContentDecayEvidenceAdapterResult(fixture());
  const b = buildContentDecayEvidenceAdapterResult(fixture());
  assert.deepEqual(a, b);

  const tampered = {
    ...a,
    adapterLimitations: [...a.adapterLimitations, "tampered"],
  };
  assert.throws(
    () => assertContentDecayEvidenceAdapterIntegrity(tampered),
    /ugp_decay_adapter_fingerprint_mismatch/,
  );
});
