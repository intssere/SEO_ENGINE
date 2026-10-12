/** UGP-11.C4 disposable-only independent PostgreSQL observer disconnect injection.
 * Kills only a backend PID established by THIS test's dedicated observer session.
 * No schema writes, production authority, retries or provider dispatch.
 */
import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import {reconcileFencedCommitEvidence} from "./ugp-11-c4-fenced-evidence-reconcile.js";

test("interrupted independent database observation quarantines incomplete evidence",async t=>{
 const raw=process.env.UGP_11_EPHEMERAL_DATABASE_URL;
 if(!raw){t.skip("dedicated disposable database absent");return;}
 const url=new URL(raw);
 if(!["postgres:","postgresql:"].includes(url.protocol)||
   !["127.0.0.1","localhost"].includes(url.hostname)||
   url.pathname!=="/seo_engine_test"||url.port!=="5432") throw Error("disposable_database_only");
 const admin=postgres(raw,{max:1,prepare:false,connect_timeout:5});
 const observer=postgres(raw,{max:1,prepare:false,connect_timeout:5});
 t.after(async()=>{await Promise.allSettled([admin.end({timeout:2}),observer.end({timeout:2})]);});
 let resolvePid!:(n:number)=>void;
 const pidReady=new Promise<number>(resolve=>{resolvePid=resolve;});
 const observation=observer.begin(async tx=>{
   const [row]=await tx`SELECT pg_backend_pid() AS pid`;
   const pid=Number(row?.pid);
   assert.ok(Number.isSafeInteger(pid)&&pid>0);
   resolvePid(pid);
   await tx`SELECT pg_sleep(15)`;
   // A result returned after a backend was intentionally terminated is invalid.
   return "completed";
 });
 const pid=await pidReady;
 let active=false;
 for(let i=0;i<50;i++){
   const [state]=await admin`SELECT state,query FROM pg_stat_activity WHERE pid=${pid}`;
   if(state?.state==="active"&&String(state.query).includes("pg_sleep")){active=true;break;}
   await new Promise<void>(resolve=>setTimeout(resolve,50));
 }
 assert.ok(active,"observer must be in the read before termination");
 const [terminated]=await admin`SELECT pg_terminate_backend(${pid}) AS stopped`;
 assert.equal(terminated?.stopped,true,"terminate only the observer PID");
 await assert.rejects(observation,"an interrupted observer query cannot supply complete evidence");
 const expected={attemptId:"observer-terminated",tenantId:"tenant",siteId:"site",
  jobIdentity:"a".repeat(64),fingerprint:"b".repeat(64),
  priorFence:2,committedFence:3,priorAttempts:1,owner:"candidate"};
 const result=reconcileFencedCommitEvidence(expected,{kind:"unavailable"});
 assert.equal(result.outcome,"manual_intervention_required");
 assert.equal(result.automaticRetryAllowed,false);
 assert.equal(result.providerDispatchAllowed,false);
 assert.equal(result.productionAuthority,false);
});
