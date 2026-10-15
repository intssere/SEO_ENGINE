// INT-02D-17 — offline synthetic admission threat-control oracle.
// No imports, DB client, filesystem, network, credentials, or side effects.
// Deliberately refuses live execution: this is only a model of negative cases.
import assert from "node:assert/strict";
import { test } from "node:test";

export const SYNTHETIC_TARGET = Object.freeze({
  projectId: "synthetic-project", environmentId: "synthetic-env",
  serviceId: "synthetic-primary", volumeId: "synthetic-volume"
});
export const SYNTHETIC_QUERY_IDS = Object.freeze([
  "session_identity", "catalog_table_names",
  "catalog_constraint_names", "migration_ledger_candidates"
]);
export const SYNTHETIC_CAPS = Object.freeze([1, 128, 256, 32]);

function reject(reason) { return { admitted: false, reason }; }

// This oracle is intentionally *not* a production admission controller.
// It models fail-closed requirements using synthetic attestations only.
export function inspectSyntheticEvidence(e) {
  if (!e || e.synthetic !== true) return reject("synthetic_only");
  if (e.target?.projectId !== SYNTHETIC_TARGET.projectId ||
      e.target?.environmentId !== SYNTHETIC_TARGET.environmentId ||
      e.target?.serviceId !== SYNTHETIC_TARGET.serviceId ||
      e.target?.volumeId !== SYNTHETIC_TARGET.volumeId ||
      e.target?.serviceId === "synthetic-restored") return reject("target_mismatch");
  if (e.transport !== "private_attested" || e.publicProxy === true ||
      e.usesAppCredentials === true || e.secretsInEvidence === true)
    return reject("transport_or_secret_violation");
  if (e.role?.superuser !== false || e.role?.owner !== false ||
      e.role?.canEscalate !== false || e.role?.canReadCustomerRows !== false ||
      e.role?.dbReadOnlyEnforced !== true) return reject("role_unverified");
  if (e.witness?.independent !== true || e.witness?.authenticated !== true ||
      e.custody?.tamperEvident !== true || e.custody?.sanitized !== true)
    return reject("witness_or_custody_unverified");
  if (e.authorization?.explicit !== true || e.authorization?.singleUse !== true ||
      e.authorization?.replayed === true ||
      e.authorization?.approvedFingerprint !== "synthetic-fingerprint-v1" ||
      e.authorization?.approvedSource !== "synthetic-commit-v1")
    return reject("authorization_unverified");
  if (!Number.isSafeInteger(e.statementTimeoutMs) || e.statementTimeoutMs < 1 ||
      e.statementTimeoutMs > 5000 || !Number.isSafeInteger(e.lockTimeoutMs) ||
      e.lockTimeoutMs < 1 || e.lockTimeoutMs > 1000 || e.attempts !== 1)
    return reject("execution_bounds");
  if (!Array.isArray(e.queries) || e.queries.length !== 4 ||
      e.queries.some((q, i) => q?.id !== SYNTHETIC_QUERY_IDS[i] ||
        q?.fixedSql === false || !Array.isArray(q?.params) || q.params.length))
    return reject("query_contract_mismatch");
  if (!Array.isArray(e.resultCounts) || e.resultCounts.length !== 4 ||
      e.resultCounts.some((n, i) => !Number.isSafeInteger(n) || n < 0 || n > SYNTHETIC_CAPS[i]))
    return reject("result_bounds");
  if (e.providerVolumeBridgeAttested !== true) return reject("runtime_lineage_unproven");
  // Even an all-green synthetic fixture cannot authorize actual SQL.
  return reject("offline_oracle_cannot_authorize_live_sql");
}

function validFixture() {
  return {
    synthetic: true, target: {...SYNTHETIC_TARGET},
    transport: "private_attested", publicProxy: false,
    usesAppCredentials: false, secretsInEvidence: false,
    role: {superuser:false,owner:false,canEscalate:false,canReadCustomerRows:false,dbReadOnlyEnforced:true},
    witness: {independent:true,authenticated:true},
    custody: {tamperEvident:true,sanitized:true},
    authorization: {explicit:true,singleUse:true,replayed:false,approvedFingerprint:"synthetic-fingerprint-v1",approvedSource:"synthetic-commit-v1"},
    statementTimeoutMs:3000,lockTimeoutMs:500,attempts:1,
    queries: SYNTHETIC_QUERY_IDS.map(id=>({id,params:[],fixedSql:true})),
    resultCounts:[1,40,50,2],providerVolumeBridgeAttested:true
  };
}
function expectRejection(modify, reason) {
  const fixture = validFixture(); modify(fixture);
  assert.deepEqual(inspectSyntheticEvidence(fixture), {admitted:false,reason});
}
test("even all-green synthetic evidence cannot authorize live SQL",()=>{
  expectRejection(()=>{},"offline_oracle_cannot_authorize_live_sql");
});
test("rejects non-synthetic execution request",()=>expectRejection(e=>{e.synthetic=false},"synthetic_only"));
test("rejects wrong volume or restore substitution",()=>{
  expectRejection(e=>{e.target.volumeId="other"},"target_mismatch");
  expectRejection(e=>{e.target.serviceId="synthetic-restored"},"target_mismatch");
});
test("rejects public connection, app credential or secret leakage",()=>{
  expectRejection(e=>{e.publicProxy=true},"transport_or_secret_violation");
  expectRejection(e=>{e.usesAppCredentials=true},"transport_or_secret_violation");
  expectRejection(e=>{e.secretsInEvidence=true},"transport_or_secret_violation");
});
test("rejects elevated role and missing DB-enforced readonly",()=>{
  expectRejection(e=>{e.role.owner=true},"role_unverified");
  expectRejection(e=>{e.role.superuser=true},"role_unverified");
  expectRejection(e=>{e.role.canReadCustomerRows=true},"role_unverified");
  expectRejection(e=>{e.role.dbReadOnlyEnforced=false},"role_unverified");
});
test("rejects unauthenticated witness and insecure custody",()=>{
  expectRejection(e=>{e.witness.independent=false},"witness_or_custody_unverified");
  expectRejection(e=>{e.custody.sanitized=false},"witness_or_custody_unverified");
});
test("rejects missing, replayed or mismatched authorization",()=>{
  expectRejection(e=>{e.authorization.explicit=false},"authorization_unverified");
  expectRejection(e=>{e.authorization.replayed=true},"authorization_unverified");
  expectRejection(e=>{e.authorization.approvedSource="moved"},"authorization_unverified");
});
test("rejects retries and absent execution bounds",()=>{
  expectRejection(e=>{e.attempts=2},"execution_bounds");
  expectRejection(e=>{e.statementTimeoutMs=0},"execution_bounds");
});
test("rejects arbitrary/extended query contract",()=>{
  expectRejection(e=>{e.queries[0].id="customer_rows"},"query_contract_mismatch");
  expectRejection(e=>{e.queries[0].params=["injection"]},"query_contract_mismatch");
  expectRejection(e=>{e.queries[1].fixedSql=false},"query_contract_mismatch");
});
test("rejects oversized/invalid synthetic results",()=>{
  expectRejection(e=>{e.resultCounts[1]=129},"result_bounds");
  expectRejection(e=>{e.resultCounts[3]=-1},"result_bounds");
});
test("rejects unproven provider to volume lineage",()=>{
  expectRejection(e=>{e.providerVolumeBridgeAttested=false},"runtime_lineage_unproven");
});
