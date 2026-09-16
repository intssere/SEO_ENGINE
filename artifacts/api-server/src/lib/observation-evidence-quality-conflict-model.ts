import { createHash } from "node:crypto";
import {
  P3_4_LIMITS,
  assertRetentionHistoryReadModelIntegrity,
  type EvidenceAvailability,
  type HistoryReadRow,
  type RetentionHistoryReadContext,
  type RetentionHistoryReadModel,
  type RetentionHistoryReadQuery,
} from "./observation-evidence-retention-history-read-model.js";

export const P3_5_SCHEMA_VERSION = "p3_5_v1" as const;

export const P3_5_LIMITS = Object.freeze({
  assessments: P3_4_LIMITS.pageLimit,
  conflictRelations: P3_4_LIMITS.relations,
  conflictGroups: P3_4_LIMITS.relations,
  filterValues: P3_4_LIMITS.filterValues,
  pageLimit: P3_4_LIMITS.pageLimit,
  indexIntents: 10,
} as const);

export const EVIDENCE_QUALITY_CONFLICT_AUTHORIZATION = Object.freeze({
  productionQualityRuntimeEnabled: false,
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

export type EvidenceQualityConflictAuthorization = typeof EVIDENCE_QUALITY_CONFLICT_AUTHORIZATION;
export type EvidenceFreshnessState = "fresh" | "stale";
export type EvidenceSupportTier = "insufficient" | "limited" | "supported" | "strong" | "corroborated";
export type ConflictCoverage = "complete" | "partial_page";
export type ConflictResolutionState = "retain_unresolved" | "prefer_supported" | "require_review" | "insufficient_evidence";

export type EvidenceQualityConflictContext = {
  readContext: RetentionHistoryReadContext;
  readQuery: RetentionHistoryReadQuery;
  readModel: RetentionHistoryReadModel;
  referenceTime: string;
};

export type EvidenceQualityConflictQuery = {
  supportTiers?: readonly EvidenceSupportTier[];
  freshnessStates?: readonly EvidenceFreshnessState[];
  evidenceAvailability?: readonly EvidenceAvailability[];
  conflictResolutionStates?: readonly ConflictResolutionState[];
  page?: { offset?: number; limit?: number };
};

export type EvidenceQualityAssessment = {
  observationId: string;
  semanticKey: string;
  valueFingerprint: string;
  sourceKind: string;
  provenanceFingerprint: string;
  evidenceAvailability: EvidenceAvailability;
  unavailableEvidenceDimensions: readonly string[];
  freshnessState: EvidenceFreshnessState;
  confidence: HistoryReadRow["confidence"];
  visibleCorroboratingObservationIds: readonly string[];
  unavailableCorroboratingObservationIds: readonly string[];
  corroboratingIndependentProvenanceCount: number;
  conflictParticipantCount: number;
  supportTier: EvidenceSupportTier;
  assessmentFingerprint: string;
};

export type ConflictValueSupportProjection = {
  valueFingerprint: string;
  conflictParticipantObservationIds: readonly string[];
  supportingObservationIds: readonly string[];
  missingCorroboratingObservationIds: readonly string[];
  provenanceFingerprints: readonly string[];
  sourceFingerprints: readonly string[];
  freshObservationCount: number;
  availableEvidenceCount: number;
  strongOrBetterCount: number;
  supportTier: EvidenceSupportTier;
  supportFingerprint: string;
};

export type ConflictGroupProjection = {
  conflictGroupId: string;
  semanticKey: string | null;
  observationIds: readonly string[];
  missingObservationIds: readonly string[];
  coverage: ConflictCoverage;
  valueSupports: readonly ConflictValueSupportProjection[];
  resolutionState: ConflictResolutionState;
  preferredValueFingerprint: string | null;
  reasoningCodes: readonly string[];
  groupFingerprint: string;
};

export type EvidenceQualityConflictPage = {
  offset: number;
  limit: number;
  returned: number;
  totalMatched: number;
  hasMore: boolean;
};

export type EvidenceQualityConflictModel = {
  recordType: "observation_evidence_quality_conflict_model";
  schemaVersion: typeof P3_5_SCHEMA_VERSION;
  siteId: string;
  canonicalOrigin: string;
  readModelFingerprint: string;
  referenceTime: string;
  queryFingerprint: string;
  assessments: readonly EvidenceQualityAssessment[];
  conflictGroups: readonly ConflictGroupProjection[];
  page: EvidenceQualityConflictPage;
  indexIntentFingerprint: string;
  resultFingerprint: string;
  authorization: EvidenceQualityConflictAuthorization;
};

export type EvidenceQualityConflictIndexField =
  | "siteId"
  | "canonicalOrigin"
  | "semanticKey"
  | "valueFingerprint"
  | "provenanceFingerprint"
  | "sourceKind"
  | "supportTier"
  | "freshnessState"
  | "evidenceAvailability"
  | "conflictGroupId"
  | "resolutionState";

export type EvidenceQualityConflictIndexIntent = {
  name: string;
  unique: boolean;
  fields: readonly EvidenceQualityConflictIndexField[];
  purpose: "quality" | "provenance" | "conflict" | "resolution";
};

export const EVIDENCE_QUALITY_CONFLICT_INDEX_INTENTS: readonly EvidenceQualityConflictIndexIntent[] = Object.freeze([
  Object.freeze({
    name: "evidence_quality_semantic_support",
    unique: false,
    fields: Object.freeze(["siteId", "canonicalOrigin", "semanticKey", "supportTier"] as const),
    purpose: "quality" as const,
  }),
  Object.freeze({
    name: "evidence_quality_availability_freshness",
    unique: false,
    fields: Object.freeze(["siteId", "evidenceAvailability", "freshnessState"] as const),
    purpose: "quality" as const,
  }),
  Object.freeze({
    name: "evidence_quality_provenance",
    unique: false,
    fields: Object.freeze(["siteId", "semanticKey", "provenanceFingerprint", "sourceKind"] as const),
    purpose: "provenance" as const,
  }),
  Object.freeze({
    name: "evidence_conflict_value_support",
    unique: false,
    fields: Object.freeze(["siteId", "semanticKey", "valueFingerprint", "provenanceFingerprint"] as const),
    purpose: "conflict" as const,
  }),
  Object.freeze({
    name: "evidence_conflict_resolution",
    unique: false,
    fields: Object.freeze(["siteId", "conflictGroupId", "resolutionState"] as const),
    purpose: "resolution" as const,
  }),
]);

const SUPPORT_TIER_VALUES = new Set<EvidenceSupportTier>(["insufficient", "limited", "supported", "strong", "corroborated"]);
const FRESHNESS_VALUES = new Set<EvidenceFreshnessState>(["fresh", "stale"]);
const AVAILABILITY_VALUES = new Set<EvidenceAvailability>(["available", "partial", "unavailable"]);
const RESOLUTION_VALUES = new Set<ConflictResolutionState>(["retain_unresolved", "prefer_supported", "require_review", "insufficient_evidence"]);
const SUPPORT_RANK: Record<EvidenceSupportTier, number> = {
  insufficient: 0,
  limited: 1,
  supported: 2,
  strong: 3,
  corroborated: 4,
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

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

function normalizeTimestamp(value: string, code: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) throw new Error(code);
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new Error(code);
  return parsed.toISOString();
}

function normalizeEnumFilter<T extends string>(values: readonly T[] | undefined, allowed: ReadonlySet<T>, code: string): readonly T[] | undefined {
  if (values === undefined) return undefined;
  if (!Array.isArray(values) || values.length > P3_5_LIMITS.filterValues) throw new Error(`${code}_limit_exceeded`);
  const normalized = [...new Set(values)];
  if (normalized.some((value) => !allowed.has(value))) throw new Error(`${code}_invalid`);
  return Object.freeze(normalized.sort());
}

function normalizeQuery(query: EvidenceQualityConflictQuery) {
  if (!query || typeof query !== "object") throw new Error("evidence_quality_query_invalid");
  const supportTiers = normalizeEnumFilter(query.supportTiers, SUPPORT_TIER_VALUES, "evidence_quality_support_filter");
  const freshnessStates = normalizeEnumFilter(query.freshnessStates, FRESHNESS_VALUES, "evidence_quality_freshness_filter");
  const evidenceAvailability = normalizeEnumFilter(query.evidenceAvailability, AVAILABILITY_VALUES, "evidence_quality_availability_filter");
  const conflictResolutionStates = normalizeEnumFilter(query.conflictResolutionStates, RESOLUTION_VALUES, "evidence_quality_resolution_filter");
  const offset = query.page?.offset ?? 0;
  const limit = query.page?.limit ?? 100;
  if (!Number.isInteger(offset) || offset < 0 || offset > P3_4_LIMITS.cursorOffset) throw new Error("evidence_quality_page_offset_invalid");
  if (!Number.isInteger(limit) || limit < 1 || limit > P3_5_LIMITS.pageLimit) throw new Error("evidence_quality_page_limit_invalid");
  return { supportTiers, freshnessStates, evidenceAvailability, conflictResolutionStates, offset, limit };
}

function supportTierFor(row: HistoryReadRow, freshnessState: EvidenceFreshnessState, corroboratingIndependentProvenanceCount: number): EvidenceSupportTier {
  if (row.evidenceAvailability === "unavailable" || row.confidence === "unknown") return "insufficient";
  if (freshnessState === "stale" || row.confidence === "low") return "limited";
  if (
    row.evidenceAvailability === "available"
    && (row.confidence === "high" || row.confidence === "verified")
    && corroboratingIndependentProvenanceCount > 0
  ) return "corroborated";
  if (row.evidenceAvailability === "available" && (row.confidence === "high" || row.confidence === "verified")) return "strong";
  return "supported";
}

function assessmentFor(row: HistoryReadRow, rowById: ReadonlyMap<string, HistoryReadRow>, referenceTime: string): EvidenceQualityAssessment {
  if (Date.parse(referenceTime) < Date.parse(row.observedAt)) throw new Error("evidence_quality_reference_time_before_observation");
  const freshnessState: EvidenceFreshnessState = Date.parse(referenceTime) <= Date.parse(row.staleAfter) ? "fresh" : "stale";
  const visibleCorroboratingRows = row.corroboratingObservationIds
    .map((id) => rowById.get(id))
    .filter((value): value is HistoryReadRow => value !== undefined);
  const visibleCorroboratingObservationIds = uniqueSorted(visibleCorroboratingRows.map((value) => value.observationId));
  const unavailableCorroboratingObservationIds = uniqueSorted(row.corroboratingObservationIds.filter((id) => !rowById.has(id)));
  const corroboratingIndependentProvenanceCount = new Set(visibleCorroboratingRows
    .filter((value) => value.valueFingerprint === row.valueFingerprint)
    .map((value) => value.provenance.provenanceFingerprint)
    .filter((fingerprint) => fingerprint !== row.provenance.provenanceFingerprint)).size;
  const supportTier = supportTierFor(row, freshnessState, corroboratingIndependentProvenanceCount);
  const base = {
    observationId: row.observationId,
    semanticKey: row.semanticKey,
    valueFingerprint: row.valueFingerprint,
    sourceKind: row.provenance.sourceKind,
    provenanceFingerprint: row.provenance.provenanceFingerprint,
    evidenceAvailability: row.evidenceAvailability,
    unavailableEvidenceDimensions: uniqueSorted(row.unavailableEvidenceDimensions),
    freshnessState,
    confidence: row.confidence,
    visibleCorroboratingObservationIds,
    unavailableCorroboratingObservationIds,
    corroboratingIndependentProvenanceCount,
    conflictParticipantCount: row.conflictObservationIds.length,
    supportTier,
  };
  return Object.freeze({ ...base, assessmentFingerprint: sha256(base) });
}

function aggregateSupportTier(assessments: readonly EvidenceQualityAssessment[]): EvidenceSupportTier {
  if (assessments.length === 0) return "insufficient";
  return assessments.reduce<EvidenceSupportTier>((best, assessment) => (
    SUPPORT_RANK[assessment.supportTier] > SUPPORT_RANK[best] ? assessment.supportTier : best
  ), "insufficient");
}

function compareValueSupport(a: ConflictValueSupportProjection, b: ConflictValueSupportProjection): number {
  const tupleA = [SUPPORT_RANK[a.supportTier], a.provenanceFingerprints.length, a.freshObservationCount, a.availableEvidenceCount, a.strongOrBetterCount];
  const tupleB = [SUPPORT_RANK[b.supportTier], b.provenanceFingerprints.length, b.freshObservationCount, b.availableEvidenceCount, b.strongOrBetterCount];
  for (let index = 0; index < tupleA.length; index += 1) {
    const delta = (tupleB[index] ?? 0) - (tupleA[index] ?? 0);
    if (delta !== 0) return delta;
  }
  return a.valueFingerprint.localeCompare(b.valueFingerprint);
}

function conflictComponents(model: RetentionHistoryReadModel): readonly { ids: readonly string[]; relationFingerprints: readonly string[] }[] {
  if (model.unresolvedConflicts.length > P3_5_LIMITS.conflictRelations) throw new Error("evidence_quality_conflict_relation_limit_exceeded");
  const adjacency = new Map<string, Set<string>>();
  const relationByPair = new Map<string, string>();
  for (const relation of model.unresolvedConflicts) {
    const [left, right] = relation.observationIds;
    if (!left || !right || left === right) throw new Error("evidence_quality_conflict_relation_invalid");
    if (!adjacency.has(left)) adjacency.set(left, new Set());
    if (!adjacency.has(right)) adjacency.set(right, new Set());
    adjacency.get(left)?.add(right);
    adjacency.get(right)?.add(left);
    relationByPair.set([left, right].sort().join(":"), relation.relationFingerprint);
  }
  const components: { ids: readonly string[]; relationFingerprints: readonly string[] }[] = [];
  const visited = new Set<string>();
  for (const start of [...adjacency.keys()].sort()) {
    if (visited.has(start)) continue;
    const pending = [start];
    const ids: string[] = [];
    while (pending.length > 0) {
      const current = pending.shift();
      if (!current || visited.has(current)) continue;
      visited.add(current);
      ids.push(current);
      for (const next of [...(adjacency.get(current) ?? [])].sort()) if (!visited.has(next)) pending.push(next);
    }
    const sortedIds = [...ids].sort();
    const relationFingerprints: string[] = [];
    for (let leftIndex = 0; leftIndex < sortedIds.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < sortedIds.length; rightIndex += 1) {
        const fingerprint = relationByPair.get(`${sortedIds[leftIndex]}:${sortedIds[rightIndex]}`);
        if (fingerprint) relationFingerprints.push(fingerprint);
      }
    }
    components.push({ ids: Object.freeze(sortedIds), relationFingerprints: uniqueSorted(relationFingerprints) });
  }
  if (components.length > P3_5_LIMITS.conflictGroups) throw new Error("evidence_quality_conflict_group_limit_exceeded");
  return Object.freeze(components);
}

function conflictGroupFor(
  component: { ids: readonly string[]; relationFingerprints: readonly string[] },
  rowById: ReadonlyMap<string, HistoryReadRow>,
  assessmentById: ReadonlyMap<string, EvidenceQualityAssessment>,
): ConflictGroupProjection {
  const visibleParticipantRows = component.ids.map((id) => rowById.get(id)).filter((value): value is HistoryReadRow => value !== undefined);
  const missingObservationIds = uniqueSorted(component.ids.filter((id) => !rowById.has(id)));
  const semanticKeys = uniqueSorted(visibleParticipantRows.map((row) => row.semanticKey));
  if (semanticKeys.length > 1) throw new Error("evidence_quality_conflict_semantic_scope_mismatch");
  const semanticKey = semanticKeys[0] ?? null;
  const valueFingerprints = uniqueSorted(visibleParticipantRows.map((row) => row.valueFingerprint));
  const valueSupports = valueFingerprints.map((valueFingerprint) => {
    const participantRows = visibleParticipantRows.filter((row) => row.valueFingerprint === valueFingerprint);
    const corroboratingIds = uniqueSorted(participantRows.flatMap((row) => row.corroboratingObservationIds));
    const corroboratingRows = corroboratingIds
      .map((id) => rowById.get(id))
      .filter((value): value is HistoryReadRow => value !== undefined)
      .filter((row) => row.valueFingerprint === valueFingerprint);
    const supportingRowsById = new Map<string, HistoryReadRow>();
    for (const row of [...participantRows, ...corroboratingRows]) supportingRowsById.set(row.observationId, row);
    const supportingRows = [...supportingRowsById.values()].sort((a, b) => a.observationId.localeCompare(b.observationId));
    const supportingAssessments = supportingRows
      .map((row) => assessmentById.get(row.observationId))
      .filter((value): value is EvidenceQualityAssessment => value !== undefined);
    const supportTier = aggregateSupportTier(supportingAssessments);
    const base = {
      valueFingerprint,
      conflictParticipantObservationIds: uniqueSorted(participantRows.map((row) => row.observationId)),
      supportingObservationIds: uniqueSorted(supportingRows.map((row) => row.observationId)),
      missingCorroboratingObservationIds: uniqueSorted(corroboratingIds.filter((id) => !rowById.has(id))),
      provenanceFingerprints: uniqueSorted(supportingRows.map((row) => row.provenance.provenanceFingerprint)),
      sourceFingerprints: uniqueSorted(supportingRows.map((row) => row.provenance.sourceFingerprint)),
      freshObservationCount: supportingAssessments.filter((assessment) => assessment.freshnessState === "fresh").length,
      availableEvidenceCount: supportingAssessments.filter((assessment) => assessment.evidenceAvailability === "available").length,
      strongOrBetterCount: supportingAssessments.filter((assessment) => SUPPORT_RANK[assessment.supportTier] >= SUPPORT_RANK.strong).length,
      supportTier,
    };
    return Object.freeze({ ...base, supportFingerprint: sha256(base) });
  }).sort(compareValueSupport);

  const coverage: ConflictCoverage = missingObservationIds.length === 0 ? "complete" : "partial_page";
  let resolutionState: ConflictResolutionState = "retain_unresolved";
  let preferredValueFingerprint: string | null = null;
  const reasoningCodes: string[] = [];

  if (coverage === "partial_page" || valueSupports.length < 2) {
    resolutionState = "insufficient_evidence";
    reasoningCodes.push("participant_rows_unavailable");
  } else if (valueSupports.some((support) => support.supportTier === "insufficient")) {
    resolutionState = "insufficient_evidence";
    reasoningCodes.push("participant_evidence_insufficient");
  } else {
    const strongCandidates = valueSupports.filter((support) => (
      SUPPORT_RANK[support.supportTier] >= SUPPORT_RANK.strong && support.provenanceFingerprints.length >= 2
    ));
    if (strongCandidates.length === 1) {
      const candidate = strongCandidates[0];
      const competingBestRank = Math.max(...valueSupports
        .filter((support) => support.valueFingerprint !== candidate.valueFingerprint)
        .map((support) => SUPPORT_RANK[support.supportTier]));
      if (SUPPORT_RANK[candidate.supportTier] > competingBestRank) {
        resolutionState = "prefer_supported";
        preferredValueFingerprint = candidate.valueFingerprint;
        reasoningCodes.push("unique_independent_corroborated_support");
      } else {
        resolutionState = "require_review";
        reasoningCodes.push("multiple_strong_support_states");
      }
    } else if (strongCandidates.length > 1) {
      resolutionState = "require_review";
      reasoningCodes.push("multiple_strong_support_states");
    } else {
      resolutionState = "retain_unresolved";
      reasoningCodes.push("no_strict_support_dominance");
    }
  }

  const groupBase = {
    relationFingerprints: component.relationFingerprints,
    observationIds: component.ids,
    semanticKey,
  };
  const conflictGroupId = sha256(groupBase);
  const base = {
    conflictGroupId,
    semanticKey,
    observationIds: component.ids,
    missingObservationIds,
    coverage,
    valueSupports: Object.freeze(valueSupports),
    resolutionState,
    preferredValueFingerprint,
    reasoningCodes: uniqueSorted(reasoningCodes),
  };
  return Object.freeze({ ...base, groupFingerprint: sha256(base) });
}

export function buildEvidenceQualityConflictModel(
  context: EvidenceQualityConflictContext,
  query: EvidenceQualityConflictQuery = {},
): EvidenceQualityConflictModel {
  assertRetentionHistoryReadModelIntegrity(context.readModel, context.readContext, context.readQuery);
  const referenceTime = normalizeTimestamp(context.referenceTime, "evidence_quality_reference_time_invalid");
  if (context.readModel.rows.length > P3_5_LIMITS.assessments) throw new Error("evidence_quality_assessment_limit_exceeded");
  const normalized = normalizeQuery(query);
  const rowById = new Map(context.readModel.rows.map((row) => [row.observationId, row] as const));
  const allAssessments = Object.freeze(context.readModel.rows
    .map((row) => assessmentFor(row, rowById, referenceTime))
    .sort((a, b) => a.observationId.localeCompare(b.observationId)));
  const assessmentById = new Map(allAssessments.map((assessment) => [assessment.observationId, assessment] as const));
  const allConflictGroups = Object.freeze(conflictComponents(context.readModel)
    .map((component) => conflictGroupFor(component, rowById, assessmentById))
    .sort((a, b) => a.conflictGroupId.localeCompare(b.conflictGroupId)));

  const matchedAssessments = allAssessments.filter((assessment) => {
    if (normalized.supportTiers && !normalized.supportTiers.includes(assessment.supportTier)) return false;
    if (normalized.freshnessStates && !normalized.freshnessStates.includes(assessment.freshnessState)) return false;
    if (normalized.evidenceAvailability && !normalized.evidenceAvailability.includes(assessment.evidenceAvailability)) return false;
    return true;
  });
  const matchedConflictGroups = allConflictGroups.filter((group) => (
    !normalized.conflictResolutionStates || normalized.conflictResolutionStates.includes(group.resolutionState)
  ));
  if (normalized.offset > matchedAssessments.length) throw new Error("evidence_quality_page_offset_beyond_result");
  const assessments = Object.freeze(matchedAssessments.slice(normalized.offset, normalized.offset + normalized.limit));
  const page = Object.freeze({
    offset: normalized.offset,
    limit: normalized.limit,
    returned: assessments.length,
    totalMatched: matchedAssessments.length,
    hasMore: normalized.offset + assessments.length < matchedAssessments.length,
  });
  const queryBase = {
    supportTiers: normalized.supportTiers ?? null,
    freshnessStates: normalized.freshnessStates ?? null,
    evidenceAvailability: normalized.evidenceAvailability ?? null,
    conflictResolutionStates: normalized.conflictResolutionStates ?? null,
    offset: normalized.offset,
    limit: normalized.limit,
  };
  const queryFingerprint = sha256(queryBase);
  const indexIntentFingerprint = sha256(EVIDENCE_QUALITY_CONFLICT_INDEX_INTENTS);
  const base = {
    recordType: "observation_evidence_quality_conflict_model" as const,
    schemaVersion: P3_5_SCHEMA_VERSION,
    siteId: context.readModel.siteId,
    canonicalOrigin: context.readModel.canonicalOrigin,
    readModelFingerprint: context.readModel.resultFingerprint,
    referenceTime,
    queryFingerprint,
    assessments,
    conflictGroups: Object.freeze(matchedConflictGroups),
    page,
    indexIntentFingerprint,
    authorization: EVIDENCE_QUALITY_CONFLICT_AUTHORIZATION,
  };
  return Object.freeze({ ...base, resultFingerprint: sha256(base) });
}

export function assertEvidenceQualityConflictModelIntegrity(
  model: EvidenceQualityConflictModel,
  context: EvidenceQualityConflictContext,
  query: EvidenceQualityConflictQuery = {},
): void {
  if (!model || model.recordType !== "observation_evidence_quality_conflict_model" || model.schemaVersion !== P3_5_SCHEMA_VERSION) {
    throw new Error("evidence_quality_model_invalid");
  }
  const rebuilt = buildEvidenceQualityConflictModel(context, query);
  if (rebuilt.resultFingerprint !== model.resultFingerprint || stableSerialize(rebuilt) !== stableSerialize(model)) {
    throw new Error("evidence_quality_model_fingerprint_mismatch");
  }
}
