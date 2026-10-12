/** UGP-11.C4 disposable-only real PostgreSQL observer-disconnect experiment.
 * An isolated psql child issues an in-flight SELECT; a distinct fixture SQL client
 * terminates only its observed PID. No production SQL, runtime retries or dispatch.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {spawn} from "node:child_process";
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
 const tag="ugp_c4_disconnect_"+process.pid;
 const child=spawn("psql",["-X","-v","ON_ERROR_STOP=1","-h","127.0.0.1","-p","5432",
  "-U",decodeURIComponent(url.username),"-d","seo_engine_test",
  "-c","SELECT pg_sleep(15)"],{env:{...process.env,PGPASSWORD:decodeURIComponent(url.password),
   PGAPPNAME:tag,PGSSLMODE:"disable",PGGSSENCMODE:"disable",PGCONNECT_TIMEOUT:"5"},
   stdio:["ignore","pipe","pipe"]});
 let out="",err="";
 child.stdout.setEncoding("utf8");child.stderr.setEncoding("utf8");
 child.stdout.on("data",(s:string)=>{out=(out+s).slice(-3000)});
 child.stderr.on("data",(s:string)=>{err=(err+s).slice(-3000)});
 const exit=new Promise<{code:number|null;signal:NodeJS.Signals|null}>((resolve,reject)=>{
  child.once("error",reject);
  child.once("close",(code,signal)=>resolve({code,signal}));
 });
 t.after(async()=>{if(child.exitCode===null)child.kill("SIGKILL");await admin.end({timeout:2})});
 let pid:number|undefined;
 for(let i=0;i<100;i++){
  const rows=await admin`SELECT pid FROM pg_stat_activity
    WHERE application_name=${tag} AND state='active' AND query LIKE 'SELECT pg_sleep%'`;
  if(rows.length===1){pid=Number(rows[0]?.pid);break;}
  assert.ok(rows.length<=1,"never terminate ambiguous backend matches");
  await new Promise<void>(resolve=>setTimeout(resolve,50));
 }
 assert.ok(pid&&Number.isSafeInteger(pid),"the isolated observer must be in its in-flight read");
 const [terminated]=await admin`SELECT pg_terminate_backend(${pid}) AS stopped`;
 assert.equal(terminated?.stopped,true,"terminate only the dedicated observer backend");
 const status=await exit;
 assert.notEqual(status.code,0,"observer must not report SELECT success after termination");
 assert.doesNotMatch(out,/\(1 row\)/,"observer cannot return a successful result");
 assert.match(err,/terminating connection|server closed the connection|connection to server was lost|FATAL/i,
  "child must report backend disconnect");
 const expected={attemptId:"observer-terminated",tenantId:"tenant",siteId:"site",
  jobIdentity:"a".repeat(64),fingerprint:"b".repeat(64),
  priorFence:2,committedFence:3,priorAttempts:1,owner:"candidate"};
 const result=reconcileFencedCommitEvidence(expected,{kind:"unavailable"});
 assert.equal(result.outcome,"manual_intervention_required");
 assert.equal(result.automaticRetryAllowed,false);
 assert.equal(result.providerDispatchAllowed,false);
 assert.equal(result.productionAuthority,false);
});
