import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildUnifiedOpportunityRecord,
  type UnifiedOpportunityEvidenceInput,
} from "./unified-opportunity-types.js";
import {
  scoreUnifiedOpportunity,
  type OpportunityScoreComponentInput,
  type OpportunityScoreDimension,
} from "./opportunity-scoring.js";
import {
  prioritizeUnifiedOpportunities,
  type OpportunityCollectionEntryInput,
  type OpportunityPrioritizationInput,
} from "./opportunity-prioritization.js";
import {
  explainPrioritizedOpportunities,
  type OpportunityExplanationInput,
} from "./opportunity-explanation.js";
import {
  classifyOpportunityActionability,
  type OpportunityActionabilityInput,
  type OpportunityActionabilityPolicyInput,
} from "./opportunity-actionability.js";
import {
  buildOpportunityPreviewDiff,
  type OpportunityPreviewDiffInput,
  type OpportunityPreviewFieldInput,
} from "./opportunity-preview-diff.js";
import {
  buildOpportunityLifecycle,
  type OpportunityLifecycleInput,
} from "./opportunity-lifecycle.js";
import {
  normalizeWorkerControlState,
} from "./worker-control-observability.js";
import {
  projectRecommendationGenerationWorker,
} from "./recommendation-generation-worker.js";
import {
  assertP88W02ReplayCompatible,
  assertP88W02TargetBindingIntegrity,
  buildP88W02ProductTargetBinding,
  materializeP88W02GovernedProposal,
  p88W02TargetBindingIntegrityIssues,
  type P88W02ProductTargetBinding,
} from "./p8-8-governed-proposal-materialization.js";

const OPPORTUNITY_REFERENCE = "2026-09-23T05:00:00.000Z";
const HISTORY_REFERENCE = "2026-09-23T05:30:00.000Z";
const CONTROL_REFERENCE = "2026-09-23T05:40:00.000Z";
const WORKER_REFERENCE = "2026-09-23T05:45:00.000Z";
const MATERIALIZATION_REFERENCE = "2026-09-23T05:50:00.000Z";
const MARKET = "a".repeat(64);
const CATEGORY = "b".repeat(64);
const SOURCE = "c".repeat(64);
const DIMENSIONS: OpportunityScoreDimension[] = [
  "impact",
  "confidence",
  "risk",
  "effort",
  "freshness",
];

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
    sourceKey: "synthetic:" + kind,
    observedAt: "2026-09-23T04:30:00.000Z",
    marketFingerprint: MARKET,
    categoryFingerprint: CATEGORY,
  };
}

function opportunityEntry(): OpportunityCollectionEntryInput {
  const opportunity = buildUnifiedOpportunityRecord({
    family: "query",
    kind: "query_gap",
    subjectKey: "query:w02-product-meta",
    referenceTime: OPPORTUNITY_REFERENCE,
    marketFingerprint: MARKET,
    categoryFingerprint: CATEGORY,
    evidence: [
      evidence("gsc_query", fp(10)),
      evidence("serp_ranking", fp(11)),
      evidence("keyword_metrics", fp(12)),
      evidence("trend_context", fp(13)),
      evidence("competitor_gap", fp(14)),
    ],
  });
  const components = Object.fromEntries(
    DIMENSIONS.map((dimension, index) => [
      dimension,
      {
        value:
          dimension === "risk"
            ? 0.1
            : dimension === "effort"
              ? 0.2
              : 0.9,
        basisCode: "p88.w02.synthetic." + dimension,
        evidenceFingerprints: [fp(10 + index)],
      } satisfies OpportunityScoreComponentInput,
    ]),
  ) as Record<OpportunityScoreDimension, OpportunityScoreComponentInput>;

  return {
    opportunity,
    score: scoreUnifiedOpportunity({ opportunity, components }),
  };
}

function buildFixture(input?: {
  recommendationMode?: "approval" | "recommend";
  fields?: OpportunityPreviewFieldInput[];
}) {
  const collection: OpportunityPrioritizationInput = {
    collectionKey: "synthetic:p88-w02",
    entries: [opportunityEntry()],
  };
  const prioritization = prioritizeUnifiedOpportunities(collection);
  const explanationInput: OpportunityExplanationInput = {
    collection,
    prioritization,
  };
  const explanation = explainPrioritizedOpportunities(explanationInput);
  const item = explanation.items[0]!;
  const policy: OpportunityActionabilityPolicyInput = {
    opportunityFingerprint: item.opportunityFingerprint,
    recommendationAllowed: input?.recommendationMode === "recommend",
    approvalRequired: input?.recommendationMode !== "recommend",
    blockCodes: [],
  };
  const actionabilityInput: OpportunityActionabilityInput = {
    explanationInput,
    explanation,
    policies: [policy],
  };
  const actionability = classifyOpportunityActionability(actionabilityInput);
  const decision = actionability.decisions[0]!;

  const fields: OpportunityPreviewFieldInput[] =
    input?.fields
    ?? [{
      fieldKey: "meta_description",
      currentValue: "  Current description with exact bytes.  ",
      proposedValue: "  Proposed description with exact bytes.  ",
    }];

  const previewDiffInput: OpportunityPreviewDiffInput = {
    actionabilityInput,
    actionability,
    previews: [{
      opportunityFingerprint: item.opportunityFingerprint,
      actionabilityFingerprint: decision.actionabilityFingerprint,
      previewKey: "page.meta",
      fields,
    }],
  };
  const previewDiff = buildOpportunityPreviewDiff(previewDiffInput);
  const lifecycleInput: OpportunityLifecycleInput = {
    previewDiffInput,
    previewDiff,
    historyReferenceTime: HISTORY_REFERENCE,
    histories: [],
  };
  const lifecycle = buildOpportunityLifecycle(lifecycleInput);
  const control = normalizeWorkerControlState({
    mode: "running",
    effectiveAt: CONTROL_REFERENCE,
    reason: "p88_w02_synthetic_control",
  });

  const workerInput = {
    lifecycleInput,
    lifecycle,
    control,
    batchKey: "p88.w02.synthetic",
    referenceTime: WORKER_REFERENCE,
  };
  const projection = projectRecommendationGenerationWorker(workerInput);
  const recommendation = projection.candidates[0];

  return {
    workerInput,
    projection,
    recommendation,
    preview: previewDiff.previews[0]!,
  };
}

function targetBinding(input?: {
  gid?: string;
  url?: string;
  sourceFingerprint?: string;
}) {
  return buildP88W02ProductTargetBinding({
    siteId: "eb1da9ee-539c-4200-8f04-f64ccaea7768",
    domain: "diamondshelf.us",
    provider: "shopify",
    resourceKind: "product",
    resourceGid: input?.gid ?? "gid://shopify/Product/123456789",
    targetUrl:
      input?.url ?? "https://diamondshelf.us/products/example-product",
    actionType: "update_meta_description",
    field: "meta_description",
    requiredProviderScope: "write_products",
    sourceSystem: "catalog.snapshot",
    sourceIdentity: "product-binding-123456789",
    sourceFingerprint: input?.sourceFingerprint ?? SOURCE,
  });
}

function materialize(
  fixture = buildFixture(),
  binding = targetBinding(),
) {
  assert.ok(fixture.recommendation);
  return materializeP88W02GovernedProposal({
    recommendationWorkerInput: fixture.workerInput,
    recommendation: fixture.recommendation,
    selectedPreviewFingerprint: fixture.preview.previewFingerprint,
    targetBinding: binding,
    referenceTime: MATERIALIZATION_REFERENCE,
  });
}

test("W02 deterministically materializes exactly one proposal-review preview without text changes", () => {
  const fixture = buildFixture();
  const result = materialize(fixture);

  assert.equal(result.proposalLifecycle, "materialized_unpersisted");
  assert.equal(result.mutationClass, "shopify.product.seo.meta_description");
  assert.equal(result.recommendation.recommendationClass, "proposal_review");
  assert.equal(result.preview.fieldKey, "meta_description");

  assert.equal(
    result.before.value,
    "  Current description with exact bytes.  ",
  );
  assert.equal(
    result.after.value,
    "  Proposed description with exact bytes.  ",
  );
  assert.equal(result.generation.textGenerated, false);
  assert.equal(result.generation.textRewritten, false);
  assert.equal(result.generation.aiAssisted, false);

  assert.match(result.before.fingerprint, /^[0-9a-f]{64}$/);
  assert.match(result.after.fingerprint, /^[0-9a-f]{64}$/);
  assert.match(result.proposalFingerprint, /^[0-9a-f]{64}$/);
  assert.match(result.materializationFingerprint, /^[0-9a-f]{64}$/);
  assert.match(
    result.materializationIdempotencyFingerprint,
    /^[0-9a-f]{64}$/,
  );
  assert.notEqual(result.before.fingerprint, result.after.fingerprint);

  assert.equal(result.safety.databaseReadPerformed, false);
  assert.equal(result.safety.databaseWritePerformed, false);
  assert.equal(result.safety.providerNetworkReadPerformed, false);
  assert.equal(result.safety.providerWritePerformed, false);
  assert.equal(result.safety.proposalRecordPersisted, false);
  assert.equal(result.safety.approvalCreated, false);
  assert.equal(result.safety.policyAuthorizationCreated, false);
  assert.equal(result.safety.task51ExecutionPerformed, false);
  assert.equal(result.safety.task53ExecutionPerformed, false);
  assert.equal(result.safety.task54ExecutionPerformed, false);
  assert.equal(result.safety.workerActivated, false);
  assert.equal(result.safety.liveExecutionAuthorized, false);
});

test("exact replay returns identical proposal/materialization identities", () => {
  const fixture = buildFixture();
  const binding = targetBinding();
  const left = materialize(fixture, binding);
  const right = materialize(fixture, binding);

  assert.equal(left.proposalFingerprint, right.proposalFingerprint);
  assert.equal(left.proposalId, right.proposalId);
  assert.equal(
    left.materializationIdempotencyFingerprint,
    right.materializationIdempotencyFingerprint,
  );
  assert.equal(
    left.materializationFingerprint,
    right.materializationFingerprint,
  );
  assert.equal(left.materializationId, right.materializationId);
  assert.equal(Object.isFrozen(left), true);
  assert.equal(Object.isFrozen(left.target), true);
  assert.equal(Object.isFrozen(left.safety), true);
});

test("target binding is deterministic and fails closed on tamper or broader scope", () => {
  const left = targetBinding();
  const right = targetBinding();
  assert.equal(
    left.targetBindingFingerprint,
    right.targetBindingFingerprint,
  );
  assert.deepEqual(p88W02TargetBindingIntegrityIssues(left), []);
  assert.doesNotThrow(() => assertP88W02TargetBindingIntegrity(left));

  const tampered = {
    ...left,
    targetBindingFingerprint: "d".repeat(64),
  } as P88W02ProductTargetBinding;
  assert.deepEqual(
    p88W02TargetBindingIntegrityIssues(tampered),
    ["p88_w02_target_binding_fingerprint_mismatch"],
  );

  assert.throws(
    () =>
      buildP88W02ProductTargetBinding({
        siteId: "site",
        domain: "diamondshelf.us",
        provider: "shopify",
        resourceKind: "collection",
        resourceGid: "gid://shopify/Collection/123",
        targetUrl: "https://diamondshelf.us/collections/home-fragrance",
        actionType: "update_meta_description",
        field: "meta_description",
        requiredProviderScope: "write_products",
        sourceSystem: "catalog.snapshot",
        sourceIdentity: "x",
        sourceFingerprint: SOURCE,
      }),
    /p88_w02_unsupported_target_resource_kind/,
  );

  assert.throws(
    () =>
      targetBinding({
        gid: "gid://shopify/Collection/123456789",
      }),
    /p88_w02_invalid_product_gid/,
  );

  assert.throws(
    () =>
      targetBinding({
        url: "https://diamondshelf.us/products/example-product?x=1",
      }),
    /p88_w02_invalid_target_url/,
  );
});

test("advisory P9.7 recommendations are never materializable", () => {
  const fixture = buildFixture({ recommendationMode: "recommend" });
  assert.ok(fixture.recommendation);
  assert.equal(fixture.recommendation.recommendationClass, "advisory_review");

  assert.throws(
    () => materialize(fixture),
    /p88_w02_advisory_review_not_materializable/,
  );
});

test("tampered P9.7 recommendation fails canonical rebuild", () => {
  const fixture = buildFixture();
  assert.ok(fixture.recommendation);
  const tampered = {
    ...fixture.recommendation,
    reviewInstruction: fixture.recommendation.reviewInstruction + " tampered",
  };

  assert.throws(
    () =>
      materializeP88W02GovernedProposal({
        recommendationWorkerInput: fixture.workerInput,
        recommendation: tampered,
        selectedPreviewFingerprint: fixture.preview.previewFingerprint,
        targetBinding: targetBinding(),
        referenceTime: MATERIALIZATION_REFERENCE,
      }),
    /p88_w02_recommendation_integrity_mismatch/,
  );
});

test("tampered P6.6 preview report fails upstream integrity rebuild", () => {
  const fixture = buildFixture();
  assert.ok(fixture.recommendation);

  const tamperedWorkerInput = {
    ...fixture.workerInput,
    lifecycleInput: {
      ...fixture.workerInput.lifecycleInput,
      previewDiff: {
        ...fixture.workerInput.lifecycleInput.previewDiff,
        counts: {
          ...fixture.workerInput.lifecycleInput.previewDiff.counts,
          changed:
            fixture.workerInput.lifecycleInput.previewDiff.counts.changed + 1,
        },
      },
    },
  };

  assert.throws(
    () =>
      materializeP88W02GovernedProposal({
        recommendationWorkerInput: tamperedWorkerInput,
        recommendation: fixture.recommendation,
        selectedPreviewFingerprint: fixture.preview.previewFingerprint,
        targetBinding: targetBinding(),
        referenceTime: MATERIALIZATION_REFERENCE,
      }),
    /p66_preview_diff_integrity_mismatch|p67_lifecycle_integrity_mismatch/,
  );
});

test("selected preview must be exact changed P9.7 lineage", () => {
  const fixture = buildFixture();
  assert.ok(fixture.recommendation);

  assert.throws(
    () =>
      materializeP88W02GovernedProposal({
        recommendationWorkerInput: fixture.workerInput,
        recommendation: fixture.recommendation,
        selectedPreviewFingerprint: "d".repeat(64),
        targetBinding: targetBinding(),
        referenceTime: MATERIALIZATION_REFERENCE,
      }),
    /p88_w02_selected_preview_not_in_recommendation_lineage/,
  );
});

test("W02 rejects multiple fields and non-meta-description previews", () => {
  const multi = buildFixture({
    fields: [
      {
        fieldKey: "meta_description",
        currentValue: "Before",
        proposedValue: "After",
      },
      {
        fieldKey: "title",
        currentValue: "Title before",
        proposedValue: "Title after",
      },
    ],
  });
  assert.ok(multi.recommendation);
  assert.throws(
    () => materialize(multi),
    /p88_w02_single_changed_field_required/,
  );

  const titleOnly = buildFixture({
    fields: [{
      fieldKey: "title",
      currentValue: "Before",
      proposedValue: "After",
    }],
  });
  assert.ok(titleOnly.recommendation);
  assert.throws(
    () => materialize(titleOnly),
    /p88_w02_meta_description_only/,
  );
});

test("before/after fingerprints bind exact target as well as exact bytes", () => {
  const fixture = buildFixture();
  const first = materialize(fixture, targetBinding());
  const second = materialize(
    fixture,
    targetBinding({
      gid: "gid://shopify/Product/987654321",
      url: "https://diamondshelf.us/products/other-product",
    }),
  );

  assert.equal(first.before.value, second.before.value);
  assert.equal(first.after.value, second.after.value);
  assert.notEqual(first.before.fingerprint, second.before.fingerprint);
  assert.notEqual(first.after.fingerprint, second.after.fingerprint);
  assert.notEqual(first.proposalFingerprint, second.proposalFingerprint);
});

test("conflicting reuse of one recommendation identity fails replay compatibility", () => {
  const fixture = buildFixture();
  const first = materialize(fixture, targetBinding());
  const conflicting = materialize(
    fixture,
    targetBinding({
      gid: "gid://shopify/Product/987654321",
      url: "https://diamondshelf.us/products/other-product",
    }),
  );

  assert.equal(
    first.recommendation.idempotencyFingerprint,
    conflicting.recommendation.idempotencyFingerprint,
  );
  assert.notEqual(
    first.materializationIdempotencyFingerprint,
    conflicting.materializationIdempotencyFingerprint,
  );
  assert.throws(
    () => assertP88W02ReplayCompatible(first, conflicting),
    /p88_w02_conflicting_replay_identity/,
  );
  assert.doesNotThrow(() => assertP88W02ReplayCompatible(first, first));
});

test("W02 preserves P9.7 evidence lineage and does not fabricate W01 live state", () => {
  const fixture = buildFixture();
  assert.ok(fixture.recommendation);
  const result = materialize(fixture);

  assert.deepEqual(
    result.lineage.evidenceFingerprints,
    [...fixture.recommendation.lineage.evidenceFingerprints].sort(
      (a, b) => a.localeCompare(b),
    ),
  );
  assert.deepEqual(
    result.lineage.missingEvidence,
    fixture.recommendation.lineage.missingEvidence,
  );
  assert.equal(result.w01Facts.lineageMaterialized, true);
  assert.equal(result.w01Facts.changedPreviewPresent, true);
  assert.equal(result.w01Facts.proposalGenerationMethod, "p9.7_deterministic_preview");

  assert.equal(
    Object.prototype.hasOwnProperty.call(
      result.w01Facts,
      "providerObservedBeforeFingerprint",
    ),
    false,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(result.w01Facts, "mutationQuotaRemaining"),
    false,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(result.w01Facts, "boundedPilot"),
    false,
  );
});

test("materialization reference time is canonical and cannot precede upstream", () => {
  const fixture = buildFixture();
  assert.ok(fixture.recommendation);

  assert.throws(
    () =>
      materializeP88W02GovernedProposal({
        recommendationWorkerInput: fixture.workerInput,
        recommendation: fixture.recommendation,
        selectedPreviewFingerprint: fixture.preview.previewFingerprint,
        targetBinding: targetBinding(),
        referenceTime: "2026-09-23T05:44:59.000Z",
      }),
    /p88_w02_reference_before_upstream/,
  );

  assert.throws(
    () =>
      materializeP88W02GovernedProposal({
        recommendationWorkerInput: fixture.workerInput,
        recommendation: fixture.recommendation,
        selectedPreviewFingerprint: fixture.preview.previewFingerprint,
        targetBinding: targetBinding(),
        referenceTime: "2026-09-23T05:50:00+00:00",
      }),
    /p88_w02_noncanonical_reference_time/,
  );
});

test("W02 source has no DB, HTTP, provider SDK, route, worker dispatch, or Task execution binding", async () => {
  const source = await readFile(
    new URL("./p8-8-governed-proposal-materialization.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /from "node:crypto"/);
  assert.doesNotMatch(source, /from "postgres"/);
  assert.doesNotMatch(source, /drizzle-orm/);
  assert.doesNotMatch(source, /DATABASE_URL/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /https?\.request/);
  assert.doesNotMatch(source, /express\s*\(/);
  assert.doesNotMatch(source, /router\./);
  assert.doesNotMatch(source, /process\.env/);
  assert.doesNotMatch(source, /task54-persistent-apply/);
  assert.doesNotMatch(source, /task51-action-renewal/);
  assert.doesNotMatch(source, /scheduler.*dispatch/i);
  assert.doesNotMatch(source, /worker.*dispatch/i);
});
