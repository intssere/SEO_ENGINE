import assert from "node:assert/strict";
import test from "node:test";
import {guardedConsume,type Pilot01DurableFencingPort,type GrantScope} from "./pilot-01-durable-fencing-port.js";

/** Synthetic identity-provenance boundary ONLY. Real identity verification, signed
 * issuance, database membership and runtime integration remain unimplemented.
 * Test explicitly denies if a trusted injected context is missing or mismatched.
 * No network calls, database connections, provider actions or publication.
 */
type VerifiedContext=Readonly<{actorId:string;tenantId:string;siteId:string;verified:true}>;
type Request=Readonly<{actorId:string;tenantId:string;siteId:string;operation:GrantScope["operation"];diffHash?:string}>;
const sink=(consumeGrant:Pilot01DurableFencingPort["consumeGrant"]):Pilot01DurableFencingPort=>({
 claim:async()=>null,renew:async()=>null,complete:async()=>"unavailable",
 revokeGrant:async()=>"unavailable",consumeGrant,
});
async function consumeAtBoundary(
 port:Pilot01DurableFencingPort, grantId:string, request:Request, trusted:VerifiedContext|null,
):Promise<"consumed"|"denied"|"unavailable">{
 if(!trusted||trusted.verified!==true||!trusted.actorId||!trusted.tenantId||!trusted.siteId)return "denied";
 if(request.actorId!==trusted.actorId||request.tenantId!==trusted.tenantId||request.siteId!==trusted.siteId)return "denied";
 return guardedConsume(port,grantId,{
  actorId:trusted.actorId,tenantId:trusted.tenantId,siteId:trusted.siteId,
  operation:request.operation,diffHash:request.diffHash,
 });
}
const identity:VerifiedContext={actorId:"actor-A",tenantId:"tenant-A",siteId:"site-A",verified:true};
const request:Request={actorId:"actor-A",tenantId:"tenant-A",siteId:"site-A",operation:"analyze"};

test("PILOT-01: missing or spoofed identity denies before persistence",async()=>{
 let calls=0;const port=sink(async()=>{calls++;return "consumed";});
 assert.equal(await consumeAtBoundary(port,"g",request,null),"denied");
 assert.equal(await consumeAtBoundary(port,"g",{...request,actorId:"actor-B"},identity),"denied");
 assert.equal(await consumeAtBoundary(port,"g",{...request,tenantId:"tenant-B"},identity),"denied");
 assert.equal(await consumeAtBoundary(port,"g",{...request,siteId:"site-B"},identity),"denied");
 assert.equal(await consumeAtBoundary(port,"g",request,{...identity,verified:false} as unknown as VerifiedContext),"denied");
 assert.equal(calls,0);
});
test("PILOT-01: verified context is bound into synthetic persistence scope",async()=>{
 const seen:GrantScope[]=[];
 const port=sink(async(_id,scope)=>{seen.push(scope);return "consumed";});
 assert.equal(await consumeAtBoundary(port,"g",request,identity),"consumed");
 assert.deepEqual(seen,[{...request}]);
});
test("PILOT-01: site_write needs exact diff and unavailable store fails closed",async()=>{
 let calls=0;
 const port=sink(async()=>{calls++;throw Error("db unavailable");});
 assert.equal(await consumeAtBoundary(port,"g",{...request,operation:"site_write"},identity),"denied");
 assert.equal(calls,0);
 assert.equal(await consumeAtBoundary(port,"g",{...request,operation:"site_write",diffHash:"exact"},identity),"unavailable");
 assert.equal(calls,1);
});
