import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  P6_3_MAX_COLLECTION_ENTRIES,
  P6_3_MAX_SUPPRESSION_CODES,
  opportunityPrioritizationCapability,
  prioritizeUnifiedOpportunities,
  type OpportunityCollectionEntryInput,
} from "./opportunity-prioritization.js";
import {
  scoreUnifiedOpportunity,
  type OpportunityScoreComponentInput,
  type UnifiedOpportunityScore,
} from "./opportunity-scoring.js";
import {
  buildUnifiedOpportunityRecord,
  type UnifiedOpportunityKind,
  type UnifiedOpportunityRecord,
} from "./unified-opportunity-types.js";

const REFERENCE = "2026-09-19T00:00:00.000Z";
const MARKET = "a".repeat(64);
const CATEGORY = "b".repeat(64);

function fp(value: number): string {
  return value.toString(16).padStart(64, "0");
}

function opportunity(
  subjectKey: string,
  evidenceFingerprint: string,
  overrides: {
    kind?: UnifiedOpportunityKind;
    referenceTime?: string;
    marketFingerprint?: string | null;
    categoryFingerprint?: string | null;
  } = {},
): UnifiedOpportunityRecord {
  const kind = overrides.kind ?? "query_gap";
  const family = kind === "technical_remediation"
    ? "technical"
    : kind === "content_alignment" || kind === "content_gap"
      ? "content"
      : kind === "internal_link" || kind === "backlink_gap"
        ? "link"
        : kind === "competitor_visibility_gap" || kind === "competitor_page_gap" || kind === "competitor_topic_gap"
          ? "competitor"
          : kind === "ai_visibility_gap" || kind === "ai_citation_gap"
            ? "ai"
            : "query";

  return buildUnifiedOpportunityRecord({
    family,
    kind,
    subjectKey,
    referenceTime: overrides.referenceTime ?? REFERENCE,
    marketFingerprint: overrides.marketFingerprint === undefined ? MARKET : overrides.marketFingerprint,
    categoryFingerprint: overrides.categoryFingerprint === undefined ? CATEGORY : overrides.categoryFingerprint,
    evidence: [{
      kind: "gsc_query",
      fingerprint: evidenceFingerprint,
      sourceKey: "synthetic:gsc",
      observedAt: "2026-09-18T12:00:00.000Z",
      marketFingerprint: overrides.marketFingerprint === undefined ? MARKET : overrides.marketFingerprint,
      categoryFingerprint: overrides.categoryFingerprint === undefined ? CATEGORY : overrides.categoryFingerprint,
    }],
  });
}

function component(
  value: number | null,
  fingerprint: string,
  basisCode: string,
): OpportunityScoreComponentInput {
  return {
    value,
    basisCode: value === null ? null : basisCode,
    evidenceFingerprints: value === null ? [] : [fingerprint],
  };
}

function score(
  record: UnifiedOpportunityRecord,
  evidenceFingerprint: string,
  score100: number | null,
): UnifiedOpportunityScore {
  const impact = score100 === null ? 0.5 : score100 / 100;
  return scoreUnifiedOpportunity({
    opportunity: record,
    components: {
      impact: component(impact, evidenceFingerprint, "p63.synthetic.impact"),
      confidence: component(1, evidenceFingerprint, "p63.synthetic.confidence"),
      risk: component(0, evidenceFingerprint, "p63.synthetic.risk"),
      effort: component(0, evidenceFingerprint, "p63.synthetic.effort"),
      freshness: score100 === null
        ? component(null, evidenceFingerprint, "p63.synthetic.freshness")
        : component(1, evidenceFingerprint, "p63.synthetic.freshness"),
    },
  });
}

function entry(
  subject: string,
  evidenceNumber: number,
  score100: number | null,
  overrides: Partial<OpportunityCollectionEntryInput> = {},
): OpportunityCollectionEntryInput {
  const evidenceFingerprint = fp(evidenceNumber);
  const record = opportunity(subject, evidenceFingerprint);
  return {
    opportunity: record,
    score: score(record, evidenceFingerprint, score100),
    ...overrides,
  };
}

function decision(report: ReturnType<typeof prioritizeUnifiedOpportunities>, subject: string) {
  const found = report.decisions.find((item) => item.subjectKey === subject);
  assert.ok(found, `missing decision for ${subject}`);
  return found;
}

test("P6.3 collapses exact duplicates and is input-order invariant", () => {
  const a = entry("query:a", 1, 80);
  const b = entry("query:b", 2, 60);
  const c = entry("query:c", 3, 40);

  const first = prioritizeUnifiedOpportunities({
    collectionKey: "synthetic:collection",
    entries: [a, b, a, c],
  });
  const second = prioritizeUnifiedOpportunities({
    collectionKey: "synthetic:collection",
    entries: [c, a, b, a],
  });

  assert.equal(first.reportFingerprint, second.reportFingerprint);
  assert.deepEqual(first, second);
  assert.deepEqual(first.counts, {
    input: 4,
    unique: 3,
    duplicatesCollapsed: 1,
    eligible: 3,
    suppressed: 0,
    conflictGroups: 0,
  });
  assert.equal(decision(first, "query:a").priorityRank, 1);
  assert.equal(decision(first, "query:b").priorityRank, 2);
  assert.equal(decision(first, "query:c").priorityRank, 3);
});

test("same opportunity with conflicting score or policy metadata fails closed", () => {
  const base = entry("query:a", 10, 80);
  const alternateScore = {
    ...base,
    score: score(base.opportunity, fp(10), 70),
  };
  assert.throws(
    () => prioritizeUnifiedOpportunities({
      collectionKey: "synthetic:conflicting-score",
      entries: [base, alternateScore],
    }),
    /duplicate_opportunity_metadata_conflict/,
  );

  assert.throws(
    () => prioritizeUnifiedOpportunities({
      collectionKey: "synthetic:conflicting-policy",
      entries: [base, { ...base, conflictKey: "content.choice" }],
    }),
    /duplicate_opportunity_metadata_conflict/,
  );
});

test("collection ranking requires one exact reference time and scope", () => {
  const a = entry("query:a", 20, 70);
  const otherTimeRecord = opportunity("query:b", fp(21), {
    referenceTime: "2026-09-20T00:00:00.000Z",
  });
  const otherTime = {
    opportunity: otherTimeRecord,
    score: score(otherTimeRecord, fp(21), 60),
  };
  assert.throws(
    () => prioritizeUnifiedOpportunities({
      collectionKey: "synthetic:mixed-time",
      entries: [a, otherTime],
    }),
    /mixed_collection_reference_time/,
  );

  const otherMarket = "c".repeat(64);
  const otherScopeRecord = opportunity("query:c", fp(22), {
    marketFingerprint: otherMarket,
  });
  const otherScope = {
    opportunity: otherScopeRecord,
    score: score(otherScopeRecord, fp(22), 60),
  };
  assert.throws(
    () => prioritizeUnifiedOpportunities({
      collectionKey: "synthetic:mixed-scope",
      entries: [a, otherScope],
    }),
    /mixed_collection_scope/,
  );
});

test("explicit suppression remains visible and removes the row from priority ranking", () => {
  const suppressed = entry("query:suppressed", 30, 90, {
    suppressionCodes: ["Policy.Manual_Exclude", "policy.manual_exclude"],
  });
  const eligible = entry("query:eligible", 31, 50);
  const report = prioritizeUnifiedOpportunities({
    collectionKey: "synthetic:explicit-suppression",
    entries: [suppressed, eligible],
  });

  const blocked = decision(report, "query:suppressed");
  assert.equal(blocked.status, "suppressed");
  assert.equal(blocked.priorityRank, null);
  assert.deepEqual(blocked.explicitSuppressionCodes, ["policy.manual_exclude"]);
  assert.deepEqual(blocked.systemSuppressionReasons, ["explicit_suppression"]);
  assert.equal(decision(report, "query:eligible").priorityRank, 1);
});

test("unscorable P6.2 records are suppressed without a guessed priority", () => {
  const blocked = entry("query:unscorable", 40, null);
  const good = entry("query:good", 41, 20);
  const report = prioritizeUnifiedOpportunities({
    collectionKey: "synthetic:unscorable",
    entries: [blocked, good],
  });

  const unscorable = decision(report, "query:unscorable");
  assert.equal(unscorable.score100, null);
  assert.equal(unscorable.status, "suppressed");
  assert.equal(unscorable.priorityRank, null);
  assert.deepEqual(unscorable.systemSuppressionReasons, ["unscorable_score"]);
  assert.equal(decision(report, "query:good").priorityRank, 1);
});

test("a unique highest score survives an explicitly keyed mutually-exclusive conflict", () => {
  const high = entry("query:high", 50, 85, { conflictKey: "page.title.choice" });
  const low = entry("query:low", 51, 55, { conflictKey: "page.title.choice" });
  const report = prioritizeUnifiedOpportunities({
    collectionKey: "synthetic:conflict-win",
    entries: [low, high],
  });

  assert.equal(decision(report, "query:high").status, "eligible");
  assert.equal(decision(report, "query:high").priorityRank, 1);
  assert.equal(decision(report, "query:low").status, "suppressed");
  assert.deepEqual(decision(report, "query:low").systemSuppressionReasons, ["conflict_lower_score"]);

  assert.equal(report.conflicts.length, 1);
  assert.equal(report.conflicts[0].status, "resolved_unique_top");
  assert.equal(report.conflicts[0].topScore100, 85);
  assert.equal(
    report.conflicts[0].selectedOpportunityFingerprint,
    decision(report, "query:high").opportunityFingerprint,
  );
});

test("equal top score in an explicit conflict remains unresolved with no arbitrary winner", () => {
  const a = entry("query:a", 60, 80, { conflictKey: "page.meta.choice" });
  const b = entry("query:b", 61, 80, { conflictKey: "page.meta.choice" });
  const lower = entry("query:lower", 62, 30, { conflictKey: "page.meta.choice" });
  const report = prioritizeUnifiedOpportunities({
    collectionKey: "synthetic:conflict-tie",
    entries: [lower, b, a],
  });

  assert.equal(report.counts.eligible, 0);
  assert.equal(report.conflicts[0].status, "unresolved_top_tie");
  assert.equal(report.conflicts[0].selectedOpportunityFingerprint, null);
  assert.deepEqual(decision(report, "query:a").systemSuppressionReasons, ["conflict_top_score_tie"]);
  assert.deepEqual(decision(report, "query:b").systemSuppressionReasons, ["conflict_top_score_tie"]);
  assert.deepEqual(decision(report, "query:lower").systemSuppressionReasons, ["conflict_lower_score"]);
});

test("equal scores without a conflict share a dense rank and remain co-equal", () => {
  const a = entry("query:a", 70, 70);
  const b = entry("query:b", 71, 70);
  const c = entry("query:c", 72, 40);
  const report = prioritizeUnifiedOpportunities({
    collectionKey: "synthetic:dense-rank",
    entries: [c, a, b],
  });

  assert.equal(decision(report, "query:a").priorityRank, 1);
  assert.equal(decision(report, "query:b").priorityRank, 1);
  assert.equal(decision(report, "query:a").priorityTieCount, 2);
  assert.equal(decision(report, "query:b").priorityTieCount, 2);
  assert.equal(decision(report, "query:c").priorityRank, 2);
  assert.equal(report.semantics.deterministicSerializationTieBreakIsPreference, false);
});

test("P6.3 does not infer conflict from a shared subject or opportunity family", () => {
  const evidenceA = fp(80);
  const evidenceB = fp(81);
  const firstRecord = opportunity("shared:subject", evidenceA, { kind: "query_gap" });
  const secondRecord = opportunity("shared:subject", evidenceB, { kind: "organic_ctr" });
  const report = prioritizeUnifiedOpportunities({
    collectionKey: "synthetic:no-inferred-conflict",
    entries: [
      { opportunity: firstRecord, score: score(firstRecord, evidenceA, 60) },
      { opportunity: secondRecord, score: score(secondRecord, evidenceB, 50) },
    ],
  });

  assert.equal(report.conflicts.length, 0);
  assert.equal(report.counts.eligible, 2);
  assert.equal(report.semantics.conflictInferredFromFamilyKindOrSubject, false);
});

test("tampered P6.2 score output fails closed", () => {
  const base = entry("query:tampered", 90, 75);
  const tampered = {
    ...base,
    score: {
      ...base.score,
      score100: 99,
    },
  };
  assert.throws(
    () => prioritizeUnifiedOpportunities({
      collectionKey: "synthetic:tampered-score",
      entries: [tampered],
    }),
    /p62_score_integrity_mismatch/,
  );
});

test("collection and suppression bounds fail closed", () => {
  const base = entry("query:bounded", 100, 50);
  assert.throws(
    () => prioritizeUnifiedOpportunities({
      collectionKey: "synthetic:too-large",
      entries: Array.from({ length: P6_3_MAX_COLLECTION_ENTRIES + 1 }, () => base),
    }),
    /collection_entry_limit_exceeded/,
  );

  assert.throws(
    () => prioritizeUnifiedOpportunities({
      collectionKey: "synthetic:too-many-suppressions",
      entries: [{
        ...base,
        suppressionCodes: Array.from(
          { length: P6_3_MAX_SUPPRESSION_CODES + 1 },
          (_, index) => `policy.code_${index}`,
        ),
      }],
    }),
    /suppression_code_limit_exceeded/,
  );
});

test("P6.3 capability keeps persistence, execution and publication closed", () => {
  const capability = opportunityPrioritizationCapability();
  assert.equal(capability.deterministicCollectionPolicyOnly, true);
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

test("P6.3 source contains no network, environment, database, persistence, execution or scheduler primitive", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const sourceText = readFileSync(join(here, "opportunity-prioritization.ts"), "utf8");
  assert.doesNotMatch(sourceText, /\bfetch\s*\(/);
  assert.doesNotMatch(sourceText, /XMLHttpRequest|WebSocket|EventSource/);
  assert.doesNotMatch(sourceText, /process\.env|DATABASE_URL|postgres|drizzle/);
  assert.doesNotMatch(sourceText, /executeCompetitorPilot|executeAuthorizedSignalCollectionJob/);
  assert.doesNotMatch(sourceText, /\b(?:insertInto|updateTable|deleteFrom|persistRecord|sql\s*\`|db\.(?:insert|update|delete))\b/);
  assert.doesNotMatch(sourceText, /setTimeout|setInterval|queueMicrotask/);
});
