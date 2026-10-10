import assert from "node:assert/strict";
import test from "node:test";
import type postgres from "postgres";
import { createCviScopedPostgresReadbackStore } from "./cvi-gsc-scoped-readback-postgres-adapter.js";
import { CVI_GSC_SCOPED_READBACK_SQL } from "./cvi-gsc-scoped-ledger-readback.js";

const scope={acquisitionId:"acq-1",tenantId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
 siteId:"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",connectionId:"cccccccc-cccc-4ccc-8ccc-cccccccccccc",
 authSubject:"subject-1",authSessionId:"dddddddd-dddd-4ddd-8ddd-dddddddddddd"};
const row={...scope,requestNonce:"nonce-1",requestedResource:"sc-domain:example.com",
 observationFingerprint:"e".repeat(64),disposition:"recorded_untrusted"};
function fakeSql(rows:unknown[], calls:{query:string;params:unknown[]}[]) {
 return {unsafe:async(query:string,params:unknown[])=>{
  calls.push({query,params});return rows;
 }} as unknown as postgres.Sql;
}
test("adapter executes the exact parameterized scoped read once, mapping only whitelisted fields",async()=>{
 const calls:{query:string;params:unknown[]}[]=[];
 const store=createCviScopedPostgresReadbackStore(fakeSql([{...row,internalSecret:"do-not-leak"}],calls));
 const result=await store.fetchScoped(scope);
 assert.deepEqual(result,row);
 assert.deepEqual(calls,[{query:CVI_GSC_SCOPED_READBACK_SQL,params:[
  scope.acquisitionId,scope.tenantId,scope.siteId,scope.connectionId,scope.authSubject,scope.authSessionId,
 ]}]);
 assert.equal((result as unknown as Record<string,unknown>).internalSecret,undefined);
});
test("missing row is null, ambiguous or invalid rows fail closed",async()=>{
 assert.equal(await createCviScopedPostgresReadbackStore(fakeSql([],[])).fetchScoped(scope),null);
 for(const candidate of [[row,row],[{...row,disposition:"authorized"}],
  [{...row,observationFingerprint:"bad"}],[{...row,siteId:null}]]) {
  const store=createCviScopedPostgresReadbackStore(fakeSql(candidate,[]));
  await assert.rejects(store.fetchScoped(scope),/cvi_1c17_/);
 }
});
test("untrusted empty or control-character scope fields cannot invoke database",async()=>{
 const calls:{query:string;params:unknown[]}[]=[];
 const store=createCviScopedPostgresReadbackStore(fakeSql([row],calls));
 for(const bad of [{tenantId:""},{authSubject:"subject\nattack"},{acquisitionId:" padded "}]){
  await assert.rejects(store.fetchScoped({...scope,...bad}),/scope_parameters_invalid/);
 }
 assert.equal(calls.length,0);
});
test("database errors propagate only to the caller's fail-closed reconciler",async()=>{
 const driver={unsafe:async()=>{throw new Error("transport offline");}} as unknown as postgres.Sql;
 const store=createCviScopedPostgresReadbackStore(driver);
 await assert.rejects(store.fetchScoped(scope),/transport offline/);
});
