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
