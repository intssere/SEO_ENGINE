/** A12.20: ONLY a fresh empty loopback PostgreSQL 17 GitHub Actions service. */
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {readFile,readdir} from "node:fs/promises";
import test from "node:test";
import postgres from "postgres";
import {DisconnectedTransactionContract,type TransactionRequest}
  from "./pilot-01-rt01a12-8-disconnected-transaction.js";
import {DisposableAtomicCustodyAdapter}
  from "./pilot-01-rt01a12-20-atomic-custody-adapter.js";
type DB=ReturnType<typeof postgres>;
const armed=process.env.PILOT01_A12_20_DISPOSABLE_PG==="I_ACKNOWLEDGE_NEW_EMPTY_PG17_ONLY"&&
  Boolean(process.env.PILOT01_A12_20_DISPOSABLE_DATABASE_URL);
function guardedUrl(){
  if(!armed)throw Error("A12_20_NOT_ARMED");
  const u=new URL(process.env.PILOT01_A12_20_DISPOSABLE_DATABASE_URL!);
  if(!["postgres:","postgresql:"].includes(u.protocol)||
     !["127.0.0.1","localhost","[::1]","::1"].includes(u.hostname)||
     u.port!=="5432"||u.username!=="postgres"||
     u.pathname!=="/pilot01_disposable_rt01a12_20_ci"||
     Boolean(u.search)||Boolean(u.hash)||
     /railway|neon|staging|production|restore|supabase|diamondshelf/i.test(u.href))
    throw Error("A12_20_REFUSE_NONDISPOSABLE_TARGET");
  return u.toString();
}
async function attestEmpty(db:DB){
  const r=await db.unsafe<{name:string;major:number;who:string;tables:number;roles:number;
    other_schemas:number;extensions:number}[]>(
    "SELECT current_database() AS name,current_setting('server_version_num')::int/10000 AS major,"+
    "current_user AS who,(SELECT count(*)::int FROM pg_tables WHERE schemaname='public') AS tables,"+
    "(SELECT count(*)::int FROM pg_roles WHERE rolname LIKE 'pilot01_a12_20_%') AS roles,"+
    "(SELECT count(*)::int FROM pg_namespace WHERE nspname NOT IN "+
    "('public','pg_catalog','information_schema','pg_toast') AND nspname NOT LIKE 'pg_temp_%' "+
    "AND nspname NOT LIKE 'pg_toast_temp_%') AS other_schemas,"+
    "(SELECT count(*)::int FROM pg_extension WHERE extname NOT IN ('plpgsql')) AS extensions");
  assert.deepEqual({...r[0],name:"",who:""},{
    name:"",major:17,who:"",tables:0,roles:0,other_schemas:0,extensions:0
  });
  assert.equal(r[0].name,"pilot01_disposable_rt01a12_20_ci");
  assert.equal(r[0].who,"postgres");
}
type Case={org:string;site:string;session:string;subject:string;issuer:string;hash:string;
  request:(key:string)=>Promise<TransactionRequest>};
test("unarmed A12.20 refuses any database connection",()=>{
  if(!armed)assert.throws(guardedUrl,/A12_20_NOT_ARMED/);
});
test("A12.20 transactional custody serialization in strictly attested new PG17",
  {skip:!armed,timeout:180000},async t=>{
  const db=postgres(guardedUrl(),{max:8,prepare:false,connect_timeout:4,idle_timeout:5});
  let attested=false;
  try{
    await attestEmpty(db);attested=true;
    const files=(await readdir(new URL("../migrations/",import.meta.url)))
      .filter(x=>/^00(?:0[1-9]|1[01])_.*\.sql$/.test(x)).sort();
    assert.deepEqual(files.map(x=>Number(x.slice(0,4))),[1,2,3,4,5,6,7,8,9,10,11]);
    const setup=postgres(guardedUrl(),{max:1,prepare:false,connect_timeout:4});
    try{
      for(const f of files){
        const sql=await readFile(new URL("../migrations/"+f,import.meta.url),"utf8");
        assert.match(sql,/^BEGIN;/);
        await setup.unsafe(sql);
      }
      for(const f of ["rt01-a12-1-pilot01-additive.sql",
        "rt01-a12-14-canonical-membership-issuer-revocation-additive.sql",
        "rt01-a12-16-custody-integrity-enforcement-additive.sql"]){
        await setup.unsafe(await readFile(
          new URL("../../../docs/sql-candidates/"+f,import.meta.url),"utf8"));
      }
    }finally{await setup.end({timeout:4});}
    const makeCase=async(label:string):Promise<Case>=>{
      const org=randomUUID(),site=randomUUID(),session=randomUUID(),
        issuer="issuer-"+label,subject="subject-"+label,hash="a".repeat(64);
      await db.unsafe("INSERT INTO public.organizations(id,name,slug) VALUES($1,$2,$3)",
        [org,"Test "+label,"synthetic-"+label]);
      await db.unsafe("INSERT INTO public.sites(id,organization_id,name,domain,canonical_origin) "+
        "VALUES($1,$2,$3,$4,$5)",[site,org,"Test "+label,label+".invalid","https://"+label+".invalid"]);
      await db.unsafe("INSERT INTO public.auth_sessions "+
        "(id,token_hash,subject,email,role,csrf_token_hash,expires_at) "+
        "VALUES($1,$2,$3,$4,'operator',$5,clock_timestamp()+interval '1 hour')",
        [session,randomUUID(),subject,label+"@invalid.test",randomUUID()]);
      await db.unsafe("INSERT INTO pilot01.tenant_memberships "+
        "(organization_id,subject,role,active,revision,expires_at) "+
        "VALUES($1,$2,'operator',true,1,clock_timestamp()+interval '1 hour')",[org,subject]);
      await db.unsafe("INSERT INTO pilot01.issuer_custody "+
        "(issuer_id,organization_id,site_id,actor_subject,operation,provenance_sha256,"+
        "active,revision,expires_at) VALUES($1,$2,$3,$4,'analyze',$5,true,1,"+
        "clock_timestamp()+interval '1 hour')",[issuer,org,site,subject,hash]);
      return {org,site,session,subject,issuer,hash,
        request:async(key:string)=>{
          const grantId=randomUUID();
          await db.unsafe("INSERT INTO pilot01.grants "+
            "(grant_id,organization_id,site_id,actor_subject,session_id,issuer_id,"+
            "issuer_provenance_sha256,operation,expires_at) "+
            "VALUES($1,$2,$3,$4,$5,$6,$7,'analyze',clock_timestamp()+interval '1 hour')",
            [grantId,org,site,subject,session,issuer,hash]);
          return {scope:{organizationId:org,siteId:site,actorSubject:subject,sessionId:session,
            issuerId:issuer,operation:"analyze" as const},intent:{grantId,
            idempotencyKey:key,requestSha256:"b".repeat(64)},
            fence:{membershipRevision:1,issuerRevision:1}};
        }};
    };
    const adapter=new DisposableAtomicCustodyAdapter(db,"RT01_A12_20_ATTESTED_EMPTY_PG17_ONLY");
    const contract=new DisconnectedTransactionContract(adapter);
    await t.test("atomic grant/job/admission/event and same-key replay",async()=>{
      const c=await makeCase("success"),request=await c.request("one");
      const first=await contract.admit(request);
      assert.equal(first.status,"committed");
      const again=await contract.admit(request);
      assert.equal(again.status,"committed");
      if(first.status!=="committed"||again.status!=="committed")return;
      assert.equal(first.receipt.jobId,again.receipt.jobId);
      const counts=await db.unsafe<{n:number}[]>(
        "SELECT count(*)::int AS n FROM pilot01.admissions WHERE organization_id=$1",[c.org]);
      assert.equal(counts[0].n,1);
      const events=await db.unsafe<{n:number}[]>(
        "SELECT count(*)::int AS n FROM pilot01.job_events WHERE job_id=$1",
        [first.receipt.jobId]);
      assert.equal(events[0].n,1);
      const conflicting=await c.request("one");
      assert.equal((await contract.admit(conflicting)).status,"conflict");
    });
    await t.test("cross-tenant, wrong operation, issuer and stale fences deny",async()=>{
      const a=await makeCase("denials"),b=await makeCase("other");
      const r=await a.request("denied");
      for(const x of [
        {...r,scope:{...r.scope,organizationId:b.org}},
        {...r,scope:{...r.scope,siteId:b.site}},
        {...r,scope:{...r.scope,issuerId:b.issuer}},
        {...r,scope:{...r.scope,operation:"recommend" as const}},
        {...r,fence:{...r.fence,membershipRevision:2}},
        {...r,fence:{...r.fence,issuerRevision:2}},
      ])assert.equal((await contract.admit(x)).status,"denied");
      const state=await db.unsafe<{state:string}[]>(
        "SELECT state FROM pilot01.grants WHERE grant_id=$1",[r.intent.grantId]);
      assert.equal(state[0].state,"issued");
    });
    await t.test("session revocation and expiry rejected inside authoritative transaction",async()=>{
      const c=await makeCase("session"),r=await c.request("session");
      await db.unsafe("UPDATE public.auth_sessions SET revoked_at=clock_timestamp() WHERE id=$1",[c.session]);
      assert.equal((await contract.admit(r)).status,"denied");
      await db.unsafe("UPDATE public.auth_sessions SET revoked_at=NULL,"+
        "expires_at=clock_timestamp()-interval '1 second' WHERE id=$1",[c.session]);
      assert.equal((await contract.admit(r)).status,"denied");
    });
    await t.test("faulted event insert rolls back consumed grant, job and admission",async()=>{
      const c=await makeCase("rollback"),r=await c.request("rollback");
      await db.unsafe("CREATE FUNCTION pilot01.a12_20_fail_event() RETURNS trigger LANGUAGE plpgsql "+
        "AS $fail$ BEGIN IF NEW.event_kind='admitted' THEN RAISE EXCEPTION "+
        "'synthetic failure'; END IF; RETURN NEW; END $fail$");
      await db.unsafe("CREATE TRIGGER a12_20_test_failure BEFORE INSERT ON pilot01.job_events "+
        "FOR EACH ROW EXECUTE FUNCTION pilot01.a12_20_fail_event()");
      try{
        assert.equal((await contract.admit(r)).status,"commit_unknown");
      }finally{
        await db.unsafe("DROP TRIGGER a12_20_test_failure ON pilot01.job_events");
        await db.unsafe("DROP FUNCTION pilot01.a12_20_fail_event()");
      }
      const grant=await db.unsafe<{state:string}[]>(
        "SELECT state FROM pilot01.grants WHERE grant_id=$1",[r.intent.grantId]);
      const counts=await db.unsafe<{jobs:number;admissions:number}[]>(
        "SELECT (SELECT count(*)::int FROM pilot01.jobs WHERE grant_id=$1) AS jobs,"+
        "(SELECT count(*)::int FROM pilot01.admissions WHERE grant_id=$1) AS admissions",
        [r.intent.grantId]);
      assert.equal(grant[0].state,"issued");
      assert.deepEqual(counts[0],{jobs:0,admissions:0});
      assert.equal((await contract.reconcile(r)).status,"unavailable");
    });
    await t.test("admission first holds custody locks; revocation waits then commits",async()=>{
      const c=await makeCase("admitfirst"),r=await c.request("race-a");
      let entered!:()=>void,release!:()=>void;
      const reached=new Promise<void>(resolve=>{entered=resolve;});
      const gate=new Promise<void>(resolve=>{release=resolve;});
      const slow=new DisposableAtomicCustodyAdapter(db,"RT01_A12_20_ATTESTED_EMPTY_PG17_ONLY",
        async()=>{entered();await gate;});
      const admission=new DisconnectedTransactionContract(slow).admit(r);
      await reached;
      let revoked=false;
      const revoke=db.unsafe("UPDATE pilot01.tenant_memberships SET active=false,"+
        "revoked_at=clock_timestamp(),revision=revision+1 "+
        "WHERE organization_id=$1 AND subject=$2",[c.org,c.subject]).then(()=>{revoked=true;});
      try{
        await new Promise(resolve=>setTimeout(resolve,50));
        assert.equal(revoked,false,"revocation must wait on membership row lock");
      }finally{release();}
      assert.equal((await admission).status,"committed");
      await revoke;
      assert.equal(revoked,true);
      const revEvents=await db.unsafe<{n:number}[]>(
        "SELECT count(*)::int AS n FROM pilot01.custody_revocation_events "+
        "WHERE organization_id=$1",[c.org]);
      assert.equal(revEvents[0].n,1);
      assert.equal((await contract.admit(await c.request("post-revoke"))).status,"denied");
    });
    await t.test("revocation first holds membership lock; admission waits then denies",async()=>{
      const c=await makeCase("revokefirst"),r=await c.request("race-b");
      let entered!:()=>void,release!:()=>void;
      const reached=new Promise<void>(resolve=>{entered=resolve;});
      const gate=new Promise<void>(resolve=>{release=resolve;});
      const revocation=db.begin(async tx=>{
        await tx.unsafe("UPDATE pilot01.tenant_memberships SET active=false,"+
          "revoked_at=clock_timestamp(),revision=revision+1 "+
          "WHERE organization_id=$1 AND subject=$2",[c.org,c.subject]);
        entered();await gate;
      });
      await reached;
      let completed=false;
      const admission=contract.admit(r).then(x=>{completed=true;return x;});
      try{
        await new Promise(resolve=>setTimeout(resolve,50));
        assert.equal(completed,false,"admission must wait on revocation lock");
      }finally{release();}
      await revocation;
      assert.equal((await admission).status,"denied");
      const grant=await db.unsafe<{state:string}[]>(
        "SELECT state FROM pilot01.grants WHERE grant_id=$1",[r.intent.grantId]);
      assert.equal(grant[0].state,"issued");
    });
    await t.test("issuer first revocation serializes and blocks admission",async()=>{
      const c=await makeCase("issuerfirst"),r=await c.request("race-c");
      let entered!:()=>void,release!:()=>void;
      const reached=new Promise<void>(resolve=>{entered=resolve;});
      const gate=new Promise<void>(resolve=>{release=resolve;});
      const revoke=db.begin(async tx=>{
        await tx.unsafe("UPDATE pilot01.issuer_custody SET active=false,"+
          "revoked_at=clock_timestamp(),revision=revision+1 WHERE issuer_id=$1",[c.issuer]);
        entered();await gate;
      });
      await reached;
      let completed=false;
      const admit=contract.admit(r).then(x=>{completed=true;return x;});
      try{
        await new Promise(resolve=>setTimeout(resolve,50));assert.equal(completed,false);
      }finally{release();}
      await revoke;
      assert.equal((await admit).status,"denied");
    });
  }finally{
    if(attested){
      try{
        await db.unsafe("DROP SCHEMA IF EXISTS pilot01 CASCADE");
        await db.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
        await db.unsafe("CREATE SCHEMA public");
      }finally{await db.end({timeout:4});}
    }else await db.end({timeout:4});
  }
});
