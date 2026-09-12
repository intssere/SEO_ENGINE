import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { requireApiAuthentication, securityHeaders, verifiedActorId } from "./auth-security.js";
import { sha256, type AuthPrincipal } from "../lib/auth-foundation.js";

const AUTH_ENV = {
  AUTH_ENFORCEMENT_ENABLED: "true",
  AUTH_PUBLIC_ORIGIN: "https://dsseoengine.replit.app",
  AUTH_GOOGLE_CLIENT_ID: "client.apps.googleusercontent.com",
  AUTH_GOOGLE_CLIENT_SECRET: "test-google-secret",
  AUTH_SESSION_SECRET: "0123456789abcdef0123456789abcdef0123456789abcdef",
  AUTH_ADMIN_EMAILS: "admin@example.com",
  AUTH_OPERATOR_EMAILS: "operator@example.com",
  AUTH_VIEWER_EMAILS: "viewer@example.com",
};

async function withAuthEnv(fn: () => void | Promise<void>) {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(AUTH_ENV)) {
    previous.set(key, process.env[key]);
    process.env[key] = value;
  }
  const oldDatabase = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    await fn();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    if (oldDatabase === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = oldDatabase;
  }
}

function principal(role: "viewer" | "operator" | "admin", csrf = "csrf-secret"): AuthPrincipal {
  return {
    sessionId: "11111111-1111-4111-8111-111111111111",
    subject: `google-${role}`,
    email: `${role}@example.com`,
    displayName: role,
    role,
    csrfTokenHash: sha256(csrf),
    issuedAt: "2026-09-12T16:00:00.000Z",
    lastSeenAt: "2026-09-12T16:00:00.000Z",
    expiresAt: "2026-09-13T04:00:00.000Z",
  };
}

function mockRequest(input: {
  method: string;
  path: string;
  auth?: AuthPrincipal;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
}) {
  const headers = Object.fromEntries(Object.entries(input.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    method: input.method,
    path: input.path,
    auth: input.auth,
    body: input.body ?? {},
    socket: { remoteAddress: "127.0.0.1" },
    get(name: string) { return headers[name.toLowerCase()]; },
  } as unknown as Request;
}

function mockResponse() {
  const state = { status: 200, body: null as unknown, headers: new Map<string, string>() };
  const res = {
    locals: {},
    status(code: number) { state.status = code; return this; },
    json(body: unknown) { state.body = body; return this; },
    setHeader(name: string, value: string) { state.headers.set(name.toLowerCase(), String(value)); return this; },
  } as unknown as Response;
  return { res, state };
}

test("anonymous operational API is 401 even with forged Replit identity headers", async () => withAuthEnv(() => {
  const req = mockRequest({
    method: "GET",
    path: "/dashboard",
    headers: { "x-replit-user-id": "forged-admin", "x-replit-user-name": "forged" },
  });
  const { res, state } = mockResponse();
  let nextCalled = false;
  requireApiAuthentication(req, res, () => { nextCalled = true; });
  assert.equal(state.status, 401);
  assert.deepEqual(state.body, { error: "authentication_required" });
  assert.equal(nextCalled, false);
}));

test("viewer cannot enter admin-only connection authorization routes", async () => withAuthEnv(() => {
  const req = mockRequest({ method: "GET", path: "/connections/google/start", auth: principal("viewer") });
  const { res, state } = mockResponse();
  let nextCalled = false;
  requireApiAuthentication(req, res, () => { nextCalled = true; });
  assert.equal(state.status, 403);
  assert.deepEqual(state.body, { error: "insufficient_role", requiredRole: "admin" });
  assert.equal(nextCalled, false);
}));

test("operator approval mutation requires a valid session-bound CSRF token", async () => withAuthEnv(() => {
  const operator = principal("operator", "expected-csrf");
  const badReq = mockRequest({
    method: "POST",
    path: "/approvals/11111111-1111-4111-8111-111111111111/decision",
    auth: operator,
    headers: { "x-csrf-token": "wrong" },
  });
  const bad = mockResponse();
  let badNext = false;
  requireApiAuthentication(badReq, bad.res, () => { badNext = true; });
  assert.equal(bad.state.status, 403);
  assert.deepEqual(bad.state.body, { error: "csrf_validation_failed" });
  assert.equal(badNext, false);

  const goodReq = mockRequest({
    method: "POST",
    path: "/approvals/11111111-1111-4111-8111-111111111111/decision",
    auth: operator,
    body: { _csrf: "expected-csrf" },
  });
  const good = mockResponse();
  let goodNext = false;
  requireApiAuthentication(goodReq, good.res, () => { goodNext = true; });
  assert.equal(goodNext, true);
}));

test("admin can pass Task #54 apply RBAC only when CSRF is valid", async () => withAuthEnv(() => {
  const admin = principal("admin", "admin-csrf");
  const req = mockRequest({
    method: "POST",
    path: "/execution/11111111-1111-4111-8111-111111111111/task54/apply",
    auth: admin,
    headers: { "x-csrf-token": "admin-csrf" },
  });
  const { res } = mockResponse();
  let nextCalled = false;
  requireApiAuthentication(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
}));

test("verified actor ignores caller-supplied identity and comes from the session", async () => withAuthEnv(() => {
  const req = mockRequest({
    method: "POST",
    path: "/approvals/id/decision",
    auth: principal("operator"),
    headers: { "x-replit-user-id": "attacker", "x-replit-user-name": "attacker" },
  });
  assert.equal(verifiedActorId(req), "google-operator:operator@example.com");
}));

test("security middleware emits baseline browser/API hardening headers", () => {
  const req = mockRequest({ method: "GET", path: "/dashboard" });
  const { res, state } = mockResponse();
  let nextCalled = false;
  securityHeaders(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(state.headers.get("x-content-type-options"), "nosniff");
  assert.equal(state.headers.get("x-frame-options"), "DENY");
  assert.match(state.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
  assert.match(state.headers.get("permissions-policy") ?? "", /geolocation=\(\)/);
});
