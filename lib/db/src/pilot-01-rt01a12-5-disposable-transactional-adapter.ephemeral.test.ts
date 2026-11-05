/** RT01-A12.5: exclusively an empty, fresh, loopback PostgreSQL 17 CI database. */
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {readFile} from "node:fs/promises";
import test from "node:test";
import postgres from "postgres";
import {DisconnectedAdmissionContract,type ServerVerifiedPrincipal,type AdmissionIntent}
  from "./pilot-01-rt01a12-4-disconnected-admission-contract.js";
import {DisposablePgTransactionalAdapter}
  from "./pilot-01-rt01a12-5-disposable-transactional-adapter.js";

const armed=process.env.PILOT01_A12_5_DISPOSABLE_PG==="I_ACKNOWLEDGE_NEW_EMPTY_PG17_ONLY" &&
  !!process.env.PILOT01_A12_5_DISPOSABLE_DATABASE_URL;
const candidate=new URL("../../../docs/sql-candidates/rt01-a12-1-pilot01-additive.sql",import.meta.url);
function connectionUrl(){
  if(!armed)throw Error("A12_5_NOT_ARMED");
  const u=new URL(process.env.PILOT01_A12_5_DISPOSABLE_DATABASE_URL!);
  if(!["postgres:","postgresql:"].includes(u.protocol)||
    !["127.0.0.1","localhost","[::1]","::1"].includes(u.hostname)||
    !/^pilot01_disposable_rt01a12_5_[a-z0-9_]+$/.test(u.pathname.slice(1))||
    u.username!=="postgres"||!!u.search||
    /railway|neon|staging|production|restore|supabase|diamondshelf/i.test(u.href))
    throw Error("A12_5_DISPOSABLE_LOOPBACK_ONLY");
  return u.toString();
}
test("A12.5 unarmed test refuses all connections",()=>{
  if(!armed)assert.throws(connectionUrl,/A12_5_NOT_ARMED/);
});
test("A12.5 synthetic concurrent admissions, faults, recovery and stale fencing",
  {skip:!armed,timeout:120000},async t=>{
  const db=postgres(connectionUrl(),{max:5,prepare:false,connect_timeout:3});
  let owns=false;
  try{
    const x=await db.unsafe<{db:string;major:number;who:string;count:number;pilot:boolean}[]>(
      "SELECT current_database() AS db,current_setting('server_version_num')::int/10000 AS major,"+
      "current_user AS who,(SELECT count(*)::int FROM pg_tables WHERE schemaname='public') AS count,"+
      "EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='pilot01') AS pilot");
    assert.match(x[0].db,/^pilot01_disposable_rt01a12_5_/);
    assert.equal(x[0].major,17);assert.equal(x[0].who,"postgres");
    assert.equal(x[0].count,0);assert.equal(x[0].pilot,false);
    const extra=await db.unsafe(
      "SELECT nspname FROM pg_namespace WHERE nspname NOT IN "+
      "('public','information_schema','pg_catalog','pg_toast') "+
      "AND nspname NOT LIKE 'pg_temp_%' AND nspname NOT LIKE 'pg_toast_temp_%'");
    assert.equal(extra.length,0);
    owns=true;
    await db.unsafe(
      "CREATE TABLE public.organizations(id uuid PRIMARY KEY);"+
      "CREATE TABLE public.sites(id uuid PRIMARY KEY,organization_id uuid NOT NULL "+
      "REFERENCES public.organizations(id));"+
      "CREATE TABLE public.auth_sessions(id uuid PRIMARY KEY)");
    // Candidate's explicit BEGIN/COMMIT requires a reserved single connection.
    const setup=postgres(connectionUrl(),{max:1,prepare:false,connect_timeout:3});
    try{await setup.unsafe(await readFile(candidate,"utf8"));}finally{await setup.end({timeout:3});}
    const org=randomUUID(),site=randomUUID(),session=randomUUID(),issuerHash="a".repeat(64);
    await db.unsafe("INSERT INTO public.organizations VALUES($1)",[org]);
    await db.unsafe("INSERT INTO public.sites VALUES($1,$2)",[site,org]);
    await db.unsafe("INSERT INTO public.auth_sessions VALUES($1)",[session]);
    const p:ServerVerifiedPrincipal={
      source:"server_verified_principal",authenticated:true,sessionActive:true,
      membershipVerified:true,issuerVerified:true,organizationId:org,siteId:site,
      actorSubject:"synthetic-actor",sessionId:session,issuerId:"synthetic-issuer",
      issuerProvenanceSha256:issuerHash,operation:"analyze",
    };
    const createGrant=async() => {
      const grantId=randomUUID();
      await db.unsafe(
        "INSERT INTO pilot01.grants(grant_id,organization_id,site_id,actor_subject,"+
        "session_id,issuer_id,issuer_provenance_sha256,operation,expires_at) "+
        "VALUES($1,$2,$3,$4,$5,$6,$7,'analyze',clock_timestamp()+interval '1 hour')",
        [grantId,org,site,p.actorSubject,session,p.issuerId,issuerHash]);
      return grantId;
    };
    const a=new DisposablePgTransactionalAdapter(db,"RT01_A12_5_SYNTHETIC_DISPOSABLE_ONLY");
    const facade=new DisconnectedAdmissionContract(a);
    await t.test("parallel same-key grants commit exactly once and conflict safely",async()=>{
      const g1=await createGrant(),g2=await createGrant();
      const one:AdmissionIntent={grantId:g1,idempotencyKey:"same-key",requestSha256:"b".repeat(64)};
      const two:AdmissionIntent={grantId:g2,idempotencyKey:"same-key",requestSha256:"c".repeat(64)};
      const outcomes=await Promise.all([facade.admit(p,one),facade.admit(p,two)]);
      assert.deepEqual(outcomes.map(x=>x.status).sort(),["committed","conflict"]);
      const c=await db.unsafe<{n:number}[]>(
        "SELECT count(*)::int AS n FROM pilot01.admissions WHERE organization_id=$1 "+
        "AND idempotency_key='same-key'",[org]);
      assert.equal(c[0].n,1);
      const ev=await db.unsafe<{n:number}[]>(
        "SELECT count(*)::int AS n FROM pilot01.job_events WHERE event_kind='admitted'");
      assert.equal(ev[0].n,1);
      const winner=outcomes[0].status==="committed"?one:two;
      const again=await facade.admit(p,winner);
      assert.equal(again.status,"committed");
      const read=await facade.reconcile(p,winner);
      assert.equal(read.status,"committed");
      assert.equal((read.status==="committed"?read.receipt.jobId:""),
        again.status==="committed"?again.receipt.jobId:"invalid");
    });
    await t.test("bad principal and mismatched grant never mutate rows",async()=>{
      const grantId=await createGrant();
      const intent={grantId,idempotencyKey:"bad-principal",requestSha256:"d".repeat(64)};
      assert.equal((await facade.admit({...p,siteId:randomUUID()},intent)).status,"denied");
      assert.equal((await facade.admit({...p,membershipVerified:false} as any,intent)).status,"denied");
      const states=await db.unsafe<{state:string}[]>(
        "SELECT state FROM pilot01.grants WHERE grant_id=$1",[grantId]);
      assert.equal(states[0].state,"issued");
    });
    await t.test("injected event failure rolls back consumed grant, job and admission",async()=>{
      const grantId=await createGrant();
      const input={grantId,idempotencyKey:"rollback",requestSha256:"e".repeat(64)};
      // Synthetic failure in candidate event insertion via local scoped trigger.
      await db.unsafe(
        "CREATE FUNCTION pilot01.synthetic_fail_event() RETURNS trigger LANGUAGE plpgsql AS "+
        "$$ BEGIN IF NEW.event_kind='admitted' THEN RAISE EXCEPTION 'synthetic event failure'; END IF; "+
        "RETURN NEW; END $$");
      await db.unsafe(
        "CREATE TRIGGER a12_5_synthetic_failure BEFORE INSERT ON pilot01.job_events "+
        "FOR EACH ROW EXECUTE FUNCTION pilot01.synthetic_fail_event()");
      try{
        assert.equal((await facade.admit(p,input)).status,"commit_unknown");
      }finally{
        await db.unsafe("DROP TRIGGER a12_5_synthetic_failure ON pilot01.job_events");
        await db.unsafe("DROP FUNCTION pilot01.synthetic_fail_event()");
      }
      assert.equal((await facade.reconcile(p,input)).status,"unavailable");
      const state=await db.unsafe<{state:string}[]>(
        "SELECT state FROM pilot01.grants WHERE grant_id=$1",[grantId]);
      assert.equal(state[0].state,"issued");
      const count=await db.unsafe<{n:number}[]>(
        "SELECT count(*)::int AS n FROM pilot01.jobs WHERE grant_id=$1",[grantId]);
      assert.equal(count[0].n,0);
      // Explicitly user/test-driven retry ONLY after read-only reconciliation.
      assert.equal((await facade.admit(p,input)).status,"committed");
    });
    await t.test("generation-fenced completion blocks stale owner and expired leases",async()=>{
      const grantId=await createGrant();
      const input={grantId,idempotencyKey:"fence",requestSha256:"f".repeat(64)};
      const admitted=await facade.admit(p,input);
      assert.equal(admitted.status,"committed");
      if(admitted.status!=="committed")return;
      const jobId=admitted.receipt.jobId;
      const claimed=await db.unsafe<{generation:string;lease_expires_at:Date}[]>(
        "UPDATE pilot01.jobs SET state='claimed',worker_owner='worker-B',generation=1,"+
        "lease_expires_at=clock_timestamp()+interval '1 minute',claimed_at=clock_timestamp() "+
        "WHERE job_id=$1 AND organization_id=$2 AND site_id=$3 AND state='pending' "+
        "RETURNING generation,lease_expires_at",[jobId,org,site]);
      assert.equal(claimed.length,1);
      const mutation=(workerOwner:string,generation:number)=>({
        token:{jobId,organizationId:org,siteId:site,workerOwner,generation,
          leaseExpiresAt:new Date(claimed[0].lease_expires_at).toISOString()},
        intentSha256:"f".repeat(64),kind:"complete" as const,
      });
      assert.equal((await facade.fenced(mutation("worker-A",1))).status,"fenced");
      assert.equal((await facade.fenced(mutation("worker-B",2))).status,"fenced");
      assert.equal((await facade.fenced(mutation("worker-B",1))).status,"applied");
      assert.equal((await facade.fenced(mutation("worker-B",1))).status,"fenced");
      const audits=await db.unsafe<{n:number}[]>(
        "SELECT count(*)::int AS n FROM pilot01.job_events WHERE job_id=$1 AND event_kind='completed'",
        [jobId]);assert.equal(audits[0].n,1);
      const old=await createGrant();
      const next=await facade.admit(p,{grantId:old,idempotencyKey:"expired",requestSha256:"1".repeat(64)});
      assert.equal(next.status,"committed");
      if(next.status!=="committed")return;
      await db.unsafe(
        "UPDATE pilot01.jobs SET state='claimed',worker_owner='old',generation=1,"+
        "lease_expires_at=clock_timestamp()-interval '1 second' WHERE job_id=$1",
        [next.receipt.jobId]);
      assert.equal((await facade.fenced({token:{...mutation("old",1).token,jobId:next.receipt.jobId},
        intentSha256:"1".repeat(64),kind:"complete"})).status,"fenced");
    });
  }finally{
    if(owns){
      try{
        await db.unsafe("DROP SCHEMA IF EXISTS pilot01 CASCADE");
        await db.unsafe("DROP INDEX IF EXISTS public.pilot01_sites_organization_id_id_unique");
        await db.unsafe("DROP TABLE IF EXISTS public.auth_sessions");
        await db.unsafe("DROP TABLE IF EXISTS public.sites");
        await db.unsafe("DROP TABLE IF EXISTS public.organizations");
        const c=await db.unsafe<{n:number}[]>(
          "SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public'");
        assert.equal(c[0].n,0);
      }finally{await db.end({timeout:3});}
    }else await db.end({timeout:3});
  }
});
