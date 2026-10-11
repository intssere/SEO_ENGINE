import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
const manifest=JSON.parse(readFileSync(new URL("./int-02a-ugp-migration-source-map.json",import.meta.url)));
export const EXPECTED_MAIN_TABLES=49;
export const EXPECTED_COMBINED_TABLES=55;
export const UGP_TABLES=Object.freeze(["authority_outreach_review_events","authority_outreach_suppressions","authority_outreach_send_reservations","authority_outreach_send_safety_events","authority_outreach_single_send_executions","authority_outreach_single_send_execution_events"]);
export function assessMigrationAdmission(snapshot){
  assert.ok(snapshot && typeof snapshot==="object");
  const {tableCount,tableNames,hasFinalConstraint,sourceHashesVerified,installedLineageVerified,targetDatabaseIdentityVerified,authorizedDisposableExecution}=snapshot;
  if(!Number.isInteger(tableCount)||tableCount<0||!Array.isArray(tableNames)||tableNames.some(x=>typeof x!=="string"))return {admitted:false,reason:"invalid_schema_snapshot"};
  if(new Set(tableNames).size!==tableNames.length||tableNames.length!==tableCount)return {admitted:false,reason:"ambiguous_schema_snapshot"};
  const present=UGP_TABLES.filter(x=>tableNames.includes(x)).length;
  if(tableCount===EXPECTED_COMBINED_TABLES&&present===6&&hasFinalConstraint===true)return {admitted:false,reason:"already_installed_no_replay"};
  if(tableCount!==EXPECTED_MAIN_TABLES||present!==0||hasFinalConstraint!==false)return {admitted:false,reason:"unrecognized_or_partial_lineage"};
  if(sourceHashesVerified!==true)return {admitted:false,reason:"source_integrity_unverified"};
  if(installedLineageVerified!==true)return {admitted:false,reason:"migration_history_unverified"};
  if(targetDatabaseIdentityVerified!==true)return {admitted:false,reason:"database_identity_unverified"};
  if(authorizedDisposableExecution!==true)return {admitted:false,reason:"execution_not_authorized"};
  return {admitted:true,reason:"disposable_only_preflight_pass"};
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
