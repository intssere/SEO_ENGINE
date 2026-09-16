import { createHash } from "node:crypto";
import {
  P3_1_LIMITS,
  assertObservationIntegrity,
  classifyObservationTransition,
  type ObservationRecord,
  type ObservationRetentionClass,
} from "./observation-evidence-persistence-design.js";
import {
  P3_2_LIMITS,
  applyObservationWritePlanInMemory,
  assertObservationWritePlanIntegrity,
  type ObservationWritePlan,
} from "./observation-evidence-persistence-plan.js";

export const P3_3_SCHEMA_VERSION = "p3_3_v1" as const;

const DAY_MS = 24 * 60 * 60 * 1_000;

export const P3_3_LIMITS = Object.freeze({
  historyRecords: P3_1_LIMITS.historyRecords + 1,
  existingRelations: 20_000,
  relationIntentsPerPlan: P3_2_LIMITS.relationTargets * 3,
  indexIntents: 12,
} as const);

export const RETENTION_HISTORY_AUTHORIZATION = Object.freeze({
  productionPersistenceEnabled: false,
  archiveExecutionEnabled: false,
  pruneExecutionEnabled: false,
  destructiveDeleteEnabled: false,
  ddlEnabled: false,
  dmlEnabled: false,
  realDatabaseClientEnabled: false,
  migrationEnabled: false,
  networkEnabled: false,
  filesystemWritesEnabled: false,
  environmentSecretBindingEnabled: false,
  providerReadsAuthorized: false,
  providerWritesAuthorized: false,
  liveCrawlExecutionEnabled: false,
  competitorCollectionEnabled: false,
  schedulerEnabled: false,
  workerEnabled: false,
  autonomousMutationEnabled: false,
  publicSiteWritesEnabled: false,
  publicationAuthorized: false,
} as const);

export type RetentionHistoryAuthorization = typeof RETENTION_HISTORY_AUTHORIZATION;

export type RetentionPolicy = {
  retentionClass: ObservationRetentionClass;
  archiveAfterMs: number | null;
  pruneAfterMs: number | null;
};

export const RETENTION_POLICIES: Readonly<Record<ObservationRetentionClass, RetentionPolicy>> = Object.freeze({
  operational_history: Object.freeze({
    retentionClass: "operational_history" as const,
    archiveAfterMs: 30 * DAY_MS,
    pruneAfterMs: 180 * DAY_MS,
  }),
  evidence_lineage: Object.freeze({
    retentionClass: "evidence_lineage" as const,
    archiveAfterMs: null,
    pruneAfterMs: null,
  }),
  audit_history: Object.freeze({
    retentionClass: "audit_history" as const,
    archiveAfterMs: null,
    pruneAfterMs: null,
  }),
});

export type HistoryRelationType = "supersedes" | "conflicts_with" | "corroborates";

export type HistoryRelationIntent = {
  recordType: "observation_history_relation_intent";
  schemaVersion: typeof P3_3_SCHEMA_VERSION;
  relationType: HistoryRelationType;
  fromObservationId: string;
  toObservationId: string;
  semanticKey: string;
  siteId: string;
  canonicalOrigin: string;
  relationFingerprint: string;
};

export type RetentionDisposition =
  | "retain_current"
  | "retain_audit"
  | "retain_evidence_lineage"
  | "retain_conflict"
  | "retain_corroboration"
  | "retain_window"
  | "archive"
  | "prune_candidate";

export type RetentionDecision = {
  observationId: string;
  retentionClass: ObservationRetentionClass;
  disposition: RetentionDisposition;
  observedAt: string;
  ageMs: number;
  isCurrent: boolean;
  isSuperseded: boolean;
  hasUnresolvedConflict: boolean;
  hasCorroborationLineage: boolean;
  decisionFingerprint: string;
};

export type RetentionIndexField =
  | "relationFingerprint"
  | "relationType"
  | "fromObservationId"
  | "toObservationId"
  | "semanticKey"
  | "siteId"
  | "retentionClass"
  | "disposition"
  | "observedAt";

export type RetentionIndexIntent = {
  name: string;
  unique: boolean;
  fields: readonly RetentionIndexField[];
  purpose: "relation_idempotency" | "history_lookup" | "lineage_lookup" | "retention_lookup" | "read_model";
};

export const RETENTION_INDEX_INTENTS: readonly RetentionIndexIntent[] = Object.freeze([
  Object.freeze({
    name: "history_relation_fingerprint_unique",
    unique: true,
    fields: Object.freeze(["relationFingerprint"] as const),
    purpose: "relation_idempotency" as const,
  }),
  Object.freeze({
    name: "history_relation_from_lookup",
    unique: false,
    fields: Object.freeze(["fromObservationId", "relationType"] as const),
    purpose: "lineage_lookup" as const,
  }),
  Object.freeze({
    name: "history_relation_to_lookup",
    unique: false,
    fields: Object.freeze(["toObservationId", "relationType"] as const),
    purpose: "lineage_lookup" as const,
  }),
  Object.freeze({
    name: "history_semantic_relation_lookup",
    unique: false,
    fields: Object.freeze(["siteId", "semanticKey", "relationType"] as const),
    purpose: "history_lookup" as const,
  }),
  Object.freeze({
    name: "retention_class_disposition_lookup",
    unique: false,
    fields: Object.freeze(["siteId", "retentionClass", "disposition", "observedAt"] as const),
    purpose: "retention_lookup" as const,
  }),
  Object.freeze({
    name: "history_observed_lookup",
    unique: false,
    fields: Object.freeze(["siteId", "observedAt"] as const),
    purpose: "read_model" as const,
  }),
]);

export type RetentionHistoryPlan = {
  recordType: "observation_retention_history_plan";
  schemaVersion: typeof P3_3_SCHEMA_VERSION;
  referenceTime: string;
  writePlanFingerprint: string;
  existingSnapshotFingerprint: string;
  relationSnapshotFingerprint: string;
  postWriteSnapshotFingerprint: string;
  historyObservationIds: readonly string[];
  relationIntents: readonly HistoryRelationIntent[];
  newRelationIntents: readonly HistoryRelationIntent[];
  retentionDecisions: readonly RetentionDecision[];
  archiveObservationIds: readonly string[];
  pruneObservationIds: readonly string[];
  indexIntentFingerprint: string;
  historyFingerprint: string;
  planFingerprint: string;
  authorization: RetentionHistoryAuthorization;
};

function stableSerialize(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(object[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(stableSerialize(value)).digest("hex");
}

function normalizeTimestamp(value: string, code: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    throw new Error(code);
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new Error(code);
  return parsed.toISOString();
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

function snapshotFingerprint(records: readonly ObservationRecord[]): string {
  return sha256([...records]
    .sort((a, b) => a.observationId.localeCompare(b.observationId))
    .map((record) => ({ observationId: record.observationId, recordFingerprint: record.recordFingerprint })));
}

function relationBase(input: Omit<HistoryRelationIntent, "recordType" | "schemaVersion" | "relationFingerprint">) {
  return {
    recordType: "observation_history_relation_intent" as const,
    schemaVersion: P3_3_SCHEMA_VERSION,
    relationType: input.relationType,
    fromObservationId: input.fromObservationId,
    toObservationId: input.toObservationId,
    semanticKey: input.semanticKey,
    siteId: input.siteId,
    canonicalOrigin: input.canonicalOrigin,
  };
}

function buildRelationIntent(
  relationType: HistoryRelationType,
  from: ObservationRecord,
  to: ObservationRecord,
): HistoryRelationIntent {
  if (from.observationId === to.observationId) throw new Error("retention_relation_self_reference_denied");
  if (
    from.subject.siteId !== to.subject.siteId
    || from.subject.canonicalOrigin !== to.subject.canonicalOrigin
    || from.semanticKey !== to.semanticKey
  ) {
    throw new Error("retention_relation_scope_mismatch");
  }

  const transition = classifyObservationTransition(to, from);
  if (relationType === "supersedes" && transition.action !== "supersede_existing") {
    throw new Error("retention_supersession_relation_invalid");
  }
  if (relationType === "conflicts_with" && transition.action !== "conflict") {
    throw new Error("retention_conflict_relation_invalid");
  }
  if (relationType === "corroborates" && transition.action !== "corroborate") {
    throw new Error("retention_corroboration_relation_invalid");
  }

  const base = relationBase({
    relationType,
    fromObservationId: from.observationId,
    toObservationId: to.observationId,
    semanticKey: from.semanticKey,
    siteId: from.subject.siteId,
    canonicalOrigin: from.subject.canonicalOrigin,
  });
  return Object.freeze({ ...base, relationFingerprint: sha256(base) });
}

function relationFingerprintSnapshot(relations: readonly HistoryRelationIntent[]): string {
  return sha256(relations.map((relation) => relation.relationFingerprint));
}

function normalizeRelations(
  relations: readonly HistoryRelationIntent[],
  recordsById: ReadonlyMap<string, ObservationRecord>,
): readonly HistoryRelationIntent[] {
  if (!Array.isArray(relations) || relations.length > P3_3_LIMITS.existingRelations) {
    throw new Error("retention_existing_relation_limit_exceeded");
  }
  const byFingerprint = new Map<string, HistoryRelationIntent>();
  for (const relation of relations) {
    if (
      !relation
      || relation.recordType !== "observation_history_relation_intent"
      || relation.schemaVersion !== P3_3_SCHEMA_VERSION
    ) {
      throw new Error("retention_relation_invalid");
    }
    const from = recordsById.get(relation.fromObservationId);
    const to = recordsById.get(relation.toObservationId);
    if (!from || !to) throw new Error("retention_relation_observation_missing");
    const rebuilt = buildRelationIntent(relation.relationType, from, to);
    if (stableSerialize(rebuilt) !== stableSerialize(relation)) {
      throw new Error("retention_relation_fingerprint_mismatch");
    }
    const previous = byFingerprint.get(relation.relationFingerprint);
    if (previous && stableSerialize(previous) !== stableSerialize(relation)) {
      throw new Error("retention_relation_fingerprint_collision");
    }
    byFingerprint.set(relation.relationFingerprint, relation);
  }
  return Object.freeze([...byFingerprint.values()].sort((a, b) => a.relationFingerprint.localeCompare(b.relationFingerprint)));
}

function relationsFromWritePlan(
  writePlan: ObservationWritePlan,
  recordsById: ReadonlyMap<string, ObservationRecord>,
): readonly HistoryRelationIntent[] {
  const candidate = recordsById.get(writePlan.candidate.observationId);
  if (!candidate) throw new Error("retention_candidate_missing_after_write_plan");
  const relations: HistoryRelationIntent[] = [];

  const append = (type: HistoryRelationType, ids: readonly string[]) => {
    for (const id of ids) {
      const target = recordsById.get(id);
      if (!target) throw new Error("retention_write_plan_relation_target_missing");
      relations.push(buildRelationIntent(type, candidate, target));
    }
  };

  append("supersedes", writePlan.supersedeObservationIds);
  append("conflicts_with", writePlan.conflictObservationIds);
  append("corroborates", writePlan.corroborationObservationIds);

  if (relations.length > P3_3_LIMITS.relationIntentsPerPlan) {
    throw new Error("retention_relation_intent_limit_exceeded");
  }
  return Object.freeze(relations.sort((a, b) => a.relationFingerprint.localeCompare(b.relationFingerprint)));
}

function retentionDecision(
  record: ObservationRecord,
  referenceMillis: number,
  supersededIds: ReadonlySet<string>,
  conflictIds: ReadonlySet<string>,
  corroborationIds: ReadonlySet<string>,
): RetentionDecision {
  const observedMillis = new Date(record.freshnessPolicy.observedAt).getTime();
  if (!Number.isFinite(observedMillis)) throw new Error("retention_observed_at_invalid");
  const ageMs = referenceMillis - observedMillis;
  if (ageMs < 0) throw new Error("retention_reference_time_precedes_observation");

  const isSuperseded = supersededIds.has(record.observationId);
  const isCurrent = !isSuperseded;
  const hasUnresolvedConflict = conflictIds.has(record.observationId);
  const hasCorroborationLineage = corroborationIds.has(record.observationId);
  const policy = RETENTION_POLICIES[record.retentionClass];

  let disposition: RetentionDisposition;
  if (record.retentionClass === "audit_history") disposition = "retain_audit";
  else if (record.retentionClass === "evidence_lineage") disposition = "retain_evidence_lineage";
  else if (hasUnresolvedConflict) disposition = "retain_conflict";
  else if (hasCorroborationLineage) disposition = "retain_corroboration";
  else if (isCurrent) disposition = "retain_current";
  else if (policy.pruneAfterMs !== null && ageMs >= policy.pruneAfterMs) disposition = "prune_candidate";
  else if (policy.archiveAfterMs !== null && ageMs >= policy.archiveAfterMs) disposition = "archive";
  else disposition = "retain_window";

  const base = {
    observationId: record.observationId,
    retentionClass: record.retentionClass,
    disposition,
    observedAt: record.freshnessPolicy.observedAt,
    ageMs,
    isCurrent,
    isSuperseded,
    hasUnresolvedConflict,
    hasCorroborationLineage,
  };
  return Object.freeze({ ...base, decisionFingerprint: sha256(base) });
}

export function planRetentionHistory(input: {
  existingRecords: readonly ObservationRecord[];
  writePlan: ObservationWritePlan;
  existingRelations?: readonly HistoryRelationIntent[];
  referenceTime: string;
}): RetentionHistoryPlan {
  if (!Array.isArray(input.existingRecords) || input.existingRecords.length > P3_1_LIMITS.historyRecords) {
    throw new Error("retention_existing_record_limit_exceeded");
  }
  for (const record of input.existingRecords) assertObservationIntegrity(record);
  assertObservationWritePlanIntegrity(input.writePlan, input.existingRecords);

  const referenceTime = normalizeTimestamp(input.referenceTime, "retention_reference_time_invalid");
  const referenceMillis = new Date(referenceTime).getTime();
  const existingSnapshotFingerprint = snapshotFingerprint(input.existingRecords);
  const postWriteRecords = applyObservationWritePlanInMemory(input.existingRecords, input.writePlan);
  if (postWriteRecords.length > P3_3_LIMITS.historyRecords) throw new Error("retention_history_record_limit_exceeded");
  for (const record of postWriteRecords) assertObservationIntegrity(record);

  const recordsById = new Map(postWriteRecords.map((record) => [record.observationId, record] as const));
  const existingRelations = normalizeRelations(input.existingRelations ?? [], recordsById);
  const relationSnapshotFingerprint = relationFingerprintSnapshot(existingRelations);
  const candidateRelations = relationsFromWritePlan(input.writePlan, recordsById);

  const relationByFingerprint = new Map(existingRelations.map((relation) => [relation.relationFingerprint, relation] as const));
  const newRelationIntents: HistoryRelationIntent[] = [];
  for (const relation of candidateRelations) {
    if (!relationByFingerprint.has(relation.relationFingerprint)) {
      relationByFingerprint.set(relation.relationFingerprint, relation);
      newRelationIntents.push(relation);
    }
  }
  const relationIntents = Object.freeze([...relationByFingerprint.values()].sort((a, b) => a.relationFingerprint.localeCompare(b.relationFingerprint)));
  if (relationIntents.length > P3_3_LIMITS.existingRelations + P3_3_LIMITS.relationIntentsPerPlan) {
    throw new Error("retention_total_relation_limit_exceeded");
  }

  const supersededIds = new Set<string>();
  const conflictIds = new Set<string>();
  const corroborationIds = new Set<string>();
  for (const relation of relationIntents) {
    if (relation.relationType === "supersedes") supersededIds.add(relation.toObservationId);
    else if (relation.relationType === "conflicts_with") {
      conflictIds.add(relation.fromObservationId);
      conflictIds.add(relation.toObservationId);
    } else {
      corroborationIds.add(relation.fromObservationId);
      corroborationIds.add(relation.toObservationId);
    }
  }

  const retentionDecisions = Object.freeze([...postWriteRecords]
    .sort((a, b) => a.observationId.localeCompare(b.observationId))
    .map((record) => retentionDecision(record, referenceMillis, supersededIds, conflictIds, corroborationIds)));
  const archiveObservationIds = uniqueSorted(retentionDecisions
    .filter((decision) => decision.disposition === "archive")
    .map((decision) => decision.observationId));
  const pruneObservationIds = uniqueSorted(retentionDecisions
    .filter((decision) => decision.disposition === "prune_candidate")
    .map((decision) => decision.observationId));

  const historyObservationIds = uniqueSorted(postWriteRecords.map((record) => record.observationId));
  const postWriteSnapshotFingerprint = snapshotFingerprint(postWriteRecords);
  const indexIntentFingerprint = sha256(RETENTION_INDEX_INTENTS);
  const historyFingerprint = sha256({
    postWriteSnapshotFingerprint,
    relationFingerprints: relationIntents.map((relation) => relation.relationFingerprint),
    decisionFingerprints: retentionDecisions.map((decision) => decision.decisionFingerprint),
  });
  const base = {
    recordType: "observation_retention_history_plan" as const,
    schemaVersion: P3_3_SCHEMA_VERSION,
    referenceTime,
    writePlanFingerprint: input.writePlan.planFingerprint,
    existingSnapshotFingerprint,
    relationSnapshotFingerprint,
    postWriteSnapshotFingerprint,
    historyObservationIds,
    relationIntents,
    newRelationIntents: Object.freeze([...newRelationIntents].sort((a, b) => a.relationFingerprint.localeCompare(b.relationFingerprint))),
    retentionDecisions,
    archiveObservationIds,
    pruneObservationIds,
    indexIntentFingerprint,
    historyFingerprint,
    authorization: RETENTION_HISTORY_AUTHORIZATION,
  };
  return Object.freeze({ ...base, planFingerprint: sha256(base) });
}

export function assertRetentionHistoryPlanIntegrity(
  plan: RetentionHistoryPlan,
  input: {
    existingRecords: readonly ObservationRecord[];
    writePlan: ObservationWritePlan;
    existingRelations?: readonly HistoryRelationIntent[];
    referenceTime: string;
  },
): void {
  if (!plan || plan.recordType !== "observation_retention_history_plan" || plan.schemaVersion !== P3_3_SCHEMA_VERSION) {
    throw new Error("retention_history_plan_invalid");
  }
  const rebuilt = planRetentionHistory(input);
  if (rebuilt.planFingerprint !== plan.planFingerprint || stableSerialize(rebuilt) !== stableSerialize(plan)) {
    throw new Error("retention_history_plan_fingerprint_mismatch");
  }
}
