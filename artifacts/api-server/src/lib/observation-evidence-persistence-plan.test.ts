import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createObservation, type ObservationRecord } from "./observation-evidence-persistence-design.js";
import {
  P3_2_LIMITS,
  PERSISTENCE_INDEX_INTENTS,
  PERSISTENCE_PLAN_AUTHORIZATION,
  applyObservationWritePlanInMemory,
  assertObservationWritePlanIntegrity,
  observationPersistenceKey,
  planObservationWrite,
} from "./observation-evidence-persistence-plan.js";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

type ObservationOptions = {
  observedAt?: string;
  status?: string;
  severity?: string;
  sourceKind?: string;
  sourceFingerprint?: string;
  collectorId?: string;
  observationKind?: string;
  siteId?: string;
  origin?: string;
  pathname?: string;
};

function observation(options: ObservationOptions = {}): ObservationRecord {
  const origin = options.origin ?? "https://diamondshelf.us";
  const pathname = options.pathname ?? "/products/alpha";
  const canonicalUrl = `${origin}${pathname}`;
  return createObservation({
    subject: {
      kind: "url",
      siteId: options.siteId ?? "diamond-shelf",
      canonicalOrigin: origin,
      urlId: hash(JSON.stringify({ canonicalUrl })),
      canonicalUrl,
    },
    observationKind: options.observationKind ?? "technical_issue:metadata.title_missing",
    materialValue: {
      status: options.status ?? "open",
      severity: options.severity ?? "medium",
    },
    provenance: {
      sourceKind: options.sourceKind ?? "source_a",
      sourceFingerprint: options.sourceFingerprint ?? hash("source-a"),
      collectorId: options.collectorId ?? "collector_a",
    },
    confidence: "high",
    observedAt: options.observedAt ?? "2026-09-16T06:00:00.000Z",
    freshForMs: 60 * 60 * 1_000,
  });
}

test("P3.2 derives deterministic storage-neutral persistence keys and index intent", () => {
  const candidate = observation();
  const key = observationPersistenceKey(candidate);
  assert.equal(key.observationId, candidate.observationId);
  assert.equal(key.semanticKey, candidate.semanticKey);
  assert.equal(key.valueFingerprint, candidate.valueFingerprint);
  assert.equal(key.provenanceFingerprint, candidate.provenance.provenanceFingerprint);
  assert.equal(key.recordFingerprint, candidate.recordFingerprint);
  assert.equal(key.observedAt, candidate.freshnessPolicy.observedAt);
  assert.equal(key.staleAfter, candidate.freshnessPolicy.staleAfter);
  assert.match(key.keyFingerprint, /^[a-f0-9]{64}$/);
  assert.ok(PERSISTENCE_INDEX_INTENTS.length > 0);
  assert.ok(PERSISTENCE_INDEX_INTENTS.length <= P3_2_LIMITS.indexIntents);
  assert.equal(PERSISTENCE_INDEX_INTENTS[0]?.unique, true);
  assert.deepEqual(PERSISTENCE_PLAN_AUTHORIZATION, Object.fromEntries(
    Object.keys(PERSISTENCE_PLAN_AUTHORIZATION).map((keyName) => [keyName, false]),
  ));
});

test("P3.2 plans independent insertion with deterministic idempotency and plan fingerprints", () => {
  const candidate = observation();
  const first = planObservationWrite([], candidate);
  const second = planObservationWrite([], candidate);
  assert.deepEqual(first, second);
  assert.equal(first.action, "insert_observation");
  assert.deepEqual(first.matchedCurrentObservationIds, []);
  assert.deepEqual(first.supersedeObservationIds, []);
  assert.deepEqual(first.conflictObservationIds, []);
  assert.deepEqual(first.corroborationObservationIds, []);
  assert.match(first.idempotencyKey, /^[a-f0-9]{64}$/);
  assert.match(first.planFingerprint, /^[a-f0-9]{64}$/);
  assert.doesNotThrow(() => assertObservationWritePlanIntegrity(first, []));
});

test("P3.2 exact replay becomes duplicate no-op and does not emit new relation intents", () => {
  const candidate = observation();
  const firstPlan = planObservationWrite([], candidate);
  const initial: readonly ObservationRecord[] = Object.freeze([]);
  const applied = applyObservationWritePlanInMemory(initial, firstPlan);
  assert.equal(initial.length, 0, "in-memory helper must not mutate its input");
  assert.equal(applied.length, 1);
  assert.equal(applied[0]?.observationId, candidate.observationId);

  const replay = planObservationWrite(applied, candidate);
  assert.equal(replay.action, "duplicate_noop");
  assert.deepEqual(replay.supersedeObservationIds, []);
  assert.deepEqual(replay.conflictObservationIds, []);
  assert.deepEqual(replay.corroborationObservationIds, []);
  const replayed = applyObservationWritePlanInMemory(applied, replay);
  assert.deepEqual(replayed, applied);
  assert.equal(replay.idempotencyKey, firstPlan.idempotencyKey, "candidate idempotency identity is stable across replay");
});

test("P3.2 supersedes only the latest record for the same provenance and preserves history", () => {
  const old = observation({ observedAt: "2026-09-16T05:00:00.000Z", status: "old" });
  const current = observation({ observedAt: "2026-09-16T06:00:00.000Z", status: "open" });
  const candidate = observation({ observedAt: "2026-09-16T07:00:00.000Z", status: "resolved" });
  const plan = planObservationWrite([current, old], candidate);
  assert.equal(plan.action, "supersede_and_insert");
  assert.deepEqual(plan.supersedeObservationIds, [current.observationId]);
  assert.ok(plan.matchedCurrentObservationIds.includes(current.observationId));
  assert.equal(plan.matchedCurrentObservationIds.includes(old.observationId), false, "only current provenance heads are relation targets");
  const after = applyObservationWritePlanInMemory([old, current], plan);
  assert.equal(after.length, 3, "supersession retains historical records rather than deleting them");
});

test("P3.2 fails closed for out-of-order same-provenance candidates", () => {
  const current = observation({ observedAt: "2026-09-16T07:00:00.000Z", status: "current" });
  const staleCandidate = observation({ observedAt: "2026-09-16T06:00:00.000Z", status: "stale" });
  assert.throws(() => planObservationWrite([current], staleCandidate), /observation_transition_out_of_order/);
});

test("P3.2 preserves corroboration and conflict across independent provenance without last-write-wins", () => {
  const valueA = observation({
    sourceKind: "source_a",
    sourceFingerprint: hash("source-a"),
    collectorId: "collector_a",
    status: "open",
  });
  const valueASecond = observation({
    sourceKind: "source_b",
    sourceFingerprint: hash("source-b"),
    collectorId: "collector_b",
    status: "open",
    observedAt: "2026-09-16T06:05:00.000Z",
  });
  const valueB = observation({
    sourceKind: "source_c",
    sourceFingerprint: hash("source-c"),
    collectorId: "collector_c",
    status: "resolved",
    observedAt: "2026-09-16T06:10:00.000Z",
  });
  const candidate = observation({
    sourceKind: "source_d",
    sourceFingerprint: hash("source-d"),
    collectorId: "collector_d",
    status: "open",
    observedAt: "2026-09-16T06:15:00.000Z",
  });

  const plan = planObservationWrite([valueB, valueASecond, valueA], candidate);
  assert.equal(plan.action, "preserve_conflict_insert", "any current conflicting provenance keeps the plan conflict-preserving");
  assert.deepEqual(plan.corroborationObservationIds, [valueA.observationId, valueASecond.observationId].sort());
  assert.deepEqual(plan.conflictObservationIds, [valueB.observationId]);
  assert.deepEqual(plan.supersedeObservationIds, []);
  const after = applyObservationWritePlanInMemory([valueA, valueASecond, valueB], plan);
  assert.equal(after.length, 4, "all independent provenance records are preserved");
});

test("P3.2 can supersede one provenance while preserving cross-provenance corroboration/conflict context", () => {
  const sameProvenance = observation({ status: "open", observedAt: "2026-09-16T06:00:00.000Z" });
  const corroborating = observation({
    sourceKind: "source_b",
    sourceFingerprint: hash("source-b"),
    collectorId: "collector_b",
    status: "resolved",
    observedAt: "2026-09-16T06:05:00.000Z",
  });
  const conflicting = observation({
    sourceKind: "source_c",
    sourceFingerprint: hash("source-c"),
    collectorId: "collector_c",
    status: "open",
    observedAt: "2026-09-16T06:10:00.000Z",
  });
  const candidate = observation({ status: "resolved", observedAt: "2026-09-16T07:00:00.000Z" });

  const plan = planObservationWrite([conflicting, sameProvenance, corroborating], candidate);
  assert.equal(plan.action, "supersede_and_insert");
  assert.deepEqual(plan.supersedeObservationIds, [sameProvenance.observationId]);
  assert.deepEqual(plan.corroborationObservationIds, [corroborating.observationId]);
  assert.deepEqual(plan.conflictObservationIds, [conflicting.observationId]);
});

test("P3.2 planning is independent of existing-record input ordering", () => {
  const first = observation();
  const second = observation({
    sourceKind: "source_b",
    sourceFingerprint: hash("source-b"),
    collectorId: "collector_b",
    status: "resolved",
    observedAt: "2026-09-16T06:10:00.000Z",
  });
  const candidate = observation({
    sourceKind: "source_c",
    sourceFingerprint: hash("source-c"),
    collectorId: "collector_c",
    status: "open",
    observedAt: "2026-09-16T06:20:00.000Z",
  });
  const left = planObservationWrite([first, second], candidate);
  const right = planObservationWrite([second, first, first], candidate);
  assert.equal(left.planFingerprint, right.planFingerprint);
  assert.deepEqual(left, right);
});

test("P3.2 rejects cross-site snapshots and unbounded existing-record inputs", () => {
  const candidate = observation();
  const otherSite = observation({
    siteId: "other-site",
    origin: "https://other.example",
  });
  assert.throws(() => planObservationWrite([otherSite], candidate), /persistence_plan_site_scope_mismatch/);
  assert.throws(
    () => planObservationWrite(Array.from({ length: P3_2_LIMITS.existingRecords + 1 }, () => candidate), candidate),
    /persistence_plan_existing_record_limit_exceeded/,
  );
});

test("P3.2 write-plan integrity rejects tampering and stale snapshot application", () => {
  const current = observation();
  const candidate = observation({ status: "resolved", observedAt: "2026-09-16T07:00:00.000Z" });
  const plan = planObservationWrite([current], candidate);
  assert.doesNotThrow(() => assertObservationWritePlanIntegrity(plan, [current]));

  const forged = { ...plan, action: "duplicate_noop" as const };
  assert.throws(
    () => assertObservationWritePlanIntegrity(forged, [current]),
    /persistence_plan_fingerprint_mismatch/,
  );

  const unrelated = observation({ observationKind: "technical_issue:metadata.h1_missing" });
  assert.throws(
    () => applyObservationWritePlanInMemory([current, unrelated], plan),
    /persistence_plan_fingerprint_mismatch/,
    "a plan cannot be applied against a different snapshot",
  );
});
