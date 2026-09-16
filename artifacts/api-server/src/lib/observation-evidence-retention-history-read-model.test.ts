import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  createObservation,
  type ObservationRecord,
  type ObservationRetentionClass,
} from "./observation-evidence-persistence-design.js";
import {
  applyObservationWritePlanInMemory,
  planObservationWrite,
} from "./observation-evidence-persistence-plan.js";
import {
  planRetentionHistory,
  type HistoryRelationIntent,
  type RetentionHistoryPlan,
} from "./observation-evidence-retention-history-model.js";
import {
  P3_4_SCHEMA_VERSION,
  assertRetentionHistoryReadModelIntegrity,
  buildRetentionHistoryReadModel,
  type RetentionHistoryReadContext,
  type RetentionHistoryReadQuery,
} from "./observation-evidence-retention-history-read-model.js";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

const SITE_ID = "diamond-shelf";
const ORIGIN = "https://diamondshelf.us";

type Options = {
  observedAt?: string;
  status?: string;
  sourceKind?: string;
  sourceFingerprint?: string;
  collectorId?: string;
  retentionClass?: ObservationRetentionClass;
  observationKind?: string;
  siteId?: string;
  origin?: string;
};

function observation(options: Options = {}): ObservationRecord {
  return createObservation({
    subject: {
      kind: "site",
      siteId: options.siteId ?? SITE_ID,
      canonicalOrigin: options.origin ?? ORIGIN,
      urlId: null,
      canonicalUrl: null,
    },
    observationKind: options.observationKind ?? "technical_issue:crawl.inventory_incomplete",
    materialValue: { status: options.status ?? "open" },
    provenance: {
      sourceKind: options.sourceKind ?? "source_a",
      sourceFingerprint: options.sourceFingerprint ?? hash("source-a"),
      collectorId: options.collectorId ?? "collector_a",
    },
    confidence: "verified",
    observedAt: options.observedAt ?? "2026-09-16T06:00:00.000Z",
    freshForMs: 60 * 60 * 1_000,
    retentionClass: options.retentionClass ?? "operational_history",
  });
}

function contextFor(input: {
  existingRecords: readonly ObservationRecord[];
  candidate: ObservationRecord;
  existingRelations?: readonly HistoryRelationIntent[];
  referenceTime?: string;
}): RetentionHistoryReadContext {
  const writePlan = planObservationWrite(input.existingRecords, input.candidate);
  const referenceTime = input.referenceTime ?? "2026-09-17T00:00:00.000Z";
  const retentionPlan = planRetentionHistory({
    existingRecords: input.existingRecords,
    writePlan,
    existingRelations: input.existingRelations,
    referenceTime,
  });
  return {
    existingRecords: input.existingRecords,
    writePlan,
    existingRelations: input.existingRelations,
    referenceTime,
    retentionPlan,
  };
}

function baseQuery(overrides: Partial<RetentionHistoryReadQuery> = {}): RetentionHistoryReadQuery {
  return { siteId: SITE_ID, canonicalOrigin: ORIGIN, ...overrides };
}

test("P3.4 selects deterministic current heads while preserving superseded history and chains", () => {
  assert.equal(P3_4_SCHEMA_VERSION, "p3_4_v1");
  const old = observation({ observedAt: "2026-08-01T00:00:00.000Z", status: "open" });
  const candidate = observation({ observedAt: "2026-09-16T07:00:00.000Z", status: "resolved" });
  const context = contextFor({ existingRecords: [old], candidate });
  const model = buildRetentionHistoryReadModel(context, baseQuery());

  assert.equal(model.rows.length, 2);
  assert.deepEqual(model.currentHeadObservationIds, [candidate.observationId]);
  assert.equal(model.supersessionChains.length, 1);
  assert.deepEqual(model.supersessionChains[0]?.observationIds, [candidate.observationId, old.observationId]);
  const oldRow = model.rows.find((row) => row.observationId === old.observationId);
  const candidateRow = model.rows.find((row) => row.observationId === candidate.observationId);
  assert.ok(oldRow);
  assert.ok(candidateRow);
  assert.equal(oldRow.lifecycle, "superseded");
  assert.equal(oldRow.isSuperseded, true);
  assert.deepEqual(oldRow.supersededByObservationIds, [candidate.observationId]);
  assert.equal(candidateRow.isCurrent, true);
  assert.deepEqual(candidateRow.supersedesObservationIds, [old.observationId]);
});

test("P3.4 exposes unresolved conflicts and corroborating provenance without collapsing current heads", () => {
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
  const context = contextFor({ existingRecords: [conflictTarget, corroboratingTarget], candidate });
  const model = buildRetentionHistoryReadModel(context, baseQuery());

  assert.equal(context.writePlan.action, "preserve_conflict_insert");
  assert.equal(model.currentHeadObservationIds.length, 3, "conflicting provenance must not be collapsed by arbitrary last-write-wins");
  assert.equal(model.unresolvedConflicts.length, 1);
  assert.equal(model.unresolvedConflicts[0]?.relationType, "conflicts_with");
  assert.equal(model.corroborations.length, 1);
  assert.equal(model.corroborations[0]?.relationType, "corroborates");

  const candidateRow = model.rows.find((row) => row.observationId === candidate.observationId);
  const corroboratingRow = model.rows.find((row) => row.observationId === corroboratingTarget.observationId);
  assert.ok(candidateRow);
  assert.ok(corroboratingRow);
  assert.equal(candidateRow.lifecycle, "conflicting");
  assert.deepEqual(candidateRow.conflictObservationIds, [conflictTarget.observationId]);
  assert.deepEqual(candidateRow.corroboratingObservationIds, [corroboratingTarget.observationId]);
  assert.equal(corroboratingRow.hasCorroborationLineage, true);
});

test("P3.4 retention visibility is descriptive only and keeps prune candidates readable", () => {
  const old = observation({ observedAt: "2026-01-01T00:00:00.000Z", status: "open" });
  const candidate = observation({ observedAt: "2026-09-16T07:00:00.000Z", status: "resolved" });
  const context = contextFor({
    existingRecords: [old],
    candidate,
    referenceTime: "2026-10-15T00:00:00.000Z",
  });
  const model = buildRetentionHistoryReadModel(context, baseQuery());
  const oldRow = model.rows.find((row) => row.observationId === old.observationId);
  assert.ok(oldRow);
  assert.equal(oldRow.disposition, "prune_candidate");
  assert.equal(oldRow.lifecycle, "superseded");
  assert.equal(oldRow.evidenceAvailability, "unavailable", "absence of evidence references must remain explicit rather than inferred");
  assert.ok(model.rows.some((row) => row.observationId === old.observationId), "read models do not execute prune intent");
});

test("P3.4 bounded filters expose relation-specific views deterministically", () => {
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
  const context = contextFor({ existingRecords: [conflictTarget, corroboratingTarget], candidate });
  const model = buildRetentionHistoryReadModel(context, baseQuery({
    relationKinds: ["conflicts_with"],
    sort: { field: "sourceKind", direction: "asc" },
  }));

  assert.deepEqual(model.rows.map((row) => row.observationId).sort(), [candidate.observationId, conflictTarget.observationId].sort());
  assert.equal(model.rows.some((row) => row.observationId === corroboratingTarget.observationId), false);
  assert.equal(model.unresolvedConflicts.length, 1);
  assert.equal(model.corroborations.length, 1, "corroboration remains visible when one matched row participates in both relation types");
});

test("P3.4 cursor pagination is deterministic, snapshot-bound and query-bound", () => {
  const existing = [
    observation({ observationKind: "kind:a", observedAt: "2026-09-16T01:00:00.000Z" }),
    observation({ observationKind: "kind:b", observedAt: "2026-09-16T02:00:00.000Z" }),
    observation({ observationKind: "kind:c", observedAt: "2026-09-16T03:00:00.000Z" }),
  ];
  const candidate = observation({ observationKind: "kind:d", observedAt: "2026-09-16T04:00:00.000Z" });
  const context = contextFor({ existingRecords: existing, candidate });
  const firstQuery = baseQuery({
    sort: { field: "observedAt", direction: "asc" },
    page: { limit: 2 },
  });
  const first = buildRetentionHistoryReadModel(context, firstQuery);
  assert.equal(first.page.returned, 2);
  assert.equal(first.page.totalMatched, 4);
  assert.equal(first.page.hasMore, true);
  assert.ok(first.page.nextCursor);

  const secondQuery = baseQuery({
    sort: { field: "observedAt", direction: "asc" },
    page: { limit: 2, cursor: first.page.nextCursor },
  });
  const second = buildRetentionHistoryReadModel(context, secondQuery);
  assert.equal(second.page.offset, 2);
  assert.equal(second.page.returned, 2);
  assert.equal(second.page.hasMore, false);
  assert.equal(new Set([...first.rows, ...second.rows].map((row) => row.observationId)).size, 4);
  assert.deepEqual(buildRetentionHistoryReadModel(context, secondQuery), second, "cursor replay must be deterministic");

  const tampered = `${first.page.nextCursor?.slice(0, -1)}0`;
  assert.throws(
    () => buildRetentionHistoryReadModel(context, baseQuery({
      sort: { field: "observedAt", direction: "asc" },
      page: { limit: 2, cursor: tampered },
    })),
    /history_read_cursor_fingerprint_mismatch|history_read_cursor_invalid/,
  );
  assert.throws(
    () => buildRetentionHistoryReadModel(context, baseQuery({
      sort: { field: "observedAt", direction: "desc" },
      page: { limit: 2, cursor: first.page.nextCursor },
    })),
    /history_read_cursor_fingerprint_mismatch/,
  );
});

test("P3.4 projections are independent of supplied snapshot ordering", () => {
  const older = observation({ observationKind: "kind:a", observedAt: "2026-09-16T01:00:00.000Z" });
  const independent = observation({ observationKind: "kind:b", observedAt: "2026-09-16T02:00:00.000Z" });
  const candidate = observation({ observationKind: "kind:c", observedAt: "2026-09-16T03:00:00.000Z" });
  const context = contextFor({ existingRecords: [older, independent], candidate });
  const reversedContext: RetentionHistoryReadContext = {
    ...context,
    existingRecords: [...context.existingRecords].reverse(),
    existingRelations: context.existingRelations ? [...context.existingRelations].reverse() : undefined,
  };
  const query = baseQuery({ sort: { field: "observationId", direction: "asc" } });
  assert.deepEqual(buildRetentionHistoryReadModel(context, query), buildRetentionHistoryReadModel(reversedContext, query));
});

test("P3.4 fails closed on site/origin scope mismatch and P3.3 lineage tampering", () => {
  const old = observation({ observedAt: "2026-08-01T00:00:00.000Z" });
  const candidate = observation({ observedAt: "2026-09-16T07:00:00.000Z", status: "resolved" });
  const context = contextFor({ existingRecords: [old], candidate });

  assert.throws(
    () => buildRetentionHistoryReadModel(context, { siteId: "other-site", canonicalOrigin: ORIGIN }),
    /history_read_scope_mismatch/,
  );
  assert.throws(
    () => buildRetentionHistoryReadModel(context, { siteId: SITE_ID, canonicalOrigin: "https://example.com" }),
    /history_read_scope_mismatch/,
  );

  const forgedPlan = {
    ...context.retentionPlan,
    historyObservationIds: [candidate.observationId],
  } as RetentionHistoryPlan;
  assert.throws(
    () => buildRetentionHistoryReadModel({ ...context, retentionPlan: forgedPlan }, baseQuery()),
    /retention_history_plan_fingerprint_mismatch/,
  );
});

test("P3.4 read-model integrity rejects result tampering", () => {
  const old = observation({ observedAt: "2026-08-01T00:00:00.000Z" });
  const candidate = observation({ observedAt: "2026-09-16T07:00:00.000Z", status: "resolved" });
  const context = contextFor({ existingRecords: [old], candidate });
  const query = baseQuery();
  const model = buildRetentionHistoryReadModel(context, query);
  assert.doesNotThrow(() => assertRetentionHistoryReadModelIntegrity(model, context, query));

  const forged = { ...model, currentHeadObservationIds: [old.observationId] };
  assert.throws(
    () => assertRetentionHistoryReadModelIntegrity(forged, context, query),
    /history_read_model_fingerprint_mismatch/,
  );
});

test("P3.4 can read a multi-step supersession chain from retained prior relations", () => {
  const old = observation({ observedAt: "2026-07-01T00:00:00.000Z", status: "open" });
  const middle = observation({ observedAt: "2026-08-01T00:00:00.000Z", status: "warning" });
  const firstWrite = planObservationWrite([old], middle);
  const firstRetention = planRetentionHistory({
    existingRecords: [old],
    writePlan: firstWrite,
    referenceTime: "2026-08-02T00:00:00.000Z",
  });
  const postFirst = applyObservationWritePlanInMemory([old], firstWrite);

  const newest = observation({ observedAt: "2026-09-16T07:00:00.000Z", status: "resolved" });
  const context = contextFor({
    existingRecords: postFirst,
    candidate: newest,
    existingRelations: firstRetention.relationIntents,
    referenceTime: "2026-09-17T00:00:00.000Z",
  });
  const model = buildRetentionHistoryReadModel(context, baseQuery());
  assert.equal(model.supersessionChains.length, 1);
  assert.deepEqual(model.supersessionChains[0]?.observationIds, [newest.observationId, middle.observationId, old.observationId]);
  assert.deepEqual(model.currentHeadObservationIds, [newest.observationId]);
});
