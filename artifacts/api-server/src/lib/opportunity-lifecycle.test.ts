import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  P6_7_MAX_EVENTS_PER_HISTORY,
  P6_7_MAX_HISTORIES,
  buildOpportunityLifecycle,
  opportunityLifecycleCapability,
  type OpportunityLifecycleEventInput,
  type OpportunityLifecycleHistoryInput,
} from "./opportunity-lifecycle.js";
import {
  buildOpportunityPreviewDiff,
  type OpportunityPreviewDiffInput,
  type OpportunityPreviewDiffReport,
  type OpportunityPreviewInput,
} from "./opportunity-preview-diff.js";
import {
  classifyOpportunityActionability,
  type OpportunityActionabilityInput,
  type OpportunityActionabilityPolicyInput,
} from "./opportunity-actionability.js";
import {
  explainPrioritizedOpportunities,
  type OpportunityExplanationInput,
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
const HISTORY_REFERENCE = "2026-09-19T12:00:00.000Z";
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
  const components = Object.fromEntries(DIMENSIONS.map((dimension, index) => [
    dimension,
    {
      value: dimension === "risk" ? 0.2 : dimension === "effort" ? 0.25 : 0.8,
      basisCode: `p67.synthetic.${dimension}`,
      evidenceFingerprints: [fp(base + index)],
    } satisfies OpportunityScoreComponentInput,
  ])) as Record<OpportunityScoreDimension, OpportunityScoreComponentInput>;

  return {
    opportunity,
    score: scoreUnifiedOpportunity({ opportunity, components }),
    ...overrides,
  };
}

function policy(
  explanation: ReturnType<typeof explainPrioritizedOpportunities>,
  subjectKey: string,
  overrides: Partial<Omit<OpportunityActionabilityPolicyInput, "opportunityFingerprint">> = {},
): OpportunityActionabilityPolicyInput {
  const item = explanation.items.find((candidate) => candidate.subjectKey === subjectKey);
  assert.ok(item);
  return {
    opportunityFingerprint: item.opportunityFingerprint,
    recommendationAllowed: false,
    approvalRequired: false,
    blockCodes: [],
    ...overrides,
  };
}

function buildCertified(
  collection: OpportunityPrioritizationInput,
  policiesFor: (explanation: ReturnType<typeof explainPrioritizedOpportunities>) => OpportunityActionabilityPolicyInput[],
  previewFor?: (context: {
    subjects: Map<string, string>;
    actionability: ReturnType<typeof classifyOpportunityActionability>;
  }) => OpportunityPreviewInput[],
): {
  previewDiffInput: OpportunityPreviewDiffInput;
  previewDiff: OpportunityPreviewDiffReport;
  subjects: Map<string, string>;
} {
  const prioritization = prioritizeUnifiedOpportunities(collection);
  const explanationInput: OpportunityExplanationInput = { collection, prioritization };
  const explanation = explainPrioritizedOpportunities(explanationInput);
  const actionabilityInput: OpportunityActionabilityInput = {
    explanationInput,
    explanation,
    policies: policiesFor(explanation),
  };
  const actionability = classifyOpportunityActionability(actionabilityInput);
  const subjects = new Map(explanation.items.map((item) => [item.subjectKey, item.opportunityFingerprint]));
  const previews = previewFor?.({ subjects, actionability }) ?? [];
  const previewDiffInput: OpportunityPreviewDiffInput = {
    actionabilityInput,
    actionability,
    previews,
  };
  return {
    previewDiffInput,
    previewDiff: buildOpportunityPreviewDiff(previewDiffInput),
    subjects,
  };
}

function actionabilityFingerprint(
  built: ReturnType<typeof buildCertified>,
  subjectKey: string,
): string {
  const opportunityFingerprint = built.subjects.get(subjectKey);
  assert.ok(opportunityFingerprint);
  const decision = built.previewDiffInput.actionability.decisions.find((candidate) =>
    candidate.opportunityFingerprint === opportunityFingerprint);
  assert.ok(decision);
  return decision.actionabilityFingerprint;
}

function history(
  built: ReturnType<typeof buildCertified>,
  subjectKey: string,
  events: OpportunityLifecycleEventInput[],
): OpportunityLifecycleHistoryInput {
  const opportunityFingerprint = built.subjects.get(subjectKey);
  assert.ok(opportunityFingerprint);
  return {
    opportunityFingerprint,
    actionabilityFingerprint: actionabilityFingerprint(built, subjectKey),
    events,
  };
}

function event(
  sequence: number,
  occurredAt: string,
  type: OpportunityLifecycleEventInput["type"],
  overrides: Partial<Omit<OpportunityLifecycleEventInput, "sequence" | "occurredAt" | "type">> = {},
): OpportunityLifecycleEventInput {
  return {
    sequence,
    occurredAt,
    type,
    reasonCode: null,
    relatedOpportunityFingerprint: null,
    ...overrides,
  };
}

function lifecycle(
  built: ReturnType<typeof buildCertified>,
  histories: OpportunityLifecycleHistoryInput[],
  historyReferenceTime = HISTORY_REFERENCE,
) {
  return buildOpportunityLifecycle({
    ...built,
    historyReferenceTime,
    histories,
  });
}

function recordFor(
  report: ReturnType<typeof buildOpportunityLifecycle>,
  built: ReturnType<typeof buildCertified>,
  subjectKey: string,
) {
  const opportunityFingerprint = built.subjects.get(subjectKey);
  assert.ok(opportunityFingerprint);
  const record = report.records.find((candidate) =>
    candidate.opportunityFingerprint === opportunityFingerprint);
  assert.ok(record);
  return record;
}

test("P6.7 defaults every current opportunity to neutral observed without inventing events", () => {
  const built = buildCertified(
    { collectionKey: "synthetic:observed", entries: [entry("query:a", 10), entry("query:b", 20)] },
    (explanation) => [
      policy(explanation, "query:a", { recommendationAllowed: true }),
      policy(explanation, "query:b", { approvalRequired: true }),
    ],
  );
  const report = lifecycle(built, []);

  assert.equal(report.records.length, 2);
  assert.ok(report.records.every((record) =>
    record.currentState === "observed" &&
    record.eventCount === 0 &&
    record.terminal === false));
  assert.equal(report.counts.observed, 2);
  assert.equal(report.counts.events, 0);
  assert.equal(report.semantics.initialObservedMeansSnapshotPresenceOnly, true);
});

test("explicit activate/defer/activate replay is deterministic and supports only explicit deferred reactivation", () => {
  const built = buildCertified(
    { collectionKey: "synthetic:reactivate", entries: [entry("query:a", 30)] },
    (explanation) => [policy(explanation, "query:a")],
  );
  const report = lifecycle(built, [history(built, "query:a", [
    event(3, "2026-09-19T10:00:00.000Z", "activate", { reasonCode: " Manual.Resume " }),
    event(1, "2026-09-19T08:00:00.000Z", "activate"),
    event(2, "2026-09-19T09:00:00.000Z", "defer", { reasonCode: "capacity.wait" }),
  ])]);
  const record = recordFor(report, built, "query:a");

  assert.equal(record.currentState, "active");
  assert.equal(record.terminal, false);
  assert.deepEqual(record.events.map((value) => value.sequence), [1, 2, 3]);
  assert.deepEqual(record.events.map((value) => value.fromState), ["observed", "active", "deferred"]);
  assert.deepEqual(record.events.map((value) => value.toState), ["active", "deferred", "active"]);
  assert.equal(record.events[2]?.reasonCode, "manual.resume");
});

test("dismissed, closed and superseded are terminal and cannot be reactivated", () => {
  const built = buildCertified(
    { collectionKey: "synthetic:terminal", entries: [entry("query:a", 40), entry("query:b", 50)] },
    (explanation) => [policy(explanation, "query:a"), policy(explanation, "query:b")],
  );

  for (const terminalEvent of ["dismiss", "close"] as const) {
    assert.throws(
      () => lifecycle(built, [history(built, "query:a", [
        event(1, "2026-09-19T08:00:00.000Z", terminalEvent),
        event(2, "2026-09-19T09:00:00.000Z", "activate"),
      ])]),
      /terminal_lifecycle_state_transition/,
    );
  }

  const target = built.subjects.get("query:b");
  assert.ok(target);
  assert.throws(
    () => lifecycle(built, [history(built, "query:a", [
      event(1, "2026-09-19T08:00:00.000Z", "supersede", {
        relatedOpportunityFingerprint: target,
      }),
      event(2, "2026-09-19T09:00:00.000Z", "activate"),
    ])]),
    /terminal_lifecycle_state_transition/,
  );
});

test("close is administrative lifecycle state and does not imply issue fixed, implementation or verification", () => {
  const built = buildCertified(
    { collectionKey: "synthetic:close", entries: [entry("query:a", 60)] },
    (explanation) => [policy(explanation, "query:a", { recommendationAllowed: true })],
  );
  const report = lifecycle(built, [history(built, "query:a", [
    event(1, "2026-09-19T08:00:00.000Z", "close", { reasonCode: "manual.close" }),
  ])]);

  assert.equal(recordFor(report, built, "query:a").currentState, "closed");
  assert.equal(report.semantics.closeImpliesIssueFixed, false);
  assert.equal(report.semantics.lifecycleStateImpliesImplementation, false);
  assert.equal(report.semantics.lifecycleStateImpliesVerification, false);
});

test("supersession is explicit, exact-current-target only and preserves target identity", () => {
  const built = buildCertified(
    { collectionKey: "synthetic:supersede", entries: [entry("query:a", 70), entry("query:b", 80)] },
    (explanation) => [policy(explanation, "query:a"), policy(explanation, "query:b")],
  );
  const target = built.subjects.get("query:b");
  assert.ok(target);
  const report = lifecycle(built, [history(built, "query:a", [
    event(1, "2026-09-19T08:00:00.000Z", "supersede", {
      reasonCode: "new.evidence",
      relatedOpportunityFingerprint: target,
    }),
  ])]);
  const source = recordFor(report, built, "query:a");

  assert.equal(source.currentState, "superseded");
  assert.equal(source.events[0]?.relatedOpportunityFingerprint, target);
  assert.equal(recordFor(report, built, "query:b").currentState, "observed");
  assert.equal(report.semantics.supersessionExplicitOnly, true);
  assert.equal(report.semantics.supersessionSimilarityInferencePerformed, false);

  assert.throws(
    () => lifecycle(built, [history(built, "query:a", [
      event(1, "2026-09-19T08:00:00.000Z", "supersede", {
        relatedOpportunityFingerprint: fp(9999),
      }),
    ])]),
    /unknown_supersession_target/,
  );
});

test("supersession cycles fail closed", () => {
  const built = buildCertified(
    { collectionKey: "synthetic:cycle", entries: [entry("query:a", 90), entry("query:b", 100)] },
    (explanation) => [policy(explanation, "query:a"), policy(explanation, "query:b")],
  );
  const a = built.subjects.get("query:a");
  const b = built.subjects.get("query:b");
  assert.ok(a);
  assert.ok(b);

  assert.throws(
    () => lifecycle(built, [
      history(built, "query:a", [
        event(1, "2026-09-19T08:00:00.000Z", "supersede", { relatedOpportunityFingerprint: b }),
      ]),
      history(built, "query:b", [
        event(1, "2026-09-19T08:30:00.000Z", "supersede", { relatedOpportunityFingerprint: a }),
      ]),
    ]),
    /supersession_cycle/,
  );
});

test("history and event input order do not change lifecycle identity", () => {
  const built = buildCertified(
    { collectionKey: "synthetic:order", entries: [entry("query:a", 110), entry("query:b", 120)] },
    (explanation) => [policy(explanation, "query:a"), policy(explanation, "query:b")],
  );
  const aEvents = [
    event(2, "2026-09-19T09:00:00.000Z", "defer"),
    event(1, "2026-09-19T08:00:00.000Z", "activate"),
  ];
  const bEvents = [event(1, "2026-09-19T08:30:00.000Z", "dismiss")];

  const one = lifecycle(built, [
    history(built, "query:b", bEvents),
    history(built, "query:a", aEvents),
  ]);
  const two = lifecycle(built, [
    history(built, "query:a", [...aEvents].reverse()),
    history(built, "query:b", bEvents),
  ]);

  assert.equal(one.reportFingerprint, two.reportFingerprint);
  assert.deepEqual(one, two);
});

test("sequence and timestamp validation fail closed", () => {
  const built = buildCertified(
    { collectionKey: "synthetic:time", entries: [entry("query:a", 130)] },
    (explanation) => [policy(explanation, "query:a")],
  );

  assert.throws(
    () => lifecycle(built, [history(built, "query:a", [
      event(1, "2026-09-19T08:00:00.000Z", "activate"),
      event(3, "2026-09-19T09:00:00.000Z", "defer"),
    ])]),
    /noncontiguous_lifecycle_sequence/,
  );
  assert.throws(
    () => lifecycle(built, [history(built, "query:a", [
      event(1, "2026-09-19T09:00:00.000Z", "activate"),
      event(2, "2026-09-19T08:00:00.000Z", "defer"),
    ])]),
    /lifecycle_event_time_regression/,
  );
  assert.throws(
    () => lifecycle(
      built,
      [history(built, "query:a", [event(1, "2026-09-19T13:00:00.000Z", "activate")])],
    ),
    /lifecycle_event_after_reference_time/,
  );
  assert.throws(
    () => lifecycle(built, [], "2026-09-18T23:59:59.000Z"),
    /lifecycle_reference_before_opportunity_reference/,
  );
});

test("unknown, duplicate and mismatched lifecycle targets fail closed", () => {
  const built = buildCertified(
    { collectionKey: "synthetic:targets", entries: [entry("query:a", 140)] },
    (explanation) => [policy(explanation, "query:a")],
  );
  const valid = history(built, "query:a", [event(1, "2026-09-19T08:00:00.000Z", "activate")]);

  assert.throws(
    () => lifecycle(built, [{ ...valid, opportunityFingerprint: fp(9990) }]),
    /unknown_lifecycle_opportunity/,
  );
  assert.throws(
    () => lifecycle(built, [{ ...valid, actionabilityFingerprint: fp(9991) }]),
    /lifecycle_actionability_lineage_mismatch/,
  );
  assert.throws(
    () => lifecycle(built, [valid, valid]),
    /duplicate_lifecycle_history/,
  );
});

test("actionability classes and previews do not infer lifecycle state", () => {
  const built = buildCertified(
    {
      collectionKey: "synthetic:no-inference",
      entries: [
        entry("query:recommend", 150),
        entry("query:approval", 160),
        entry("query:blocked", 170, { suppressionCodes: ["policy.blocked"] }),
      ],
    },
    (explanation) => [
      policy(explanation, "query:recommend", { recommendationAllowed: true }),
      policy(explanation, "query:approval", { approvalRequired: true }),
      policy(explanation, "query:blocked"),
    ],
    ({ subjects, actionability }) => {
      const opportunityFingerprint = subjects.get("query:recommend");
      assert.ok(opportunityFingerprint);
      const decision = actionability.decisions.find((candidate) =>
        candidate.opportunityFingerprint === opportunityFingerprint);
      assert.ok(decision);
      return [{
        opportunityFingerprint,
        actionabilityFingerprint: decision.actionabilityFingerprint,
        previewKey: "page.meta",
        fields: [{ fieldKey: "title", currentValue: "old", proposedValue: "new" }],
      }];
    },
  );
  const report = lifecycle(built, []);

  assert.ok(report.records.every((record) => record.currentState === "observed"));
  assert.equal(recordFor(report, built, "query:recommend").previewFingerprints.length, 1);
  assert.equal(recordFor(report, built, "query:approval").previewFingerprints.length, 0);
  assert.equal(recordFor(report, built, "query:blocked").previewFingerprints.length, 0);
  assert.equal(report.semantics.actionabilityInferencePerformed, false);
  assert.equal(report.semantics.previewDiffInferencePerformed, false);
});

test("tampered P6.6 preview/diff report fails closed", () => {
  const built = buildCertified(
    { collectionKey: "synthetic:tampered", entries: [entry("query:a", 180)] },
    (explanation) => [policy(explanation, "query:a")],
  );
  const tampered = {
    ...built.previewDiff,
    counts: { ...built.previewDiff.counts, previews: built.previewDiff.counts.previews + 1 },
  };

  assert.throws(
    () => buildOpportunityLifecycle({
      previewDiffInput: built.previewDiffInput,
      previewDiff: tampered,
      historyReferenceTime: HISTORY_REFERENCE,
      histories: [],
    }),
    /p66_preview_diff_integrity_mismatch/,
  );
});

test("history and event bounds fail closed", () => {
  const built = buildCertified(
    { collectionKey: "synthetic:bounds", entries: [entry("query:a", 190)] },
    (explanation) => [policy(explanation, "query:a")],
  );
  const valid = history(built, "query:a", [event(1, "2026-09-19T08:00:00.000Z", "activate")]);

  assert.throws(
    () => lifecycle(
      built,
      Array.from({ length: P6_7_MAX_HISTORIES + 1 }, () => valid),
    ),
    /lifecycle_history_limit_exceeded/,
  );
  assert.throws(
    () => lifecycle(built, [history(
      built,
      "query:a",
      Array.from({ length: P6_7_MAX_EVENTS_PER_HISTORY + 1 }, (_, index) =>
        event(index + 1, "2026-09-19T08:00:00.000Z", "activate")),
    )]),
    /lifecycle_event_limit_exceeded/,
  );
});

test("P6.7 capability keeps persistence, execution, automatic transitions and publication closed", () => {
  const capability = opportunityLifecycleCapability();
  assert.equal(capability.deterministicLifecycleOnly, true);
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
  assert.equal(capability.previewPersistenceAuthorized, false);
  assert.equal(capability.lifecyclePersistenceAuthorized, false);
  assert.equal(capability.databaseReadsAuthorized, false);
  assert.equal(capability.databaseWritesAuthorized, false);
  assert.equal(capability.schemaMutationAuthorized, false);
  assert.equal(capability.schedulerEnabled, false);
  assert.equal(capability.workerEnabled, false);
  assert.equal(capability.retryLoopEnabled, false);
  assert.equal(capability.approvalGrantAuthorized, false);
  assert.equal(capability.applyAuthorized, false);
  assert.equal(capability.providerWrites, false);
  assert.equal(capability.publicSiteWrites, false);
  assert.equal(capability.automaticTransitionEnabled, false);
  assert.equal(capability.publicationAuthorized, false);
});

test("P6.7 source contains no network, AI, wall-clock, database, persistence, execution or scheduler primitive", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const sourceText = readFileSync(join(here, "opportunity-lifecycle.ts"), "utf8");
  assert.doesNotMatch(sourceText, /\bfetch\s*\(/);
  assert.doesNotMatch(sourceText, /XMLHttpRequest|WebSocket|EventSource/);
  assert.doesNotMatch(sourceText, /\bOpenAI\b|chat\.completions|responses\.create/);
  assert.doesNotMatch(sourceText, /Date\.now\s*\(|new Date\s*\(\s*\)/);
  assert.doesNotMatch(sourceText, /process\.env|DATABASE_URL|postgres|drizzle/);
  assert.doesNotMatch(sourceText, /executeCompetitorPilot|executeAuthorizedSignalCollectionJob/);
  assert.doesNotMatch(sourceText, /\b(?:insertInto|updateTable|deleteFrom|persistRecord|sql\s*\`|db\.(?:insert|update|delete))\b/);
  assert.doesNotMatch(sourceText, /setTimeout|setInterval|queueMicrotask/);
});
