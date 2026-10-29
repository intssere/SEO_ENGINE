/** Proposed startup classification for issue #1152. NOT wired into index.ts.
 * This pure function documents an aspirational fail-closed contract.
 * It does not inspect the real process environment or grant runtime authority.
 */
export const CVI_OFFLINE_STARTUP_POLICY_VERSION = "cvi-offline-startup-policy-proposal-v1" as const;
export type CviStartupPolicyInput = Readonly<{
  environment: "production" | "staging" | "offline_test";
  databaseUrlPresent: boolean;
  databaseIdentity: "ready" | "blocked" | "unknown";
  explicitOfflineMode: boolean;
}>;
export type CviStartupPolicyDecision = Readonly<{
  version: typeof CVI_OFFLINE_STARTUP_POLICY_VERSION;
  disposition: "BLOCK" | "ALLOW_API_SERVING" | "ALLOW_OFFLINE_ONLY";
  cviOperationsAuthorized: false;
  databaseMutationAuthorized: false;
  deploymentAuthorized: false;
}>;
export function evaluateProposedCviStartupPolicy(input: CviStartupPolicyInput): CviStartupPolicyDecision {
  const offline = input.environment === "offline_test" && input.explicitOfflineMode;
  const productionServing = (input.environment === "production" || input.environment === "staging") &&
    input.databaseUrlPresent && input.databaseIdentity === "ready" && !input.explicitOfflineMode;
  return {
    version: CVI_OFFLINE_STARTUP_POLICY_VERSION,
    disposition: offline ? "ALLOW_OFFLINE_ONLY" : productionServing ? "ALLOW_API_SERVING" : "BLOCK",
    cviOperationsAuthorized: false,
    databaseMutationAuthorized: false,
    deploymentAuthorized: false,
  };
}
