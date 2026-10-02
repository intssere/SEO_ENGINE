import {
  runP122L1AE3OneShot,
  type P122L1AE3Executor,
  type P122L1AE3Receipt,
} from "./p12-2-l1a-e3-credential-runner-contract.js";
import {
  buildP122L1AE4OutcomeReceipt,
  certifyP122L1AE4Preflight,
  P12_2_L1A_E4_BINDING,
  type P122L1AE4OutcomeReceipt,
  type P122L1AE4PreflightReceipt,
} from "./p12-2-l1a-e4-execution-surface-audit-contract.js";

export const P12_2_L1A_E5_VERSION = "p12-2-l1a-e5-one-shot-operator-entrypoint-v1" as const;

export type P122L1AE5Input = {
  authorizationLiteral: string;
  databaseUrl: string;
  executor: P122L1AE3Executor;
  psqlAvailable: boolean;
  databaseUrlPrinted: boolean;
  retriesConfigured: number;
  fallbackTransportConfigured: boolean;
};

export type P122L1AE5Receipt = {
  version: typeof P12_2_L1A_E5_VERSION;
  preflight: P122L1AE4PreflightReceipt;
  execution: P122L1AE3Receipt;
  outcome: P122L1AE4OutcomeReceipt;
  productionSqlAttemptConsumed: boolean;
};

export async function runP122L1AE5OneShot(
  input: P122L1AE5Input,
): Promise<P122L1AE5Receipt> {
  const preflight = certifyP122L1AE4Preflight({
    ...P12_2_L1A_E4_BINDING,
    psqlAvailable: input.psqlAvailable,
    databaseUrlInjected: input.databaseUrl.length > 0,
    databaseUrlPrinted: input.databaseUrlPrinted,
    retriesConfigured: input.retriesConfigured,
    fallbackTransportConfigured: input.fallbackTransportConfigured,
    authorizationLiteral: input.authorizationLiteral,
  });

  let firstExecutorInvocation = false;

  const guardedExecutor: P122L1AE3Executor = async (execInput) => {
    firstExecutorInvocation = true;
    return input.executor(execInput);
  };

  const execution = await runP122L1AE3OneShot({
    authorizationLiteral: input.authorizationLiteral,
    databaseUrl: input.databaseUrl,
    executor: guardedExecutor,
  });

  const outcome = buildP122L1AE4OutcomeReceipt(preflight, execution);

  return Object.freeze({
    version: P12_2_L1A_E5_VERSION,
    preflight,
    execution,
    outcome,
    productionSqlAttemptConsumed: firstExecutorInvocation,
  });
}
