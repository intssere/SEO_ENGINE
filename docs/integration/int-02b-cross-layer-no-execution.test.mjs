import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {describeHistoricalLineage} from "./int-02b-historical-lineage-policy.mjs";
import {verifyReceiptEnvelope} from "./int-02b-receipt-witness.mjs";
import {verifyDisposableDatabaseIdentity} from "./int-02b-database-identity.mjs";
import {compareCatalogEvidence} from "./int-02b-catalog-evidence.mjs";
import {evaluateInstallerAuthority} from "./int-02b-installer-authority-fence.mjs";

test("cross-layer migration admission remains disabled even with all positive disposable observations",()=>{
 const catalog={columns:[{table:"sites",column:"id",definition:"uuid"}],constraints:[{table:"sites",name:"pk",definition:"PRIMARY KEY (id)"}],indexes:[{table:"sites",name:"pk",definition:"UNIQUE (id)"}],triggers:[{table:"outreach",name:"audit",definition:"TRIGGER",enabled:"O"}]};
 const evidence=compareCatalogEvidence({observed:catalog,reference:catalog,referenceProvenance:"pinned_disposable_sql_installation"});
 assert.equal(evidence.verified,true);
 const actual={database:"int02_attested",currentUser:"test",serverAddress:"172.18.0.2",serverPort:"5432"};
 assert.equal(verifyDisposableDatabaseIdentity(actual,{...actual,serverAddress:"docker_private"}).verified,true);
 const manifest=JSON.parse(readFileSync(new URL("./int-02a-ugp-migration-source-map.json",import.meta.url)));
 const receipts=manifest.entries.map(e=>({filename:e.candidate,sha256:e.rawSha256}));
 assert.equal(describeHistoricalLineage(receipts).admitted,false);
 assert.equal(verifyReceiptEnvelope({}).verified,false);
 const attempted=evaluateInstallerAuthority({operation:"apply",targetEnvironment:"disposable_test",catalogVerified:true,identityVerified:true,historyVerified:true,executeSql:true});
 assert.deepEqual(attempted,{admitted:false,reason:"migration_execution_disabled"});
});
