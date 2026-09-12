import type { NextFunction, Request, Response } from "express";
import {
  AUTH_CSRF_COOKIE,
  AUTH_SESSION_COOKIE,
  authCapability,
  loadAuthConfig,
  loadAuthSession,
  requiredRoleForApiRequest,
  roleAllows,
  sha256,
  safeEqualHex,
  writeAuthAudit,
  type AppRole,
} from "../lib/auth-foundation.js";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function requestIp(req: Request): string | null {
  const forwarded = req.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.socket.remoteAddress || null;
}

function requestId(req: Request): string | null {
  const candidate = (req as Request & { id?: string | number }).id;
  return candidate == null ? null : String(candidate);
}

function effectiveRequiredRole(req: Request): AppRole {
  const path = req.path;
  if (path.startsWith("/connections/") && path !== "/connections/status") return "admin";
  if (/^\/execution\/actions\/[^/]+\/task53\/reverify-rollback$/.test(path)) return "admin";
  return requiredRoleForApiRequest(req.method, path);
}

function auditDenied(input: Parameters<typeof writeAuthAudit>[0]) {
  void writeAuthAudit(input).catch(() => undefined);
}

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  res.setHeader("Content-Security-Policy", "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; form-action 'self'");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
}

export async function attachAuthSession(req: Request, res: Response, next: NextFunction) {
  const config = loadAuthConfig();
  res.locals.authCapability = authCapability(config);
  if (!config.enabled) return next();
  if (!config.configured) return next();

  const raw = typeof req.cookies?.[AUTH_SESSION_COOKIE] === "string" ? req.cookies[AUTH_SESSION_COOKIE] : "";
  if (!raw) return next();
  try {
    const principal = await loadAuthSession(raw);
    if (principal) req.auth = principal;
  } catch {
    // Authentication fails closed at the enforcement middleware; never expose database details.
  }
  next();
}

export function requireApiAuthentication(req: Request, res: Response, next: NextFunction) {
  const config = loadAuthConfig();
  if (!config.enabled) return next();
  if (!config.configured) return res.status(503).json({ error: "authentication_configuration_invalid" });
  if (!req.auth) {
    auditDenied({
      eventType: "api_authentication_required",
      outcome: "denied",
      requestId: requestId(req),
      ip: requestIp(req),
      config,
      metadata: { method: req.method, path: req.path },
    });
    return res.status(401).json({ error: "authentication_required" });
  }

  const requiredRole = effectiveRequiredRole(req);
  if (!roleAllows(req.auth.role, requiredRole)) {
    auditDenied({
      eventType: "api_role_forbidden",
      outcome: "denied",
      principal: req.auth,
      requestId: requestId(req),
      ip: requestIp(req),
      config,
      metadata: { method: req.method, path: req.path, requiredRole },
    });
    return res.status(403).json({ error: "insufficient_role", requiredRole });
  }

  if (UNSAFE_METHODS.has(req.method.toUpperCase())) {
    const headerCsrf = req.get("x-csrf-token")?.trim() ?? "";
    const bodyCsrf = typeof req.body?._csrf === "string" ? req.body._csrf.trim() : "";
    const csrf = headerCsrf || bodyCsrf;
    const csrfHash = csrf ? sha256(csrf) : "";
    if (!csrfHash || !safeEqualHex(csrfHash, req.auth.csrfTokenHash)) {
      auditDenied({
        eventType: "api_csrf_rejected",
        outcome: "denied",
        principal: req.auth,
        requestId: requestId(req),
        ip: requestIp(req),
        config,
        metadata: { method: req.method, path: req.path },
      });
      return res.status(403).json({ error: "csrf_validation_failed" });
    }
  }

  return next();
}

export function verifiedActorId(req: Request): string {
  const config = loadAuthConfig();
  if (config.enabled) {
    if (!req.auth) throw new Error("verified_actor_missing");
    return `${req.auth.subject}:${req.auth.email}`;
  }
  return "auth_enforcement_disabled";
}

type RateBucket = { resetAt: number; count: number };
const rateBuckets = new Map<string, RateBucket>();

export function fixedWindowRateLimit(input: {
  name: string;
  max: number;
  windowMs: number;
  roleAware?: boolean;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const identity = input.roleAware && req.auth
      ? `subject:${req.auth.subject}`
      : `ip:${requestIp(req) ?? "unknown"}`;
    const key = `${input.name}:${identity}`;
    const current = rateBuckets.get(key);
    const bucket = !current || current.resetAt <= now ? { resetAt: now + input.windowMs, count: 0 } : current;
    bucket.count += 1;
    rateBuckets.set(key, bucket);
    res.setHeader("X-RateLimit-Limit", String(input.max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, input.max - bucket.count)));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > input.max) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      return res.status(429).json({ error: "rate_limit_exceeded" });
    }
    return next();
  };
}

export const authEndpointRateLimit = fixedWindowRateLimit({ name: "auth", max: 30, windowMs: 10 * 60 * 1000 });
export const sensitiveMutationRateLimit = fixedWindowRateLimit({ name: "mutation", max: 60, windowMs: 10 * 60 * 1000, roleAware: true });

export function clearAuthCookies(res: Response) {
  const secure = process.env.NODE_ENV === "production";
  res.clearCookie(AUTH_SESSION_COOKIE, { httpOnly: true, secure, sameSite: "lax", path: "/" });
  res.clearCookie(AUTH_CSRF_COOKIE, { httpOnly: false, secure, sameSite: "lax", path: "/" });
}

export function authCookieOptions(httpOnly: boolean, maxAge?: number) {
  return {
    httpOnly,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(maxAge ? { maxAge } : {}),
  };
}

export function minimumRole(role: AppRole): AppRole {
  return role;
}
