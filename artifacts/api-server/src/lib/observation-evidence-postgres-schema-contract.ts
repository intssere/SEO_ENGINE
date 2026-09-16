import { createHash } from "node:crypto";
import { P3_1_LIMITS } from "./observation-evidence-persistence-design.js";
import {
  PERSISTENCE_INDEX_INTENTS,
  type PersistenceIndexField,
} from "./observation-evidence-persistence-plan.js";

export const P3_6A_SCHEMA_VERSION = "p3_6a_v1" as const;

export const POSTGRES_SCHEMA_CONTRACT_AUTHORIZATION = Object.freeze({
  productionPersistenceEnabled: false,
  productionReadModelRuntimeEnabled: false,
  productionDatabaseReadsEnabled: false,
  ddlEnabled: false,
  dmlEnabled: false,
  realDatabaseClientEnabled: false,
  migrationExecutionEnabled: false,
  archiveExecutionEnabled: false,
  pruneExecutionEnabled: false,
  destructiveDeleteEnabled: false,
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

export type PostgresSchemaContractAuthorization = typeof POSTGRES_SCHEMA_CONTRACT_AUTHORIZATION;

export const P3_6A_TABLES = Object.freeze({
  observation: "seo_observation",
  evidence: "seo_evidence",
  observationEvidence: "seo_observation_evidence",
} as const);

export type P36ATableName = typeof P3_6A_TABLES[keyof typeof P3_6A_TABLES];

export type PostgresColumnTypeIntent =
  | "char(64)"
  | "varchar(16)"
  | "varchar(32)"
  | "varchar(40)"
  | "varchar(120)"
  | "varchar(160)"
  | "varchar(180)"
  | "text"
  | "jsonb"
  | "bigint"
  | "timestamptz";

export type PostgresColumnContract = {
  name: string;
  type: PostgresColumnTypeIntent;
  nullable: boolean;
  semanticSource: string;
};

export type PostgresForeignKeyContract = {
  name: string;
  columns: readonly string[];
  referencedTable: P36ATableName;
  referencedColumns: readonly string[];
  onDelete: "restrict";
};

export type PostgresCheckConstraintContract = {
  name: string;
  kind:
    | "fingerprint_hex_64"
    | "enum"
    | "subject_url_pair"
    | "positive_bounded_integer"
    | "freshness_consistency";
  columns: readonly string[];
  allowedValues?: readonly string[];
  min?: number;
  max?: number;
};

export type PostgresTableContract = {
  name: P36ATableName;
  columns: readonly PostgresColumnContract[];
  primaryKey: readonly string[];
  foreignKeys: readonly PostgresForeignKeyContract[];
  checks: readonly PostgresCheckConstraintContract[];
};

const fingerprintCheck = (name: string, column: string): PostgresCheckConstraintContract => Object.freeze({
  name,
  kind: "fingerprint_hex_64" as const,
  columns: Object.freeze([column]),
});

export const P3_6A_OBSERVATION_TABLE: PostgresTableContract = Object.freeze({
  name: P3_6A_TABLES.observation,
  columns: Object.freeze([
    { name: "observation_id", type: "char(64)", nullable: false, semanticSource: "ObservationRecord.observationId" },
    { name: "schema_version", type: "varchar(32)", nullable: false, semanticSource: "ObservationRecord.schemaVersion" },
    { name: "semantic_key", type: "char(64)", nullable: false, semanticSource: "ObservationRecord.semanticKey" },
    { name: "subject_kind", type: "varchar(16)", nullable: false, semanticSource: "ObservationRecord.subject.kind" },
    { name: "site_id", type: "varchar(160)", nullable: false, semanticSource: "ObservationRecord.subject.siteId" },
    { name: "canonical_origin", type: "text", nullable: false, semanticSource: "ObservationRecord.subject.canonicalOrigin" },
    { name: "url_id", type: "char(64)", nullable: true, semanticSource: "ObservationRecord.subject.urlId" },
    { name: "canonical_url", type: "text", nullable: true, semanticSource: "ObservationRecord.subject.canonicalUrl" },
    { name: "observation_kind", type: "varchar(180)", nullable: false, semanticSource: "ObservationRecord.observationKind" },
    { name: "material_value", type: "jsonb", nullable: false, semanticSource: "ObservationRecord.materialValue" },
    { name: "value_fingerprint", type: "char(64)", nullable: false, semanticSource: "ObservationRecord.valueFingerprint" },
    { name: "evidence_set_fingerprint", type: "char(64)", nullable: false, semanticSource: "ObservationRecord.evidenceSetFingerprint" },
    { name: "source_kind", type: "varchar(120)", nullable: false, semanticSource: "ObservationRecord.provenance.sourceKind" },
    { name: "source_fingerprint", type: "char(64)", nullable: false, semanticSource: "ObservationRecord.provenance.sourceFingerprint" },
    { name: "collector_id", type: "varchar(160)", nullable: false, semanticSource: "ObservationRecord.provenance.collectorId" },
    { name: "provenance_fingerprint", type: "char(64)", nullable: false, semanticSource: "ObservationRecord.provenance.provenanceFingerprint" },
    { name: "confidence", type: "varchar(16)", nullable: false, semanticSource: "ObservationRecord.confidence" },
    { name: "observed_at", type: "timestamptz", nullable: false, semanticSource: "ObservationRecord.freshnessPolicy.observedAt" },
    { name: "fresh_for_ms", type: "bigint", nullable: false, semanticSource: "ObservationRecord.freshnessPolicy.freshForMs" },
    { name: "stale_after", type: "timestamptz", nullable: false, semanticSource: "ObservationRecord.freshnessPolicy.staleAfter" },
    { name: "retention_class", type: "varchar(32)", nullable: false, semanticSource: "ObservationRecord.retentionClass" },
    { name: "record_fingerprint", type: "char(64)", nullable: false, semanticSource: "ObservationRecord.recordFingerprint" },
  ] satisfies readonly PostgresColumnContract[]),
  primaryKey: Object.freeze(["observation_id"]),
  foreignKeys: Object.freeze([]),
  checks: Object.freeze([
    fingerprintCheck("seo_observation_observation_id_hex", "observation_id"),
    fingerprintCheck("seo_observation_semantic_key_hex", "semantic_key"),
    fingerprintCheck("seo_observation_url_id_hex", "url_id"),
    fingerprintCheck("seo_observation_value_fingerprint_hex", "value_fingerprint"),
    fingerprintCheck("seo_observation_evidence_set_fingerprint_hex", "evidence_set_fingerprint"),
    fingerprintCheck("seo_observation_source_fingerprint_hex", "source_fingerprint"),
    fingerprintCheck("seo_observation_provenance_fingerprint_hex", "provenance_fingerprint"),
    fingerprintCheck("seo_observation_record_fingerprint_hex", "record_fingerprint"),
    { name: "seo_observation_subject_kind_allowed", kind: "enum", columns: Object.freeze(["subject_kind"]), allowedValues: Object.freeze(["site", "url"]) },
    { name: "seo_observation_confidence_allowed", kind: "enum", columns: Object.freeze(["confidence"]), allowedValues: Object.freeze(["unknown", "low", "medium", "high", "verified"]) },
    { name: "seo_observation_retention_class_allowed", kind: "enum", columns: Object.freeze(["retention_class"]), allowedValues: Object.freeze(["operational_history", "evidence_lineage", "audit_history"]) },
    { name: "seo_observation_subject_url_pair", kind: "subject_url_pair", columns: Object.freeze(["subject_kind", "url_id", "canonical_url"]) },
    { name: "seo_observation_fresh_for_ms_bounds", kind: "positive_bounded_integer", columns: Object.freeze(["fresh_for_ms"]), min: P3_1_LIMITS.minFreshForMs, max: P3_1_LIMITS.maxFreshForMs },
    { name: "seo_observation_freshness_consistency", kind: "freshness_consistency", columns: Object.freeze(["observed_at", "fresh_for_ms", "stale_after"]) },
  ] satisfies readonly PostgresCheckConstraintContract[]),
});

export const P3_6A_EVIDENCE_TABLE: PostgresTableContract = Object.freeze({
  name: P3_6A_TABLES.evidence,
  columns: Object.freeze([
    { name: "reference_fingerprint", type: "char(64)", nullable: false, semanticSource: "ObservationEvidenceReference.referenceFingerprint" },
    { name: "evidence_id", type: "char(64)", nullable: false, semanticSource: "ObservationEvidenceReference.evidenceId" },
    { name: "evidence_fingerprint", type: "char(64)", nullable: false, semanticSource: "ObservationEvidenceReference.evidenceFingerprint" },
    { name: "source_kind", type: "varchar(120)", nullable: false, semanticSource: "ObservationEvidenceReference.sourceKind" },
    { name: "source_fingerprint", type: "char(64)", nullable: false, semanticSource: "ObservationEvidenceReference.sourceFingerprint" },
    { name: "dimension", type: "varchar(120)", nullable: false, semanticSource: "ObservationEvidenceReference.dimension" },
    { name: "quality", type: "varchar(40)", nullable: false, semanticSource: "ObservationEvidenceReference.quality" },
    { name: "availability", type: "varchar(16)", nullable: false, semanticSource: "ObservationEvidenceReference.availability" },
  ] satisfies readonly PostgresColumnContract[]),
  primaryKey: Object.freeze(["reference_fingerprint"]),
  foreignKeys: Object.freeze([]),
  checks: Object.freeze([
    fingerprintCheck("seo_evidence_reference_fingerprint_hex", "reference_fingerprint"),
    fingerprintCheck("seo_evidence_evidence_id_hex", "evidence_id"),
    fingerprintCheck("seo_evidence_evidence_fingerprint_hex", "evidence_fingerprint"),
    fingerprintCheck("seo_evidence_source_fingerprint_hex", "source_fingerprint"),
    { name: "seo_evidence_availability_allowed", kind: "enum", columns: Object.freeze(["availability"]), allowedValues: Object.freeze(["available", "unavailable"]) },
  ] satisfies readonly PostgresCheckConstraintContract[]),
});

export const P3_6A_OBSERVATION_EVIDENCE_TABLE: PostgresTableContract = Object.freeze({
  name: P3_6A_TABLES.observationEvidence,
  columns: Object.freeze([
    { name: "observation_id", type: "char(64)", nullable: false, semanticSource: "ObservationRecord.observationId" },
    { name: "reference_fingerprint", type: "char(64)", nullable: false, semanticSource: "ObservationEvidenceReference.referenceFingerprint" },
  ] satisfies readonly PostgresColumnContract[]),
  primaryKey: Object.freeze(["observation_id", "reference_fingerprint"]),
  foreignKeys: Object.freeze([
    { name: "seo_observation_evidence_observation_fk", columns: Object.freeze(["observation_id"]), referencedTable: P3_6A_TABLES.observation, referencedColumns: Object.freeze(["observation_id"]), onDelete: "restrict" },
    { name: "seo_observation_evidence_evidence_fk", columns: Object.freeze(["reference_fingerprint"]), referencedTable: P3_6A_TABLES.evidence, referencedColumns: Object.freeze(["reference_fingerprint"]), onDelete: "restrict" },
  ] satisfies readonly PostgresForeignKeyContract[]),
  checks: Object.freeze([
    fingerprintCheck("seo_observation_evidence_observation_id_hex", "observation_id"),
    fingerprintCheck("seo_observation_evidence_reference_fingerprint_hex", "reference_fingerprint"),
  ] satisfies readonly PostgresCheckConstraintContract[]),
});

export const P3_6A_TABLE_CONTRACTS: readonly PostgresTableContract[] = Object.freeze([
  P3_6A_OBSERVATION_TABLE,
  P3_6A_EVIDENCE_TABLE,
  P3_6A_OBSERVATION_EVIDENCE_TABLE,
]);

export const P3_2_FIELD_TO_PHYSICAL_COLUMN: Readonly<Record<PersistenceIndexField, string>> = Object.freeze({
  observationId: "observation_id",
  semanticKey: "semantic_key",
  valueFingerprint: "value_fingerprint",
  provenanceFingerprint: "provenance_fingerprint",
  siteId: "site_id",
  urlId: "url_id",
  observationKind: "observation_kind",
  sourceKind: "source_kind",
  observedAt: "observed_at",
  staleAfter: "stale_after",
});

export type PhysicalIndexMapping = {
  logicalName: string;
  table: P36ATableName;
  implementation: "primary_key" | "index";
  physicalName: string;
  unique: boolean;
  columns: readonly string[];
  purpose: string;
};

const PHYSICAL_INDEX_NAMES: Readonly<Record<string, string>> = Object.freeze({
  observation_id_unique: "seo_observation_pkey",
  semantic_provenance_observed_order: "idx_seo_observation_semantic_provenance_observed",
  semantic_value_lookup: "idx_seo_observation_semantic_value",
  site_kind_source_observed: "idx_seo_observation_site_kind_source_observed",
  url_kind_observed: "idx_seo_observation_url_kind_observed",
  stale_after_lookup: "idx_seo_observation_stale_after_site",
});

export const P3_2_PHYSICAL_INDEX_MAPPINGS: readonly PhysicalIndexMapping[] = Object.freeze(
  PERSISTENCE_INDEX_INTENTS.map((intent) => Object.freeze({
    logicalName: intent.name,
    table: P3_6A_TABLES.observation,
    implementation: intent.name === "observation_id_unique" ? "primary_key" as const : "index" as const,
    physicalName: PHYSICAL_INDEX_NAMES[intent.name] ?? `idx_seo_observation_${intent.name}`,
    unique: intent.unique,
    columns: Object.freeze(intent.fields.map((field) => P3_2_FIELD_TO_PHYSICAL_COLUMN[field])),
    purpose: intent.purpose,
  })),
);

export const P3_6A_EVIDENCE_INDEXES: readonly PhysicalIndexMapping[] = Object.freeze([
  Object.freeze({ logicalName: "evidence_id_lookup", table: P3_6A_TABLES.evidence, implementation: "index" as const, physicalName: "idx_seo_evidence_evidence_id", unique: false, columns: Object.freeze(["evidence_id"]), purpose: "evidence_lookup" }),
  Object.freeze({ logicalName: "evidence_source_lookup", table: P3_6A_TABLES.evidence, implementation: "index" as const, physicalName: "idx_seo_evidence_source", unique: false, columns: Object.freeze(["source_kind", "source_fingerprint"]), purpose: "evidence_lookup" }),
  Object.freeze({ logicalName: "observation_evidence_reference_lookup", table: P3_6A_TABLES.observationEvidence, implementation: "index" as const, physicalName: "idx_seo_observation_evidence_reference", unique: false, columns: Object.freeze(["reference_fingerprint", "observation_id"]), purpose: "association_lookup" }),
]);

export type HistoryCompatibilityMapping = {
  logicalIntent: string;
  status: "mapped" | "deferred_relation_or_decision_storage";
  table: P36ATableName | null;
  columns: readonly string[];
  reason: string;
};

export const P3_3_P3_4_HISTORY_COMPATIBILITY: readonly HistoryCompatibilityMapping[] = Object.freeze([
  Object.freeze({ logicalIntent: "history_observed_lookup", status: "mapped" as const, table: P3_6A_TABLES.observation, columns: Object.freeze(["site_id", "observed_at"]), reason: "P3.3 fields are intrinsic observation columns." }),
  Object.freeze({ logicalIntent: "history_read_site_semantic_observed", status: "mapped" as const, table: P3_6A_TABLES.observation, columns: Object.freeze(["site_id", "canonical_origin", "semantic_key", "observed_at", "observation_id"]), reason: "P3.4 timeline fields are intrinsic observation columns." }),
  Object.freeze({ logicalIntent: "history_read_semantic_provenance_observed", status: "mapped" as const, table: P3_6A_TABLES.observation, columns: Object.freeze(["site_id", "semantic_key", "provenance_fingerprint", "observed_at", "observation_id"]), reason: "P3.4 provenance fields are intrinsic observation columns." }),
  Object.freeze({ logicalIntent: "history_read_kind_source_observed", status: "mapped" as const, table: P3_6A_TABLES.observation, columns: Object.freeze(["site_id", "observation_kind", "source_kind", "observed_at", "observation_id"]), reason: "P3.4 provenance timeline fields are intrinsic observation columns." }),
  Object.freeze({ logicalIntent: "history_relation_fingerprint_unique", status: "deferred_relation_or_decision_storage" as const, table: null, columns: Object.freeze([]), reason: "P3.3 relation intents are a distinct storage-neutral entity and #188 limits its first DDL scope to the three P3.1/P3.2 observation/evidence tables." }),
  Object.freeze({ logicalIntent: "history_relation_from_lookup", status: "deferred_relation_or_decision_storage" as const, table: null, columns: Object.freeze([]), reason: "Requires durable history-relation storage not frozen by P3.1/P3.2." }),
  Object.freeze({ logicalIntent: "history_relation_to_lookup", status: "deferred_relation_or_decision_storage" as const, table: null, columns: Object.freeze([]), reason: "Requires durable history-relation storage not frozen by P3.1/P3.2." }),
  Object.freeze({ logicalIntent: "history_semantic_relation_lookup", status: "deferred_relation_or_decision_storage" as const, table: null, columns: Object.freeze([]), reason: "Requires durable history-relation storage not frozen by P3.1/P3.2." }),
  Object.freeze({ logicalIntent: "retention_class_disposition_lookup", status: "deferred_relation_or_decision_storage" as const, table: null, columns: Object.freeze([]), reason: "Retention disposition is a P3.3 decision artifact, not an intrinsic P3.1 observation field." }),
  Object.freeze({ logicalIntent: "history_read_retention_disposition", status: "deferred_relation_or_decision_storage" as const, table: null, columns: Object.freeze([]), reason: "Retention disposition persistence is not part of the three-table P3.1/P3.2 contract." }),
  Object.freeze({ logicalIntent: "history_read_relation_from", status: "deferred_relation_or_decision_storage" as const, table: null, columns: Object.freeze([]), reason: "Requires durable history-relation storage not frozen by P3.1/P3.2." }),
  Object.freeze({ logicalIntent: "history_read_relation_to", status: "deferred_relation_or_decision_storage" as const, table: null, columns: Object.freeze([]), reason: "Requires durable history-relation storage not frozen by P3.1/P3.2." }),
]);

export const P3_6A_MIGRATION_CONVENTION = Object.freeze({
  canonicalDirectory: "lib/db/migrations",
  baselineMigrationFiles: Object.freeze(["0001_core.sql", "0002_auth.sql"] as const),
  nextSequenceAtCertifiedBaseline: "0003",
  mustReverifyImmediatelyBeforeDdlAuthoring: true,
} as const);

export const P3_6A_PERSISTED_P3_5_ADVISORY_OUTPUTS: readonly string[] = Object.freeze([]);

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

function schemaContractBase() {
  return {
    schemaVersion: P3_6A_SCHEMA_VERSION,
    tables: P3_6A_TABLE_CONTRACTS,
    p3_2IndexMappings: P3_2_PHYSICAL_INDEX_MAPPINGS,
    evidenceIndexes: P3_6A_EVIDENCE_INDEXES,
    historyCompatibility: P3_3_P3_4_HISTORY_COMPATIBILITY,
    migrationConvention: P3_6A_MIGRATION_CONVENTION,
    persistedP3_5AdvisoryOutputs: P3_6A_PERSISTED_P3_5_ADVISORY_OUTPUTS,
    authorization: POSTGRES_SCHEMA_CONTRACT_AUTHORIZATION,
  };
}

export const P3_6A_SCHEMA_CONTRACT_FINGERPRINT = sha256(schemaContractBase());

export const P3_6A_SCHEMA_CONTRACT = Object.freeze({
  ...schemaContractBase(),
  contractFingerprint: P3_6A_SCHEMA_CONTRACT_FINGERPRINT,
});

function assertUnique(values: readonly string[], code: string): void {
  if (new Set(values).size !== values.length) throw new Error(code);
}

export function assertP36APostgresSchemaContractIntegrity(): void {
  if (P3_6A_SCHEMA_CONTRACT.schemaVersion !== P3_6A_SCHEMA_VERSION) throw new Error("p3_6a_schema_version_mismatch");
  if (sha256(schemaContractBase()) !== P3_6A_SCHEMA_CONTRACT.contractFingerprint) throw new Error("p3_6a_contract_fingerprint_mismatch");
  if (P3_6A_TABLE_CONTRACTS.length !== 3) throw new Error("p3_6a_table_count_invalid");
  assertUnique(P3_6A_TABLE_CONTRACTS.map((table) => table.name), "p3_6a_table_name_duplicate");

  const tablesByName = new Map(P3_6A_TABLE_CONTRACTS.map((table) => [table.name, table] as const));
  for (const table of P3_6A_TABLE_CONTRACTS) {
    const columnNames = table.columns.map((column) => column.name);
    assertUnique(columnNames, `p3_6a_${table.name}_column_duplicate`);
    if (table.primaryKey.length === 0 || table.primaryKey.some((column) => !columnNames.includes(column))) {
      throw new Error(`p3_6a_${table.name}_primary_key_invalid`);
    }
    if (table.primaryKey.some((column) => table.columns.find((candidate) => candidate.name === column)?.nullable !== false)) {
      throw new Error(`p3_6a_${table.name}_primary_key_nullable`);
    }
    for (const foreignKey of table.foreignKeys) {
      if (foreignKey.columns.some((column) => !columnNames.includes(column))) throw new Error("p3_6a_foreign_key_source_invalid");
      const referenced = tablesByName.get(foreignKey.referencedTable);
      if (!referenced || foreignKey.referencedColumns.some((column) => !referenced.columns.some((candidate) => candidate.name === column))) {
        throw new Error("p3_6a_foreign_key_target_invalid");
      }
      if (foreignKey.columns.length !== foreignKey.referencedColumns.length) throw new Error("p3_6a_foreign_key_arity_invalid");
    }
    for (const check of table.checks) {
      if (check.columns.some((column) => !columnNames.includes(column))) throw new Error("p3_6a_check_column_invalid");
    }
  }

  const observationColumns = new Set(P3_6A_OBSERVATION_TABLE.columns.map((column) => column.name));
  if (P3_2_PHYSICAL_INDEX_MAPPINGS.length !== PERSISTENCE_INDEX_INTENTS.length) throw new Error("p3_6a_p3_2_index_mapping_count_mismatch");
  for (const mapping of P3_2_PHYSICAL_INDEX_MAPPINGS) {
    if (mapping.table !== P3_6A_TABLES.observation || mapping.columns.some((column) => !observationColumns.has(column))) {
      throw new Error("p3_6a_p3_2_index_mapping_invalid");
    }
  }
  if (P3_6A_PERSISTED_P3_5_ADVISORY_OUTPUTS.length !== 0) throw new Error("p3_6a_p3_5_persistence_forbidden");
  if (!Object.values(POSTGRES_SCHEMA_CONTRACT_AUTHORIZATION).every((value) => value === false)) {
    throw new Error("p3_6a_authorization_must_fail_closed");
  }
}
