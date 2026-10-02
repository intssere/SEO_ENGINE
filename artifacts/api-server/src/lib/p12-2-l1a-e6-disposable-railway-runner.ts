import type { P122L1AE3Executor } from "./p12-2-l1a-e3-credential-runner-contract.js";
import {
  runP122L1AE5OneShot,
  type P122L1AE5Receipt,
} from "./p12-2-l1a-e5-one-shot-operator-entrypoint.js";

export const P12_2_L1A_E6_VERSION = "p12-2-l1a-e6-disposable-railway-runner-v1" as const;

export const P12_2_L1A_E6_ENV = Object.freeze({
  projectId: "RAILWAY_PROJECT_ID",
  environmentId: "RAILWAY_ENVIRONMENT_ID",
  postgresServiceId: "P12_2_L1A_POSTGRES_SERVICE_ID",
  databaseUrl: "DATABASE_URL",
  authorizationLiteral: "P12_2_L1A_AUTHORIZATION_LITERAL",
});

export type P122L1AE6Environment = Readonly<Record<string, string | undefined>>;

export type P122L1AE6Receipt = {
  version: typeof P12_2_L1A_E6_VERSION;
  e5: P122L1AE5Receipt;
};

function required(env: P122L1AE6Environment, name: string): string {
  const value = env[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`p12_2_l1a_e6_missing_env_${name.toLowerCase()}`);
  }
  return value;
}

export async function runP122L1AE6DisposableRunner(args: {
  env: P122L1AE6Environment;
  executor: P122L1AE3Executor;
  psqlAvailable: boolean;
}): Promise<P122L1AE6Receipt> {
  const projectId = required(args.env, P12_2_L1A_E6_ENV.projectId);
  const environmentId = required(args.env, P12_2_L1A_E6_ENV.environmentId);
  const postgresServiceId = required(args.env, P12_2_L1A_E6_ENV.postgresServiceId);
  const databaseUrl = required(args.env, P12_2_L1A_E6_ENV.databaseUrl);
  const authorizationLiteral = required(args.env, P12_2_L1A_E6_ENV.authorizationLiteral);

  const e5 = await runP122L1AE5OneShot({
    projectId,
    environmentId,
    postgresServiceId,
    authorizationLiteral,
    databaseUrl,
    executor: args.executor,
    psqlAvailable: args.psqlAvailable,
    databaseUrlPrinted: false,
    retriesConfigured: 0,
    fallbackTransportConfigured: false,
  });

  return Object.freeze({
    version: P12_2_L1A_E6_VERSION,
    e5,
  });
}
