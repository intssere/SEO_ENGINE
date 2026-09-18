import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  P6_1_MAX_EVIDENCE_REFS,
  buildUnifiedOpportunityRecord,
  classifyLegacyOpportunityType,
  familyForUnifiedOpportunityKind,
  unifiedOpportunityCapability,
  type UnifiedOpportunityEvidenceInput,
  type UnifiedOpportunityFamily,
  type UnifiedOpportunityKind,
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

test("P6.1 defines one exact family for every unified opportunity kind", () => {
  const expected: Array<[UnifiedOpportunityKind, UnifiedOpportunityFamily]> = [
    ["technical_remediation", "technical"],
    ["content_alignment", "content"],
    ["content_gap", "content"],
    ["organic_ctr", "query"],
    ["striking_distance", "query"],
    ["query_gap", "query"],
    ["competitor_visibility_gap", "competitor"],
    ["competitor_page_gap", "competitor"],
    ["competitor_topic_gap", "competitor"],
    ["internal_link", "link"],
    ["backlink_gap", "link"],
    ["ai_visibility_gap", "ai"],
    ["ai_citation_gap", "ai"],
  ];
  for (const [kind, family] of expected) assert.equal(familyForUnifiedOpportunityKind(kind), family);
});

test("legacy opportunity types map without changing their existing meaning", () => {
  assert.deepEqual(classifyLegacyOpportunityType("organic_ctr"), { family: "query", kind: "organic_ctr" });
  assert.deepEqual(classifyLegacyOpportunityType("striking_distance"), { family: "query", kind: "striking_distance" });
  assert.deepEqual(classifyLegacyOpportunityType("technical_remediation"), { family: "technical", kind: "technical_remediation" });
  assert.deepEqual(classifyLegacyOpportunityType("internal_link"), { family: "link", kind: "internal_link" });
  assert.deepEqual(classifyLegacyOpportunityType("content_alignment"), { family: "content", kind: "content_alignment" });
});

test("mixed P5 evidence is normalized deterministically while source semantics stay explicit", () => {
  const refs: UnifiedOpportunityEvidenceInput[] = [
    evidence("serp_ranking", fp(1)),
    evidence("keyword_metrics", fp(2)),
    evidence("trend_context", fp(3)),
    evidence("backlink_gap", fp(4)),
    evidence("competitor_gap", fp(5)),
    evidence("source_telemetry", fp(6)),
  ];
  const first = buildUnifiedOpportunityRecord({
    family: "competitor",
    kind: "competitor_topic_gap",
    subjectKey: "topic:summer fragrances",
    referenceTime: REFERENCE,
    marketFingerprint: MARKET,
    categoryFingerprint: CATEGORY,
    evidence: refs,
    missingEvidence: ["ai.visibility", "first_party.conversion"],
  });
  const second = buildUnifiedOpportunityRecord({
    family: "competitor",
    kind: "competitor_topic_gap",
    subjectKey: "topic:summer fragrances",
    referenceTime: REFERENCE,
    marketFingerprint: MARKET,
    categoryFingerprint: CATEGORY,
    evidence: [...refs].reverse(),
    missingEvidence: ["first_party.conversion", "ai.visibility"],
  });

  assert.equal(first.opportunityFingerprint, second.opportunityFingerprint);
  assert.deepEqual(first.evidence, second.evidence);
  assert.deepEqual(first.missingEvidence, ["ai.visibility", "first_party.conversion"]);
  assert.ok(first.semanticGuards.includes("keyword_difficulty_provider_native_not_cross_provider_comparable"));
  assert.ok(first.semanticGuards.includes("trend_request_frame_relative"));
  assert.ok(first.semanticGuards.includes("trend_cross_frame_not_comparable"));
  assert.ok(first.semanticGuards.includes("trend_not_absolute_search_demand"));
  assert.ok(first.semanticGuards.includes("backlink_authority_provider_native_not_cross_provider_comparable"));
  assert.ok(first.semanticGuards.includes("competitor_visibility_not_market_share"));
  assert.ok(first.semanticGuards.includes("gap_evidence_not_recommendation"));
  assert.ok(first.semanticGuards.includes("source_telemetry_descriptive_only"));
  assert.ok(first.semanticGuards.includes("source_telemetry_does_not_control_refresh_or_execution"));
  assert.ok(first.semanticGuards.includes("null_distinct_from_zero"));
  assert.ok(first.semanticGuards.includes("missing_evidence_not_fabricated"));
  assert.equal("score" in first, false);
  assert.equal("priority" in first, false);
  assert.equal("recommendation" in first, false);
  assert.equal(first.semantics.crossSignalScoreIncluded, false);
  assert.equal(first.semantics.recommendationGenerated, false);
});

test("exact duplicate evidence collapses but conflicting metadata for one fingerprint fails closed", () => {
  const ref = evidence("keyword_metrics", fp(7));
  const deduped = buildUnifiedOpportunityRecord({
    family: "query",
    kind: "query_gap",
    subjectKey: "query:amber perfume",
    referenceTime: REFERENCE,
    evidence: [ref, { ...ref }],
  });
  assert.equal(deduped.evidence.length, 1);

  assert.throws(() => buildUnifiedOpportunityRecord({
    family: "query",
    kind: "query_gap",
    subjectKey: "query:amber perfume",
    referenceTime: REFERENCE,
    evidence: [ref, { ...ref, sourceKey: "synthetic:other-source" }],
  }), /conflicting_evidence_fingerprint/);
});

test("non-null market and category evidence may not be mixed without an aggregation rule", () => {
  assert.throws(() => buildUnifiedOpportunityRecord({
    family: "competitor",
    kind: "competitor_visibility_gap",
    subjectKey: "domain:competitor.example",
    referenceTime: REFERENCE,
    evidence: [
      evidence("competitor_gap", fp(8)),
      evidence("serp_ranking", fp(9), { marketFingerprint: "c".repeat(64) }),
    ],
  }), /mixed_market_scope_not_allowed/);

  assert.throws(() => buildUnifiedOpportunityRecord({
    family: "link",
    kind: "backlink_gap",
    subjectKey: "domain:links.example",
    referenceTime: REFERENCE,
    categoryFingerprint: CATEGORY,
    evidence: [evidence("backlink_gap", fp(10), { categoryFingerprint: "d".repeat(64) })],
  }), /category_scope_mismatch/);
});

test("family, fingerprint, timestamp and future evidence validation fail closed", () => {
  assert.throws(() => buildUnifiedOpportunityRecord({
    family: "content",
    kind: "organic_ctr",
    subjectKey: "query:mismatch",
    referenceTime: REFERENCE,
    evidence: [evidence("gsc_query", fp(11))],
  }), /opportunity_family_kind_mismatch/);

  assert.throws(() => buildUnifiedOpportunityRecord({
    family: "query",
    kind: "organic_ctr",
    subjectKey: "query:bad-fingerprint",
    referenceTime: REFERENCE,
    evidence: [evidence("gsc_query", "not-a-fingerprint")],
  }), /invalid_evidence_fingerprint/);

  assert.throws(() => buildUnifiedOpportunityRecord({
    family: "query",
    kind: "organic_ctr",
    subjectKey: "query:future",
    referenceTime: REFERENCE,
    evidence: [evidence("gsc_query", fp(12), { observedAt: "2026-09-19T00:00:01.000Z" })],
  }), /future_evidence_timestamp/);

  assert.throws(() => buildUnifiedOpportunityRecord({
    family: "query",
    kind: "organic_ctr",
    subjectKey: "query:bad-time",
    referenceTime: "not-a-time",
    evidence: [evidence("gsc_query", fp(13))],
  }), /invalid_reference_time/);
});

test("bounds fail closed and AI family remains evidence-backed", () => {
  assert.throws(() => buildUnifiedOpportunityRecord({
    family: "ai",
    kind: "ai_visibility_gap",
    subjectKey: "ai-surface:synthetic",
    referenceTime: REFERENCE,
    evidence: [],
  }), /evidence_required/);

  const tooMany = Array.from({ length: P6_1_MAX_EVIDENCE_REFS + 1 }, (_, index) =>
    evidence("ai_visibility", fp(index + 100)),
  );
  assert.throws(() => buildUnifiedOpportunityRecord({
    family: "ai",
    kind: "ai_visibility_gap",
    subjectKey: "ai-surface:synthetic",
    referenceTime: REFERENCE,
    evidence: tooMany,
  }), /evidence_limit_exceeded/);
});

test("opaque subject identity is preserved rather than URL/domain/query recanonicalized", () => {
  const record = buildUnifiedOpportunityRecord({
    family: "content",
    kind: "content_gap",
    subjectKey: "Page:https://Example.com/CaseSensitivePath",
    referenceTime: REFERENCE,
    evidence: [evidence("crawl_page", fp(14), { marketFingerprint: null, categoryFingerprint: null })],
  });
  assert.equal(record.subjectKey, "Page:https://Example.com/CaseSensitivePath");
  assert.equal(record.scope.marketFingerprint, null);
  assert.equal(record.scope.categoryFingerprint, null);
});

test("P6.1 capability keeps runtime, persistence, execution and publication gates closed", () => {
  const capability = unifiedOpportunityCapability();
  assert.equal(capability.deterministicNormalizationOnly, true);
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

test("P6.1 source contains no network, environment, database, execution, persistence or scheduler primitive", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const sourceText = readFileSync(join(here, "unified-opportunity-types.ts"), "utf8");
  assert.doesNotMatch(sourceText, /\bfetch\s*\(/);
  assert.doesNotMatch(sourceText, /XMLHttpRequest|WebSocket|EventSource/);
  assert.doesNotMatch(sourceText, /process\.env|DATABASE_URL|postgres|drizzle/);
  assert.doesNotMatch(sourceText, /executeCompetitorPilot|executeAuthorizedSignalCollectionJob/);
  assert.doesNotMatch(sourceText, /setTimeout|setInterval|queueMicrotask/);
});
