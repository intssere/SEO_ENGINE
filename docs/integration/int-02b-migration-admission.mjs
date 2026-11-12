import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {PINNED_MAIN_TABLES} from "./int-02b-main-schema-source-baseline.mjs";
const manifest=JSON.parse(readFileSync(new URL("./int-02a-ugp-migration-source-map.json",import.meta.url)));
export const EXPECTED_MAIN_TABLES=49;
export const EXPECTED_COMBINED_TABLES=55;
export const UGP_TABLES=Object.freeze(["authority_outreach_review_events","authority_outreach_suppressions","authority_outreach_send_reservations","authority_outreach_send_safety_events","authority_outreach_single_send_executions","authority_outreach_single_send_execution_events"]);
export function assessMigrationAdmission(snapshot){
  if(!snapshot||typeof snapshot!=="object"||Array.isArray(snapshot))return {admitted:false,reason:"invalid_schema_snapshot"};
  const {tableCount,tableNames,hasFinalConstraint,auditTriggerEnabled,sourceHashesVerified,installedLineageVerified,targetDatabaseIdentityVerified,authorizedDisposableExecution}=snapshot;
  if(!Number.isInteger(tableCount)||tableCount<0||!Array.isArray(tableNames)||tableNames.some(x=>typeof x!=="string"))return {admitted:false,reason:"invalid_schema_snapshot"};
  if(new Set(tableNames).size!==tableNames.length||tableNames.length!==tableCount)return {admitted:false,reason:"ambiguous_schema_snapshot"};
  const present=UGP_TABLES.filter(x=>tableNames.includes(x)).length;
  if(tableCount===EXPECTED_COMBINED_TABLES&&present===6&&auditTriggerEnabled===false)return {admitted:false,reason:"audit_trigger_disabled"};
  if(tableCount===EXPECTED_COMBINED_TABLES&&present===6&&hasFinalConstraint===true)return {admitted:false,reason:"already_installed_no_replay"};
  if(tableCount!==EXPECTED_MAIN_TABLES||present!==0||hasFinalConstraint!==false)return {admitted:false,reason:"unrecognized_or_partial_lineage"};
  if(sourceHashesVerified!==true)return {admitted:false,reason:"source_integrity_unverified"};
  if(installedLineageVerified!==true)return {admitted:false,reason:"migration_history_unverified"};
  if(targetDatabaseIdentityVerified!==true)return {admitted:false,reason:"database_identity_unverified"};
  if(authorizedDisposableExecution!==true)return {admitted:false,reason:"execution_not_authorized"};
  // Caller-supplied Boolean flags are not independent installation evidence.
  // INT-02B has no approved installer or authenticated historical provenance.
  return {admitted:false,reason:"independent_installation_authority_unavailable"};
}
export function enforceNoAutomaticInstallation(){return {admitted:false,reason:"automatic_migration_disabled"};}

export function verifyDisposableLineageEvidence({observedTables, observedConstraints, expectedTables, databaseName, expectedDatabaseName, migrationSource, expectedSourceSha256}) {
  if(databaseName!==expectedDatabaseName||databaseName!=="int02_attested"||!Array.isArray(observedTables)||!Array.isArray(expectedTables)) return {verified:false,reason:"database_identity_unverified"};
  if(!Array.isArray(observedConstraints)||observedTables.length!==expectedTables.length) return {verified:false,reason:"schema_shape_unverified"};
  const actual=[...observedTables].sort(); const expected=[...expectedTables].sort();
  if(actual.some((name,i)=>name!==expected[i])||observedConstraints.length===0||observedConstraints.some(x=>typeof x!=="string"))return {verified:false,reason:"schema_shape_unverified"};
  if(typeof migrationSource!=="string"||createHash("sha256").update(migrationSource).digest("hex")!==expectedSourceSha256)return {verified:false,reason:"source_integrity_unverified"};
  return {verified:true,reason:"disposable_fixture_evidence_verified_only"};
}

/** Stronger source-derived admission gate. Pure; never runs SQL or accepts observed tables as its expected baseline. */
export function assessCanonicalMainAdmission(snapshot){
  if(!snapshot || !Array.isArray(snapshot.tableNames) || snapshot.tableNames.length!==PINNED_MAIN_TABLES.length)
    return {admitted:false,reason:"canonical_schema_inventory_mismatch"};
  const actual=[...snapshot.tableNames].sort();
  if(actual.some((name,i)=>name!==PINNED_MAIN_TABLES[i]))
    return {admitted:false,reason:"canonical_schema_inventory_mismatch"};
  return assessMigrationAdmission(snapshot);
}
