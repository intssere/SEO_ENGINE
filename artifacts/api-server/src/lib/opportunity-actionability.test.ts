import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  P6_5_MAX_BLOCK_CODES,
  P6_5_MAX_POLICIES,
  classifyOpportunityActionability,
  opportunityActionabilityCapability,
  type OpportunityActionabilityPolicyInput,
} from "./opportunity-actionability.js";
import {
  explainPrioritizedOpportunities,
  type OpportunityExplanationInput,
  type OpportunityExplanationReport,
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
} from "./opportunity-scoring.js";
import {
  buildUnifiedOpportunityRecord,
  type UnifiedOpportunityEvidenceInput,
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

function entry(
  subjectKey: string,
  base: number,
  values: Partial<Record<OpportunityScoreDimension, number | null>> = {},
  overrides: Partial<OpportunityCollectionEntryInput> = {},
): OpportunityCollectionEntryInput {
  const kinds: UnifiedOpportunityEvidenceInput["kind"][] = [
    "gsc_query",
    "serp_ranking",
    "keyword_metrics",
    "trend_context",
    "competitor_gap",
  ];
  const opportunity = buildUnifiedOpportunityRecord({
    family: "query",
    kind: "query_gap",
    subjectKey,
    referenceTime: REFERENCE,
    marketFingerprint: MARKET,
    categoryFingerprint: CATEGORY,
    evidence: kinds.map((kind, index) => evidence(kind, fp(base + index))),
  });

  const defaults: Record<OpportunityScoreDimension, number | null> = {
    impact: 0.8,
    confidence: 0.75,
    risk: 0.2,
    effort: 0.25,
    freshness: 0.9,
  };
  const components = Object.fromEntries(DIMENSIONS.map((dimension, index) => {
    const supplied = values[dimension];
    const value: number | null = supplied === undefined ? defaults[dimension] : supplied;
    const component: OpportunityScoreComponentInput = value === null
      ? { value: null, basisCode: null, evidenceFingerprints: [] }
      : {
          value,
          basisCode: `p65.synthetic.${dimension}`,
          evidenceFingerprints: [fp(base + index)],
        };
    return [dimension, component];
  })) as Record<OpportunityScoreDimension, OpportunityScoreComponentInput>;

  return {
    opportunity,
    score: scoreUnifiedOpportunity({ opportunity, components }),
    ...overrides,
  };
}

function explanation(collection: OpportunityPrioritizationInput): {
  explanationInput: OpportunityExplanationInput;
  explanation: OpportunityExplanationReport;
} {
  const prioritization = prioritizeUnifiedOpportunities(collection);
  const explanationInput = { collection, prioritization };
  return {
    explanationInput,
    explanation: explainPrioritizedOpportunities(explanationInput),
  };
}

function policy(
  report: OpportunityExplanationReport,
  subjectKey: string,
  overrides: Partial<Omit<OpportunityActionabilityPolicyInput, "opportunityFingerprint">> = {},
): OpportunityActionabilityPolicyInput {
  const item = report.items.find((candidate) => candidate.subjectKey === subjectKey);
  assert.ok(item);
  return {
    opportunityFingerprint: item.opportunityFingerprint,
    recommendationAllowed: false,
    approvalRequired: false,
    blockCodes: [],
    ...overrides,
  };
}

function decisionFor(
  report: ReturnType<typeof classifyOpportunityActionability>,
  explanationReport: OpportunityExplanationReport,
  subjectKey: string,
) {
  const explained = explanationReport.items.find((candidate) => candidate.subjectKey === subjectKey);
  assert.ok(explained);
  const found = report.decisions.find((candidate) =>
    candidate.opportunityFingerprint === explained.opportunityFingerprint);
  assert.ok(found);
  return found;
}

test("P6.5 is deterministic across collection input and policy order", () => {
  const a = entry("query:a", 10);
  const b = entry("query:b", 20, { impact: 0.6 });
  const first = explanation({ collectionKey: "synthetic:deterministic", entries: [a, b] });
  const second = explanation({ collectionKey: "synthetic:deterministic", entries: [b, a] });
  const firstPolicies = [
    policy(first.explanation, "query:a", { recommendationAllowed: true }),
    policy(first.explanation, "query:b", { approvalRequired: true }),
  ];
  const secondPolicies = [
    policy(second.explanation, "query:b", { approvalRequired: true }),
    policy(second.explanation, "query:a", { recommendationAllowed: true }),
  ];

  const firstReport = classifyOpportunityActionability({
    ...first,
    policies: firstPolicies,
  });
  const secondReport = classifyOpportunityActionability({
    ...second,
    policies: secondPolicies,
  });

  assert.equal(firstReport.reportFingerprint, secondReport.reportFingerprint);
  assert.deepEqual(firstReport, secondReport);
});

test("explicit block codes normalize and take precedence over approval/recommend", () => {
  const built = explanation({
    collectionKey: "synthetic:explicit-block",
    entries: [entry("query:block", 100)],
  });
  const report = classifyOpportunityActionability({
    ...built,
    policies: [policy(built.explanation, "query:block", {
      recommendationAllowed: true,
      approvalRequired: true,
      blockCodes: [" Policy.Legal_Hold ", "policy.legal_hold"],
    })],
  });
  const result = decisionFor(report, built.explanation, "query:block");

  assert.equal(result.classification, "blocked");
  assert.deepEqual(result.reasons, ["explicit_block"]);
  assert.deepEqual(result.governance.blockCodes, ["policy.legal_hold"]);
  assert.equal(result.governance.approvalGranted, false);
  assert.equal(result.governance.executionAuthorized, false);
});

test("P6.3 suppression takes precedence over approval/recommend", () => {
  const built = explanation({
    collectionKey: "synthetic:p63-suppressed",
    entries: [entry("query:suppressed", 200, {}, { suppressionCodes: ["policy.manual_exclude"] })],
  });
  const report = classifyOpportunityActionability({
    ...built,
    policies: [policy(built.explanation, "query:suppressed", {
      recommendationAllowed: true,
      approvalRequired: true,
    })],
  });
  const result = decisionFor(report, built.explanation, "query:suppressed");

  assert.equal(result.classification, "blocked");
  assert.deepEqual(result.reasons, ["p63_suppressed"]);
  assert.ok(result.inheritedDecision.systemSuppressionReasons.includes("explicit_suppression"));
});

test("unresolved P6.3 top-score conflict remains blocked with no P6.5 winner", () => {
  const a = entry("query:a", 300, { impact: 0.8 }, { conflictKey: "page.title.choice" });
  const b = entry("query:b", 310, { impact: 0.8 }, { conflictKey: "page.title.choice" });
  const built = explanation({
    collectionKey: "synthetic:conflict",
    entries: [a, b],
  });
  const report = classifyOpportunityActionability({
    ...built,
    policies: [
      policy(built.explanation, "query:a", { recommendationAllowed: true }),
      policy(built.explanation, "query:b", { recommendationAllowed: true }),
    ],
  });

  for (const subject of ["query:a", "query:b"]) {
    const result = decisionFor(report, built.explanation, subject);
    assert.equal(result.classification, "blocked");
    assert.ok(result.inheritedDecision.systemSuppressionReasons.includes("conflict_top_score_tie"));
  }
});

test("approval requirement takes precedence over recommendation allowance but grants no approval", () => {
  const built = explanation({
    collectionKey: "synthetic:approval",
    entries: [entry("query:approval", 400)],
  });
  const report = classifyOpportunityActionability({
    ...built,
    policies: [policy(built.explanation, "query:approval", {
      recommendationAllowed: true,
      approvalRequired: true,
    })],
  });
  const result = decisionFor(report, built.explanation, "query:approval");

  assert.equal(result.classification, "approval");
  assert.deepEqual(result.reasons, ["approval_required"]);
  assert.equal(result.governance.approvalGranted, false);
  assert.equal(result.governance.executionAuthorized, false);
  assert.equal(report.semantics.approvalMeansRequiredNotGranted, true);
});

test("eligible recommendation is advisory and never execution authorization", () => {
  const built = explanation({
    collectionKey: "synthetic:recommend",
    entries: [entry("query:recommend", 500)],
  });
  const report = classifyOpportunityActionability({
    ...built,
    policies: [policy(built.explanation, "query:recommend", {
      recommendationAllowed: true,
    })],
  });
  const result = decisionFor(report, built.explanation, "query:recommend");

  assert.equal(result.classification, "recommend");
  assert.deepEqual(result.reasons, ["recommendation_allowed"]);
  assert.equal(result.governance.executionAuthorized, false);
  assert.equal(result.governance.automaticTransitionAuthorized, false);
});

test("informational state has no implicit escalation", () => {
  const built = explanation({
    collectionKey: "synthetic:informational",
    entries: [entry("query:informational", 600)],
  });
  const report = classifyOpportunityActionability({
    ...built,
    policies: [policy(built.explanation, "query:informational")],
  });
  const result = decisionFor(report, built.explanation, "query:informational");

  assert.equal(result.classification, "informational");
  assert.deepEqual(result.reasons, ["informational_only"]);
  assert.equal(result.governance.approvalRequired, false);
  assert.equal(result.governance.recommendationAllowed, false);
});

test("P6.5 does not infer actionability from score or advisory priority rank", () => {
  const high = entry("query:high", 700, { impact: 1, confidence: 1, risk: 0, effort: 0, freshness: 1 });
  const low = entry("query:low", 710, { impact: 0.1, confidence: 0.5, risk: 0.5, effort: 0.5, freshness: 0.5 });
  const built = explanation({
    collectionKey: "synthetic:no-score-inference",
    entries: [high, low],
  });
  const report = classifyOpportunityActionability({
    ...built,
    policies: [
      policy(built.explanation, "query:high"),
      policy(built.explanation, "query:low", { recommendationAllowed: true }),
    ],
  });

  const highResult = decisionFor(report, built.explanation, "query:high");
  const lowResult = decisionFor(report, built.explanation, "query:low");
  assert.equal(highResult.inheritedDecision.priorityRank, 1);
  assert.equal(highResult.classification, "informational");
  assert.equal(lowResult.classification, "recommend");
  assert.equal(report.semantics.scoreOrRankInferencePerformed, false);
});

test("P6.5 requires exact policy coverage and rejects unknown/duplicate policy entries", () => {
  const built = explanation({
    collectionKey: "synthetic:coverage",
    entries: [entry("query:a", 800), entry("query:b", 810)],
  });
  const a = policy(built.explanation, "query:a");
  const b = policy(built.explanation, "query:b");

  assert.throws(
    () => classifyOpportunityActionability({ ...built, policies: [a] }),
    /incomplete_actionability_policy_coverage/,
  );
  assert.throws(
    () => classifyOpportunityActionability({ ...built, policies: [a, a] }),
    /duplicate_policy_opportunity/,
  );
  assert.throws(
    () => classifyOpportunityActionability({
      ...built,
      policies: [a, { ...b, opportunityFingerprint: fp(9999) }],
    }),
    /unknown_policy_opportunity/,
  );
});

test("P6.5 rejects a tampered P6.4 explanation report", () => {
  const built = explanation({
    collectionKey: "synthetic:tampered-p64",
    entries: [entry("query:tampered", 900)],
  });
  const basePolicy = policy(built.explanation, "query:tampered");
  const tampered = {
    ...built.explanation,
    itemCount: built.explanation.itemCount + 1,
  };

  assert.throws(
    () => classifyOpportunityActionability({
      explanationInput: built.explanationInput,
      explanation: tampered,
      policies: [basePolicy],
    }),
    /p64_explanation_integrity_mismatch/,
  );
});

test("policy and block-code bounds fail closed", () => {
  const built = explanation({
    collectionKey: "synthetic:bounds",
    entries: [entry("query:bounds", 1000)],
  });
  const base = policy(built.explanation, "query:bounds");

  assert.throws(
    () => classifyOpportunityActionability({
      ...built,
      policies: [{
        ...base,
        blockCodes: Array.from({ length: P6_5_MAX_BLOCK_CODES + 1 }, (_, index) => `policy.block_${index}`),
      }],
    }),
    /block_code_limit_exceeded/,
  );

  const tooMany = Array.from({ length: P6_5_MAX_POLICIES + 1 }, (_, index) => ({
    ...base,
    opportunityFingerprint: fp(20000 + index),
  }));
  assert.throws(
    () => classifyOpportunityActionability({ ...built, policies: tooMany }),
    /actionability_policy_limit_exceeded/,
  );
});

test("P6.5 counts each canonical actionability state", () => {
  const blockedEntry = entry("query:blocked", 1100, {}, { suppressionCodes: ["policy.blocked"] });
  const built = explanation({
    collectionKey: "synthetic:counts",
    entries: [
      entry("query:info", 1110),
      entry("query:recommend", 1120),
      entry("query:approval", 1130),
      blockedEntry,
    ],
  });
  const report = classifyOpportunityActionability({
    ...built,
    policies: [
      policy(built.explanation, "query:info"),
      policy(built.explanation, "query:recommend", { recommendationAllowed: true }),
      policy(built.explanation, "query:approval", { approvalRequired: true }),
      policy(built.explanation, "query:blocked"),
    ],
  });

  assert.deepEqual(report.counts, {
    total: 4,
    informational: 1,
    recommend: 1,
    approval: 1,
    blocked: 1,
  });
});

test("P6.5 capability keeps approval, execution, persistence and publication closed", () => {
  const capability = opportunityActionabilityCapability();
  assert.equal(capability.deterministicClassificationOnly, true);
  assert.equal(capability.legacyOpportunityEngineMutationEnabled, false);
  assert.equal(capability.openApiMutationEnabled, false);
  assert.equal(capability.liveProviderReadsAuthorized, false);
  assert.equal(capability.providerCredentialUseAuthorized, false);
  assert.equal(capability.aiModelCallsAuthorized, false);
  assert.equal(capability.sourceRegistryAdmissionAuthorized, false);
  assert.equal(capability.refreshPlanReorderingEnabled, false);
  assert.equal(capability.task64ExecutionAuthorized, false);
  assert.equal(capability.task70ExecutionAuthorized, false);
  assert.equal(capability.observationPersistenceAuthorized, false);
  assert.equal(capability.evidencePersistenceAuthorized, false);
  assert.equal(capability.scorePersistenceAuthorized, false);
  assert.equal(capability.prioritizationPersistenceAuthorized, false);
  assert.equal(capability.explanationPersistenceAuthorized, false);
  assert.equal(capability.actionabilityPersistenceAuthorized, false);
  assert.equal(capability.databaseReadsAuthorized, false);
  assert.equal(capability.databaseWritesAuthorized, false);
  assert.equal(capability.schemaMutationAuthorized, false);
  assert.equal(capability.schedulerEnabled, false);
  assert.equal(capability.workerEnabled, false);
  assert.equal(capability.retryLoopEnabled, false);
  assert.equal(capability.approvalGrantAuthorized, false);
  assert.equal(capability.providerWrites, false);
  assert.equal(capability.publicSiteWrites, false);
  assert.equal(capability.automaticTransitionEnabled, false);
  assert.equal(capability.publicationAuthorized, false);
});

test("P6.5 source contains no network, AI, environment, database, persistence, execution or scheduler primitive", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const sourceText = readFileSync(join(here, "opportunity-actionability.ts"), "utf8");
  assert.doesNotMatch(sourceText, /\bfetch\s*\(/);
  assert.doesNotMatch(sourceText, /XMLHttpRequest|WebSocket|EventSource/);
  assert.doesNotMatch(sourceText, /\bOpenAI\b|chat\.completions|responses\.create/);
  assert.doesNotMatch(sourceText, /process\.env|DATABASE_URL|postgres|drizzle/);
  assert.doesNotMatch(sourceText, /executeCompetitorPilot|executeAuthorizedSignalCollectionJob/);
  assert.doesNotMatch(sourceText, /\b(?:insertInto|updateTable|deleteFrom|persistRecord|sql\s*\`|db\.(?:insert|update|delete))\b/);
  assert.doesNotMatch(sourceText, /setTimeout|setInterval|queueMicrotask/);
});
