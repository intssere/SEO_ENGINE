import { createHash } from "node:crypto";
import {
  p122L1AE2LiveAuthorizationLiteral,
} from "./p12-2-l1a-e2-psql-transport-plan.js";
import {
  P12_2_L1A_E3_VERSION,
  type P122L1AE3Receipt,
} from "./p12-2-l1a-e3-credential-runner-contract.js";

export const P12_2_L1A_E4_VERSION = "p12-2-l1a-e4-execution-surface-audit-v1" as const;

export const P12_2_L1A_E4_BINDING = Object.freeze({
  projectId: "52265e29-921b-4652-ac0d-9da4e5e69936",
  environmentId: "7f8d920f-f6c6-44f0-b9fe-252cb4f32298",
  postgresServiceId: "b69e0633-7ab9-40ab-85f3-c9edd6acb031",
  environmentName: "production",
  serviceName: "Postgres",
});

export type P122L1AE4PreflightInput = {
  projectId: string;
  environmentId: string;
  postgresServiceId: string;
  psqlAvailable: boolean;
  databaseUrlInjected: boolean;
  databaseUrlPrinted: boolean;
  retriesConfigured: number;
  fallbackTransportConfigured: boolean;
  authorizationLiteral: string;
};

export type P122L1AE4PreflightReceipt = {
  version: typeof P12_2_L1A_E4_VERSION;
  binding: typeof P12_2_L1A_E4_BINDING;
  e3Version: typeof P12_2_L1A_E3_VERSION;
  authorizationLiteral: string;
  eligible: true;
  oneAttemptOnly: true;
  retries: 0;
  fallbackTransportAllowed: false;
  credentialMaterialRecorded: false;
  fingerprint: string;
};

function stableHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function certifyP122L1AE4Preflight(
  input: P122L1AE4PreflightInput,
): P122L1AE4PreflightReceipt {
  if (
    input.projectId !== P12_2_L1A_E4_BINDING.projectId ||
    input.environmentId !== P12_2_L1A_E4_BINDING.environmentId ||
    input.postgresServiceId !== P12_2_L1A_E4_BINDING.postgresServiceId
  ) {
    throw new Error("p12_2_l1a_e4_binding_mismatch");
  }
  if (input.authorizationLiteral !== p122L1AE2LiveAuthorizationLiteral()) {
    throw new Error("p12_2_l1a_e4_authorization_mismatch");
  }
  if (!input.psqlAvailable) throw new Error("p12_2_l1a_e4_psql_unavailable");
  if (!input.databaseUrlInjected) throw new Error("p12_2_l1a_e4_database_url_not_injected");
  if (input.databaseUrlPrinted) throw new Error("p12_2_l1a_e4_credential_disclosure_forbidden");
  if (input.retriesConfigured !== 0) throw new Error("p12_2_l1a_e4_retries_forbidden");
  if (input.fallbackTransportConfigured) throw new Error("p12_2_l1a_e4_fallback_forbidden");

  const body = {
    version: P12_2_L1A_E4_VERSION,
    binding: P12_2_L1A_E4_BINDING,
    e3Version: P12_2_L1A_E3_VERSION,
    authorizationLiteral: input.authorizationLiteral,
    eligible: true as const,
    oneAttemptOnly: true as const,
    retries: 0 as const,
    fallbackTransportAllowed: false as const,
    credentialMaterialRecorded: false as const,
  };

  return Object.freeze({ ...body, fingerprint: stableHash(body) });
}

export type P122L1AE4OutcomeReceipt = {
  version: typeof P12_2_L1A_E4_VERSION;
  preflightFingerprint: string;
  completed: boolean;
  stoppedAtOrdinal: number | null;
  queryCountObserved: number;
  attempts: 1;
  retries: 0;
  fallbackTransportUsed: false;
  credentialMaterialRecorded: false;
  outcomeFingerprint: string;
};

export function buildP122L1AE4OutcomeReceipt(
  preflight: P122L1AE4PreflightReceipt,
  e3: P122L1AE3Receipt,
): P122L1AE4OutcomeReceipt {
  if (preflight.authorizationLiteral !== e3.authorizationLiteral) {
    throw new Error("p12_2_l1a_e4_outcome_authorization_mismatch");
  }
  if (e3.attempts !== 1 || e3.retries !== 0 || e3.fallbackTransportUsed) {
    throw new Error("p12_2_l1a_e4_outcome_execution_boundary_changed");
  }
  if (e3.credentialMaterialReturned) {
    throw new Error("p12_2_l1a_e4_outcome_credential_material_forbidden");
  }

  const body = {
    version: P12_2_L1A_E4_VERSION,
    preflightFingerprint: preflight.fingerprint,
    completed: e3.completed,
    stoppedAtOrdinal: e3.stoppedAtOrdinal,
    queryCountObserved: e3.queryReceipts.length,
    attempts: 1 as const,
    retries: 0 as const,
    fallbackTransportUsed: false as const,
    credentialMaterialRecorded: false as const,
  };

  return Object.freeze({ ...body, outcomeFingerprint: stableHash(body) });
}
