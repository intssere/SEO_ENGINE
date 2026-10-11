import {test} from "node:test";
import assert from "node:assert/strict";
import {verifyDisposableDatabaseIdentity,refuseProductionIdentityPromotion} from "./int-02b-database-identity.mjs";
const identity={database:"int02_attested",currentUser:"test",serverAddress:"127.0.0.1",serverPort:"5432"};
test("accept exact observed disposable fixture identity only",()=>assert.equal(verifyDisposableDatabaseIdentity(identity,identity).verified,true));
for(const [field,value] of [["database","production"],["currentUser","postgres"],["serverAddress","10.0.0.5"],["serverPort","5433"]]){
 test("reject changed "+field,()=>assert.equal(verifyDisposableDatabaseIdentity({...identity,[field]:value},identity).verified,false));
}
test("caller-supplied identity Boolean never substitutes for observations",()=>{
 assert.equal(verifyDisposableDatabaseIdentity({verified:true},identity).verified,false);
 assert.equal(verifyDisposableDatabaseIdentity(undefined,identity).verified,false);
});
test("production identity certification unavailable",()=>assert.deepEqual(refuseProductionIdentityPromotion(),{verified:false,reason:"production_identity_not_certified"}));
