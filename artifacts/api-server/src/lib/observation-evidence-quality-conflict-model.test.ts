import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  createObservation,
  type ObservationConfidence,
  type ObservationRecord,
} from "./observation-evidence-persistence-design.js";
import { planObservationWrite } from "./observation-evidence-persistence-plan.js";
import { planRetentionHistory } from "./observation-evidence-retention-history-model.js";
import {
  buildRetentionHistoryReadModel,
  type RetentionHistoryReadContext,
  type RetentionHistoryReadQuery,
} from "./observation-evidence-retention-history-read-model.js";
import {
  P3_5_SCHEMA_VERSION,
  assertEvidenceQualityConflictModelIntegrity,
  buildEvidenceQualityConflictModel,
  type EvidenceQualityConflictContext,
} from "./observation-evidence-quality-conflict-model.js";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const SITE_ID = "diamond-shelf";
const ORIGIN = "https://diamondshelf.us";

type Options = {
  observedAt?: string;
  status?: string;
  sourceKind?: string;
  sourceFingerprint?: string;
  collectorId?: string;
  confidence?: ObservationConfidence;
  evidenceAvailability?: "available" | "unavailable";
  evidenceDimension?: string;
  freshForMs?: number;
};

function observation(options: Options = {}): ObservationRecord {
  const sourceKind = options.sourceKind ?? "source_a";
  const sourceFingerprint = options.sourceFingerprint ?? hash(sourceKind);
  const dimension = options.evidenceDimension ?? "status";
  return createObservation({
    subject: {
      kind: "site",
      siteId: SITE_ID,
      canonicalOrigin: ORIGIN,
      urlId: null,
      canonicalUrl: null,
    },
    observationKind: "technical_issue:crawl.inventory_incomplete",
    materialValue: { status: options.status ?? "open" },
    evidenceReferences: [{
      evidenceId: hash(`${sourceKind}:${dimension}:id`),
      evidenceFingerprint: hash(`${sourceKind}:${dimension}:evidence`),
      sourceKind,
      sourceFingerprint,
      dimension,
      quality: "direct",
      availability: options.evidenceAvailability ?? "available",
      referenceFingerprint: hash("placeholder"),
    }],
    provenance: {
      sourceKind,
      sourceFingerprint,
      collectorId: options.collectorId ?? `${sourceKind}_collector`,
    },
    confidence: options.confidence ?? "verified",
    observedAt: options.observedAt ?? "2026-09-16T06:00:00.000Z",
    freshForMs: options.freshForMs ?? 24 * 60 * 60 * 1_000,
    retentionClass: "operational_history",
  });
}

function qualityContext(input: {
  existingRecords: readonly ObservationRecord[];
  candidate: ObservationRecord;
  retentionReferenceTime?: string;
  qualityReferenceTime?: string;
  readQuery?: RetentionHistoryReadQuery;
}): EvidenceQualityConflictContext {
  const writePlan = planObservationWrite(input.existingRecords, input.candidate);
  const retentionReferenceTime = input.retentionReferenceTime ?? "2026-09-16T08:00:00.000Z";
  const retentionPlan = planRetentionHistory({
    existingRecords: input.existingRecords,
    writePlan,
    referenceTime: retentionReferenceTime,
  });
  const readContext: RetentionHistoryReadContext = {
    existingRecords: input.existingRecords,
    writePlan,
    referenceTime: retentionReferenceTime,
    retentionPlan,
  };
  const readQuery: RetentionHistoryReadQuery = input.readQuery ?? {
    siteId: SITE_ID,
    canonicalOrigin: ORIGIN,
    page: { limit: 100 },
  };
  const readModel = buildRetentionHistoryReadModel(readContext, readQuery);
  return {
    readContext,
    readQuery,
    readModel,
    referenceTime: input.qualityReferenceTime ?? retentionReferenceTime,
  };
}

test("P3.5 deterministically assesses evidence availability, freshness and support without ambient time", () => {
  assert.equal(P3_5_SCHEMA_VERSION, "p3_5_v1");
  const existing = observation({
    sourceKind: "source_a",
    observedAt: "2026-09-15T06:00:00.000Z",
    freshForMs: 60 * 60 * 1_000,
  });
  const candidate = observation({
    sourceKind: "source_b",
    status: "resolved",
    observedAt: "2026-09-16T07:00:00.000Z",
  });
  const context = qualityContext({ existingRecords: [existing], candidate });
  const model = buildEvidenceQualityConflictModel(context);
  const stale = model.assessments.find((assessment) => assessment.observationId === existing.observationId);
  const fresh = model.assessments.find((assessment) => assessment.observationId === candidate.observationId);
  assert.ok(stale);
  assert.ok(fresh);
  assert.equal(stale.freshnessState, "stale");
  assert.equal(stale.supportTier, "limited");
  assert.equal(fresh.freshnessState, "fresh");
  assert.equal(fresh.evidenceAvailability, "available");
  assert.equal(fresh.supportTier, "strong");
  assert.deepEqual(buildEvidenceQualityConflictModel(context), model);
});

test("P3.5 preserves independent corroboration and may conservatively prefer uniquely supported conflict evidence", () => {
  const conflictTarget = observation({
    sourceKind: "source_a",
    sourceFingerprint: hash("source-a"),
    collectorId: "collector_a",
    status: "open",
  });
  const corroboratingTarget = observation({
    sourceKind: "source_b",
    sourceFingerprint: hash("source-b"),
    collectorId: "collector_b",
    status: "resolved",
  });
  const candidate = observation({
    sourceKind: "source_c",
    sourceFingerprint: hash("source-c"),
    collectorId: "collector_c",
    status: "resolved",
    observedAt: "2026-09-16T07:00:00.000Z",
  });
  const context = qualityContext({ existingRecords: [conflictTarget, corroboratingTarget], candidate });
  const model = buildEvidenceQualityConflictModel(context);
  const candidateAssessment = model.assessments.find((assessment) => assessment.observationId === candidate.observationId);
  assert.ok(candidateAssessment);
  assert.equal(candidateAssessment.supportTier, "corroborated");
  assert.equal(candidateAssessment.corroboratingIndependentProvenanceCount, 1);

  assert.equal(model.conflictGroups.length, 1);
  const group = model.conflictGroups[0];
  assert.ok(group);
  assert.equal(group.coverage, "complete");
  assert.equal(group.resolutionState, "prefer_supported");
  assert.equal(group.preferredValueFingerprint, candidate.valueFingerprint);
  const preferred = group.valueSupports.find((support) => support.valueFingerprint === candidate.valueFingerprint);
  assert.ok(preferred);
  assert.deepEqual([...preferred.supportingObservationIds].sort(), [candidate.observationId, corroboratingTarget.observationId].sort());
  assert.equal(preferred.provenanceFingerprints.length, 2);
  assert.ok(group.reasoningCodes.includes("unique_independent_corroborated_support"));
});

test("P3.5 keeps conflicts unresolved when neither value has strict independent support dominance", () => {
  const conflictTarget = observation({ sourceKind: "source_a", status: "open" });
  const candidate = observation({ sourceKind: "source_b", status: "resolved", observedAt: "2026-09-16T07:00:00.000Z" });
  const context = qualityContext({ existingRecords: [conflictTarget], candidate });
  const model = buildEvidenceQualityConflictModel(context);
  assert.equal(model.conflictGroups.length, 1);
  assert.equal(model.conflictGroups[0]?.resolutionState, "retain_unresolved");
  assert.equal(model.conflictGroups[0]?.preferredValueFingerprint, null);
  assert.ok(model.conflictGroups[0]?.reasoningCodes.includes("no_strict_support_dominance"));
});

test("P3.5 fails closed to insufficient evidence when a conflict participant has unavailable evidence", () => {
  const conflictTarget = observation({ sourceKind: "source_a", status: "open", evidenceAvailability: "unavailable" });
  const candidate = observation({ sourceKind: "source_b", status: "resolved", observedAt: "2026-09-16T07:00:00.000Z" });
  const context = qualityContext({ existingRecords: [conflictTarget], candidate });
  const model = buildEvidenceQualityConflictModel(context);
  const unavailable = model.assessments.find((assessment) => assessment.observationId === conflictTarget.observationId);
  assert.ok(unavailable);
  assert.equal(unavailable.evidenceAvailability, "unavailable");
  assert.equal(unavailable.supportTier, "insufficient");
  assert.equal(model.conflictGroups[0]?.resolutionState, "insufficient_evidence");
  assert.ok(model.conflictGroups[0]?.reasoningCodes.includes("participant_evidence_insufficient"));
});

test("P3.5 marks paginated conflict coverage partial instead of inventing missing participant quality", () => {
  const conflictTarget = observation({ sourceKind: "source_a", status: "open" });
  const candidate = observation({ sourceKind: "source_b", status: "resolved", observedAt: "2026-09-16T07:00:00.000Z" });
  const context = qualityContext({
    existingRecords: [conflictTarget],
    candidate,
    readQuery: {
      siteId: SITE_ID,
      canonicalOrigin: ORIGIN,
      sort: { field: "observationId", direction: "asc" },
      page: { limit: 1 },
    },
  });
  const model = buildEvidenceQualityConflictModel(context);
  assert.equal(model.assessments.length, 1);
  assert.equal(model.conflictGroups.length, 1);
  assert.equal(model.conflictGroups[0]?.coverage, "partial_page");
  assert.equal(model.conflictGroups[0]?.missingObservationIds.length, 1);
  assert.equal(model.conflictGroups[0]?.resolutionState, "insufficient_evidence");
});

test("P3.5 bounded filters and pagination remain deterministic", () => {
  const existing = [
    observation({ sourceKind: "source_a", status: "a", confidence: "low" }),
    observation({ sourceKind: "source_b", status: "b", confidence: "medium" }),
  ];
  const candidate = observation({ sourceKind: "source_c", status: "c", confidence: "verified", observedAt: "2026-09-16T07:00:00.000Z" });
  const context = qualityContext({ existingRecords: existing, candidate });
  const model = buildEvidenceQualityConflictModel(context, {
    supportTiers: ["strong", "supported"],
    freshnessStates: ["fresh"],
    page: { offset: 0, limit: 1 },
  });
  assert.equal(model.page.limit, 1);
  assert.equal(model.page.returned, 1);
  assert.ok(model.page.totalMatched >= 1);
  assert.ok(model.assessments.every((assessment) => ["strong", "supported"].includes(assessment.supportTier)));
  assert.deepEqual(buildEvidenceQualityConflictModel(context, {
    supportTiers: ["supported", "strong"],
    freshnessStates: ["fresh"],
    page: { offset: 0, limit: 1 },
  }), model, "filter ordering must not change the result");
});

test("P3.5 rejects future observations relative to the supplied reference time", () => {
  const candidate = observation({ observedAt: "2026-09-16T07:00:00.000Z" });
  const context = qualityContext({
    existingRecords: [],
    candidate,
    retentionReferenceTime: "2026-09-16T08:00:00.000Z",
    qualityReferenceTime: "2026-09-16T06:59:59.000Z",
  });
  assert.throws(() => buildEvidenceQualityConflictModel(context), /evidence_quality_reference_time_before_observation/);
});

test("P3.5 validates the exact P3.4 read model and rejects tampering", () => {
  const candidate = observation({ sourceKind: "source_a" });
  const context = qualityContext({ existingRecords: [], candidate });
  const forgedContext: EvidenceQualityConflictContext = {
    ...context,
    readModel: {
      ...context.readModel,
      currentHeadObservationIds: [],
    },
  };
  assert.throws(() => buildEvidenceQualityConflictModel(forgedContext), /history_read_model_fingerprint_mismatch/);
});

test("P3.5 model integrity detects result tampering", () => {
  const candidate = observation({ sourceKind: "source_a" });
  const context = qualityContext({ existingRecords: [], candidate });
  const model = buildEvidenceQualityConflictModel(context);
  assert.doesNotThrow(() => assertEvidenceQualityConflictModelIntegrity(model, context));
  const forged = { ...model, conflictGroups: [] };
  assert.throws(() => assertEvidenceQualityConflictModelIntegrity(forged, context), /evidence_quality_model_fingerprint_mismatch/);
});
