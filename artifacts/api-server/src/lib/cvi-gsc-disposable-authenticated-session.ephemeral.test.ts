import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import express from "express";
import cookieParser from "cookie-parser";
import postgres from "postgres";
import { attachAuthSession, requireApiAuthentication } from "../middlewares/auth-security.js";
import { AUTH_SESSION_COOKIE, AUTH_IDLE_TTL_MS, createAuthSession, loadAuthConfig, revokeAuthSession, rotateAuthSessionToken, sha256 } from "./auth-foundation.js";
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
    assert.equal(identity[0]?.inet_server_addr, "127.0.0.1");
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
    await revokeAuthSession(rotated);
    assert.equal((await request(rotated)).status,401);
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
