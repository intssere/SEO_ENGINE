/** A12.21 CI-only PostgreSQL role/RLS adversarial tests. Zero runtime exports. */
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {readFile,readdir} from "node:fs/promises";
import test from "node:test";
import postgres from "postgres";
type DB=ReturnType<typeof postgres>;
const armed=process.env.PILOT01_A12_21_DISPOSABLE_PG==="I_ACKNOWLEDGE_NEW_EMPTY_PG17_ONLY"&&
  Boolean(process.env.PILOT01_A12_21_DISPOSABLE_DATABASE_URL);
const API="pilot01_a12_21_api",WORKER="pilot01_a12_21_worker",
  A="pilot01_a12_21_tenant_a",B="pilot01_a12_21_tenant_b",
  OUTSIDER="pilot01_a12_21_outsider";
function guardedUrl():string{
  if(!armed)throw Error("A12_21_NOT_ARMED");
  const u=new URL(process.env.PILOT01_A12_21_DISPOSABLE_DATABASE_URL!);
  if(!["postgres:","postgresql:"].includes(u.protocol)||
    !["127.0.0.1","localhost","[::1]","::1"].includes(u.hostname)||
    u.port!=="5432"||u.username!=="postgres"||
    u.pathname!=="/pilot01_disposable_rt01a12_21_ci"||
    Boolean(u.search)||Boolean(u.hash)||
    /railway|neon|staging|production|restore|supabase|diamondshelf/i.test(u.href))
    throw Error("A12_21_REFUSE_NONDISPOSABLE_TARGET");
  return u.toString();
}
async function attestEmpty(db:DB){
  const r=await db.unsafe<{name:string;major:number;who:string;tables:number;roles:number;
    extra_schemas:number;extensions:number}[]>(
    "SELECT current_database() AS name,current_setting('server_version_num')::int/10000 AS major,"+
    "current_user AS who,(SELECT count(*)::int FROM pg_tables WHERE schemaname='public') AS tables,"+
    "(SELECT count(*)::int FROM pg_roles WHERE rolname LIKE 'pilot01_a12_21_%') AS roles,"+
    "(SELECT count(*)::int FROM pg_namespace WHERE nspname NOT IN "+
    "('public','pg_catalog','information_schema','pg_toast') AND nspname NOT LIKE 'pg_temp_%' "+
    "AND nspname NOT LIKE 'pg_toast_temp_%') AS extra_schemas,"+
    "(SELECT count(*)::int FROM pg_extension WHERE extname NOT IN ('plpgsql')) AS extensions");
  assert.equal(r[0].name,"pilot01_disposable_rt01a12_21_ci");
  assert.equal(r[0].major,17);assert.equal(r[0].who,"postgres");
  assert.equal(r[0].tables,0);assert.equal(r[0].roles,0);
  assert.equal(r[0].extra_schemas,0);assert.equal(r[0].extensions,0);
}
async function asRole<T>(db:DB,role:string,fn:(tx:any)=>Promise<T>):Promise<T>{
  return db.begin(async tx=>{
    await tx.unsafe('SET LOCAL ROLE "'+role+'"');
    return fn(tx);
  }) as Promise<T>;
}
async function expectDenied(work:()=>Promise<unknown>):Promise<void>{
  await assert.rejects(work);
}
/** Effective non-superuser session authorization; SET ROLE alone as postgres
 * is NOT an escalation test because PostgreSQL superusers can SET ROLE freely.
 * Each disposable connection is discarded after its session identity changes.
 */
async function expectNonmemberRoleSwitchDenied(role:string,target:string){
  const session=postgres(guardedUrl(),{max:1,prepare:false,connect_timeout:4});
  try{
    await session.unsafe('SET SESSION AUTHORIZATION "'+role+'"');
    const who=await session.unsafe<{who:string;session_user:string}[]>(
      "SELECT current_user AS who,session_user AS session_user");
    assert.equal(who[0].who,role);
    assert.equal(who[0].session_user,role);
    await assert.rejects(session.unsafe('SET ROLE "'+target+'"'));
  }finally{await session.end({timeout:3});}
}
test("A12.21 denies database access without exact disposable sentinel",()=>{
  if(!armed)assert.throws(guardedUrl,/A12_21_NOT_ARMED/);
});
test("A12.21 synthetic default-deny, tenant RLS and privilege boundaries in fresh PG17",
  {skip:!armed,timeout:180000},async t=>{
  const db=postgres(guardedUrl(),{max:5,prepare:false,connect_timeout:4,idle_timeout:4});
  let attested=false;
  try{
    await attestEmpty(db);attested=true;
    const migrations=(await readdir(new URL("../migrations/",import.meta.url)))
      .filter(f=>/^00(?:0[1-9]|1[01])_.*\.sql$/.test(f)).sort();
    assert.deepEqual(migrations.map(f=>Number(f.slice(0,4))),[1,2,3,4,5,6,7,8,9,10,11]);
    const candidates=[
      "rt01-a12-1-pilot01-additive.sql",
      "rt01-a12-14-canonical-membership-issuer-revocation-additive.sql",
      "rt01-a12-16-custody-integrity-enforcement-additive.sql",
      "rt01-a12-21-isolated-role-rls-default-deny.sql"
    ];
    const setup=postgres(guardedUrl(),{max:1,prepare:false,connect_timeout:4});
    try{
      for(const f of migrations){
        const content=await readFile(new URL("../migrations/"+f,import.meta.url),"utf8");
        assert.match(content,/^BEGIN;/);await setup.unsafe(content);
      }
      for(const f of candidates){
        const content=await readFile(new URL("../../../docs/sql-candidates/"+f,import.meta.url),"utf8");
        assert.match(content,/BEGIN;/);await setup.unsafe(content);
      }
    }finally{await setup.end({timeout:4});}
    const orgA=randomUUID(),orgB=randomUUID(),siteA=randomUUID(),siteB=randomUUID(),
      sessionA=randomUUID(),sessionB=randomUUID(),grantA=randomUUID(),grantB=randomUUID();
    await db.unsafe(
      "INSERT INTO public.organizations(id,name,slug) VALUES "+
      "($1,'A','a12-21-a'),($2,'B','a12-21-b')",[orgA,orgB]);
    await db.unsafe(
      "INSERT INTO public.sites(id,organization_id,name,domain,canonical_origin) VALUES "+
      "($1,$2,'A','a12-21-a.invalid','https://a12-21-a.invalid'),"+
      "($3,$4,'B','a12-21-b.invalid','https://a12-21-b.invalid')",
      [siteA,orgA,siteB,orgB]);
    await db.unsafe(
      "INSERT INTO public.auth_sessions(id,token_hash,subject,email,role,csrf_token_hash,expires_at) "+
      "VALUES($1,$2,'subject-a','a@invalid.test','operator',$3,clock_timestamp()+interval '1 hour'),"+
      "($4,$5,'subject-b','b@invalid.test','operator',$6,clock_timestamp()+interval '1 hour')",
      [sessionA,randomUUID(),randomUUID(),sessionB,randomUUID(),randomUUID()]);
    await db.unsafe(
      "INSERT INTO pilot01.tenant_memberships(organization_id,subject,role,active,expires_at) "+
      "VALUES($1,'subject-a','operator',true,clock_timestamp()+interval '1 hour'),"+
      "($2,'subject-b','operator',true,clock_timestamp()+interval '1 hour')",
      [orgA,orgB]);
    await db.unsafe(
      "INSERT INTO pilot01.issuer_custody(issuer_id,organization_id,site_id,actor_subject,"+
      "operation,provenance_sha256,active,expires_at) VALUES "+
      "('issuer-a',$1,$2,'subject-a','analyze',$3,true,clock_timestamp()+interval '1 hour'),"+
      "('issuer-b',$4,$5,'subject-b','analyze',$6,true,clock_timestamp()+interval '1 hour')",
      [orgA,siteA,"a".repeat(64),orgB,siteB,"b".repeat(64)]);
    await db.unsafe(
      "INSERT INTO pilot01.grants(grant_id,organization_id,site_id,actor_subject,session_id,"+
      "issuer_id,issuer_provenance_sha256,operation,expires_at) VALUES "+
      "($1,$2,$3,'subject-a',$4,'issuer-a',$5,'analyze',clock_timestamp()+interval '1 hour'),"+
      "($6,$7,$8,'subject-b',$9,'issuer-b',$10,'analyze',clock_timestamp()+interval '1 hour')",
      [grantA,orgA,siteA,sessionA,"a".repeat(64),grantB,orgB,siteB,sessionB,"b".repeat(64)]);
    await t.test("API and worker identities have no custody rights and FORCE RLS hides all rows",async()=>{
      for(const role of [API,WORKER]){
        const principal=await asRole(db,role,async tx=>{
          const r=await tx.unsafe<{who:string}[]>("SELECT current_user AS who");
          return r[0].who;
        });assert.equal(principal,role);
        const target=role===API?"pilot01.grants":"pilot01.jobs";
        const rows=await asRole(db,role,tx=>tx.unsafe("SELECT * FROM "+target));
        assert.equal(rows.length,0);
        await expectDenied(()=>asRole(db,role,tx=>tx.unsafe(
          "SELECT * FROM pilot01.tenant_memberships")));
        await expectDenied(()=>asRole(db,role,tx=>tx.unsafe(
          "SELECT * FROM pilot01.issuer_custody")));
        await expectDenied(()=>asRole(db,role,tx=>tx.unsafe(
          "UPDATE pilot01.issuer_custody SET active=false WHERE issuer_id='issuer-a'")));
        await expectDenied(()=>asRole(db,role,tx=>tx.unsafe(
          "DELETE FROM pilot01.custody_revocation_events")));
      }
      await expectDenied(()=>asRole(db,API,tx=>tx.unsafe("SELECT * FROM pilot01.jobs")));
      await expectDenied(()=>asRole(db,WORKER,tx=>tx.unsafe("SELECT * FROM pilot01.grants")));
      const props=await db.unsafe<{relname:string;relrowsecurity:boolean;relforcerowsecurity:boolean}[]>(
        "SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class "+
        "WHERE oid IN ('pilot01.grants'::regclass,'pilot01.jobs'::regclass,"+
        "'pilot01.tenant_memberships'::regclass,'pilot01.issuer_custody'::regclass)");
      assert.equal(props.length,4);
      assert.ok(props.every(x=>x.relrowsecurity&&x.relforcerowsecurity));
    });
    await t.test("arbitrary tenant GUC does not confer access",async()=>{
      const rows=await asRole(db,API,async tx=>{
        await tx.unsafe("SELECT set_config('pilot01.tenant_id',$1,true)",[orgA]);
        return tx.unsafe("SELECT * FROM pilot01.grants");
      });
      assert.equal(rows.length,0);
    });
    await t.test("synthetic dedicated per-tenant read principals enforce row isolation",async()=>{
      // Test-only policies with immutably pinned synthetic UUIDs; these are NOT
      // a deployable dynamic tenant policy or proof of real session authority.
      for(const role of [A,B,OUTSIDER]){
        await db.unsafe('CREATE ROLE "'+role+'" NOLOGIN NOINHERIT NOBYPASSRLS');
      }
      await db.unsafe('GRANT USAGE ON SCHEMA pilot01 TO "'+A+'","'+B+'"');
      await db.unsafe('GRANT SELECT ON pilot01.grants,pilot01.tenant_memberships TO "'+A+'","'+B+'"');
      for(const [role,org] of [[A,orgA],[B,orgB]]){
        const ident=role===A?"a":"b";
        await db.unsafe('CREATE POLICY a12_21_tenant_'+ident+'_grants ON pilot01.grants '+
          'FOR SELECT TO "'+role+'" USING (organization_id = \''+org+'\'::uuid)');
        await db.unsafe('CREATE POLICY a12_21_tenant_'+ident+'_members ON pilot01.tenant_memberships '+
          'FOR SELECT TO "'+role+'" USING (organization_id = \''+org+'\'::uuid)');
      }
      const grantsA=await asRole(db,A,tx=>tx.unsafe<{grant_id:string;organization_id:string}[]>(
        "SELECT grant_id::text,organization_id::text FROM pilot01.grants"));
      const grantsB=await asRole(db,B,tx=>tx.unsafe<{grant_id:string;organization_id:string}[]>(
        "SELECT grant_id::text,organization_id::text FROM pilot01.grants"));
      assert.deepEqual(grantsA.map(x=>x.grant_id),[grantA]);
      assert.deepEqual(grantsB.map(x=>x.grant_id),[grantB]);
      assert.equal(grantsA[0].organization_id,orgA);
      assert.equal(grantsB[0].organization_id,orgB);
      const membersA=await asRole(db,A,tx=>tx.unsafe("SELECT * FROM pilot01.tenant_memberships"));
      assert.equal(membersA.length,1);
      await expectDenied(()=>asRole(db,A,tx=>tx.unsafe(
        "UPDATE pilot01.tenant_memberships SET active=false WHERE organization_id=$1",[orgA])));
      await expectDenied(()=>asRole(db,A,tx=>tx.unsafe(
        "INSERT INTO pilot01.grants(grant_id) VALUES(gen_random_uuid())")));
    });
    await t.test("NOINHERIT and missing role grants reject service and tenant elevation",async()=>{
      const roles=await db.unsafe<{rolname:string;rolinherit:boolean;rolbypassrls:boolean;rolcanlogin:boolean}[]>(
        "SELECT rolname,rolinherit,rolbypassrls,rolcanlogin FROM pg_roles "+
        "WHERE rolname LIKE 'pilot01_a12_21_%'");
      assert.ok(roles.every(x=>!x.rolinherit&&!x.rolbypassrls&&!x.rolcanlogin));
      await expectNonmemberRoleSwitchDenied(OUTSIDER,A);
      await expectNonmemberRoleSwitchDenied(API,B);
      await expectNonmemberRoleSwitchDenied(WORKER,API);
      await expectDenied(()=>asRole(db,A,tx=>tx.unsafe("SELECT * FROM public.auth_sessions")));
    });
    await t.test("pooled connection role and tenant GUC do not leak between transactions",async()=>{
      // PostgreSQL clients may reuse the same pool connection: transaction-local
      // SET LOCAL ROLE / set_config must revert at COMMIT and ROLLBACK.
      const same=postgres(guardedUrl(),{max:1,prepare:false,connect_timeout:4,idle_timeout:4});
      try{
        await asRole(same,A,async tx=>{
          await tx.unsafe("SELECT set_config('pilot01.tenant_id',$1,true)",[orgA]);
          assert.equal((await tx.unsafe("SELECT * FROM pilot01.grants")).length,1);
        });
        const reset=await same.unsafe<{who:string;tenant:string|null}[]>(
          "SELECT current_user AS who,current_setting('pilot01.tenant_id',true) AS tenant");
        assert.equal(reset[0].who,"postgres");
        assert.notEqual(reset[0].tenant,orgA);
        await assert.rejects(asRole(same,B,async tx=>{
          assert.equal((await tx.unsafe("SELECT * FROM pilot01.grants")).length,1);
          throw Error("synthetic abort");
        }),/synthetic abort/);
        const again=await same.unsafe<{who:string}[]>("SELECT current_user AS who");
        assert.equal(again[0].who,"postgres");
        const after=await asRole(same,A,tx=>tx.unsafe("SELECT * FROM pilot01.grants"));
        assert.equal(after.length,1);
      }finally{await same.end({timeout:3});}
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
