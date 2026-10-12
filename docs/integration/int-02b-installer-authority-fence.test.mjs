import {test} from "node:test";
import assert from "node:assert/strict";
import {evaluateInstallerAuthority,assertNoInstallerExecution} from "./int-02b-installer-authority-fence.mjs";
const sample={operation:"inspect",targetEnvironment:"disposable_test"};
test("disposable inspection never grants migration execution",()=>assert.deepEqual(evaluateInstallerAuthority(sample),{admitted:false,reason:"inspection_only_not_migration_authority"}));
for(const request of [
 undefined,
 {...sample,operation:"apply"},
 {...sample,operation:"migrate",authorized:true},
 {...sample,targetEnvironment:"production"},
 {...sample,targetEnvironment:"staging"},
 {...sample,executeSql:true},
 {...sample,liveDatabaseUrl:"postgres://example"},
 {...sample,productionDatabase:true},
 {...sample,sourceHashesVerified:true,installedLineageVerified:true,targetDatabaseIdentityVerified:true,authorizedDisposableExecution:true}
]){
 test("refuse installer authority: "+JSON.stringify(request),()=>assert.equal(assertNoInstallerExecution(request).admitted,false));
}
