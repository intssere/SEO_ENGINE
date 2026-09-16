import { createHash } from "node:crypto";
import {
  P3_1_LIMITS,
  assertObservationIntegrity,
  classifyObservationTransition,
  type ObservationRecord,
  type ObservationTransitionAction,
} from "./observation-evidence-persistence-design.js";

export const P3_2_SCHEMA_VERSION = "p3_2_v1" as const;

export const P3_2_LIMITS = Object.freeze({
  existingRecords: P3_1_LIMITS.historyRecords,
  relationTargets: 2_048,
  indexIntents: 16,
} as const);

export const PERSISTENCE_PLAN_AUTHORIZATION = Object.freeze({
  productionPersistenceEnabled: false,
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

export type PersistencePlanAuthorization = typeof PERSISTENCE_PLAN_AUTHORIZATION;

export type ObservationWriteAction =
  | "insert_observation"
  | "duplicate_noop"
  | "supersede_and_insert"
  | "preserve_conflict_insert"
  | "corroborate_insert";

export type ObservationPersistenceKey = {
  observationId: string;
  semanticKey: string;
  valueFingerprint: string;
  provenanceFingerprint: string;
  recordFingerprint: string;
  siteId: string;
  urlId: string | null;
  observationKind: string;
  sourceKind: string;
  observedAt: string;
  staleAfter: string;
  keyFingerprint: string;
};

export type PersistenceIndexField =
  | "observationId"
  | "semanticKey"
  | "valueFingerprint"
  | "provenanceFingerprint"
  | "siteId"
  | "urlId"
  | "observationKind"
  | "sourceKind"
  | "observedAt"
  | "staleAfter";

export type PersistenceIndexIntent = {
  name: string;
  unique: boolean;
  fields: readonly PersistenceIndexField[];
  purpose: "idempotency" | "supersession" | "corroboration_conflict" | "read_model" | "freshness";
};

export const PERSISTENCE_INDEX_INTENTS: readonly PersistenceIndexIntent[] = Object.freeze([
  Object.freeze({
    name: "observation_id_unique",
    unique: true,
    fields: Object.freeze(["observationId"] as const),
    purpose: "idempotency" as const,
  }),
  Object.freeze({
    name: "semantic_provenance_observed_order",
    unique: false,
    fields: Object.freeze(["semanticKey", "provenanceFingerprint", "observedAt", "observationId"] as const),
    purpose: "supersession" as const,
  }),
  Object.freeze({
    name: "semantic_value_lookup",
    unique: false,
    fields: Object.freeze(["semanticKey", "valueFingerprint"] as const),
    purpose: "corroboration_conflict" as const,
  }),
  Object.freeze({
    name: "site_kind_source_observed",
    unique: false,
    fields: Object.freeze(["siteId", "observationKind", "sourceKind", "observedAt"] as const),
    purpose: "read_model" as const,
  }),
  Object.freeze({
    name: "url_kind_observed",
    unique: false,
    fields: Object.freeze(["urlId", "observationKind", "observedAt"] as const),
    purpose: "read_model" as const,
  }),
  Object.freeze({
    name: "stale_after_lookup",
    unique: false,
    fields: Object.freeze(["staleAfter", "siteId"] as const),
    purpose: "freshness" as const,
  }),
]);

export type ObservationWritePlan = {
  recordType: "observation_write_plan";
  schemaVersion: typeof P3_2_SCHEMA_VERSION;
  candidate: ObservationRecord;
  persistenceKey: ObservationPersistenceKey;
  action: ObservationWriteAction;
  existingSnapshotFingerprint: string;
  matchedCurrentObservationIds: readonly string[];
  supersedeObservationIds: readonly string[];
  conflictObservationIds: readonly string[];
  corroborationObservationIds: readonly string[];
  idempotencyKey: string;
  indexIntentFingerprint: string;
  planFingerprint: string;
  authorization: PersistencePlanAuthorization;
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

function timestampMillis(value: string): number {
  const parsed = new Date(value).getTime();
  if (!Number.isFinite(parsed)) throw new Error("persistence_plan_observed_at_invalid");
  return parsed;
}

function compareRecords(a: ObservationRecord, b: ObservationRecord): number {
  return a.observationId.localeCompare(b.observationId);
}

function normalizeSnapshot(records: readonly ObservationRecord[], candidate: ObservationRecord): readonly ObservationRecord[] {
  if (!Array.isArray(records) || records.length > P3_2_LIMITS.existingRecords) {
    throw new Error("persistence_plan_existing_record_limit_exceeded");
  }
  assertObservationIntegrity(candidate);
  const byId = new Map<string, ObservationRecord>();
  for (const record of records) {
    assertObservationIntegrity(record);
    if (
      record.subject.siteId !== candidate.subject.siteId
      || record.subject.canonicalOrigin !== candidate.subject.canonicalOrigin
    ) {
      throw new Error("persistence_plan_site_scope_mismatch");
    }
    const already = byId.get(record.observationId);
    if (already && stableSerialize(already) !== stableSerialize(record)) {
      throw new Error("persistence_plan_duplicate_observation_id_mismatch");
    }
    byId.set(record.observationId, record);
  }
  return Object.freeze([...byId.values()].sort(compareRecords));
}

function snapshotFingerprint(records: readonly ObservationRecord[]): string {
  return sha256(records.map((record) => ({
    observationId: record.observationId,
    recordFingerprint: record.recordFingerprint,
  })));
}

function persistenceKeyFor(record: ObservationRecord): ObservationPersistenceKey {
  assertObservationIntegrity(record);
  const base = {
    observationId: record.observationId,
    semanticKey: record.semanticKey,
    valueFingerprint: record.valueFingerprint,
    provenanceFingerprint: record.provenance.provenanceFingerprint,
    recordFingerprint: record.recordFingerprint,
    siteId: record.subject.siteId,
    urlId: record.subject.urlId,
    observationKind: record.observationKind,
    sourceKind: record.provenance.sourceKind,
    observedAt: record.freshnessPolicy.observedAt,
    staleAfter: record.freshnessPolicy.staleAfter,
  };
  return Object.freeze({ ...base, keyFingerprint: sha256(base) });
}

function latestByProvenance(records: readonly ObservationRecord[]): readonly ObservationRecord[] {
  const groups = new Map<string, ObservationRecord[]>();
  for (const record of records) {
    const current = groups.get(record.provenance.provenanceFingerprint) ?? [];
    current.push(record);
    groups.set(record.provenance.provenanceFingerprint, current);
  }
  const latest: ObservationRecord[] = [];
  for (const values of groups.values()) {
    values.sort((a, b) => {
      const time = a.freshnessPolicy.observedAt.localeCompare(b.freshnessPolicy.observedAt);
      return time || a.observationId.localeCompare(b.observationId);
    });
    const record = values.at(-1);
    if (record) latest.push(record);
  }
  return Object.freeze(latest.sort(compareRecords));
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

function actionFor(input: {
  duplicateObservationId: string | null;
  sameProvenanceCurrentId: string | null;
  conflictIds: readonly string[];
  corroborationIds: readonly string[];
  hasSemanticMatch: boolean;
}): ObservationWriteAction {
  if (input.duplicateObservationId) return "duplicate_noop";
  if (input.sameProvenanceCurrentId) return "supersede_and_insert";
  if (input.conflictIds.length > 0) return "preserve_conflict_insert";
  if (input.corroborationIds.length > 0) return "corroborate_insert";
  if (input.hasSemanticMatch) {
    throw new Error("persistence_plan_semantic_match_unclassified");
  }
  return "insert_observation";
}

function assertTransitionExpected(
  transition: ObservationTransitionAction,
  expected: "supersede_existing" | "conflict" | "corroborate",
): void {
  if (transition !== expected) throw new Error("persistence_plan_transition_semantics_mismatch");
}

export function observationPersistenceKey(record: ObservationRecord): ObservationPersistenceKey {
  return persistenceKeyFor(record);
}

export function planObservationWrite(
  existingRecords: readonly ObservationRecord[],
  candidate: ObservationRecord,
): ObservationWritePlan {
  assertObservationIntegrity(candidate);
  const existing = normalizeSnapshot(existingRecords, candidate);
  const existingSnapshotFingerprint = snapshotFingerprint(existing);
  const duplicate = existing.find((record) => record.observationId === candidate.observationId) ?? null;
  const semanticMatches = existing.filter((record) => record.semanticKey === candidate.semanticKey);
  const currentMatches = latestByProvenance(semanticMatches);

  if (currentMatches.length > P3_2_LIMITS.relationTargets) {
    throw new Error("persistence_plan_relation_target_limit_exceeded");
  }

  const sameProvenance = currentMatches.find(
    (record) => record.provenance.provenanceFingerprint === candidate.provenance.provenanceFingerprint,
  ) ?? null;

  if (sameProvenance && !duplicate) {
    const candidateTime = timestampMillis(candidate.freshnessPolicy.observedAt);
    const currentTime = timestampMillis(sameProvenance.freshnessPolicy.observedAt);
    if (candidateTime < currentTime) throw new Error("observation_transition_out_of_order");
  }

  const conflictIds: string[] = [];
  const corroborationIds: string[] = [];
  for (const record of currentMatches) {
    if (duplicate && record.observationId === duplicate.observationId) continue;
    if (record.provenance.provenanceFingerprint === candidate.provenance.provenanceFingerprint) continue;
    const transition = classifyObservationTransition(record, candidate);
    if (transition.action === "conflict") {
      assertTransitionExpected(transition.action, "conflict");
      conflictIds.push(record.observationId);
    } else if (transition.action === "corroborate") {
      assertTransitionExpected(transition.action, "corroborate");
      corroborationIds.push(record.observationId);
    } else {
      throw new Error("persistence_plan_cross_provenance_transition_invalid");
    }
  }

  let supersedeObservationIds: readonly string[] = Object.freeze([]);
  if (sameProvenance && !duplicate) {
    const transition = classifyObservationTransition(sameProvenance, candidate);
    assertTransitionExpected(transition.action, "supersede_existing");
    supersedeObservationIds = Object.freeze([sameProvenance.observationId]);
  }

  const normalizedConflicts = uniqueSorted(conflictIds);
  const normalizedCorroborations = uniqueSorted(corroborationIds);
  const matchedCurrentObservationIds = uniqueSorted(currentMatches.map((record) => record.observationId));
  const action = actionFor({
    duplicateObservationId: duplicate?.observationId ?? null,
    sameProvenanceCurrentId: sameProvenance && !duplicate ? sameProvenance.observationId : null,
    conflictIds: normalizedConflicts,
    corroborationIds: normalizedCorroborations,
    hasSemanticMatch: semanticMatches.length > 0,
  });

  if (action === "duplicate_noop") {
    supersedeObservationIds = Object.freeze([]);
  }

  const persistenceKey = persistenceKeyFor(candidate);
  const indexIntentFingerprint = sha256(PERSISTENCE_INDEX_INTENTS);
  const idempotencyKey = sha256({
    schemaVersion: P3_2_SCHEMA_VERSION,
    observationId: candidate.observationId,
    recordFingerprint: candidate.recordFingerprint,
  });
  const base = {
    recordType: "observation_write_plan" as const,
    schemaVersion: P3_2_SCHEMA_VERSION,
    candidate,
    persistenceKey,
    action,
    existingSnapshotFingerprint,
    matchedCurrentObservationIds,
    supersedeObservationIds,
    conflictObservationIds: normalizedConflicts,
    corroborationObservationIds: normalizedCorroborations,
    idempotencyKey,
    indexIntentFingerprint,
    authorization: PERSISTENCE_PLAN_AUTHORIZATION,
  };
  return Object.freeze({ ...base, planFingerprint: sha256(base) });
}

export function assertObservationWritePlanIntegrity(
  plan: ObservationWritePlan,
  existingRecords: readonly ObservationRecord[],
): void {
  if (!plan || plan.recordType !== "observation_write_plan" || plan.schemaVersion !== P3_2_SCHEMA_VERSION) {
    throw new Error("persistence_plan_invalid");
  }
  const rebuilt = planObservationWrite(existingRecords, plan.candidate);
  if (rebuilt.planFingerprint !== plan.planFingerprint || stableSerialize(rebuilt) !== stableSerialize(plan)) {
    throw new Error("persistence_plan_fingerprint_mismatch");
  }
}

export function applyObservationWritePlanInMemory(
  existingRecords: readonly ObservationRecord[],
  plan: ObservationWritePlan,
): readonly ObservationRecord[] {
  assertObservationWritePlanIntegrity(plan, existingRecords);
  const existing = normalizeSnapshot(existingRecords, plan.candidate);
  if (plan.action === "duplicate_noop") return existing;
  const byId = new Map(existing.map((record) => [record.observationId, record] as const));
  byId.set(plan.candidate.observationId, plan.candidate);
  return Object.freeze([...byId.values()].sort(compareRecords));
}
