import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { scoreOpportunity } from "./opportunity-engine.js";
import {
  P6_2_MAX_COMPONENT_BASIS_REFS,
  opportunityScoringCapability,
  scoreUnifiedOpportunity,
  type OpportunityScoreComponentInput,
} from "./opportunity-scoring.js";
import {
  buildUnifiedOpportunityRecord,
  type UnifiedOpportunityEvidenceInput,
} from "./unified-opportunity-types.js";

const REFERENCE = "2026-09-19T00:00:00.000Z";
const MARKET = "a".repeat(64);
const CATEGORY = "b".repeat(64);

function fp(value: number): string {
  return value.toString(16).padStart(64, "0");
}

function evidence(
  kind: UnifiedOpportunityEvidenceInput["kind"],
  fingerprint: string,
  overrides: Partial<UnifiedOpportunityEvidenceInput> = {},
): UnifiedOpportunityEvidenceInput {
  return {
    kind,
    fingerprint,
    sourceKey: `synthetic:${kind}`,
    observedAt: "2026-09-18T12:00:00.000Z",
    marketFingerprint: MARKET,
    categoryFingerprint: CATEGORY,
    ...overrides,
  };
}

function opportunity() {
  return buildUnifiedOpportunityRecord({
    family: "query",
    kind: "query_gap",
    subjectKey: "query:synthetic amber perfume",
    referenceTime: REFERENCE,
    marketFingerprint: MARKET,
    categoryFingerprint: CATEGORY,
    evidence: [
      evidence("gsc_query", fp(1)),
      evidence("serp_ranking", fp(2)),
      evidence("keyword_metrics", fp(3)),
      evidence("trend_context", fp(4)),
    ],
    missingEvidence: ["first_party.conversion"],
  });
}

function component(
  value: number | null,
  basisCode: string | null,
  fingerprints: string[] = [],
): OpportunityScoreComponentInput {
  return { value, basisCode, evidenceFingerprints: fingerprints };
}

function completeComponents() {
  return {
    impact: component(0.8, "query.demand_gap", [fp(1), fp(3)]),
    confidence: component(0.75, "evidence.coverage", [fp(1), fp(2)]),
    risk: component(0.2, "change.scope_risk", [fp(1)]),
    effort: component(0.25, "implementation.complexity", [fp(2)]),
    freshness: component(0.9, "evidence.age_decay", [fp(1), fp(2), fp(3), fp(4)]),
  };
}

test("P6.2 computes the exact transparent multiplicative score", () => {
  const scored = scoreUnifiedOpportunity({ opportunity: opportunity(), components: completeComponents() });
  assert.equal(scored.status, "scored");
  assert.equal(scored.modifiers.riskRetention, 0.8);
  assert.equal(scored.modifiers.effortRetention, 0.75);
  assert.equal(scored.score01, 0.324);
  assert.equal(scored.score100, 32.4);
  assert.equal(scored.formula, "impact * confidence * freshness * (1 - risk) * (1 - effort)");
});

test("basis order and duplicates do not change normalized score identity", () => {
  const first = scoreUnifiedOpportunity({ opportunity: opportunity(), components: completeComponents() });
  const reordered = completeComponents();
  reordered.impact.evidenceFingerprints = [fp(3), fp(1), fp(3)];
  reordered.freshness.evidenceFingerprints = [fp(4), fp(2), fp(1), fp(3), fp(2)];
  const second = scoreUnifiedOpportunity({ opportunity: opportunity(), components: reordered });

  assert.equal(first.scoreFingerprint, second.scoreFingerprint);
  assert.deepEqual(second.components.impact.evidenceFingerprints, [fp(1), fp(3)]);
  assert.deepEqual(second.components.freshness.evidenceFingerprints, [fp(1), fp(2), fp(3), fp(4)]);
});

test("null is unscorable while zero remains a valid scored value", () => {
  const unavailable = completeComponents();
  unavailable.freshness = component(null, null, []);
  const blocked = scoreUnifiedOpportunity({ opportunity: opportunity(), components: unavailable });
  assert.equal(blocked.status, "unscorable");
  assert.equal(blocked.score01, null);
  assert.equal(blocked.score100, null);
  assert.deepEqual(blocked.blockers, ["missing_freshness_score"]);

  const zero = completeComponents();
  zero.impact = component(0, "query.demand_gap", [fp(1)]);
  const scoredZero = scoreUnifiedOpportunity({ opportunity: opportunity(), components: zero });
  assert.equal(scoredZero.status, "scored");
  assert.equal(scoredZero.score01, 0);
  assert.equal(scoredZero.score100, 0);
  assert.deepEqual(scoredZero.blockers, []);
});

test("normalized values fail closed outside [0,1] or when non-finite", () => {
  for (const value of [-0.01, 1.01, Number.NaN, Number.POSITIVE_INFINITY]) {
    const components = completeComponents();
    components.impact = component(value, "query.demand_gap", [fp(1)]);
    assert.throws(
      () => scoreUnifiedOpportunity({ opportunity: opportunity(), components }),
      /invalid_impact_value/,
    );
  }
});

test("non-null components require bounded evidence that belongs to the exact opportunity", () => {
  const missingBasis = completeComponents();
  missingBasis.risk = component(0.2, "change.scope_risk", []);
  assert.throws(
    () => scoreUnifiedOpportunity({ opportunity: opportunity(), components: missingBasis }),
    /risk_evidence_basis_required/,
  );

  const foreign = completeComponents();
  foreign.effort = component(0.2, "implementation.complexity", [fp(999)]);
  assert.throws(
    () => scoreUnifiedOpportunity({ opportunity: opportunity(), components: foreign }),
    /effort_evidence_not_on_opportunity/,
  );

  const excessive = completeComponents();
  excessive.confidence = component(
    0.5,
    "evidence.coverage",
    Array.from({ length: P6_2_MAX_COMPONENT_BASIS_REFS + 1 }, () => fp(1)),
  );
  assert.throws(
    () => scoreUnifiedOpportunity({ opportunity: opportunity(), components: excessive }),
    /confidence_evidence_basis_limit_exceeded/,
  );
});

test("unavailable components may not claim a basis", () => {
  const basisCode = completeComponents();
  basisCode.freshness = component(null, "evidence.age_decay", []);
  assert.throws(
    () => scoreUnifiedOpportunity({ opportunity: opportunity(), components: basisCode }),
    /unavailable_freshness_must_not_claim_basis/,
  );

  const evidenceBasis = completeComponents();
  evidenceBasis.freshness = component(null, null, [fp(1)]);
  assert.throws(
    () => scoreUnifiedOpportunity({ opportunity: opportunity(), components: evidenceBasis }),
    /unavailable_freshness_must_not_claim_basis/,
  );
});

test("tampered P6.1 identity fails closed instead of being silently rescored", () => {
  const original = opportunity();
  const tampered = { ...original, subjectKey: "query:tampered" };
  assert.throws(
    () => scoreUnifiedOpportunity({ opportunity: tampered, components: completeComponents() }),
    /p61_opportunity_integrity_mismatch/,
  );
});

test("P6.1 semantic guards and missing-evidence honesty are inherited without reinterpretation", () => {
  const scored = scoreUnifiedOpportunity({ opportunity: opportunity(), components: completeComponents() });
  assert.ok(scored.inheritedSemanticGuards.includes("keyword_difficulty_provider_native_not_cross_provider_comparable"));
  assert.ok(scored.inheritedSemanticGuards.includes("trend_request_frame_relative"));
  assert.ok(scored.inheritedSemanticGuards.includes("trend_cross_frame_not_comparable"));
  assert.ok(scored.inheritedSemanticGuards.includes("trend_not_absolute_search_demand"));
  assert.ok(scored.inheritedSemanticGuards.includes("null_distinct_from_zero"));
  assert.deepEqual(scored.recordMissingEvidence, ["first_party.conversion"]);
  assert.equal(scored.semantics.providerNativeCrossComparisonPerformed, false);
  assert.equal(scored.semantics.collectionRankingIncluded, false);
  assert.equal(scored.semantics.prioritizationIncluded, false);
  assert.equal(scored.semantics.recommendationGenerated, false);
  assert.equal(scored.semantics.actionabilityClassified, false);
});

test("legacy opportunity scoring semantics remain unchanged", () => {
  const legacy = scoreOpportunity({
    impressions: 99,
    position: 10,
    confidence: 0.5,
    evidenceCount: 2,
  });
  assert.deepEqual(legacy.components, {
    demand: 28,
    proximity: 25,
    confidence: 10,
    evidence: 10,
  });
  assert.equal(legacy.score, 73);
});

test("P6.2 capability keeps runtime, persistence, execution and publication gates closed", () => {
  const capability = opportunityScoringCapability();
  assert.equal(capability.deterministicScoringOnly, true);
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

test("P6.2 source contains no network, environment, database, execution, persistence or scheduler primitive", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const sourceText = readFileSync(join(here, "opportunity-scoring.ts"), "utf8");
  assert.doesNotMatch(sourceText, /\bfetch\s*\(/);
  assert.doesNotMatch(sourceText, /XMLHttpRequest|WebSocket|EventSource/);
  assert.doesNotMatch(sourceText, /process\.env|DATABASE_URL|postgres|drizzle/);
  assert.doesNotMatch(sourceText, /executeCompetitorPilot|executeAuthorizedSignalCollectionJob/);
  assert.doesNotMatch(sourceText, /\b(?:insertInto|updateTable|deleteFrom|persistRecord|sql\s*`|db\.(?:insert|update|delete))\b/);
  assert.doesNotMatch(sourceText, /setTimeout|setInterval|queueMicrotask/);
});
