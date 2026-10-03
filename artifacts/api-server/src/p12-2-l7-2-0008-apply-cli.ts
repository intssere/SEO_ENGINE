import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import {
  P12_2_L7_2_ENVIRONMENT_ID,
  P12_2_L7_2_EXPECTED_POST_TABLE_COUNT,
  P12_2_L7_2_EXPECTED_PRE_TABLE_COUNT,
  P12_2_L7_2_MIGRATION_BLOB_SHA,
  P12_2_L7_2_MIGRATION_PATH,
  P12_2_L7_2_MIGRATION_SHA256,
  P12_2_L7_2_ORIGIN,
  P12_2_L7_2_POSTGRES_SERVICE_ID,
  P12_2_L7_2_PROJECT_ID,
  P12_2_L7_2_SITE_ID,
  P12_2_L7_2_VERSION,
  p122L72AuthorizationFingerprint,
  p122L72AuthorizationLiteral,
} from "./lib/p12-2-l7-2-0008-apply-contract.js";
import {
  assertP122L1AE9NoCredentialArgv,
  buildP122L1AE9PsqlConnectionEnv,
} from "./lib/p12-2-l1a-e9-runtime-transport.js";

const MIGRATION_FILE = "/app/0008_first_party_crawl_l2_invocations.sql";
const MAX_OUTPUT_BYTES = 262_144;

function required(name: string): string {
  const value = process.env[name]?.trim() ?? "";
  if (!value) throw new Error(`p12_2_l7_2_missing_env_${name.toLowerCase()}`);
  return value;
}

function exact(actual: string, expected: string, code: string): void {
  if (actual !== expected) throw new Error(code);
}

function boundedAppend(current: string, chunk: Buffer): { value: string; overflow: boolean } {
  const next = current + chunk.toString("utf8");
  if (Buffer.byteLength(next, "utf8") > MAX_OUTPUT_BYTES) {
    return { value: next.slice(0, MAX_OUTPUT_BYTES), overflow: true };
  }
  return { value: next, overflow: false };
}

function wrapperSql(): string {
  return [
    "\\set ON_ERROR_STOP on",
    "\\pset tuples_only on",
    "\\pset format csv",
    `SELECT 'preflight_guard', 1 / CASE WHEN
      (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') = ${P12_2_L7_2_EXPECTED_PRE_TABLE_COUNT}
      AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'first_party_crawl_l2_invocations')
      AND EXISTS (
        SELECT 1 FROM public.sites
        WHERE id = '${P12_2_L7_2_SITE_ID}'::uuid
          AND lower(domain) = 'diamondshelf.us'
          AND canonical_origin = '${P12_2_L7_2_ORIGIN}'
          AND is_active = true
      )
      THEN 1 ELSE 0 END`,
    `\\i ${MIGRATION_FILE}`,
    `SELECT 'post_table_count', count(*)::int FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
    `SELECT 'post_l2_presence', count(*)::int FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name = 'first_party_crawl_l2_invocations'`,
    `SELECT 'post_l2_columns', column_name, ordinal_position, data_type, udt_name, is_nullable, character_maximum_length FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'first_party_crawl_l2_invocations' ORDER BY ordinal_position`,
    `SELECT 'post_l2_constraints', con.conname, con.contype, pg_get_constraintdef(con.oid, true) FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class c ON c.oid = con.conrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'first_party_crawl_l2_invocations' ORDER BY con.conname`,
    `SELECT 'post_l2_indexes', indexname, indexdef FROM pg_catalog.pg_indexes WHERE schemaname = 'public' AND tablename = 'first_party_crawl_l2_invocations' ORDER BY indexname`,
    `SELECT 'post_site_binding', id::text, domain, canonical_origin, is_active FROM public.sites WHERE id = '${P12_2_L7_2_SITE_ID}'::uuid`,
    `SELECT 'post_guard', 1 / CASE WHEN
      (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') = ${P12_2_L7_2_EXPECTED_POST_TABLE_COUNT}
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name = 'first_party_crawl_l2_invocations')
      THEN 1 ELSE 0 END`,
  ].join("\n") + "\n";
}

async function main(): Promise<void> {
  exact(required("RAILWAY_PROJECT_ID"), P12_2_L7_2_PROJECT_ID, "p12_2_l7_2_project_mismatch");
  exact(required("RAILWAY_ENVIRONMENT_ID"), P12_2_L7_2_ENVIRONMENT_ID, "p12_2_l7_2_environment_mismatch");
  exact(required("P12_2_L7_2_POSTGRES_SERVICE_ID"), P12_2_L7_2_POSTGRES_SERVICE_ID, "p12_2_l7_2_postgres_service_mismatch");
  exact(required("P12_2_L7_2_AUTHORIZATION_LITERAL"), p122L72AuthorizationLiteral(), "p12_2_l7_2_authorization_mismatch");

  const databaseUrl = required("DATABASE_URL");
  if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) throw new Error("p12_2_l7_2_database_url_scheme_invalid");

  const migration = await readFile(MIGRATION_FILE);
  const migrationSha256 = createHash("sha256").update(migration).digest("hex");
  exact(migrationSha256, P12_2_L7_2_MIGRATION_SHA256, "p12_2_l7_2_migration_sha256_mismatch");

  const args = ["--no-psqlrc", "--set", "ON_ERROR_STOP=1"];
  assertP122L1AE9NoCredentialArgv(args, databaseUrl);
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ...buildP122L1AE9PsqlConnectionEnv(databaseUrl),
    PGOPTIONS: "-c statement_timeout=15000 -c lock_timeout=5000",
  };
  delete childEnv.DATABASE_URL;

  const startedAt = new Date().toISOString();
  const result = await new Promise<{ exitCode: number; stdout: string; stderr: string; overflow: boolean }>((resolve, reject) => {
    const child = spawn("/usr/bin/psql", args, { shell: false, env: childEnv, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let overflow = false;

    child.stdout.on("data", (chunk: Buffer) => {
      const next = boundedAppend(stdout, chunk);
      stdout = next.value;
      overflow ||= next.overflow;
      if (overflow) child.kill("SIGTERM");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      const next = boundedAppend(stderr, chunk);
      stderr = next.value;
      overflow ||= next.overflow;
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

  process.stdout.write(`${JSON.stringify({
    version: P12_2_L7_2_VERSION,
    projectId: P12_2_L7_2_PROJECT_ID,
    environmentId: P12_2_L7_2_ENVIRONMENT_ID,
    postgresServiceId: P12_2_L7_2_POSTGRES_SERVICE_ID,
    migrationPath: P12_2_L7_2_MIGRATION_PATH,
    migrationBlobSha: P12_2_L7_2_MIGRATION_BLOB_SHA,
    migrationSha256: P12_2_L7_2_MIGRATION_SHA256,
    authorizationFingerprint: p122L72AuthorizationFingerprint(),
    startedAt,
    completed: result.exitCode === 0 && !result.overflow,
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
    psqlProcesses: 1,
    attempts: 1,
    retries: 0,
    fallbackTransportUsed: false,
    credentialMaterialRecorded: false,
  })}\n`);
  process.exitCode = result.exitCode === 0 && !result.overflow ? 0 : 1;
}

main().catch((error) => {
  const message = error instanceof Error && /^[a-z0-9_:-]+$/.test(error.message)
    ? error.message
    : "p12_2_l7_2_bounded_failure";
  process.stderr.write(`${JSON.stringify({
    version: P12_2_L7_2_VERSION,
    completed: false,
    error: message,
    psqlProcessesStarted: 0,
    credentialMaterialRecorded: false,
  })}\n`);
  process.exitCode = 1;
});
