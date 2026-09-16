import { createHash } from "node:crypto";
import type {
  TechnicalEvidence,
  TechnicalIssue,
  TechnicalIssueConfidence,
} from "./technical-issue-evidence-model.js";
import { assertTechnicalIssueIntegrity } from "./technical-issue-evidence-model.js";

export const P3_1_SCHEMA_VERSION = "p3_1_v1" as const;

export const P3_1_LIMITS = Object.freeze({
  siteIdLength: 160,
  observationKindLength: 180,
  provenanceKindLength: 120,
  collectorIdLength: 160,
  valueFields: 32,
  valueKeyLength: 120,
  valueStringLength: 512,
  evidenceReferences: 64,
  historyRecords: 10_000,
  queryKinds: 64,
  querySourceKinds: 64,
  queryLimit: 500,
  queryOffset: 25_000,
  minFreshForMs: 60_000,
  maxFreshForMs: 30 * 24 * 60 * 60 * 1_000,
} as const);

export const OBSERVATION_AUTHORIZATION = Object.freeze({
  persistenceEnabled: false,
  ddlEnabled: false,
  dmlEnabled: false,
  databaseClientEnabled: false,
  migrationEnabled: false,
  networkEnabled: false,
  providerReadsAuthorized: false,
  providerWritesAuthorized: false,
  liveCrawlExecutionEnabled: false,
  filesystemWritesEnabled: false,
  environmentSecretBindingEnabled: false,
  schedulerEnabled: false,
  workerEnabled: false,
  autonomousMutationEnabled: false,
  publicSiteWritesEnabled: false,
  publicationAuthorized: false,
} as const);

export type ObservationAuthorization = typeof OBSERVATION_AUTHORIZATION;
export type ObservationConfidence = TechnicalIssueConfidence | "unknown";
export type ObservationRetentionClass = "operational_history" | "evidence_lineage" | "audit_history";
export type ObservationFreshness = "fresh" | "stale";
export type ObservationLifecycle = "current" | "superseded" | "conflicting";
export type ObservationTransitionAction = "duplicate_existing" | "supersede_existing" | "conflict" | "corroborate" | "independent";
export type ObservationScalar = string | number | boolean | null;

export type ObservationSubject = {
  kind: "site" | "url";
  siteId: string;
  canonicalOrigin: string;
  urlId: string | null;
  canonicalUrl: string | null;
};

export type ObservationProvenance = {
  sourceKind: string;
  sourceFingerprint: string;
  collectorId: string;
  provenanceFingerprint: string;
};

export type ObservationEvidenceReference = {
  evidenceId: string;
  evidenceFingerprint: string;
  sourceKind: string;
  sourceFingerprint: string;
  dimension: string;
  quality: string;
  availability: "available" | "unavailable";
  referenceFingerprint: string;
};

export type ObservationFreshnessPolicy = {
  observedAt: string;
  freshForMs: number;
  staleAfter: string;
};

export type ObservationRecord = {
  recordType: "normalized_observation";
  schemaVersion: typeof P3_1_SCHEMA_VERSION;
  observationId: string;
  semanticKey: string;
  subject: ObservationSubject;
  observationKind: string;
  materialValue: Readonly<Record<string, ObservationScalar>>;
  valueFingerprint: string;
  evidenceReferences: readonly ObservationEvidenceReference[];
  evidenceSetFingerprint: string;
  provenance: ObservationProvenance;
  confidence: ObservationConfidence;
  freshnessPolicy: ObservationFreshnessPolicy;
  retentionClass: ObservationRetentionClass;
  recordFingerprint: string;
  authorization: ObservationAuthorization;
};

export type CreateObservationInput = {
  subject: ObservationSubject;
  observationKind: string;
  materialValue: Readonly<Record<string, ObservationScalar>>;
  evidenceReferences?: readonly ObservationEvidenceReference[];
  provenance: Omit<ObservationProvenance, "provenanceFingerprint">;
  confidence: ObservationConfidence;
  observedAt: string;
  freshForMs?: number;
  retentionClass?: ObservationRetentionClass;
};

export type ObservationTransition = {
  action: ObservationTransitionAction;
  existingObservationId: string | null;
  candidateObservationId: string;
  semanticKey: string;
  relationFingerprint: string;
};

export type ObservationHistoryRelation = {
  relationType: "supersedes" | "conflicts_with" | "corroborates";
  fromObservationId: string;
  toObservationId: string;
  relationFingerprint: string;
};

export type ObservationHistoryEntry = {
  observation: ObservationRecord;
  lifecycle: ObservationLifecycle;
  freshness: ObservationFreshness;
  supersededByObservationId: string | null;
  conflictsWithObservationIds: readonly string[];
  corroboratesObservationIds: readonly string[];
  entryFingerprint: string;
};

export type ObservationHistory = {
  recordType: "observation_history";
  schemaVersion: typeof P3_1_SCHEMA_VERSION;
  asOf: string;
  entries: readonly ObservationHistoryEntry[];
  relations: readonly ObservationHistoryRelation[];
  historyFingerprint: string;
  authorization: ObservationAuthorization;
};

export type ObservationQuery = {
  siteId?: string;
  urlId?: string;
  observationKinds?: readonly string[];
  sourceKinds?: readonly string[];
  lifecycles?: readonly ObservationLifecycle[];
  freshness?: readonly ObservationFreshness[];
  sort?: { field: "observedAt" | "observationKind" | "observationId"; direction: "asc" | "desc" };
  page?: { offset: number; limit: number };
};

export type ObservationQueryResult = {
  recordType: "observation_query_result";
  schemaVersion: typeof P3_1_SCHEMA_VERSION;
  queryFingerprint: string;
  rows: readonly ObservationHistoryEntry[];
  page: { offset: number; limit: number; returned: number; totalMatched: number; hasMore: boolean };
  resultFingerprint: string;
  authorization: ObservationAuthorization;
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

function isFingerprint(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function requireFingerprint(value: unknown, code: string): string {
  if (!isFingerprint(value)) throw new Error(code);
  return value;
}

function normalizeTimestamp(value: string, code: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) throw new Error(code);
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new Error(code);
  return parsed.toISOString();
}

function containsSecretLikeMaterial(value: string): boolean {
  return /(?:Bearer\s+[A-Za-z0-9._~+\/-]{8,}|sk-[A-Za-z0-9_-]{8,}|gh[pousr]_[A-Za-z0-9_]{8,}|client_secret\s*[:=]|password\s*[:=]|access_token\s*[:=]|refresh_token\s*[:=]|-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----)/i.test(value);
}

function sanitizeText(value: string, max: number, code: string): string {
  if (typeof value !== "string") throw new Error(code);
  const normalized = value.trim();
  if (!normalized || normalized.length > max || /[\u0000-\u001f\u007f]/.test(normalized)) throw new Error(code);
  if (containsSecretLikeMaterial(normalized)) throw new Error(`${code}_secret_material_denied`);
  if (/<(?:!DOCTYPE|\?xml|\/?script\b|\/?html\b|\/?body\b)/i.test(normalized)) throw new Error(`${code}_raw_markup_denied`);
  return normalized;
}

function normalizeSiteId(value: string): string {
  const normalized = sanitizeText(value, P3_1_LIMITS.siteIdLength, "observation_site_id_invalid");
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(normalized)) throw new Error("observation_site_id_invalid");
  return normalized;
}

function normalizeOrigin(value: string): string {
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error("observation_origin_invalid"); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") {
    throw new Error("observation_origin_invalid");
  }
  return parsed.origin;
}

function normalizeCanonicalUrl(value: string, origin: string): string {
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error("observation_url_invalid"); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.origin !== origin || parsed.hash) throw new Error("observation_url_invalid");
  return parsed.toString();
}

function normalizeSubject(input: ObservationSubject): ObservationSubject {
  if (!input || typeof input !== "object") throw new Error("observation_subject_invalid");
  const siteId = normalizeSiteId(input.siteId);
  const canonicalOrigin = normalizeOrigin(input.canonicalOrigin);
  if (input.kind === "site") {
    if (input.urlId !== null || input.canonicalUrl !== null) throw new Error("observation_site_subject_forbids_url");
    return { kind: "site", siteId, canonicalOrigin, urlId: null, canonicalUrl: null };
  }
  if (input.kind !== "url") throw new Error("observation_subject_kind_invalid");
  const urlId = requireFingerprint(input.urlId, "observation_url_id_invalid");
  if (typeof input.canonicalUrl !== "string") throw new Error("observation_url_invalid");
  const canonicalUrl = normalizeCanonicalUrl(input.canonicalUrl, canonicalOrigin);
  return { kind: "url", siteId, canonicalOrigin, urlId, canonicalUrl };
}

function normalizeMaterialValue(value: Readonly<Record<string, ObservationScalar>>): Readonly<Record<string, ObservationScalar>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("observation_material_value_invalid");
  const entries = Object.entries(value);
  if (entries.length === 0 || entries.length > P3_1_LIMITS.valueFields) throw new Error("observation_material_value_invalid");
  const normalized: Record<string, ObservationScalar> = {};
  for (const [rawKey, rawValue] of entries.sort(([a], [b]) => a.localeCompare(b))) {
    const key = sanitizeText(rawKey, P3_1_LIMITS.valueKeyLength, "observation_material_key_invalid");
    if (!/^[A-Za-z][A-Za-z0-9_.:-]*$/.test(key)) throw new Error("observation_material_key_invalid");
    if (typeof rawValue === "string") {
      const stringValue = sanitizeText(rawValue, P3_1_LIMITS.valueStringLength, "observation_material_string_invalid");
      if (/^[a-z][a-z0-9+.-]*:\/\//i.test(stringValue)) {
        let parsed: URL;
        try { parsed = new URL(stringValue); } catch { throw new Error("observation_material_url_invalid"); }
        if (parsed.username || parsed.password) throw new Error("observation_material_url_credentials_denied");
      }
      normalized[key] = stringValue;
    } else if (rawValue === null || typeof rawValue === "boolean") {
      normalized[key] = rawValue;
    } else if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
      normalized[key] = rawValue;
    } else {
      throw new Error("observation_material_scalar_invalid");
    }
  }
  return Object.freeze(normalized);
}

function normalizeConfidence(value: ObservationConfidence): ObservationConfidence {
  if (!["unknown", "low", "medium", "high", "verified"].includes(value)) throw new Error("observation_confidence_invalid");
  return value;
}

function normalizeRetentionClass(value: ObservationRetentionClass | undefined): ObservationRetentionClass {
  const normalized = value ?? "operational_history";
  if (!["operational_history", "evidence_lineage", "audit_history"].includes(normalized)) throw new Error("observation_retention_class_invalid");
  return normalized;
}

function normalizeFreshForMs(value: number | undefined): number {
  const normalized = value ?? 24 * 60 * 60 * 1_000;
  if (!Number.isInteger(normalized) || normalized < P3_1_LIMITS.minFreshForMs || normalized > P3_1_LIMITS.maxFreshForMs) {
    throw new Error("observation_freshness_window_invalid");
  }
  return normalized;
}

function normalizeProvenance(input: Omit<ObservationProvenance, "provenanceFingerprint">): ObservationProvenance {
  const sourceKind = sanitizeText(input.sourceKind, P3_1_LIMITS.provenanceKindLength, "observation_source_kind_invalid");
  const sourceFingerprint = requireFingerprint(input.sourceFingerprint, "observation_source_fingerprint_invalid");
  const collectorId = sanitizeText(input.collectorId, P3_1_LIMITS.collectorIdLength, "observation_collector_id_invalid");
  const provenanceFingerprint = sha256({ sourceKind, sourceFingerprint, collectorId });
  return { sourceKind, sourceFingerprint, collectorId, provenanceFingerprint };
}

function normalizeEvidenceReference(input: ObservationEvidenceReference): ObservationEvidenceReference {
  const evidenceId = requireFingerprint(input.evidenceId, "observation_evidence_id_invalid");
  const evidenceFingerprint = requireFingerprint(input.evidenceFingerprint, "observation_evidence_fingerprint_invalid");
  const sourceKind = sanitizeText(input.sourceKind, P3_1_LIMITS.provenanceKindLength, "observation_evidence_source_kind_invalid");
  const sourceFingerprint = requireFingerprint(input.sourceFingerprint, "observation_evidence_source_fingerprint_invalid");
  const dimension = sanitizeText(input.dimension, P3_1_LIMITS.provenanceKindLength, "observation_evidence_dimension_invalid");
  const quality = sanitizeText(input.quality, 40, "observation_evidence_quality_invalid");
  if (input.availability !== "available" && input.availability !== "unavailable") throw new Error("observation_evidence_availability_invalid");
  const base = { evidenceId, evidenceFingerprint, sourceKind, sourceFingerprint, dimension, quality, availability: input.availability };
  const referenceFingerprint = sha256(base);
  return { ...base, referenceFingerprint };
}

function normalizeEvidenceReferences(values: readonly ObservationEvidenceReference[] | undefined): readonly ObservationEvidenceReference[] {
  const inputs = values ?? [];
  if (!Array.isArray(inputs) || inputs.length > P3_1_LIMITS.evidenceReferences) throw new Error("observation_evidence_reference_limit_exceeded");
  const normalized = inputs.map(normalizeEvidenceReference).sort((a, b) => a.referenceFingerprint.localeCompare(b.referenceFingerprint));
  const deduped = normalized.filter((item, index) => index === 0 || item.referenceFingerprint !== normalized[index - 1]?.referenceFingerprint);
  return Object.freeze(deduped);
}

function semanticKeyFor(subject: ObservationSubject, observationKind: string): string {
  return sha256({
    subjectKind: subject.kind,
    siteId: subject.siteId,
    canonicalOrigin: subject.canonicalOrigin,
    urlId: subject.urlId,
    observationKind,
  });
}

export function createObservation(input: CreateObservationInput): ObservationRecord {
  const subject = normalizeSubject(input.subject);
  const observationKind = sanitizeText(input.observationKind, P3_1_LIMITS.observationKindLength, "observation_kind_invalid");
  const materialValue = normalizeMaterialValue(input.materialValue);
  const valueFingerprint = sha256(materialValue);
  const evidenceReferences = normalizeEvidenceReferences(input.evidenceReferences);
  const evidenceSetFingerprint = sha256(evidenceReferences.map((item) => item.referenceFingerprint));
  const provenance = normalizeProvenance(input.provenance);
  const confidence = normalizeConfidence(input.confidence);
  const observedAt = normalizeTimestamp(input.observedAt, "observation_observed_at_invalid");
  const freshForMs = normalizeFreshForMs(input.freshForMs);
  const staleAfter = new Date(new Date(observedAt).getTime() + freshForMs).toISOString();
  const freshnessPolicy = { observedAt, freshForMs, staleAfter };
  const retentionClass = normalizeRetentionClass(input.retentionClass);
  const semanticKey = semanticKeyFor(subject, observationKind);
  const observationId = sha256({ schemaVersion: P3_1_SCHEMA_VERSION, semanticKey, provenanceFingerprint: provenance.provenanceFingerprint, observedAt, valueFingerprint, evidenceSetFingerprint });
  const base = {
    recordType: "normalized_observation" as const,
    schemaVersion: P3_1_SCHEMA_VERSION,
    observationId,
    semanticKey,
    subject,
    observationKind,
    materialValue,
    valueFingerprint,
    evidenceReferences,
    evidenceSetFingerprint,
    provenance,
    confidence,
    freshnessPolicy,
    retentionClass,
    authorization: OBSERVATION_AUTHORIZATION,
  };
  return Object.freeze({ ...base, recordFingerprint: sha256(base) });
}

export function assertObservationIntegrity(record: ObservationRecord): void {
  if (!record || record.recordType !== "normalized_observation" || record.schemaVersion !== P3_1_SCHEMA_VERSION) throw new Error("observation_record_invalid");
  const rebuilt = createObservation({
    subject: record.subject,
    observationKind: record.observationKind,
    materialValue: record.materialValue,
    evidenceReferences: record.evidenceReferences,
    provenance: {
      sourceKind: record.provenance.sourceKind,
      sourceFingerprint: record.provenance.sourceFingerprint,
      collectorId: record.provenance.collectorId,
    },
    confidence: record.confidence,
    observedAt: record.freshnessPolicy.observedAt,
    freshForMs: record.freshnessPolicy.freshForMs,
    retentionClass: record.retentionClass,
  });
  if (rebuilt.observationId !== record.observationId || rebuilt.recordFingerprint !== record.recordFingerprint || stableSerialize(rebuilt) !== stableSerialize(record)) {
    throw new Error("observation_record_fingerprint_mismatch");
  }
}

export function freshnessAt(record: ObservationRecord, asOf: string): ObservationFreshness {
  assertObservationIntegrity(record);
  const normalizedAsOf = normalizeTimestamp(asOf, "observation_as_of_invalid");
  if (new Date(normalizedAsOf).getTime() < new Date(record.freshnessPolicy.observedAt).getTime()) throw new Error("observation_as_of_precedes_observation");
  return new Date(normalizedAsOf).getTime() > new Date(record.freshnessPolicy.staleAfter).getTime() ? "stale" : "fresh";
}

export function classifyObservationTransition(existing: ObservationRecord, candidate: ObservationRecord): ObservationTransition {
  assertObservationIntegrity(existing);
  assertObservationIntegrity(candidate);
  let action: ObservationTransitionAction;
  if (existing.observationId === candidate.observationId) {
    action = "duplicate_existing";
  } else if (existing.semanticKey !== candidate.semanticKey) {
    action = "independent";
  } else if (existing.provenance.provenanceFingerprint === candidate.provenance.provenanceFingerprint) {
    if (new Date(candidate.freshnessPolicy.observedAt).getTime() < new Date(existing.freshnessPolicy.observedAt).getTime()) {
      throw new Error("observation_transition_out_of_order");
    }
    action = "supersede_existing";
  } else if (existing.valueFingerprint === candidate.valueFingerprint) {
    action = "corroborate";
  } else {
    action = "conflict";
  }
  return Object.freeze({
    action,
    existingObservationId: action === "independent" ? null : existing.observationId,
    candidateObservationId: candidate.observationId,
    semanticKey: candidate.semanticKey,
    relationFingerprint: sha256({ action, existingObservationId: action === "independent" ? null : existing.observationId, candidateObservationId: candidate.observationId, semanticKey: candidate.semanticKey }),
  });
}

function relation(type: ObservationHistoryRelation["relationType"], fromObservationId: string, toObservationId: string): ObservationHistoryRelation {
  const base = { relationType: type, fromObservationId, toObservationId };
  return Object.freeze({ ...base, relationFingerprint: sha256(base) });
}

export function buildObservationHistory(records: readonly ObservationRecord[], asOf: string): ObservationHistory {
  const normalizedAsOf = normalizeTimestamp(asOf, "observation_history_as_of_invalid");
  if (!Array.isArray(records) || records.length > P3_1_LIMITS.historyRecords) throw new Error("observation_history_record_limit_exceeded");
  const byId = new Map<string, ObservationRecord>();
  for (const record of records) {
    assertObservationIntegrity(record);
    if (new Date(record.freshnessPolicy.observedAt).getTime() > new Date(normalizedAsOf).getTime()) throw new Error("observation_history_future_record");
    const existing = byId.get(record.observationId);
    if (existing && stableSerialize(existing) !== stableSerialize(record)) throw new Error("observation_history_duplicate_id_mismatch");
    byId.set(record.observationId, record);
  }
  const unique = [...byId.values()].sort((a, b) => {
    const semantic = a.semanticKey.localeCompare(b.semanticKey);
    if (semantic) return semantic;
    const provenance = a.provenance.provenanceFingerprint.localeCompare(b.provenance.provenanceFingerprint);
    if (provenance) return provenance;
    const time = a.freshnessPolicy.observedAt.localeCompare(b.freshnessPolicy.observedAt);
    return time || a.observationId.localeCompare(b.observationId);
  });

  const supersededBy = new Map<string, string>();
  const conflicts = new Map<string, Set<string>>();
  const corroborates = new Map<string, Set<string>>();
  const relations: ObservationHistoryRelation[] = [];
  const semanticGroups = new Map<string, ObservationRecord[]>();
  for (const record of unique) {
    const group = semanticGroups.get(record.semanticKey) ?? [];
    group.push(record);
    semanticGroups.set(record.semanticKey, group);
  }

  for (const group of semanticGroups.values()) {
    const provenanceGroups = new Map<string, ObservationRecord[]>();
    for (const record of group) {
      const values = provenanceGroups.get(record.provenance.provenanceFingerprint) ?? [];
      values.push(record);
      provenanceGroups.set(record.provenance.provenanceFingerprint, values);
    }
    const latest: ObservationRecord[] = [];
    for (const values of provenanceGroups.values()) {
      values.sort((a, b) => a.freshnessPolicy.observedAt.localeCompare(b.freshnessPolicy.observedAt) || a.observationId.localeCompare(b.observationId));
      for (let index = 0; index < values.length - 1; index += 1) {
        const current = values[index];
        const next = values[index + 1];
        if (!current || !next) continue;
        supersededBy.set(current.observationId, next.observationId);
        relations.push(relation("supersedes", next.observationId, current.observationId));
      }
      const current = values.at(-1);
      if (current) latest.push(current);
    }
    for (let leftIndex = 0; leftIndex < latest.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < latest.length; rightIndex += 1) {
        const left = latest[leftIndex];
        const right = latest[rightIndex];
        if (!left || !right) continue;
        const relationType = left.valueFingerprint === right.valueFingerprint ? "corroborates" : "conflicts_with";
        const map = relationType === "corroborates" ? corroborates : conflicts;
        const leftSet = map.get(left.observationId) ?? new Set<string>();
        const rightSet = map.get(right.observationId) ?? new Set<string>();
        leftSet.add(right.observationId);
        rightSet.add(left.observationId);
        map.set(left.observationId, leftSet);
        map.set(right.observationId, rightSet);
        const [fromObservationId, toObservationId] = [left.observationId, right.observationId].sort();
        relations.push(relation(relationType, fromObservationId as string, toObservationId as string));
      }
    }
  }

  const entries = unique.map((observation): ObservationHistoryEntry => {
    const supersededByObservationId = supersededBy.get(observation.observationId) ?? null;
    const conflictsWithObservationIds = [...(conflicts.get(observation.observationId) ?? [])].sort();
    const corroboratesObservationIds = [...(corroborates.get(observation.observationId) ?? [])].sort();
    const lifecycle: ObservationLifecycle = supersededByObservationId ? "superseded" : conflictsWithObservationIds.length ? "conflicting" : "current";
    const freshness = freshnessAt(observation, normalizedAsOf);
    const base = { observation, lifecycle, freshness, supersededByObservationId, conflictsWithObservationIds, corroboratesObservationIds };
    return Object.freeze({ ...base, entryFingerprint: sha256(base) });
  });
  const normalizedRelations = relations.sort((a, b) => a.relationFingerprint.localeCompare(b.relationFingerprint));
  const base = {
    recordType: "observation_history" as const,
    schemaVersion: P3_1_SCHEMA_VERSION,
    asOf: normalizedAsOf,
    entries: Object.freeze(entries),
    relations: Object.freeze(normalizedRelations),
    authorization: OBSERVATION_AUTHORIZATION,
  };
  return Object.freeze({ ...base, historyFingerprint: sha256(base) });
}

export function assertObservationHistoryIntegrity(history: ObservationHistory): void {
  if (!history || history.recordType !== "observation_history" || history.schemaVersion !== P3_1_SCHEMA_VERSION) throw new Error("observation_history_invalid");
  const rebuilt = buildObservationHistory(history.entries.map((entry) => entry.observation), history.asOf);
  if (rebuilt.historyFingerprint !== history.historyFingerprint || stableSerialize(rebuilt) !== stableSerialize(history)) throw new Error("observation_history_fingerprint_mismatch");
  const graph = new Map<string, string>();
  for (const relationEntry of history.relations) {
    if (relationEntry.relationType !== "supersedes") continue;
    if (relationEntry.fromObservationId === relationEntry.toObservationId) throw new Error("observation_history_supersession_cycle");
    graph.set(relationEntry.toObservationId, relationEntry.fromObservationId);
  }
  for (const start of graph.keys()) {
    const seen = new Set<string>();
    let current: string | undefined = start;
    while (current) {
      if (seen.has(current)) throw new Error("observation_history_supersession_cycle");
      seen.add(current);
      current = graph.get(current);
    }
  }
}

function normalizeQuery(query: ObservationQuery): Required<Pick<ObservationQuery, "observationKinds" | "sourceKinds" | "lifecycles" | "freshness" | "sort" | "page">> & Pick<ObservationQuery, "siteId" | "urlId"> {
  const observationKinds = [...new Set(query.observationKinds ?? [])].map((value) => sanitizeText(value, P3_1_LIMITS.observationKindLength, "observation_query_kind_invalid")).sort();
  const sourceKinds = [...new Set(query.sourceKinds ?? [])].map((value) => sanitizeText(value, P3_1_LIMITS.provenanceKindLength, "observation_query_source_kind_invalid")).sort();
  if (observationKinds.length > P3_1_LIMITS.queryKinds || sourceKinds.length > P3_1_LIMITS.querySourceKinds) throw new Error("observation_query_filter_limit_exceeded");
  const lifecycles = [...new Set(query.lifecycles ?? [])].sort();
  if (lifecycles.some((value) => !["current", "superseded", "conflicting"].includes(value))) throw new Error("observation_query_lifecycle_invalid");
  const freshness = [...new Set(query.freshness ?? [])].sort();
  if (freshness.some((value) => !["fresh", "stale"].includes(value))) throw new Error("observation_query_freshness_invalid");
  const sort = query.sort ?? { field: "observedAt" as const, direction: "desc" as const };
  if (!(["observedAt", "observationKind", "observationId"] as const).includes(sort.field) || !(["asc", "desc"] as const).includes(sort.direction)) throw new Error("observation_query_sort_invalid");
  const page = query.page ?? { offset: 0, limit: 100 };
  if (!Number.isInteger(page.offset) || page.offset < 0 || page.offset > P3_1_LIMITS.queryOffset || !Number.isInteger(page.limit) || page.limit < 1 || page.limit > P3_1_LIMITS.queryLimit) throw new Error("observation_query_page_invalid");
  const siteId = query.siteId === undefined ? undefined : normalizeSiteId(query.siteId);
  const urlId = query.urlId === undefined ? undefined : requireFingerprint(query.urlId, "observation_query_url_id_invalid");
  return { siteId, urlId, observationKinds, sourceKinds, lifecycles, freshness, sort, page };
}

export function queryObservationHistory(history: ObservationHistory, query: ObservationQuery = {}): ObservationQueryResult {
  assertObservationHistoryIntegrity(history);
  const normalized = normalizeQuery(query);
  let rows = history.entries.filter((entry) => {
    if (normalized.siteId && entry.observation.subject.siteId !== normalized.siteId) return false;
    if (normalized.urlId && entry.observation.subject.urlId !== normalized.urlId) return false;
    if (normalized.observationKinds.length && !normalized.observationKinds.includes(entry.observation.observationKind)) return false;
    if (normalized.sourceKinds.length && !normalized.sourceKinds.includes(entry.observation.provenance.sourceKind)) return false;
    if (normalized.lifecycles.length && !normalized.lifecycles.includes(entry.lifecycle)) return false;
    if (normalized.freshness.length && !normalized.freshness.includes(entry.freshness)) return false;
    return true;
  });
  const direction = normalized.sort.direction === "asc" ? 1 : -1;
  rows = rows.sort((a, b) => {
    let compared: number;
    if (normalized.sort.field === "observedAt") compared = a.observation.freshnessPolicy.observedAt.localeCompare(b.observation.freshnessPolicy.observedAt);
    else if (normalized.sort.field === "observationKind") compared = a.observation.observationKind.localeCompare(b.observation.observationKind);
    else compared = a.observation.observationId.localeCompare(b.observation.observationId);
    return compared * direction || a.observation.observationId.localeCompare(b.observation.observationId);
  });
  const totalMatched = rows.length;
  const sliced = rows.slice(normalized.page.offset, normalized.page.offset + normalized.page.limit);
  const queryFingerprint = sha256(normalized);
  const page = { offset: normalized.page.offset, limit: normalized.page.limit, returned: sliced.length, totalMatched, hasMore: normalized.page.offset + sliced.length < totalMatched };
  const base = { recordType: "observation_query_result" as const, schemaVersion: P3_1_SCHEMA_VERSION, queryFingerprint, rows: Object.freeze(sliced), page, authorization: OBSERVATION_AUTHORIZATION };
  return Object.freeze({ ...base, resultFingerprint: sha256(base) });
}

function technicalEvidenceReference(evidence: TechnicalEvidence): ObservationEvidenceReference {
  const base = {
    evidenceId: requireFingerprint(evidence.evidenceId, "observation_adapter_evidence_id_invalid"),
    evidenceFingerprint: requireFingerprint(evidence.fingerprint, "observation_adapter_evidence_fingerprint_invalid"),
    sourceKind: `p2_8:${evidence.source}`,
    sourceFingerprint: requireFingerprint(evidence.sourceFingerprint, "observation_adapter_evidence_source_fingerprint_invalid"),
    dimension: evidence.dimension,
    quality: evidence.quality,
    availability: evidence.availability,
  };
  return { ...base, referenceFingerprint: sha256(base) };
}

export function observationFromTechnicalIssue(input: {
  issue: TechnicalIssue;
  observedAt: string;
  freshForMs?: number;
}): ObservationRecord {
  assertTechnicalIssueIntegrity(input.issue);
  const issue = input.issue;
  const subject: ObservationSubject = issue.affectedUrl
    ? { kind: "url", siteId: issue.siteId, canonicalOrigin: issue.canonicalOrigin, urlId: issue.affectedUrl.urlId, canonicalUrl: issue.affectedUrl.canonicalUrl }
    : { kind: "site", siteId: issue.siteId, canonicalOrigin: issue.canonicalOrigin, urlId: null, canonicalUrl: null };
  const evidenceReferences = issue.evidence.map(technicalEvidenceReference);
  return createObservation({
    subject,
    observationKind: `technical_issue:${issue.typeId}`,
    materialValue: {
      typeId: issue.typeId,
      category: issue.category,
      severity: issue.severity,
      confidence: issue.confidence,
      status: issue.status,
      issueKey: issue.issueKey,
      issueFingerprint: issue.fingerprint,
      evidenceSetFingerprint: issue.evidenceSetFingerprint,
    },
    evidenceReferences,
    provenance: {
      sourceKind: "p2_8_technical_issue",
      sourceFingerprint: issue.fingerprint,
      collectorId: "p2_8_technical_issue_evidence_model",
    },
    confidence: issue.confidence,
    observedAt: input.observedAt,
    freshForMs: input.freshForMs,
    retentionClass: "operational_history",
  });
}
