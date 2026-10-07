import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import {
  P12_2_L10_18_POST_REPAIR_CERT_VERSION,
  P12_2_L10_18_POST_REPAIR_QUERIES,
  assertP122L1018PostRepairQueryContract,
  p122L1018PostRepairAuthorizationLiteral,
  p122L1018PostRepairQuerySetFingerprint,
} from "./lib/p12-2-l10-18-packet-014-post-repair-certification.js";
import {
  P12_2_L10_18_ENVIRONMENT_ID,
  P12_2_L10_18_POSTGRES_SERVICE_ID,
  P12_2_L10_18_PROJECT_ID,
} from "./lib/p12-2-l10-18-packet-014-finalization-repair.js";
import {
  P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT,
  P12_2_L10_15_RUN_ID,
} from "./lib/p12-2-l10-15-packet-014-full-initial.js";
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
  if (!value) throw new Error("p12_2_l10_18_post_repair_missing_env_" + name.toLowerCase());
  return value;
}

function exact(actual: string, expected: string, code: string): void {
  if (actual !== expected) throw new Error(code);
}

function sanitize(value: string, databaseUrl: string): string {
  return value ? value.split(databaseUrl).join("[REDACTED_DATABASE_URL]") : "";
}

async function executeQuery(databaseUrl: string, sql: string) {
  const args = [
    "--no-psqlrc",
    "--set",
    "ON_ERROR_STOP=1",
    "--tuples-only",
    "--csv",
    "--command",
    sql,
  ];
  assertP122L1AE9NoCredentialArgv(args, databaseUrl);
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ...buildP122L1AE9PsqlConnectionEnv(databaseUrl),
    PGOPTIONS: "-c default_transaction_read_only=on -c statement_timeout=15000",
  };
  delete childEnv.DATABASE_URL;

  return await new Promise<{exitCode:number;stdout:string;stderr:string}>((resolve, reject) => {
    const child = spawn("/usr/bin/psql", args, {
      shell: false,
      env: childEnv,
      stdio: ["ignore", "pipe", "pipe"],
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
      stdout: sanitize(stdout, databaseUrl),
      stderr: sanitize(stderr, databaseUrl),
    }));
  });
}

async function main(): Promise<void> {
  assertP122L1018PostRepairQueryContract();
  exact(required("RAILWAY_PROJECT_ID"), P12_2_L10_18_PROJECT_ID, "p12_2_l10_18_post_repair_project_mismatch");
  exact(required("RAILWAY_ENVIRONMENT_ID"), P12_2_L10_18_ENVIRONMENT_ID, "p12_2_l10_18_post_repair_environment_mismatch");
  exact(required("P12_2_L10_18_POSTGRES_SERVICE_ID"), P12_2_L10_18_POSTGRES_SERVICE_ID, "p12_2_l10_18_post_repair_postgres_service_mismatch");

  const repairDeploymentId = required("P12_2_L10_18_REPAIR_DEPLOYMENT_ID");
  exact(
    required("P12_2_L10_18_POST_REPAIR_AUTHORIZATION_LITERAL"),
    p122L1018PostRepairAuthorizationLiteral(repairDeploymentId),
    "p12_2_l10_18_post_repair_authorization_mismatch",
  );

  const databaseUrl = required("DATABASE_URL");
  if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
    throw new Error("p12_2_l10_18_post_repair_database_url_scheme_invalid");
  }
  if (!(await psqlAvailable())) throw new Error("p12_2_l10_18_post_repair_psql_unavailable");

  const queryReceipts = [];
  for (let index = 0; index < P12_2_L10_18_POST_REPAIR_QUERIES.length; index += 1) {
    const query = P12_2_L10_18_POST_REPAIR_QUERIES[index]!;
    const result = await executeQuery(databaseUrl, query.sql);
    queryReceipts.push({ ordinal: index + 1, queryId: query.id, ...result });
    if (result.exitCode !== 0) break;
  }

  const completed =
    queryReceipts.length === P12_2_L10_18_POST_REPAIR_QUERIES.length &&
    queryReceipts.every((receipt) => receipt.exitCode === 0);

  process.stdout.write(JSON.stringify({
    version: P12_2_L10_18_POST_REPAIR_CERT_VERSION,
    projectId: P12_2_L10_18_PROJECT_ID,
    environmentId: P12_2_L10_18_ENVIRONMENT_ID,
    postgresServiceId: P12_2_L10_18_POSTGRES_SERVICE_ID,
    packetFingerprint: P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT,
    runId: P12_2_L10_15_RUN_ID,
    repairDeploymentId,
    querySetFingerprint: p122L1018PostRepairQuerySetFingerprint(),
    authorizationLiteral: p122L1018PostRepairAuthorizationLiteral(repairDeploymentId),
    completed,
    queryReceipts,
    attempts: 1,
    retries: 0,
    fallbackTransportUsed: false,
    credentialMaterialRecorded: false,
    sessionReadOnly: true,
    crawlExecutionPossible: false,
    recoveryExecutionPossible: false,
    providerWritesPossible: false,
    publicSiteWritesPossible: false,
  }) + "\n");

  process.exitCode = completed ? 0 : 1;
}

main().catch((error) => {
  const message =
    error instanceof Error && /^[a-z0-9_:-]+$/.test(error.message)
      ? error.message
      : "p12_2_l10_18_post_repair_bounded_failure";
  process.stderr.write(JSON.stringify({
    version: P12_2_L10_18_POST_REPAIR_CERT_VERSION,
    completed: false,
    error: message,
    credentialMaterialRecorded: false,
    sessionReadOnly: true,
    crawlExecutionPossible: false,
    recoveryExecutionPossible: false,
    providerWritesPossible: false,
    publicSiteWritesPossible: false,
  }) + "\n");
  process.exitCode = 1;
});
