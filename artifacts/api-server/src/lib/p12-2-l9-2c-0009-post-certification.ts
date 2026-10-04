import { createHash } from "node:crypto";

export const P12_2_L9_2C_VERSION = "p12-2-l9-2a-0009-post-apply-readonly-cert-v1" as const;
export const P12_2_L9_2C_PROJECT_ID = "52265e29-921b-4652-ac0d-9da4e5e69936" as const;
export const P12_2_L9_2C_ENVIRONMENT_ID = "7f8d920f-f6c6-44f0-b9fe-252cb4f32298" as const;
export const P12_2_L9_2C_POSTGRES_SERVICE_ID = "b69e0633-7ab9-40ab-85f3-c9edd6acb031" as const;
export const P12_2_L9_2C_SITE_ID = "eb1da9ee-539c-4200-8f04-f64ccaea7768" as const;
export const P12_2_L9_2C_ORIGIN = "https://diamondshelf.us" as const;
export const P12_2_L9_2C_MIGRATION_PATH = "lib/db/migrations/0009_first_party_crawl_l2_bounded_pilot_phase.sql" as const;
export const P12_2_L9_2C_MIGRATION_BLOB_SHA = "50de28599a3d6268e8805423726f0102f2b8e0c9" as const;
export const P12_2_L9_2C_MIGRATION_SHA256 = "388c444384f9ea268b422a43596ead50d60effc5467c72e50751df6227614191" as const;
export const P12_2_L9_2C_EXPECTED_TABLE_COUNT = 38 as const;

export type P122L92CQuery = { id: "database_identity"|"post_state_guard"|"l2_constraint_contract"|"phase_counts"|"exact_site_binding"; sql: string };

export const P12_2_L9_2C_QUERIES: readonly P122L92CQuery[] = Object.freeze([
  { id:"database_identity", sql:"SELECT current_database() AS database_name, current_user AS database_user, current_setting('server_version') AS server_version" },
  { id:"post_state_guard", sql:`SELECT 1 / CASE WHEN
    (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') = ${P12_2_L9_2C_EXPECTED_TABLE_COUNT}
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='first_party_crawl_l2_invocations')
    AND EXISTS (SELECT 1 FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class c ON c.oid=con.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='first_party_crawl_l2_invocations' AND con.conname='first_party_crawl_l2_invocations_phase_check' AND pg_get_constraintdef(con.oid,true) ILIKE '%bounded_pilot%')
    AND NOT EXISTS (SELECT 1 FROM first_party_crawl_l2_invocations WHERE phase NOT IN ('full_initial','full_interrupt','full_resume','full_reconciliation','incremental'))
    AND EXISTS (SELECT 1 FROM public.sites WHERE id='${P12_2_L9_2C_SITE_ID}'::uuid AND lower(domain)='diamondshelf.us' AND canonical_origin='${P12_2_L9_2C_ORIGIN}' AND is_active=true)
    THEN 1 ELSE 0 END AS post_state_guard` },
  { id:"l2_constraint_contract", sql:"SELECT con.conname AS constraint_name, con.contype AS constraint_type, pg_get_constraintdef(con.oid,true) AS definition FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class c ON c.oid=con.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='first_party_crawl_l2_invocations' ORDER BY con.conname" },
  { id:"phase_counts", sql:"SELECT phase, count(*)::int AS row_count FROM first_party_crawl_l2_invocations GROUP BY phase ORDER BY phase" },
  { id:"exact_site_binding", sql:`SELECT id::text AS id, domain, canonical_origin, is_active FROM public.sites WHERE id='${P12_2_L9_2C_SITE_ID}'::uuid` },
]);

const FORBIDDEN_SQL=/\b(?:insert|update|delete|merge|truncate|alter|create|drop|grant|revoke|comment|vacuum|analyze|refresh|reindex|cluster|copy|call|do|execute|prepare|deallocate|listen|notify|lock)\b/i;
function normalizedSql(value:string){return value.replace(/\s+/g," ").trim();}
export function assertP122L92CQueryContract():void{
  if(P12_2_L9_2C_QUERIES.length!==5) throw new Error("p12_2_l9_2c_query_count_invalid");
  const ids=P12_2_L9_2C_QUERIES.map(q=>q.id); if(new Set(ids).size!==ids.length) throw new Error("p12_2_l9_2c_query_id_duplicate");
  for(const q of P12_2_L9_2C_QUERIES){const sql=normalizedSql(q.sql); if(!/^SELECT\b/i.test(sql)) throw new Error("p12_2_l9_2c_non_select_forbidden"); if(FORBIDDEN_SQL.test(sql)) throw new Error("p12_2_l9_2c_mutation_keyword_forbidden"); if(sql.includes(";")) throw new Error("p12_2_l9_2c_multi_statement_forbidden");}
}
export function p122L92CQuerySetFingerprint():string{assertP122L92CQueryContract();return createHash("sha256").update(JSON.stringify(P12_2_L9_2C_QUERIES.map(q=>({id:q.id,sql:normalizedSql(q.sql)})))).digest("hex");}
export function p122L92CAuthorizationFingerprint():string{return createHash("sha256").update(JSON.stringify({version:P12_2_L9_2C_VERSION,projectId:P12_2_L9_2C_PROJECT_ID,environmentId:P12_2_L9_2C_ENVIRONMENT_ID,postgresServiceId:P12_2_L9_2C_POSTGRES_SERVICE_ID,siteId:P12_2_L9_2C_SITE_ID,canonicalOrigin:P12_2_L9_2C_ORIGIN,migrationPath:P12_2_L9_2C_MIGRATION_PATH,migrationBlobSha:P12_2_L9_2C_MIGRATION_BLOB_SHA,migrationSha256:P12_2_L9_2C_MIGRATION_SHA256,expectedPublicBaseTableCount:P12_2_L9_2C_EXPECTED_TABLE_COUNT,querySetFingerprint:p122L92CQuerySetFingerprint(),attempts:1,retries:0,fallback:false})).digest("hex");}
export function p122L92CAuthorizationLiteral():string{return `AUTHORIZE:P12_2_L9_2_0009_POST_APPLY_READ_ONLY:${p122L92CAuthorizationFingerprint()}`;}
