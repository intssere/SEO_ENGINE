import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import {
  P12_2_L10_19_A_ACCOUNTING_SNAPSHOT_FINGERPRINT,
  P12_2_L10_19_A_CHECKPOINT_FINGERPRINT,
  P12_2_L10_19_A_CHECKPOINT_REVISION,
  P12_2_L10_19_A_ENVIRONMENT_ID,
  P12_2_L10_19_A_EXECUTION_PLAN_FINGERPRINT,
  P12_2_L10_19_A_EXPECTED_POST_TABLE_COUNT,
  P12_2_L10_19_A_EXPECTED_PRE_TABLE_COUNT,
  P12_2_L10_19_A_FAILURE_EVENT_FINGERPRINT,
  P12_2_L10_19_A_FAILURE_URL,
  P12_2_L10_19_A_L2_RECEIPT_FINGERPRINT,
  P12_2_L10_19_A_MIGRATION_BLOB_SHA,
  P12_2_L10_19_A_MIGRATION_PATH,
  P12_2_L10_19_A_MIGRATION_SHA256,
  P12_2_L10_19_A_OBSERVED_AT,
  P12_2_L10_19_A_ORIGIN,
  P12_2_L10_19_A_PACKET_FINGERPRINT,
  P12_2_L10_19_A_POSTGRES_SERVICE_ID,
  P12_2_L10_19_A_PROJECT_ID,
  P12_2_L10_19_A_RUN_ID,
  P12_2_L10_19_A_SITE_ID,
  P12_2_L10_19_A_VERSION,
  p122L1019AMigrationAuthorizationFingerprint,
  p122L1019AMigrationAuthorizationLiteral,
} from "./lib/p12-2-l10-19-a-0011-apply-contract.js";
import {
  assertP122L1AE9NoCredentialArgv,
  buildP122L1AE9PsqlConnectionEnv,
} from "./lib/p12-2-l1a-e9-runtime-transport.js";

const MIGRATION_FILE = "/app/0011_first_party_crawl_expected_absence_disposition.sql";
const MAX_OUTPUT_BYTES = 262_144;

function required(name: string): string {
  const value = process.env[name]?.trim() ?? "";
  if (!value) throw new Error("p12_2_l10_19_a_missing_env_" + name.toLowerCase());
  return value;
}

function exact(actual: string, expected: string, code: string): void {
  if (actual !== expected) throw new Error(code);
}

function wrapperSql(): string {
  return [
    "\\set ON_ERROR_STOP on",
    "\\pset tuples_only on",
    "\\pset format csv",
    `SELECT 'preflight_guard',1/CASE WHEN
      (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE')=${P12_2_L10_19_A_EXPECTED_PRE_TABLE_COUNT}
      AND EXISTS (
        SELECT 1 FROM first_party_crawl_l2_invocations
        WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid
          AND packet_fingerprint='${P12_2_L10_19_A_PACKET_FINGERPRINT}'
          AND run_id='${P12_2_L10_19_A_RUN_ID}'
          AND canonical_origin='${P12_2_L10_19_A_ORIGIN}'
          AND observed_at='${P12_2_L10_19_A_OBSERVED_AT}'::timestamptz
          AND status='completed'
          AND receipt_fingerprint='${P12_2_L10_19_A_L2_RECEIPT_FINGERPRINT}'
      )
      AND EXISTS (
        SELECT 1 FROM first_party_crawl_checkpoints
        WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid
          AND run_id='${P12_2_L10_19_A_RUN_ID}'
          AND canonical_origin='${P12_2_L10_19_A_ORIGIN}'
          AND execution_plan_fingerprint='${P12_2_L10_19_A_EXECUTION_PLAN_FINGERPRINT}'
          AND checkpoint_fingerprint='${P12_2_L10_19_A_CHECKPOINT_FINGERPRINT}'
          AND checkpoint_revision=${P12_2_L10_19_A_CHECKPOINT_REVISION}
          AND checkpoint_payload->>'status'='completed'
          AND (checkpoint_payload->'progress'->>'totalUrls')::integer=3044
          AND (checkpoint_payload->'progress'->>'finalizedUrls')::integer=3044
          AND (checkpoint_payload->'progress'->>'pendingUrls')::integer=0
          AND (checkpoint_payload->'counters'->>'terminalFailures')::integer=1
      )
      AND EXISTS (
        SELECT 1 FROM first_party_crawl_terminal_failure_events
        WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid
          AND run_id='${P12_2_L10_19_A_RUN_ID}'
          AND canonical_origin='${P12_2_L10_19_A_ORIGIN}'
          AND execution_plan_fingerprint='${P12_2_L10_19_A_EXECUTION_PLAN_FINGERPRINT}'
          AND canonical_url='${P12_2_L10_19_A_FAILURE_URL}'
          AND event_type='terminal_failure'
          AND source_event_fingerprint IS NULL
          AND event_fingerprint='${P12_2_L10_19_A_FAILURE_EVENT_FINGERPRINT}'
      )
      AND EXISTS (
        SELECT 1 FROM first_party_crawl_accounting_snapshots
        WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid
          AND run_id='${P12_2_L10_19_A_RUN_ID}'
          AND canonical_origin='${P12_2_L10_19_A_ORIGIN}'
          AND execution_plan_fingerprint='${P12_2_L10_19_A_EXECUTION_PLAN_FINGERPRINT}'
          AND snapshot_fingerprint='${P12_2_L10_19_A_ACCOUNTING_SNAPSHOT_FINGERPRINT}'
          AND whole_site_certified=false
          AND terminal_failure_count=1
      )
      AND (SELECT count(*) FROM first_party_crawl_completed_runs
        WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid
          AND run_id='${P12_2_L10_19_A_RUN_ID}'
          AND canonical_origin='${P12_2_L10_19_A_ORIGIN}')=0
      AND (SELECT count(*) FROM first_party_crawl_terminal_failure_recovery_receipts
        WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid
          AND run_id='${P12_2_L10_19_A_RUN_ID}'
          AND canonical_origin='${P12_2_L10_19_A_ORIGIN}')=0
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema='public'
          AND table_name IN (
            'first_party_crawl_terminal_failure_dispositions',
            'first_party_crawl_terminal_failure_reconciliation_receipts'
          )
      )
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema='public'
          AND table_name IN (
            'policy_mutation_reservations','policy_mutation_control_state',
            'policy_mutation_control_events','policy_mutation_claims',
            'policy_mutation_dispatches','policy_mutation_dispatch_events'
          )
      )
      THEN 1 ELSE 0 END;`,
    `\\i ${MIGRATION_FILE}`,
    "SELECT 'post_table_count',count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';",
    "SELECT 'post_target_counts',(SELECT count(*)::int FROM first_party_crawl_terminal_failure_dispositions),(SELECT count(*)::int FROM first_party_crawl_terminal_failure_reconciliation_receipts);",
    `SELECT 'post_guard',1/CASE WHEN
      (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE')=${P12_2_L10_19_A_EXPECTED_POST_TABLE_COUNT}
      AND (SELECT count(*) FROM first_party_crawl_terminal_failure_dispositions)=0
      AND (SELECT count(*) FROM first_party_crawl_terminal_failure_reconciliation_receipts)=0
      AND (
        SELECT count(*) FROM pg_catalog.pg_trigger t
        JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
        JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND NOT t.tgisinternal
          AND t.tgname IN (
            'trg_first_party_crawl_terminal_failure_dispositions_immutable',
            'trg_first_party_crawl_terminal_failure_reconciliation_immutable'
          )
      )=2
      AND EXISTS (
        SELECT 1 FROM first_party_crawl_l2_invocations
        WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid
          AND packet_fingerprint='${P12_2_L10_19_A_PACKET_FINGERPRINT}'
          AND run_id='${P12_2_L10_19_A_RUN_ID}'
          AND status='completed'
          AND receipt_fingerprint='${P12_2_L10_19_A_L2_RECEIPT_FINGERPRINT}'
      )
      AND EXISTS (
        SELECT 1 FROM first_party_crawl_checkpoints
        WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid
          AND run_id='${P12_2_L10_19_A_RUN_ID}'
          AND checkpoint_fingerprint='${P12_2_L10_19_A_CHECKPOINT_FINGERPRINT}'
          AND checkpoint_revision=${P12_2_L10_19_A_CHECKPOINT_REVISION}
      )
      AND EXISTS (
        SELECT 1 FROM first_party_crawl_terminal_failure_events
        WHERE event_fingerprint='${P12_2_L10_19_A_FAILURE_EVENT_FINGERPRINT}'
          AND canonical_url='${P12_2_L10_19_A_FAILURE_URL}'
      )
      AND EXISTS (
        SELECT 1 FROM first_party_crawl_accounting_snapshots
        WHERE snapshot_fingerprint='${P12_2_L10_19_A_ACCOUNTING_SNAPSHOT_FINGERPRINT}'
          AND terminal_failure_count=1
      )
      AND (SELECT count(*) FROM first_party_crawl_completed_runs
        WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid
          AND run_id='${P12_2_L10_19_A_RUN_ID}')=0
      AND (SELECT count(*) FROM first_party_crawl_terminal_failure_recovery_receipts
        WHERE site_id='${P12_2_L10_19_A_SITE_ID}'::uuid
          AND run_id='${P12_2_L10_19_A_RUN_ID}')=0
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema='public'
          AND table_name IN (
            'policy_mutation_reservations','policy_mutation_control_state',
            'policy_mutation_control_events','policy_mutation_claims',
            'policy_mutation_dispatches','policy_mutation_dispatch_events'
          )
      )
      THEN 1 ELSE 0 END;`,
  ].join("\n") + "\n";
}

async function main(): Promise<void> {
  exact(required("RAILWAY_PROJECT_ID"), P12_2_L10_19_A_PROJECT_ID, "p12_2_l10_19_a_project_mismatch");
  exact(required("RAILWAY_ENVIRONMENT_ID"), P12_2_L10_19_A_ENVIRONMENT_ID, "p12_2_l10_19_a_environment_mismatch");
  exact(required("P12_2_L10_19_A_POSTGRES_SERVICE_ID"), P12_2_L10_19_A_POSTGRES_SERVICE_ID, "p12_2_l10_19_a_postgres_service_mismatch");
  exact(required("P12_2_L10_19_A_AUTHORIZATION_LITERAL"), p122L1019AMigrationAuthorizationLiteral(), "p12_2_l10_19_a_authorization_mismatch");

  const databaseUrl = required("DATABASE_URL");
  if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
    throw new Error("p12_2_l10_19_a_database_url_scheme_invalid");
  }

  const migration = await readFile(MIGRATION_FILE);
  exact(
    createHash("sha256").update(migration).digest("hex"),
    P12_2_L10_19_A_MIGRATION_SHA256,
    "p12_2_l10_19_a_migration_sha256_mismatch",
  );

  const args = ["--no-psqlrc", "--set", "ON_ERROR_STOP=1"];
  assertP122L1AE9NoCredentialArgv(args, databaseUrl);
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ...buildP122L1AE9PsqlConnectionEnv(databaseUrl),
    PGOPTIONS: "-c statement_timeout=15000 -c lock_timeout=5000",
  };
  delete childEnv.DATABASE_URL;

  const startedAt = new Date().toISOString();
  const result = await new Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
    overflow: boolean;
  }>((resolve, reject) => {
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
    version: P12_2_L10_19_A_VERSION,
    projectId: P12_2_L10_19_A_PROJECT_ID,
    environmentId: P12_2_L10_19_A_ENVIRONMENT_ID,
    postgresServiceId: P12_2_L10_19_A_POSTGRES_SERVICE_ID,
    migrationPath: P12_2_L10_19_A_MIGRATION_PATH,
    migrationBlobSha: P12_2_L10_19_A_MIGRATION_BLOB_SHA,
    migrationSha256: P12_2_L10_19_A_MIGRATION_SHA256,
    authorizationFingerprint: p122L1019AMigrationAuthorizationFingerprint(),
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
      : "p12_2_l10_19_a_bounded_failure";
  process.stderr.write(JSON.stringify({
    version: P12_2_L10_19_A_VERSION,
    completed: false,
    error: message,
    psqlProcessesStarted: 0,
    credentialMaterialRecorded: false,
  }) + "\n");
  process.exitCode = 1;
});
