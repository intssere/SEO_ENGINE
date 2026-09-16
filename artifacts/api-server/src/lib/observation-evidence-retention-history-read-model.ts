import { createHash } from "node:crypto";
import {
  P3_1_LIMITS,
  assertObservationIntegrity,
  type ObservationRecord,
  type ObservationRetentionClass,
} from "./observation-evidence-persistence-design.js";
import {
  applyObservationWritePlanInMemory,
  type ObservationWritePlan,
} from "./observation-evidence-persistence-plan.js";
import {
  P3_3_LIMITS,
  assertRetentionHistoryPlanIntegrity,
  type HistoryRelationIntent,
  type HistoryRelationType,
  type RetentionDecision,
  type RetentionDisposition,
  type RetentionHistoryPlan,
} from "./observation-evidence-retention-history-model.js";

export const P3_4_SCHEMA_VERSION = "p3_4_v1" as const;

export const P3_4_LIMITS = Object.freeze({
  historyRecords: P3_3_LIMITS.historyRecords,
  relations: P3_3_LIMITS.existingRelations + P3_3_LIMITS.relationIntentsPerPlan,
  filterValues: 64,
  pageLimit: 200,
  cursorOffset: P3_1_LIMITS.queryOffset,
  indexIntents: 12,
} as const);

export const RETENTION_HISTORY_READ_AUTHORIZATION = Object.freeze({
  productionReadModelRuntimeEnabled: false,
  productionDatabaseReadsEnabled: false,
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

export type RetentionHistoryReadAuthorization = typeof RETENTION_HISTORY_READ_AUTHORIZATION;
export type HistoryReadLifecycle = "current" | "superseded" | "conflicting";
export type EvidenceAvailability = "available" | "partial" | "unavailable";
export type HistoryReadSortField =
  | "observedAt"
  | "observationId"
  | "semanticKey"
  | "observationKind"
  | "sourceKind"
  | "retentionClass"
  | "disposition";

export type RetentionHistoryReadContext = {
  existingRecords: readonly ObservationRecord[];
  writePlan: ObservationWritePlan;
  existingRelations?: readonly HistoryRelationIntent[];
  referenceTime: string;
  retentionPlan: RetentionHistoryPlan;
};

export type RetentionHistoryReadQuery = {
  siteId: string;
  canonicalOrigin: string;
  semanticKeys?: readonly string[];
  observationKinds?: readonly string[];
  sourceKinds?: readonly string[];
  retentionClasses?: readonly ObservationRetentionClass[];
  dispositions?: readonly RetentionDisposition[];
  lifecycles?: readonly HistoryReadLifecycle[];
  relationKinds?: readonly HistoryRelationType[];
  sort?: { field: HistoryReadSortField; direction: "asc" | "desc" };
  page?: { limit?: number; cursor?: string | null };
};

export type HistoryReadRow = {
  observationId: string;
  semanticKey: string;
  siteId: string;
  canonicalOrigin: string;
  urlId: string | null;
  canonicalUrl: string | null;
  observationKind: string;
  materialValue: ObservationRecord["materialValue"];
  valueFingerprint: string;
  provenance: ObservationRecord["provenance"];
  confidence: ObservationRecord["confidence"];
  observedAt: string;
  staleAfter: string;
  retentionClass: ObservationRetentionClass;
  disposition: RetentionDisposition;
  lifecycle: HistoryReadLifecycle;
  isCurrent: boolean;
  isSuperseded: boolean;
  hasUnresolvedConflict: boolean;
  hasCorroborationLineage: boolean;
  supersededByObservationIds: readonly string[];
  supersedesObservationIds: readonly string[];
  conflictObservationIds: readonly string[];
  corroboratingObservationIds: readonly string[];
  evidenceAvailability: EvidenceAvailability;
  unavailableEvidenceDimensions: readonly string[];
  rowFingerprint: string;
};

export type SupersessionChainProjection = {
  headObservationId: string;
  observationIds: readonly string[];
  relationFingerprints: readonly string[];
  chainFingerprint: string;
};

export type RelationReadProjection = {
  relationType: "conflicts_with" | "corroborates";
  observationIds: readonly [string, string];
  relationFingerprint: string;
};

export type RetentionHistoryReadPage = {
  offset: number;
  limit: number;
  returned: number;
  totalMatched: number;
  hasMore: boolean;
  nextCursor: string | null;
};

export type RetentionHistoryReadModel = {
  recordType: "observation_retention_history_read_model";
  schemaVersion: typeof P3_4_SCHEMA_VERSION;
  siteId: string;
  canonicalOrigin: string;
  retentionPlanFingerprint: string;
  historyFingerprint: string;
  readSnapshotFingerprint: string;
  queryFingerprint: string;
  rows: readonly HistoryReadRow[];
  currentHeadObservationIds: readonly string[];
  supersessionChains: readonly SupersessionChainProjection[];
  unresolvedConflicts: readonly RelationReadProjection[];
  corroborations: readonly RelationReadProjection[];
  page: RetentionHistoryReadPage;
  indexIntentFingerprint: string;
  resultFingerprint: string;
  authorization: RetentionHistoryReadAuthorization;
};

export type RetentionHistoryReadIndexField =
  | "siteId"
  | "canonicalOrigin"
  | "semanticKey"
  | "observationKind"
  | "sourceKind"
  | "provenanceFingerprint"
  | "observedAt"
  | "observationId"
  | "retentionClass"
  | "disposition"
  | "relationType"
  | "fromObservationId"
  | "toObservationId";

export type RetentionHistoryReadIndexIntent = {
  name: string;
  unique: boolean;
  fields: readonly RetentionHistoryReadIndexField[];
  purpose: "timeline" | "current_head" | "provenance" | "retention" | "relation";
};

export const RETENTION_HISTORY_READ_INDEX_INTENTS: readonly RetentionHistoryReadIndexIntent[] = Object.freeze([
  Object.freeze({
    name: "history_read_site_semantic_observed",
    unique: false,
    fields: Object.freeze(["siteId", "canonicalOrigin", "semanticKey", "observedAt", "observationId"] as const),
    purpose: "timeline" as const,
  }),
  Object.freeze({
    name: "history_read_semantic_provenance_observed",
    unique: false,
    fields: Object.freeze(["siteId", "semanticKey", "provenanceFingerprint", "observedAt", "observationId"] as const),
    purpose: "current_head" as const,
  }),
  Object.freeze({
    name: "history_read_kind_source_observed",
    unique: false,
    fields: Object.freeze(["siteId", "observationKind", "sourceKind", "observedAt", "observationId"] as const),
    purpose: "provenance" as const,
  }),
  Object.freeze({
    name: "history_read_retention_disposition",
    unique: false,
    fields: Object.freeze(["siteId", "retentionClass", "disposition", "observedAt", "observationId"] as const),
    purpose: "retention" as const,
  }),
  Object.freeze({
    name: "history_read_relation_from",
    unique: false,
    fields: Object.freeze(["siteId", "relationType", "fromObservationId"] as const),
    purpose: "relation" as const,
  }),
  Object.freeze({
    name: "history_read_relation_to",
    unique: false,
    fields: Object.freeze(["siteId", "relationType", "toObservationId"] as const),
    purpose: "relation" as const,
  }),
]);

const RETENTION_CLASS_VALUES = new Set<ObservationRetentionClass>(["operational_history", "evidence_lineage", "audit_history"]);
const DISPOSITION_VALUES = new Set<RetentionDisposition>([
  "retain_current",
  "retain_audit",
  "retain_evidence_lineage",
  "retain_conflict",
  "retain_corroboration",
  "retain_window",
  "archive",
  "prune_candidate",
]);
const LIFECYCLE_VALUES = new Set<HistoryReadLifecycle>(["current", "superseded", "conflicting"]);
const RELATION_KIND_VALUES = new Set<HistoryRelationType>(["supersedes", "conflicts_with", "corroborates"]);
const SORT_FIELD_VALUES = new Set<HistoryReadSortField>([
  "observedAt",
  "observationId",
  "semanticKey",
  "observationKind",
  "sourceKind",
  "retentionClass",
  "disposition",
]);

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

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

function normalizeStringFilter(values: readonly string[] | undefined, code: string): readonly string[] | undefined {
  if (values === undefined) return undefined;
  if (!Array.isArray(values) || values.length > P3_4_LIMITS.filterValues) throw new Error(`${code}_limit_exceeded`);
  const normalized = values.map((value) => {
    if (typeof value !== "string" || !value.trim() || /[\u0000-\u001f\u007f]/.test(value)) throw new Error(`${code}_invalid`);
    return value.trim();
  });
  return uniqueSorted(normalized);
}

function normalizeEnumFilter<T extends string>(
  values: readonly T[] | undefined,
  allowed: ReadonlySet<T>,
  code: string,
): readonly T[] | undefined {
  if (values === undefined) return undefined;
  if (!Array.isArray(values) || values.length > P3_4_LIMITS.filterValues) throw new Error(`${code}_limit_exceeded`);
  const normalized = [...new Set(values)];
  if (normalized.some((value) => !allowed.has(value))) throw new Error(`${code}_invalid`);
  return Object.freeze(normalized.sort());
}

function validatedContext(context: RetentionHistoryReadContext): {
  records: readonly ObservationRecord[];
  decisionsById: ReadonlyMap<string, RetentionDecision>;
  relations: readonly HistoryRelationIntent[];
  readSnapshotFingerprint: string;
} {
  assertRetentionHistoryPlanIntegrity(context.retentionPlan, {
    existingRecords: context.existingRecords,
    writePlan: context.writePlan,
    existingRelations: context.existingRelations,
    referenceTime: context.referenceTime,
  });
  const records = applyObservationWritePlanInMemory(context.existingRecords, context.writePlan);
  if (records.length > P3_4_LIMITS.historyRecords) throw new Error("history_read_record_limit_exceeded");
  for (const record of records) assertObservationIntegrity(record);
  const recordIds = records.map((record) => record.observationId).sort();
  if (stableSerialize(recordIds) !== stableSerialize(context.retentionPlan.historyObservationIds)) {
    throw new Error("history_read_snapshot_observation_mismatch");
  }
  const decisionsById = new Map<string, RetentionDecision>();
  for (const decision of context.retentionPlan.retentionDecisions) {
    if (decisionsById.has(decision.observationId)) throw new Error("history_read_duplicate_retention_decision");
    if (!recordIds.includes(decision.observationId)) throw new Error("history_read_retention_decision_observation_missing");
    decisionsById.set(decision.observationId, decision);
  }
  if (decisionsById.size !== records.length) throw new Error("history_read_retention_decision_incomplete");
  const relations = context.retentionPlan.relationIntents;
  if (relations.length > P3_4_LIMITS.relations) throw new Error("history_read_relation_limit_exceeded");
  const readSnapshotFingerprint = sha256({
    planFingerprint: context.retentionPlan.planFingerprint,
    historyFingerprint: context.retentionPlan.historyFingerprint,
    records: records.map((record) => ({ observationId: record.observationId, recordFingerprint: record.recordFingerprint })),
    decisions: context.retentionPlan.retentionDecisions.map((decision) => decision.decisionFingerprint),
    relations: relations.map((relation) => relation.relationFingerprint),
  });
  return { records, decisionsById, relations, readSnapshotFingerprint };
}

function evidenceAvailability(record: ObservationRecord): {
  availability: EvidenceAvailability;
  unavailableDimensions: readonly string[];
} {
  if (record.evidenceReferences.length === 0) {
    return { availability: "unavailable", unavailableDimensions: Object.freeze([]) };
  }
  const available = record.evidenceReferences.filter((reference) => reference.availability === "available").length;
  const unavailableDimensions = uniqueSorted(record.evidenceReferences
    .filter((reference) => reference.availability === "unavailable")
    .map((reference) => reference.dimension));
  if (available === 0) return { availability: "unavailable", unavailableDimensions };
  if (available === record.evidenceReferences.length) return { availability: "available", unavailableDimensions };
  return { availability: "partial", unavailableDimensions };
}

function relatedObservationIds(
  observationId: string,
  relationType: HistoryRelationType,
  relations: readonly HistoryRelationIntent[],
): readonly string[] {
  const related: string[] = [];
  for (const relation of relations) {
    if (relation.relationType !== relationType) continue;
    if (relation.fromObservationId === observationId) related.push(relation.toObservationId);
    else if (relation.toObservationId === observationId) related.push(relation.fromObservationId);
  }
  return uniqueSorted(related);
}

function rowFor(
  record: ObservationRecord,
  decision: RetentionDecision,
  relations: readonly HistoryRelationIntent[],
): HistoryReadRow {
  const supersededByObservationIds = uniqueSorted(relations
    .filter((relation) => relation.relationType === "supersedes" && relation.toObservationId === record.observationId)
    .map((relation) => relation.fromObservationId));
  const supersedesObservationIds = uniqueSorted(relations
    .filter((relation) => relation.relationType === "supersedes" && relation.fromObservationId === record.observationId)
    .map((relation) => relation.toObservationId));
  const conflictObservationIds = relatedObservationIds(record.observationId, "conflicts_with", relations);
  const corroboratingObservationIds = relatedObservationIds(record.observationId, "corroborates", relations);
  const evidence = evidenceAvailability(record);
  const lifecycle: HistoryReadLifecycle = decision.hasUnresolvedConflict
    ? "conflicting"
    : decision.isSuperseded
      ? "superseded"
      : "current";
  const base = {
    observationId: record.observationId,
    semanticKey: record.semanticKey,
    siteId: record.subject.siteId,
    canonicalOrigin: record.subject.canonicalOrigin,
    urlId: record.subject.urlId,
    canonicalUrl: record.subject.canonicalUrl,
    observationKind: record.observationKind,
    materialValue: record.materialValue,
    valueFingerprint: record.valueFingerprint,
    provenance: record.provenance,
    confidence: record.confidence,
    observedAt: record.freshnessPolicy.observedAt,
    staleAfter: record.freshnessPolicy.staleAfter,
    retentionClass: record.retentionClass,
    disposition: decision.disposition,
    lifecycle,
    isCurrent: decision.isCurrent,
    isSuperseded: decision.isSuperseded,
    hasUnresolvedConflict: decision.hasUnresolvedConflict,
    hasCorroborationLineage: decision.hasCorroborationLineage,
    supersededByObservationIds,
    supersedesObservationIds,
    conflictObservationIds,
    corroboratingObservationIds,
    evidenceAvailability: evidence.availability,
    unavailableEvidenceDimensions: evidence.unavailableDimensions,
  };
  return Object.freeze({ ...base, rowFingerprint: sha256(base) });
}

function buildSupersessionChains(
  rows: readonly HistoryReadRow[],
  relations: readonly HistoryRelationIntent[],
): readonly SupersessionChainProjection[] {
  const rowById = new Map(rows.map((row) => [row.observationId, row] as const));
  const outgoing = new Map<string, HistoryRelationIntent[]>();
  for (const relation of relations) {
    if (relation.relationType !== "supersedes") continue;
    const current = outgoing.get(relation.fromObservationId) ?? [];
    current.push(relation);
    outgoing.set(relation.fromObservationId, current);
  }
  for (const [observationId, values] of outgoing) {
    if (values.length > 1) throw new Error(`history_read_supersession_branch_ambiguous:${observationId}`);
  }
  const chains: SupersessionChainProjection[] = [];
  const heads = rows.filter((row) => row.isCurrent).sort((a, b) => a.observationId.localeCompare(b.observationId));
  for (const head of heads) {
    const observationIds = [head.observationId];
    const relationFingerprints: string[] = [];
    const seen = new Set(observationIds);
    let currentId = head.observationId;
    while (true) {
      const relation = outgoing.get(currentId)?.[0];
      if (!relation) break;
      if (!rowById.has(relation.toObservationId)) throw new Error("history_read_supersession_target_missing");
      if (seen.has(relation.toObservationId)) throw new Error("history_read_supersession_cycle");
      seen.add(relation.toObservationId);
      observationIds.push(relation.toObservationId);
      relationFingerprints.push(relation.relationFingerprint);
      currentId = relation.toObservationId;
      if (observationIds.length > P3_4_LIMITS.historyRecords) throw new Error("history_read_supersession_chain_limit_exceeded");
    }
    if (observationIds.length > 1) {
      const base = {
        headObservationId: head.observationId,
        observationIds: Object.freeze(observationIds),
        relationFingerprints: Object.freeze(relationFingerprints),
      };
      chains.push(Object.freeze({ ...base, chainFingerprint: sha256(base) }));
    }
  }
  return Object.freeze(chains.sort((a, b) => a.headObservationId.localeCompare(b.headObservationId)));
}

function relationProjection(
  relation: HistoryRelationIntent,
): RelationReadProjection {
  if (relation.relationType !== "conflicts_with" && relation.relationType !== "corroborates") {
    throw new Error("history_read_relation_projection_type_invalid");
  }
  const ids = [relation.fromObservationId, relation.toObservationId].sort() as [string, string];
  return Object.freeze({
    relationType: relation.relationType,
    observationIds: Object.freeze(ids) as readonly [string, string],
    relationFingerprint: relation.relationFingerprint,
  });
}

function relationKindsForObservation(
  observationId: string,
  relations: readonly HistoryRelationIntent[],
): ReadonlySet<HistoryRelationType> {
  return new Set(relations
    .filter((relation) => relation.fromObservationId === observationId || relation.toObservationId === observationId)
    .map((relation) => relation.relationType));
}

function normalizeQuery(query: RetentionHistoryReadQuery) {
  if (!query || typeof query !== "object") throw new Error("history_read_query_invalid");
  if (typeof query.siteId !== "string" || !query.siteId.trim()) throw new Error("history_read_site_id_invalid");
  if (typeof query.canonicalOrigin !== "string" || !query.canonicalOrigin.trim()) throw new Error("history_read_origin_invalid");
  const semanticKeys = normalizeStringFilter(query.semanticKeys, "history_read_semantic_filter");
  const observationKinds = normalizeStringFilter(query.observationKinds, "history_read_kind_filter");
  const sourceKinds = normalizeStringFilter(query.sourceKinds, "history_read_source_filter");
  const retentionClasses = normalizeEnumFilter(query.retentionClasses, RETENTION_CLASS_VALUES, "history_read_retention_filter");
  const dispositions = normalizeEnumFilter(query.dispositions, DISPOSITION_VALUES, "history_read_disposition_filter");
  const lifecycles = normalizeEnumFilter(query.lifecycles, LIFECYCLE_VALUES, "history_read_lifecycle_filter");
  const relationKinds = normalizeEnumFilter(query.relationKinds, RELATION_KIND_VALUES, "history_read_relation_filter");
  const sort = query.sort ?? { field: "observedAt" as const, direction: "desc" as const };
  if (!SORT_FIELD_VALUES.has(sort.field) || (sort.direction !== "asc" && sort.direction !== "desc")) {
    throw new Error("history_read_sort_invalid");
  }
  const limit = query.page?.limit ?? 100;
  if (!Number.isInteger(limit) || limit < 1 || limit > P3_4_LIMITS.pageLimit) throw new Error("history_read_page_limit_invalid");
  const cursor = query.page?.cursor ?? null;
  if (cursor !== null && typeof cursor !== "string") throw new Error("history_read_cursor_invalid");
  return {
    siteId: query.siteId.trim(),
    canonicalOrigin: query.canonicalOrigin.trim(),
    semanticKeys,
    observationKinds,
    sourceKinds,
    retentionClasses,
    dispositions,
    lifecycles,
    relationKinds,
    sort,
    limit,
    cursor,
  };
}

function sortValue(row: HistoryReadRow, field: HistoryReadSortField): string {
  if (field === "observedAt") return row.observedAt;
  if (field === "observationId") return row.observationId;
  if (field === "semanticKey") return row.semanticKey;
  if (field === "observationKind") return row.observationKind;
  if (field === "sourceKind") return row.provenance.sourceKind;
  if (field === "retentionClass") return row.retentionClass;
  return row.disposition;
}

function cursorFor(offset: number, readSnapshotFingerprint: string, queryFingerprint: string): string {
  const fingerprint = sha256({ schemaVersion: P3_4_SCHEMA_VERSION, offset, readSnapshotFingerprint, queryFingerprint });
  return `${P3_4_SCHEMA_VERSION}:${offset}:${fingerprint}`;
}

function cursorOffset(cursor: string | null, readSnapshotFingerprint: string, queryFingerprint: string): number {
  if (cursor === null) return 0;
  const match = /^p3_4_v1:(\d+):([a-f0-9]{64})$/.exec(cursor);
  if (!match) throw new Error("history_read_cursor_invalid");
  const offset = Number(match[1]);
  if (!Number.isInteger(offset) || offset < 0 || offset > P3_4_LIMITS.cursorOffset) throw new Error("history_read_cursor_offset_invalid");
  if (cursorFor(offset, readSnapshotFingerprint, queryFingerprint) !== cursor) throw new Error("history_read_cursor_fingerprint_mismatch");
  return offset;
}

export function buildRetentionHistoryReadModel(
  context: RetentionHistoryReadContext,
  query: RetentionHistoryReadQuery,
): RetentionHistoryReadModel {
  const validated = validatedContext(context);
  const normalized = normalizeQuery(query);
  const first = validated.records[0];
  if (!first) throw new Error("history_read_empty_snapshot_denied");
  if (first.subject.siteId !== normalized.siteId || first.subject.canonicalOrigin !== normalized.canonicalOrigin) {
    throw new Error("history_read_scope_mismatch");
  }
  if (validated.records.some((record) => record.subject.siteId !== normalized.siteId || record.subject.canonicalOrigin !== normalized.canonicalOrigin)) {
    throw new Error("history_read_snapshot_scope_mismatch");
  }

  const allRows = Object.freeze(validated.records.map((record) => {
    const decision = validated.decisionsById.get(record.observationId);
    if (!decision) throw new Error("history_read_retention_decision_missing");
    return rowFor(record, decision, validated.relations);
  }));

  const matches = allRows.filter((row) => {
    if (normalized.semanticKeys && !normalized.semanticKeys.includes(row.semanticKey)) return false;
    if (normalized.observationKinds && !normalized.observationKinds.includes(row.observationKind)) return false;
    if (normalized.sourceKinds && !normalized.sourceKinds.includes(row.provenance.sourceKind)) return false;
    if (normalized.retentionClasses && !normalized.retentionClasses.includes(row.retentionClass)) return false;
    if (normalized.dispositions && !normalized.dispositions.includes(row.disposition)) return false;
    if (normalized.lifecycles && !normalized.lifecycles.includes(row.lifecycle)) return false;
    if (normalized.relationKinds) {
      const relationKinds = relationKindsForObservation(row.observationId, validated.relations);
      if (!normalized.relationKinds.some((kind) => relationKinds.has(kind))) return false;
    }
    return true;
  });

  const sorted = [...matches].sort((a, b) => {
    const primary = sortValue(a, normalized.sort.field).localeCompare(sortValue(b, normalized.sort.field));
    const directed = normalized.sort.direction === "asc" ? primary : -primary;
    return directed || a.observationId.localeCompare(b.observationId);
  });
  const queryBase = {
    siteId: normalized.siteId,
    canonicalOrigin: normalized.canonicalOrigin,
    semanticKeys: normalized.semanticKeys ?? null,
    observationKinds: normalized.observationKinds ?? null,
    sourceKinds: normalized.sourceKinds ?? null,
    retentionClasses: normalized.retentionClasses ?? null,
    dispositions: normalized.dispositions ?? null,
    lifecycles: normalized.lifecycles ?? null,
    relationKinds: normalized.relationKinds ?? null,
    sort: normalized.sort,
    limit: normalized.limit,
  };
  const queryFingerprint = sha256(queryBase);
  const offset = cursorOffset(normalized.cursor, validated.readSnapshotFingerprint, queryFingerprint);
  if (offset > sorted.length) throw new Error("history_read_cursor_beyond_result");
  const pageRows = Object.freeze(sorted.slice(offset, offset + normalized.limit));
  const nextOffset = offset + pageRows.length;
  const hasMore = nextOffset < sorted.length;
  const nextCursor = hasMore ? cursorFor(nextOffset, validated.readSnapshotFingerprint, queryFingerprint) : null;
  const matchedIds = new Set(sorted.map((row) => row.observationId));
  const currentHeadObservationIds = uniqueSorted(sorted.filter((row) => row.isCurrent).map((row) => row.observationId));
  const supersessionChains = buildSupersessionChains(allRows, validated.relations)
    .filter((chain) => chain.observationIds.some((id) => matchedIds.has(id)));
  const unresolvedConflicts = Object.freeze(validated.relations
    .filter((relation) => relation.relationType === "conflicts_with")
    .filter((relation) => matchedIds.has(relation.fromObservationId) || matchedIds.has(relation.toObservationId))
    .map(relationProjection)
    .sort((a, b) => a.relationFingerprint.localeCompare(b.relationFingerprint)));
  const corroborations = Object.freeze(validated.relations
    .filter((relation) => relation.relationType === "corroborates")
    .filter((relation) => matchedIds.has(relation.fromObservationId) || matchedIds.has(relation.toObservationId))
    .map(relationProjection)
    .sort((a, b) => a.relationFingerprint.localeCompare(b.relationFingerprint)));
  const page = Object.freeze({
    offset,
    limit: normalized.limit,
    returned: pageRows.length,
    totalMatched: sorted.length,
    hasMore,
    nextCursor,
  });
  const indexIntentFingerprint = sha256(RETENTION_HISTORY_READ_INDEX_INTENTS);
  const base = {
    recordType: "observation_retention_history_read_model" as const,
    schemaVersion: P3_4_SCHEMA_VERSION,
    siteId: normalized.siteId,
    canonicalOrigin: normalized.canonicalOrigin,
    retentionPlanFingerprint: context.retentionPlan.planFingerprint,
    historyFingerprint: context.retentionPlan.historyFingerprint,
    readSnapshotFingerprint: validated.readSnapshotFingerprint,
    queryFingerprint,
    rows: pageRows,
    currentHeadObservationIds,
    supersessionChains: Object.freeze(supersessionChains),
    unresolvedConflicts,
    corroborations,
    page,
    indexIntentFingerprint,
    authorization: RETENTION_HISTORY_READ_AUTHORIZATION,
  };
  return Object.freeze({ ...base, resultFingerprint: sha256(base) });
}

export function assertRetentionHistoryReadModelIntegrity(
  model: RetentionHistoryReadModel,
  context: RetentionHistoryReadContext,
  query: RetentionHistoryReadQuery,
): void {
  if (!model || model.recordType !== "observation_retention_history_read_model" || model.schemaVersion !== P3_4_SCHEMA_VERSION) {
    throw new Error("history_read_model_invalid");
  }
  const rebuilt = buildRetentionHistoryReadModel(context, query);
  if (rebuilt.resultFingerprint !== model.resultFingerprint || stableSerialize(rebuilt) !== stableSerialize(model)) {
    throw new Error("history_read_model_fingerprint_mismatch");
  }
}
