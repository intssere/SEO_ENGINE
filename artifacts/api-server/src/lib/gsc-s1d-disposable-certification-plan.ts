/**
 * GSC-02 S1D — source-only disposable PostgreSQL certification planning gate.
 *
 * This module does not import a database driver, create connections, issue
 * statements, schedule work or authorize execution. Submitted evidence is
 * untrusted, including seemingly valid local-environment metadata.
 *
 * A conformant packet means only that a narrow proposed test plan is
 * syntactically complete. It NEVER confers permission to create a database,
 * connect to any environment, run SQL, inspect Railway variables, or activate
 * OAuth. All authority fields remain false.
 */
export const GSC_S1D_VERSION = "pilot01-gsc02-s1d-disposable-plan-v1" as const;
export const GSC_S1D_BASE_SHA = "3523d7913707c52a0bd91b7fee0117850c2218f9" as const;
export const GSC_S1D_TEST_CASES = [
  "unique_state_insert",
  "duplicate_issue_never_resets",
  "two_connection_same_state_race",
  "wrong_org_site_principal_session_denied",
  "wrong_client_redirect_pkce_denied",
  "expired_and_early_state_denied",
  "row_lock_wait_past_expiry_denied",
  "rollback_and_connection_loss",
  "post_restart_replay_denied",
  "cross_transaction_tenant_isolation",
  "failed_token_exchange_does_not_reopen_state",
  "schema_privilege_and_retention_boundaries",
] as const;
export type GscS1dCase = (typeof GSC_S1D_TEST_CASES)[number];

export type GscS1dCandidatePacket = {
  version: typeof GSC_S1D_VERSION;
  sourceCommit: typeof GSC_S1D_BASE_SHA;
  targetClass: "new_disposable_local_postgres_only";
  hostClass: "loopback_only";
  databaseLabel: "gsc_s1d_disposable_only";
  dataClass: "synthetic_only";
  intendedStage: "offline_preparation_only";
  prohibitedProductionReferences: true;
  includesConnectionString: false;
  proposedCases: readonly GscS1dCase[];
};

export type GscS1dAssessment = {
  kind: "untrusted_disposable_readiness_review_only";
  packetConformant: boolean;
  findings: readonly string[];
  realDatabaseIdentityVerified: false;
  postgresAtomicityVerified: false;
  databaseCreationAuthorized: false;
  databaseConnectionAuthorized: false;
  sqlExecutionAuthorized: false;
  productionDatabaseAuthorized: false;
  oauthConsentAuthorized: false;
  tokenExchangeAuthorized: false;
  credentialWriteAuthorized: false;
  providerReadAuthorized: false;
  deploymentAuthorized: false;
};

const EXPECTED_KEYS = [
  "version", "sourceCommit", "targetClass", "hostClass", "databaseLabel",
  "dataClass", "intendedStage", "prohibitedProductionReferences",
  "includesConnectionString", "proposedCases",
] as const;

function ownDataOnly(input: unknown, keys: readonly string[]): Record<string, unknown> | null {
  try {
    if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
    const proto = Object.getPrototypeOf(input);
    if (proto !== Object.prototype && proto !== null) return null;
    const actual = Reflect.ownKeys(input);
    if (actual.length !== keys.length ||
        actual.some(key => typeof key !== "string" || !keys.includes(key))) return null;
    const copy: Record<string, unknown> = Object.create(null);
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) return null;
      copy[key] = descriptor.value;
    }
    return copy;
  } catch { return null; }
}
function casesMatch(value: unknown): boolean {
  try {
    if (!Array.isArray(value) ||
        Object.getPrototypeOf(value) !== Array.prototype) return false;
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (!lengthDescriptor || !("value" in lengthDescriptor) ||
        lengthDescriptor.value !== GSC_S1D_TEST_CASES.length) return false;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== GSC_S1D_TEST_CASES.length + 1 ||
        keys.some(key => key !== "length" &&
          (typeof key !== "string" || !/^(0|[1-9][0-9]*)$/.test(key) ||
          Number(key) >= GSC_S1D_TEST_CASES.length))) return false;
    const observed: unknown[] = [];
    for (let i = 0; i < GSC_S1D_TEST_CASES.length; i++) {
      const desc = Object.getOwnPropertyDescriptor(value, String(i));
      if (!desc || !desc.enumerable || !("value" in desc)) return false;
      observed.push(desc.value);
    }
    return new Set(observed).size === GSC_S1D_TEST_CASES.length &&
      GSC_S1D_TEST_CASES.every(expected => observed.includes(expected));
  } catch { return false; }
}
function observation(packetConformant: boolean, findings: string[]): GscS1dAssessment {
  return {
    kind: "untrusted_disposable_readiness_review_only",
    packetConformant,
    findings,
    realDatabaseIdentityVerified: false,
    postgresAtomicityVerified: false,
    databaseCreationAuthorized: false,
    databaseConnectionAuthorized: false,
    sqlExecutionAuthorized: false,
    productionDatabaseAuthorized: false,
    oauthConsentAuthorized: false,
    tokenExchangeAuthorized: false,
    credentialWriteAuthorized: false,
    providerReadAuthorized: false,
    deploymentAuthorized: false,
  };
}
/**
 * Classifies an UNTRUSTED proposed plan. Not a permission check or executor.
 * No ENV, network, filesystem, clock, SQL, or cloud configuration reads.
 */
export function assessGscS1dPacket(input: unknown): GscS1dAssessment {
  const data = ownDataOnly(input, EXPECTED_KEYS);
  if (!data) return observation(false, ["invalid_or_extra_packet_fields"]);
  const findings: string[] = [];
  if (data.version !== GSC_S1D_VERSION || data.sourceCommit !== GSC_S1D_BASE_SHA)
    findings.push("version_or_source_baseline_mismatch");
  if (data.targetClass !== "new_disposable_local_postgres_only" ||
      data.hostClass !== "loopback_only" ||
      data.databaseLabel !== "gsc_s1d_disposable_only")
    findings.push("disposable_target_isolation_not_described");
  if (data.dataClass !== "synthetic_only" ||
      data.intendedStage !== "offline_preparation_only" ||
      data.prohibitedProductionReferences !== true ||
      data.includesConnectionString !== false)
    findings.push("prohibited_data_or_live_execution_intent");
  if (!casesMatch(data.proposedCases)) findings.push("incomplete_or_untrusted_test_matrix");
  return observation(findings.length === 0, findings);
}
