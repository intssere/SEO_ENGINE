import {test} from "node:test";
import assert from "node:assert/strict";
import {inspectDisposableMetadata,productionAdmission} from "./int-02c-05b-disposable-execution-adapter.mjs";
const fixture={kind:"disposable_fixture",database:"int02c_disposable",role:"int02c_metadata_reader"};
const executor=async(sql,params,context)=>context.queryId==="session_identity"?[{database_name:"int02c_disposable",session_role:"int02c_metadata_reader",in_recovery:false}]:[];
test("isolated injected fixture reports only bounded metadata row counts",async()=>{
 const r=await inspectDisposableMetadata({fixture,executor});
 assert.equal(r.ok,true);
 assert.equal(r.scope,"disposable_fixture_only");
 assert.deepEqual(r.results.map(x=>x.rowCount),[1,0,0,0]);
 assert.equal(Object.hasOwn(r,"rows"),false);
});
test("reject Production targets without invoking executor",async()=>{
 let calls=0;
 const driver=async()=>{calls++;throw Error("unexpected");};
 for(const bad of [{...fixture,kind:"production"},{...fixture,database:"production"},{...fixture,role:"postgres"},{}]){
  assert.equal((await inspectDisposableMetadata({fixture:bad,executor:driver})).ok,false);
 }
 assert.equal(calls,0);
 assert.equal(productionAdmission().ok,false);
});
test("reject injected SQL, invalid identity and oversized results",async()=>{
 assert.equal((await inspectDisposableMetadata({fixture,executor,queries:[{id:"session_identity",sql:"DELETE FROM users",params:[]}]})).ok,false);
 assert.equal((await inspectDisposableMetadata({fixture,executor:async()=>[]})).reason,"session_identity_mismatch");
 assert.equal((await inspectDisposableMetadata({fixture,executor:async(sql,p,ctx)=>ctx.queryId==="session_identity"?await executor(sql,p,ctx):Array(300).fill({})})).reason,"result_limit_exceeded");
 assert.equal((await inspectDisposableMetadata({fixture,executor:async()=>{throw Error("no secrets in result");}})).reason,"isolated_execution_failed");
});
