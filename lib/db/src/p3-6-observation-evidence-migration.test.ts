import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import postgres from "postgres";

const TARGET_TABLES = Object.freeze([
  "seo_evidence",
  "seo_observation",
  "seo_observation_evidence",
] as const);

const EXPECTED_COLUMNS = Object.freeze({
  seo_observation: Object.freeze([
    ["observation_id", "character", 64, "NO"],
    ["schema_version", "character varying", 32, "NO"],
    ["semantic_key", "character", 64, "NO"],
    ["subject_kind", "character varying", 16, "NO"],
    ["site_id", "character varying", 160, "NO"],
    ["canonical_origin", "text", null, "NO"],
    ["url_id", "character", 64, "YES"],
    ["canonical_url", "text", null, "YES"],
    ["observation_kind", "character varying", 180, "NO"],
    ["material_value", "jsonb", null, "NO"],
    ["value_fingerprint", "character", 64, "NO"],
    ["evidence_set_fingerprint", "character", 64, "NO"],
    ["source_kind", "character varying", 120, "NO"],
    ["source_fingerprint", "character", 64, "NO"],
    ["collector_id", "character varying", 160, "NO"],
    ["provenance_fingerprint", "character", 64, "NO"],
    ["confidence", "character varying", 16, "NO"],
    ["observed_at", "timestamp with time zone", null, "NO"],
    ["fresh_for_ms", "bigint", null, "NO"],
    ["stale_after", "timestamp with time zone", null, "NO"],
    ["retention_class", "character varying", 32, "NO"],
    ["record_fingerprint", "character", 64, "NO"],
  ]),
  seo_evidence: Object.freeze([
    ["reference_fingerprint", "character", 64, "NO"],
    ["evidence_id", "character", 64, "NO"],
    ["evidence_fingerprint", "character", 64, "NO"],
    ["source_kind", "character varying", 120, "NO"],
    ["source_fingerprint", "character", 64, "NO"],
    ["dimension", "character varying", 120, "NO"],
    ["quality", "character varying", 40, "NO"],
    ["availability", "character varying", 16, "NO"],
  ]),
  seo_observation_evidence: Object.freeze([
    ["observation_id", "character", 64, "NO"],
    ["reference_fingerprint", "character", 64, "NO"],
  ]),
} as const);

const EXPECTED_CONSTRAINTS = Object.freeze([
  "seo_evidence_availability_allowed",
  "seo_evidence_evidence_fingerprint_hex",
  "seo_evidence_evidence_id_hex",
  "seo_evidence_pkey",
  "seo_evidence_reference_fingerprint_hex",
  "seo_evidence_source_fingerprint_hex",
  "seo_observation_confidence_allowed",
  "seo_observation_evidence_evidence_fk",
  "seo_observation_evidence_observation_fk",
  "seo_observation_evidence_observation_id_hex",
  "seo_observation_evidence_pkey",
  "seo_observation_evidence_reference_fingerprint_hex",
  "seo_observation_evidence_set_fingerprint_hex",
  "seo_observation_fresh_for_ms_bounds",
  "seo_observation_freshness_consistency",
  "seo_observation_observation_id_hex",
  "seo_observation_pkey",
  "seo_observation_provenance_fingerprint_hex",
  "seo_observation_record_fingerprint_hex",
  "seo_observation_retention_class_allowed",
  "seo_observation_semantic_key_hex",
  "seo_observation_source_fingerprint_hex",
  "seo_observation_subject_kind_allowed",
  "seo_observation_subject_url_pair",
  "seo_observation_url_id_hex",
  "seo_observation_value_fingerprint_hex",
] as const);

const EXPECTED_INDEXES = Object.freeze({
  seo_observation_pkey: ["observation_id"],
  idx_seo_observation_semantic_provenance_observed: ["semantic_key", "provenance_fingerprint", "observed_at", "observation_id"],
  idx_seo_observation_semantic_value: ["semantic_key", "value_fingerprint"],
  idx_seo_observation_site_kind_source_observed: ["site_id", "observation_kind", "source_kind", "observed_at"],
  idx_seo_observation_url_kind_observed: ["url_id", "observation_kind", "observed_at"],
  idx_seo_observation_stale_after_site: ["stale_after", "site_id"],
  seo_evidence_pkey: ["reference_fingerprint"],
  idx_seo_evidence_evidence_id: ["evidence_id"],
  idx_seo_evidence_source: ["source_kind", "source_fingerprint"],
  seo_observation_evidence_pkey: ["observation_id", "reference_fingerprint"],
  idx_seo_observation_evidence_reference: ["reference_fingerprint", "observation_id"],
  idx_seo_observation_history_observed: ["site_id", "observed_at"],
  idx_seo_observation_history_site_semantic_observed: ["site_id", "canonical_origin", "semantic_key", "observed_at", "observation_id"],
  idx_seo_observation_history_semantic_provenance_observed: ["site_id", "semantic_key", "provenance_fingerprint", "observed_at", "observation_id"],
  idx_seo_observation_history_kind_source_observed: ["site_id", "observation_kind", "source_kind", "observed_at", "observation_id"],
} as const);

function migrationPath(): string {
  return fileURLToPath(new URL("../migrations/0003_observation_evidence_schema.sql", import.meta.url));
}

function normalizeIndexColumns(indexdef: string): string[] {
  const match = indexdef.match(/\(([^)]+)\)\s*$/);
  assert.ok(match, `index definition missing column list: ${indexdef}`);
  return match[1]!.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
}

test("P3.6 migration source is additive schema-only and fail-closed", async () => {
  const source = await readFile(migrationPath(), "utf8");
  assert.match(source, /^BEGIN;/);
  assert.match(source, /COMMIT;\s*$/);
  assert.equal((source.match(/\bCREATE\s+TABLE\s+/gi) ?? []).length, 3);
  assert.deepEqual(
    [...source.matchAll(/\bCREATE\s+TABLE\s+([a-z_]+)/gi)].map((match) => match[1]).sort(),
    [...TARGET_TABLES].sort(),
  );
  assert.equal(/\bCREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\b/i.test(source), false, "unexpected pre-existing target tables must fail closed");
  assert.equal(/\bDEFAULT\s+(?:now\s*\(|current_timestamp|gen_random_uuid\s*\(|uuid_generate)/i.test(source), false);
  assert.equal(/\bINSERT\s+INTO\b|\bUPDATE\s+[A-Za-z_][A-Za-z0-9_.]*\s+SET\b|\bDELETE\s+FROM\b|\bMERGE\s+INTO\b|\bCOPY\s+[A-Za-z_]/i.test(source), false);
  assert.equal(/history_relation|retention_disposition|quality_assessment|resolution_action/i.test(source), false);
});

test("P3.6 migration applies to the certified runtime baseline and matches the frozen schema contract", async (t) => {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  assert.ok(databaseUrl, "DATABASE_URL is required for the focused P3.6 migration test");
  const sql = postgres(databaseUrl, { max: 1, prepare: false, connect_timeout: 8, idle_timeout: 2 });
  t.after(async () => {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  });

  const before = await sql<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('seo_observation', 'seo_evidence', 'seo_observation_evidence')
    ORDER BY table_name
  `;
  assert.equal(before.length, 0, "target relations must not pre-exist in the migration test baseline");

  const migration = await readFile(migrationPath(), "utf8");
  await sql.unsafe(migration);

  const tables = await sql<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('seo_observation', 'seo_evidence', 'seo_observation_evidence')
    ORDER BY table_name
  `;
  assert.deepEqual(tables.map((row) => row.table_name), TARGET_TABLES);

  const columns = await sql<{
    table_name: keyof typeof EXPECTED_COLUMNS;
    column_name: string;
    data_type: string;
    character_maximum_length: number | null;
    is_nullable: string;
    column_default: string | null;
  }[]>`
    SELECT table_name, column_name, data_type, character_maximum_length, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('seo_observation', 'seo_evidence', 'seo_observation_evidence')
    ORDER BY table_name, ordinal_position
  `;

  for (const table of TARGET_TABLES) {
    const actual = columns
      .filter((row) => row.table_name === table)
      .map((row) => [row.column_name, row.data_type, row.character_maximum_length, row.is_nullable]);
    assert.deepEqual(actual, EXPECTED_COLUMNS[table]);
  }
  assert.ok(columns.every((row) => row.column_default === null), "P3.6 tables must have no database-generated defaults");

  const constraints = await sql<{ constraint_name: string; definition: string }[]>`
    SELECT pc.conname AS constraint_name, pg_get_constraintdef(pc.oid) AS definition
    FROM pg_constraint pc
    JOIN pg_class c ON c.oid = pc.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('seo_observation', 'seo_evidence', 'seo_observation_evidence')
    ORDER BY pc.conname
  `;
  assert.deepEqual(constraints.map((row) => row.constraint_name), [...EXPECTED_CONSTRAINTS].sort());
  const byConstraint = new Map(constraints.map((row) => [row.constraint_name, row.definition] as const));
  assert.match(byConstraint.get("seo_observation_fresh_for_ms_bounds") ?? "", /fresh_for_ms >= 60000.*fresh_for_ms <= 2592000000/i);
  assert.match(byConstraint.get("seo_observation_freshness_consistency") ?? "", /stale_after.*observed_at.*fresh_for_ms/i);
  assert.match(byConstraint.get("seo_observation_subject_url_pair") ?? "", /subject_kind.*site.*url_id IS NULL.*canonical_url IS NULL.*subject_kind.*url.*url_id IS NOT NULL.*canonical_url IS NOT NULL/i);
  assert.match(byConstraint.get("seo_observation_evidence_observation_fk") ?? "", /REFERENCES seo_observation\(observation_id\).*ON DELETE RESTRICT/i);
  assert.match(byConstraint.get("seo_observation_evidence_evidence_fk") ?? "", /REFERENCES seo_evidence\(reference_fingerprint\).*ON DELETE RESTRICT/i);

  const indexes = await sql<{ indexname: string; indexdef: string }[]>`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('seo_observation', 'seo_evidence', 'seo_observation_evidence')
    ORDER BY indexname
  `;
  assert.deepEqual(indexes.map((row) => row.indexname), Object.keys(EXPECTED_INDEXES).sort());
  for (const row of indexes) {
    const expected = EXPECTED_INDEXES[row.indexname as keyof typeof EXPECTED_INDEXES];
    assert.ok(expected, `unexpected index ${row.indexname}`);
    assert.deepEqual(normalizeIndexColumns(row.indexdef), expected);
  }

  const rowCounts = await sql<{ table_name: string; row_count: number }[]>`
    SELECT 'seo_evidence' AS table_name, COUNT(*)::int AS row_count FROM seo_evidence
    UNION ALL
    SELECT 'seo_observation', COUNT(*)::int FROM seo_observation
    UNION ALL
    SELECT 'seo_observation_evidence', COUNT(*)::int FROM seo_observation_evidence
    ORDER BY table_name
  `;
  assert.deepEqual(rowCounts.map((row) => ({ table_name: row.table_name, row_count: row.row_count })), [
    { table_name: "seo_evidence", row_count: 0 },
    { table_name: "seo_observation", row_count: 0 },
    { table_name: "seo_observation_evidence", row_count: 0 },
  ]);
});
