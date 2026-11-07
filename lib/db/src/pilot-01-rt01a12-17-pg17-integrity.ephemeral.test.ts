/**
 * RT01-A12.17 - database behavior tests for pre-existing A12.16 enforcement SQL.
 * ONLY a brand-new empty local PostgreSQL 17 service on GitHub Actions.
 * No operational integration; reuse A12.15 migration replay and attestation pattern.
 */
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {readFile,readdir} from "node:fs/promises";
import test from "node:test";
import postgres from "postgres";

const armed=process.env.PILOT01_A12_17_DISPOSABLE_PG==="I_ACKNOWLEDGE_NEW_EMPTY_PG17_ONLY"&&
  Boolean(process.env.PILOT01_A12_17_DISPOSABLE_DATABASE_URL);
type Client=ReturnType<typeof postgres>;
const ROLES=["pilot01_a12_17_reader_a","pilot01_a12_17_reader_b"];
function guardedUrl():string{
  if(!armed)throw Error("A12_17_NOT_ARMED");
  const u=new URL(process.env.PILOT01_A12_17_DISPOSABLE_DATABASE_URL!);
  if(!["postgres:","postgresql:"].includes(u.protocol)||
     !["localhost","127.0.0.1","[::1]","::1"].includes(u.hostname)||
     u.port!=="5432"||u.username!=="postgres"||
     u.pathname!=="/pilot01_disposable_rt01a12_17_ci"||
     Boolean(u.search)||Boolean(u.hash)||
     /railway|neon|staging|production|restore|supabase|diamondshelf/i.test(u.href))
    throw Error("A12_17_REFUSE_NONDISPOSABLE_TARGET");
  return u.toString();
}
async function attestEmpty(db:Client){
  const r=await db.unsafe<{name:string;version:number;who:string;tables:number;
    roles:number;other_schemas:number;extensions:number}[]>(
    "SELECT current_database() AS name,current_setting('server_version_num')::int/10000 AS version,"+
    "current_user AS who,(SELECT count(*)::int FROM pg_tables WHERE schemaname='public') AS tables,"+
    "(SELECT count(*)::int FROM pg_roles WHERE rolname LIKE 'pilot01_a12_17_%') AS roles,"+
    "(SELECT count(*)::int FROM pg_namespace WHERE nspname NOT IN "+
    "('public','pg_catalog','information_schema','pg_toast') AND nspname NOT LIKE 'pg_temp_%' "+
    "AND nspname NOT LIKE 'pg_toast_temp_%') AS other_schemas,"+
    "(SELECT count(*)::int FROM pg_extension WHERE extname NOT IN ('plpgsql')) AS extensions");
  assert.equal(r[0].name,"pilot01_disposable_rt01a12_17_ci");
  assert.equal(r[0].version,17);assert.equal(r[0].who,"postgres");
  assert.equal(r[0].tables,0);assert.equal(r[0].roles,0);
  assert.equal(r[0].other_schemas,0);assert.equal(r[0].extensions,0);
}
async function asRole<T>(db:Client,role:string,fn:(tx:any)=>Promise<T>):Promise<T>{
  return db.begin(async tx=>{
    await tx.unsafe('SET LOCAL ROLE "'+role+'"');
    return fn(tx);
  }) as Promise<T>;
}
const denyCode=(code:string)=>(error:any)=>error.code===code;
test("A12.17 cannot access any database without exact CI sentinel",()=>{
  if(!armed)assert.throws(guardedUrl,/A12_17_NOT_ARMED/);
});
test("A12.17 guarded PG17 A12.16 integrity candidate behavior",
  {skip:!armed,timeout:180000},async t=>{
  const db=postgres(guardedUrl(),{max:6,prepare:false,connect_timeout:4,idle_timeout:3});
  let attested=false;
  try{
    await attestEmpty(db);
    attested=true;
    const names=(await readdir(new URL("../migrations/",import.meta.url)))
      .filter(f=>/^00(?:0[1-9]|1[01])_.*\.sql$/.test(f)).sort();
    assert.deepEqual(names.map(x=>Number(x.slice(0,4))),
      [1,2,3,4,5,6,7,8,9,10,11],"canonical lineage guard");
    const candidates=[
      "rt01-a12-1-pilot01-additive.sql",
      "rt01-a12-14-canonical-membership-issuer-revocation-additive.sql",
      "rt01-a12-16-custody-integrity-enforcement-additive.sql"
    ];
    const sources=await Promise.all(candidates.map(f=>readFile(
      new URL("../../../docs/sql-candidates/"+f,import.meta.url),"utf8")));
    assert.match(sources[2],/UNEXECUTED ADDITIVE ENFORCEMENT CANDIDATE/);
    // As in A12.15, run each canonical SQL transaction on one connection.
    const single=postgres(guardedUrl(),{max:1,prepare:false,connect_timeout:4});
    try{
      for(const name of names){
        const sql=await readFile(new URL("../migrations/"+name,import.meta.url),"utf8");
        assert.match(sql,/^BEGIN;/);assert.match(sql,/COMMIT;\s*$/);
        await single.unsafe(sql);
      }
      for(const sql of sources)await single.unsafe(sql);
    }finally{await single.end({timeout:4});}
    await t.test("actual A12.16 triggers exist and all three custody tables keep FORCE RLS",async()=>{
      const names=["tenant_memberships","issuer_custody","custody_revocation_events"];
      const rows=await db.unsafe<{relname:string;relrowsecurity:boolean;relforcerowsecurity:boolean}[]>(
        "SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity FROM pg_class c "+
        "JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='pilot01' "+
        "AND c.relname IN ('tenant_memberships','issuer_custody','custody_revocation_events')");
      assert.deepEqual(rows.map(r=>r.relname).sort(),names.slice().sort());
      assert.ok(rows.every(r=>r.relrowsecurity&&r.relforcerowsecurity));
      const actual=await db.unsafe<{tgname:string}[]>(
        "SELECT t.tgname FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid "+
        "JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='pilot01' "+
        "AND NOT t.tgisinternal");
      for(const suffix of ["membership_no_delete","issuer_no_delete",
        "membership_revocation_guard","issuer_revocation_guard",
        "membership_revocation_append","issuer_revocation_append",
        "custody_revocation_events_immutable"])
        assert.ok(actual.some(x=>x.tgname==="pilot01_"+suffix),suffix);
      const policies=await db.unsafe<{n:number}[]>(
        "SELECT count(*)::int AS n FROM pg_policies WHERE schemaname='pilot01'");
      assert.equal(policies[0].n,0);
    });
    const orgA=randomUUID(),orgB=randomUUID(),siteA=randomUUID(),siteB=randomUUID();
    const subject="synthetic-actor",issuer="synthetic-issuer";
    await db.unsafe("INSERT INTO public.organizations(id,name,slug) "+
      "VALUES($1,'A','a12-17-a'),($2,'B','a12-17-b')",[orgA,orgB]);
    await db.unsafe("INSERT INTO public.sites(id,organization_id,name,domain,canonical_origin) "+
      "VALUES($1,$2,'A','a12-17-a.invalid','https://a12-17-a.invalid'),"+
      "($3,$4,'B','a12-17-b.invalid','https://a12-17-b.invalid')",
      [siteA,orgA,siteB,orgB]);
    await db.unsafe("INSERT INTO pilot01.tenant_memberships "+
      "(organization_id,subject,role,active,revision,expires_at) "+
      "VALUES($1,$2,'operator',true,1,clock_timestamp()+interval '1 hour')",
      [orgA,subject]);
    await db.unsafe("INSERT INTO pilot01.issuer_custody "+
      "(issuer_id,organization_id,site_id,actor_subject,operation,provenance_sha256,"+
      "active,revision,expires_at) "+
      "VALUES($1,$2,$3,$4,'analyze',repeat('a',64),true,1,"+
      "clock_timestamp()+interval '1 hour')",[issuer,orgA,siteA,subject]);
    for(const role of ROLES){
      await db.unsafe('CREATE ROLE "'+role+'" NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT');
      await db.unsafe('GRANT USAGE ON SCHEMA pilot01 TO "'+role+'"');
      await db.unsafe("GRANT SELECT ON pilot01.tenant_memberships,pilot01.issuer_custody,"+
        'pilot01.custody_revocation_events TO "'+role+'"');
    }
    await t.test("non-superusers see no records and cannot write under default deny",async()=>{
      for(const role of ROLES){
        const info=await db.unsafe<{rolsuper:boolean;rolbypassrls:boolean;rolcanlogin:boolean}[]>(
          "SELECT rolsuper,rolbypassrls,rolcanlogin FROM pg_roles WHERE rolname=$1",[role]);
        assert.equal(info.length,1);assert.ok(!info[0].rolsuper&&!info[0].rolbypassrls&&!info[0].rolcanlogin);
        for(const table of ["tenant_memberships","issuer_custody","custody_revocation_events"]){
          const rows=await asRole<{n:number}[]>(db,role,tx=>tx.unsafe(
            "SELECT count(*)::int AS n FROM pilot01."+table));
          assert.equal(rows[0].n,0);
        }
      }
      await assert.rejects(asRole(db,ROLES[0],tx=>tx.unsafe(
        "UPDATE pilot01.tenant_memberships SET active=false WHERE organization_id=$1",
        [orgA])),denyCode("42501"));
    });
    await t.test("test-only SELECT policy preserves tenant separation despite spoofed GUC",async()=>{
      await db.unsafe("CREATE TABLE pilot01.a12_17_role_scope "+
        "(db_role name PRIMARY KEY,organization_id uuid NOT NULL)");
      await db.unsafe("INSERT INTO pilot01.a12_17_role_scope VALUES($1,$2),($3,$4)",
        [ROLES[0],orgA,ROLES[1],orgB]);
      for(const role of ROLES)
        await db.unsafe('GRANT SELECT ON pilot01.a12_17_role_scope TO "'+role+'"');
      for(const table of ["tenant_memberships","issuer_custody","custody_revocation_events"]){
        await db.unsafe('CREATE POLICY a12_17_role_read ON pilot01.'+table+
          ' FOR SELECT TO "'+ROLES[0]+'","'+ROLES[1]+'" USING ('+
          "organization_id=(SELECT organization_id FROM pilot01.a12_17_role_scope "+
          "WHERE db_role=current_user))");
      }
      const a=await asRole<{n:number}[]>(db,ROLES[0],async tx=>{
        const before=await tx.unsafe("SELECT count(*)::int AS n FROM pilot01.issuer_custody");
        await tx.unsafe("SELECT set_config('pilot01.tenant_id',$1,true)",[orgB]);
        const after=await tx.unsafe("SELECT count(*)::int AS n FROM pilot01.issuer_custody");
        assert.equal(after[0].n,before[0].n);
        return before;
      });
      assert.equal(a[0].n,1);
      const b=await asRole<{n:number}[]>(db,ROLES[1],tx=>tx.unsafe(
        "SELECT count(*)::int AS n FROM pilot01.issuer_custody"));
      assert.equal(b[0].n,0);
    });
    await t.test("invalid mutation and DELETE fail under actual triggers",async()=>{
      for(const [table,where,args] of [
        ["tenant_memberships","organization_id=$1 AND subject=$2",[orgA,subject]],
        ["issuer_custody","issuer_id=$1",[issuer]]
      ] as const){
        for(const mutation of [
          "revision=revision+2,active=false,revoked_at=clock_timestamp()",
          "revision=revision-1,active=false,revoked_at=clock_timestamp()",
          "revision=revision+1,active=true,revoked_at=NULL",
          "revision=revision+1,active=false,revoked_at=NULL",
          "revision=revision+1,active=false,revoked_at=clock_timestamp(),expires_at=expires_at+interval '1 day'"
        ])await assert.rejects(db.unsafe("UPDATE pilot01."+table+" SET "+mutation+
          " WHERE "+where,args as unknown as any[]),denyCode("23514"));
        await assert.rejects(db.unsafe("DELETE FROM pilot01."+table+" WHERE "+where,
          args as unknown as any[]),/PILOT01_IMMUTABLE_RECEIPT/);
      }
    });
    await t.test("unauthorized identity scope changes are rejected",async()=>{
      await assert.rejects(db.unsafe("UPDATE pilot01.tenant_memberships "+
        "SET role='admin',revision=revision+1,active=false,revoked_at=clock_timestamp() "+
        "WHERE organization_id=$1 AND subject=$2",[orgA,subject]),denyCode("23514"));
      await assert.rejects(db.unsafe("UPDATE pilot01.issuer_custody "+
        "SET site_id=$1,revision=revision+1,active=false,revoked_at=clock_timestamp() "+
        "WHERE issuer_id=$2",[siteB,issuer]),denyCode("23514"));
    });
    const countEvents=async()=>Number((await db.unsafe<{n:number}[]>(
      "SELECT count(*)::int AS n FROM pilot01.custody_revocation_events"))[0].n);
    await t.test("revocation trigger event failure rolls back UPDATE automatically",async()=>{
      const before=await countEvents();
      await db.unsafe("CREATE FUNCTION pilot01.a12_17_fail_event() RETURNS trigger "+
        "LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic event fail'; END $$");
      await db.unsafe("CREATE TRIGGER a12_17_event_failure BEFORE INSERT ON "+
        "pilot01.custody_revocation_events FOR EACH ROW "+
        "EXECUTE FUNCTION pilot01.a12_17_fail_event()");
      try{
        await assert.rejects(db.unsafe("UPDATE pilot01.tenant_memberships "+
          "SET active=false,revoked_at=clock_timestamp(),revision=revision+1 "+
          "WHERE organization_id=$1 AND subject=$2",[orgA,subject]),/synthetic event fail/);
      }finally{
        await db.unsafe("DROP TRIGGER a12_17_event_failure ON pilot01.custody_revocation_events");
        await db.unsafe("DROP FUNCTION pilot01.a12_17_fail_event()");
      }
      const row=await db.unsafe<{active:boolean;revoked_at:Date|null;revision:string}[]>(
        "SELECT active,revoked_at,revision::text FROM pilot01.tenant_memberships "+
        "WHERE organization_id=$1 AND subject=$2",[orgA,subject]);
      assert.equal(row[0].active,true);
      assert.equal(row[0].revoked_at,null);
      assert.equal(row[0].revision,"1");
      assert.equal(await countEvents(),before);
    });
    await t.test("one membership and one issuer revocation append exactly one event each",async()=>{
      await db.unsafe("UPDATE pilot01.tenant_memberships "+
        "SET active=false,revoked_at=clock_timestamp(),revision=revision+1 "+
        "WHERE organization_id=$1 AND subject=$2",[orgA,subject]);
      await db.unsafe("UPDATE pilot01.issuer_custody "+
        "SET active=false,revoked_at=clock_timestamp(),revision=revision+1 "+
        "WHERE issuer_id=$1",[issuer]);
      const rows=await db.unsafe<{entity_type:string;issuer_id:string|null;entity_revision:string;
        authorization_receipt_sha256:string}[]>(
        "SELECT entity_type,issuer_id,entity_revision::text,authorization_receipt_sha256 "+
        "FROM pilot01.custody_revocation_events ORDER BY entity_type");
      assert.equal(rows.length,2);
      assert.deepEqual(rows.map(x=>x.entity_type),["issuer","membership"]);
      assert.equal(rows[0].issuer_id,issuer);assert.equal(rows[1].issuer_id,null);
      assert.ok(rows.every(x=>x.entity_revision==="2"&&/^[a-f0-9]{64}$/.test(x.authorization_receipt_sha256)));
      const actual=await db.unsafe<{entity:string;revision:string;active:boolean}[]>(
        "SELECT 'membership' AS entity,revision::text,active FROM pilot01.tenant_memberships "+
        "UNION ALL SELECT 'issuer',revision::text,active FROM pilot01.issuer_custody");
      assert.ok(actual.every(x=>!x.active&&x.revision==="2"));
    });
    await t.test("revoked records cannot reactivate or be mutated again",async()=>{
      await assert.rejects(db.unsafe("UPDATE pilot01.tenant_memberships "+
        "SET active=true,revoked_at=NULL,revision=revision+1 "+
        "WHERE organization_id=$1 AND subject=$2",[orgA,subject]),denyCode("23514"));
      await assert.rejects(db.unsafe("UPDATE pilot01.issuer_custody "+
        "SET active=true,revoked_at=NULL,revision=revision+1 WHERE issuer_id=$1",
        [issuer]),denyCode("23514"));
      await assert.rejects(db.unsafe("UPDATE pilot01.tenant_memberships "+
        "SET revision=revision+1 WHERE organization_id=$1 AND subject=$2",
        [orgA,subject]),denyCode("23514"));
      assert.equal(await countEvents(),2);
    });
    await t.test("audit UPDATE and DELETE are rejected by immutable receipt guard",async()=>{
      await assert.rejects(db.unsafe("UPDATE pilot01.custody_revocation_events "+
        "SET event_kind='expired' WHERE organization_id=$1",[orgA]),
        /PILOT01_IMMUTABLE_RECEIPT/);
      await assert.rejects(db.unsafe("DELETE FROM pilot01.custody_revocation_events "+
        "WHERE organization_id=$1",[orgA]),/PILOT01_IMMUTABLE_RECEIPT/);
      assert.equal(await countEvents(),2);
    });
  }finally{
    if(attested){
      try{
        await db.unsafe("DROP SCHEMA IF EXISTS pilot01 CASCADE");
        await db.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
        await db.unsafe("CREATE SCHEMA public");
        for(const role of ROLES){
          await db.unsafe('DROP OWNED BY "'+role+'"');
          await db.unsafe('DROP ROLE IF EXISTS "'+role+'"');
        }
      }finally{await db.end({timeout:4});}
    }else await db.end({timeout:4});
  }
});
