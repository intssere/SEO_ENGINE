import { createHash } from "node:crypto";
export const P12_2_L10_13C_C_PROJECT_ID="52265e29-921b-4652-ac0d-9da4e5e69936" as const;
export const P12_2_L10_13C_C_ENVIRONMENT_ID="7f8d920f-f6c6-44f0-b9fe-252cb4f32298" as const;
export const P12_2_L10_13C_C_POSTGRES_SERVICE_ID="b69e0633-7ab9-40ab-85f3-c9edd6acb031" as const;
export const P12_2_L10_13C_C_SITE_ID="eb1da9ee-539c-4200-8f04-f64ccaea7768" as const;
export const P12_2_L10_13C_C_ORIGIN="https://diamondshelf.us" as const;
export const P12_2_L10_13C_C_MIGRATION_PATH="lib/db/migrations/0010_first_party_crawl_terminal_failure_recovery.sql" as const;
export const P12_2_L10_13C_C_MIGRATION_BLOB_SHA="a22547808f1a8d30424c659435dc81bf3da44023" as const;
export const P12_2_L10_13C_C_MIGRATION_SHA256="f97c1d5417d0eaf0eae46d075e1b85125a1a2aa91881a921b640f596fc921516" as const;
export const P12_2_L10_13C_C_PACKET_013_RUN_ID="p12-2-diamond-shelf-full-interrupt-010" as const;
export const P12_2_L10_13C_C_PACKET_013_EXECUTION_PLAN_FINGERPRINT="0818612ac8f35d5109cb4901442a0546630b9ca31a7ae6f24f77f8271db650aa" as const;
export const P12_2_L10_13C_C_PACKET_013_CHECKPOINT_REVISION=307 as const;
export const P12_2_L10_13C_C_PACKET_013_CHECKPOINT_FINGERPRINT="6c13e3bde165f5349f94f8139c35fd878631dc9e3a21a31c91e0936bd5eb4a99" as const;

export const P12_2_L10_13C_C_VERSION="p12-2-l10-13c-c-0010-post-apply-readonly-cert-v2" as const;
export const P12_2_L10_13C_C_EXPECTED_TABLE_COUNT=41 as const;
export type P122L1013CCQuery={id:"database_identity"|"post_state_guard"|"engineering_policy_absence_contract"|"l2_constraint_contract"|"target_table_contract"|"append_only_trigger_contract"|"packet_013_checkpoint_guard"|"packet_013_invocation_guard"|"exact_site_binding";sql:string};
export const P12_2_L10_13C_C_QUERIES:readonly P122L1013CCQuery[]=Object.freeze([
{id:"database_identity",sql:"SELECT current_database() AS database_name, current_user AS database_user, current_setting('server_version') AS server_version"},
{id:"post_state_guard",sql:`SELECT 1 / CASE WHEN
 (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE')=${P12_2_L10_13C_C_EXPECTED_TABLE_COUNT}
 AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='first_party_crawl_l2_invocations')
 AND EXISTS (SELECT 1 FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class c ON c.oid=con.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='first_party_crawl_l2_invocations' AND con.conname='first_party_crawl_l2_invocations_phase_check' AND pg_get_constraintdef(con.oid,true) ILIKE '%bounded_pilot%')
 AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('policy_mutation_reservations','policy_mutation_control_state','policy_mutation_control_events','policy_mutation_claims','policy_mutation_dispatches','policy_mutation_dispatch_events'))
 AND (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('first_party_crawl_terminal_failure_events','first_party_crawl_accounting_snapshots','first_party_crawl_terminal_failure_recovery_receipts'))=3
 AND (SELECT count(*) FROM first_party_crawl_terminal_failure_events)=0
 AND (SELECT count(*) FROM first_party_crawl_accounting_snapshots)=0
 AND (SELECT count(*) FROM first_party_crawl_terminal_failure_recovery_receipts)=0
 AND (SELECT count(*) FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal AND t.tgname IN ('trg_first_party_crawl_terminal_failure_events_immutable','trg_first_party_crawl_accounting_snapshots_immutable','trg_first_party_crawl_terminal_failure_recovery_receipts_immutable'))=3
 AND EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='reject_p12_2_l10_13b_immutable_mutation')
 AND EXISTS (SELECT 1 FROM public.sites WHERE id='${P12_2_L10_13C_C_SITE_ID}'::uuid AND lower(domain)='diamondshelf.us' AND canonical_origin='${P12_2_L10_13C_C_ORIGIN}' AND is_active=true)
 THEN 1 ELSE 0 END AS post_state_guard`},
{id:"engineering_policy_absence_contract",sql:"SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('policy_mutation_reservations','policy_mutation_control_state','policy_mutation_control_events','policy_mutation_claims','policy_mutation_dispatches','policy_mutation_dispatch_events') ORDER BY table_name"},
{id:"l2_constraint_contract",sql:"SELECT con.conname AS constraint_name,con.contype AS constraint_type,pg_get_constraintdef(con.oid,true) AS definition FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class c ON c.oid=con.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='first_party_crawl_l2_invocations' ORDER BY con.conname"},
{id:"target_table_contract",sql:"SELECT table_name,column_name,ordinal_position::int AS ordinal_position FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('first_party_crawl_terminal_failure_events','first_party_crawl_accounting_snapshots','first_party_crawl_terminal_failure_recovery_receipts') ORDER BY table_name,ordinal_position"},
{id:"append_only_trigger_contract",sql:"SELECT c.relname AS table_name,t.tgname AS trigger_name,p.proname AS function_name FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace JOIN pg_catalog.pg_proc p ON p.oid=t.tgfoid WHERE n.nspname='public' AND NOT t.tgisinternal AND c.relname IN ('first_party_crawl_terminal_failure_events','first_party_crawl_accounting_snapshots','first_party_crawl_terminal_failure_recovery_receipts') ORDER BY c.relname,t.tgname"},
{id:"packet_013_checkpoint_guard",sql:`SELECT 1 / CASE WHEN EXISTS (
 SELECT 1 FROM first_party_crawl_checkpoints
 WHERE site_id='${P12_2_L10_13C_C_SITE_ID}'::uuid
   AND run_id='${P12_2_L10_13C_C_PACKET_013_RUN_ID}'
   AND canonical_origin='${P12_2_L10_13C_C_ORIGIN}'
   AND execution_plan_fingerprint='${P12_2_L10_13C_C_PACKET_013_EXECUTION_PLAN_FINGERPRINT}'
   AND checkpoint_revision=${P12_2_L10_13C_C_PACKET_013_CHECKPOINT_REVISION}
   AND checkpoint_fingerprint='${P12_2_L10_13C_C_PACKET_013_CHECKPOINT_FINGERPRINT}'
   AND checkpoint_payload->>'status'='completed'
   AND (checkpoint_payload->'progress'->>'totalUrls')::integer=3044
   AND (checkpoint_payload->'progress'->>'finalizedUrls')::integer=3044
   AND (checkpoint_payload->'progress'->>'pendingUrls')::integer=0
   AND (checkpoint_payload->'counters'->>'terminalFailures')::integer=1
 ) AND NOT EXISTS (
 SELECT 1 FROM first_party_crawl_completed_runs
 WHERE site_id='${P12_2_L10_13C_C_SITE_ID}'::uuid
   AND run_id='${P12_2_L10_13C_C_PACKET_013_RUN_ID}'
   AND execution_plan_fingerprint='${P12_2_L10_13C_C_PACKET_013_EXECUTION_PLAN_FINGERPRINT}'
 ) THEN 1 ELSE 0 END AS packet_013_checkpoint_guard`},
{id:"packet_013_invocation_guard",sql:`SELECT 1 / CASE WHEN EXISTS (
 SELECT 1 FROM first_party_crawl_l2_invocations
 WHERE site_id='${P12_2_L10_13C_C_SITE_ID}'::uuid
   AND packet_fingerprint='4d3b401a688b4928f42cc31fdde4e57bbc9b390745157fa6cc867b21795559ea'
   AND run_id='${P12_2_L10_13C_C_PACKET_013_RUN_ID}'
   AND status='claimed' AND receipt_fingerprint IS NULL AND receipt_payload IS NULL
 ) THEN 1 ELSE 0 END AS packet_013_invocation_guard`},
{id:"exact_site_binding",sql:`SELECT id::text AS id,domain,canonical_origin,is_active FROM public.sites WHERE id='${P12_2_L10_13C_C_SITE_ID}'::uuid`}
]);
const FORBIDDEN_SQL=/\b(?:insert|update|delete|merge|truncate|alter|create|drop|grant|revoke|comment|vacuum|analyze|refresh|reindex|cluster|copy|call|do|execute|prepare|deallocate|listen|notify|lock)\b/i;
function normalizedSql(v:string){return v.replace(/\s+/g," ").trim();}
export function assertP122L1013CCQueryContract():void{if(P12_2_L10_13C_C_QUERIES.length!==9)throw new Error("p12_2_l10_13c_c_query_count_invalid");const ids=P12_2_L10_13C_C_QUERIES.map(q=>q.id);if(new Set(ids).size!==ids.length)throw new Error("p12_2_l10_13c_c_query_id_duplicate");for(const q of P12_2_L10_13C_C_QUERIES){const sql=normalizedSql(q.sql);if(!/^SELECT\b/i.test(sql))throw new Error("p12_2_l10_13c_c_non_select_forbidden");if(FORBIDDEN_SQL.test(sql))throw new Error("p12_2_l10_13c_c_mutation_keyword_forbidden");if(sql.includes(";"))throw new Error("p12_2_l10_13c_c_multi_statement_forbidden");}}
export function p122L1013CCQuerySetFingerprint():string{assertP122L1013CCQueryContract();return createHash("sha256").update(JSON.stringify(P12_2_L10_13C_C_QUERIES.map(q=>({id:q.id,sql:normalizedSql(q.sql)})))).digest("hex");}
export function p122L1013CCAuthorizationFingerprint():string{return createHash("sha256").update(JSON.stringify({version:P12_2_L10_13C_C_VERSION,projectId:P12_2_L10_13C_C_PROJECT_ID,environmentId:P12_2_L10_13C_C_ENVIRONMENT_ID,postgresServiceId:P12_2_L10_13C_C_POSTGRES_SERVICE_ID,siteId:P12_2_L10_13C_C_SITE_ID,canonicalOrigin:P12_2_L10_13C_C_ORIGIN,migrationPath:P12_2_L10_13C_C_MIGRATION_PATH,migrationBlobSha:P12_2_L10_13C_C_MIGRATION_BLOB_SHA,migrationSha256:P12_2_L10_13C_C_MIGRATION_SHA256,expectedPublicBaseTableCount:P12_2_L10_13C_C_EXPECTED_TABLE_COUNT,packet013CheckpointFingerprint:P12_2_L10_13C_C_PACKET_013_CHECKPOINT_FINGERPRINT,querySetFingerprint:p122L1013CCQuerySetFingerprint(),attempts:1,retries:0,fallback:false,sessionReadOnly:true})).digest("hex");}
export function p122L1013CCAuthorizationLiteral():string{return `AUTHORIZE:P12_2_L10_13C_0010_POST_APPLY_READ_ONLY:${p122L1013CCAuthorizationFingerprint()}`;}
