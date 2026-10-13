/** SQL-level timeout fail-closed regression on disposable PostgreSQL only. */
import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import {classifyIndependentObserverResult} from "./ugp-11-c4-observer-read-classifier.js";
import {reconcileFencedCommitEvidence} from "./ugp-11-c4-fenced-evidence-reconcile.js";

test("read-only observer statement timeout produces unavailable evidence and no execution grants",async t=>{
 const raw=process.env.UGP_11_EPHEMERAL_DATABASE_URL;
 if(!raw){t.skip("disposable PostgreSQL unavailable");return;}
 const u=new URL(raw);
 if(!["postgres:","postgresql:"].includes(u.protocol)||
 !["localhost","127.0.0.1"].includes(u.hostname)||u.port!=="5432"||
 u.pathname!=="/seo_engine_test"||u.search!==""||u.hash!=="")throw Error("disposable_database_only");
 const db=postgres(raw,{max:1,prepare:false,connect_timeout:5});
 let rejected:unknown;
 try{
  await db.begin("isolation level repeatable read",async tx=>{
   await tx`SET TRANSACTION READ ONLY`;
   // Small test-only bound to prove the same PostgreSQL mechanism.
   await tx`SET LOCAL statement_timeout = '25ms'`;
   const [cfg]=await tx`SELECT current_setting('statement_timeout') AS value,
     current_setting('transaction_read_only') AS ro`;
   assert.equal(cfg!.value,"25ms");
   assert.equal(cfg!.ro,"on");
   await tx`SELECT pg_sleep(0.2)`;
  });
 }catch(error){rejected=error}finally{await db.end({timeout:2}).catch(()=>{})}
 assert.ok(rejected,"PostgreSQL should cancel overlong SELECT");
 assert.equal((rejected as {code?:string}).code,"57014");
 const snapshot=classifyIndependentObserverResult({kind:"failed",error:rejected});
 assert.equal(snapshot.kind,"unavailable");
 const decision=reconcileFencedCommitEvidence({attemptId:"timeout",tenantId:"tenant",
  siteId:"site",jobIdentity:"a".repeat(64),fingerprint:"b".repeat(64),
  priorFence:7,committedFence:8,priorAttempts:1,owner:"candidate"},snapshot);
 assert.equal(decision.outcome,"manual_intervention_required");
 assert.equal(decision.automaticRetryAllowed,false);
 assert.equal(decision.providerDispatchAllowed,false);
 assert.equal(decision.productionAuthority,false);
});
