import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import express from "express";
import cookieParser from "cookie-parser";
import postgres from "postgres";
import { attachAuthSession, requireApiAuthentication } from "../middlewares/auth-security.js";
import { AUTH_SESSION_COOKIE, AUTH_IDLE_TTL_MS, AUTH_SESSION_TTL_MS, createAuthSession, loadAuthConfig, loadAuthSession, revokeAuthSession, rotateAuthSessionToken, sha256 } from "./auth-foundation.js";
import { reviewCviExpressAuthenticatedPrincipal } from "./cvi-gsc-express-auth-gate.js";

const EXPECTED_DB = "seo_engine_cvi_disposable";
function disposableUrl(): string | null {
  const raw = process.env.CVI_1B4E_DISPOSABLE_DATABASE_URL;
  if (!raw) return null;
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("cvi_1c27_invalid_disposable_url"); }
  if (url.protocol !== "postgres:" || url.hostname !== "127.0.0.1" ||
      url.pathname !== "/" + EXPECTED_DB || url.username !== "postgres" ||
      url.search || url.hash || url.port !== "5432") {
    throw new Error("cvi_1c27_disposable_database_url_not_allowed");
  }
  if (process.env.DATABASE_URL?.trim()) throw new Error("cvi_1c27_inherited_database_url_forbidden");
  return raw;
}
const AUTH_ENV: Record<string,string> = {
  AUTH_ENFORCEMENT_ENABLED: "true",
  AUTH_PUBLIC_ORIGIN: "http://127.0.0.1",
  AUTH_GOOGLE_CLIENT_ID: "synthetic-only.apps.googleusercontent.com",
  AUTH_GOOGLE_CLIENT_SECRET: "synthetic-only-never-sent",
  AUTH_SESSION_SECRET: "cvi-1c27-disposable-session-secret-only-0123456789abcdef",
  AUTH_ADMIN_EMAILS: "synthetic-admin@example.test",
  AUTH_VIEWER_EMAILS: "synthetic-viewer@example.test",
};
test("CVI-1C.27 real disposable PostgreSQL sessions authenticate only trusted HTTP cookies", async t => {
  const raw = disposableUrl();
  if (!raw) { t.skip("explicit disposable database not configured"); return; }
  const previous = new Map<string,string|undefined>();
  for (const key of [...Object.keys(AUTH_ENV), "DATABASE_URL"]) previous.set(key, process.env[key]);
  const sql = postgres(raw, {max:1,prepare:false,connect_timeout:5});
  let server: ReturnType<typeof createServer> | undefined;
  try {
    const identity = await sql<{current_database:string;inet_server_addr:string|null}[]>`
      SELECT current_database(), inet_server_addr()::text AS inet_server_addr`;
    assert.equal(identity[0]?.current_database, EXPECTED_DB);
    // Dockerized PostgreSQL may report its container IP; the URL is already restricted to runner localhost.
    const tables = await sql<{name:string|null}[]>`
      SELECT to_regclass('public.auth_sessions')::text AS name`;
    assert.equal(tables[0]?.name, "auth_sessions");
    for (const [key,value] of Object.entries(AUTH_ENV)) process.env[key] = value;
    process.env.DATABASE_URL = raw;
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use(attachAuthSession);
    const api = express.Router();
    api.use(requireApiAuthentication);
    api.get("/cvi-offline-probe",(req,res) => {
      const verdict = reviewCviExpressAuthenticatedPrincipal({
        req,config:loadAuthConfig(),evaluatedAt:new Date().toISOString(),
      });
      res.status(verdict.status === "DENY" ? 403 : 200).json({
        status:verdict.status,
        subject:verdict.status === "DENY" ? null : verdict.principal.subject,
        execution_authorized:false,
        publication_authorized:false,
        tenant_authorized:false,
      });
    });
    api.post("/cvi-offline-probe",(_req,res) => res.status(200).json({csrf:"accepted",publication_authorized:false}));
    // CVI-1C.41: synthetic barrier after entry authorization, before handler action.
    let barrierArrived: (()=>void)|undefined;
    let barrierRelease: (()=>void)|undefined;
    const arrived = new Promise<void>(resolve=>{barrierArrived=resolve;});
    const release = new Promise<void>(resolve=>{barrierRelease=resolve;});
    api.post("/cvi-role-barrier",async (req,res)=>{
      barrierArrived?.();
      await release;
      res.status(200).json({role_snapshot:req.auth?.role??null,synthetic_only:true});
    });
    app.use("/api",api);
    server = createServer(app);
    await new Promise<void>((resolve,reject) => {
      server!.once("error",reject);
      server!.listen(0,"127.0.0.1",resolve);
    });
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const url = "http://127.0.0.1:" + address.port + "/api/cvi-offline-probe";
    async function request(token?:string, options?:{method?:string;csrf?:string;headers?:Record<string,string>}) {
      const headers:Record<string,string> = {...options?.headers};
      if (token) headers.cookie = AUTH_SESSION_COOKIE + "=" + token;
      if (options?.csrf) headers["x-csrf-token"] = options.csrf;
      const response = await fetch(url,{method:options?.method??"GET",headers,signal:AbortSignal.timeout(5000)});
      return {status:response.status,body:await response.json() as Record<string,unknown>};
    }
    const config = loadAuthConfig();
    assert.equal(config.configured,true);
    const a = await createAuthSession({subject:"cvi-synthetic-a",email:"synthetic-viewer@example.test",displayName:null,role:"viewer",config});
    const b = await createAuthSession({subject:"cvi-synthetic-b",email:"synthetic-admin@example.test",displayName:null,role:"admin",config});
    assert.equal((await request()).status,401);
    assert.equal((await request("forged",{headers:{"x-auth-subject":"cvi-synthetic-a"}})).status,401);
    const valid = await request(a.token,{headers:{"x-auth-subject":"cvi-synthetic-b"}});
    assert.equal(valid.status,200);
    assert.equal(valid.body.status,"AUTH_CONTEXT_PRESENT_REVIEW_ONLY");
    assert.equal(valid.body.subject,"cvi-synthetic-a");
    assert.equal(valid.body.tenant_authorized,false);
    assert.equal(valid.body.execution_authorized,false);
    assert.equal(valid.body.publication_authorized,false);
    assert.equal((await request(b.token)).body.subject,"cvi-synthetic-b");
    assert.equal((await request(a.token,{method:"POST"})).status,403);
    assert.equal((await request(a.token,{method:"POST",csrf:"forged"})).status,403);
    assert.equal((await request(a.token,{method:"POST",csrf:a.csrfToken})).status,403); // viewer cannot mutate
    assert.equal((await request(b.token,{method:"POST",csrf:b.csrfToken})).status,200);
    await sql`UPDATE auth_sessions SET expires_at=now()-interval '1 second' WHERE id=${a.principal.sessionId}::uuid`;
    assert.equal((await request(a.token)).status,401);
    const idle = await createAuthSession({subject:"cvi-idle",email:"synthetic-viewer@example.test",displayName:null,role:"viewer",config});
    await sql`UPDATE auth_sessions SET last_seen_at=now()-interval '40 minutes' WHERE id=${idle.principal.sessionId}::uuid`;
    assert.equal((await request(idle.token)).status,401);
    const rotated = await rotateAuthSessionToken(b.principal.sessionId);
    assert.equal((await request(b.token)).status,401);
    assert.equal((await request(rotated)).status,200);
    // CVI-1C.40: fresh authorization must honor persisted demotion/promotion.
    const demoted=await createAuthSession({
      subject:"cvi-role-change",email:"synthetic-admin@example.test",
      displayName:null,role:"admin",config,
    });
    assert.equal((await request(demoted.token,{method:"POST",csrf:demoted.csrfToken})).status,200);
    await sql`UPDATE auth_sessions SET role='viewer' WHERE id=${demoted.principal.sessionId}::uuid`;
    assert.equal((await request(demoted.token,{method:"POST",csrf:demoted.csrfToken})).status,403,
      "persisted demotion denies previously authorized session");
    const demotedToken=await rotateAuthSessionToken(demoted.principal.sessionId);
    assert.equal((await request(demoted.token)).status,401);
    assert.equal((await request(demotedToken,{method:"POST",csrf:demoted.csrfToken})).status,403,
      "rotation cannot restore a demoted role");
    await sql`UPDATE auth_sessions SET role='admin' WHERE id=${demoted.principal.sessionId}::uuid`;
    assert.equal((await request(demotedToken,{method:"POST",csrf:demoted.csrfToken})).status,200,
      "authorized role updates are read from DB on each authenticated request");
    // CVI-1C.41 documents an entry-authorized in-flight request's stale snapshot.
    const inFlight=await createAuthSession({
      subject:"cvi-inflight-role",email:"synthetic-admin@example.test",
      displayName:null,role:"admin",config,
    });
    const pendingBarrier=fetch("http://127.0.0.1:"+address.port+"/api/cvi-role-barrier",{
      method:"POST",headers:{cookie:AUTH_SESSION_COOKIE+"="+inFlight.token,
        "x-csrf-token":inFlight.csrfToken},signal:AbortSignal.timeout(5000),
    });
    await Promise.race([
      arrived,
      new Promise<never>((_,reject)=>setTimeout(()=>reject(Error("role_barrier_not_reached")),3000)),
    ]);
    await sql`UPDATE auth_sessions SET role='viewer' WHERE id=${inFlight.principal.sessionId}::uuid`;
    barrierRelease?.();
    const barrierResponse=await pendingBarrier;
    assert.equal(barrierResponse.status,200,"existing middleware authorizes at entry");
    const barrierBody=await barrierResponse.json() as {role_snapshot:string};
    assert.equal(barrierBody.role_snapshot,"admin","in-flight principal remains a snapshot");
    assert.equal((await request(inFlight.token,{method:"POST",csrf:inFlight.csrfToken})).status,403,
      "new requests observe persisted demotion");
    // CVI-1C.42: operation-scoped role readback under a PostgreSQL row lock.
    // This is a synthetic operation, not a replacement for production route checks.
    const fenced=await createAuthSession({
      subject:"cvi-transaction-role",email:"synthetic-admin@example.test",
      displayName:null,role:"admin",config,
    });
    const authorizationConnection=postgres(raw,{max:1,prepare:false,connect_timeout:5});
    try {
      await sql`UPDATE auth_sessions SET role='viewer' WHERE id=${fenced.principal.sessionId}::uuid`;
      let syntheticWrites=0;
      await authorizationConnection.begin(async transaction=>{
        const rows=await transaction<{role:string}[]>`
          SELECT role FROM auth_sessions WHERE id=${fenced.principal.sessionId}::uuid
            AND revoked_at IS NULL AND expires_at>clock_timestamp()
            AND last_seen_at>clock_timestamp()-${AUTH_IDLE_TTL_MS}::bigint * interval '1 millisecond'
          FOR UPDATE`;
        if(rows[0]?.role==="admin") syntheticWrites++;
      });
      assert.equal(syntheticWrites,0,"committed demotion denies fenced synthetic operation");
      await sql`UPDATE auth_sessions SET role='admin' WHERE id=${fenced.principal.sessionId}::uuid`;
      await authorizationConnection.begin(async transaction=>{
        const rows=await transaction<{role:string}[]>`
          SELECT role FROM auth_sessions WHERE id=${fenced.principal.sessionId}::uuid
            AND revoked_at IS NULL AND expires_at>clock_timestamp()
            AND last_seen_at>clock_timestamp()-${AUTH_IDLE_TTL_MS}::bigint * interval '1 millisecond'
          FOR UPDATE`;
        if(rows[0]?.role==="admin") syntheticWrites++;
      });
      assert.equal(syntheticWrites,1,"active admin is allowed one synthetic fenced operation");
    }finally{
      await authorizationConnection.end({timeout:1});
    }
    // CVI-1C.43: committed demotion wins over a blocked operation's role read.
    const ordered=await createAuthSession({
      subject:"cvi-ordered-demotion",email:"synthetic-admin@example.test",
      displayName:null,role:"admin",config,
    });
    const demoter=postgres(raw,{max:1,prepare:false,connect_timeout:5});
    const operation=postgres(raw,{max:1,prepare:false,connect_timeout:5});
    try {
      await demoter.unsafe("BEGIN");
      let pending:Promise<string>|undefined;
      try {
        await demoter`UPDATE auth_sessions SET role='viewer'
          WHERE id=${ordered.principal.sessionId}::uuid`;
        pending=operation.begin(async tx=>{
          const rows=await tx<{role:string}[]>`
            SELECT role FROM auth_sessions
            WHERE id=${ordered.principal.sessionId}::uuid AND revoked_at IS NULL
              AND expires_at>clock_timestamp()
              AND last_seen_at>clock_timestamp()-${AUTH_IDLE_TTL_MS}::bigint * interval '1 millisecond'
            FOR UPDATE`;
          return rows[0]?.role??"missing";
        });
        let sawWait=false;
        for(let attempt=0;attempt<80;attempt++){
          const blocked=await sql<{count:number}[]>`
            SELECT count(*)::int AS count FROM pg_stat_activity
            WHERE datname=current_database() AND wait_event_type='Lock'
              AND pid<>pg_backend_pid()`;
          if((blocked[0]?.count??0)>0){sawWait=true;break;}
          await new Promise(resolve=>setTimeout(resolve,30));
        }
        assert.ok(sawWait,"operation must wait behind role demotion lock");
        await demoter.unsafe("COMMIT");
        assert.equal(await pending,"viewer","fenced operation observes committed demotion");
        pending=undefined;
        assert.equal((await request(ordered.token,{method:"POST",csrf:ordered.csrfToken})).status,403);
      }finally{
        await demoter.unsafe("ROLLBACK").catch(()=>undefined);
        if(pending)await pending.catch(()=>undefined);
      }
    }finally{
      await demoter.end({timeout:1});
      await operation.end({timeout:1});
    }
    // CVI-1C.44: operation's session lock precedes a competing demotion.
    const first=await createAuthSession({
      subject:"cvi-operation-first",email:"synthetic-admin@example.test",
      displayName:null,role:"admin",config,
    });
    const firstOperation=postgres(raw,{max:1,prepare:false,connect_timeout:5});
    const secondDemoter=postgres(raw,{max:1,prepare:false,connect_timeout:5});
    try {
      await firstOperation.unsafe("BEGIN");
      let demotion:Promise<unknown>|undefined;
      try {
        const role=await firstOperation<{role:string}[]>`
          SELECT role FROM auth_sessions WHERE id=${first.principal.sessionId}::uuid
            AND revoked_at IS NULL AND expires_at>clock_timestamp()
            AND last_seen_at>clock_timestamp()-${AUTH_IDLE_TTL_MS}::bigint * interval '1 millisecond'
          FOR UPDATE`;
        assert.equal(role[0]?.role,"admin","operation acquires eligible admin session lock");
        demotion=Promise.resolve(secondDemoter`UPDATE auth_sessions SET role='viewer'
          WHERE id=${first.principal.sessionId}::uuid`);
        let blocked=false;
        for(let attempt=0;attempt<80;attempt++){
          const locks=await sql<{count:number}[]>`
            SELECT count(*)::int AS count FROM pg_stat_activity
            WHERE datname=current_database() AND wait_event_type='Lock'
              AND pid<>pg_backend_pid()`;
          if((locks[0]?.count??0)>0){blocked=true;break;}
          await new Promise(resolve=>setTimeout(resolve,30));
        }
        assert.ok(blocked,"demotion must wait for authorized operation's lock");
        // The synthetic operation makes no real data mutation or provider call.
        await firstOperation.unsafe("COMMIT");
        await demotion;
        demotion=undefined;
        assert.equal((await request(first.token,{method:"POST",csrf:first.csrfToken})).status,403,
          "subsequent operation sees committed demotion");
      }finally{
        await firstOperation.unsafe("ROLLBACK").catch(()=>undefined);
        if(demotion)await demotion.catch(()=>undefined);
      }
    }finally{
      await firstOperation.end({timeout:1});
      await secondDemoter.end({timeout:1});
    }
    // CVI-1C.45: authorization and synthetic DB mutation share one transaction.
    const atomic=await createAuthSession({
      subject:"cvi-atomic-write",email:"synthetic-admin@example.test",
      displayName:null,role:"admin",config,
    });
    const mutationDb=postgres(raw,{max:1,prepare:false,connect_timeout:5});
    try {
      await mutationDb.unsafe("CREATE TEMP TABLE cvi_atomic_synthetic_writes(value text NOT NULL)");
      const attempt=async()=>{
        return mutationDb.begin(async tx=>{
          const rows=await tx<{role:string}[]>`
            SELECT role FROM auth_sessions
            WHERE id=${atomic.principal.sessionId}::uuid
              AND revoked_at IS NULL AND expires_at>clock_timestamp()
              AND last_seen_at>clock_timestamp()-${AUTH_IDLE_TTL_MS}::bigint * interval '1 millisecond'
            FOR UPDATE`;
          if(rows[0]?.role!=="admin")return false;
          await tx`INSERT INTO cvi_atomic_synthetic_writes(value) VALUES ('allowed')`;
          return true;
        });
      };
      assert.equal(await attempt(),true);
      await sql`UPDATE auth_sessions SET role='viewer' WHERE id=${atomic.principal.sessionId}::uuid`;
      assert.equal(await attempt(),false,"demotion denies synthetic DB mutation");
      const after=await mutationDb<{n:number}[]>`SELECT count(*)::int AS n FROM cvi_atomic_synthetic_writes`;
      assert.equal(after[0]?.n,1,"denied mutation must not persist");
      await sql`UPDATE auth_sessions SET revoked_at=clock_timestamp()
        WHERE id=${atomic.principal.sessionId}::uuid`;
      assert.equal(await attempt(),false,"revoked session denies synthetic DB mutation");
      const final=await mutationDb<{n:number}[]>`SELECT count(*)::int AS n FROM cvi_atomic_synthetic_writes`;
      assert.equal(final[0]?.n,1,"revocation must not persist a denied mutation");
    }finally{
      await mutationDb.end({timeout:1});
    }
    // CVI-1C.46: committed revocation must win a waiting authorization lock.
    const revokedRace=await createAuthSession({
      subject:"cvi-revoke-first",email:"synthetic-admin@example.test",
      displayName:null,role:"admin",config,
    });
    const revoker=postgres(raw,{max:1,prepare:false,connect_timeout:5});
    const waitingMutation=postgres(raw,{max:1,prepare:false,connect_timeout:5});
    try {
      await revoker.unsafe("BEGIN");
      let pending:Promise<boolean>|undefined;
      try {
        await revoker`UPDATE auth_sessions SET revoked_at=clock_timestamp()
          WHERE id=${revokedRace.principal.sessionId}::uuid`;
        pending=waitingMutation.begin(async tx=>{
          const rows=await tx<{role:string}[]>`
            SELECT role FROM auth_sessions
            WHERE id=${revokedRace.principal.sessionId}::uuid
              AND revoked_at IS NULL
              AND expires_at>clock_timestamp()
              AND last_seen_at>clock_timestamp()-${AUTH_IDLE_TTL_MS}::bigint * interval '1 millisecond'
            FOR UPDATE`;
          return rows[0]?.role==="admin";
        });
        let blocked=false;
        for(let n=0;n<80;n++){
          const locks=await sql<{count:number}[]>`
            SELECT count(*)::int AS count FROM pg_stat_activity
            WHERE datname=current_database() AND wait_event_type='Lock'
              AND pid<>pg_backend_pid()`;
          if((locks[0]?.count??0)>0){blocked=true;break;}
          await new Promise(resolve=>setTimeout(resolve,30));
        }
        assert.ok(blocked,"authorization must wait behind revocation's row lock");
        await revoker.unsafe("COMMIT");
        assert.equal(await pending,false,"waiting authorization cannot survive committed revocation");
        pending=undefined;
        assert.equal((await request(revokedRace.token,{method:"POST",csrf:revokedRace.csrfToken})).status,401,"revoked session is unauthenticated");
      }finally{
        await revoker.unsafe("ROLLBACK").catch(()=>undefined);
        if(pending)await pending.catch(()=>undefined);
      }
    }finally{
      await revoker.end({timeout:1});
      await waitingMutation.end({timeout:1});
    }
    // CVI-1C.47: an operation's authorization row lock precedes revocation.
    const operationFirst=await createAuthSession({
      subject:"cvi-revoke-operation-first",email:"synthetic-admin@example.test",
      displayName:null,role:"admin",config,
    });
    const heldOperation=postgres(raw,{max:1,prepare:false,connect_timeout:5});
    const competingRevoker=postgres(raw,{max:1,prepare:false,connect_timeout:5});
    try {
      await heldOperation.unsafe("BEGIN");
      let competing:Promise<unknown>|undefined;
      try {
        const authorized=await heldOperation<{role:string}[]>`
          SELECT role FROM auth_sessions
          WHERE id=${operationFirst.principal.sessionId}::uuid
            AND revoked_at IS NULL AND expires_at>clock_timestamp()
            AND last_seen_at>clock_timestamp()-${AUTH_IDLE_TTL_MS}::bigint * interval '1 millisecond'
          FOR UPDATE`;
        assert.equal(authorized[0]?.role,"admin");
        competing=Promise.resolve(competingRevoker`
          UPDATE auth_sessions SET revoked_at=clock_timestamp()
          WHERE id=${operationFirst.principal.sessionId}::uuid`);
        let blocked=false;
        for(let n=0;n<80;n++){
          const locks=await sql<{count:number}[]>`
            SELECT count(*)::int AS count FROM pg_stat_activity
            WHERE datname=current_database() AND wait_event_type='Lock'
              AND pid<>pg_backend_pid()`;
          if((locks[0]?.count??0)>0){blocked=true;break;}
          await new Promise(resolve=>setTimeout(resolve,30));
        }
        assert.ok(blocked,"revocation must wait for earlier authorization row lock");
        await heldOperation.unsafe("COMMIT");
        await competing;
        competing=undefined;
        assert.equal((await request(operationFirst.token,{method:"POST",csrf:operationFirst.csrfToken})).status,401,
          "subsequent request rejects a revoked session");
      }finally{
        await heldOperation.unsafe("ROLLBACK").catch(()=>undefined);
        if(competing)await competing.catch(()=>undefined);
      }
    }finally{
      await heldOperation.end({timeout:1});
      await competingRevoker.end({timeout:1});
    }
    // CVI-1C.48: a failed operation rolls back an already inserted synthetic row.
    const rollbackSession=await createAuthSession({
      subject:"cvi-rollback-atomic",email:"synthetic-admin@example.test",
      displayName:null,role:"admin",config,
    });
    const rollbackDb=postgres(raw,{max:1,prepare:false,connect_timeout:5});
    try {
      await rollbackDb.unsafe("CREATE TEMP TABLE cvi_rollback_synthetic_rows(value text NOT NULL)");
      await assert.rejects(
        rollbackDb.begin(async tx=>{
          const rows=await tx<{role:string}[]>`
            SELECT role FROM auth_sessions
            WHERE id=${rollbackSession.principal.sessionId}::uuid
              AND revoked_at IS NULL AND expires_at>clock_timestamp()
              AND last_seen_at>clock_timestamp()-${AUTH_IDLE_TTL_MS}::bigint * interval '1 millisecond'
            FOR UPDATE`;
          assert.equal(rows[0]?.role,"admin");
          await tx`INSERT INTO cvi_rollback_synthetic_rows(value) VALUES ('rolled-back')`;
          throw new Error("synthetic_operation_failure");
        }),
        /synthetic_operation_failure/);
      const rolledBack=await rollbackDb<{n:number}[]>`
        SELECT count(*)::int AS n FROM cvi_rollback_synthetic_rows`;
      assert.equal(rolledBack[0]?.n,0,"failed authorized operation must roll back synthetic mutation");
      await sql`UPDATE auth_sessions SET role='viewer'
        WHERE id=${rollbackSession.principal.sessionId}::uuid`;
      const denied=await rollbackDb.begin(async tx=>{
        const rows=await tx<{role:string}[]>`
          SELECT role FROM auth_sessions
          WHERE id=${rollbackSession.principal.sessionId}::uuid
            AND revoked_at IS NULL AND expires_at>clock_timestamp()
            AND last_seen_at>clock_timestamp()-${AUTH_IDLE_TTL_MS}::bigint * interval '1 millisecond'
          FOR UPDATE`;
        if(rows[0]?.role!=="admin") return false;
        await tx`INSERT INTO cvi_rollback_synthetic_rows(value) VALUES ('forbidden')`;
        return true;
      });
      assert.equal(denied,false,"demoted role cannot enter synthetic write");
      const afterDeny=await rollbackDb<{n:number}[]>`
        SELECT count(*)::int AS n FROM cvi_rollback_synthetic_rows`;
      assert.equal(afterDeny[0]?.n,0,"denied operation leaves no partial synthetic rows");
    }finally{
      await rollbackDb.end({timeout:1});
    }
    // CVI-1C.49: revocation-first contention and synthetic mutation rollback.
    const revokeAtomic=await createAuthSession({
      subject:"cvi-revoke-atomic",email:"synthetic-admin@example.test",
      displayName:null,role:"admin",config,
    });
    const revokeWriter=postgres(raw,{max:1,prepare:false,connect_timeout:5});
    const revokeGate=postgres(raw,{max:1,prepare:false,connect_timeout:5});
    try {
      await revokeWriter.unsafe("CREATE TEMP TABLE cvi_revoke_atomic_rows(value text NOT NULL)");
      await revokeGate.unsafe("BEGIN");
      let pending:Promise<boolean>|undefined;
      try {
        await revokeGate`UPDATE auth_sessions SET revoked_at=clock_timestamp()
          WHERE id=${revokeAtomic.principal.sessionId}::uuid`;
        pending=revokeWriter.begin(async tx=>{
          const rows=await tx<{role:string}[]>`
            SELECT role FROM auth_sessions WHERE id=${revokeAtomic.principal.sessionId}::uuid
              AND revoked_at IS NULL AND expires_at>clock_timestamp()
              AND last_seen_at>clock_timestamp()-${AUTH_IDLE_TTL_MS}::bigint * interval '1 millisecond'
            FOR UPDATE`;
          if(rows[0]?.role!=="admin")return false;
          await tx`INSERT INTO cvi_revoke_atomic_rows(value) VALUES ('forbidden')`;
          return true;
        });
        let observed=false;
        for(let i=0;i<80;i++){
          const locked=await sql<{count:number}[]>`
            SELECT count(*)::int AS count FROM pg_stat_activity
            WHERE datname=current_database() AND wait_event_type='Lock'
              AND pid<>pg_backend_pid()`;
          if((locked[0]?.count??0)>0){observed=true;break;}
          await new Promise(resolve=>setTimeout(resolve,30));
        }
        assert.ok(observed,"atomic mutation authorization must wait for revocation");
        await revokeGate.unsafe("COMMIT");
        assert.equal(await pending,false,"committed revocation forbids concurrent write");
        pending=undefined;
        const count=await revokeWriter<{n:number}[]>`
          SELECT count(*)::int AS n FROM cvi_revoke_atomic_rows`;
        assert.equal(count[0]?.n,0,"denied transaction must leave no synthetic row");
      }finally{
        await revokeGate.unsafe("ROLLBACK").catch(()=>undefined);
        if(pending)await pending.catch(()=>undefined);
      }
    }finally{
      await revokeWriter.end({timeout:1});
      await revokeGate.end({timeout:1});
    }
    // CVI-1C.50: an atomic synthetic mutation commits before queued revocation.
    const firstWrite=await createAuthSession({
      subject:"cvi-write-before-revoke",email:"synthetic-admin@example.test",
      displayName:null,role:"admin",config,
    });
    const writeDb=postgres(raw,{max:1,prepare:false,connect_timeout:5});
    const revokeDb=postgres(raw,{max:1,prepare:false,connect_timeout:5});
    try {
      await writeDb.unsafe("CREATE TEMP TABLE cvi_write_before_revoke(value text NOT NULL)");
      await writeDb.unsafe("BEGIN");
      let revokePending:Promise<unknown>|undefined;
      try {
        const eligible=await writeDb<{role:string}[]>`
          SELECT role FROM auth_sessions
          WHERE id=${firstWrite.principal.sessionId}::uuid AND revoked_at IS NULL
            AND expires_at>clock_timestamp()
            AND last_seen_at>clock_timestamp()-${AUTH_IDLE_TTL_MS}::bigint * interval '1 millisecond'
          FOR UPDATE`;
        assert.equal(eligible[0]?.role,"admin");
        await writeDb`INSERT INTO cvi_write_before_revoke(value) VALUES ('committed-before-revocation')`;
        revokePending=Promise.resolve(revokeDb`UPDATE auth_sessions
          SET revoked_at=clock_timestamp() WHERE id=${firstWrite.principal.sessionId}::uuid`);
        let waiting=false;
        for(let n=0;n<80;n++){
          const locks=await sql<{count:number}[]>`
            SELECT count(*)::int AS count FROM pg_stat_activity
            WHERE datname=current_database() AND wait_event_type='Lock'
              AND pid<>pg_backend_pid()`;
          if((locks[0]?.count??0)>0){waiting=true;break;}
          await new Promise(resolve=>setTimeout(resolve,30));
        }
        assert.ok(waiting,"revocation waits for authorized synthetic write transaction");
        await writeDb.unsafe("COMMIT");
        await revokePending;
        revokePending=undefined;
        const persisted=await writeDb<{n:number}[]>`
          SELECT count(*)::int AS n FROM cvi_write_before_revoke`;
        assert.equal(persisted[0]?.n,1,"first authorized write commits before revocation");
        assert.equal((await request(firstWrite.token,{method:"POST",csrf:firstWrite.csrfToken})).status,401);
        const denied=await writeDb.begin(async tx=>{
          const rows=await tx<{role:string}[]>`
            SELECT role FROM auth_sessions
            WHERE id=${firstWrite.principal.sessionId}::uuid AND revoked_at IS NULL
            FOR UPDATE`;
          if(rows[0]?.role!=="admin")return false;
          await tx`INSERT INTO cvi_write_before_revoke(value) VALUES ('forbidden')`;
          return true;
        });
        assert.equal(denied,false,"later synthetic write denied after revocation");
        const finalCount=await writeDb<{n:number}[]>`
          SELECT count(*)::int AS n FROM cvi_write_before_revoke`;
        assert.equal(finalCount[0]?.n,1);
      }finally{
        await writeDb.unsafe("ROLLBACK").catch(()=>undefined);
        if(revokePending)await revokePending.catch(()=>undefined);
      }
    }finally{
      await writeDb.end({timeout:1});
      await revokeDb.end({timeout:1});
    }
    // CVI-1C.55: in-memory-only candidate edit-draft ACL policy (not production grants).
    type SyntheticDraftPolicy = {
      globalRole: "viewer" | "operator" | "admin";
      memberRole: "viewer" | "editor" | "owner";
      membershipActive: boolean;
      grantActive: boolean;
      permission: "review_content" | "synthetic_edit_draft";
      subjectMatches: boolean;
      siteMatches: boolean;
      unexpired: boolean;
    };
    const canSyntheticEditDraft=(p:SyntheticDraftPolicy)=>(
      (p.globalRole==="operator"||p.globalRole==="admin") &&
      (p.memberRole==="editor"||p.memberRole==="owner") &&
      p.membershipActive && p.grantActive &&
      p.permission==="synthetic_edit_draft" &&
      p.subjectMatches && p.siteMatches && p.unexpired
    );
    const validDraft:SyntheticDraftPolicy={
      globalRole:"operator",memberRole:"editor",membershipActive:true,
      grantActive:true,permission:"synthetic_edit_draft",
      subjectMatches:true,siteMatches:true,unexpired:true,
    };
    assert.equal(canSyntheticEditDraft(validDraft),true);
    assert.equal(canSyntheticEditDraft({...validDraft,globalRole:"admin",memberRole:"owner"}),true);
    assert.equal(canSyntheticEditDraft({...validDraft,globalRole:"viewer"}),false);
    assert.equal(canSyntheticEditDraft({...validDraft,memberRole:"viewer"}),false);
    assert.equal(canSyntheticEditDraft({...validDraft,membershipActive:false}),false);
    assert.equal(canSyntheticEditDraft({...validDraft,grantActive:false}),false);
    assert.equal(canSyntheticEditDraft({...validDraft,permission:"review_content"}),false);
    assert.equal(canSyntheticEditDraft({...validDraft,subjectMatches:false}),false);
    assert.equal(canSyntheticEditDraft({...validDraft,siteMatches:false}),false);
    assert.equal(canSyntheticEditDraft({...validDraft,unexpired:false}),false);
    // CVI-1C.56: atomic synthetic policy admission and write share the session lock.
    const policySession=await createAuthSession({
      subject:"cvi-policy-atomic",email:"synthetic-admin@example.test",
      displayName:null,role:"operator",config,
    });
    const policyDb=postgres(raw,{max:1,prepare:false,connect_timeout:5});
    try{
      await policyDb.unsafe("CREATE TEMP TABLE cvi_policy_atomic_write(value text NOT NULL)");
      const applySyntheticDraft=async(permission:"synthetic_edit_draft"|"review_content")=>
        policyDb.begin(async tx=>{
          const sessions=await tx<{role:string;subject:string}[]>`
            SELECT role,subject FROM auth_sessions
            WHERE id=${policySession.principal.sessionId}::uuid
              AND revoked_at IS NULL AND expires_at>clock_timestamp()
              AND last_seen_at>clock_timestamp()-${AUTH_IDLE_TTL_MS}::bigint * interval '1 millisecond'
            FOR UPDATE`;
          const live=sessions[0];
          if(!live||!["operator","admin"].includes(live.role)
            ||live.subject!=="cvi-policy-atomic"||permission!=="synthetic_edit_draft")return false;
          await tx`INSERT INTO cvi_policy_atomic_write(value) VALUES ('synthetic-authorized')`;
          return true;
        });
      assert.equal(await applySyntheticDraft("review_content"),false);
      assert.equal(await applySyntheticDraft("synthetic_edit_draft"),true);
      await sql`UPDATE auth_sessions SET revoked_at=clock_timestamp()
        WHERE id=${policySession.principal.sessionId}::uuid`;
      assert.equal(await applySyntheticDraft("synthetic_edit_draft"),false);
      const count=await policyDb<{n:number}[]>`
        SELECT count(*)::int AS n FROM cvi_policy_atomic_write`;
      assert.equal(count[0]?.n,1,"only the prerevocation synthetic write persists");
    }finally{
      await policyDb.end({timeout:1});
    }
    // CVI-1C.64: synthetic temporary plan/grant lock order, no production ACL.
    const planLockDb=postgres(raw,{max:1,prepare:false,connect_timeout:5});
    const grantLockDb=postgres(raw,{max:1,prepare:false,connect_timeout:5});
    try {
      await planLockDb.unsafe("CREATE TEMP TABLE cvi_1c64_plan (id int PRIMARY KEY, marker text)");
      await planLockDb.unsafe("INSERT INTO cvi_1c64_plan VALUES (1,'unchanged')");
      await planLockDb.unsafe("BEGIN");
      try {
        await planLockDb.unsafe("SET LOCAL lock_timeout = '3s'");
        await planLockDb.unsafe("SELECT * FROM cvi_1c64_plan WHERE id=1 FOR UPDATE");
        // PostgreSQL temporary tables are connection-private: prove isolation,
        // and do not pretend a second connection can revoke a temp-table row.
        const seen=await grantLockDb<{name:string|null}[]>`
          SELECT to_regclass('pg_temp.cvi_1c64_plan')::text AS name`;
        assert.equal(seen[0]?.name,null,"synthetic plan temp table must not leak to rival connection");
        await planLockDb.unsafe("UPDATE cvi_1c64_plan SET marker='authorized-test-only' WHERE id=1");
        await planLockDb.unsafe("COMMIT");
        const after=await planLockDb<{marker:string}[]>`SELECT marker FROM cvi_1c64_plan WHERE id=1`;
        assert.equal(after[0]?.marker,"authorized-test-only");
      }finally{
        await planLockDb.unsafe("ROLLBACK").catch(()=>undefined);
      }
    }finally{
      await planLockDb.end({timeout:1});
      await grantLockDb.end({timeout:1});
    }
    // CVI-1C.65: real two-connection contention on a disposable shared synthetic row.
    const holder65=postgres(raw,{max:1,prepare:false,connect_timeout:5});
    const waiter65=postgres(raw,{max:1,prepare:false,connect_timeout:5});
    try {
      await holder65.unsafe("CREATE TABLE cvi_1c65_synthetic_lock (id int PRIMARY KEY, value text NOT NULL)");
      await holder65.unsafe("INSERT INTO cvi_1c65_synthetic_lock VALUES (1,'initial')");
      await holder65.unsafe("BEGIN");
      let waiting65:Promise<unknown>|undefined;
      try {
        await holder65.unsafe("UPDATE cvi_1c65_synthetic_lock SET value='held' WHERE id=1");
        let markWaiterEntered!:()=>void;
        const waiterEntered=new Promise<void>(resolve=>{markWaiterEntered=resolve;});
        let waiterSettled=false;
        waiting65=waiter65.begin(async tx=>{
          await tx.unsafe("SET LOCAL lock_timeout='3s'");
          markWaiterEntered();
          await tx.unsafe("UPDATE cvi_1c65_synthetic_lock SET value='after-wait' WHERE id=1");
        }).then(()=>{waiterSettled=true;},error=>{waiterSettled=true;throw error;});
        await waiterEntered;
        // The contender has reached its update with the holder's transaction open.
        await new Promise(resolve=>setTimeout(resolve,120));
        assert.equal(waiterSettled,false,"contender must not complete before holder commits");
        await holder65.unsafe("COMMIT");
        await waiting65;
        waiting65=undefined;
        const rows=await holder65<{value:string}[]>`SELECT value FROM cvi_1c65_synthetic_lock WHERE id=1`;
        assert.equal(rows[0]?.value,"after-wait","waiter updates only after holder commits");
      }finally {
        await holder65.unsafe("ROLLBACK").catch(()=>undefined);
        if(waiting65)await waiting65.catch(()=>undefined);
      }
    }finally{
      await holder65.unsafe("DROP TABLE IF EXISTS cvi_1c65_synthetic_lock").catch(()=>undefined);
      await holder65.end({timeout:1});
      await waiter65.end({timeout:1});
    }
    // CVI-1C.66: synthetic plan -> grant row lock order, in one disposable DB.
    const first66=postgres(raw,{max:1,prepare:false,connect_timeout:5});
    const second66=postgres(raw,{max:1,prepare:false,connect_timeout:5});
    try {
      await first66.unsafe("CREATE TABLE cvi_1c66_lock_order (id int PRIMARY KEY, value text NOT NULL)");
      await first66.unsafe("INSERT INTO cvi_1c66_lock_order VALUES (1,'plan'),(2,'grant')");
      await first66.unsafe("BEGIN");
      let secondPending66:Promise<void>|undefined;
      try {
        await first66.unsafe("SET LOCAL lock_timeout='3s'");
        await first66.unsafe("SELECT id FROM cvi_1c66_lock_order WHERE id=1 FOR UPDATE");
        await first66.unsafe("SELECT id FROM cvi_1c66_lock_order WHERE id=2 FOR UPDATE");
        let entered66!:()=>void;
        const secondEntered66=new Promise<void>(resolve=>{entered66=resolve;});
        let settled66=false;
        secondPending66=second66.begin(async tx=>{
          await tx.unsafe("SET LOCAL lock_timeout='3s'");
          entered66();
          await tx.unsafe("SELECT id FROM cvi_1c66_lock_order WHERE id=1 FOR UPDATE");
          await tx.unsafe("SELECT id FROM cvi_1c66_lock_order WHERE id=2 FOR UPDATE");
          await tx.unsafe("UPDATE cvi_1c66_lock_order SET value='serialized' WHERE id=2");
        }).then(()=>{settled66=true;},error=>{settled66=true;throw error;});
        await secondEntered66;
        await new Promise(resolve=>setTimeout(resolve,120));
        assert.equal(settled66,false,"consistent-order contender must await holder");
        await first66.unsafe("COMMIT");
        await secondPending66;
        secondPending66=undefined;
        const final66=await first66<{value:string}[]>`
          SELECT value FROM cvi_1c66_lock_order WHERE id=2`;
        assert.equal(final66[0]?.value,"serialized");
      }finally {
        await first66.unsafe("ROLLBACK").catch(()=>undefined);
        if(secondPending66)await secondPending66.catch(()=>undefined);
      }
    }finally{
      await first66.unsafe("DROP TABLE IF EXISTS cvi_1c66_lock_order").catch(()=>undefined);
      await first66.end({timeout:1});
      await second66.end({timeout:1});
    }
    // CVI-1C.34: rotation preserves the server-stored role and CSRF hash.
    assert.equal((await request(rotated,{method:"POST",csrf:b.csrfToken})).status,200);
    assert.equal((await request(rotated,{method:"POST",csrf:"not-the-csrf-token"})).status,403);
    const rotatedRow=await sql<{role:string;csrf:string}[]>`
      SELECT role,csrf_token_hash AS csrf FROM auth_sessions
      WHERE id=${b.principal.sessionId}::uuid`;
    assert.equal(rotatedRow[0]?.role,"admin");
    assert.equal(rotatedRow[0]?.csrf,sha256(b.csrfToken));
    // A future application timestamp must never extend a persisted session's
    // actual expiry; absolute expiry remains checked on the DB row.
    const past = await createAuthSession({
      subject:"cvi-clock-expired",email:"synthetic-viewer@example.test",
      displayName:null,role:"viewer",config,
    });
    await sql`UPDATE auth_sessions SET expires_at=now()-interval '1 minute'
      WHERE id=${past.principal.sessionId}::uuid`;
    assert.equal((await request(past.token)).status,401);
    await revokeAuthSession(rotated);
    assert.equal((await request(rotated)).status,401);
    // CVI-1C.33: concurrent revocation must defeat pending session refresh
    // and rotation. The synthetic rival transaction holds the row lock until
    // the competing HTTP/rotation operation is observed as lock-blocked.
    const rival = postgres(raw,{max:1,prepare:false,connect_timeout:5});
    const observer = postgres(raw,{max:1,prepare:false,connect_timeout:5});
    try {
      for(const mode of ["load","rotate"] as const) {
        const subject = await createAuthSession({
          subject:"cvi-concurrency-"+mode,email:"synthetic-admin@example.test",
          displayName:null,role:"admin",config,
        });
        await rival.unsafe("BEGIN");
        let pending:Promise<unknown>|undefined;
        try {
          await rival`UPDATE auth_sessions SET revoked_at=now() WHERE id=${subject.principal.sessionId}::uuid`;
          const competing = mode==="load"
            ? request(subject.token)
            : rotateAuthSessionToken(subject.principal.sessionId);
          pending = Promise.resolve(competing);
          const lockWait = async()=>{
            for(let attempt=0;attempt<60;attempt++){
              const blocked = await observer<{n:number}[]>`
                SELECT count(*)::int AS n FROM pg_stat_activity
                WHERE datname=current_database() AND wait_event_type='Lock'
                  AND pid<>pg_backend_pid()`;
              if((blocked[0]?.n??0)>0)return;
              await new Promise(resolve=>setTimeout(resolve,30));
            }
            throw Error("cvi_1c33_competing_operation_not_lock_blocked");
          };
          await lockWait();
          await rival.unsafe("COMMIT");
          if(mode==="load"){
            const outcome=await pending as Awaited<ReturnType<typeof request>>;
            assert.equal(outcome.status,401,"revoked session cannot win a concurrent load");
          }else{
            await assert.rejects(pending,/auth_session_rotation_not_eligible/,
              "revoked session cannot win a concurrent rotation");
          }
          pending=undefined;
          assert.equal((await request(subject.token)).status,401);
        }finally{
          await rival.unsafe("ROLLBACK").catch(()=>undefined);
          if(pending)await pending.catch(()=>undefined);
        }
      }
    }finally{
      await rival.end({timeout:1});
      await observer.end({timeout:1});
    }
    // CVI-1C.39: eligible rotation after a row lock must refresh using post-wait time.
    const waiting=await createAuthSession({
      subject:"cvi-rotation-clock-wait",email:"synthetic-admin@example.test",
      displayName:null,role:"admin",config,
    });
    const holding=postgres(raw,{max:1,prepare:false,connect_timeout:5});
    const waitingObserver=postgres(raw,{max:1,prepare:false,connect_timeout:5});
    try {
      await holding.unsafe("BEGIN");
      let pending:Promise<string>|undefined;
      try {
        await holding`UPDATE auth_sessions SET last_seen_at=last_seen_at
          WHERE id=${waiting.principal.sessionId}::uuid`;
        pending=rotateAuthSessionToken(waiting.principal.sessionId);
        let sawLock=false;
        for(let attempt=0;attempt<80;attempt++){
          const blocked=await waitingObserver<{n:number}[]>`
            SELECT count(*)::int AS n FROM pg_stat_activity
            WHERE datname=current_database() AND wait_event_type='Lock' AND pid<>pg_backend_pid()`;
          if((blocked[0]?.n??0)>0){sawLock=true;break;}
          await new Promise(resolve=>setTimeout(resolve,30));
        }
        assert.ok(sawLock,"rotation must be observed waiting for row lock");
        // Ensure the transaction-start timestamp is measurably before release.
        await new Promise(resolve=>setTimeout(resolve,150));
        const marker=await waitingObserver<{at:string}[]>`SELECT clock_timestamp()::text AS at`;
        await holding.unsafe("COMMIT");
        const newToken=await pending;
        pending=undefined;
        const saved=await waitingObserver<{at:string}[]>`SELECT last_seen_at::text AS at
          FROM auth_sessions WHERE id=${waiting.principal.sessionId}::uuid`;
        assert.ok(new Date(saved[0]!.at).getTime()>=new Date(marker[0]!.at).getTime(),
          "rotated last_seen_at must not predate row-lock release");
        assert.equal((await request(waiting.token)).status,401);
        assert.equal((await request(newToken)).status,200);
      }finally{
        await holding.unsafe("ROLLBACK").catch(()=>undefined);
        if(pending)await pending.catch(()=>undefined);
      }
    }finally{
      await holding.end({timeout:1});
      await waitingObserver.end({timeout:1});
    }
    // CVI-1C.35: skewed application time cannot mint future idle state.
    const skew=await createAuthSession({subject:"cvi-clock-skew",email:"synthetic-viewer@example.test",displayName:null,role:"viewer",config});
    const future=new Date(Date.now()+365*24*60*60*1000);
    const previousDate=new Date(0);
    assert.ok(await loadAuthSession(skew.token,future),"future caller clock does not deny a live DB session");
    const touched=await sql<{delta:number}[]>`SELECT abs(extract(epoch FROM (last_seen_at-clock_timestamp())))::float AS delta
      FROM auth_sessions WHERE id=${skew.principal.sessionId}::uuid`;
    assert.ok((touched[0]?.delta??Infinity)<30,"last_seen_at stays near PostgreSQL time");
    assert.ok(await loadAuthSession(skew.token,previousDate),"past caller clock does not deny valid DB session");
    await sql`UPDATE auth_sessions SET last_seen_at=clock_timestamp()-interval '40 minutes' WHERE id=${skew.principal.sessionId}::uuid`;
    assert.equal(await loadAuthSession(skew.token,future),null,"future caller time cannot revive idle-expired session");
    assert.equal(await loadAuthSession(skew.token,previousDate),null,"past caller time cannot revive idle-expired session");
    // CVI-1C.36: rotation cannot reset absolute expiry or idle expiry.
    const boundary=await createAuthSession({
      subject:"cvi-expiry-boundary",email:"synthetic-admin@example.test",
      displayName:null,role:"admin",config,
    });
    await sql`UPDATE auth_sessions SET expires_at=clock_timestamp()+interval '2 minutes'
      WHERE id=${boundary.principal.sessionId}::uuid`;
    const before=await sql<{expiry:string}[]>`SELECT expires_at::text AS expiry
      FROM auth_sessions WHERE id=${boundary.principal.sessionId}::uuid`;
    const next=await rotateAuthSessionToken(boundary.principal.sessionId);
    assert.equal((await request(boundary.token)).status,401);
    assert.equal((await request(next)).status,200);
    const after=await sql<{expiry:string}[]>`SELECT expires_at::text AS expiry
      FROM auth_sessions WHERE id=${boundary.principal.sessionId}::uuid`;
    assert.equal(after[0]?.expiry,before[0]?.expiry,"rotation must not extend absolute expiry");
    await sql`UPDATE auth_sessions SET expires_at=clock_timestamp()
      WHERE id=${boundary.principal.sessionId}::uuid`;
    assert.equal((await request(next)).status,401,"absolute expiry boundary denies");
    await assert.rejects(rotateAuthSessionToken(boundary.principal.sessionId),
      /auth_session_rotation_not_eligible/,"expired session cannot rotate");
    const idleBoundary=await createAuthSession({
      subject:"cvi-idle-boundary",email:"synthetic-admin@example.test",
      displayName:null,role:"admin",config,
    });
    await sql`UPDATE auth_sessions SET last_seen_at=clock_timestamp()-interval '31 minutes'
      WHERE id=${idleBoundary.principal.sessionId}::uuid`;
    await assert.rejects(rotateAuthSessionToken(idleBoundary.principal.sessionId),
      /auth_session_rotation_not_eligible/,"idle-expired session cannot rotate");
    assert.equal((await request(idleBoundary.token)).status,401);
    // CVI-1C.37: caller-supplied skew cannot change persisted issuance or expiry.
    for (const injected of [new Date("2099-01-01T00:00:00Z"),new Date("2000-01-01T00:00:00Z")]) {
      const issued=await createAuthSession({
        subject:"cvi-issuance-skew",email:"synthetic-viewer@example.test",
        displayName:null,role:"viewer",config,now:injected,
      });
      const observed=await sql<{offset:number;ttl:number;issuedAligned:boolean}[]>`
        SELECT abs(extract(epoch FROM (created_at-clock_timestamp())))::float AS offset,
          extract(epoch FROM (expires_at-created_at))::float AS ttl,
          created_at=last_seen_at AS "issuedAligned"
        FROM auth_sessions WHERE id=${issued.principal.sessionId}::uuid`;
      assert.ok((observed[0]?.offset??Infinity)<30,"issuance must use DB time");
      assert.equal(observed[0]?.issuedAligned,true,"created_at and last_seen_at must match exactly");
      assert.equal(observed[0]?.ttl,AUTH_SESSION_TTL_MS/1000,
        "absolute TTL must not inherit the injected application clock");
      assert.equal((await request(issued.token)).status,200);
      assert.notEqual(issued.principal.issuedAt,injected.toISOString());
    }
    process.env.AUTH_ENFORCEMENT_ENABLED="false";
    assert.equal((await request(rotated)).status,403);
    process.env.AUTH_ENFORCEMENT_ENABLED="true";
    process.env.AUTH_SESSION_SECRET="tiny";
    assert.equal((await request(rotated)).status,503);
    assert.ok(AUTH_IDLE_TTL_MS>0);
    assert.notEqual(sha256(a.token),a.token);
  } finally {
    if(server) await new Promise<void>(resolve=>server!.close(()=>resolve()));
    await sql.end({timeout:1});
    for(const [key,value] of previous) {
      if(value===undefined) delete process.env[key]; else process.env[key]=value;
    }
  }
});
