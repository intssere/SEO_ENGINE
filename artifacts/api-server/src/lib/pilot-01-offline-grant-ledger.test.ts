import assert from "node:assert/strict";
import test from "node:test";
import { OfflineGrantLedger, type FixtureGrant } from "./pilot-01-offline-grant-ledger.js";
const now = 1_800_000_000_000;
const g: FixtureGrant = {nonce:"once-1",actorId:"owner-A",tenantId:"tenant-A",siteId:"site-A",operation:"analyze",expiresAtMs:now+1000};
const req = {actorId:g.actorId,tenantId:g.tenantId,siteId:g.siteId,operation:g.operation};
test("offline single-use consumption rejects replay and nonce reuse",()=>{
 const ledger = new OfflineGrantLedger();
 assert.equal(ledger.register(g),true);
 assert.equal(ledger.consume(g.nonce,req,now),true);
 assert.equal(ledger.consume(g.nonce,req,now),false);
 assert.equal(ledger.register(g),false);
});
test("offline revoke before consume and expired grants fail closed",()=>{
 const ledger = new OfflineGrantLedger();
 assert.equal(ledger.register(g),true);
 ledger.revoke(g.nonce);
 assert.equal(ledger.consume(g.nonce,req,now),false);
 const another = {...g,nonce:"expired"};
 assert.equal(ledger.register(another),true);
 assert.equal(ledger.consume("expired",req,now+2000),false);
});
test("wrong site, tenant, actor, operation never consume grant",()=>{
 const ledger=new OfflineGrantLedger();
 assert.equal(ledger.register(g),true);
 for(const patch of [{siteId:"site-B"},{tenantId:"tenant-B"},{actorId:"other"},{operation:"site_write" as const}]) {
  assert.equal(ledger.consume(g.nonce,{...req,...patch},now),false);
 }
 assert.equal(ledger.consume(g.nonce,req,now),true);
});
test("analysis grant cannot approve publishing; write fixture requires exact diff",()=>{
 const ledger=new OfflineGrantLedger();
 assert.equal(ledger.register(g),true);
 assert.equal(ledger.consume(g.nonce,{...req,operation:"site_write",diffHash:"x"},now),false);
 const write:FixtureGrant={...g,nonce:"write",operation:"site_write",diffHash:"sha256:expected"};
 assert.equal(ledger.register(write),true);
 assert.equal(ledger.consume("write",{...req,operation:"site_write",diffHash:"sha256:other"},now),false);
 assert.equal(ledger.consume("write",{...req,operation:"site_write",diffHash:"sha256:expected"},now),true);
 assert.equal(ledger.consume("write",{...req,operation:"site_write",diffHash:"sha256:expected"},now),false);
});
test("two simultaneous fixture requests have at most one successful consumption",async()=>{
 const ledger=new OfflineGrantLedger();
 assert.equal(ledger.register(g),true);
 const results=await Promise.all([Promise.resolve().then(()=>ledger.consume(g.nonce,req,now)),Promise.resolve().then(()=>ledger.consume(g.nonce,req,now))]);
 assert.deepEqual(results.sort(),[false,true]);
});
