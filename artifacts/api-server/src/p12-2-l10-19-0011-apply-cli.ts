import { spawn } from "node:child_process";
import {
  P12_2_L10_19_MIGRATION_ACCOUNTING_SNAPSHOT_FINGERPRINT,
  P12_2_L10_19_MIGRATION_BLOB_SHA,
  P12_2_L10_19_MIGRATION_ENVIRONMENT_ID,
  P12_2_L10_19_MIGRATION_EXPECTED_POST_TABLE_COUNT,
  P12_2_L10_19_MIGRATION_EXPECTED_PRE_TABLE_COUNT,
  P12_2_L10_19_MIGRATION_L2_RECEIPT_FINGERPRINT,
  P12_2_L10_19_MIGRATION_PATH,
  P12_2_L10_19_MIGRATION_POSTGRES_SERVICE_ID,
  P12_2_L10_19_MIGRATION_PROJECT_ID,
  P12_2_L10_19_MIGRATION_VERSION,
  p122L1019MigrationAuthorizationFingerprint,
  p122L1019MigrationAuthorizationLiteral,
} from "./lib/p12-2-l10-19-0011-apply-contract.js";
import {
  P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT,
  P12_2_L10_15_OBSERVED_AT,
  P12_2_L10_15_RUN_ID,
} from "./lib/p12-2-l10-15-packet-014-full-initial.js";
import {
  P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT,
  P12_2_L10_18_FAILURE_EVENT_FINGERPRINT,
  P12_2_L10_18_FAILURE_URL,
  P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT,
  P12_2_L10_18_FINAL_CHECKPOINT_REVISION,
} from "./lib/p12-2-l10-18-packet-014-finalization-repair.js";
import { DIAMOND_SHELF_SITE_ID } from "./lib/first-party-live-adapters.js";
import { DIAMOND_SHELF_CANONICAL_ORIGIN } from "./lib/first-party-crawl-runtime-bridge.js";
import {
  assertP122L1AE9NoCredentialArgv,
  buildP122L1AE9PsqlConnectionEnv,
} from "./lib/p12-2-l1a-e9-runtime-transport.js";

const MIGRATION_FILE = "/app/0011_first_party_crawl_expected_absence_disposition.sql";
const MAX_OUTPUT_BYTES = 262_144;

function required(name: string): string {
  const value = process.env[name]?.trim() ?? "";
  if (!value) throw new Error("p12_2_l10_19_migration_missing_env_" + name.toLowerCase());
  return value;
}

function exact(actual: string, expected: string, code: string): void {
  if (actual !== expected) throw new Error(code);
}

function wrapperSql(): string {
  const historicalPredicate = `
    site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
    AND run_id='${P12_2_L10_15_RUN_ID}'
    AND canonical_origin='${DIAMOND_SHELF_CANONICAL_ORIGIN}'
    AND execution_plan_fingerprint='${P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT}'
    AND canonical_url='${P12_2_L10_18_FAILURE_URL}'
    AND event_type='terminal_failure'
    AND source_event_fingerprint IS NULL
    AND event_fingerprint='${P12_2_L10_18_FAILURE_EVENT_FINGERPRINT}'
    AND event_payload->>'fingerprint'=event_fingerprint
    AND event_payload->>'decisionReason'='permanent_http'
    AND event_payload->'outcome'->>'kind'='failure'
    AND event_payload->'outcome'->'signal'->>'kind'='http_status'
    AND (event_payload->'outcome'->'signal'->>'httpStatus')::integer IN (404,410)
  `;

  return [
    "\\set ON_ERROR_STOP on",
    "\\pset tuples_only on",
    "\\pset format csv",
    `SELECT 'preflight_guard',1/CASE WHEN
      (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE')=${P12_2_L10_19_MIGRATION_EXPECTED_PRE_TABLE_COUNT}
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema='public'
          AND table_name IN (
            'policy_mutation_reservations','policy_mutation_control_state','policy_mutation_control_events',
            'policy_mutation_claims','policy_mutation_dispatches','policy_mutation_dispatch_events',
            'first_party_crawl_terminal_failure_dispositions',
            'first_party_crawl_terminal_failure_reconciliation_receipts'
          )
      )
      AND (
        SELECT count(*) FROM first_party_crawl_l2_invocations
        WHERE packet_fingerprint='${P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT}'
          AND site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
          AND phase='full_initial'
          AND run_id='${P12_2_L10_15_RUN_ID}'
          AND canonical_origin='${DIAMOND_SHELF_CANONICAL_ORIGIN}'
          AND observed_at='${P12_2_L10_15_OBSERVED_AT}'::timestamptz
          AND status='completed'
          AND receipt_fingerprint='${P12_2_L10_19_MIGRATION_L2_RECEIPT_FINGERPRINT}'
      )=1
      AND (
        SELECT count(*) FROM first_party_crawl_checkpoints
        WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
          AND run_id='${P12_2_L10_15_RUN_ID}'
          AND canonical_origin='${DIAMOND_SHELF_CANONICAL_ORIGIN}'
          AND execution_plan_fingerprint='${P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT}'
          AND checkpoint_fingerprint='${P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT}'
          AND checkpoint_revision=${P12_2_L10_18_FINAL_CHECKPOINT_REVISION}
          AND checkpoint_payload->>'status'='completed'
          AND (checkpoint_payload->'counters'->>'terminalFailures')::integer=1
          AND (checkpoint_payload->'progress'->>'pendingUrls')::integer=0
      )=1
      AND (
        SELECT count(*) FROM first_party_crawl_accounting_snapshots
        WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
          AND run_id='${P12_2_L10_15_RUN_ID}'
          AND execution_plan_fingerprint='${P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT}'
          AND snapshot_fingerprint='${P12_2_L10_19_MIGRATION_ACCOUNTING_SNAPSHOT_FINGERPRINT}'
          AND whole_site_certified=false
          AND terminal_failure_count=1
      )=1
      AND (SELECT count(*) FROM first_party_crawl_terminal_failure_events WHERE ${historicalPredicate})=1
      AND (
        SELECT count(*) FROM first_party_crawl_completed_runs
        WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
          AND run_id='${P12_2_L10_15_RUN_ID}'
      )=0
      AND (
        SELECT count(*) FROM first_party_crawl_terminal_failure_recovery_receipts
        WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid
          AND run_id='${P12_2_L10_15_RUN_ID}'
      )=0
      THEN 1 ELSE 0 END;`,
    `\\i ${MIGRATION_FILE}`,
    "SELECT 'post_table_count',count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';",
    "SELECT 'post_target_counts',(SELECT count(*)::int FROM first_party_crawl_terminal_failure_dispositions),(SELECT count(*)::int FROM first_party_crawl_terminal_failure_reconciliation_receipts);",
    "SELECT 'post_trigger_count',count(*)::int FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal AND t.tgname IN ('trg_first_party_crawl_terminal_failure_dispositions_immutable','trg_first_party_crawl_terminal_failure_reconciliation_immutable');",
    `SELECT 'post_guard',1/CASE WHEN
      (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE')=${P12_2_L10_19_MIGRATION_EXPECTED_POST_TABLE_COUNT}
      AND (
        SELECT count(*) FROM information_schema.tables
        WHERE table_schema='public'
          AND table_name IN (
            'first_party_crawl_terminal_failure_dispositions',
            'first_party_crawl_terminal_failure_reconciliation_receipts'
          )
      )=2
      AND (SELECT count(*) FROM first_party_crawl_terminal_failure_dispositions)=0
      AND (SELECT count(*) FROM first_party_crawl_terminal_failure_reconciliation_receipts)=0
      AND (
        SELECT count(*) FROM pg_catalog.pg_trigger t
        JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
        JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public'
          AND NOT t.tgisinternal
          AND t.tgname IN (
            'trg_first_party_crawl_terminal_failure_dispositions_immutable',
            'trg_first_party_crawl_terminal_failure_reconciliation_immutable'
          )
      )=2
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema='public'
          AND table_name IN (
            'policy_mutation_reservations','policy_mutation_control_state','policy_mutation_control_events',
            'policy_mutation_claims','policy_mutation_dispatches','policy_mutation_dispatch_events'
          )
      )
      AND (SELECT count(*) FROM first_party_crawl_terminal_failure_events WHERE ${historicalPredicate})=1
      AND (
        SELECT count(*) FROM first_party_crawl_accounting_snapshots
        WHERE snapshot_fingerprint='${P12_2_L10_19_MIGRATION_ACCOUNTING_SNAPSHOT_FINGERPRINT}'
          AND whole_site_certified=false
          AND terminal_failure_count=1
      )=1
      THEN 1 ELSE 0 END;`,
  ].join("\n") + "\n";
}

async function main(): Promise<void> {
  exact(required("RAILWAY_PROJECT_ID"), P12_2_L10_19_MIGRATION_PROJECT_ID, "p12_2_l10_19_migration_project_mismatch");
  exact(required("RAILWAY_ENVIRONMENT_ID"), P12_2_L10_19_MIGRATION_ENVIRONMENT_ID, "p12_2_l10_19_migration_environment_mismatch");
  exact(required("P12_2_L10_19_MIGRATION_POSTGRES_SERVICE_ID"), P12_2_L10_19_MIGRATION_POSTGRES_SERVICE_ID, "p12_2_l10_19_migration_postgres_service_mismatch");
  exact(required("P12_2_L10_19_MIGRATION_AUTHORIZATION_LITERAL"), p122L1019MigrationAuthorizationLiteral(), "p12_2_l10_19_migration_authorization_mismatch");
  exact(required("P12_2_L10_19_MIGRATION_BLOB_SHA"), P12_2_L10_19_MIGRATION_BLOB_SHA, "p12_2_l10_19_migration_blob_sha_mismatch");

  const databaseUrl = required("DATABASE_URL");
  if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
    throw new Error("p12_2_l10_19_migration_database_url_scheme_invalid");
  }

  const args = ["--no-psqlrc", "--set", "ON_ERROR_STOP=1"];
  assertP122L1AE9NoCredentialArgv(args, databaseUrl);
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ...buildP122L1AE9PsqlConnectionEnv(databaseUrl),
    PGOPTIONS: "-c statement_timeout=15000 -c lock_timeout=5000",
  };
  delete childEnv.DATABASE_URL;

  const startedAt = new Date().toISOString();
  const result = await new Promise<{exitCode:number;stdout:string;stderr:string;overflow:boolean}>((resolve, reject) => {
    const child = spawn("/usr/bin/psql", args, {
      shell: false,
      env: childEnv,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let overflow = false;
    const add = (current: string, chunk: Buffer) => {
      const next = current + chunk.toString("utf8");
      if (Buffer.byteLength(next, "utf8") > MAX_OUTPUT_BYTES) {
        overflow = true;
        return next.slice(0, MAX_OUTPUT_BYTES);
      }
      return next;
    };
    child.stdout.on("data", (chunk: Buffer) => {
      stdout = add(stdout, chunk);
      if (overflow) child.kill("SIGTERM");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = add(stderr, chunk);
      if (overflow) child.kill("SIGTERM");
    });
    child.once("error", reject);
    child.once("close", (code) => resolve({
      exitCode: overflow ? 70 : (typeof code === "number" ? code : 71),
      stdout,
      stderr,
      overflow,
    }));
    child.stdin.end(wrapperSql());
  });

  const completed = result.exitCode === 0 && !result.overflow;
  process.stdout.write(JSON.stringify({
    version: P12_2_L10_19_MIGRATION_VERSION,
    projectId: P12_2_L10_19_MIGRATION_PROJECT_ID,
    environmentId: P12_2_L10_19_MIGRATION_ENVIRONMENT_ID,
    postgresServiceId: P12_2_L10_19_MIGRATION_POSTGRES_SERVICE_ID,
    migrationPath: P12_2_L10_19_MIGRATION_PATH,
    migrationBlobSha: P12_2_L10_19_MIGRATION_BLOB_SHA,
    authorizationFingerprint: p122L1019MigrationAuthorizationFingerprint(),
    expectedPreTableCount: P12_2_L10_19_MIGRATION_EXPECTED_PRE_TABLE_COUNT,
    expectedPostTableCount: P12_2_L10_19_MIGRATION_EXPECTED_POST_TABLE_COUNT,
    startedAt,
    completed,
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
    psqlProcesses: 1,
    attempts: 1,
    retries: 0,
    fallbackTransportUsed: false,
    credentialMaterialRecorded: false,
  }) + "\n");
  process.exitCode = completed ? 0 : 1;
}

main().catch((error) => {
  const message =
    error instanceof Error && /^[a-z0-9_:-]+$/.test(error.message)
      ? error.message
      : "p12_2_l10_19_migration_bounded_failure";
  process.stderr.write(JSON.stringify({
    version: P12_2_L10_19_MIGRATION_VERSION,
    completed: false,
    error: message,
    psqlProcessesStarted: 0,
    credentialMaterialRecorded: false,
  }) + "\n");
  process.exitCode = 1;
});
