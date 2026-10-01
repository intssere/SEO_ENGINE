import { createHash } from "node:crypto";

export const P12_2_L1A_E1_VERSION = "p12-2-l1a-e1-readonly-query-contract-v1" as const;

export const P12_2_L1A_E1_SITE_ID = "eb1da9ee-539c-4200-8f04-f64ccaea7768" as const;

export const P12_2_L1A_E1_P12_TABLES = [
  "first_party_crawl_checkpoints",
  "first_party_crawl_completed_runs",
  "first_party_crawl_incremental_receipts",
] as const;

export type P122L1AE1Query = {
  id:
    | "database_identity"
    | "public_base_table_count"
    | "p12_table_inventory"
    | "p12_column_contract"
    | "p12_constraint_contract"
    | "p12_index_contract"
    | "exact_site_binding";
  sql: string;
  params: readonly unknown[];
  purpose: string;
};

const TABLE_NAMES_SQL = P12_2_L1A_E1_P12_TABLES.map((name) => `'${name}'`).join(", ");

export const P12_2_L1A_E1_QUERIES: readonly P122L1AE1Query[] = Object.freeze([
  {
    id: "database_identity",
    sql: "SELECT current_database() AS database_name, current_user AS database_user",
    params: [],
    purpose: "Bind the observation to the connected database/session identity.",
  },
  {
    id: "public_base_table_count",
    sql: "SELECT count(*)::int AS public_base_table_count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'",
    params: [],
    purpose: "Determine exact public base-table count without reading application rows.",
  },
  {
    id: "p12_table_inventory",
    sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name IN (${TABLE_NAMES_SQL}) ORDER BY table_name`,
    params: [],
    purpose: "Observe presence/absence of exactly the three P12.2 tables.",
  },
  {
    id: "p12_column_contract",
    sql: `SELECT table_name, column_name, ordinal_position, data_type, udt_name, is_nullable, column_default, character_maximum_length FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN (${TABLE_NAMES_SQL}) ORDER BY table_name, ordinal_position`,
    params: [],
    purpose: "Observe column contract for only the three P12.2 tables.",
  },
  {
    id: "p12_constraint_contract",
    sql: `SELECT c.relname AS table_name, con.conname AS constraint_name, con.contype AS constraint_type, pg_get_constraintdef(con.oid, true) AS definition FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class c ON c.oid = con.conrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname IN (${TABLE_NAMES_SQL}) ORDER BY c.relname, con.conname`,
    params: [],
    purpose: "Observe constraints for only the three P12.2 tables.",
  },
  {
    id: "p12_index_contract",
    sql: `SELECT tablename AS table_name, indexname AS index_name, indexdef AS definition FROM pg_catalog.pg_indexes WHERE schemaname = 'public' AND tablename IN (${TABLE_NAMES_SQL}) ORDER BY tablename, indexname`,
    params: [],
    purpose: "Observe indexes for only the three P12.2 tables.",
  },
  {
    id: "exact_site_binding",
    sql: "SELECT id::text AS id, canonical_origin FROM public.sites WHERE id = $1::uuid",
    params: [P12_2_L1A_E1_SITE_ID],
    purpose: "Read exactly the approved site row and only id/canonical_origin.",
  },
]);

const FORBIDDEN_SQL = /\b(?:insert|update|delete|merge|truncate|alter|create|drop|grant|revoke|comment|vacuum|analyze|refresh|reindex|cluster|copy|call|do|execute|prepare|deallocate|listen|notify|lock)\b/i;

function normalizedSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}

export function assertP122L1AE1QueryContract(): void {
  const expectedIds = [
    "database_identity",
    "public_base_table_count",
    "p12_table_inventory",
    "p12_column_contract",
    "p12_constraint_contract",
    "p12_index_contract",
    "exact_site_binding",
  ];
  if (P12_2_L1A_E1_QUERIES.length !== expectedIds.length) {
    throw new Error("p12_2_l1a_e1_query_count_invalid");
  }
  for (let i = 0; i < expectedIds.length; i += 1) {
    const query = P12_2_L1A_E1_QUERIES[i]!;
    if (query.id !== expectedIds[i]) throw new Error("p12_2_l1a_e1_query_order_invalid");
    const sql = normalizedSql(query.sql);
    if (!/^select\b/i.test(sql)) throw new Error("p12_2_l1a_e1_non_select_forbidden");
    if (FORBIDDEN_SQL.test(sql)) throw new Error("p12_2_l1a_e1_mutation_keyword_forbidden");
    if (sql.includes(";")) throw new Error("p12_2_l1a_e1_multi_statement_forbidden");
  }

  const site = P12_2_L1A_E1_QUERIES.find((query) => query.id === "exact_site_binding")!;
  if (
    normalizedSql(site.sql) !==
      "SELECT id::text AS id, canonical_origin FROM public.sites WHERE id = $1::uuid" ||
    site.params.length !== 1 ||
    site.params[0] !== P12_2_L1A_E1_SITE_ID
  ) {
    throw new Error("p12_2_l1a_e1_site_query_invalid");
  }
}

export function p122L1AE1QuerySetFingerprint(): string {
  assertP122L1AE1QueryContract();
  const stable = JSON.stringify(
    P12_2_L1A_E1_QUERIES.map((query) => ({
      id: query.id,
      sql: normalizedSql(query.sql),
      params: query.params,
    })),
  );
  return createHash("sha256").update(stable).digest("hex");
}

export function p122L1AE1AuthorizationLiteral(): string {
  return `AUTHORIZE:P12_2_L1A_READ_ONLY_OBSERVATION:${p122L1AE1QuerySetFingerprint()}`;
}
