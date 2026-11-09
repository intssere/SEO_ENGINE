/**
 * RT01-A12.27 — OFFLINE acquisition-request readiness; NO operational adapter.
 * Reuse INT-02C-05A's exact fixed query contract, do not reproduce SQL.
 * A PASS is merely a complete synthetic DOCUMENT DESIGN, not verified evidence.
 * No provider, database, credential or network access occurs.
 */
import {TARGET,QUERY_SET,metadataQueryFingerprint,validateMetadataQuerySet}
 from "./int-02c-05a-railway-metadata-query-contract.mjs";

export const A12_27_CANDIDATE=Object.freeze({...TARGET});
export const A12_27_QUERY_CONTRACT=Object.freeze({
 stage:"G4_CANDIDATE_LEDGER_DISCOVERY_ONLY",
 queryIds:Object.freeze(QUERY_SET.map(q=>q.id)),
 fingerprint:metadataQueryFingerprint(),
 /** No historical receipts are retrieved by the four queries. */
 permitsMigrationLedgerRows:false,
 requiresFreshSeparateExecutionAuthorization:true
});
const REQUIRED=Object.freeze([
 "architectureDecision","providerControlPlane","unresolvedApplicationBinding",
 "leastPrivilegeSession","privateTransport","executionScope","independentWitness",
 "immutableEvidenceCustody","historicalLedgerFollowUp","recoveryBoundary"
]);
export const REQUIRED_EVIDENCE_CLASSES=REQUIRED;
export const EVIDENCE_SCOPE=Object.freeze({
 allowed:["resource_identifiers","unresolved_binding_reference","session_identity_metadata",
   "public_table_names","public_constraint_names","public_ledger_candidate_names"],
 forbidden:["DATABASE_URL","credential_values","connection_strings","tokens",
   "secrets","customer_rows","customer_row_counts","record_hashes","WAL_payloads",
   "ledger_rows","resolved_environment_values","arbitrary_SQL","production_logs"]
});
const text=s=>typeof s==="string"&&s.length>=8&&s.length<=256&&
 s.trim()===s&&!/[\u0000-\u001f]/.test(s);
const iso=s=>typeof s==="string"&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(s)&&
 Number.isFinite(Date.parse(s));
const hash=s=>typeof s==="string"&&/^[a-f0-9]{64}$/.test(s);
const sortedUnique=a=>Array.isArray(a)&&new Set(a).size===a.length;
const deny=(status,issues)=>({status,issues,executionAuthorized:false,
 operationalDatabaseCertified:false,legacyUgPCollisionResolved:false});
const secretPattern=/(?:postgres(?:ql)?:\/\/|DATABASE_URL\s*[:=]|\b(?:password|secret|token|api[_-]?key)\s*[:=])/i;
/** Readiness records are scope/procedure descriptions, NOT executed evidence.
 * No caller-provided "verified" flag can confer operational authority.
 * The trusted A12.23–A12.26 verification contracts remain separately required
 * for any future evidence; this function never calls an operational verifier.
 */
export function evaluateAcquisitionReadiness(request){
 if(!request||typeof request!=="object"||Array.isArray(request))
  return deny("UNVERIFIED",["MISSING_REQUEST"]);
 const issues=[];
 if(request.phase!=="OFFLINE_DESIGN_ONLY")issues.push("LIVE_PHASE_NOT_AUTHORIZED");
 if(request.target?.railwayProjectId!==TARGET.railwayProjectId||
  request.target?.environmentId!==TARGET.environmentId||
  request.target?.serviceId!==TARGET.serviceId||
  request.target?.volumeId!==TARGET.volumeId)
  issues.push("CANDIDATE_TARGET_MISMATCH");
 if(request.queryContractFingerprint!==metadataQueryFingerprint()||
  !sortedUnique(request.queryIds)||
  JSON.stringify(request.queryIds)!==JSON.stringify(A12_27_QUERY_CONTRACT.queryIds)||
  !validateMetadataQuerySet().valid)
  issues.push("QUERY_ALLOWLIST_MISMATCH");
 if(!Array.isArray(request.evidenceClasses)||!sortedUnique(request.evidenceClasses)||
   JSON.stringify([...request.evidenceClasses].sort())!==JSON.stringify([...REQUIRED].sort()))
  issues.push("EVIDENCE_CLASS_SET_MISMATCH");
 if(!text(request.requestId)||!text(request.architectureDecisionRef)||
  !text(request.reviewerId)||!text(request.collectorId)||
  request.reviewerId===request.collectorId||
  !text(request.securityReviewRef)||!text(request.scopeReviewRef))
  issues.push("INDEPENDENT_REVIEW_OR_CUSTODY_MISSING");
 if(request.sqlSession?.readOnly!==true||
  request.sqlSession?.existingPrincipal!==true||
  request.sqlSession?.superuser!==false||
  request.sqlSession?.databaseOwner!==false||
  request.sqlSession?.canSetRole!==false||
  request.sqlSession?.customerDataSelect===true||
  request.sqlSession?.privateTransport!==true||
  request.sqlSession?.clientSecretExposure!==false||
  request.sqlSession?.queryTimeoutSeconds!==15||
  request.sqlSession?.singleAttempt!==true)
  issues.push("LEAST_PRIVILEGE_OR_TRANSPORT_INCOMPLETE");
 if(request.binding?.mode!=="UNRESOLVED_PROVIDER_REFERENCE"||
  !text(request.binding?.observationRef)||
  request.binding?.resolvedSecretValue!==undefined)
  issues.push("APP_BINDING_PROVENANCE_NOT_READY");
 if(request.ledger?.phase!=="DISCOVER_NAMES_ONLY"||
  request.ledger?.rowReadAllowed!==false||
  request.ledger?.separateMetadataApprovalRequired!==true||
  request.ledger?.mainUgPCollisionState!=="UNRESOLVED")
  issues.push("HISTORICAL_LINEAGE_SCOPE_BREACH");
 if(request.recovery?.separateAuthorizationRequired!==true||
  request.recovery?.pitrCertified!==false||
  request.recovery?.cutoverApproved!==false)
  issues.push("RECOVERY_OR_CUTOVER_SCOPE_BREACH");
 if(!iso(request.createdAtUtc)||!hash(request.requestDigestSha256))
  issues.push("INVALID_REQUEST_METADATA");
 if(request.scope?.allowsSqlExecution!==false||
  request.scope?.allowsProviderReads!==false||
  request.scope?.allowsCredentials!==false||
  request.scope?.allowsMutations!==false||
  request.scope?.allowsDeployment!==false)
  issues.push("IMPLICIT_EXECUTION_AUTHORITY_DENIED");
 if(request.executionAuthorizationRef!==null)
  issues.push("DESIGN_REQUEST_CANNOT_CONTAIN_LIVE_EXECUTION_AUTHORIZATION");
 // Recursively search values, including keys, for leaked secrets, URLs and
 // credential-like fragments; immutable refs must remain opaque.
 const serialized=JSON.stringify(request);
 if(secretPattern.test(serialized)||serialized.length>18000)
  issues.push("SENSITIVE_OR_OVERSIZED_PACKET");
 if(issues.length)return deny("BLOCKED",issues);
 return deny("PASS",[]);
}
/** Historical row reads need a NEW schema-pinned query contract once the
 * candidate ledger's exact shape is independently established. No SQL here. */
export function evaluateHistoricalLedgerFollowUp(candidate){
 if(!candidate)return deny("UNVERIFIED",["LEDGER_SCHEMA_NOT_INDEPENDENTLY_COLLECTED"]);
 const issues=[];
 if(candidate.action!=="DESIGN_SECOND_STAGE_ONLY")issues.push("LIVE_LEDGER_READ_DENIED");
 if(candidate.separateAuthorizationRequired!==true||
  candidate.columnsIndependentlyVerified!==true||
  candidate.targetBoundWitnessRef===undefined||
  !text(candidate.targetBoundWitnessRef)||
  candidate.exactLedgerName===undefined||!text(candidate.exactLedgerName))
  issues.push("HISTORICAL_LEDGER_AUTHORITY_MISSING");
 if(candidate.namespaceCollisionResolved===true)
  issues.push("NAMESPACE_COLLISION_CANNOT_BE_DECLARED_RESOLVED");
 if(candidate.rowReadAllowed!==false||candidate.sqlText!==undefined)
  issues.push("LEDGER_ROW_QUERY_NOT_AUTHORIZED");
 return deny(issues.length?"BLOCKED":"PASS",issues);
}
export function authorizeOperationalInspection(){return deny("BLOCKED",["OPERATIONAL_ACCESS_NOT_AUTHORIZED"]);}
