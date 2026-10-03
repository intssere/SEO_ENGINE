import { createHash } from "node:crypto";

export const P12_2_L7_1_VERSION = "p12-2-l7-1-0008-readonly-cert-v1" as const;
export const P12_2_L7_1_PROJECT_ID = "52265e29-921b-4652-ac0d-9da4e5e69936" as const;
export const P12_2_L7_1_ENVIRONMENT_ID = "7f8d920f-f6c6-44f0-b9fe-252cb4f32298" as const;
export const P12_2_L7_1_POSTGRES_SERVICE_ID = "b69e0633-7ab9-40ab-85f3-c9edd6acb031" as const;
export const P12_2_L7_1_SITE_ID = "eb1da9ee-539c-4200-8f04-f64ccaea7768" as const;
export const P12_2_L7_1_MIGRATION_PATH = "lib/db/migrations/0008_first_party_crawl_l2_invocations.sql" as const;
export const P12_2_L7_1_MIGRATION_BLOB_SHA = "1635c7da4cb1deac343b1d6aa73f334e1dd7e15a" as const;
export const P12_2_L7_1_MIGRATION_SHA256 = "a3604fc210374392426e1a75a1dacc3a89651942466ff4b6d76c620e120dd25b" as const;

export const P12_2_L7_1_LEGACY_TABLES = [
  "first_party_crawl_checkpoints",
  "first_party_crawl_completed_runs",
  "first_party_crawl_incremental_receipts",
] as const;

export type P122L71Query = {
  id:
    | "database_identity"
    | "public_base_table_count"
    | "l2_object_any_schema"
    | "l2_column_contract"
    | "l2_constraint_contract"
    | "l2_index_contract"
    | "legacy_p12_inventory"
    | "legacy_p12_columns"
    | "exact_site_binding";
  sql: string;
};

const LEGACY_NAMES_SQL = P12_2_L7_1_LEGACY_TABLES.map((name) => `\'${name}\'`).join(", ");

export const P12_2_L7_1_QUERIES: readonly P122L71Query[] = Object.freeze([
  {
    id: "database_identity",
    sql: "SELECT current_database() AS database_name, current_user AS database_user, current_setting(\'server_version\') AS server_version",
  },
  {
    id: "public_base_table_count",
    sql: "SELECT count(*)::int AS public_base_table_count FROM information_schema.tables WHERE table_schema = \'public\' AND table_type = \'BASE TABLE\'",
  },
  {
    id: "l2_object_any_schema",
    sql: "SELECT table_schema, table_name, table_type FROM information_schema.tables WHERE table_name = \'first_party_crawl_l2_invocations\' ORDER BY table_schema, table_type",
  },
  {
    id: "l2_column_contract",
    sql: "SELECT column_name, ordinal_position, data_type, udt_name, is_nullable, column_default, character_maximum_length FROM information_schema.columns WHERE table_schema = \'public\' AND table_name = \'first_party_crawl_l2_invocations\' ORDER BY ordinal_position",
  },
  {
    id: "l2_constraint_contract",
    sql: "SELECT con.conname AS constraint_name, con.contype AS constraint_type, pg_get_constraintdef(con.oid, true) AS definition FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class c ON c.oid = con.conrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = \'public\' AND c.relname = \'first_party_crawl_l2_invocations\' ORDER BY con.conname",
  },
  {
    id: "l2_index_contract",
    sql: "SELECT indexname AS index_name, indexdef AS definition FROM pg_catalog.pg_indexes WHERE schemaname = \'public\' AND tablename = \'first_party_crawl_l2_invocations\' ORDER BY indexname",
  },
  {
    id: "legacy_p12_inventory",
    sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\' AND table_type = \'BASE TABLE\' AND table_name IN (${LEGACY_NAMES_SQL}) ORDER BY table_name`,
  },
  {
    id: "legacy_p12_columns",
    sql: `SELECT table_name, column_name, ordinal_position, data_type, udt_name, is_nullable, character_maximum_length FROM information_schema.columns WHERE table_schema = \'public\' AND table_name IN (${LEGACY_NAMES_SQL}) ORDER BY table_name, ordinal_position`,
  },
  {
    id: "exact_site_binding",
    sql: `SELECT id::text AS id, domain, canonical_origin, is_active FROM public.sites WHERE id = \'${P12_2_L7_1_SITE_ID}\'::uuid`,
  },
]);

const FORBIDDEN_SQL = /\\b(?:insert|update|delete|merge|truncate|alter|create|drop|grant|revoke|comment|vacuum|analyze|refresh|reindex|cluster|copy|call|do|execute|prepare|deallocate|listen|notify|lock)\\b/i;

function normalizedSql(value: string): string {
  return value.replace(/\\s+/g, " ").trim();
}

export function assertP122L71QueryContract(): void {
  if (P12_2_L7_1_QUERIES.length !== 9) throw new Error("p12_2_l7_1_query_count_invalid");
  const ids = P12_2_L7_1_QUERIES.map((query) => query.id);
  if (new Set(ids).size !== ids.length) throw new Error("p12_2_l7_1_query_id_duplicate");
  for (const query of P12_2_L7_1_QUERIES) {
    const sql = normalizedSql(query.sql);
    if (!/^SELECT\\b/i.test(sql)) throw new Error("p12_2_l7_1_non_select_forbidden");
    if (FORBIDDEN_SQL.test(sql)) throw new Error("p12_2_l7_1_mutation_keyword_forbidden");
    if (sql.includes(";")) throw new Error("p12_2_l7_1_multi_statement_forbidden");
  }
}

export function p122L71QuerySetFingerprint(): string {
  assertP122L71QueryContract();
  const stable = JSON.stringify(P12_2_L7_1_QUERIES.map((query) => ({
    id: query.id,
    sql: normalizedSql(query.sql),
  })));
  return createHash("sha256").update(stable).digest("hex");
}

export function p122L71AuthorizationFingerprint(): string {
  const stable = JSON.stringify({
    version: P12_2_L7_1_VERSION,
    projectId: P12_2_L7_1_PROJECT_ID,
    environmentId: P12_2_L7_1_ENVIRONMENT_ID,
    postgresServiceId: P12_2_L7_1_POSTGRES_SERVICE_ID,
    migrationPath: P12_2_L7_1_MIGRATION_PATH,
    migrationBlobSha: P12_2_L7_1_MIGRATION_BLOB_SHA,
    migrationSha256: P12_2_L7_1_MIGRATION_SHA256,
    querySetFingerprint: p122L71QuerySetFingerprint(),
    attempts: 1,
    retries: 0,
    fallback: false,
  });
  return createHash("sha256").update(stable).digest("hex");
}

export function p122L71AuthorizationLiteral(): string {
  return `AUTHORIZE:P12_2_L7_0008_READ_ONLY:${p122L71AuthorizationFingerprint()}`;
}
