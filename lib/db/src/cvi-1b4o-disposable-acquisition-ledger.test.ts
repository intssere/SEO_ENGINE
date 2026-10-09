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
