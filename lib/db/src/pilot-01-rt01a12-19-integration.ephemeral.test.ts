import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {readFile,readdir} from "node:fs/promises";
import test from "node:test";
import postgres from "postgres";
import {attemptSyntheticAdmission,attemptSyntheticWorkerStep}
  from "./pilot-01-rt01a12-19-disconnected-integration.js";
import {DisposablePgTransactionalAdapter}
  from "./pilot-01-rt01a12-5-disposable-transactional-adapter.js";
import type {TrustedCustodyPorts} from "./pilot-01-rt01a12-7-disconnected-custody.js";
import type {TransactionCustodyPort,TransactionRequest,TxResult}
  from "./pilot-01-rt01a12-8-disconnected-transaction.js";
import type {AdmissionIntent,LeaseToken}
  from "./pilot-01-rt01a12-4-disconnected-admission-contract.js";
const armed=process.env.PILOT01_A12_19_DISPOSABLE_PG==="I_ACKNOWLEDGE_NEW_EMPTY_PG17_ONLY"&&
  Boolean(process.env.PILOT01_A12_19_DISPOSABLE_DATABASE_URL);
type DB=ReturnType<typeof postgres>;
function guardedUrl():string{
  if(!armed)throw Error("A12_19_NOT_ARMED");
  const u=new URL(process.env.PILOT01_A12_19_DISPOSABLE_DATABASE_URL!);
  if(!["postgres:","postgresql:"].includes(u.protocol)||
    !["127.0.0.1","localhost","[::1]","::1"].includes(u.hostname)||
    u.port!=="5432"||u.username!=="postgres"||
    u.pathname!=="/pilot01_disposable_rt01a12_19_ci"||
    Boolean(u.search)||Boolean(u.hash)||
    /railway|neon|staging|production|restore|supabase|diamondshelf/i.test(u.href))
    throw Error("A12_19_REFUSE_NONDISPOSABLE_TARGET");
  return u.toString();
}
async function attestEmpty(db:DB){
  const r=await db.unsafe<{name:string;version:number;who:string;tables:number;
    roles:number;other_schemas:number;extensions:number}[]>(
    "SELECT current_database() AS name,current_setting('server_version_num')::int/10000 AS version,"+
    "current_user AS who,(SELECT count(*)::int FROM pg_tables WHERE schemaname='public') AS tables,"+
    "(SELECT count(*)::int FROM pg_roles WHERE rolname LIKE 'pilot01_a12_19_%') AS roles,"+
    "(SELECT count(*)::int FROM pg_namespace WHERE nspname NOT IN "+
    "('public','pg_catalog','information_schema','pg_toast') AND nspname NOT LIKE 'pg_temp_%' "+
    "AND nspname NOT LIKE 'pg_toast_temp_%') AS other_schemas,"+
    "(SELECT count(*)::int FROM pg_extension WHERE extname NOT IN ('plpgsql')) AS extensions");
  assert.equal(r[0].name,"pilot01_disposable_rt01a12_19_ci");
  assert.equal(r[0].version,17);assert.equal(r[0].who,"postgres");
  assert.equal(r[0].tables,0);assert.equal(r[0].roles,0);
  assert.equal(r[0].other_schemas,0);assert.equal(r[0].extensions,0);
}
test("A12.19 refuses all unarmed database connections",()=>{
  if(!armed)assert.throws(guardedUrl,/A12_19_NOT_ARMED/);
});
test("A12.19 actual PG17 synthetic custody + durable admission integration",
  {skip:!armed,timeout:180000},async t=>{
  const db=postgres(guardedUrl(),{max:5,prepare:false,connect_timeout:4,idle_timeout:3});
  let attested=false;
  try{
    await attestEmpty(db);
    attested=true;
    const names=(await readdir(new URL("../migrations/",import.meta.url)))
      .filter(f=>/^00(?:0[1-9]|1[01])_.*\.sql$/.test(f)).sort();
    assert.deepEqual(names.map(x=>Number(x.slice(0,4))),
      [1,2,3,4,5,6,7,8,9,10,11]);
    const candidates=["rt01-a12-1-pilot01-additive.sql",
      "rt01-a12-14-canonical-membership-issuer-revocation-additive.sql",
      "rt01-a12-16-custody-integrity-enforcement-additive.sql"];
    const setup=postgres(guardedUrl(),{max:1,prepare:false,connect_timeout:4});
    try{
      for(const name of names){
        const content=await readFile(new URL("../migrations/"+name,import.meta.url),"utf8");
        assert.match(content,/^BEGIN;/);assert.match(content,/COMMIT;\s*$/);
        await setup.unsafe(content);
      }
      for(const file of candidates){
        const content=await readFile(new URL("../../../docs/sql-candidates/"+file,import.meta.url),"utf8");
        await setup.unsafe(content);
      }
    }finally{await setup.end({timeout:4});}
    const org=randomUUID(),other=randomUUID(),site=randomUUID(),otherSite=randomUUID();
    const session=randomUUID(),subject="synthetic-subject",issuer="synthetic-issuer";
    const hash="a".repeat(64);
    await db.unsafe("INSERT INTO public.organizations(id,name,slug) VALUES "+
      "($1,'tenant A','a12-19-a'),($2,'tenant B','a12-19-b')",[org,other]);
    await db.unsafe("INSERT INTO public.sites(id,organization_id,name,domain,canonical_origin) VALUES "+
      "($1,$2,'A','a12-19-a.invalid','https://a12-19-a.invalid'),"+
      "($3,$4,'B','a12-19-b.invalid','https://a12-19-b.invalid')",[site,org,otherSite,other]);
    await db.unsafe("INSERT INTO public.auth_sessions "+
      "(id,token_hash,subject,email,role,csrf_token_hash,expires_at) "+
      "VALUES($1,$2,$3,'synthetic@invalid.test','operator',$4,clock_timestamp()+interval '1 hour')",
      [session,"b".repeat(64),subject,"c".repeat(64)]);
    await db.unsafe("INSERT INTO pilot01.tenant_memberships "+
      "(organization_id,subject,role,active,revision,expires_at) "+
      "VALUES($1,$2,'operator',true,1,clock_timestamp()+interval '1 hour')",
      [org,subject]);
    await db.unsafe("INSERT INTO pilot01.issuer_custody "+
      "(issuer_id,organization_id,site_id,actor_subject,operation,provenance_sha256,"+
      "active,revision,expires_at) VALUES($1,$2,$3,$4,'analyze',$5,true,1,"+
      "clock_timestamp()+interval '1 hour')",[issuer,org,site,subject,hash]);
    const custody:TrustedCustodyPorts={
      now:()=>Date.now(),
      session:{current:async()=>{
        const rows=await db.unsafe<{id:string;subject:string;role:"viewer"|"operator"|"admin";
          revoked_at:Date|null;expires_at:Date}[]>(
          "SELECT id::text,subject,role,revoked_at,expires_at "+
          "FROM public.auth_sessions WHERE id=$1",[session]);
        return rows[0]?{sessionId:rows[0].id,subject:rows[0].subject,
          role:rows[0].role,active:rows[0].revoked_at===null,
          revokedAt:rows[0].revoked_at?.toISOString()??null,
          expiresAt:rows[0].expires_at.toISOString()}:null;
      }},
      site:{get:async id=>{
        const rows=await db.unsafe<{id:string;organization_id:string;is_active:boolean}[]>(
          "SELECT id::text,organization_id::text,is_active FROM public.sites WHERE id=$1",[id]);
        return rows[0]?{siteId:rows[0].id,organizationId:rows[0].organization_id,
          active:rows[0].is_active}:null;
      }},
      membership:{get:async(sub,organizationId)=>{
        const rows=await db.unsafe<{organization_id:string;subject:string;role:"viewer"|"operator"|"admin";
          active:boolean;revoked_at:Date|null;expires_at:Date;revision:string}[]>(
          "SELECT organization_id::text,subject,role,active,revoked_at,expires_at,"+
          "revision::text FROM pilot01.tenant_memberships "+
          "WHERE organization_id=$1 AND subject=$2",[organizationId,sub]);
        return rows[0]?{organizationId:rows[0].organization_id,subject:rows[0].subject,
          role:rows[0].role,active:rows[0].active,
          revokedAt:rows[0].revoked_at?.toISOString()??null,
          expiresAt:rows[0].expires_at.toISOString(),revision:Number(rows[0].revision)}:null;
      }},
      issuer:{get:async id=>{
        const rows=await db.unsafe<{issuer_id:string;organization_id:string;site_id:string;
          actor_subject:string;operation:"analyze"|"recommend";active:boolean;
          revoked_at:Date|null;expires_at:Date;provenance_sha256:string;revision:string}[]>(
          "SELECT issuer_id,organization_id::text,site_id::text,actor_subject,"+
          "operation,active,revoked_at,expires_at,provenance_sha256,revision::text "+
          "FROM pilot01.issuer_custody WHERE issuer_id=$1",[id]);
        return rows[0]?{issuerId:rows[0].issuer_id,organizationId:rows[0].organization_id,
          siteId:rows[0].site_id,actorSubject:rows[0].actor_subject,operation:rows[0].operation,
          active:rows[0].active,revokedAt:rows[0].revoked_at?.toISOString()??null,
          expiresAt:rows[0].expires_at.toISOString(),
          provenanceSha256:rows[0].provenance_sha256.trim(),
          revision:Number(rows[0].revision)}:null;
      }}
    };
    const adapter=new DisposablePgTransactionalAdapter(db,"RT01_A12_5_SYNTHETIC_DISPOSABLE_ONLY");
    let admitCalls=0,reconcileCalls=0,workerCalls=0;
    const admission={
      admitAtomically:(...args:Parameters<typeof adapter.admitAtomically>)=>{admitCalls++;return adapter.admitAtomically(...args);},
      reconcileAdmission:(...args:Parameters<typeof adapter.reconcileAdmission>)=>{reconcileCalls++;return adapter.reconcileAdmission(...args);},
      mutateWithFence:(...args:Parameters<typeof adapter.mutateWithFence>)=>{workerCalls++;return adapter.mutateWithFence(...args);}
    };
    // Test-only A12.8 port: demonstrates composition. Custody is queried again
    // BEFORE A12.5 opens its separate transaction, not inside that transaction!
    // This MUST NOT be treated as atomic revocation/admission certification.
    let txCalls=0,forceUnavailable=false,forceUnknown=false;
    const transaction:TransactionCustodyPort={
      admitWithCustody:async(request:TransactionRequest):Promise<TxResult>=>{
        txCalls++;
        if(forceUnavailable)return {status:"unavailable"};
        if(forceUnknown)throw Error("synthetic ambiguous commit");
        const verified=await custody.membership.get(request.scope.actorSubject,request.scope.organizationId);
        const issuerRow=await custody.issuer.get(request.scope.issuerId);
        const sessionRow=await custody.session.current();
        if(!verified?.active||verified.revokedAt||verified.revision!==request.fence.membershipRevision||
           verified.organizationId!==request.scope.organizationId||
           !issuerRow?.active||issuerRow.revokedAt||issuerRow.revision!==request.fence.issuerRevision||
           issuerRow.organizationId!==request.scope.organizationId||
           issuerRow.siteId!==request.scope.siteId||
           !sessionRow||sessionRow.revokedAt||!sessionRow.active||
           sessionRow.sessionId!==request.scope.sessionId)return {status:"denied"};
        const principal={
          source:"server_verified_principal" as const,authenticated:true as const,
          sessionActive:true as const,membershipVerified:true as const,issuerVerified:true as const,
          organizationId:request.scope.organizationId,siteId:request.scope.siteId,
          actorSubject:request.scope.actorSubject,sessionId:request.scope.sessionId,
          issuerId:request.scope.issuerId,issuerProvenanceSha256:issuerRow.provenanceSha256,
          operation:request.scope.operation
        };
        const result=await adapter.admitAtomically({principal,intent:request.intent});
        return result.status==="committed"?{...result,membershipRevision:verified.revision,
          issuerRevision:issuerRow.revision}:result;
      },
      reconcileReadOnly:async()=>({status:"unavailable"})
    };
    const ports={custody,transaction,admission};
    const scope={siteId:site,issuerId:issuer,operation:"analyze" as const};
    const makeGrant=async()=>{
      const grantId=randomUUID();
      await db.unsafe("INSERT INTO pilot01.grants "+
        "(grant_id,organization_id,site_id,actor_subject,session_id,issuer_id,"+
        "issuer_provenance_sha256,operation,expires_at) "+
        "VALUES($1,$2,$3,$4,$5,$6,$7,'analyze',clock_timestamp()+interval '1 hour')",
        [grantId,org,site,subject,session,issuer,hash]);
      return grantId;
    };
    const intent=async(key:string):Promise<AdmissionIntent>=>({
      grantId:await makeGrant(),idempotencyKey:key,requestSha256:"d".repeat(64)
    });
    await t.test("cross-tenant site, wrong operation and unknown issuer fail before admission",async()=>{
      const i=await intent("reject-scope");
      for(const s of [{...scope,siteId:otherSite},{...scope,issuerId:"unknown"},
        {...scope,operation:"recommend" as const}]){
        const out=await attemptSyntheticAdmission(ports,s,i);
        assert.equal(out.status,"blocked");
      }
      assert.equal(txCalls,0);assert.equal(admitCalls,0);
    });
    await t.test("synthetic verified custody -> durable grant/job/receipt/event -> read-only reconciliation",async()=>{
      const i=await intent("committed");
      const out=await attemptSyntheticAdmission(ports,scope,i);
      assert.equal(out.status,"synthetic_committed");
      if(out.status!=="synthetic_committed")return;
      assert.equal(out.receipt.organizationId,org);
      const counts=await db.unsafe<{jobs:number;admissions:number;events:number}[]>(
        "SELECT (SELECT count(*)::int FROM pilot01.jobs) AS jobs,"+
        "(SELECT count(*)::int FROM pilot01.admissions) AS admissions,"+
        "(SELECT count(*)::int FROM pilot01.job_events) AS events");
      assert.equal(counts[0].jobs,1);assert.equal(counts[0].admissions,1);
      assert.equal(counts[0].events,1);assert.equal(admitCalls,0);
      assert.equal(reconcileCalls,1);
      const lease=await db.unsafe<{lease_expires_at:Date}[]>(
        "UPDATE pilot01.jobs SET state='claimed',worker_owner='synthetic-worker',"+
        "generation=1,lease_expires_at=clock_timestamp()+interval '1 minute',"+
        "claimed_at=clock_timestamp() WHERE job_id=$1 RETURNING lease_expires_at",
        [out.receipt.jobId]);
      assert.equal(lease.length,1);
      const token:LeaseToken={jobId:out.receipt.jobId,organizationId:org,siteId:site,
        workerOwner:"synthetic-worker",generation:1,leaseExpiresAt:lease[0].lease_expires_at.toISOString()};
      assert.equal(await attemptSyntheticWorkerStep(admission,token,i.requestSha256,"valid","legacy"),"blocked");
      assert.equal(workerCalls,0);
      assert.equal(await attemptSyntheticWorkerStep(admission,{...token,generation:2},
        i.requestSha256,"valid"),"blocked");
      assert.equal(await attemptSyntheticWorkerStep(admission,token,
        i.requestSha256,"valid"),"synthetic_applied");
      assert.equal(await attemptSyntheticWorkerStep(admission,token,
        i.requestSha256,"valid"),"blocked");
    });
    await t.test("injected admission-event failure leaves grant unconsumed and no job or receipt",async()=>{
      const i=await intent("event-failure");
      const before=await db.unsafe<{jobs:number;admissions:number;events:number}[]>(
        "SELECT (SELECT count(*)::int FROM pilot01.jobs) AS jobs,"+
        "(SELECT count(*)::int FROM pilot01.admissions) AS admissions,"+
        "(SELECT count(*)::int FROM pilot01.job_events) AS events");
      await db.unsafe("CREATE FUNCTION pilot01.a12_19_fail_admit_event() RETURNS trigger "+
        "LANGUAGE plpgsql AS $ BEGIN IF NEW.event_kind='admitted' THEN "+
        "RAISE EXCEPTION 'synthetic a12.19 event failure'; END IF; RETURN NEW; END $");
      await db.unsafe("CREATE TRIGGER a12_19_synthetic_admission_failure "+
        "BEFORE INSERT ON pilot01.job_events FOR EACH ROW "+
        "EXECUTE FUNCTION pilot01.a12_19_fail_admit_event()");
      try{
        const result=await attemptSyntheticAdmission(ports,scope,i);
        assert.equal(result.status,"blocked");
      }finally{
        await db.unsafe("DROP TRIGGER a12_19_synthetic_admission_failure ON pilot01.job_events");
        await db.unsafe("DROP FUNCTION pilot01.a12_19_fail_admit_event()");
      }
      const row=await db.unsafe<{state:string}[]>(
        "SELECT state FROM pilot01.grants WHERE grant_id=$1",[i.grantId]);
      assert.equal(row[0].state,"issued");
      const after=await db.unsafe<{jobs:number;admissions:number;events:number}[]>(
        "SELECT (SELECT count(*)::int FROM pilot01.jobs) AS jobs,"+
        "(SELECT count(*)::int FROM pilot01.admissions) AS admissions,"+
        "(SELECT count(*)::int FROM pilot01.job_events) AS events");
      assert.deepEqual(after,before);
    });
    await t.test("unknown commit blocks rather than retries or re-admits",async()=>{
      const i=await intent("ambiguous");
      forceUnknown=true;
      try{assert.equal((await attemptSyntheticAdmission(ports,scope,i)).status,"blocked");}
      finally{forceUnknown=false;}
      const row=await db.unsafe<{state:string}[]>("SELECT state FROM pilot01.grants WHERE grant_id=$1",[i.grantId]);
      assert.equal(row[0].state,"issued");
      assert.equal(admitCalls,0);
      forceUnavailable=true;
      try{assert.equal((await attemptSyntheticAdmission(ports,scope,i)).status,"blocked");}
      finally{forceUnavailable=false;}
    });
    await t.test("revoked and expired canonical sessions cannot start admissions",async()=>{
      const i=await intent("session-denial");
      const before=txCalls;
      await db.unsafe("UPDATE public.auth_sessions SET revoked_at=clock_timestamp() WHERE id=$1",[session]);
      assert.equal((await attemptSyntheticAdmission(ports,scope,i)).status,"blocked");
      await db.unsafe("UPDATE public.auth_sessions SET revoked_at=NULL,expires_at=clock_timestamp()-interval '1 minute' WHERE id=$1",[session]);
      assert.equal((await attemptSyntheticAdmission(ports,scope,i)).status,"blocked");
      assert.equal(txCalls,before);
      await db.unsafe("UPDATE public.auth_sessions SET expires_at=clock_timestamp()+interval '1 hour' WHERE id=$1",[session]);
      const state=await db.unsafe<{state:string}[]>("SELECT state FROM pilot01.grants WHERE grant_id=$1",[i.grantId]);
      assert.equal(state[0].state,"issued");
    });
    await t.test("revocation automatically emits audit and blocks future admission",async()=>{
      await db.unsafe("UPDATE pilot01.tenant_memberships SET active=false,"+
        "revoked_at=clock_timestamp(),revision=revision+1 "+
        "WHERE organization_id=$1 AND subject=$2",[org,subject]);
      const ev=await db.unsafe<{n:number}[]>(
        "SELECT count(*)::int AS n FROM pilot01.custody_revocation_events WHERE organization_id=$1",[org]);
      assert.equal(ev[0].n,1);
      const i=await intent("revoked");
      const calls=txCalls;
      assert.equal((await attemptSyntheticAdmission(ports,scope,i)).status,"blocked");
      assert.equal(txCalls,calls);
      const row=await db.unsafe<{state:string}[]>(
        "SELECT state FROM pilot01.grants WHERE grant_id=$1",[i.grantId]);
      assert.equal(row[0].state,"issued");
    });
    await t.test("issuer revocation independently appends audit and blocks admission",async()=>{
      await db.unsafe("UPDATE pilot01.issuer_custody SET active=false,"+
        "revoked_at=clock_timestamp(),revision=revision+1 WHERE issuer_id=$1",[issuer]);
      const ev=await db.unsafe<{entity_type:string}[]>(
        "SELECT entity_type FROM pilot01.custody_revocation_events WHERE organization_id=$1 ORDER BY entity_type",
        [org]);
      assert.deepEqual(ev.map(x=>x.entity_type),["issuer","membership"]);
      const i=await intent("issuer-revoked");
      const calls=txCalls;
      assert.equal((await attemptSyntheticAdmission(ports,scope,i)).status,"blocked");
      assert.equal(txCalls,calls);
    });
    await t.test("synthetic worker denies revoked custody and all legacy recovery",async()=>{
      const token:LeaseToken={jobId:randomUUID(),organizationId:org,siteId:site,
        workerOwner:"synthetic-worker",generation:1,leaseExpiresAt:new Date(Date.now()+60000).toISOString()};
      const before=workerCalls;
      assert.equal(await attemptSyntheticWorkerStep(admission,token,"e".repeat(64),"revoked"),"blocked");
      assert.equal(await attemptSyntheticWorkerStep(admission,token,"e".repeat(64),"unavailable"),"blocked");
      assert.equal(await attemptSyntheticWorkerStep(admission,token,"e".repeat(64),"valid","legacy"),"blocked");
      assert.equal(workerCalls,before);
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
