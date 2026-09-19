import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  P6_6_MAX_FIELDS_PER_PREVIEW,
  P6_6_MAX_PREVIEWS,
  P6_6_MAX_VALUE_LENGTH,
  buildOpportunityPreviewDiff,
  opportunityPreviewDiffCapability,
  type OpportunityPreviewInput,
} from "./opportunity-preview-diff.js";
import {
  classifyOpportunityActionability,
  type OpportunityActionabilityInput,
  type OpportunityActionabilityPolicyInput,
  type OpportunityActionabilityReport,
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
      basisCode: `p66.synthetic.${dimension}`,
      evidenceFingerprints: [fp(base + index)],
    } satisfies OpportunityScoreComponentInput,
  ])) as Record<OpportunityScoreDimension, OpportunityScoreComponentInput>;

  return {
    opportunity,
    score: scoreUnifiedOpportunity({ opportunity, components }),
    ...overrides,
  };
}

function buildActionability(
  collection: OpportunityPrioritizationInput,
  policiesFor: (explanation: ReturnType<typeof explainPrioritizedOpportunities>) => OpportunityActionabilityPolicyInput[],
): {
  actionabilityInput: OpportunityActionabilityInput;
  actionability: OpportunityActionabilityReport;
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
  return {
    actionabilityInput,
    actionability,
    subjects: new Map(explanation.items.map((item) => [item.subjectKey, item.opportunityFingerprint])),
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

function preview(
  built: ReturnType<typeof buildActionability>,
  subjectKey: string,
  previewKey: string,
  fields: OpportunityPreviewInput["fields"],
): OpportunityPreviewInput {
  const opportunityFingerprint = built.subjects.get(subjectKey);
  assert.ok(opportunityFingerprint);
  const decision = built.actionability.decisions.find((candidate) =>
    candidate.opportunityFingerprint === opportunityFingerprint);
  assert.ok(decision);
  return {
    opportunityFingerprint,
    actionabilityFingerprint: decision.actionabilityFingerprint,
    previewKey,
    fields,
  };
}

test("P6.6 classifies exact field states and preserves values", () => {
  const built = buildActionability(
    { collectionKey: "synthetic:statuses", entries: [entry("query:a", 10)] },
    (explanation) => [policy(explanation, "query:a", { recommendationAllowed: true })],
  );
  const report = buildOpportunityPreviewDiff({
    ...built,
    previews: [preview(built, "query:a", "page.meta", [
      { fieldKey: "title", currentValue: "Old", proposedValue: "New" },
      { fieldKey: "description", currentValue: null, proposedValue: "Added" },
      { fieldKey: "canonical", currentValue: "/old", proposedValue: null },
      { fieldKey: "robots", currentValue: "index,follow", proposedValue: "index,follow" },
    ])],
  });

  const fields = new Map(report.previews[0]!.fields.map((field) => [field.fieldKey, field]));
  assert.equal(fields.get("title")?.status, "modified");
  assert.equal(fields.get("description")?.status, "added");
  assert.equal(fields.get("canonical")?.status, "removed");
  assert.equal(fields.get("robots")?.status, "unchanged");
  assert.equal(fields.get("title")?.currentValue, "Old");
  assert.equal(fields.get("title")?.proposedValue, "New");
  assert.deepEqual(report.counts, {
    previews: 1,
    fields: 4,
    unchanged: 1,
    added: 1,
    removed: 1,
    modified: 1,
    changed: 3,
  });
});

test("null and empty string remain distinct", () => {
  const built = buildActionability(
    { collectionKey: "synthetic:null-empty", entries: [entry("query:a", 20)] },
    (explanation) => [policy(explanation, "query:a")],
  );
  const report = buildOpportunityPreviewDiff({
    ...built,
    previews: [preview(built, "query:a", "page.content", [
      { fieldKey: "h1", currentValue: null, proposedValue: "" },
      { fieldKey: "subtitle", currentValue: "", proposedValue: null },
    ])],
  });
  const fields = new Map(report.previews[0]!.fields.map((field) => [field.fieldKey, field]));
  assert.equal(fields.get("h1")?.status, "added");
  assert.equal(fields.get("subtitle")?.status, "removed");
  assert.equal(report.semantics.nullDistinctFromEmptyString, true);
});

test("value strings are not trimmed, case-folded or semantically normalized", () => {
  const built = buildActionability(
    { collectionKey: "synthetic:exact-values", entries: [entry("query:a", 30)] },
    (explanation) => [policy(explanation, "query:a")],
  );
  const report = buildOpportunityPreviewDiff({
    ...built,
    previews: [preview(built, "query:a", "page.title", [
      { fieldKey: "title", currentValue: "Title", proposedValue: " title " },
    ])],
  });
  const field = report.previews[0]!.fields[0]!;
  assert.equal(field.status, "modified");
  assert.equal(field.currentValue, "Title");
  assert.equal(field.proposedValue, " title ");
  assert.equal(report.semantics.valueSemanticNormalizationPerformed, false);
});

test("preview and field keys normalize deterministically and input order does not change identity", () => {
  const first = buildActionability(
    { collectionKey: "synthetic:order", entries: [entry("query:a", 40), entry("query:b", 50)] },
    (explanation) => [policy(explanation, "query:a"), policy(explanation, "query:b", { approvalRequired: true })],
  );
  const firstPreviews = [
    preview(first, "query:b", " Page.Meta ", [
      { fieldKey: " Description ", currentValue: "a", proposedValue: "b" },
      { fieldKey: "Title", currentValue: "x", proposedValue: "y" },
    ]),
    preview(first, "query:a", "Page.Content", [
      { fieldKey: "H1", currentValue: "one", proposedValue: "two" },
    ]),
  ];
  const secondPreviews = [
    preview(first, "query:a", "page.content", [
      { fieldKey: "h1", currentValue: "one", proposedValue: "two" },
    ]),
    preview(first, "query:b", "page.meta", [
      { fieldKey: "title", currentValue: "x", proposedValue: "y" },
      { fieldKey: "description", currentValue: "a", proposedValue: "b" },
    ]),
  ];

  const one = buildOpportunityPreviewDiff({ ...first, previews: firstPreviews });
  const two = buildOpportunityPreviewDiff({ ...first, previews: secondPreviews });
  assert.equal(one.reportFingerprint, two.reportFingerprint);
  assert.deepEqual(one, two);
  assert.equal(one.previews[0]?.previewKey, "page.content");
  assert.deepEqual(one.previews[1]?.fields.map((field) => field.fieldKey), ["description", "title"]);
});

test("P6.6 preserves all four P6.5 actionability classes without changing them", () => {
  const collection = {
    collectionKey: "synthetic:actionability",
    entries: [
      entry("query:info", 60),
      entry("query:recommend", 70),
      entry("query:approval", 80),
      entry("query:blocked", 90, { suppressionCodes: ["policy.blocked"] }),
    ],
  };
  const built = buildActionability(collection, (explanation) => [
    policy(explanation, "query:info"),
    policy(explanation, "query:recommend", { recommendationAllowed: true }),
    policy(explanation, "query:approval", { approvalRequired: true }),
    policy(explanation, "query:blocked"),
  ]);
  const previews = ["query:info", "query:recommend", "query:approval", "query:blocked"].map((subject) =>
    preview(built, subject, "page.meta", [
      { fieldKey: "title", currentValue: "a", proposedValue: "b" },
    ]));
  const report = buildOpportunityPreviewDiff({ ...built, previews });
  const byOpportunity = new Map(report.previews.map((item) => [item.opportunityFingerprint, item]));

  for (const decision of built.actionability.decisions) {
    const item = byOpportunity.get(decision.opportunityFingerprint);
    assert.ok(item);
    assert.equal(item.actionability.classification, decision.classification);
    assert.equal(item.actionability.approvalGranted, false);
    assert.equal(item.actionability.executionAuthorized, false);
    assert.equal(item.actionability.automaticTransitionAuthorized, false);
    assert.equal(item.applyAuthorized, false);
  }
  assert.equal(report.semantics.actionabilityPreserved, true);
  assert.equal(report.semantics.blockedPreviewInspectionAllowed, true);
});

test("preview coverage is optional and an empty preview set is deterministic", () => {
  const built = buildActionability(
    { collectionKey: "synthetic:empty", entries: [entry("query:a", 100)] },
    (explanation) => [policy(explanation, "query:a")],
  );
  const report = buildOpportunityPreviewDiff({ ...built, previews: [] });
  assert.deepEqual(report.counts, {
    previews: 0,
    fields: 0,
    unchanged: 0,
    added: 0,
    removed: 0,
    modified: 0,
    changed: 0,
  });
  assert.deepEqual(report.previews, []);
});

test("unknown or mismatched actionability lineage fails closed", () => {
  const built = buildActionability(
    { collectionKey: "synthetic:lineage", entries: [entry("query:a", 110)] },
    (explanation) => [policy(explanation, "query:a")],
  );
  const valid = preview(built, "query:a", "page.meta", [
    { fieldKey: "title", currentValue: "a", proposedValue: "b" },
  ]);

  assert.throws(
    () => buildOpportunityPreviewDiff({
      ...built,
      previews: [{ ...valid, opportunityFingerprint: fp(9999) }],
    }),
    /unknown_preview_opportunity/,
  );
  assert.throws(
    () => buildOpportunityPreviewDiff({
      ...built,
      previews: [{ ...valid, actionabilityFingerprint: fp(9998) }],
    }),
    /preview_actionability_lineage_mismatch/,
  );
});

test("duplicate normalized preview keys and field keys fail closed", () => {
  const built = buildActionability(
    { collectionKey: "synthetic:duplicates", entries: [entry("query:a", 120)] },
    (explanation) => [policy(explanation, "query:a")],
  );
  const one = preview(built, "query:a", "Page.Meta", [
    { fieldKey: "Title", currentValue: "a", proposedValue: "b" },
  ]);
  const two = preview(built, "query:a", " page.meta ", [
    { fieldKey: "description", currentValue: "a", proposedValue: "b" },
  ]);

  assert.throws(
    () => buildOpportunityPreviewDiff({ ...built, previews: [one, two] }),
    /duplicate_preview_key/,
  );
  assert.throws(
    () => buildOpportunityPreviewDiff({
      ...built,
      previews: [preview(built, "query:a", "page.content", [
        { fieldKey: "H1", currentValue: "a", proposedValue: "b" },
        { fieldKey: " h1 ", currentValue: "c", proposedValue: "d" },
      ])],
    }),
    /duplicate_preview_field_key/,
  );
});

test("tampered P6.5 actionability report fails closed", () => {
  const built = buildActionability(
    { collectionKey: "synthetic:tampered", entries: [entry("query:a", 130)] },
    (explanation) => [policy(explanation, "query:a")],
  );
  const tampered = {
    ...built.actionability,
    counts: { ...built.actionability.counts, total: built.actionability.counts.total + 1 },
  };

  assert.throws(
    () => buildOpportunityPreviewDiff({
      actionabilityInput: built.actionabilityInput,
      actionability: tampered,
      previews: [],
    }),
    /p65_actionability_integrity_mismatch/,
  );
});

test("preview, field and value bounds fail closed", () => {
  const built = buildActionability(
    { collectionKey: "synthetic:bounds", entries: [entry("query:a", 140)] },
    (explanation) => [policy(explanation, "query:a")],
  );
  const base = preview(built, "query:a", "page.meta", [
    { fieldKey: "title", currentValue: "a", proposedValue: "b" },
  ]);

  assert.throws(
    () => buildOpportunityPreviewDiff({
      ...built,
      previews: Array.from({ length: P6_6_MAX_PREVIEWS + 1 }, (_, index) => ({
        ...base,
        previewKey: `preview.${index}`,
      })),
    }),
    /preview_limit_exceeded/,
  );
  assert.throws(
    () => buildOpportunityPreviewDiff({
      ...built,
      previews: [preview(built, "query:a", "page.content",
        Array.from({ length: P6_6_MAX_FIELDS_PER_PREVIEW + 1 }, (_, index) => ({
          fieldKey: `field.${index}`,
          currentValue: "a",
          proposedValue: "b",
        })))],
    }),
    /preview_field_limit_exceeded/,
  );
  assert.throws(
    () => buildOpportunityPreviewDiff({
      ...built,
      previews: [preview(built, "query:a", "page.value", [{
        fieldKey: "content",
        currentValue: "a",
        proposedValue: "x".repeat(P6_6_MAX_VALUE_LENGTH + 1),
      }])],
    }),
    /preview_value_limit_exceeded/,
  );
});

test("P6.6 semantics never imply applied, approved, recommended, better, safe or valid state", () => {
  const built = buildActionability(
    { collectionKey: "synthetic:safety-semantics", entries: [entry("query:a", 150)] },
    (explanation) => [policy(explanation, "query:a", { recommendationAllowed: true })],
  );
  const report = buildOpportunityPreviewDiff({
    ...built,
    previews: [preview(built, "query:a", "page.meta", [
      { fieldKey: "title", currentValue: "before", proposedValue: "after" },
    ])],
  });
  assert.equal(report.semantics.proposedStateTreatedAsApplied, false);
  assert.equal(report.semantics.proposedStateTreatedAsApproved, false);
  assert.equal(report.semantics.proposedStateTreatedAsRecommended, false);
  assert.equal(report.semantics.proposedStateTreatedAsBetter, false);
  assert.equal(report.semantics.proposedStateTreatedAsSafeOrValid, false);
  assert.equal(report.semantics.patchOrApplyInstructionGenerated, false);
  assert.equal(report.previews[0]?.applyAuthorized, false);
});

test("P6.6 capability keeps runtime, apply, persistence and publication closed", () => {
  const capability = opportunityPreviewDiffCapability();
  assert.equal(capability.deterministicPreviewOnly, true);
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

test("P6.6 source contains no network, AI, environment, database, persistence, execution or scheduler primitive", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const sourceText = readFileSync(join(here, "opportunity-preview-diff.ts"), "utf8");
  assert.doesNotMatch(sourceText, /\bfetch\s*\(/);
  assert.doesNotMatch(sourceText, /XMLHttpRequest|WebSocket|EventSource/);
  assert.doesNotMatch(sourceText, /\bOpenAI\b|chat\.completions|responses\.create/);
  assert.doesNotMatch(sourceText, /process\.env|DATABASE_URL|postgres|drizzle/);
  assert.doesNotMatch(sourceText, /executeCompetitorPilot|executeAuthorizedSignalCollectionJob/);
  assert.doesNotMatch(sourceText, /\b(?:insertInto|updateTable|deleteFrom|persistRecord|sql\s*\`|db\.(?:insert|update|delete))\b/);
  assert.doesNotMatch(sourceText, /setTimeout|setInterval|queueMicrotask/);
});
