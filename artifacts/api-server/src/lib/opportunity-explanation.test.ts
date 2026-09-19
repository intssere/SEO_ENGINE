import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  P6_4_MAX_STATEMENTS_PER_ITEM,
  explainPrioritizedOpportunities,
  opportunityExplanationCapability,
} from "./opportunity-explanation.js";
import {
  prioritizeUnifiedOpportunities,
  type OpportunityCollectionEntryInput,
  type OpportunityPrioritizationInput,
} from "./opportunity-prioritization.js";
import {
  scoreUnifiedOpportunity,
  type OpportunityScoreComponentInput,
  type OpportunityScoreDimension,
  type UnifiedOpportunityScore,
} from "./opportunity-scoring.js";
import {
  buildUnifiedOpportunityRecord,
  type UnifiedOpportunityEvidenceInput,
  type UnifiedOpportunityRecord,
} from "./unified-opportunity-types.js";

const REFERENCE = "2026-09-19T00:00:00.000Z";
const MARKET = "a".repeat(64);
const CATEGORY = "b".repeat(64);
const DIMENSIONS: OpportunityScoreDimension[] = ["impact", "confidence", "risk", "effort", "freshness"];

function fp(value: number): string {
  return value.toString(16).padStart(64, "0");
}

function evidence(
  kind: UnifiedOpportunityEvidenceInput["kind"],
  fingerprint: string,
): UnifiedOpportunityEvidenceInput {
  return {
    kind,
    fingerprint,
    sourceKey: `synthetic:${kind}`,
    observedAt: "2026-09-18T12:00:00.000Z",
    marketFingerprint: MARKET,
    categoryFingerprint: CATEGORY,
  };
}

function opportunity(
  subjectKey: string,
  base: number,
  overrides: {
    evidenceKinds?: UnifiedOpportunityEvidenceInput["kind"][];
    missingEvidence?: string[];
  } = {},
): UnifiedOpportunityRecord {
  const kinds = overrides.evidenceKinds ?? [
    "gsc_query",
    "serp_ranking",
    "keyword_metrics",
    "trend_context",
    "competitor_gap",
  ];
  return buildUnifiedOpportunityRecord({
    family: "query",
    kind: "query_gap",
    subjectKey,
    referenceTime: REFERENCE,
    marketFingerprint: MARKET,
    categoryFingerprint: CATEGORY,
    evidence: kinds.map((kind, index) => evidence(kind, fp(base + index))),
    missingEvidence: overrides.missingEvidence,
  });
}

function component(
  value: number | null,
  basisCode: string | null,
  fingerprints: string[],
): OpportunityScoreComponentInput {
  return { value, basisCode, evidenceFingerprints: fingerprints };
}

function score(
  record: UnifiedOpportunityRecord,
  base: number,
  values: Partial<Record<OpportunityScoreDimension, number | null>> = {},
): UnifiedOpportunityScore {
  const defaults: Record<OpportunityScoreDimension, number | null> = {
    impact: 0.8,
    confidence: 0.75,
    risk: 0.2,
    effort: 0.25,
    freshness: 0.9,
  };
  const components = Object.fromEntries(DIMENSIONS.map((dimension, index) => {
    const value = values[dimension] === undefined ? defaults[dimension] : values[dimension];
    return [
      dimension,
      value === null
        ? component(null, null, [])
        : component(value, `p64.synthetic.${dimension}`, [fp(base + index)]),
    ];
  })) as Record<OpportunityScoreDimension, OpportunityScoreComponentInput>;

  return scoreUnifiedOpportunity({ opportunity: record, components });
}

function entry(
  subjectKey: string,
  base: number,
  values: Partial<Record<OpportunityScoreDimension, number | null>> = {},
  overrides: Partial<OpportunityCollectionEntryInput> = {},
  opportunityOverrides: Parameters<typeof opportunity>[2] = {},
): OpportunityCollectionEntryInput {
  const record = opportunity(subjectKey, base, opportunityOverrides);
  return {
    opportunity: record,
    score: score(record, base, values),
    ...overrides,
  };
}

function explain(collection: OpportunityPrioritizationInput) {
  const prioritization = prioritizeUnifiedOpportunities(collection);
  return explainPrioritizedOpportunities({ collection, prioritization });
}

function item(report: ReturnType<typeof explainPrioritizedOpportunities>, subjectKey: string) {
  const found = report.items.find((candidate) => candidate.subjectKey === subjectKey);
  assert.ok(found, `missing explanation item for ${subjectKey}`);
  return found;
}

test("P6.4 is deterministic across input order and exact duplicate order", () => {
  const a = entry("query:a", 10);
  const b = entry("query:b", 20, { impact: 0.6 });
  const firstCollection = {
    collectionKey: "synthetic:p64",
    entries: [a, b, a],
  };
  const secondCollection = {
    collectionKey: "synthetic:p64",
    entries: [a, a, b],
  };
  const first = explain(firstCollection);
  const secondPrioritization = prioritizeUnifiedOpportunities(secondCollection);
  const second = explainPrioritizedOpportunities({
    collection: secondCollection,
    prioritization: secondPrioritization,
  });

  assert.equal(first.reportFingerprint, second.reportFingerprint);
  assert.deepEqual(first, second);
  assert.equal(first.itemCount, 2);
  assert.equal(first.prioritizationReportFingerprint, secondPrioritization.reportFingerprint);
});

test("P6.4 rejects a tampered P6.3 report instead of explaining it", () => {
  const collection = {
    collectionKey: "synthetic:tampered-p63",
    entries: [entry("query:a", 30)],
  };
  const prioritization = prioritizeUnifiedOpportunities(collection);
  const tampered = {
    ...prioritization,
    decisions: prioritization.decisions.map((decision) => ({
      ...decision,
      priorityRank: 99,
    })),
  };

  assert.throws(
    () => explainPrioritizedOpportunities({ collection, prioritization: tampered }),
    /p63_prioritization_integrity_mismatch/,
  );
});

test("component statements preserve the exact P6.2 evidence basis", () => {
  const report = explain({
    collectionKey: "synthetic:basis",
    entries: [entry("query:basis", 100)],
  });
  const explained = item(report, "query:basis");

  for (const [index, dimension] of DIMENSIONS.entries()) {
    const statement = explained.statements.find(
      (candidate) => candidate.code === `p62.component.${dimension}`,
    );
    assert.ok(statement);
    assert.deepEqual(statement.evidenceFingerprints, [fp(100 + index)]);
    assert.deepEqual(explained.score.components[dimension].evidenceFingerprints, [fp(100 + index)]);
  }
});

test("evidence cards preserve P6.1 refs and reverse-map only declared P6.2 dimensions", () => {
  const report = explain({
    collectionKey: "synthetic:evidence-cards",
    entries: [entry("query:evidence", 200)],
  });
  const explained = item(report, "query:evidence");

  assert.equal(explained.evidence.length, 5);
  for (const [index, dimension] of DIMENSIONS.entries()) {
    const card = explained.evidence.find((candidate) => candidate.fingerprint === fp(200 + index));
    assert.ok(card);
    assert.deepEqual(card.usedByScoreDimensions, [dimension]);
  }
});

test("unscorable components remain unavailable and claim no evidence basis", () => {
  const report = explain({
    collectionKey: "synthetic:unscorable",
    entries: [entry("query:unscorable", 300, { freshness: null })],
  });
  const explained = item(report, "query:unscorable");
  const freshness = explained.statements.find(
    (candidate) => candidate.code === "p62.component.freshness.unavailable",
  );

  assert.equal(explained.score.status, "unscorable");
  assert.equal(explained.score.score100, null);
  assert.ok(freshness);
  assert.deepEqual(freshness.evidenceFingerprints, []);
  assert.equal(explained.decision.status, "suppressed");
  assert.ok(explained.decision.systemSuppressionReasons.includes("unscorable_score"));
});

test("P6.4 mirrors explicit suppression and conflict decisions without re-deciding them", () => {
  const suppressed = entry("query:suppressed", 400, {}, {
    suppressionCodes: ["policy.manual_exclude"],
  });
  const high = entry("query:high", 410, { impact: 0.9 }, {
    conflictKey: "page.title.choice",
  });
  const low = entry("query:low", 420, { impact: 0.5 }, {
    conflictKey: "page.title.choice",
  });
  const report = explain({
    collectionKey: "synthetic:decision-mirror",
    entries: [low, suppressed, high],
  });

  const suppressedItem = item(report, "query:suppressed");
  assert.equal(suppressedItem.decision.status, "suppressed");
  assert.ok(suppressedItem.statements.some((candidate) =>
    candidate.code === "p63.explicit_suppression" &&
    candidate.text.includes("policy.manual_exclude")));

  const highItem = item(report, "query:high");
  const lowItem = item(report, "query:low");
  assert.equal(highItem.decision.status, "eligible");
  assert.equal(lowItem.decision.status, "suppressed");
  assert.ok(lowItem.statements.some((candidate) => candidate.code === "p63.conflict_lower_score"));
});

test("unresolved top-score conflicts remain unresolved with no explanation-layer winner", () => {
  const a = entry("query:a", 500, { impact: 0.8 }, { conflictKey: "page.meta.choice" });
  const b = entry("query:b", 510, { impact: 0.8 }, { conflictKey: "page.meta.choice" });
  const report = explain({
    collectionKey: "synthetic:tie",
    entries: [b, a],
  });

  for (const subject of ["query:a", "query:b"]) {
    const explained = item(report, subject);
    assert.equal(explained.decision.status, "suppressed");
    assert.equal(explained.decision.priorityRank, null);
    assert.ok(explained.decision.systemSuppressionReasons.includes("conflict_top_score_tie"));
    assert.ok(explained.statements.some((candidate) =>
      candidate.code === "p63.conflict_top_score_tie" &&
      candidate.text.includes("does not choose an arbitrary winner")));
  }
  assert.equal(report.semantics.explanationOrderCreatesAdditionalPreference, false);
});

test("missing evidence and semantic guards are preserved explicitly", () => {
  const report = explain({
    collectionKey: "synthetic:guards",
    entries: [entry(
      "query:guards",
      600,
      {},
      {},
      {
        evidenceKinds: ["keyword_metrics", "trend_context", "competitor_gap", "gsc_query", "serp_ranking"],
        missingEvidence: ["first_party.conversion"],
      },
    )],
  });
  const explained = item(report, "query:guards");

  assert.deepEqual(explained.missingEvidence, ["first_party.conversion"]);
  assert.ok(explained.statements.some((candidate) =>
    candidate.code === "p61.missing_evidence.first_party.conversion"));
  assert.ok(explained.semanticGuards.includes("keyword_difficulty_provider_native_not_cross_provider_comparable"));
  assert.ok(explained.semanticGuards.includes("trend_cross_frame_not_comparable"));
  assert.ok(explained.semanticGuards.includes("competitor_visibility_not_market_share"));
  assert.ok(explained.semanticGuards.includes("gap_evidence_not_recommendation"));
  assert.ok(explained.statements.some((candidate) =>
    candidate.code === "p61.semantic_guard.gap_evidence_not_recommendation" &&
    candidate.text.includes("not as a recommendation by itself")));
});

test("generated statement text contains no recommendation, actionability, causal-outcome or guarantee wording", () => {
  const report = explain({
    collectionKey: "synthetic:wording",
    entries: [entry("query:wording", 700, {}, {}, { missingEvidence: ["conversion"] })],
  });
  const texts = report.items.flatMap((candidate) => candidate.statements.map((value) => value.text)).join("\n");

  assert.doesNotMatch(texts, /\bshould\b/i);
  assert.doesNotMatch(texts, /\bwe recommend\b/i);
  assert.doesNotMatch(texts, /\brecommended action\b/i);
  assert.doesNotMatch(texts, /\bwill\b/i);
  assert.doesNotMatch(texts, /\bguarantee(?:d|s)?\b/i);
  assert.doesNotMatch(texts, /\bcaused?\b/i);
  assert.doesNotMatch(texts, /\bleads? to\b/i);
  assert.doesNotMatch(texts, /\bimproves?\b/i);
  assert.equal(report.semantics.freeformInferenceEnabled, false);
  assert.equal(report.semantics.causalOutcomeClaimsGenerated, false);
  assert.equal(report.semantics.recommendationGenerated, false);
  assert.equal(report.semantics.actionabilityClassified, false);
});

test("statement count stays inside the explicit P6.4 bound", () => {
  const report = explain({
    collectionKey: "synthetic:bound",
    entries: [entry(
      "query:bound",
      800,
      {},
      { suppressionCodes: ["policy.manual_exclude"] },
      { missingEvidence: Array.from({ length: 32 }, (_, index) => `missing.${index}`) },
    )],
  });
  assert.ok(item(report, "query:bound").statements.length <= P6_4_MAX_STATEMENTS_PER_ITEM);
});

test("tampered P6.2 score lineage fails closed through P6.3/P6.4 validation", () => {
  const base = entry("query:tampered-score", 900);
  const tampered = {
    ...base,
    score: {
      ...base.score,
      score100: 99,
    },
  };
  const collection = {
    collectionKey: "synthetic:tampered-score",
    entries: [tampered],
  };

  assert.throws(
    () => prioritizeUnifiedOpportunities(collection),
    /p62_score_integrity_mismatch/,
  );
});

test("P6.4 capability keeps runtime, persistence, execution and publication gates closed", () => {
  const capability = opportunityExplanationCapability();
  assert.equal(capability.deterministicExplanationOnly, true);
  assert.equal(capability.legacyOpportunityEngineMutationEnabled, false);
  assert.equal(capability.openApiMutationEnabled, false);
  assert.equal(capability.liveProviderReadsAuthorized, false);
  assert.equal(capability.providerCredentialUseAuthorized, false);
  assert.equal(capability.sourceRegistryAdmissionAuthorized, false);
  assert.equal(capability.refreshPlanReorderingEnabled, false);
  assert.equal(capability.task64ExecutionAuthorized, false);
  assert.equal(capability.task70ExecutionAuthorized, false);
  assert.equal(capability.observationPersistenceAuthorized, false);
  assert.equal(capability.evidencePersistenceAuthorized, false);
  assert.equal(capability.scorePersistenceAuthorized, false);
  assert.equal(capability.prioritizationPersistenceAuthorized, false);
  assert.equal(capability.explanationPersistenceAuthorized, false);
  assert.equal(capability.databaseReadsAuthorized, false);
  assert.equal(capability.databaseWritesAuthorized, false);
  assert.equal(capability.schemaMutationAuthorized, false);
  assert.equal(capability.schedulerEnabled, false);
  assert.equal(capability.workerEnabled, false);
  assert.equal(capability.retryLoopEnabled, false);
  assert.equal(capability.providerWrites, false);
  assert.equal(capability.publicSiteWrites, false);
  assert.equal(capability.automaticTransitionEnabled, false);
  assert.equal(capability.publicationAuthorized, false);
});

test("P6.4 source contains no network, environment, database, persistence, execution or scheduler primitive", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const sourceText = readFileSync(join(here, "opportunity-explanation.ts"), "utf8");
  assert.doesNotMatch(sourceText, /\bfetch\s*\(/);
  assert.doesNotMatch(sourceText, /XMLHttpRequest|WebSocket|EventSource/);
  assert.doesNotMatch(sourceText, /process\.env|DATABASE_URL|postgres|drizzle/);
  assert.doesNotMatch(sourceText, /executeCompetitorPilot|executeAuthorizedSignalCollectionJob/);
  assert.doesNotMatch(sourceText, /\b(?:insertInto|updateTable|deleteFrom|persistRecord|sql\s*\`|db\.(?:insert|update|delete))\b/);
  assert.doesNotMatch(sourceText, /setTimeout|setInterval|queueMicrotask/);
});
