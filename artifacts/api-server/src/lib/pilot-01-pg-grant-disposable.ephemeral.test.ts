/**
 * RT01-A3b: only synthetic, newly provisioned localhost PostgreSQL.
 * Without BOTH explicit environment sentinels this suite is skipped with zero IO.
 * NEVER point at Railway, staging, restored, customer or Production databases.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { DisposablePgGrantAdapter } from "./pilot-01-pg-grant-disposable.js";
import { rehearseTrustedGrantConsumption, type VerifiedGrantContext } from "./pilot-01-trusted-grant-contract.js";

const armed = process.env.PILOT01_DISPOSABLE_PG === "I_ACKNOWLEDGE_DISPOSABLE_ONLY" &&
  Boolean(process.env.PILOT01_DISPOSABLE_DATABASE_URL);
function disposableUrl(): string {
  if (!armed) throw Error("DISPOSABLE_EXPLICIT_ACK_REQUIRED");
  const u = new URL(process.env.PILOT01_DISPOSABLE_DATABASE_URL!);
  if (!["postgres:", "postgresql:"].includes(u.protocol) ||
    !/^pilot01_disposable_[a-z0-9_]+$/.test(u.pathname.slice(1)) ||
    !/^(127\.0\.0\.1|localhost|\[::1\]|::1)$/.test(u.hostname) ||
    /railway|neon|production|diamondshelf|supabase/i.test(u.host + " " + u.pathname) ||
    u.username !== "postgres") throw Error("REFUSE_NONLOCAL_OR_NONDISPOSABLE_DATABASE");
  return u.toString();
}
const c: VerifiedGrantContext = {
  actorId: "synthetic-actor", tenantId: "synthetic-tenant",
  siteId: "synthetic-site", issuerId: "synthetic-issuer",
  sessionId: "mock-session", role: "admin", source: "server_verified_session",
};
const intent = { grantId: "g1", operation: "analyze" as const };
type Sql = ReturnType<typeof postgres>;
async function fixture(fn: (f: {
  sql: Sql; adapter: DisposablePgGrantAdapter; schema: string;
  reset: (id?: string, expires?: string) => Promise<void>;
}) => Promise<void>) {
  const sql = postgres(disposableUrl(), { max: 5, prepare: false, connect_timeout: 3 });
  const schema = "pilot01_test_" + randomUUID().replace(/-/g, "");
  const ident = '"' + schema + '"';
  try {
    await sql.unsafe("CREATE SCHEMA " + ident);
    await sql.unsafe(`CREATE TABLE ${ident}.grants (
      grant_id text PRIMARY KEY, state text NOT NULL DEFAULT 'issued'
      CHECK (state IN ('issued','consumed','revoked')),
      tenant_id text NOT NULL, site_id text NOT NULL,
      actor_id text NOT NULL, issuer_id text NOT NULL,
      operation text NOT NULL CHECK (operation IN ('analyze','recommend')),
      expires_at timestamptz NOT NULL,
      consumed_at timestamptz, revoked_at timestamptz)`);
    await sql.unsafe(`CREATE TABLE ${ident}.audit (
      receipt_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      grant_id text NOT NULL REFERENCES ${ident}.grants(grant_id),
      event text NOT NULL CHECK (event IN ('consumed','revoked')),
      actor_id text NOT NULL, tenant_id text NOT NULL, site_id text NOT NULL,
      issuer_id text NOT NULL, operation text NOT NULL,
      transaction_id text NOT NULL, committed_at timestamptz NOT NULL,
      UNIQUE(grant_id))`);
    const reset = async (id = "g1", expires = "1 hour") => {
      if (!["1 hour", "-1 second"].includes(expires)) throw Error("FIXTURE_TTL_ONLY");
      await sql.unsafe(
        `INSERT INTO ${ident}.grants
         (grant_id,tenant_id,site_id,actor_id,issuer_id,operation,expires_at)
         VALUES ($1,$2,$3,$4,$5,'analyze',clock_timestamp() + $6::interval)`,
        [id, c.tenantId, c.siteId, c.actorId, c.issuerId, expires],
      );
    };
    await reset();
    await fn({ sql, schema: ident, adapter: new DisposablePgGrantAdapter(sql, schema), reset });
  } finally {
    try { await sql.unsafe("DROP SCHEMA IF EXISTS " + ident + " CASCADE"); }
    finally { await sql.end({ timeout: 3 }); }
  }
}
test("RT01-A3b disposable: two independent sessions consume once, single durable receipt", { skip: !armed }, async () => {
  await fixture(async ({ sql, adapter, schema }) => {
    const secondPool = postgres(disposableUrl(), { max: 2, prepare: false, connect_timeout: 3 });
    try {
      const second = new DisposablePgGrantAdapter(secondPool, schema.slice(1,-1));
      const [a,b] = await Promise.all([adapter.consume({ context: c, intent }), second.consume({ context: c, intent })]);
      assert.deepEqual([a.status,b.status].sort(), ["consumed","denied"]);
      const rows = await sql.unsafe(`SELECT count(*)::int AS n FROM ${schema}.audit WHERE grant_id='g1'`);
      assert.equal(rows[0].n, 1);
      assert.equal((await adapter.consume({ context:c,intent })).status,"denied");
      const success = a.status === "consumed" ? a : b;
      if (success.status === "consumed") {
        assert.equal(success.receipt.actorId, c.actorId);
        assert.ok(success.receipt.transactionId);
        assert.ok(success.receipt.receiptId);
      }
      // Fresh adapter and connection pool cannot revive a consumed grant.
      assert.equal((await second.consume({ context:c,intent })).status,"denied");
    } finally { await secondPool.end({ timeout: 3 }); }
  });
});

test("RT01-A3b disposable: consume versus revoke commits exactly one terminal receipt", { skip: !armed }, async () => {
  await fixture(async ({ sql, adapter, schema }) => {
    const secondPool = postgres(disposableUrl(), { max: 2, prepare: false, connect_timeout: 3 });
    try {
      const second = new DisposablePgGrantAdapter(secondPool, schema.slice(1,-1));
      const [consume,revoke] = await Promise.all([
        adapter.consume({ context:c,intent }), second.revoke(intent.grantId,c),
      ]);
      assert.equal(Number(consume.status === "consumed") + Number(revoke === "revoked"), 1);
      const rows = await sql.unsafe(`SELECT state FROM ${schema}.grants WHERE grant_id='g1'`);
      const receipts = await sql.unsafe(`SELECT event FROM ${schema}.audit WHERE grant_id='g1'`);
      assert.equal(receipts.length,1);
      assert.equal(receipts[0].event,rows[0].state);
      assert.equal((await adapter.consume({ context:c,intent })).status,"denied");
      assert.equal(await second.revoke(intent.grantId,c),"denied");
    } finally { await secondPool.end({ timeout: 3 }); }
  });
});

test("RT01-A3b disposable: mismatched identity, operation, expired grant and no role deny", { skip: !armed }, async () => {
  await fixture(async ({ adapter, sql, schema, reset }) => {
    const mismatches: VerifiedGrantContext[] = [
      { ...c,actorId:"other" }, { ...c,tenantId:"other" }, { ...c,siteId:"other" },
      { ...c,issuerId:"other" }, { ...c,role:"viewer" } as unknown as VerifiedGrantContext,
    ];
    for (const context of mismatches) {
      assert.equal((await adapter.consume({ context,intent })).status,"denied");
    }
    assert.equal((await adapter.consume({context:c,intent:{...intent,operation:"recommend"}})).status,"denied");
    assert.equal((await adapter.consume({context:c,intent:{...intent,operation:"site_write"} as unknown as typeof intent})).status,"denied");
    assert.equal(await adapter.revoke("g1",{...c,role:"analyst"}),"denied");
    await reset("expired","-1 second");
    assert.equal((await adapter.consume({context:c,intent:{...intent,grantId:"expired"}})).status,"denied");
    const rows = await sql.unsafe(`SELECT count(*)::int AS n FROM ${schema}.audit`);
    assert.equal(rows[0].n,0);
  });
});

test("RT01-A3b disposable: audit failure atomically rolls back consume and revoke", { skip: !armed }, async () => {
  await fixture(async ({ sql, adapter, schema }) => {
    // Fixture-only constraint enforces failed audit writes (no runtime mutation).
    await sql.unsafe(`ALTER TABLE ${schema}.audit ADD CONSTRAINT refuse_audit CHECK (false)`);
    assert.equal((await adapter.consume({context:c,intent})).status,"unavailable");
    assert.equal(await adapter.revoke(intent.grantId,c),"unavailable");
    let row = await sql.unsafe(`SELECT state FROM ${schema}.grants WHERE grant_id='g1'`);
    assert.equal(row[0].state,"issued");
    let audit = await sql.unsafe(`SELECT count(*)::int AS n FROM ${schema}.audit`);
    assert.equal(audit[0].n,0);
    await sql.unsafe(`ALTER TABLE ${schema}.audit DROP CONSTRAINT refuse_audit`);
    assert.equal((await adapter.consume({context:c,intent})).status,"consumed");
    row = await sql.unsafe(`SELECT state FROM ${schema}.grants WHERE grant_id='g1'`);
    audit = await sql.unsafe(`SELECT count(*)::int AS n FROM ${schema}.audit`);
    assert.equal(row[0].state,"consumed");
    assert.equal(audit[0].n,1);
  });
});

test("RT01-A3b disposable: guarded receipt contract validates persisted result, no dispatch", { skip: !armed }, async () => {
  await fixture(async ({adapter}) => {
    const result = await rehearseTrustedGrantConsumption(intent,{async resolve(){return c;}},adapter);
    assert.equal(result.status,"consumed");
    const replay = await rehearseTrustedGrantConsumption(intent,{async resolve(){return c;}},adapter);
    assert.equal(replay.status,"denied");
  });
});

test("RT01-A3b: no arming flags means zero database I/O", () => {
  if (!armed) assert.throws(()=>disposableUrl(),/DISPOSABLE_EXPLICIT_ACK_REQUIRED/);
});
