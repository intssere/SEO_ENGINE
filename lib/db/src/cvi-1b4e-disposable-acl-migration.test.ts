import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const core = fileURLToPath(new URL("../migrations/0001_core.sql", import.meta.url));
const migration = fileURLToPath(new URL("../migrations/0012_cvi_tenant_site_acl_draft.sql", import.meta.url));
const authMigration = fileURLToPath(new URL("../migrations/0002_auth.sql", import.meta.url));
const databaseName = "seo_engine_cvi_disposable";
function verifiedDatabaseUrl(): string | null {
  const raw = process.env.CVI_1B4E_DISPOSABLE_DATABASE_URL;
  if (!raw) return null;
  const url = new URL(raw);
  if (!["localhost", "127.0.0.1"].includes(url.hostname)
    || url.pathname !== `/${databaseName}`
    || url.protocol !== "postgres:"
    || url.search || url.hash || url.username !== "postgres") {
    throw new Error("cvi_1b4e_disposable_database_url_not_allowed");
  }
  return raw;
}
test("CVI-1B.4E actual ACL foreign keys and revocation work in isolated disposable PostgreSQL", async t => {
  const url = verifiedDatabaseUrl();
  if (!url) { t.skip("explicit disposable CI database URL not configured"); return; }
  const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 8, idle_timeout: 2 });
  t.after(async () => { await sql.end({ timeout: 1 }); });
  const count = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
  `;
  assert.equal(count[0]?.count, 0, "the disposable database must be empty");
  await sql.unsafe(await readFile(core, "utf8"));
  const coreCount = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
  `;
  assert.equal(coreCount[0]?.count, 29);
  await sql.unsafe(await readFile(authMigration, "utf8"));
  await sql.unsafe(await readFile(migration, "utf8"));
  const current = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
  `;
  assert.equal(current[0]?.count, 34);
  const seed = await sql<{ id: string }[]>`
    INSERT INTO organizations (name,slug) VALUES ('CVI A','cvi-disposable-a') RETURNING id
  `;
  const other = await sql<{ id: string }[]>`
    INSERT INTO organizations (name,slug) VALUES ('CVI B','cvi-disposable-b') RETURNING id
  `;
  const orgA = seed[0]!.id, orgB = other[0]!.id;
  const sitesA = await sql<{ id: string }[]>`
    INSERT INTO sites (organization_id,name,domain,canonical_origin)
    VALUES (${orgA}::uuid,'CVI A','a.cvi.test','https://a.cvi.test') RETURNING id
  `;
  const sitesB = await sql<{ id: string }[]>`
    INSERT INTO sites (organization_id,name,domain,canonical_origin)
    VALUES (${orgB}::uuid,'CVI B','b.cvi.test','https://b.cvi.test') RETURNING id
  `;
  const member = await sql<{ id: string; status: string }[]>`
    INSERT INTO cvi_organization_memberships
      (organization_id,auth_subject,member_role,effective_at)
    VALUES (${orgA}::uuid,'cvi-subject-a','viewer','2026-10-08T00:00:00Z')
    RETURNING id,status
  `;
  assert.equal(member[0]?.status, "revoked");
  const membershipId = member[0]!.id;
  const defaultGrant = await sql<{ id: string; status: string }[]>`
    INSERT INTO cvi_site_read_grants
      (organization_membership_id,organization_id,site_id,permission,effective_at)
    VALUES (${membershipId}::uuid,${orgA}::uuid,${sitesA[0]!.id}::uuid,'read_evidence','2026-10-08T00:00:00Z')
    RETURNING id,status
  `;
  assert.equal(defaultGrant[0]?.status, "revoked");
  await assert.rejects(sql`
    INSERT INTO cvi_site_read_grants
      (organization_membership_id,organization_id,site_id,permission,effective_at)
    VALUES (${membershipId}::uuid,${orgA}::uuid,${sitesB[0]!.id}::uuid,'read_evidence','2026-10-08T00:00:00Z')
  `, /foreign key/i);
  await assert.rejects(sql`
    INSERT INTO cvi_site_read_grants
      (organization_membership_id,organization_id,site_id,permission,effective_at)
    VALUES (${membershipId}::uuid,${orgB}::uuid,${sitesB[0]!.id}::uuid,'read_evidence','2026-10-08T00:00:00Z')
  `, /foreign key/i);
  await sql`
    UPDATE cvi_organization_memberships
    SET status='active',revoked_at=NULL WHERE id=${membershipId}::uuid
  `;
  await sql`
    UPDATE cvi_site_read_grants
    SET status='active',revoked_at=NULL WHERE id=${defaultGrant[0]!.id}::uuid
  `;
  const live = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM cvi_site_read_grants g
    JOIN cvi_organization_memberships m
      ON m.id=g.organization_membership_id AND m.organization_id=g.organization_id
    JOIN sites s ON s.id=g.site_id AND s.organization_id=g.organization_id
    WHERE g.status='active' AND m.status='active'
      AND g.permission='read_evidence' AND g.site_id=${sitesA[0]!.id}::uuid
  `;
  assert.equal(live[0]?.count, 1);
  await sql`
    UPDATE cvi_organization_memberships
    SET status='revoked',revoked_at=now() WHERE id=${membershipId}::uuid
  `;
  const afterRevocation = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM cvi_site_read_grants g
    JOIN cvi_organization_memberships m
      ON m.id=g.organization_membership_id AND m.organization_id=g.organization_id
    WHERE g.status='active' AND m.status='active' AND g.site_id=${sitesA[0]!.id}::uuid
  `;
  assert.equal(afterRevocation[0]?.count, 0);
  await assert.rejects(sql`
    UPDATE cvi_site_read_grants SET status='revoked',revoked_at=NULL
    WHERE id=${defaultGrant[0]!.id}::uuid
  `, /check constraint/i);
});


test("CVI-1B.4F audit rows reject UPDATE, DELETE and TRUNCATE in disposable PostgreSQL", async t => {
  const url = verifiedDatabaseUrl();
  if (!url) { t.skip("explicit disposable CI database URL not configured"); return; }
  const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 8, idle_timeout: 2 });
  t.after(async () => { await sql.end({ timeout: 1 }); });
  const count = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
  `;
  assert.equal(count[0]?.count, 34, "base ACL certification must run first");
  const path = fileURLToPath(new URL("../migrations/0013_cvi_acl_audit_immutability_draft.sql", import.meta.url));
  await sql.unsafe(await readFile(path, "utf8"));
  const inserted = await sql<{ id: string }[]>`
    INSERT INTO cvi_tenant_authorization_audit
      (auth_subject,event_kind,outcome,correlation_id,evidence_fingerprint,occurred_at)
    VALUES ('cvi-subject-a','access_denied','denied','cvi-disposable-proof',${"a".repeat(64)},'2026-10-08T12:00:00Z')
    RETURNING id
  `;
  const id = inserted[0]!.id;
  await assert.rejects(sql`
    UPDATE cvi_tenant_authorization_audit SET correlation_id='tampered'
    WHERE id=${id}::uuid
  `, /cvi_authorization_audit_is_immutable/);
  await assert.rejects(sql`
    DELETE FROM cvi_tenant_authorization_audit WHERE id=${id}::uuid
  `, /cvi_authorization_audit_is_immutable/);
  await assert.rejects(sql.unsafe("TRUNCATE cvi_tenant_authorization_audit"),
    /cvi_authorization_audit_is_immutable/);
  const retained = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM cvi_tenant_authorization_audit
    WHERE id=${id}::uuid AND correlation_id='cvi-disposable-proof'
  `;
  assert.equal(retained[0]?.count, 1);
});


test("CVI-1B.4G concurrent membership revocation invalidates later read", async t => {
  const url = verifiedDatabaseUrl();
  if (!url) { t.skip("explicit disposable CI database URL not configured"); return; }
  const reader = postgres(url, { max: 1, prepare: false, connect_timeout: 8, idle_timeout: 2 });
  const writer = postgres(url, { max: 1, prepare: false, connect_timeout: 8, idle_timeout: 2 });
  t.after(async () => { await reader.end({ timeout: 1 }); await writer.end({ timeout: 1 }); });
  const org = await writer<{ id: string }[]>`INSERT INTO organizations (name,slug) VALUES ('CVI concurrency', 'cvi-concurrency-a') RETURNING id`;
  const organizationId = org[0]!.id;
  const sites = await writer<{ id: string }[]>`INSERT INTO sites (organization_id,name,domain,canonical_origin)
    VALUES (${organizationId}::uuid, 'Concurrency','concurrency.cvi.test','https://concurrency.cvi.test') RETURNING id`;
  const siteId = sites[0]!.id;
  const membership = await writer<{ id: string }[]>`INSERT INTO cvi_organization_memberships
    (organization_id,auth_subject,member_role,status,effective_at,revoked_at)
    VALUES (${organizationId}::uuid,'cvi-concurrency-subject','viewer','active','2026-10-08T00:00:00Z',NULL) RETURNING id`;
  const memberId = membership[0]!.id;
  const grant = await writer<{ id: string }[]>`INSERT INTO cvi_site_read_grants
    (organization_membership_id,organization_id,site_id,permission,status,effective_at,revoked_at)
    VALUES (${memberId}::uuid,${organizationId}::uuid,${siteId}::uuid,'read_evidence','active','2026-10-08T00:00:00Z',NULL) RETURNING id`;

  let unlock!: () => void, signal!: () => void;
  const locked = new Promise<void>(resolve => { signal = resolve; });
  const release = new Promise<void>(resolve => { unlock = resolve; });
  const holder = reader.begin(async tx => {
    const current = await tx<{ count: number }[]>`SELECT COUNT(*)::int AS count
      FROM cvi_organization_memberships m JOIN cvi_site_read_grants g
      ON g.organization_membership_id=m.id AND g.organization_id=m.organization_id
      WHERE m.id=${memberId}::uuid AND m.status='active' AND g.status='active'
      AND g.site_id=${siteId}::uuid AND g.permission='read_evidence'`;
    assert.equal(current[0]?.count, 1);
    await tx`SELECT id FROM cvi_organization_memberships WHERE id=${memberId}::uuid FOR UPDATE`;
    signal();
    await release;
  });
  try {
    await locked;
    const revocation = writer<{ status: string }[]>`UPDATE cvi_organization_memberships
      SET status='revoked',revoked_at=now()
      WHERE id=${memberId}::uuid RETURNING status`;
    const committed = Promise.resolve(revocation).then(rows => assert.equal(rows[0]?.status, "revoked"));
    unlock();
    await holder;
    await committed;
    const fresh = await reader<{ count: number }[]>`SELECT COUNT(*)::int AS count
      FROM cvi_organization_memberships m JOIN cvi_site_read_grants g
      ON g.organization_membership_id=m.id AND g.organization_id=m.organization_id
      WHERE m.id=${memberId}::uuid AND m.status='active' AND g.status='active'
      AND g.site_id=${siteId}::uuid AND g.permission='read_evidence'`;
    assert.equal(fresh[0]?.count, 0);
    const retained = await reader<{ count: number }[]>`SELECT COUNT(*)::int AS count
      FROM cvi_site_read_grants WHERE id=${grant[0]!.id}::uuid`;
    assert.equal(retained[0]?.count, 1);
  } finally {
    unlock();
    await holder.catch(() => undefined);
  }
});

test("CVI-1B.4G independent site grant revocation prevents a fresh active-grant lookup", async t => {
  const url = verifiedDatabaseUrl();
  if (!url) { t.skip("explicit disposable CI database URL not configured"); return; }
  const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 8, idle_timeout: 2 });
  t.after(async () => { await sql.end({ timeout: 1 }); });
  const before = await sql<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM cvi_site_read_grants WHERE status='active'`;
  assert.ok(before[0]!.count > 0);
  await sql`UPDATE cvi_site_read_grants SET status='revoked',revoked_at=now() WHERE status='active'`;
  const after = await sql<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM cvi_site_read_grants WHERE status='active'`;
  assert.equal(after[0]?.count, 0);
});
