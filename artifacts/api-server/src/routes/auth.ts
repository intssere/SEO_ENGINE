import { Router, type IRouter, type Request, type Response } from "express";
import {
  AUTH_CSRF_COOKIE,
  AUTH_FLOW_COOKIE,
  AUTH_FLOW_TTL_MS,
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_TTL_MS,
  authCapability,
  buildGoogleLoginUrl,
  createAuthFlow,
  createAuthSession,
  exchangeGoogleLoginCode,
  loadAuthConfig,
  revokeAuthSession,
  roleForEmail,
  sealAuthFlow,
  sha256,
  safeEqualHex,
  unsealAuthFlow,
  writeAuthAudit,
} from "../lib/auth-foundation.js";
import {
  authCookieOptions,
  authEndpointRateLimit,
  clearAuthCookies,
} from "../middlewares/auth-security.js";

const router: IRouter = Router();

router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  next();
});

function requestIp(req: Request): string | null {
  return req.get("x-forwarded-for")?.split(",")[0]?.trim() || req.socket.remoteAddress || null;
}

function requestId(req: Request): string | null {
  const candidate = (req as Request & { id?: string | number }).id;
  return candidate == null ? null : String(candidate);
}

function clearFlowCookie(res: Response) {
  res.clearCookie(AUTH_FLOW_COOKIE, authCookieOptions(true));
}

function authErrorRedirect(res: Response, code: string) {
  return res.redirect(302, `/login?error=${encodeURIComponent(code)}`);
}

async function safeAudit(input: Parameters<typeof writeAuthAudit>[0]) {
  await writeAuthAudit(input).catch(() => undefined);
}

router.get("/auth/status", (req, res) => {
  const capability = authCapability(loadAuthConfig());
  return res.json({
    ...capability,
    authenticated: Boolean(req.auth),
    user: req.auth ? {
      email: req.auth.email,
      displayName: req.auth.displayName,
      role: req.auth.role,
    } : null,
  });
});

router.get("/auth/session", (req, res) => {
  const config = loadAuthConfig();
  return res.json({
    ...authCapability(config),
    authenticated: Boolean(req.auth),
    user: req.auth ? {
      email: req.auth.email,
      displayName: req.auth.displayName,
      role: req.auth.role,
      expiresAt: req.auth.expiresAt,
    } : null,
  });
});

router.get("/auth/google/start", authEndpointRateLimit, (req, res) => {
  const config = loadAuthConfig();
  if (!config.enabled) return res.status(409).json({ error: "authentication_enforcement_disabled" });
  if (!config.configured || !config.sessionSecret) {
    return res.status(503).json({ error: "authentication_configuration_invalid" });
  }
  const returnTo = typeof req.query.returnTo === "string" ? req.query.returnTo : "/";
  const flow = createAuthFlow(returnTo);
  res.cookie(AUTH_FLOW_COOKIE, sealAuthFlow(flow, config.sessionSecret), authCookieOptions(true, AUTH_FLOW_TTL_MS));
  return res.redirect(302, buildGoogleLoginUrl(config, flow));
});

router.get("/auth/google/callback", authEndpointRateLimit, async (req, res) => {
  const config = loadAuthConfig();
  const sealedFlow = typeof req.cookies?.[AUTH_FLOW_COOKIE] === "string" ? req.cookies[AUTH_FLOW_COOKIE] : "";
  const flow = config.sessionSecret && sealedFlow ? unsealAuthFlow(sealedFlow, config.sessionSecret) : null;
  clearFlowCookie(res);

  if (!config.enabled) return authErrorRedirect(res, "authentication_disabled");
  if (!config.configured || !flow) {
    void safeAudit({
      eventType: "login_callback_invalid_state",
      outcome: "failure",
      requestId: requestId(req),
      ip: requestIp(req),
      config,
    });
    return authErrorRedirect(res, "invalid_login_state");
  }

  const state = typeof req.query.state === "string" ? req.query.state : "";
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const oauthError = typeof req.query.error === "string" ? req.query.error : "";
  if (oauthError || !state || !code || state !== flow.state) {
    void safeAudit({
      eventType: "login_callback_rejected",
      outcome: "failure",
      requestId: requestId(req),
      ip: requestIp(req),
      config,
      metadata: { providerError: Boolean(oauthError), stateMatched: state === flow.state },
    });
    return authErrorRedirect(res, oauthError ? "provider_login_cancelled" : "invalid_login_callback");
  }

  try {
    const identity = await exchangeGoogleLoginCode({ config, code, flow });
    const role = roleForEmail(identity.email, config);
    if (!role) {
      await safeAudit({
        eventType: "login_allowlist_denied",
        outcome: "denied",
        requestId: requestId(req),
        ip: requestIp(req),
        config,
        metadata: { emailDomain: identity.email.split("@")[1] ?? null },
      });
      clearAuthCookies(res);
      return authErrorRedirect(res, "account_not_authorized");
    }

    const session = await createAuthSession({
      subject: identity.subject,
      email: identity.email,
      displayName: identity.displayName,
      role,
      userAgent: req.get("user-agent") ?? null,
      ip: requestIp(req),
      config,
    });
    res.cookie(AUTH_SESSION_COOKIE, session.token, authCookieOptions(true, AUTH_SESSION_TTL_MS));
    res.cookie(AUTH_CSRF_COOKIE, session.csrfToken, authCookieOptions(false, AUTH_SESSION_TTL_MS));
    await safeAudit({
      eventType: "login_success",
      outcome: "success",
      principal: session.principal,
      requestId: requestId(req),
      ip: requestIp(req),
      config,
    });
    return res.redirect(302, flow.returnTo);
  } catch (error) {
    void safeAudit({
      eventType: "login_failure",
      outcome: "failure",
      requestId: requestId(req),
      ip: requestIp(req),
      config,
      metadata: { category: error instanceof Error ? error.message.slice(0, 80) : "unknown" },
    });
    clearAuthCookies(res);
    return authErrorRedirect(res, "login_failed");
  }
});

router.post("/auth/logout", authEndpointRateLimit, async (req, res) => {
  const config = loadAuthConfig();
  const sessionToken = typeof req.cookies?.[AUTH_SESSION_COOKIE] === "string" ? req.cookies[AUTH_SESSION_COOKIE] : "";
  if (config.enabled && req.auth) {
    const csrf = req.get("x-csrf-token")?.trim() ?? "";
    const csrfHash = csrf ? sha256(csrf) : "";
    if (!csrfHash || !safeEqualHex(csrfHash, req.auth.csrfTokenHash)) {
      return res.status(403).json({ error: "csrf_validation_failed" });
    }
  }
  if (sessionToken) await revokeAuthSession(sessionToken).catch(() => undefined);
  await safeAudit({
    eventType: "logout",
    outcome: "success",
    principal: req.auth ?? null,
    requestId: requestId(req),
    ip: requestIp(req),
    config,
  });
  clearAuthCookies(res);
  clearFlowCookie(res);
  return res.status(204).end();
});

export default router;
