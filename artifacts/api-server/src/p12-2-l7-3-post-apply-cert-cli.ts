import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import {
  P12_2_L7_3_ENVIRONMENT_ID,
  P12_2_L7_3_MIGRATION_BLOB_SHA,
  P12_2_L7_3_MIGRATION_PATH,
  P12_2_L7_3_MIGRATION_SHA256,
  P12_2_L7_3_POSTGRES_SERVICE_ID,
  P12_2_L7_3_PROJECT_ID,
  P12_2_L7_3_QUERIES,
  P12_2_L7_3_VERSION,
  assertP122L73QueryContract,
  p122L73AuthorizationLiteral,
  p122L73QuerySetFingerprint,
} from "./lib/p12-2-l7-3-post-apply-certification.js";
import {
  assertP122L1AE9NoCredentialArgv,
  buildP122L1AE9PsqlConnectionEnv,
} from "./lib/p12-2-l1a-e9-runtime-transport.js";

const MAX_OUTPUT_BYTES = 262_144;

async function psqlAvailable(): Promise<boolean> {
  try {
    await access("/usr/bin/psql", constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function required(name: string): string {
  const value = process.env[name]?.trim() ?? "";
  if (!value) throw new Error(`p12_2_l7_3_missing_env_${name.toLowerCase()}`);
  return value;
}

function exact(value: string, expected: string, code: string): void {
  if (value !== expected) throw new Error(code);
}

function sanitize(value: string, databaseUrl: string): string {
  if (!value) return "";
  return value.split(databaseUrl).join("[REDACTED_DATABASE_URL]");
}

async function executeQuery(databaseUrl: string, sql: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const args = [
    "--no-psqlrc",
    "--set", "ON_ERROR_STOP=1",
    "--tuples-only",
    "--csv",
    "--command", sql,
  ];
  assertP122L1AE9NoCredentialArgv(args, databaseUrl);
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ...buildP122L1AE9PsqlConnectionEnv(databaseUrl),
    PGOPTIONS: "-c default_transaction_read_only=on -c statement_timeout=15000",
  };
  delete childEnv.DATABASE_URL;

  return await new Promise((resolve, reject) => {
    const child = spawn("/usr/bin/psql", args, { shell: false, env: childEnv, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let overflow = false;
    const append = (current: string, chunk: Buffer) => {
      const next = current + chunk.toString("utf8");
      if (Buffer.byteLength(next, "utf8") > MAX_OUTPUT_BYTES) {
        overflow = true;
        return next.slice(0, MAX_OUTPUT_BYTES);
      }
      return next;
    };
    child.stdout.on("data", (chunk: Buffer) => { stdout = append(stdout, chunk); if (overflow) child.kill("SIGTERM"); });
    child.stderr.on("data", (chunk: Buffer) => { stderr = append(stderr, chunk); if (overflow) child.kill("SIGTERM"); });
    child.once("error", reject);
    child.once("close", (code) => resolve({
      exitCode: overflow ? 70 : (typeof code === "number" ? code : 71),
      stdout: sanitize(stdout, databaseUrl),
      stderr: sanitize(overflow ? `${stderr}\np12_2_l7_3_output_limit_exceeded` : stderr, databaseUrl),
    }));
  });
}

async function main(): Promise<void> {
  assertP122L73QueryContract();
  exact(required("RAILWAY_PROJECT_ID"), P12_2_L7_3_PROJECT_ID, "p12_2_l7_3_project_mismatch");
  exact(required("RAILWAY_ENVIRONMENT_ID"), P12_2_L7_3_ENVIRONMENT_ID, "p12_2_l7_3_environment_mismatch");
  exact(required("P12_2_L7_3_POSTGRES_SERVICE_ID"), P12_2_L7_3_POSTGRES_SERVICE_ID, "p12_2_l7_3_postgres_service_mismatch");
  exact(required("P12_2_L7_3_AUTHORIZATION_LITERAL"), p122L73AuthorizationLiteral(), "p12_2_l7_3_authorization_mismatch");
  const databaseUrl = required("DATABASE_URL");
  if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) throw new Error("p12_2_l7_3_database_url_scheme_invalid");
  if (!(await psqlAvailable())) throw new Error("p12_2_l7_3_psql_unavailable");

  const queryReceipts: Array<{ ordinal: number; queryId: string; exitCode: number; stdout: string; stderr: string }> = [];
  for (let index = 0; index < P12_2_L7_3_QUERIES.length; index += 1) {
    const query = P12_2_L7_3_QUERIES[index]!;
    const result = await executeQuery(databaseUrl, query.sql);
    queryReceipts.push({ ordinal: index + 1, queryId: query.id, ...result });
    if (result.exitCode !== 0) break;
  }

  const completed = queryReceipts.length === P12_2_L7_3_QUERIES.length && queryReceipts.every((receipt) => receipt.exitCode === 0);
  process.stdout.write(`${JSON.stringify({
    version: P12_2_L7_3_VERSION,
    projectId: P12_2_L7_3_PROJECT_ID,
    environmentId: P12_2_L7_3_ENVIRONMENT_ID,
    postgresServiceId: P12_2_L7_3_POSTGRES_SERVICE_ID,
    migrationPath: P12_2_L7_3_MIGRATION_PATH,
    migrationBlobSha: P12_2_L7_3_MIGRATION_BLOB_SHA,
    migrationSha256: P12_2_L7_3_MIGRATION_SHA256,
    querySetFingerprint: p122L73QuerySetFingerprint(),
    authorizationLiteral: p122L73AuthorizationLiteral(),
    completed,
    queryReceipts,
    attempts: 1,
    retries: 0,
    fallbackTransportUsed: false,
    credentialMaterialRecorded: false,
    sessionReadOnly: true,
  })}\n`);
  process.exitCode = completed ? 0 : 1;
}

main().catch((error) => {
  const message = error instanceof Error && /^[a-z0-9_:-]+$/.test(error.message)
    ? error.message
    : "p12_2_l7_3_bounded_failure";
  process.stderr.write(`${JSON.stringify({
    version: P12_2_L7_3_VERSION,
    completed: false,
    error: message,
    credentialMaterialRecorded: false,
    sessionReadOnly: true,
  })}\n`);
  process.exitCode = 1;
});
