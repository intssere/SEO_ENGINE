import assert from "node:assert/strict";
import test from "node:test";
import { evaluateProposedCviStartupPolicy, type CviStartupPolicyInput } from "./cvi-offline-startup-policy-contract.js";

const base: CviStartupPolicyInput = {
  environment: "production", databaseUrlPresent: true,
  databaseIdentity: "ready", explicitOfflineMode: false,
};
const cases: readonly Readonly<{ id: string; input: CviStartupPolicyInput; expected: string }>[] = [
  { id: "OPS-01-production-db-missing", input: { ...base, databaseUrlPresent: false }, expected: "BLOCK" },
  { id: "OPS-02-production-db-blank", input: { ...base, databaseUrlPresent: false }, expected: "BLOCK" },
  { id: "OPS-03-db-identity-blocked", input: { ...base, databaseIdentity: "blocked" }, expected: "BLOCK" },
  { id: "OPS-04-db-identity-unknown", input: { ...base, databaseIdentity: "unknown" }, expected: "BLOCK" },
  { id: "OPS-05-explicit-offline-only", input: { ...base, environment: "offline_test", databaseUrlPresent: false, explicitOfflineMode: true }, expected: "ALLOW_OFFLINE_ONLY" },
  { id: "OPS-05-offline-not-explicit", input: { ...base, environment: "offline_test", explicitOfflineMode: false }, expected: "BLOCK" },
  { id: "OPS-06-no-implicit-mutation", input: base, expected: "ALLOW_API_SERVING" },
  { id: "OPS-07-staging-db-missing", input: { ...base, environment: "staging", databaseUrlPresent: false }, expected: "BLOCK" },
  { id: "OPS-08-prod-offline-flag", input: { ...base, explicitOfflineMode: true }, expected: "BLOCK" },
];
for (const item of cases) {
  test(`proposed offline startup policy ${item.id}`, () => {
    const result = evaluateProposedCviStartupPolicy(item.input);
    assert.equal(result.disposition, item.expected);
    assert.equal(result.cviOperationsAuthorized, false);
    assert.equal(result.databaseMutationAuthorized, false);
    assert.equal(result.deploymentAuthorized, false);
    assert.deepEqual(result, evaluateProposedCviStartupPolicy(item.input));
  });
}
