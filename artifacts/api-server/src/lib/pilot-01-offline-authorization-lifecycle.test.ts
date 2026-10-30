import assert from "node:assert/strict";
import test from "node:test";
import { evaluatePilotGrant } from "./pilot-01-scoped-grant-model.js";
import { OfflineGrantLedger, type FixtureGrant } from "./pilot-01-offline-grant-ledger.js";
import { requestPilotRun, type PilotQueueDependencies } from "./pilot-orchestration.js";

/** PILOT-01: in-process, synthetic authorization lifecycle only.
 * Does NOT certify real authentication, DB-backed replay fencing, CVI handlers,
 * actual AI proposals, Shopify publish, or any external execution.
 */
const now = 1_800_000_000_000;
const identity = {actorId:"actor-A",tenantId:"tenant-A",siteId:"site-A"} as const;

test("offline scoped analysis decision -> consume -> queue and launch once",async()=>{
 const ledger=new OfflineGrantLedger();
 const grant:FixtureGrant={...identity,nonce:"analysis-one",operation:"analyze",expiresAtMs:now+5_000};
 assert.equal(ledger.register(grant),true);
 const observed:string[]=[];
 const deps:PilotQueueDependencies={
  preflight:async()=>{
   observed.push("preflight");
   assert.equal(evaluatePilotGrant(grant,{...identity,operation:"analyze"},now),"matched");
   if(!ledger.consume(grant.nonce,{...identity,operation:"analyze"},now)) throw Error("synthetic_grant_spent");
   return {siteId:identity.siteId};
  },
  enqueue:async siteId=>{observed.push("enqueue:"+siteId);return {accepted:true,runId:"synthetic-run"};},
  launch:runId=>{observed.push("launch:"+runId);}
 };
 assert.deepEqual(await requestPilotRun(deps),{accepted:true,runId:"synthetic-run"});
 await assert.rejects(()=>requestPilotRun(deps),/synthetic_grant_spent/);
 assert.deepEqual(observed,["preflight","enqueue:site-A","launch:synthetic-run","preflight"]);
});

test("offline cross-tenant preflight stops before enqueue and worker launch",async()=>{
 const ledger=new OfflineGrantLedger();
 const grant:FixtureGrant={...identity,nonce:"tenant-once",operation:"recommend",expiresAtMs:now+1_000};
 assert.equal(ledger.register(grant),true);
 const observed:string[]=[];
 const deps:PilotQueueDependencies={
  preflight:async()=>{
   if(!ledger.consume(grant.nonce,{...identity,tenantId:"tenant-B",operation:"recommend"},now)) throw Error("synthetic_tenant_denied");
   return {siteId:"site-B"};
  },
  enqueue:async()=>{observed.push("enqueue");return {accepted:true,runId:"bad"};},
  launch:()=>observed.push("launch")
 };
 await assert.rejects(()=>requestPilotRun(deps),/synthetic_tenant_denied/);
 assert.deepEqual(observed,[]);
});

test("offline analysis grant cannot authorize a site modification",()=>{
 const ledger=new OfflineGrantLedger();
 const grant:FixtureGrant={...identity,nonce:"analysis-not-publish",operation:"analyze",expiresAtMs:now+1000};
 assert.equal(ledger.register(grant),true);
 const write={...identity,operation:"site_write" as const,diffHash:"diff-1"};
 assert.equal(evaluatePilotGrant(grant,write,now),"denied");
 assert.equal(ledger.consume(grant.nonce,write,now),false);
 assert.equal(ledger.consume(grant.nonce,{...identity,operation:"analyze"},now),true);
});

test("offline revoked write approval cannot consume even with exact diff",()=>{
 const ledger=new OfflineGrantLedger();
 const grant:FixtureGrant={...identity,nonce:"revoked-write",operation:"site_write",diffHash:"exact",expiresAtMs:now+1000};
 assert.equal(ledger.register(grant),true);
 ledger.revoke(grant.nonce);
 assert.equal(ledger.consume(grant.nonce,{...identity,operation:"site_write",diffHash:"exact"},now),false);
});
