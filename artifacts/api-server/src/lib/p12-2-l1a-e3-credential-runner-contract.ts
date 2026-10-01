import {
  assertP122L1AE2Plan,
  buildP122L1AE2Plan,
  p122L1AE2LiveAuthorizationLiteral,
} from "./p12-2-l1a-e2-psql-transport-plan.js";

export const P12_2_L1A_E3_VERSION = "p12-2-l1a-e3-credential-runner-contract-v1" as const;

export type P122L1AE3ExecInput = {
  executable: "psql";
  args: readonly string[];
  env: Readonly<{ DATABASE_URL: string }>;
};

export type P122L1AE3ExecResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type P122L1AE3Executor = (
  input: P122L1AE3ExecInput,
) => Promise<P122L1AE3ExecResult>;

export type P122L1AE3QueryReceipt = {
  ordinal: number;
  queryId: string;
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type P122L1AE3Receipt = {
  version: typeof P12_2_L1A_E3_VERSION;
  querySetFingerprint: string;
  authorizationLiteral: string;
  completed: boolean;
  stoppedAtOrdinal: number | null;
  queryReceipts: readonly P122L1AE3QueryReceipt[];
  attempts: 1;
  retries: 0;
  fallbackTransportUsed: false;
  credentialMaterialReturned: false;
};

function assertDatabaseUrl(value: string): void {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("p12_2_l1a_e3_database_url_missing");
  }
  if (!/^postgres(?:ql)?:\/\//i.test(value)) {
    throw new Error("p12_2_l1a_e3_database_url_scheme_invalid");
  }
}

function sanitize(value: string, databaseUrl: string): string {
  if (!value) return "";
  return value.split(databaseUrl).join("[REDACTED_DATABASE_URL]");
}

export async function runP122L1AE3OneShot(args: {
  authorizationLiteral: string;
  databaseUrl: string;
  executor: P122L1AE3Executor;
}): Promise<P122L1AE3Receipt> {
  const plan = buildP122L1AE2Plan();
  assertP122L1AE2Plan(plan);

  const expectedAuthorization = p122L1AE2LiveAuthorizationLiteral();
  if (args.authorizationLiteral !== expectedAuthorization) {
    throw new Error("p12_2_l1a_e3_authorization_mismatch");
  }
  assertDatabaseUrl(args.databaseUrl);
  if (typeof args.executor !== "function") {
    throw new Error("p12_2_l1a_e3_executor_missing");
  }

  const queryReceipts: P122L1AE3QueryReceipt[] = [];

  for (const command of plan.commands) {
    const result = await args.executor({
      executable: "psql",
      args: command.args,
      env: Object.freeze({ DATABASE_URL: args.databaseUrl }),
    });

    const receipt = {
      ordinal: command.ordinal,
      queryId: command.queryId,
      exitCode: result.exitCode,
      stdout: sanitize(result.stdout, args.databaseUrl),
      stderr: sanitize(result.stderr, args.databaseUrl),
    };
    queryReceipts.push(receipt);

    if (result.exitCode !== 0) {
      return Object.freeze({
        version: P12_2_L1A_E3_VERSION,
        querySetFingerprint: plan.querySetFingerprint,
        authorizationLiteral: expectedAuthorization,
        completed: false,
        stoppedAtOrdinal: command.ordinal,
        queryReceipts: Object.freeze(queryReceipts),
        attempts: 1,
        retries: 0,
        fallbackTransportUsed: false,
        credentialMaterialReturned: false,
      });
    }
  }

  return Object.freeze({
    version: P12_2_L1A_E3_VERSION,
    querySetFingerprint: plan.querySetFingerprint,
    authorizationLiteral: expectedAuthorization,
    completed: true,
    stoppedAtOrdinal: null,
    queryReceipts: Object.freeze(queryReceipts),
    attempts: 1,
    retries: 0,
    fallbackTransportUsed: false,
    credentialMaterialReturned: false,
  });
}
