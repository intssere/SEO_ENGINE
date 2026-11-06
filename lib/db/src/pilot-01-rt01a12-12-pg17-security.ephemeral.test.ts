/**
 * RT01-A12.12 DISPOSABLE-ONLY PostgreSQL 17 security test harness.
 * No exports from @workspace/db, API integration, workers, credentials or providers.
 * The sole permitted target is an empty CI-created loopback PG17 database.
 */
import assert from "node:assert/strict";
import {createHash,randomUUID} from "node:crypto";
import {readFile,readdir} from "node:fs/promises";
import test from "node:test";
import postgres from "postgres";

const armed=process.env.PILOT01_A12_12_DISPOSABLE_PG==="I_ACKNOWLEDGE_NEW_EMPTY_PG17_ONLY" &&
  Boolean(process.env.PILOT01_A12_12_DISPOSABLE_DATABASE_URL);
const ROLE_A="pilot01_a12_12_tenant_a",ROLE_B="pilot01_a12_12_tenant_b";
const SHA=(s:string)=>createHash("sha256").update(s).digest("hex");
type Client=ReturnType<typeof postgres>;
function guardedUrl():string{
  if(!armed)throw Error("A12_12_NOT_ARMED");
  const u=new URL(process.env.PILOT01_A12_12_DISPOSABLE_DATABASE_URL!);
  if(!["postgres:","postgresql:"].includes(u.protocol)||
    !["127.0.0.1","localhost","[::1]","::1"].includes(u.hostname)||
    u.port!=="5432"||u.username!=="postgres"||
    !/^pilot01_disposable_rt01a12_12_ci$/.test(u.pathname.slice(1))||
    Boolean(u.search)||Boolean(u.hash)||
    /railway|neon|staging|production|restore|supabase|diamondshelf/i.test(u.href))
    throw Error("A12_12_REFUSE_NONDISPOSABLE_TARGET");
  return u.toString();
}
test("A12.12 refuses DB access unless explicitly disposable-armed",()=>{
  if(!armed)assert.throws(guardedUrl,/A12_12_NOT_ARMED/);
});
async function attestEmpty(db:Client){
  const r=await db.unsafe<{name:string;version:number;who:string;tables:number;
    roles:number;other_schemas:number}[]>(
    "SELECT current_database() AS name, current_setting('server_version_num')::int/10000 AS version,"+
    "current_user AS who,(SELECT count(*)::int FROM pg_tables WHERE schemaname='public') AS tables,"+
    "(SELECT count(*)::int FROM pg_roles WHERE rolname LIKE 'pilot01_a12_12_%') AS roles,"+
    "(SELECT count(*)::int FROM pg_namespace WHERE nspname NOT IN "+
    "('public','pg_catalog','information_schema','pg_toast') "+
    "AND nspname NOT LIKE 'pg_temp_%' AND nspname NOT LIKE 'pg_toast_temp_%') AS other_schemas");
  assert.equal(r[0].name,"pilot01_disposable_rt01a12_12_ci");
  assert.equal(r[0].version,17);assert.equal(r[0].who,"postgres");
  assert.equal(r[0].tables,0);assert.equal(r[0].roles,0);
  assert.equal(r[0].other_schemas,0);
}
async function asRole<T>(db:Client,role:string,run:(tx:any)=>Promise<T>):Promise<T>{
  return db.begin(async tx=>{
    await tx.unsafe('SET LOCAL ROLE "'+role+'"');
    return run(tx);
  }) as Promise<T>;
}
type Scope={org:string;site:string;session:string;subject:string;issuer:string;grant:string;
  membershipRevision:number;issuerRevision:number;key:string;hash:string};
async function admit(db:Client,p:Scope,hook?:()=>Promise<void>):Promise<"committed"|"denied"|"conflict"|"already_committed">{
  return asRole(db,ROLE_A,async tx=>{
    // Test-only transaction advisory lock: every synthetic revocation writer
    // must use the same tenant lock before mutation; no custody UPDATE grant
    // to the NOBYPASSRLS application role. Not production authentication.
    await tx.unsafe("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",["a12_12_custody:"+p.org]);
    const session=await tx.unsafe("SELECT id FROM public.auth_sessions WHERE id=$1 "+
      "AND subject=$2 AND revoked_at IS NULL AND expires_at>clock_timestamp()",
      [p.session,p.subject]);
    if(!session.length)return "denied";
    const site=await tx.unsafe("SELECT id FROM public.sites WHERE id=$1 "+
      "AND organization_id=$2 AND is_active=true",[p.site,p.org]);
    if(!site.length)return "denied";
    const membership=await tx.unsafe(
      "SELECT revision FROM pilot01.a12_12_memberships WHERE organization_id=$1 "+
      "AND subject=$2 AND active=true AND revoked_at IS NULL AND expires_at>clock_timestamp() "+
      "AND role IN ('operator','admin') AND revision=$3",
      [p.org,p.subject,p.membershipRevision]);
    if(!membership.length)return "denied";
    if(hook)await hook();
    const issuer=await tx.unsafe(
      "SELECT revision FROM pilot01.a12_12_issuers WHERE issuer_id=$1 AND organization_id=$2 "+
      "AND site_id=$3 AND actor_subject=$4 AND operation='analyze' AND active=true "+
      "AND revoked_at IS NULL AND expires_at>clock_timestamp() AND revision=$5",
      [p.issuer,p.org,p.site,p.subject,p.issuerRevision]);
    if(!issuer.length)return "denied";
    const existing=await tx.unsafe(
      "SELECT grant_id,request_sha256 FROM pilot01.admissions WHERE organization_id=$1 "+
      "AND idempotency_key=$2",[p.org,p.key]);
    if(existing.length)
      return existing[0].grant_id===p.grant&&
        existing[0].request_sha256.trim()===p.hash?"already_committed":"conflict";
    const updated=await tx.unsafe(
      "UPDATE pilot01.grants SET state='consumed',consumed_at=clock_timestamp() "+
      "WHERE grant_id=$1 AND organization_id=$2 AND site_id=$3 AND actor_subject=$4 "+
      "AND session_id=$5 AND issuer_id=$6 AND operation='analyze' AND state='issued' "+
      "AND expires_at>clock_timestamp() RETURNING grant_id",
      [p.grant,p.org,p.site,p.subject,p.session,p.issuer]);
    if(updated.length!==1)return "denied";
    const job=await tx.unsafe(
      "INSERT INTO pilot01.jobs(grant_id,organization_id,site_id,actor_subject,issuer_id,operation) "+
      "VALUES($1,$2,$3,$4,$5,'analyze') RETURNING job_id",
      [p.grant,p.org,p.site,p.subject,p.issuer]);
    const adm=await tx.unsafe(
      "INSERT INTO pilot01.admissions(job_id,grant_id,organization_id,site_id,actor_subject,"+
      "issuer_id,operation,idempotency_key,request_sha256,transaction_id) "+
      "VALUES($1,$2,$3,$4,$5,$6,'analyze',$7,$8,txid_current()::text) RETURNING admission_id",
      [job[0].job_id,p.grant,p.org,p.site,p.subject,p.issuer,p.key,p.hash]);
    await tx.unsafe(
      "INSERT INTO pilot01.job_events(admission_id,job_id,grant_id,organization_id,site_id,"+
      "event_kind,generation,event_sha256) VALUES($1,$2,$3,$4,$5,'admitted',0,$6)",
      [adm[0].admission_id,job[0].job_id,p.grant,p.org,p.site,
        SHA("admitted:"+adm[0].admission_id)]);
    return "committed";
  });
}
test("A12.12 canonical PG17 replay, least-privilege tenant RLS and revocation races",
  {skip:!armed,timeout:180000},async t=>{
  const url=guardedUrl();
  const db=postgres(url,{max:6,prepare:false,connect_timeout:4,idle_timeout:3});
  let verified=false;
  try{
    await attestEmpty(db);verified=true;
    const names=(await readdir(new URL("../migrations/",import.meta.url)))
      .filter(f=>/^00(?:0[1-9]|1[01])_.*\.sql$/.test(f)).sort();
    assert.equal(names.length,11,"refuse incomplete canonical migration lineage");
    assert.deepEqual(names.map(x=>Number(x.slice(0,4))),[1,2,3,4,5,6,7,8,9,10,11]);
    // Each canonical migration embeds BEGIN/COMMIT: use a single connection.
    const single=postgres(url,{max:1,prepare:false,connect_timeout:4});
    try{
      for(const name of names){
        const body=await readFile(new URL("../migrations/"+name,import.meta.url),"utf8");
        assert.match(body,/^BEGIN;/);
        assert.match(body,/COMMIT;\s*$/);
        await single.unsafe(body);
      }
      const candidate=await readFile(
        new URL("../../../docs/sql-candidates/rt01-a12-1-pilot01-additive.sql",import.meta.url),"utf8");
      await single.unsafe(candidate);
    }finally{await single.end({timeout:4});}
    await t.test("canonical migration replay and candidate RLS are present",async()=>{
      const tables=await db.unsafe<{tablename:string}[]>(
        "SELECT tablename FROM pg_tables WHERE schemaname='pilot01' ORDER BY tablename");
      assert.deepEqual(tables.map(x=>x.tablename),
        ["admissions","grants","job_events","jobs","outbox"]);
      const rls=await db.unsafe<{relrowsecurity:boolean;relforcerowsecurity:boolean}[]>(
        "SELECT c.relrowsecurity,c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n "+
        "ON n.oid=c.relnamespace WHERE n.nspname='pilot01' AND c.relkind='r'");
      assert.equal(rls.length,5);assert.ok(rls.every(x=>x.relrowsecurity&&x.relforcerowsecurity));
    });
    // Test-only additive custody and role RLS fixtures, never operational migrations.
    await db.unsafe(
      "CREATE TABLE pilot01.a12_12_role_scope(db_role name PRIMARY KEY,organization_id uuid NOT NULL);"+
      "CREATE TABLE pilot01.a12_12_memberships("+
      "organization_id uuid NOT NULL REFERENCES public.organizations(id),subject text NOT NULL,"+
      "role text NOT NULL CHECK(role IN ('viewer','operator','admin')),active boolean NOT NULL,"+
      "revision int NOT NULL CHECK(revision>0),revoked_at timestamptz,"+
      "expires_at timestamptz NOT NULL,PRIMARY KEY(organization_id,subject));"+
      "CREATE TABLE pilot01.a12_12_issuers("+
      "issuer_id text PRIMARY KEY,organization_id uuid NOT NULL,site_id uuid NOT NULL,"+
      "actor_subject text NOT NULL,operation text NOT NULL CHECK(operation IN ('analyze','recommend')),"+
      "active boolean NOT NULL,revision int NOT NULL CHECK(revision>0),"+
      "revoked_at timestamptz,expires_at timestamptz NOT NULL);"+
      "CREATE TABLE pilot01.a12_12_probe(organization_id uuid NOT NULL,marker text NOT NULL);");
    for(const role of [ROLE_A,ROLE_B]){
      await db.unsafe('CREATE ROLE "'+role+'" NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT');
      await db.unsafe('GRANT USAGE ON SCHEMA pilot01 TO "'+role+'"');
      await db.unsafe('GRANT SELECT ON pilot01.a12_12_role_scope TO "'+role+'"');
      await db.unsafe('GRANT SELECT ON public.sites,public.auth_sessions TO "'+role+'"');
    }
    const orgA=randomUUID(),orgB=randomUUID(),siteA=randomUUID(),siteB=randomUUID();
    const session=randomUUID(),subject="synthetic-A",issuer="synthetic-issuer-A";
    await db.unsafe("INSERT INTO public.organizations(id,name,slug) VALUES($1,'tenant A','a12-12-a'),($2,'tenant B','a12-12-b')",[orgA,orgB]);
    await db.unsafe("INSERT INTO public.sites(id,organization_id,name,domain,canonical_origin) "+
      "VALUES($1,$2,'test A','a12-12.example','https://a12-12.example'),"+
      "($3,$4,'test B','a12-12-b.example','https://a12-12-b.example')",[siteA,orgA,siteB,orgB]);
    await db.unsafe(
      "INSERT INTO public.auth_sessions(id,token_hash,subject,email,role,csrf_token_hash,expires_at) "+
      "VALUES($1,'synthetic-token-hash','synthetic-A','test@example.invalid','operator',"+
      "'synthetic-csrf',clock_timestamp()+interval '1 hour')",[session]);
    await db.unsafe("INSERT INTO pilot01.a12_12_role_scope VALUES($1,$2),($3,$4)",
      [ROLE_A,orgA,ROLE_B,orgB]);
    await db.unsafe("INSERT INTO pilot01.a12_12_memberships "+
      "(organization_id,subject,role,active,revision,expires_at) "+
      "VALUES($1,$2,'operator',true,1,clock_timestamp()+interval '1 hour')",[orgA,subject]);
    await db.unsafe("INSERT INTO pilot01.a12_12_issuers "+
      "(issuer_id,organization_id,site_id,actor_subject,operation,active,revision,expires_at) "+
      "VALUES($1,$2,$3,$4,'analyze',true,1,clock_timestamp()+interval '1 hour')",
      [issuer,orgA,siteA,subject]);
    // RLS scope is based on current database role, not an untrusted custom GUC.
    // These synthetic NOLOGIN roles do not establish authentic web identity.
    const relationList=["a12_12_memberships","a12_12_issuers","a12_12_probe",
      "grants","jobs","admissions","job_events","outbox"];
    for(const table of relationList){
      await db.unsafe("ALTER TABLE pilot01."+table+" ENABLE ROW LEVEL SECURITY");
      await db.unsafe("ALTER TABLE pilot01."+table+" FORCE ROW LEVEL SECURITY");
      await db.unsafe("CREATE POLICY a12_12_tenant_scope ON pilot01."+table+
        " FOR ALL TO \""+ROLE_A+"\",\""+ROLE_B+"\""+
        " USING (organization_id=(SELECT organization_id FROM pilot01.a12_12_role_scope "+
        "WHERE db_role=current_user)) WITH CHECK (organization_id="+
        "(SELECT organization_id FROM pilot01.a12_12_role_scope WHERE db_role=current_user))");
      for(const role of [ROLE_A,ROLE_B])
        await db.unsafe('GRANT SELECT ON pilot01.'+table+' TO "'+role+'"');
    }
    for(const role of [ROLE_A,ROLE_B])
      await db.unsafe('GRANT INSERT ON pilot01.a12_12_probe TO "'+role+'"');
    for(const table of ["grants","jobs","admissions","job_events"])
      await db.unsafe('GRANT '+(table==="grants"?"UPDATE":"INSERT")+
        " ON pilot01."+table+' TO "'+ROLE_A+'"');
    await t.test("application principals are non-superusers and NOBYPASSRLS",async()=>{
      const rows=await db.unsafe<{rolname:string;rolsuper:boolean;rolbypassrls:boolean;rolcanlogin:boolean}[]>(
        "SELECT rolname,rolsuper,rolbypassrls,rolcanlogin FROM pg_roles WHERE rolname IN ($1,$2)",
        [ROLE_A,ROLE_B]);
      assert.equal(rows.length,2);assert.ok(rows.every(r=>!r.rolsuper&&!r.rolbypassrls&&!r.rolcanlogin));
    });
    await t.test("cross-tenant SELECT and INSERT denied by PostgreSQL RLS",async()=>{
      const reads=await asRole(db,ROLE_B,tx=>tx.unsafe(
        "SELECT * FROM pilot01.a12_12_memberships WHERE organization_id=$1",[orgA]));
      assert.equal(reads.length,0);
      await assert.rejects(asRole(db,ROLE_B,tx=>tx.unsafe(
        "INSERT INTO pilot01.a12_12_probe(organization_id,marker) VALUES($1,'bad')",[orgA])),
        (e:any)=>e.code==="42501");
      await asRole(db,ROLE_A,tx=>tx.unsafe(
        "INSERT INTO pilot01.a12_12_probe(organization_id,marker) VALUES($1,'allowed')",[orgA]));
      const visible=await asRole(db,ROLE_B,tx=>tx.unsafe(
        "SELECT marker FROM pilot01.a12_12_probe"));
      assert.equal(visible.length,0);
    });
    await t.test("sequential pooled tenant context cannot escape per-role RLS",async()=>{
      await asRole(db,ROLE_A,async tx=>{
        const r=await tx.unsafe("SELECT count(*)::int AS n FROM pilot01.a12_12_memberships");
        assert.equal(r[0].n,1);
        await tx.unsafe("SELECT set_config('pilot01.tenant_id',$1,true)",[orgB]);
        const still=await tx.unsafe("SELECT count(*)::int AS n FROM pilot01.a12_12_memberships");
        assert.equal(still[0].n,1,"user GUC must not change role-derived policy");
      });
      const other=await asRole(db,ROLE_B,tx=>tx.unsafe(
        "SELECT count(*)::int AS n FROM pilot01.a12_12_memberships"));
      assert.equal(other[0].n,0);
    });
    const newScope=async (key:string):Promise<Scope>=>{
      const grant=randomUUID();
      await db.unsafe("INSERT INTO pilot01.grants(grant_id,organization_id,site_id,actor_subject,"+
        "session_id,issuer_id,issuer_provenance_sha256,operation,expires_at) "+
        "VALUES($1,$2,$3,$4,$5,$6,$7,'analyze',clock_timestamp()+interval '1 hour')",
        [grant,orgA,siteA,subject,session,issuer,SHA("synthetic-only")]);
      return {org:orgA,site:siteA,session,subject,issuer,grant,
        membershipRevision:1,issuerRevision:1,key,hash:SHA(key)};
    };
    await t.test("valid admission is one atomic grant/job/receipt/event",async()=>{
      const p=await newScope("first");
      assert.equal(await admit(db,p),"committed");
      assert.equal(await admit(db,p),"already_committed");
      const rows=await db.unsafe<{jobs:number;admissions:number;events:number}[]>(
        "SELECT (SELECT count(*)::int FROM pilot01.jobs) AS jobs,"+
        "(SELECT count(*)::int FROM pilot01.admissions) AS admissions,"+
        "(SELECT count(*)::int FROM pilot01.job_events) AS events");
      assert.deepEqual(rows[0],{jobs:1,admissions:1,events:1});
    });
    await t.test("mismatched tenant, issuer revision and idempotency conflict deny",async()=>{
      const p=await newScope("scoped");
      assert.equal(await admit(db,{...p,org:orgB}),"denied");
      assert.equal(await admit(db,{...p,issuerRevision:2}),"denied");
      assert.equal(await admit(db,p),"committed");
      assert.equal(await admit(db,{...p,hash:SHA("different")}),"conflict");
    });
    await t.test("revocation-first membership and issuer deny future admissions",async()=>{
      const p=await newScope("revoke-first");
      await db.unsafe("UPDATE pilot01.a12_12_memberships SET revision=revision+1,"+
        "active=false,revoked_at=clock_timestamp() WHERE organization_id=$1",[orgA]);
      assert.equal(await admit(db,p),"denied");
      await db.unsafe("UPDATE pilot01.a12_12_memberships SET revision=revision+1,"+
        "active=true,revoked_at=NULL WHERE organization_id=$1",[orgA]);
      const updated={...p,membershipRevision:3};
      await db.unsafe("UPDATE pilot01.a12_12_issuers SET revision=revision+1,"+
        "active=false,revoked_at=clock_timestamp() WHERE issuer_id=$1",[issuer]);
      assert.equal(await admit(db,updated),"denied");
      await db.unsafe("UPDATE pilot01.a12_12_issuers SET revision=revision+1,"+
        "active=true,revoked_at=NULL WHERE issuer_id=$1",[issuer]);
    });
    await t.test("admission-first holds membership lock until commit then revocation",async()=>{
      const p={...await newScope("admit-first"),membershipRevision:3,issuerRevision:3};
      let arrived!:()=>void, release!:()=>void;
      const held=new Promise<void>(resolve=>{arrived=resolve;});
      const proceed=new Promise<void>(resolve=>{release=resolve;});
      const a=admit(db,p,async()=>{arrived();await proceed;});
      await held;
      const revoker=db.begin(async tx=>{
        await tx.unsafe("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
          ["a12_12_custody:"+orgA]);
        return tx.unsafe("UPDATE pilot01.a12_12_memberships "+
          "SET revision=revision+1,active=false,revoked_at=clock_timestamp() "+
          "WHERE organization_id=$1",[orgA]);
      });
      release();
      assert.equal(await a,"committed");
      await revoker;
      assert.equal(await admit(db,{...await newScope("after-revoke"),membershipRevision:4,issuerRevision:3}),"denied");
    });
    await t.test("read-only COMMIT reconciliation and no external outbox delivery",async()=>{
      const p={...await newScope("unknown-ack"),membershipRevision:4,issuerRevision:3};
      // Recover authority through separately synthetic fixture for this test.
      await db.unsafe("UPDATE pilot01.a12_12_memberships SET revision=5,active=true,"+
        "revoked_at=NULL WHERE organization_id=$1",[orgA]);
      assert.equal(await admit(db,{...p,membershipRevision:5}),"committed");
      // Simulated missing acknowledgement: lookup receipt only; no second admission write.
      const receipt=await asRole(db,ROLE_A,tx=>tx.unsafe(
        "SELECT grant_id,request_sha256 FROM pilot01.admissions "+
        "WHERE organization_id=$1 AND idempotency_key=$2",[orgA,p.key]));
      assert.equal(receipt.length,1);assert.equal(receipt[0].grant_id,p.grant);
      const count=await db.unsafe<{n:number}[]>(
        "SELECT count(*)::int AS n FROM pilot01.admissions WHERE organization_id=$1 AND idempotency_key=$2",
        [orgA,p.key]);assert.equal(count[0].n,1);
      const outbox=await db.unsafe<{n:number}[]>(
        "SELECT count(*)::int AS n FROM pilot01.outbox WHERE state IN ('eligible','delivered')");
      assert.equal(outbox[0].n,0);
    });
    await t.test("failure in event append rolls back grant consumption",async()=>{
      const p={...await newScope("rollback"),membershipRevision:5,issuerRevision:3};
      await db.unsafe("CREATE FUNCTION pilot01.a12_12_fail_event() RETURNS trigger LANGUAGE plpgsql AS "+
        "$$ BEGIN RAISE EXCEPTION 'synthetic rollback'; END $$");
      await db.unsafe("CREATE TRIGGER a12_12_rollback BEFORE INSERT ON pilot01.job_events "+
        "FOR EACH ROW EXECUTE FUNCTION pilot01.a12_12_fail_event()");
      try{await assert.rejects(admit(db,p),/synthetic rollback/);}
      finally{
        await db.unsafe("DROP TRIGGER a12_12_rollback ON pilot01.job_events");
        await db.unsafe("DROP FUNCTION pilot01.a12_12_fail_event()");
      }
      const g=await db.unsafe<{state:string}[]>("SELECT state FROM pilot01.grants WHERE grant_id=$1",[p.grant]);
      assert.equal(g[0].state,"issued");
      const admissions=await db.unsafe<{n:number}[]>(
        "SELECT count(*)::int AS n FROM pilot01.admissions WHERE idempotency_key=$1",[p.key]);
      assert.equal(admissions[0].n,0);
    });
  }finally{
    if(verified){
      try{
        // Clean up ONLY the previously attested new disposable DB.
        await db.unsafe("DROP SCHEMA IF EXISTS pilot01 CASCADE");
        await db.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
        await db.unsafe("CREATE SCHEMA public");
        for(const role of [ROLE_A,ROLE_B]){
          await db.unsafe('DROP OWNED BY "'+role+'"');
          await db.unsafe('DROP ROLE IF EXISTS "'+role+'"');
        }
      }finally{await db.end({timeout:4});}
    }else await db.end({timeout:4});
  }
});
