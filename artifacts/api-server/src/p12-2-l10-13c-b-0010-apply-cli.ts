import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import {
  P12_2_L10_13C_B_ENVIRONMENT_ID,
  P12_2_L10_13C_B_EXPECTED_POST_TABLE_COUNT,
  P12_2_L10_13C_B_EXPECTED_PRE_TABLE_COUNT,
  P12_2_L10_13C_B_MIGRATION_BLOB_SHA,
  P12_2_L10_13C_B_MIGRATION_PATH,
  P12_2_L10_13C_B_MIGRATION_SHA256,
  P12_2_L10_13C_B_ORIGIN,
  P12_2_L10_13C_B_PACKET_013_CHECKPOINT_FINGERPRINT,
  P12_2_L10_13C_B_PACKET_013_CHECKPOINT_REVISION,
  P12_2_L10_13C_B_PACKET_013_EXECUTION_PLAN_FINGERPRINT,
  P12_2_L10_13C_B_PACKET_013_RUN_ID,
  P12_2_L10_13C_B_POSTGRES_SERVICE_ID,
  P12_2_L10_13C_B_PROJECT_ID,
  P12_2_L10_13C_B_SITE_ID,
  P12_2_L10_13C_B_VERSION,
  p122L1013CBAuthorizationFingerprint,
  p122L1013CBAuthorizationLiteral,
} from "./lib/p12-2-l10-13c-b-0010-apply-contract.js";
import { assertP122L1AE9NoCredentialArgv,buildP122L1AE9PsqlConnectionEnv } from "./lib/p12-2-l1a-e9-runtime-transport.js";
const MIGRATION_FILE="/app/0010_first_party_crawl_terminal_failure_recovery.sql";
const MAX_OUTPUT_BYTES=262144;
function required(name:string){const value=process.env[name]?.trim()??"";if(!value)throw new Error("p12_2_l10_13c_b_missing_env_"+name.toLowerCase());return value;}
function exact(a:string,e:string,c:string){if(a!==e)throw new Error(c);}
function wrapperSql(){return [
"\\set ON_ERROR_STOP on",
"\\pset tuples_only on",
"\\pset format csv",
`SELECT 'preflight_guard',1/CASE WHEN
 (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE')=${P12_2_L10_13C_B_EXPECTED_PRE_TABLE_COUNT}
 AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('first_party_crawl_terminal_failure_events','first_party_crawl_accounting_snapshots','first_party_crawl_terminal_failure_recovery_receipts'))
 AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='reject_p12_2_l10_13b_immutable_mutation')
 AND EXISTS (SELECT 1 FROM public.sites WHERE id='${P12_2_L10_13C_B_SITE_ID}'::uuid AND lower(domain)='diamondshelf.us' AND canonical_origin='${P12_2_L10_13C_B_ORIGIN}' AND is_active=true)
 AND EXISTS (SELECT 1 FROM first_party_crawl_checkpoints WHERE site_id='${P12_2_L10_13C_B_SITE_ID}'::uuid AND run_id='${P12_2_L10_13C_B_PACKET_013_RUN_ID}' AND execution_plan_fingerprint='${P12_2_L10_13C_B_PACKET_013_EXECUTION_PLAN_FINGERPRINT}' AND checkpoint_revision=${P12_2_L10_13C_B_PACKET_013_CHECKPOINT_REVISION} AND checkpoint_fingerprint='${P12_2_L10_13C_B_PACKET_013_CHECKPOINT_FINGERPRINT}' AND checkpoint_payload->>'status'='completed' AND (checkpoint_payload->'counters'->>'terminalFailures')::integer=1)
 THEN 1 ELSE 0 END;`,
`\\i ${MIGRATION_FILE}`,
"SELECT 'post_table_count',count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';",
"SELECT 'post_target_counts',(SELECT count(*)::int FROM first_party_crawl_terminal_failure_events),(SELECT count(*)::int FROM first_party_crawl_accounting_snapshots),(SELECT count(*)::int FROM first_party_crawl_terminal_failure_recovery_receipts);",
"SELECT 'post_trigger_count',count(*)::int FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal AND t.tgname IN ('trg_first_party_crawl_terminal_failure_events_immutable','trg_first_party_crawl_accounting_snapshots_immutable','trg_first_party_crawl_terminal_failure_recovery_receipts_immutable');",
`SELECT 'post_guard',1/CASE WHEN
 (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE')=${P12_2_L10_13C_B_EXPECTED_POST_TABLE_COUNT}
 AND (SELECT count(*) FROM first_party_crawl_terminal_failure_events)=0
 AND (SELECT count(*) FROM first_party_crawl_accounting_snapshots)=0
 AND (SELECT count(*) FROM first_party_crawl_terminal_failure_recovery_receipts)=0
 AND (SELECT count(*) FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal AND t.tgname IN ('trg_first_party_crawl_terminal_failure_events_immutable','trg_first_party_crawl_accounting_snapshots_immutable','trg_first_party_crawl_terminal_failure_recovery_receipts_immutable'))=3
 AND EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='reject_p12_2_l10_13b_immutable_mutation')
 AND EXISTS (SELECT 1 FROM first_party_crawl_checkpoints WHERE site_id='${P12_2_L10_13C_B_SITE_ID}'::uuid AND run_id='${P12_2_L10_13C_B_PACKET_013_RUN_ID}' AND execution_plan_fingerprint='${P12_2_L10_13C_B_PACKET_013_EXECUTION_PLAN_FINGERPRINT}' AND checkpoint_revision=${P12_2_L10_13C_B_PACKET_013_CHECKPOINT_REVISION} AND checkpoint_fingerprint='${P12_2_L10_13C_B_PACKET_013_CHECKPOINT_FINGERPRINT}' AND checkpoint_payload->>'status'='completed' AND (checkpoint_payload->'counters'->>'terminalFailures')::integer=1)
 THEN 1 ELSE 0 END;`
].join("\n")+"\n";}
async function main(){exact(required("RAILWAY_PROJECT_ID"),P12_2_L10_13C_B_PROJECT_ID,"p12_2_l10_13c_b_project_mismatch");exact(required("RAILWAY_ENVIRONMENT_ID"),P12_2_L10_13C_B_ENVIRONMENT_ID,"p12_2_l10_13c_b_environment_mismatch");exact(required("P12_2_L10_13C_B_POSTGRES_SERVICE_ID"),P12_2_L10_13C_B_POSTGRES_SERVICE_ID,"p12_2_l10_13c_b_postgres_service_mismatch");exact(required("P12_2_L10_13C_B_AUTHORIZATION_LITERAL"),p122L1013CBAuthorizationLiteral(),"p12_2_l10_13c_b_authorization_mismatch");const databaseUrl=required("DATABASE_URL");if(!/^postgres(?:ql)?:\/\//i.test(databaseUrl))throw new Error("p12_2_l10_13c_b_database_url_scheme_invalid");const migration=await readFile(MIGRATION_FILE);exact(createHash("sha256").update(migration).digest("hex"),P12_2_L10_13C_B_MIGRATION_SHA256,"p12_2_l10_13c_b_migration_sha256_mismatch");const args=["--no-psqlrc","--set","ON_ERROR_STOP=1"];assertP122L1AE9NoCredentialArgv(args,databaseUrl);const childEnv:NodeJS.ProcessEnv={...process.env,...buildP122L1AE9PsqlConnectionEnv(databaseUrl),PGOPTIONS:"-c statement_timeout=15000 -c lock_timeout=5000"};delete childEnv.DATABASE_URL;const startedAt=new Date().toISOString();const result=await new Promise<{exitCode:number;stdout:string;stderr:string;overflow:boolean}>((resolve,reject)=>{const child=spawn("/usr/bin/psql",args,{shell:false,env:childEnv,stdio:["pipe","pipe","pipe"]});let stdout="",stderr="",overflow=false;const add=(cur:string,ch:Buffer)=>{const next=cur+ch.toString("utf8");if(Buffer.byteLength(next,"utf8")>MAX_OUTPUT_BYTES){overflow=true;return next.slice(0,MAX_OUTPUT_BYTES);}return next;};child.stdout.on("data",(c:Buffer)=>{stdout=add(stdout,c);if(overflow)child.kill("SIGTERM");});child.stderr.on("data",(c:Buffer)=>{stderr=add(stderr,c);if(overflow)child.kill("SIGTERM");});child.once("error",reject);child.once("close",code=>resolve({exitCode:overflow?70:(typeof code==="number"?code:71),stdout,stderr,overflow}));child.stdin.end(wrapperSql());});const completed=result.exitCode===0&&!result.overflow;process.stdout.write(JSON.stringify({version:P12_2_L10_13C_B_VERSION,projectId:P12_2_L10_13C_B_PROJECT_ID,environmentId:P12_2_L10_13C_B_ENVIRONMENT_ID,postgresServiceId:P12_2_L10_13C_B_POSTGRES_SERVICE_ID,migrationPath:P12_2_L10_13C_B_MIGRATION_PATH,migrationBlobSha:P12_2_L10_13C_B_MIGRATION_BLOB_SHA,migrationSha256:P12_2_L10_13C_B_MIGRATION_SHA256,authorizationFingerprint:p122L1013CBAuthorizationFingerprint(),startedAt,completed,exitCode:result.exitCode,stdout:result.stdout,stderr:result.stderr,psqlProcesses:1,attempts:1,retries:0,fallbackTransportUsed:false,credentialMaterialRecorded:false})+"\n");process.exitCode=completed?0:1;}
main().catch(error=>{const message=error instanceof Error&&/^[a-z0-9_:-]+$/.test(error.message)?error.message:"p12_2_l10_13c_b_bounded_failure";process.stderr.write(JSON.stringify({version:P12_2_L10_13C_B_VERSION,completed:false,error:message,psqlProcessesStarted:0,credentialMaterialRecorded:false})+"\n");process.exitCode=1;});
