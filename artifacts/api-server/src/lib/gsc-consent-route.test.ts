// PILOT-01: synthetic handler-level denial proof. No HTTP server, provider,
// credential store, Production database, secret read, or OAuth redirect followed.
import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { createOAuthState } from "@seo-engine/oauth-connection-manager";
import connectionsRouter from "../routes/connections.js";
import { GOOGLE_STATE_COOKIE, seal } from "./oauth.js";

type RouteHandler = (req: Request, res: Response) => unknown;
type RouteLayer = { route?: { path: string; stack: Array<{ handle: RouteHandler }> } };

function handler(path: string): RouteHandler {
  const layers = (connectionsRouter as unknown as { stack: RouteLayer[] }).stack;
  const match = layers.find((layer) => layer.route?.path === path);
  const handle = match?.route?.stack[0]?.handle;
  assert.ok(handle, `expected registered route ${path}`);
  return handle;
}

async function inClosedConsentEnv(fn: () => Promise<void>) {
  const names = [
    "APP_ORIGIN",
    "PUBLIC_SITE_WRITES_ENABLED",
    "LEGACY_GOOGLE_OAUTH_CONSENT_ENABLED",
    "GSC_READONLY_OAUTH_RUNTIME_ENABLED",
    "OAUTH_STATE_SIGNING_SECRET",
  ] as const;
  const old = names.map((name) => process.env[name]);
  process.env.APP_ORIGIN = "https://example.test";
  process.env.PUBLIC_SITE_WRITES_ENABLED = "false";
  process.env.GSC_READONLY_OAUTH_RUNTIME_ENABLED = "true";
  process.env.OAUTH_STATE_SIGNING_SECRET = "synthetic-test-signing-key-not-production";
  delete process.env.LEGACY_GOOGLE_OAUTH_CONSENT_ENABLED;
  try {
    await fn();
  } finally {
    names.forEach((name, i) => {
      const value = old[i];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    });
  }
}

function stubResponse() {
  const state = { redirect: "", cookiesWritten: 0, cookiesCleared: 0 };
  const res = {
    redirect(url: string) { state.redirect = url; return this; },
    cookie() { state.cookiesWritten++; return this; },
    clearCookie() { state.cookiesCleared++; return this; },
  } as unknown as Response;
  return { state, res };
}

test("legacy direct GET cannot issue authorization URL or cookie when consent not separately enabled", async () => inClosedConsentEnv(async () => {
  const { state, res } = stubResponse();
  await handler("/connections/google/start")({} as Request, res);
  assert.equal(state.redirect, "https://example.test/connections?error=google_start");
  assert.equal(state.cookiesWritten, 0);
}));

test("GSC direct GET cannot issue authorization URL even if runtime flag is true while transport is unbound", async () => inClosedConsentEnv(async () => {
  const { state, res } = stubResponse();
  await handler("/connections/google/gsc-readonly/start")({} as Request, res);
  assert.equal(state.redirect, "https://example.test/connections?error=gsc_oauth_start");
  assert.equal(state.cookiesWritten, 0);
}));

test("preexisting sealed legacy-state cookie cannot exchange a token while legacy consent is off", async () => inClosedConsentEnv(async () => {
  const stateRecord = createOAuthState("google");
  const { state, res } = stubResponse();
  const req = {
    cookies: { [GOOGLE_STATE_COOKIE]: seal(stateRecord) },
    query: { state: stateRecord.state, code: "synthetic-never-exchanged" },
  } as unknown as Request;
  await handler("/connections/google/callback")(req, res);
  assert.equal(state.redirect, "https://example.test/connections?error=google_state");
  assert.equal(state.cookiesWritten, 0);
  assert.equal(state.cookiesCleared, 1);
}));
