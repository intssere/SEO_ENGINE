import assert from "node:assert/strict";
import test from "node:test";
import { PERSISTENCE_INDEX_INTENTS } from "./observation-evidence-persistence-plan.js";
import {
  P3_2_FIELD_TO_PHYSICAL_COLUMN,
  P3_2_PHYSICAL_INDEX_MAPPINGS,
  P3_3_P3_4_HISTORY_COMPATIBILITY,
  P3_6A_EVIDENCE_TABLE,
  P3_6A_MIGRATION_CONVENTION,
  P3_6A_OBSERVATION_EVIDENCE_TABLE,
  P3_6A_OBSERVATION_TABLE,
  P3_6A_PERSISTED_P3_5_ADVISORY_OUTPUTS,
  P3_6A_SCHEMA_CONTRACT,
  P3_6A_SCHEMA_CONTRACT_FINGERPRINT,
  P3_6A_TABLES,
  P3_6A_TABLE_CONTRACTS,
  POSTGRES_SCHEMA_CONTRACT_AUTHORIZATION,
  assertP36APostgresSchemaContractIntegrity,
} from "./observation-evidence-postgres-schema-contract.js";

function column(table: typeof P3_6A_OBSERVATION_TABLE, name: string) {
  return table.columns.find((candidate) => candidate.name === name);
}

test("P3.6A freezes exactly the three P3.1/P3.2 physical table identities", () => {
  assert.deepEqual(P3_6A_TABLES, {
    observation: "seo_observation",
    evidence: "seo_evidence",
    observationEvidence: "seo_observation_evidence",
  });
  assert.deepEqual(P3_6A_TABLE_CONTRACTS.map((table) => table.name), [
    "seo_observation",
    "seo_evidence",
    "seo_observation_evidence",
  ]);
  assert.doesNotThrow(() => assertP36APostgresSchemaContractIntegrity());
});

test("P3.6A contract fingerprint is deterministic and bound to the frozen contract", () => {
  assert.match(P3_6A_SCHEMA_CONTRACT_FINGERPRINT, /^[a-f0-9]{64}$/);
  assert.equal(P3_6A_SCHEMA_CONTRACT.contractFingerprint, P3_6A_SCHEMA_CONTRACT_FINGERPRINT);
  assert.doesNotThrow(() => assertP36APostgresSchemaContractIntegrity());
});

test("P3.6A preserves P3.1 subject, deterministic identity, caller-time and retention semantics", () => {
  assert.deepEqual(P3_6A_OBSERVATION_TABLE.primaryKey, ["observation_id"]);
  assert.equal(column(P3_6A_OBSERVATION_TABLE, "observation_id")?.type, "char(64)");
  assert.equal(column(P3_6A_OBSERVATION_TABLE, "observation_id")?.nullable, false);
  assert.equal(column(P3_6A_OBSERVATION_TABLE, "url_id")?.nullable, true);
  assert.equal(column(P3_6A_OBSERVATION_TABLE, "canonical_url")?.nullable, true);
  assert.equal(column(P3_6A_OBSERVATION_TABLE, "observed_at")?.type, "timestamptz");
  assert.equal(column(P3_6A_OBSERVATION_TABLE, "stale_after")?.type, "timestamptz");
  assert.equal(column(P3_6A_OBSERVATION_TABLE, "fresh_for_ms")?.type, "bigint");
  assert.ok(P3_6A_OBSERVATION_TABLE.checks.some((check) => check.kind === "subject_url_pair"));
  assert.ok(P3_6A_OBSERVATION_TABLE.checks.some((check) => check.kind === "freshness_consistency"));
  assert.deepEqual(
    P3_6A_OBSERVATION_TABLE.checks.find((check) => check.name === "seo_observation_confidence_allowed")?.allowedValues,
    ["unknown", "low", "medium", "high", "verified"],
  );
  assert.deepEqual(
    P3_6A_OBSERVATION_TABLE.checks.find((check) => check.name === "seo_observation_retention_class_allowed")?.allowedValues,
    ["operational_history", "evidence_lineage", "audit_history"],
  );
});

test("P3.6A models normalized evidence references without inventing uniqueness for evidenceId", () => {
  assert.deepEqual(P3_6A_EVIDENCE_TABLE.primaryKey, ["reference_fingerprint"]);
  assert.equal(P3_6A_EVIDENCE_TABLE.columns.find((candidate) => candidate.name === "evidence_id")?.type, "char(64)");
  assert.equal(P3_6A_EVIDENCE_TABLE.columns.find((candidate) => candidate.name === "evidence_fingerprint")?.type, "char(64)");
  assert.equal(P3_6A_EVIDENCE_TABLE.columns.find((candidate) => candidate.name === "dimension")?.type, "varchar(120)");
  assert.equal(P3_6A_EVIDENCE_TABLE.columns.find((candidate) => candidate.name === "quality")?.type, "varchar(40)");
  assert.deepEqual(
    P3_6A_EVIDENCE_TABLE.checks.find((check) => check.name === "seo_evidence_availability_allowed")?.allowedValues,
    ["available", "unavailable"],
  );
});

test("P3.6A association table preserves the deduped observation-reference relationship with restrictive foreign keys", () => {
  assert.deepEqual(P3_6A_OBSERVATION_EVIDENCE_TABLE.primaryKey, ["observation_id", "reference_fingerprint"]);
  assert.equal(P3_6A_OBSERVATION_EVIDENCE_TABLE.foreignKeys.length, 2);
  const observationFk = P3_6A_OBSERVATION_EVIDENCE_TABLE.foreignKeys.find((key) => key.referencedTable === P3_6A_TABLES.observation);
  const evidenceFk = P3_6A_OBSERVATION_EVIDENCE_TABLE.foreignKeys.find((key) => key.referencedTable === P3_6A_TABLES.evidence);
  assert.deepEqual(observationFk?.columns, ["observation_id"]);
  assert.deepEqual(observationFk?.referencedColumns, ["observation_id"]);
  assert.equal(observationFk?.onDelete, "restrict");
  assert.deepEqual(evidenceFk?.columns, ["reference_fingerprint"]);
  assert.deepEqual(evidenceFk?.referencedColumns, ["reference_fingerprint"]);
  assert.equal(evidenceFk?.onDelete, "restrict");
});

test("P3.6A maps every certified P3.2 index intent to declared physical observation columns in exact order", () => {
  assert.equal(P3_2_PHYSICAL_INDEX_MAPPINGS.length, PERSISTENCE_INDEX_INTENTS.length);
  const declaredColumns = new Set(P3_6A_OBSERVATION_TABLE.columns.map((candidate) => candidate.name));
  for (const intent of PERSISTENCE_INDEX_INTENTS) {
    const mapping = P3_2_PHYSICAL_INDEX_MAPPINGS.find((candidate) => candidate.logicalName === intent.name);
    assert.ok(mapping, `missing mapping for ${intent.name}`);
    assert.equal(mapping.table, P3_6A_TABLES.observation);
    assert.equal(mapping.unique, intent.unique);
    assert.deepEqual(mapping.columns, intent.fields.map((field) => P3_2_FIELD_TO_PHYSICAL_COLUMN[field]));
    assert.ok(mapping.columns.every((physicalColumn) => declaredColumns.has(physicalColumn)));
  }
  assert.equal(P3_2_PHYSICAL_INDEX_MAPPINGS.find((mapping) => mapping.logicalName === "observation_id_unique")?.implementation, "primary_key");
});

test("P3.6A fails closed on P3.3/P3.4 relation and disposition storage rather than inventing a fourth table", () => {
  const mapped = P3_3_P3_4_HISTORY_COMPATIBILITY.filter((item) => item.status === "mapped");
  const deferred = P3_3_P3_4_HISTORY_COMPATIBILITY.filter((item) => item.status === "deferred_relation_or_decision_storage");
  assert.ok(mapped.some((item) => item.logicalIntent === "history_observed_lookup"));
  assert.ok(mapped.some((item) => item.logicalIntent === "history_read_site_semantic_observed"));
  assert.ok(deferred.some((item) => item.logicalIntent === "history_relation_fingerprint_unique"));
  assert.ok(deferred.some((item) => item.logicalIntent === "history_read_relation_from"));
  assert.ok(deferred.some((item) => item.logicalIntent === "retention_class_disposition_lookup"));
  assert.ok(deferred.every((item) => item.table === null && item.columns.length === 0));
  assert.equal(P3_6A_TABLE_CONTRACTS.length, 3);
});

test("P3.6A explicitly excludes P3.5 advisory outputs and keeps every live capability fail-closed", () => {
  assert.deepEqual(P3_6A_PERSISTED_P3_5_ADVISORY_OUTPUTS, []);
  assert.ok(Object.keys(POSTGRES_SCHEMA_CONTRACT_AUTHORIZATION).length > 0);
  assert.ok(Object.values(POSTGRES_SCHEMA_CONTRACT_AUTHORIZATION).every((value) => value === false));
  assert.equal(POSTGRES_SCHEMA_CONTRACT_AUTHORIZATION.ddlEnabled, false);
  assert.equal(POSTGRES_SCHEMA_CONTRACT_AUTHORIZATION.dmlEnabled, false);
  assert.equal(POSTGRES_SCHEMA_CONTRACT_AUTHORIZATION.realDatabaseClientEnabled, false);
  assert.equal(POSTGRES_SCHEMA_CONTRACT_AUTHORIZATION.migrationExecutionEnabled, false);
  assert.equal(POSTGRES_SCHEMA_CONTRACT_AUTHORIZATION.publicationAuthorized, false);
});

test("P3.6A records the repository's actual migration convention rather than the stale 028 assumption", () => {
  assert.equal(P3_6A_MIGRATION_CONVENTION.canonicalDirectory, "lib/db/migrations");
  assert.deepEqual(P3_6A_MIGRATION_CONVENTION.baselineMigrationFiles, ["0001_core.sql", "0002_auth.sql"]);
  assert.equal(P3_6A_MIGRATION_CONVENTION.nextSequenceAtCertifiedBaseline, "0003");
  assert.equal(P3_6A_MIGRATION_CONVENTION.mustReverifyImmediatelyBeforeDdlAuthoring, true);
});
