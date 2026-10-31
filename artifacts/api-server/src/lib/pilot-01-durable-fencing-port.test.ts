import assert from "node:assert/strict";
import test from "node:test";
import {guardedComplete,guardedConsume,type Pilot01DurableFencingPort,type FenceToken} from "./pilot-01-durable-fencing-port.js";
const token:FenceToken={tenantId:"tenant",siteId:"site",jobId:"job",ownerId:"worker",generation:1n};
const unused=()=>{throw Error("unimplemented");};
const port=(overrides:Partial<Pilot01DurableFencingPort>):Pilot01DurableFencingPort=>({
 claim:unused,renew:unused,complete:unused,consumeGrant:unused,revokeGrant:unused,...overrides
});
test("fails closed on absent/invalid fence token without calling persistence",async()=>{
 let calls=0;const p=port({complete:async()=>{calls++;return "committed";}});
 assert.equal(await guardedComplete(p,{...token,generation:0n},"digest"),"fenced");
 assert.equal(await guardedComplete(p,token,""),"fenced");
 assert.equal(await guardedComplete(p,{...token,tenantId:""},"digest"),"fenced");
 assert.equal(calls,0);
});
test("does not convert persistence failures into a successful commit",async()=>{
 assert.equal(await guardedComplete(port({complete:async()=>{throw Error("offline");}}),token,"digest"),"unavailable");
 assert.equal(await guardedComplete(port({complete:async()=> "fenced"}),token,"digest"),"fenced");
 assert.equal(await guardedComplete(port({complete:async()=> "committed"}),token,"digest"),"committed");
});
test("analysis grants cannot implicitly supply site-write authorization",async()=>{
 let calls=0;const p=port({consumeGrant:async()=>{calls++;return "consumed";}});
 const req={tenantId:"tenant",siteId:"site",actorId:"actor",operation:"site_write" as const};
 assert.equal(await guardedConsume(p,"grant",req),"denied");assert.equal(calls,0);
 assert.equal(await guardedConsume(p,"grant",{...req,diffHash:"exact"}),"consumed");
 assert.equal(calls,1);
});
test("grant store exceptions and invalid identities fail closed",async()=>{
 const scope={tenantId:"t",siteId:"s",actorId:"a",operation:"analyze" as const};
 assert.equal(await guardedConsume(port({consumeGrant:async()=>{throw Error("db down");}}),"g",scope),"unavailable");
 assert.equal(await guardedConsume(port({consumeGrant:async()=> "denied"}),"g",scope),"denied");
 assert.equal(await guardedConsume(port({consumeGrant:async()=> "consumed"}),"",{...scope,actorId:""}),"denied");
});
