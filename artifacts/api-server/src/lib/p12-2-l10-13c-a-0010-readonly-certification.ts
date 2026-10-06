import { createHash } from "node:crypto";
export const P12_2_L10_13C_A_PROJECT_ID="52265e29-921b-4652-ac0d-9da4e5e69936" as const;
export const P12_2_L10_13C_A_ENVIRONMENT_ID="7f8d920f-f6c6-44f0-b9fe-252cb4f32298" as const;
export const P12_2_L10_13C_A_POSTGRES_SERVICE_ID="b69e0633-7ab9-40ab-85f3-c9edd6acb031" as const;
export const P12_2_L10_13C_A_SITE_ID="eb1da9ee-539c-4200-8f04-f64ccaea7768" as const;
export const P12_2_L10_13C_A_ORIGIN="https://diamondshelf.us" as const;
export const P12_2_L10_13C_A_MIGRATION_PATH="lib/db/migrations/0010_first_party_crawl_terminal_failure_recovery.sql" as const;
export const P12_2_L10_13C_A_MIGRATION_BLOB_SHA="a22547808f1a8d30424c659435dc81bf3da44023" as const;
export const P12_2_L10_13C_A_MIGRATION_SHA256="f97c1d5417d0eaf0eae46d075e1b85125a1a2aa91881a921b640f596fc921516" as const;
export const P12_2_L10_13C_A_PACKET_013_RUN_ID="p12-2-diamond-shelf-full-interrupt-010" as const;
export const P12_2_L10_13C_A_PACKET_013_EXECUTION_PLAN_FINGERPRINT="0818612ac8f35d5109cb4901442a0546630b9ca31a7ae6f24f77f8271db650aa" as const;
export const P12_2_L10_13C_A_PACKET_013_CHECKPOINT_REVISION=307 as const;
export const P12_2_L10_13C_A_PACKET_013_CHECKPOINT_FINGERPRINT="6c13e3bde165f5349f94f8139c35fd878631dc9e3a21a31c91e0936bd5eb4a99" as const;

export const P12_2_L10_13C_A_VERSION="p12-2-l10-13c-a-0010-pre-apply-readonly-cert-v1" as const;
export const P12_2_L10_13C_A_EXPECTED_TABLE_COUNT=44 as const;

export type P122L1013CAQuery={id:"database_identity"|"pre_state_guard"|"packet_013_checkpoint_guard"|"packet_013_invocation_guard"|"target_absence_contract"|"exact_site_binding";sql:string};
export const P12_2_L10_13C_A_QUERIES:readonly P122L1013CAQuery[]=Object.freeze([
{id:"database_identity",sql:"SELECT current_database() AS database_name, current_user AS database_user, current_setting('server_version') AS server_version"},
{id:"pre_state_guard",sql:`SELECT 1 / CASE WHEN
 (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE')=${P12_2_L10_13C_A_EXPECTED_TABLE_COUNT}
 AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('first_party_crawl_terminal_failure_events','first_party_crawl_accounting_snapshots','first_party_crawl_terminal_failure_recovery_receipts'))
 AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='reject_p12_2_l10_13b_immutable_mutation')
 AND EXISTS (SELECT 1 FROM public.sites WHERE id='${P12_2_L10_13C_A_SITE_ID}'::uuid AND lower(domain)='diamondshelf.us' AND canonical_origin='${P12_2_L10_13C_A_ORIGIN}' AND is_active=true)
 THEN 1 ELSE 0 END AS pre_state_guard`},
{id:"packet_013_checkpoint_guard",sql:`SELECT 1 / CASE WHEN EXISTS (
 SELECT 1 FROM first_party_crawl_checkpoints
 WHERE site_id='${P12_2_L10_13C_A_SITE_ID}'::uuid
   AND run_id='${P12_2_L10_13C_A_PACKET_013_RUN_ID}'
   AND canonical_origin='${P12_2_L10_13C_A_ORIGIN}'
   AND execution_plan_fingerprint='${P12_2_L10_13C_A_PACKET_013_EXECUTION_PLAN_FINGERPRINT}'
   AND checkpoint_revision=${P12_2_L10_13C_A_PACKET_013_CHECKPOINT_REVISION}
   AND checkpoint_fingerprint='${P12_2_L10_13C_A_PACKET_013_CHECKPOINT_FINGERPRINT}'
   AND checkpoint_payload->>'status'='completed'
   AND (checkpoint_payload->'progress'->>'totalUrls')::integer=3044
   AND (checkpoint_payload->'progress'->>'finalizedUrls')::integer=3044
   AND (checkpoint_payload->'progress'->>'pendingUrls')::integer=0
   AND (checkpoint_payload->'counters'->>'terminalFailures')::integer=1
 ) AND NOT EXISTS (
 SELECT 1 FROM first_party_crawl_completed_runs
 WHERE site_id='${P12_2_L10_13C_A_SITE_ID}'::uuid
   AND run_id='${P12_2_L10_13C_A_PACKET_013_RUN_ID}'
   AND execution_plan_fingerprint='${P12_2_L10_13C_A_PACKET_013_EXECUTION_PLAN_FINGERPRINT}'
 ) THEN 1 ELSE 0 END AS packet_013_checkpoint_guard`},
{id:"packet_013_invocation_guard",sql:`SELECT 1 / CASE WHEN EXISTS (
 SELECT 1 FROM first_party_crawl_l2_invocations
 WHERE site_id='${P12_2_L10_13C_A_SITE_ID}'::uuid
   AND packet_fingerprint='4d3b401a688b4928f42cc31fdde4e57bbc9b390745157fa6cc867b21795559ea'
   AND run_id='${P12_2_L10_13C_A_PACKET_013_RUN_ID}'
   AND status='claimed' AND receipt_fingerprint IS NULL AND receipt_payload IS NULL
 ) THEN 1 ELSE 0 END AS packet_013_invocation_guard`},
{id:"target_absence_contract",sql:"SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('first_party_crawl_terminal_failure_events','first_party_crawl_accounting_snapshots','first_party_crawl_terminal_failure_recovery_receipts') ORDER BY table_name"},
{id:"exact_site_binding",sql:`SELECT id::text AS id,domain,canonical_origin,is_active FROM public.sites WHERE id='${P12_2_L10_13C_A_SITE_ID}'::uuid`}
]);
const FORBIDDEN_SQL=/\b(?:insert|update|delete|merge|truncate|alter|create|drop|grant|revoke|comment|vacuum|analyze|refresh|reindex|cluster|copy|call|do|execute|prepare|deallocate|listen|notify|lock)\b/i;
function normalizedSql(v:string){return v.replace(/\s+/g," ").trim();}
export function assertP122L1013CAQueryContract():void{if(P12_2_L10_13C_A_QUERIES.length!==6)throw new Error("p12_2_l10_13c_a_query_count_invalid");const ids=P12_2_L10_13C_A_QUERIES.map(q=>q.id);if(new Set(ids).size!==ids.length)throw new Error("p12_2_l10_13c_a_query_id_duplicate");for(const q of P12_2_L10_13C_A_QUERIES){const sql=normalizedSql(q.sql);if(!/^SELECT\b/i.test(sql))throw new Error("p12_2_l10_13c_a_non_select_forbidden");if(FORBIDDEN_SQL.test(sql))throw new Error("p12_2_l10_13c_a_mutation_keyword_forbidden");if(sql.includes(";"))throw new Error("p12_2_l10_13c_a_multi_statement_forbidden");}}
export function p122L1013CAQuerySetFingerprint():string{assertP122L1013CAQueryContract();return createHash("sha256").update(JSON.stringify(P12_2_L10_13C_A_QUERIES.map(q=>({id:q.id,sql:normalizedSql(q.sql)})))).digest("hex");}
export function p122L1013CAAuthorizationFingerprint():string{return createHash("sha256").update(JSON.stringify({version:P12_2_L10_13C_A_VERSION,projectId:P12_2_L10_13C_A_PROJECT_ID,environmentId:P12_2_L10_13C_A_ENVIRONMENT_ID,postgresServiceId:P12_2_L10_13C_A_POSTGRES_SERVICE_ID,siteId:P12_2_L10_13C_A_SITE_ID,canonicalOrigin:P12_2_L10_13C_A_ORIGIN,migrationPath:P12_2_L10_13C_A_MIGRATION_PATH,migrationBlobSha:P12_2_L10_13C_A_MIGRATION_BLOB_SHA,migrationSha256:P12_2_L10_13C_A_MIGRATION_SHA256,expectedPublicBaseTableCount:P12_2_L10_13C_A_EXPECTED_TABLE_COUNT,packet013CheckpointFingerprint:P12_2_L10_13C_A_PACKET_013_CHECKPOINT_FINGERPRINT,querySetFingerprint:p122L1013CAQuerySetFingerprint(),attempts:1,retries:0,fallback:false,sessionReadOnly:true})).digest("hex");}
export function p122L1013CAAuthorizationLiteral():string{return `AUTHORIZE:P12_2_L10_13C_0010_PRE_APPLY_READ_ONLY:${p122L1013CAAuthorizationFingerprint()}`;}
