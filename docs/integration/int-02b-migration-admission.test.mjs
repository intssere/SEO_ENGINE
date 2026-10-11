import {test} from "node:test";
import {createHash} from "node:crypto";
import assert from "node:assert/strict";
import {assessMigrationAdmission,enforceNoAutomaticInstallation,UGP_TABLES,verifyDisposableLineageEvidence} from "./int-02b-migration-admission.mjs";
const main=Array.from({length:49},(_,i)=>"main_table_"+i);
const combined=[...main,...UGP_TABLES];
const valid={tableCount:49,tableNames:main,hasFinalConstraint:false,sourceHashesVerified:true,installedLineageVerified:true,targetDatabaseIdentityVerified:true,authorizedDisposableExecution:true};
test("default automatic installation remains disabled",()=>assert.equal(enforceNoAutomaticInstallation().admitted,false));
test("documented fully attested disposable fixture only",()=>assert.equal(assessMigrationAdmission(valid).admitted,true));
test("reject missing lineage evidence",()=>assert.equal(assessMigrationAdmission({...valid,installedLineageVerified:false}).admitted,false));
test("reject missing DB identity",()=>assert.equal(assessMigrationAdmission({...valid,targetDatabaseIdentityVerified:false}).admitted,false));
test("reject missing explicit disposable execution approval",()=>assert.equal(assessMigrationAdmission({...valid,authorizedDisposableExecution:false}).admitted,false));
test("reject unverifiable SQL bytes",()=>assert.equal(assessMigrationAdmission({...valid,sourceHashesVerified:false}).admitted,false));
test("reject partial UGP 53-table schema",()=>assert.equal(assessMigrationAdmission({...valid,tableCount:53,tableNames:[...main,...UGP_TABLES.slice(0,4)]}).admitted,false));
test("reject already installed 55-table UGP schema",()=>assert.equal(assessMigrationAdmission({...valid,tableCount:55,tableNames:combined,hasFinalConstraint:true}).admitted,false));
test("reject 55-table mismatched constraint state",()=>assert.equal(assessMigrationAdmission({...valid,tableCount:55,tableNames:combined,hasFinalConstraint:false}).admitted,false));
test("reject duplicate or inaccurate table listing",()=>assert.equal(assessMigrationAdmission({...valid,tableNames:[...main.slice(0,48),main[0]]}).admitted,false));

test("disposable evidence verifies exact observed structure and source",()=>{
 const source="immutable-sql-fixture";
 const evidence={databaseName:"int02_attested",expectedDatabaseName:"int02_attested",observedTables:["sites","organizations"],expectedTables:["organizations","sites"],observedConstraints:["sites_pkey"],migrationSource:source,expectedSourceSha256:createHash("sha256").update(source).digest("hex")};
 assert.equal(verifyDisposableLineageEvidence(evidence).verified,true);
 assert.equal(verifyDisposableLineageEvidence({...evidence,databaseName:"production"}).verified,false);
 assert.equal(verifyDisposableLineageEvidence({...evidence,observedTables:["sites","other"]}).verified,false);
 assert.equal(verifyDisposableLineageEvidence({...evidence,migrationSource:"changed"}).verified,false);
});
