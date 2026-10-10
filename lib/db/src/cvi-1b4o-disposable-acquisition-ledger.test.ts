import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const path = fileURLToPath(new URL("../migrations/0014_cvi_acquisition_nonce_ledger_draft.sql", import.meta.url));
function disposableUrl(): string | null {
  const raw = process.env.CVI_1B4E_DISPOSABLE_DATABASE_URL;
  if (!raw) return null;
  const u = new URL(raw);
  if (u.protocol !== "postgres:" || !["127.0.0.1", "localhost"].includes(u.hostname) ||
      u.pathname !== "/seo_engine_cvi_disposable" || u.username !== "postgres" || u.search || u.hash)
    throw new Error("cvi_1b4o_disposable_database_only");
  return raw;
}
test("CVI-1B.4O concurrent nonce uniqueness and immutable acquisition records", async t => {
  const url = disposableUrl();
  if (!url) { t.skip("explicit disposable localhost PostgreSQL required"); return; }
  const a = postgres(url, { max: 1, prepare: false, connect_timeout: 8, idle_timeout: 2 });
  const b = postgres(url, { max: 1, prepare: false, connect_timeout: 8, idle_timeout: 2 });
  t.after(async () => { await a.end({ timeout: 1 }); await b.end({ timeout: 1 }); });
  const countQuery = "SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'";
  assert.equal((await a.unsafe<{ n: number }[]>(countQuery))[0]?.n, 34);
  await a.unsafe(await readFile(path, "utf8"));
  assert.equal((await a.unsafe<{ n: number }[]>(countQuery))[0]?.n, 35);

  const org = (await a.unsafe<{ id: string }[]>(
    "INSERT INTO organizations(name,slug) VALUES ('CVI nonce proof','cvi-nonce-proof') RETURNING id"))[0]!.id;
  const site = (await a.unsafe<{ id: string }[]>(
    "INSERT INTO sites(organization_id,name,domain,canonical_origin) VALUES ($1::uuid,'Nonce proof','nonce.cvi.test','https://nonce.cvi.test') RETURNING id",
    [org]))[0]!.id;
  const connection = (await a.unsafe<{ id: string }[]>(
    "INSERT INTO connections(site_id,provider,external_account_id,scopes,status) VALUES ($1::uuid,'google','cvi-nonce',ARRAY['https://www.googleapis.com/auth/webmasters.readonly'],'connected') RETURNING id",
    [site]))[0]!.id;
  const session = (await a.unsafe<{ id: string }[]>(
    "INSERT INTO auth_sessions(token_hash,subject,email,role,csrf_token_hash,expires_at) VALUES ($1,'cvi-nonce-subject','nonce@example.test','viewer',$2,'2099-01-01T00:00:00Z') RETURNING id",
    ["e".repeat(64), "f".repeat(64)]))[0]!.id;

  const insertSql = `INSERT INTO cvi_acquisition_nonce_ledger
    (acquisition_id,tenant_id,site_id,connection_id,auth_subject,auth_session_id,
     request_nonce,requested_resource,observation_fingerprint,requested_at,observed_at)
    VALUES ($1,$2::uuid,$3::uuid,$4::uuid,$5,$6::uuid,$7,'sc-domain:nonce.cvi.test',$8,
      '2026-10-09T00:00:00Z','2026-10-09T00:00:01Z')`;
  const insert = (db: typeof a, id: string, nonce: string, targetSite = site, subject = "cvi-nonce-subject") =>
    db.unsafe(insertSql, [id, org, targetSite, connection, subject, session, nonce, "a".repeat(64)]);

  const competing = await Promise.allSettled([
    insert(a, "acquisition-A", "unique-nonce-1"),
    insert(b, "acquisition-B", "unique-nonce-1"),
  ]);
  assert.equal(competing.filter(x => x.status === "fulfilled").length, 1);
  assert.equal(competing.filter(x => x.status === "rejected").length, 1);
  assert.equal((competing.find(x => x.status === "rejected") as PromiseRejectedResult).reason.code, "23505");
  const recorded = await a.unsafe<{ n: number }[]>(
    "SELECT COUNT(*)::int AS n FROM cvi_acquisition_nonce_ledger WHERE request_nonce='unique-nonce-1'");
  assert.equal(recorded[0]?.n, 1);
  await assert.rejects(insert(a, "acquisition-A", "different-nonce"), (e: any) => e.code === "23505");

  const wrongSite = (await a.unsafe<{ id: string }[]>(
    "INSERT INTO sites(organization_id,name,domain,canonical_origin) VALUES ($1::uuid,'Other','other.cvi.test','https://other.cvi.test') RETURNING id",
    [org]))[0]!.id;
  await assert.rejects(insert(a, "acquisition-C", "wrong-site", wrongSite),
    /cvi_acquisition_connection_site_invalid/);
  await assert.rejects(insert(a, "acquisition-D", "wrong-subject", site, "attacker"),
    /cvi_acquisition_session_invalid/);

  await assert.rejects(a.unsafe("UPDATE cvi_acquisition_nonce_ledger SET request_nonce='changed'"), /immutable/);
  await assert.rejects(a.unsafe("DELETE FROM cvi_acquisition_nonce_ledger"), /immutable/);
  await assert.rejects(a.unsafe("TRUNCATE cvi_acquisition_nonce_ledger"), /immutable/);
  const finalRows = await a.unsafe<{ n: number }[]>("SELECT COUNT(*)::int AS n FROM cvi_acquisition_nonce_ledger");
  assert.equal(finalRows[0]?.n, 1);
});


test("CVI-1B.4P admission requires live tenant membership and site read grant", async t => {
  const url = disposableUrl();
  if (!url) { t.skip("explicit disposable localhost PostgreSQL required"); return; }
  const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 8, idle_timeout: 2 });
  t.after(async () => { await sql.end({ timeout: 1 }); });
  const migration = fileURLToPath(new URL("../migrations/0015_cvi_acquisition_membership_fence_draft.sql", import.meta.url));
  await sql.unsafe(await readFile(migration, "utf8"));
  const org = (await sql.unsafe<{ id: string }[]>("SELECT id FROM organizations WHERE slug='cvi-nonce-proof'"))[0]!.id;
  const site = (await sql.unsafe<{ id: string }[]>("SELECT id FROM sites WHERE domain='nonce.cvi.test'"))[0]!.id;
  const connection = (await sql.unsafe<{ id: string }[]>("SELECT id FROM connections WHERE site_id=$1::uuid", [site]))[0]!.id;
  const session = (await sql.unsafe<{ id: string }[]>("SELECT id FROM auth_sessions WHERE subject='cvi-nonce-subject'"))[0]!.id;
  const insertSql = `INSERT INTO cvi_acquisition_nonce_ledger
    (acquisition_id,tenant_id,site_id,connection_id,auth_subject,auth_session_id,
     request_nonce,requested_resource,observation_fingerprint,requested_at,observed_at)
    VALUES ($1,$2::uuid,$3::uuid,$4::uuid,'cvi-nonce-subject',$5::uuid,$6,
      'sc-domain:nonce.cvi.test',$7,'2026-10-09T00:00:00Z','2026-10-09T00:00:01Z')`;
  const insert = (id: string, nonce: string) =>
    sql.unsafe(insertSql,[id,org,site,connection,session,nonce,"b".repeat(64)]);
  await assert.rejects(insert("fence-no-membership","nonce-fence-1"), /cvi_acquisition_read_grant_invalid/);
  const membership = (await sql.unsafe<{ id: string }[]>(
    `INSERT INTO cvi_organization_memberships
      (organization_id,auth_subject,member_role,status,effective_at,revoked_at)
      VALUES ($1::uuid,'cvi-nonce-subject','viewer','active','2026-10-08T00:00:00Z',NULL) RETURNING id`,
    [org]))[0]!.id;
  await assert.rejects(insert("fence-no-grant","nonce-fence-2"), /cvi_acquisition_read_grant_invalid/);
  const grant = (await sql.unsafe<{ id: string }[]>(
    `INSERT INTO cvi_site_read_grants
      (organization_membership_id,organization_id,site_id,permission,status,effective_at,revoked_at)
      VALUES ($1::uuid,$2::uuid,$3::uuid,'read_evidence','active','2026-10-08T00:00:00Z',NULL) RETURNING id`,
    [membership,org,site]))[0]!.id;
  await insert("fence-active","nonce-fence-3");
  await sql.unsafe("UPDATE cvi_site_read_grants SET status='revoked',revoked_at=now() WHERE id=$1::uuid",[grant]);
  await assert.rejects(insert("fence-revoked-grant","nonce-fence-4"), /cvi_acquisition_read_grant_invalid/);
  await sql.unsafe("UPDATE cvi_site_read_grants SET status='active',revoked_at=NULL WHERE id=$1::uuid",[grant]);
  await sql.unsafe("UPDATE cvi_organization_memberships SET status='revoked',revoked_at=now() WHERE id=$1::uuid",[membership]);
  await assert.rejects(insert("fence-revoked-membership","nonce-fence-5"), /cvi_acquisition_read_grant_invalid/);
  await sql.unsafe("UPDATE cvi_organization_memberships SET status='active',revoked_at=NULL WHERE id=$1::uuid",[membership]);
  await sql.unsafe("UPDATE connections SET scopes=ARRAY['https://www.googleapis.com/auth/analytics.readonly'] WHERE id=$1::uuid",[connection]);
  await assert.rejects(insert("fence-wrong-scope","nonce-fence-6"), /cvi_acquisition_connection_site_invalid/);
  const records=await sql.unsafe<{ n: number }[]>(
    "SELECT COUNT(*)::int AS n FROM cvi_acquisition_nonce_ledger WHERE acquisition_id LIKE 'fence-%'");
  assert.equal(records[0]?.n,1,"denied acquisition IDs and nonces were not admitted");
});


test("CVI-1C.8 actual exported atomic SQL rejects racing nonces and revoked membership", async t => {
  const url=disposableUrl();
  if(!url){t.skip("explicit disposable PostgreSQL required");return;}
  const a=postgres(url,{max:1,prepare:false,connect_timeout:8,idle_timeout:2});
  const b=postgres(url,{max:1,prepare:false,connect_timeout:8,idle_timeout:2});
  t.after(async()=>{await a.end({timeout:1});await b.end({timeout:1});});
  const source=fileURLToPath(new URL("../../../artifacts/api-server/src/lib/cvi-receipt-nonce-admission.ts",import.meta.url));
  const code=await readFile(source,"utf8");
  const match=code.match(/export const CVI_ATOMIC_RECEIPT_LEDGER_SQL = \[([\s\S]*?)\]\.join\(" "\) as string;/);
  assert.ok(match,"extract exact exported SQL fragments for real certification");
  const fragments=match[1]!.split("\n").map(x=>x.trim()).filter(x=>x.startsWith('"')).map(x=>JSON.parse(x.replace(/,$/,"")) as string);
  assert.equal(fragments.length,5,"export must retain canonical parameterized SQL");
  const sqlText=fragments.join(" ");
  assert.match(sqlText,/ON CONFLICT DO NOTHING RETURNING acquisition_id/);
  const org=(await a.unsafe<{id:string}[]>("SELECT id FROM organizations WHERE slug='cvi-nonce-proof'"))[0]!.id;
  const site=(await a.unsafe<{id:string}[]>("SELECT id FROM sites WHERE domain='nonce.cvi.test'"))[0]!.id;
  const conn=(await a.unsafe<{id:string}[]>("SELECT id FROM connections WHERE site_id=$1::uuid",[site]))[0]!.id;
  const session=(await a.unsafe<{id:string}[]>("SELECT id FROM auth_sessions WHERE subject='cvi-nonce-subject'"))[0]!.id;
  await a.unsafe("UPDATE connections SET scopes=ARRAY['https://www.googleapis.com/auth/webmasters.readonly'] WHERE id=$1::uuid",[conn]);
  const membership=(await a.unsafe<{id:string}[]>(
    "SELECT id FROM cvi_organization_memberships WHERE organization_id=$1::uuid AND auth_subject='cvi-nonce-subject'",[org]))[0]!.id;
  const insert=(db:typeof a,id:string,nonce:string)=>db.unsafe<{acquisition_id:string}[]>(sqlText,[
    id,org,site,"cvi-nonce-subject",session,conn,nonce,"sc-domain:nonce.cvi.test",
    "c".repeat(64),"2026-10-09T00:00:00Z","2026-10-09T00:00:01Z",
  ]);
  const replies=await Promise.all([
    insert(a,"cvi-1c8-race-a","cvi-1c8-race-nonce"),
    insert(b,"cvi-1c8-race-b","cvi-1c8-race-nonce"),
  ]);
  assert.deepEqual(replies.map(x=>x.length).sort(),[0,1],"atomic unique nonce means one winner");
  assert.equal((await insert(a,"cvi-1c8-race-a","alternate-nonce")).length,0,"duplicate acquisition ID denied");
  await a.unsafe("UPDATE cvi_organization_memberships SET status='revoked',revoked_at=now() WHERE id=$1::uuid",[membership]);
  await assert.rejects(insert(a,"cvi-1c8-denied","cvi-1c8-new-nonce"),
    /cvi_acquisition_read_grant_invalid/,"revocation blocks insertion");
  const rows=await a.unsafe<{n:number}[]>(
    "SELECT COUNT(*)::int AS n FROM cvi_acquisition_nonce_ledger WHERE acquisition_id LIKE 'cvi-1c8-%'");
  assert.equal(rows[0]?.n,1,"only one successful receipt recorded");
});


test("CVI-1C.10 concurrent membership/grant revocation serializes nonce admission", async t => {
  const url=disposableUrl();
  if (!url) { t.skip("explicit disposable PostgreSQL required"); return; }
  const a=postgres(url,{max:1,prepare:false,connect_timeout:8,idle_timeout:2});
  const b=postgres(url,{max:1,prepare:false,connect_timeout:8,idle_timeout:2});
  const monitor=postgres(url,{max:1,prepare:false,connect_timeout:8,idle_timeout:2});
  t.after(async()=>{await a.end({timeout:1});await b.end({timeout:1});await monitor.end({timeout:1});});
  const migration=fileURLToPath(new URL("../migrations/0016_cvi_acquisition_revocation_serialization_draft.sql",import.meta.url));
  await a.unsafe(await readFile(migration,"utf8"));
  const source=fileURLToPath(new URL("../../../artifacts/api-server/src/lib/cvi-receipt-nonce-admission.ts",import.meta.url));
  const code=await readFile(source,"utf8");
  const match=code.match(/export const CVI_ATOMIC_RECEIPT_LEDGER_SQL = \[([\s\S]*?)\]\.join\(" "\) as string;/);
  assert.ok(match);
  const fragments=match[1]!.split("\n").map(x=>x.trim())
    .filter(x=>x.startsWith('"')).map(x=>JSON.parse(x.replace(/,$/,"")) as string);
  const insertSQL=fragments.join(" ");
  const org=(await a.unsafe<{id:string}[]>("SELECT id FROM organizations WHERE slug='cvi-nonce-proof'"))[0]!.id;
  const site=(await a.unsafe<{id:string}[]>("SELECT id FROM sites WHERE domain='nonce.cvi.test'"))[0]!.id;
  const connection=(await a.unsafe<{id:string}[]>("SELECT id FROM connections WHERE site_id=$1::uuid",[site]))[0]!.id;
  const session=(await a.unsafe<{id:string}[]>("SELECT id FROM auth_sessions WHERE subject='cvi-nonce-subject'"))[0]!.id;
  const membership=(await a.unsafe<{id:string}[]>(
    "SELECT id FROM cvi_organization_memberships WHERE organization_id=$1::uuid AND auth_subject='cvi-nonce-subject'",[org]))[0]!.id;
  const grant=(await a.unsafe<{id:string}[]>(
    "SELECT id FROM cvi_site_read_grants WHERE organization_membership_id=$1::uuid AND permission='read_evidence'",[membership]))[0]!.id;
  const bPid=(await b.unsafe<{pid:number}[]>("SELECT pg_backend_pid()::int AS pid"))[0]!.pid;
  await a.unsafe("UPDATE connections SET scopes=ARRAY['https://www.googleapis.com/auth/webmasters.readonly'], status='connected' WHERE id=$1::uuid",[connection]);
  await a.unsafe("UPDATE cvi_organization_memberships SET status='active',revoked_at=NULL WHERE id=$1::uuid",[membership]);
  await a.unsafe("UPDATE cvi_site_read_grants SET status='active',revoked_at=NULL WHERE id=$1::uuid",[grant]);
  let ordinal=0;
  async function certifyRevocationRace(table:"membership"|"grant") {
    ordinal++;
    const target=table==="membership"
      ? {sql:"UPDATE cvi_organization_memberships SET status='revoked',revoked_at=now() WHERE id=$1::uuid",id:membership}
      : {sql:"UPDATE cvi_site_read_grants SET status='revoked',revoked_at=now() WHERE id=$1::uuid",id:grant};
    await a.unsafe("BEGIN");
    try {
      await a.unsafe(target.sql,[target.id]);
      const pending=b.unsafe<{acquisition_id:string}[]>(insertSQL,[
        "cvi-1c10-race-"+ordinal,org,site,"cvi-nonce-subject",session,connection,
        "cvi-1c10-nonce-"+ordinal,"sc-domain:nonce.cvi.test",
        "d".repeat(64),"2026-10-09T00:00:00Z","2026-10-09T00:00:01Z",
      ]).then(
        rows=>({rows,error:null as null|unknown}),
        error=>({rows:null as null|{acquisition_id:string}[],error}),
      );
      let sawLock=false;
      for(let i=0;i<50;i++){
        const observed=await monitor.unsafe<{wait_event_type:string|null}[]>(
          "SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1",[bPid]);
        if(observed[0]?.wait_event_type==="Lock"){sawLock=true;break;}
        await monitor.unsafe("SELECT pg_sleep(0.05)");
      }
      assert.equal(sawLock,true,table+" revocation lock must stall admission");
      await a.unsafe("COMMIT");
      const finished=await pending;
      assert.equal(finished.rows,null,"no acquisition admitted during revocation race");
      assert.match(String((finished.error as {message?:string})?.message),/cvi_acquisition_read_grant_invalid/);
    } catch(error) {
      await a.unsafe("ROLLBACK").catch(()=>{});
      throw error;
    }
    const restore=table==="membership"
      ? "UPDATE cvi_organization_memberships SET status='active',revoked_at=NULL WHERE id=$1::uuid"
      : "UPDATE cvi_site_read_grants SET status='active',revoked_at=NULL WHERE id=$1::uuid";
    await a.unsafe(restore,[target.id]);
  }
  await certifyRevocationRace("membership");
  await certifyRevocationRace("grant");
  const rows=await a.unsafe<{n:number}[]>(
    "SELECT COUNT(*)::int AS n FROM cvi_acquisition_nonce_ledger WHERE acquisition_id LIKE 'cvi-1c10-%'");
  assert.equal(rows[0]?.n,0,"all admission races denied and no replay tombstones forged");
});


test("CVI-1C.15 exact readback SQL reconciles one untrusted GSC acquisition without cross-tenant leakage",async t=>{
 const url=disposableUrl();
 if(!url){t.skip("explicit disposable localhost PostgreSQL required");return;}
 const sql=postgres(url,{max:1,prepare:false,connect_timeout:8,idle_timeout:2});
 t.after(async()=>{await sql.end({timeout:1});});
 const sourceDir=new URL("../../../artifacts/api-server/src/lib/",import.meta.url);
 const source=await readFile(fileURLToPath(new URL("cvi-gsc-ledger-receipt-readback.ts",sourceDir)),"utf8");
 const match=source.match(/export const CVI_GSC_LEDGER_READBACK_SQL = \[([\s\S]*?)\]\.join\(" "\);/);
 assert.ok(match,"exact exported readback query must be present");
 const fragments=match[1]!.split("\n").map(x=>x.trim()).filter(x=>x.startsWith('"'))
   .map(x=>JSON.parse(x.replace(/,$/,"")) as string);
 assert.equal(fragments.length,6);
 const readSql=fragments.join(" ");
 assert.match(readSql,/FROM cvi_acquisition_nonce_ledger WHERE acquisition_id=\$1 LIMIT 2/);
 assert.doesNotMatch(readSql,/\b(?:INSERT|UPDATE|DELETE|TRUNCATE)\b/i);
 const atomicSource=await readFile(fileURLToPath(new URL("cvi-receipt-nonce-admission.ts",sourceDir)),"utf8");
 const insertMatch=atomicSource.match(/export const CVI_ATOMIC_RECEIPT_LEDGER_SQL = \[([\s\S]*?)\]\.join\(" "\) as string;/);
 assert.ok(insertMatch,"exact acquisition insert contract must be present");
 const insertSql=insertMatch[1]!.split("\n").map(x=>x.trim()).filter(x=>x.startsWith('"'))
   .map(x=>JSON.parse(x.replace(/,$/,"")) as string).join(" ");
 const org=(await sql.unsafe<{id:string}[]>("SELECT id FROM organizations WHERE slug='cvi-nonce-proof'"))[0]!.id;
 const site=(await sql.unsafe<{id:string}[]>("SELECT id FROM sites WHERE domain='nonce.cvi.test'"))[0]!.id;
 const conn=(await sql.unsafe<{id:string}[]>("SELECT id FROM connections WHERE site_id=$1::uuid",[site]))[0]!.id;
 const session=(await sql.unsafe<{id:string}[]>("SELECT id FROM auth_sessions WHERE subject='cvi-nonce-subject'"))[0]!.id;
 const membership=(await sql.unsafe<{id:string}[]>(
   "SELECT id FROM cvi_organization_memberships WHERE organization_id=$1::uuid AND auth_subject='cvi-nonce-subject'",[org]))[0]!.id;
 const grant=(await sql.unsafe<{id:string}[]>(
   "SELECT id FROM cvi_site_read_grants WHERE organization_membership_id=$1::uuid AND permission='read_evidence'",[membership]))[0]!.id;
 await sql.unsafe("UPDATE connections SET scopes=ARRAY['https://www.googleapis.com/auth/webmasters.readonly'],status='connected' WHERE id=$1::uuid",[conn]);
 await sql.unsafe("UPDATE cvi_organization_memberships SET status='active',revoked_at=NULL WHERE id=$1::uuid",[membership]);
 await sql.unsafe("UPDATE cvi_site_read_grants SET status='active',revoked_at=NULL WHERE id=$1::uuid",[grant]);
 const receiptId="cvi-1c15-acq-1",nonce="cvi-1c15-nonce-1",resource="sc-domain:nonce.cvi.test",hash="e".repeat(64);
 const inserted=await sql.unsafe<{acquisition_id:string}[]>(insertSql,[
  receiptId,org,site,"cvi-nonce-subject",session,conn,nonce,resource,hash,
  "2026-10-09T00:00:00Z","2026-10-09T00:00:01Z",
 ]);
 assert.equal(inserted.length,1,"one untrusted receipt is inserted");
 const rows=await sql.unsafe<{
  acquisitionId:string;tenantId:string;siteId:string;connectionId:string;
  authSubject:string;authSessionId:string;requestNonce:string;
  requestedResource:string;observationFingerprint:string;disposition:string;
 }[]>(readSql,[receiptId]);
 assert.equal(rows.length,1);
 assert.deepEqual(rows[0],{
  acquisitionId:receiptId,tenantId:org,siteId:site,connectionId:conn,
  authSubject:"cvi-nonce-subject",authSessionId:session,
  requestNonce:nonce,requestedResource:resource,
  observationFingerprint:hash,disposition:"recorded_untrusted",
 });
 assert.equal((await sql.unsafe(readSql,["cvi-1c15-missing"])).length,0);
 assert.equal((await sql.unsafe(readSql,["cvi-1c10-race-1"])).length,0);
 // The query is a tombstone locator, NOT a tenant-scoped authorization check;
 // a trusted server must independently check tenant/session/grants.
 const forgedTenant="ffffffff-ffff-4fff-8fff-ffffffffffff";
 assert.notEqual(rows[0]!.tenantId,forgedTenant);
 await sql.unsafe("UPDATE cvi_site_read_grants SET status='revoked',revoked_at=now() WHERE id=$1::uuid",[grant]);
 assert.equal((await sql.unsafe(readSql,[receiptId])).length,1,
  "historical tombstone remains readable after grant revocation; no access capability");
 await sql.unsafe("UPDATE cvi_site_read_grants SET status='active',revoked_at=NULL WHERE id=$1::uuid",[grant]);
});


test("CVI-1C.16 scoped readback SQL denies tenant/session mismatch and revoked grants",async t=>{
 const url=disposableUrl();
 if(!url){t.skip("explicit disposable localhost PostgreSQL required");return;}
 const db=postgres(url,{max:1,prepare:false,connect_timeout:8,idle_timeout:2});
 t.after(async()=>{await db.end({timeout:1});});
 const lib=new URL("../../../artifacts/api-server/src/lib/",import.meta.url);
 const sqlSource=await readFile(fileURLToPath(new URL("cvi-gsc-scoped-ledger-readback.ts",lib)),"utf8");
 const match=sqlSource.match(/export const CVI_GSC_SCOPED_READBACK_SQL = \[([\s\S]*?)\]\.join\(" "\);/);
 assert.ok(match);
 const expressions=match[1]!.split("\n").map(x=>x.trim()).filter(x=>x.startsWith("'"));
 const readSql=expressions.map(x=>JSON.parse('"'+x.replace(/,$/,"").slice(1,-1).replace(/\\'/g,"'").replace(/"/g,'\\"')+'"') as string).join(" ");
 assert.match(readSql,/LIMIT 2 FOR SHARE OF s,c,se,m,g/);
 const org=(await db.unsafe<{id:string}[]>("SELECT id FROM organizations WHERE slug='cvi-nonce-proof'"))[0]!.id;
 const site=(await db.unsafe<{id:string}[]>("SELECT id FROM sites WHERE domain='nonce.cvi.test'"))[0]!.id;
 const connection=(await db.unsafe<{id:string}[]>("SELECT id FROM connections WHERE site_id=$1::uuid",[site]))[0]!.id;
 const session=(await db.unsafe<{id:string}[]>("SELECT id FROM auth_sessions WHERE subject='cvi-nonce-subject'"))[0]!.id;
 const membership=(await db.unsafe<{id:string}[]>(
  "SELECT id FROM cvi_organization_memberships WHERE organization_id=$1::uuid AND auth_subject='cvi-nonce-subject'",[org]))[0]!.id;
 const grant=(await db.unsafe<{id:string}[]>(
  "SELECT id FROM cvi_site_read_grants WHERE organization_membership_id=$1::uuid AND permission='read_evidence'",[membership]))[0]!.id;
 await db.unsafe("UPDATE connections SET status='connected',scopes=ARRAY['https://www.googleapis.com/auth/webmasters.readonly'] WHERE id=$1::uuid",[connection]);
 await db.unsafe("UPDATE cvi_organization_memberships SET status='active',revoked_at=NULL WHERE id=$1::uuid",[membership]);
 await db.unsafe("UPDATE cvi_site_read_grants SET status='active',revoked_at=NULL WHERE id=$1::uuid",[grant]);
 const args=["cvi-1c15-acq-1",org,site,connection,"cvi-nonce-subject",session];
 const query=(values:readonly string[])=>db.unsafe<{acquisitionId:string;tenantId:string;requestNonce:string}[]>(readSql,[...values]);
 const authorized=await query(args);
 assert.equal(authorized.length,1);
 assert.equal(authorized[0]!.tenantId,org);
 assert.equal(authorized[0]!.requestNonce,"cvi-1c15-nonce-1");
 const alienTenant="ffffffff-ffff-4fff-8fff-ffffffffffff";
 assert.equal((await query([args[0],alienTenant,...args.slice(2)])).length,0);
 assert.equal((await query([...args.slice(0,5),"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"])).length,0);
 assert.equal((await query([args[0],org,site,connection,"intruder",session])).length,0);
 await db.unsafe("UPDATE cvi_site_read_grants SET status='revoked',revoked_at=now() WHERE id=$1::uuid",[grant]);
 assert.equal((await query(args)).length,0,"revoked site grant forbids historical read");
 await db.unsafe("UPDATE cvi_site_read_grants SET status='active',revoked_at=NULL WHERE id=$1::uuid",[grant]);
 await db.unsafe("UPDATE cvi_organization_memberships SET status='revoked',revoked_at=now() WHERE id=$1::uuid",[membership]);
 assert.equal((await query(args)).length,0,"revoked membership forbids historical read");
 await db.unsafe("UPDATE cvi_organization_memberships SET status='active',revoked_at=NULL WHERE id=$1::uuid",[membership]);
});


test("CVI-1C.18 real postgres.Sql adapter admits only active and scoped historical record",async t=>{
 const url=disposableUrl();
 if(!url){t.skip("explicit disposable localhost PostgreSQL required");return;}
 const db=postgres(url,{max:1,prepare:false,connect_timeout:8,idle_timeout:2});
 t.after(async()=>{await db.end({timeout:1});});
 const adapterModulePath=fileURLToPath(new URL(
   "../../../artifacts/api-server/src/lib/cvi-gsc-scoped-readback-postgres-adapter.ts",import.meta.url));
 const {createCviScopedPostgresReadbackStore}=await import(adapterModulePath);
 const store=createCviScopedPostgresReadbackStore(db);
 const org=(await db.unsafe<{id:string}[]>("SELECT id FROM organizations WHERE slug='cvi-nonce-proof'"))[0]!.id;
 const site=(await db.unsafe<{id:string}[]>("SELECT id FROM sites WHERE domain='nonce.cvi.test'"))[0]!.id;
 const connection=(await db.unsafe<{id:string}[]>("SELECT id FROM connections WHERE site_id=$1::uuid",[site]))[0]!.id;
 const session=(await db.unsafe<{id:string}[]>("SELECT id FROM auth_sessions WHERE subject='cvi-nonce-subject'"))[0]!.id;
 const membership=(await db.unsafe<{id:string}[]>(
   "SELECT id FROM cvi_organization_memberships WHERE organization_id=$1::uuid AND auth_subject='cvi-nonce-subject'",[org]))[0]!.id;
 const grant=(await db.unsafe<{id:string}[]>(
   "SELECT id FROM cvi_site_read_grants WHERE organization_membership_id=$1::uuid AND permission='read_evidence'",[membership]))[0]!.id;
 const principal={acquisitionId:"cvi-1c15-acq-1",tenantId:org,siteId:site,
   connectionId:connection,authSubject:"cvi-nonce-subject",authSessionId:session};
 await db.unsafe("UPDATE connections SET status='connected',scopes=ARRAY['https://www.googleapis.com/auth/webmasters.readonly'] WHERE id=$1::uuid",[connection]);
 await db.unsafe("UPDATE cvi_organization_memberships SET status='active',revoked_at=NULL WHERE id=$1::uuid",[membership]);
 await db.unsafe("UPDATE cvi_site_read_grants SET status='active',revoked_at=NULL WHERE id=$1::uuid",[grant]);
 const found=await store.fetchScoped(principal);
 assert.ok(found);
 assert.deepEqual(found,{
  acquisitionId:principal.acquisitionId,tenantId:org,siteId:site,connectionId:connection,
  authSubject:"cvi-nonce-subject",authSessionId:session,requestNonce:"cvi-1c15-nonce-1",
  requestedResource:"sc-domain:nonce.cvi.test",observationFingerprint:"e".repeat(64),
  disposition:"recorded_untrusted",
 });
 assert.equal(await store.fetchScoped({...principal,tenantId:"ffffffff-ffff-4fff-8fff-ffffffffffff"}),null,
   "other tenant cannot retrieve acquisition");
 assert.equal(await store.fetchScoped({...principal,authSessionId:"ffffffff-ffff-4fff-8fff-ffffffffffff"}),null,
   "other session cannot retrieve acquisition");
 assert.equal(await store.fetchScoped({...principal,authSubject:"other-subject"}),null,
   "other subject cannot retrieve acquisition");
 assert.equal(await store.fetchScoped({...principal,acquisitionId:"absent-acquisition"}),null);
 await db.unsafe("UPDATE cvi_site_read_grants SET status='revoked',revoked_at=now() WHERE id=$1::uuid",[grant]);
 assert.equal(await store.fetchScoped(principal),null,"revoked grant denies read");
 await db.unsafe("UPDATE cvi_site_read_grants SET status='active',revoked_at=NULL WHERE id=$1::uuid",[grant]);
 await db.unsafe("UPDATE cvi_organization_memberships SET status='revoked',revoked_at=now() WHERE id=$1::uuid",[membership]);
 assert.equal(await store.fetchScoped(principal),null,"revoked membership denies read");
 await db.unsafe("UPDATE cvi_organization_memberships SET status='active',revoked_at=NULL WHERE id=$1::uuid",[membership]);
 await db.unsafe("UPDATE auth_sessions SET revoked_at=now() WHERE id=$1::uuid",[session]);
 assert.equal(await store.fetchScoped(principal),null,"revoked session denies read");
 await db.unsafe("UPDATE auth_sessions SET revoked_at=NULL WHERE id=$1::uuid",[session]);
});


test("CVI-1C.22 real server scope resolver rejects revoked session, membership and grant",async t=>{
 const url=disposableUrl();
 if(!url){t.skip("explicit disposable localhost PostgreSQL required");return;}
 const db=postgres(url,{max:1,prepare:false,connect_timeout:8,idle_timeout:2});
 t.after(async()=>{await db.end({timeout:1});});
 // Dynamic path ensures lib/db TypeScript project does not compile api-server files.
 const file=fileURLToPath(new URL(
   "../../../artifacts/api-server/src/lib/cvi-gsc-server-scope-resolver.ts",import.meta.url));
 const {createCviGscServerScopeResolver}=await import(file);
 const resolver=createCviGscServerScopeResolver(db);
 const org=(await db.unsafe<{id:string}[]>("SELECT id FROM organizations WHERE slug='cvi-nonce-proof'"))[0]!.id;
 const site=(await db.unsafe<{id:string}[]>("SELECT id FROM sites WHERE domain='nonce.cvi.test'"))[0]!.id;
 const conn=(await db.unsafe<{id:string}[]>("SELECT id FROM connections WHERE site_id=$1::uuid",[site]))[0]!.id;
 const session=(await db.unsafe<{id:string}[]>("SELECT id FROM auth_sessions WHERE subject='cvi-nonce-subject'"))[0]!.id;
 const member=(await db.unsafe<{id:string}[]>(
   "SELECT id FROM cvi_organization_memberships WHERE organization_id=$1::uuid AND auth_subject='cvi-nonce-subject'",[org]))[0]!.id;
 const grant=(await db.unsafe<{id:string}[]>(
   "SELECT id FROM cvi_site_read_grants WHERE organization_membership_id=$1::uuid AND permission='read_evidence'",[member]))[0]!.id;
 await db.unsafe("UPDATE connections SET status='connected',scopes=ARRAY['https://www.googleapis.com/auth/webmasters.readonly'] WHERE id=$1::uuid",[conn]);
 await db.unsafe("UPDATE cvi_organization_memberships SET status='active',revoked_at=NULL WHERE id=$1::uuid",[member]);
 await db.unsafe("UPDATE cvi_site_read_grants SET status='active',revoked_at=NULL WHERE id=$1::uuid",[grant]);
 const principal={
   sessionId:session,subject:"cvi-nonce-subject",email:"nonce@example.test",
   displayName:null,role:"viewer" as const,csrfTokenHash:"f".repeat(64),
   issuedAt:"2026-10-10T00:00:00.000Z",
   lastSeenAt:"2026-10-10T00:01:00.000Z",
   expiresAt:"2099-01-01T00:00:00.000Z",
 };
 const request={acquisitionId:"cvi-1c15-acq-1",principal,now:"2026-10-10T12:00:00.000Z"};
 assert.deepEqual(await resolver(request),{tenantId:org,siteId:site,connectionId:conn});
 assert.equal(await resolver({...request,acquisitionId:"missing"}),null);
 assert.equal(await resolver({...request,principal:{...principal,sessionId:"ffffffff-ffff-4fff-8fff-ffffffffffff"}}),null);
 assert.equal(await resolver({...request,principal:{...principal,subject:"intruder"}}),null);
 await db.unsafe("UPDATE cvi_site_read_grants SET status='revoked',revoked_at=now() WHERE id=$1::uuid",[grant]);
 assert.equal(await resolver(request),null,"revoked site grant denies scope resolution");
 await db.unsafe("UPDATE cvi_site_read_grants SET status='active',revoked_at=NULL WHERE id=$1::uuid",[grant]);
 await db.unsafe("UPDATE cvi_organization_memberships SET status='revoked',revoked_at=now() WHERE id=$1::uuid",[member]);
 assert.equal(await resolver(request),null,"revoked organization membership denies scope");
 await db.unsafe("UPDATE cvi_organization_memberships SET status='active',revoked_at=NULL WHERE id=$1::uuid",[member]);
 await db.unsafe("UPDATE auth_sessions SET revoked_at=now() WHERE id=$1::uuid",[session]);
 assert.equal(await resolver(request),null,"revoked auth session denies scope");
 await db.unsafe("UPDATE auth_sessions SET revoked_at=NULL WHERE id=$1::uuid",[session]);
 await db.unsafe("UPDATE connections SET status='revoked' WHERE id=$1::uuid",[conn]);
 assert.equal(await resolver(request),null,"revoked Google connection denies scope");
 await db.unsafe("UPDATE connections SET status='connected' WHERE id=$1::uuid",[conn]);
});
