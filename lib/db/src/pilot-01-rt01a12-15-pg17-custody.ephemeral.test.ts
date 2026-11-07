/**
 * RT01-A12.15. Fresh/empty GitHub Actions PostgreSQL 17 ONLY.
 * Reuses A12.12's strict loopback and empty-database attestation pattern.
 * No runtime imports, existing DB access, provider calls or operational migrations.
 */
import assert from "node:assert/strict";
import {randomUUID, createHash} from "node:crypto";
import {readFile,readdir} from "node:fs/promises";
import test from "node:test";
import postgres from "postgres";

const armed=process.env.PILOT01_A12_15_DISPOSABLE_PG==="I_ACKNOWLEDGE_NEW_EMPTY_PG17_ONLY"&&
  Boolean(process.env.PILOT01_A12_15_DISPOSABLE_DATABASE_URL);
const ROLE_A="pilot01_a12_15_tenant_a";
const ROLE_B="pilot01_a12_15_tenant_b";
const SHA=(s:string)=>createHash("sha256").update(s).digest("hex");
type Client=ReturnType<typeof postgres>;
function guardedUrl():string{
  if(!armed)throw Error("A12_15_NOT_ARMED");
  const u=new URL(process.env.PILOT01_A12_15_DISPOSABLE_DATABASE_URL!);
  if(!["postgres:","postgresql:"].includes(u.protocol)||
    !["127.0.0.1","localhost","[::1]","::1"].includes(u.hostname)||
    u.port!=="5432"||u.username!=="postgres"||
    u.pathname!=="/pilot01_disposable_rt01a12_15_ci"||
    Boolean(u.search)||Boolean(u.hash)||
    /railway|neon|staging|production|restore|supabase|diamondshelf/i.test(u.href))
    throw Error("A12_15_REFUSE_NONDISPOSABLE_TARGET");
  return u.toString();
}
async function attestEmpty(db:Client){
  const r=await db.unsafe<{name:string;version:number;who:string;tables:number;
    roles:number;other_schemas:number}[]>(
    "SELECT current_database() AS name,current_setting('server_version_num')::int/10000 AS version,"+
    "current_user AS who,(SELECT count(*)::int FROM pg_tables WHERE schemaname='public') AS tables,"+
    "(SELECT count(*)::int FROM pg_roles WHERE rolname LIKE 'pilot01_a12_15_%') AS roles,"+
    "(SELECT count(*)::int FROM pg_namespace WHERE nspname NOT IN "+
    "('public','pg_catalog','information_schema','pg_toast') "+
    "AND nspname NOT LIKE 'pg_temp_%' AND nspname NOT LIKE 'pg_toast_temp_%') AS other_schemas");
  assert.equal(r[0].name,"pilot01_disposable_rt01a12_15_ci");
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
test("A12.15 refuses any DB without newly created disposable CI arming",()=>{
  if(!armed)assert.throws(guardedUrl,/A12_15_NOT_ARMED/);
});
test("A12.15 replays canonical 0001-0011 + A12.1 + A12.14 in new PG17 only",
  {skip:!armed,timeout:180000},async t=>{
  const db=postgres(guardedUrl(),{max:5,prepare:false,connect_timeout:4,idle_timeout:3});
  let attested=false;
  try{
    await attestEmpty(db);
    attested=true;
    const names=(await readdir(new URL("../migrations/",import.meta.url)))
      .filter(f=>/^00(?:0[1-9]|1[01])_.*\.sql$/.test(f)).sort();
    assert.equal(names.length,11,"canonical migration lineage must be complete");
    assert.deepEqual(names.map(x=>Number(x.slice(0,4))),
      [1,2,3,4,5,6,7,8,9,10,11]);
    const a121=await readFile(new URL(
      "../../../docs/sql-candidates/rt01-a12-1-pilot01-additive.sql",import.meta.url),"utf8");
    const a1214=await readFile(new URL(
      "../../../docs/sql-candidates/rt01-a12-14-canonical-membership-issuer-revocation-additive.sql",
      import.meta.url),"utf8");
    assert.match(a1214,/UNEXECUTED ADDITIVE CUSTODY PERSISTENCE CANDIDATE/);
    const single=postgres(guardedUrl(),{max:1,prepare:false,connect_timeout:4});
    try{
      for(const name of names){
        const source=await readFile(new URL("../migrations/"+name,import.meta.url),"utf8");
        assert.match(source,/^BEGIN;/);
        assert.match(source,/COMMIT;\s*$/);
        await single.unsafe(source);
      }
      await single.unsafe(a121);
      await single.unsafe(a1214);
    }finally{await single.end({timeout:4});}
    await t.test("exact new tables and FORCE RLS with default-deny policies",async()=>{
      const rows=await db.unsafe<{tablename:string;relrowsecurity:boolean;relforcerowsecurity:boolean}[]>(
        "SELECT c.relname AS tablename,c.relrowsecurity,c.relforcerowsecurity "+
        "FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace "+
        "WHERE n.nspname='pilot01' AND c.relkind='r' ORDER BY c.relname");
      assert.deepEqual(rows.map(x=>x.tablename),
        ["admissions","custody_revocation_events","grants","issuer_custody",
         "job_events","jobs","outbox","tenant_memberships"]);
      assert.ok(rows.every(x=>x.relrowsecurity&&x.relforcerowsecurity));
      const policies=await db.unsafe<{n:number}[]>(
        "SELECT count(*)::int AS n FROM pg_policies WHERE schemaname='pilot01'");
      assert.equal(policies[0].n,0);
    });
    const orgA=randomUUID(),orgB=randomUUID(),siteA=randomUUID(),siteB=randomUUID();
    const subject="synthetic-actor",issuer="synthetic-issuer";
    await db.unsafe("INSERT INTO public.organizations(id,name,slug) "+
      "VALUES($1,'A','a12-15-a'),($2,'B','a12-15-b')",[orgA,orgB]);
    await db.unsafe("INSERT INTO public.sites(id,organization_id,name,domain,canonical_origin) "+
      "VALUES($1,$2,'site A','a12-15-a.invalid','https://a12-15-a.invalid'),"+
      "($3,$4,'site B','a12-15-b.invalid','https://a12-15-b.invalid')",
      [siteA,orgA,siteB,orgB]);
    await t.test("composite FK rejects cross-tenant issuer even if site exists",async()=>{
      await assert.rejects(db.unsafe(
        "INSERT INTO pilot01.issuer_custody(issuer_id,organization_id,site_id,"+
        "actor_subject,operation,provenance_sha256,expires_at) "+
        "VALUES('cross', $1, $2, $3,'analyze',$4,clock_timestamp()+interval '1 hour')",
        [orgB,siteA,subject,SHA("cross")]),(e:any)=>e.code==="23503");
    });
    await db.unsafe("INSERT INTO pilot01.tenant_memberships "+
      "(organization_id,subject,role,active,revision,expires_at) "+
      "VALUES($1,$2,'operator',true,1,clock_timestamp()+interval '1 hour')",
      [orgA,subject]);
    await db.unsafe("INSERT INTO pilot01.issuer_custody "+
      "(issuer_id,organization_id,site_id,actor_subject,operation,provenance_sha256,"+
      "active,revision,expires_at) "+
      "VALUES($1,$2,$3,$4,'analyze',$5,true,1,clock_timestamp()+interval '1 hour')",
      [issuer,orgA,siteA,subject,SHA("synthetic-issuer-evidence")]);
    await t.test("membership key, revision, lifecycle and issuer constraints reject invalid writes",async()=>{
      await assert.rejects(db.unsafe("INSERT INTO pilot01.tenant_memberships "+
        "(organization_id,subject,role,expires_at) VALUES($1,$2,'operator',now()+interval '1 hour')",
        [orgA,subject]),(e:any)=>e.code==="23505");
      await assert.rejects(db.unsafe("UPDATE pilot01.tenant_memberships "+
        "SET revision=0 WHERE organization_id=$1 AND subject=$2",[orgA,subject]),
        (e:any)=>e.code==="23514");
      await assert.rejects(db.unsafe("UPDATE pilot01.issuer_custody "+
        "SET active=true,revoked_at=clock_timestamp() WHERE issuer_id=$1",[issuer]),
        (e:any)=>e.code==="23514");
      await assert.rejects(db.unsafe("UPDATE pilot01.issuer_custody "+
        "SET operation='write' WHERE issuer_id=$1",[issuer]),
        (e:any)=>e.code==="23514");
    });
    const revocationInsert="INSERT INTO pilot01.custody_revocation_events "+
      "(organization_id,subject,issuer_id,entity_type,entity_revision,event_kind,"+
      "initiated_by_subject,authorization_receipt_sha256) "+
      "VALUES($1,$2,$3,$4,$5,'revoked','synthetic-admin',$6)";
    await t.test("revocation event type and evidence checks reject invalid shapes",async()=>{
      await assert.rejects(db.unsafe(revocationInsert,
        [orgA,subject,issuer,"membership",2,SHA("wrong-kind")]),(e:any)=>e.code==="23514");
      await assert.rejects(db.unsafe(revocationInsert,
        [orgA,subject,null,"issuer",2,SHA("missing-issuer")]),(e:any)=>e.code==="23514");
      await assert.rejects(db.unsafe(revocationInsert,
        [orgA,subject,null,"membership",0,SHA("zero-revision")]),(e:any)=>e.code==="23514");
      await assert.rejects(db.unsafe(revocationInsert,
        [orgA,subject,null,"membership",2,"not-a-hash"]),(e:any)=>e.code==="23514");
    });
    for(const role of [ROLE_A,ROLE_B]){
      await db.unsafe('CREATE ROLE "'+role+'" NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT');
      await db.unsafe('GRANT USAGE ON SCHEMA pilot01 TO "'+role+'"');
      await db.unsafe('GRANT SELECT ON pilot01.tenant_memberships,pilot01.issuer_custody,'+
        'pilot01.custody_revocation_events TO "'+role+'"');
    }
    await t.test("non-superuser default deny and no custody mutation grants",async()=>{
      for(const role of [ROLE_A,ROLE_B]){
        const info=await db.unsafe<{rolsuper:boolean;rolbypassrls:boolean;rolcanlogin:boolean}[]>(
          "SELECT rolsuper,rolbypassrls,rolcanlogin FROM pg_roles WHERE rolname=$1",[role]);
        assert.equal(info.length,1);
        assert.equal(info[0].rolsuper,false);
        assert.equal(info[0].rolbypassrls,false);
        assert.equal(info[0].rolcanlogin,false);
        for(const table of ["tenant_memberships","issuer_custody","custody_revocation_events"]){
          const seen=await asRole<{n:number}[]>(db,role,tx=>tx.unsafe(
            "SELECT count(*)::int AS n FROM pilot01."+table));
          assert.equal(seen[0].n,0,table+" must deny without tenant policy");
        }
      }
      await assert.rejects(asRole(db,ROLE_A,tx=>tx.unsafe(
        "UPDATE pilot01.tenant_memberships SET active=false WHERE organization_id=$1",
        [orgA])),(e:any)=>e.code==="42501");
      await assert.rejects(asRole(db,ROLE_A,tx=>tx.unsafe(revocationInsert,
        [orgA,subject,null,"membership",2,SHA("denied")])) ,(e:any)=>e.code==="42501");
    });
    await t.test("test-only role-scoped policies cannot leak across tenants or client GUC",async()=>{
      // Test-only role-to-tenant mapping; no caller-controlled tenant GUC in policy.
      await db.unsafe("CREATE TABLE pilot01.a12_15_role_scope("+
        "db_role name PRIMARY KEY,organization_id uuid NOT NULL)");
      await db.unsafe("INSERT INTO pilot01.a12_15_role_scope VALUES($1,$2),($3,$4)",
        [ROLE_A,orgA,ROLE_B,orgB]);
      for(const role of [ROLE_A,ROLE_B])
        await db.unsafe('GRANT SELECT ON pilot01.a12_15_role_scope TO "'+role+'"');
      for(const table of ["tenant_memberships","issuer_custody","custody_revocation_events"]){
        await db.unsafe('CREATE POLICY a12_15_role_scoped ON pilot01.'+table+
          ' FOR SELECT TO "'+ROLE_A+'","'+ROLE_B+'" USING ('+
          "organization_id=(SELECT organization_id FROM pilot01.a12_15_role_scope "+
          "WHERE db_role=current_user))");
        const a=await asRole<{n:number}[]>(db,ROLE_A,async tx=>{
          const r=await tx.unsafe("SELECT count(*)::int AS n FROM pilot01."+table);
          await tx.unsafe("SELECT set_config('pilot01.tenant_id',$1,true)",[orgB]);
          const after=await tx.unsafe("SELECT count(*)::int AS n FROM pilot01."+table);
          assert.equal(after[0].n,r[0].n,"user-controlled GUC must not bypass RLS");
          return r;
        });
        const b=await asRole<{n:number}[]>(db,ROLE_B,tx=>tx.unsafe(
          "SELECT count(*)::int AS n FROM pilot01."+table));
        assert.equal(b[0].n,0,"other tenant must be denied");
        if(table!=="custody_revocation_events")assert.equal(a[0].n,1);
      }
    });
    await t.test("revocation plus evidence rolls back atomically on invalid event",async()=>{
      await assert.rejects(db.begin(async tx=>{
        await tx.unsafe("UPDATE pilot01.tenant_memberships "+
          "SET active=false,revoked_at=clock_timestamp(),revision=revision+1 "+
          "WHERE organization_id=$1 AND subject=$2",[orgA,subject]);
        await tx.unsafe(revocationInsert,[orgA,subject,issuer,"membership",2,SHA("bad-event")]);
      }),(e:any)=>e.code==="23514");
      const row=await db.unsafe<{active:boolean;revision:string;revoked_at:Date|null}[]>(
        "SELECT active,revision::text,revoked_at FROM pilot01.tenant_memberships "+
        "WHERE organization_id=$1 AND subject=$2",[orgA,subject]);
      assert.equal(row[0].active,true);
      assert.equal(row[0].revision,"1");
      assert.equal(row[0].revoked_at,null);
      const events=await db.unsafe<{n:number}[]>(
        "SELECT count(*)::int AS n FROM pilot01.custody_revocation_events");
      assert.equal(events[0].n,0);
    });
    await t.test("valid revoke+event can commit but does not prevent privileged reversal",async()=>{
      await db.begin(async tx=>{
        await tx.unsafe("UPDATE pilot01.tenant_memberships "+
          "SET active=false,revoked_at=clock_timestamp(),revision=revision+1 "+
          "WHERE organization_id=$1 AND subject=$2",[orgA,subject]);
        await tx.unsafe(revocationInsert,
          [orgA,subject,null,"membership",2,SHA("synthetic-revocation")]);
      });
      const a=await db.unsafe<{active:boolean;revision:string}[]>(
        "SELECT active,revision::text FROM pilot01.tenant_memberships "+
        "WHERE organization_id=$1 AND subject=$2",[orgA,subject]);
      assert.equal(a[0].active,false);
      assert.equal(a[0].revision,"2");
      const ev=await db.unsafe<{n:number}[]>(
        "SELECT count(*)::int AS n FROM pilot01.custody_revocation_events "+
        "WHERE organization_id=$1 AND entity_type='membership'",[orgA]);
      assert.equal(ev[0].n,1);
      // Deliberately show the missing monotonic guard but roll back the mutation.
      await assert.rejects(db.begin(async tx=>{
        const dec=await tx.unsafe<{revision:string}[]>(
          "UPDATE pilot01.tenant_memberships SET revision=1,active=true,revoked_at=NULL "+
          "WHERE organization_id=$1 AND subject=$2 RETURNING revision::text",
          [orgA,subject]);
        assert.equal(dec[0].revision,"1",
          "positive CHECK alone permits rollback of revision under privileged writer");
        throw Error("A12_15_ROLLBACK_UNSAFE_REVIVAL");
      }),/A12_15_ROLLBACK_UNSAFE_REVIVAL/);
      const final=await db.unsafe<{active:boolean;revision:string}[]>(
        "SELECT active,revision::text FROM pilot01.tenant_memberships "+
        "WHERE organization_id=$1 AND subject=$2",[orgA,subject]);
      assert.equal(final[0].active,false);
      assert.equal(final[0].revision,"2");
    });
    await t.test("revocation event is not intrinsically immutable to schema owner",async()=>{
      await assert.rejects(db.begin(async tx=>{
        const rows=await tx.unsafe<{event_id:string}[]>(
          "DELETE FROM pilot01.custody_revocation_events "+
          "WHERE organization_id=$1 RETURNING event_id",[orgA]);
        assert.equal(rows.length,1,
          "missing DB trigger allows privileged deletion; application grants stay absent");
        throw Error("A12_15_ROLLBACK_PRIVILEGED_DELETE");
      }),/A12_15_ROLLBACK_PRIVILEGED_DELETE/);
    });
  }finally{
    if(attested){
      try{
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
