import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createObservation, type ObservationRecord, type ObservationRetentionClass } from "./observation-evidence-persistence-design.js";
import {
  applyObservationWritePlanInMemory,
  planObservationWrite,
} from "./observation-evidence-persistence-plan.js";
import {
  P3_3_SCHEMA_VERSION,
  RETENTION_POLICIES,
  assertRetentionHistoryPlanIntegrity,
  planRetentionHistory,
  type HistoryRelationIntent,
} from "./observation-evidence-retention-history-model.js";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

type Options = {
  observedAt?: string;
  status?: string;
  sourceKind?: string;
  sourceFingerprint?: string;
  collectorId?: string;
  retentionClass?: ObservationRetentionClass;
  siteId?: string;
  origin?: string;
};

function observation(options: Options = {}): ObservationRecord {
  const origin = options.origin ?? "https://diamondshelf.us";
  return createObservation({
    subject: {
      kind: "site",
      siteId: options.siteId ?? "diamond-shelf",
      canonicalOrigin: origin,
      urlId: null,
      canonicalUrl: null,
    },
    observationKind: "technical_issue:crawl.inventory_incomplete",
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

function disposition(plan: ReturnType<typeof planRetentionHistory>, observationId: string) {
  const decision = plan.retentionDecisions.find((entry) => entry.observationId === observationId);
  assert.ok(decision, `missing retention decision for ${observationId}`);
  return decision.disposition;
}

test("P3.3 uses explicit deterministic retention policies and supplied reference time", () => {
  assert.equal(P3_3_SCHEMA_VERSION, "p3_3_v1");
  assert.equal(RETENTION_POLICIES.audit_history.pruneAfterMs, null);
  assert.equal(RETENTION_POLICIES.evidence_lineage.pruneAfterMs, null);
  assert.ok((RETENTION_POLICIES.operational_history.archiveAfterMs ?? 0) > 0);
  assert.ok((RETENTION_POLICIES.operational_history.pruneAfterMs ?? 0) > (RETENTION_POLICIES.operational_history.archiveAfterMs ?? 0));

  const candidate = observation({ observedAt: "2026-01-01T00:00:00.000Z" });
  const writePlan = planObservationWrite([], candidate);
  const first = planRetentionHistory({ existingRecords: [], writePlan, referenceTime: "2026-09-16T00:00:00.000Z" });
  const second = planRetentionHistory({ existingRecords: [], writePlan, referenceTime: "2026-09-16T00:00:00.000Z" });
  assert.deepEqual(first, second);
  assert.equal(disposition(first, candidate.observationId), "retain_current", "current records cannot become prune candidates even when old");
});

test("P3.3 persists supersession history intent without destructive last-write-wins replacement", () => {
  const old = observation({ observedAt: "2026-01-01T00:00:00.000Z", status: "open" });
  const candidate = observation({ observedAt: "2026-09-16T07:00:00.000Z", status: "resolved" });
  const writePlan = planObservationWrite([old], candidate);
  const plan = planRetentionHistory({
    existingRecords: [old],
    writePlan,
    referenceTime: "2026-09-17T00:00:00.000Z",
  });

  assert.equal(writePlan.action, "supersede_and_insert");
  assert.equal(plan.newRelationIntents.length, 1);
  assert.equal(plan.newRelationIntents[0]?.relationType, "supersedes");
  assert.equal(plan.newRelationIntents[0]?.fromObservationId, candidate.observationId);
  assert.equal(plan.newRelationIntents[0]?.toObservationId, old.observationId);
  assert.ok(plan.historyObservationIds.includes(old.observationId));
  assert.ok(plan.historyObservationIds.includes(candidate.observationId));
  assert.equal(plan.historyObservationIds.length, 2, "superseded history remains present in the modeled post-write snapshot");
});

test("P3.3 produces bounded archive and prune planning only for superseded operational history", () => {
  const archiveOld = observation({ observedAt: "2026-08-01T00:00:00.000Z", status: "open" });
  const archiveCandidate = observation({ observedAt: "2026-09-16T07:00:00.000Z", status: "resolved" });
  const archiveWrite = planObservationWrite([archiveOld], archiveCandidate);
  const archivePlan = planRetentionHistory({
    existingRecords: [archiveOld],
    writePlan: archiveWrite,
    referenceTime: "2026-10-15T00:00:00.000Z",
  });
  assert.equal(disposition(archivePlan, archiveOld.observationId), "archive");
  assert.deepEqual(archivePlan.archiveObservationIds, [archiveOld.observationId]);
  assert.deepEqual(archivePlan.pruneObservationIds, []);

  const pruneOld = observation({ observedAt: "2026-01-01T00:00:00.000Z", status: "open" });
  const pruneCandidate = observation({ observedAt: "2026-09-16T07:00:00.000Z", status: "resolved" });
  const pruneWrite = planObservationWrite([pruneOld], pruneCandidate);
  const prunePlan = planRetentionHistory({
    existingRecords: [pruneOld],
    writePlan: pruneWrite,
    referenceTime: "2026-10-15T00:00:00.000Z",
  });
  assert.equal(disposition(prunePlan, pruneOld.observationId), "prune_candidate");
  assert.deepEqual(prunePlan.pruneObservationIds, [pruneOld.observationId]);
  assert.ok(prunePlan.historyObservationIds.includes(pruneOld.observationId), "P3.3 emits prune intent but does not delete history");
});

test("P3.3 never plans pruning for audit or evidence-lineage records", () => {
  for (const retentionClass of ["audit_history", "evidence_lineage"] as const) {
    const old = observation({
      observedAt: "2025-01-01T00:00:00.000Z",
      status: "open",
      retentionClass,
    });
    const candidate = observation({
      observedAt: "2026-09-16T07:00:00.000Z",
      status: "resolved",
      retentionClass,
    });
    const writePlan = planObservationWrite([old], candidate);
    const plan = planRetentionHistory({
      existingRecords: [old],
      writePlan,
      referenceTime: "2026-09-17T00:00:00.000Z",
    });
    assert.equal(disposition(plan, old.observationId), retentionClass === "audit_history" ? "retain_audit" : "retain_evidence_lineage");
    assert.equal(plan.pruneObservationIds.includes(old.observationId), false);
  }
});

test("P3.3 protects unresolved conflict and corroboration lineage from pruning", () => {
  const conflictTarget = observation({
    observedAt: "2025-01-01T00:00:00.000Z",
    sourceKind: "source_a",
    sourceFingerprint: hash("source-a"),
    collectorId: "collector_a",
    status: "open",
  });
  const corroboratingTarget = observation({
    observedAt: "2025-01-02T00:00:00.000Z",
    sourceKind: "source_b",
    sourceFingerprint: hash("source-b"),
    collectorId: "collector_b",
    status: "resolved",
  });
  const candidate = observation({
    observedAt: "2026-09-16T07:00:00.000Z",
    sourceKind: "source_c",
    sourceFingerprint: hash("source-c"),
    collectorId: "collector_c",
    status: "resolved",
  });
  const writePlan = planObservationWrite([conflictTarget, corroboratingTarget], candidate);
  const plan = planRetentionHistory({
    existingRecords: [conflictTarget, corroboratingTarget],
    writePlan,
    referenceTime: "2026-09-17T00:00:00.000Z",
  });

  assert.equal(writePlan.action, "preserve_conflict_insert");
  assert.equal(disposition(plan, conflictTarget.observationId), "retain_conflict");
  assert.equal(disposition(plan, corroboratingTarget.observationId), "retain_corroboration");
  assert.equal(plan.pruneObservationIds.length, 0);
  assert.deepEqual(new Set(plan.newRelationIntents.map((relation) => relation.relationType)), new Set(["conflicts_with", "corroborates"]));
});

test("P3.3 planning is independent of record and relation input ordering", () => {
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
  const firstWrite = planObservationWrite([conflictTarget, corroboratingTarget], candidate);
  const firstPlan = planRetentionHistory({
    existingRecords: [conflictTarget, corroboratingTarget],
    writePlan: firstWrite,
    referenceTime: "2026-09-17T00:00:00.000Z",
  });
  const postRecords = applyObservationWritePlanInMemory([conflictTarget, corroboratingTarget], firstWrite);
  const replayWrite = planObservationWrite(postRecords, candidate);

  const left = planRetentionHistory({
    existingRecords: postRecords,
    writePlan: replayWrite,
    existingRelations: firstPlan.relationIntents,
    referenceTime: "2026-09-17T00:00:00.000Z",
  });
  const right = planRetentionHistory({
    existingRecords: [...postRecords].reverse(),
    writePlan: replayWrite,
    existingRelations: [...firstPlan.relationIntents].reverse(),
    referenceTime: "2026-09-17T00:00:00.000Z",
  });
  assert.deepEqual(left, right);
  assert.equal(left.newRelationIntents.length, 0, "relation replay is idempotent");
});

test("P3.3 integrity rejects plan tampering and changed reference-time inputs", () => {
  const old = observation({ observedAt: "2026-08-01T00:00:00.000Z" });
  const candidate = observation({ observedAt: "2026-09-16T07:00:00.000Z", status: "resolved" });
  const writePlan = planObservationWrite([old], candidate);
  const input = {
    existingRecords: [old],
    writePlan,
    referenceTime: "2026-10-15T00:00:00.000Z",
  } as const;
  const plan = planRetentionHistory(input);
  assert.doesNotThrow(() => assertRetentionHistoryPlanIntegrity(plan, input));

  const forged = { ...plan, pruneObservationIds: [old.observationId] };
  assert.throws(
    () => assertRetentionHistoryPlanIntegrity(forged, input),
    /retention_history_plan_fingerprint_mismatch/,
  );
  assert.throws(
    () => assertRetentionHistoryPlanIntegrity(plan, { ...input, referenceTime: "2026-10-16T00:00:00.000Z" }),
    /retention_history_plan_fingerprint_mismatch/,
  );
});

test("P3.3 rejects tampered relation artifacts and reference times before observations", () => {
  const old = observation({ status: "open" });
  const candidate = observation({
    status: "resolved",
    sourceKind: "source_b",
    sourceFingerprint: hash("source-b"),
    collectorId: "collector_b",
    observedAt: "2026-09-16T07:00:00.000Z",
  });
  const firstWrite = planObservationWrite([old], candidate);
  const firstPlan = planRetentionHistory({
    existingRecords: [old],
    writePlan: firstWrite,
    referenceTime: "2026-09-17T00:00:00.000Z",
  });
  const postRecords = applyObservationWritePlanInMemory([old], firstWrite);
  const replayWrite = planObservationWrite(postRecords, candidate);
  const relation = firstPlan.relationIntents[0];
  assert.ok(relation);
  const forgedRelation: HistoryRelationIntent = { ...relation, canonicalOrigin: "https://forged.example" };
  assert.throws(
    () => planRetentionHistory({
      existingRecords: postRecords,
      writePlan: replayWrite,
      existingRelations: [forgedRelation],
      referenceTime: "2026-09-17T00:00:00.000Z",
    }),
    /retention_relation_fingerprint_mismatch/,
  );

  const freshCandidate = observation({ observedAt: "2026-09-16T07:00:00.000Z" });
  const freshWrite = planObservationWrite([], freshCandidate);
  assert.throws(
    () => planRetentionHistory({ existingRecords: [], writePlan: freshWrite, referenceTime: "2026-09-16T06:59:59.000Z" }),
    /retention_reference_time_precedes_observation/,
  );
});
