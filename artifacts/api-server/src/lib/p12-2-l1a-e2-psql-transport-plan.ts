import { createHash } from "node:crypto";
import {
  P12_2_L1A_E1_QUERIES,
  P12_2_L1A_E1_SITE_ID,
  p122L1AE1AuthorizationLiteral,
  p122L1AE1QuerySetFingerprint,
} from "./p12-2-l1a-e1-readonly-query-contract.js";

export const P12_2_L1A_E2_VERSION = "p12-2-l1a-e2-psql-transport-plan-v1" as const;

export const P12_2_L1A_E11_AUTHORIZATION_GENERATION =
  "attempt-2-after-e9-transport-repair" as const;

export type P122L1AE2Command = {
  ordinal: number;
  queryId: (typeof P12_2_L1A_E1_QUERIES)[number]["id"];
  executable: "psql";
  args: readonly string[];
  readsCredentials: false;
  executesProcess: false;
  retries: 0;
};

export type P122L1AE2Plan = {
  version: typeof P12_2_L1A_E2_VERSION;
  querySetFingerprint: string;
  authorizationLiteral: string;
  connectionVariableName: "DATABASE_URL";
  commandCount: 7;
  oneAttemptOnly: true;
  retries: 0;
  fallbackTransportAllowed: false;
  readsCredentials: false;
  executesProcesses: false;
  commands: readonly P122L1AE2Command[];
};

function quoteUuidLiteral(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)) {
    throw new Error("p12_2_l1a_e2_site_id_invalid");
  }
  return `'${value}'::uuid`;
}

function renderedSql(
  query: (typeof P12_2_L1A_E1_QUERIES)[number],
): string {
  if (query.params.length === 0) return query.sql;
  if (
    query.id !== "exact_site_binding" ||
    query.params.length !== 1 ||
    query.params[0] !== P12_2_L1A_E1_SITE_ID
  ) {
    throw new Error("p12_2_l1a_e2_parameterized_query_unexpected");
  }
  return query.sql.replace("$1::uuid", quoteUuidLiteral(P12_2_L1A_E1_SITE_ID));
}

export function buildP122L1AE2Plan(): P122L1AE2Plan {
  if (P12_2_L1A_E1_QUERIES.length !== 7) {
    throw new Error("p12_2_l1a_e2_query_count_drift");
  }

  const commands = P12_2_L1A_E1_QUERIES.map((query, index) => ({
    ordinal: index + 1,
    queryId: query.id,
    executable: "psql" as const,
    args: [
      "--no-psqlrc",
      "--set",
      "ON_ERROR_STOP=1",
      "--tuples-only",
      "--csv",
      "--command",
      renderedSql(query),
    ] as const,
    readsCredentials: false as const,
    executesProcess: false as const,
    retries: 0 as const,
  }));

  return Object.freeze({
    version: P12_2_L1A_E2_VERSION,
    querySetFingerprint: p122L1AE1QuerySetFingerprint(),
    authorizationLiteral: p122L1AE1AuthorizationLiteral(),
    connectionVariableName: "DATABASE_URL",
    commandCount: 7,
    oneAttemptOnly: true,
    retries: 0,
    fallbackTransportAllowed: false,
    readsCredentials: false,
    executesProcesses: false,
    commands,
  });
}

export function assertP122L1AE2Plan(plan: P122L1AE2Plan): void {
  if (plan.version !== P12_2_L1A_E2_VERSION) throw new Error("p12_2_l1a_e2_version_invalid");
  if (plan.querySetFingerprint !== p122L1AE1QuerySetFingerprint()) {
    throw new Error("p12_2_l1a_e2_query_fingerprint_mismatch");
  }
  if (plan.authorizationLiteral !== p122L1AE1AuthorizationLiteral()) {
    throw new Error("p12_2_l1a_e2_authorization_literal_mismatch");
  }
  if (
    plan.connectionVariableName !== "DATABASE_URL" ||
    plan.commandCount !== 7 ||
    plan.commands.length !== 7 ||
    plan.oneAttemptOnly !== true ||
    plan.retries !== 0 ||
    plan.fallbackTransportAllowed !== false ||
    plan.readsCredentials !== false ||
    plan.executesProcesses !== false
  ) {
    throw new Error("p12_2_l1a_e2_execution_boundary_changed");
  }

  for (let i = 0; i < plan.commands.length; i += 1) {
    const command = plan.commands[i]!;
    const source = P12_2_L1A_E1_QUERIES[i]!;
    if (
      command.ordinal !== i + 1 ||
      command.queryId !== source.id ||
      command.executable !== "psql" ||
      command.retries !== 0 ||
      command.readsCredentials !== false ||
      command.executesProcess !== false
    ) {
      throw new Error("p12_2_l1a_e2_command_identity_mismatch");
    }
    if (
      command.args[0] !== "--no-psqlrc" ||
      command.args[1] !== "--set" ||
      command.args[2] !== "ON_ERROR_STOP=1" ||
      command.args[3] !== "--tuples-only" ||
      command.args[4] !== "--csv" ||
      command.args[5] !== "--command" ||
      command.args.length !== 7
    ) {
      throw new Error("p12_2_l1a_e2_psql_flags_invalid");
    }
    const sql = command.args[6]!;
    if (!/^SELECT\b/i.test(sql)) throw new Error("p12_2_l1a_e2_non_select_forbidden");
    if (sql.includes(";")) throw new Error("p12_2_l1a_e2_multi_statement_forbidden");
  }
}

export function p122L1AE2LiveAuthorizationFingerprint(): string {
  const plan = buildP122L1AE2Plan();
  assertP122L1AE2Plan(plan);
  const stable = JSON.stringify({
    querySetFingerprint: plan.querySetFingerprint,
    authorizationGeneration: P12_2_L1A_E11_AUTHORIZATION_GENERATION,
  });
  return createHash("sha256").update(stable).digest("hex");
}

export function p122L1AE2LiveAuthorizationLiteral(): string {
  return `AUTHORIZE:P12_2_L1A_PSQL_ONE_SHOT_V2:${p122L1AE2LiveAuthorizationFingerprint()}`;
}
