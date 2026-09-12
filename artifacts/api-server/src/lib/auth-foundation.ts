import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import postgres from "postgres";

export const AUTH_VERSION = "application_auth_rbac_foundation_v1" as const;
export const AUTH_SESSION_COOKIE = "seo_engine_session";
export const AUTH_CSRF_COOKIE = "seo_engine_csrf";
export const AUTH_FLOW_COOKIE = "seo_engine_auth_flow";
export const AUTH_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const AUTH_IDLE_TTL_MS = 30 * 60 * 1000;
export const AUTH_FLOW_TTL_MS = 10 * 60 * 1000;
export const AUTH_ROTATION_AFTER_MS = 15 * 60 * 1000;

export type AppRole = "viewer" | "operator" | "admin";

export type AuthPrincipal = {
  sessionId: string;
  subject: string;
  email: string;
  displayName: string | null;
  role: AppRole;
  csrfTokenHash: string;
  issuedAt: string;
  lastSeenAt: string;
  expiresAt: string;
};

export type AuthConfig = {
  enabled: boolean;
  configured: boolean;
  publicOrigin: string | null;
  googleClientId: string | null;
  googleClientSecret: string | null;
  sessionSecret: string | null;
  adminEmails: Set<string>;
  operatorEmails: Set<string>;
  viewerEmails: Set<string>;
  issues: string[];
};

type Env = Record<string, string | undefined>;

function truthy(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

function emailSet(value: string | undefined): Set<string> {
  return new Set((value ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean));
}

function safeOrigin(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function loadAuthConfig(env: Env = process.env): AuthConfig {
  const enabled = truthy(env.AUTH_ENFORCEMENT_ENABLED);
  const publicOrigin = safeOrigin(env.AUTH_PUBLIC_ORIGIN);
  const googleClientId = env.AUTH_GOOGLE_CLIENT_ID?.trim() || null;
  const googleClientSecret = env.AUTH_GOOGLE_CLIENT_SECRET?.trim() || null;
  const sessionSecret = env.AUTH_SESSION_SECRET?.trim() || null;
  const adminEmails = emailSet(env.AUTH_ADMIN_EMAILS);
  const operatorEmails = emailSet(env.AUTH_OPERATOR_EMAILS);
  const viewerEmails = emailSet(env.AUTH_VIEWER_EMAILS);
  const issues: string[] = [];

  if (!publicOrigin) issues.push("AUTH_PUBLIC_ORIGIN_missing_or_invalid");
  if (!googleClientId) issues.push("AUTH_GOOGLE_CLIENT_ID_missing");
  if (!googleClientSecret) issues.push("AUTH_GOOGLE_CLIENT_SECRET_missing");
  if (!sessionSecret || Buffer.byteLength(sessionSecret, "utf8") < 32) issues.push("AUTH_SESSION_SECRET_missing_or_too_short");
  if (adminEmails.size === 0) issues.push("AUTH_ADMIN_EMAILS_empty");

  return {
    enabled,
    configured: issues.length === 0,
    publicOrigin,
    googleClientId,
    googleClientSecret,
    sessionSecret,
    adminEmails,
    operatorEmails,
    viewerEmails,
    issues,
  };
}

export function roleForEmail(email: string, config: AuthConfig): AppRole | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  if (config.adminEmails.has(normalized)) return "admin";
  if (config.operatorEmails.has(normalized)) return "operator";
  if (config.viewerEmails.has(normalized)) return "viewer";
  return null;
}

export function roleAllows(actual: AppRole, required: AppRole): boolean {
  const weight: Record<AppRole, number> = { viewer: 1, operator: 2, admin: 3 };
  return weight[actual] >= weight[required];
}

export function requiredRoleForApiRequest(method: string, path: string): AppRole {
  const normalizedMethod = method.toUpperCase();
  if (normalizedMethod === "GET" || normalizedMethod === "HEAD" || normalizedMethod === "OPTIONS") return "viewer";
  if (/^\/approvals\/[^/]+\/(decision|draft)$/.test(path)) return "operator";
  if (/^\/execution\/[^/]+\/task5[34]\/preflight$/.test(path)) return "operator";
  return "admin";
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hmacSha256(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function safeEqualHex(left: string, right: string): boolean {
  if (!/^[0-9a-f]+$/i.test(left) || !/^[0-9a-f]+$/i.test(right) || left.length !== right.length || left.length % 2 !== 0) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export type AuthFlow = {
  state: string;
  nonce: string;
  codeVerifier: string;
  returnTo: string;
  issuedAt: number;
  expiresAt: number;
};

export function createAuthFlow(returnTo = "/", now = Date.now()): AuthFlow {
  const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
  return {
    state: randomToken(24),
    nonce: randomToken(24),
    codeVerifier: randomToken(48),
    returnTo: safeReturnTo,
    issuedAt: now,
    expiresAt: now + AUTH_FLOW_TTL_MS,
  };
}

export function sealAuthFlow(flow: AuthFlow, secret: string): string {
  const payload = Buffer.from(JSON.stringify(flow), "utf8").toString("base64url");
  return `${payload}.${hmacSha256(payload, secret)}`;
}

export function unsealAuthFlow(value: string, secret: string, now = Date.now()): AuthFlow | null {
  const [payload, signature, ...rest] = value.split(".");
  if (!payload || !signature || rest.length > 0) return null;
  const expected = hmacSha256(payload, secret);
  if (!safeEqualHex(signature, expected)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<AuthFlow>;
    if (typeof parsed.state !== "string" || typeof parsed.nonce !== "string" || typeof parsed.codeVerifier !== "string" || typeof parsed.returnTo !== "string" || typeof parsed.issuedAt !== "number" || typeof parsed.expiresAt !== "number") return null;
    if (parsed.expiresAt <= now || parsed.issuedAt > now + 60_000) return null;
    return parsed as AuthFlow;
  } catch {
    return null;
  }
}

export function buildGoogleLoginUrl(config: AuthConfig, flow: AuthFlow): string {
  if (!config.configured || !config.publicOrigin || !config.googleClientId) throw new Error("auth_configuration_invalid");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", config.googleClientId);
  url.searchParams.set("redirect_uri", `${config.publicOrigin}/api/auth/google/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", flow.state);
  url.searchParams.set("nonce", flow.nonce);
  url.searchParams.set("code_challenge", pkceChallenge(flow.codeVerifier));
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export type GoogleIdentity = {
  subject: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
  nonce: string | null;
};

export async function exchangeGoogleLoginCode(input: {
  config: AuthConfig;
  code: string;
  flow: AuthFlow;
  fetchImpl?: typeof fetch;
}): Promise<GoogleIdentity> {
  const { config, code, flow } = input;
  if (!config.configured || !config.publicOrigin || !config.googleClientId || !config.googleClientSecret) throw new Error("auth_configuration_invalid");
  const fetchImpl = input.fetchImpl ?? fetch;
  const tokenResponse = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({
      code,
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      redirect_uri: `${config.publicOrigin}/api/auth/google/callback`,
      grant_type: "authorization_code",
      code_verifier: flow.codeVerifier,
    }),
  });
  if (!tokenResponse.ok) throw new Error("google_token_exchange_failed");
  const token = await tokenResponse.json() as Record<string, unknown>;
  const idToken = typeof token.id_token === "string" ? token.id_token : "";
  if (!idToken) throw new Error("google_id_token_missing");

  const verificationResponse = await fetchImpl(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, {
    headers: { accept: "application/json" },
  });
  if (!verificationResponse.ok) throw new Error("google_id_token_verification_failed");
  const claims = await verificationResponse.json() as Record<string, unknown>;
  const audience = typeof claims.aud === "string" ? claims.aud : "";
  const issuer = typeof claims.iss === "string" ? claims.iss : "";
  const expiresAt = Number(claims.exp ?? 0) * 1000;
  const email = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
  const subject = typeof claims.sub === "string" ? claims.sub : "";
  const emailVerified = claims.email_verified === "true" || claims.email_verified === true;
  const nonce = typeof claims.nonce === "string" ? claims.nonce : null;
  const displayName = typeof claims.name === "string" && claims.name.trim() ? claims.name.trim() : null;

  if (audience !== config.googleClientId) throw new Error("google_id_token_audience_mismatch");
  if (issuer !== "accounts.google.com" && issuer !== "https://accounts.google.com") throw new Error("google_id_token_issuer_mismatch");
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw new Error("google_id_token_expired");
  if (!subject || !email || !emailVerified) throw new Error("google_identity_incomplete");
  if (nonce !== flow.nonce) throw new Error("google_id_token_nonce_mismatch");
  return { subject, email, emailVerified, displayName, nonce };
}

function database() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("auth_database_unavailable");
  return postgres(url, { max: 2, prepare: false, connect_timeout: 5, idle_timeout: 2 });
}

export async function createAuthSession(input: {
  subject: string;
  email: string;
  displayName: string | null;
  role: AppRole;
  userAgent?: string | null;
  ip?: string | null;
  config: AuthConfig;
  now?: Date;
}): Promise<{ token: string; csrfToken: string; principal: AuthPrincipal }> {
  if (!input.config.sessionSecret) throw new Error("auth_configuration_invalid");
  const now = input.now ?? new Date();
  const token = randomToken(32);
  const csrfToken = randomToken(24);
  const tokenHash = sha256(token);
  const csrfTokenHash = sha256(csrfToken);
  const expiresAt = new Date(now.getTime() + AUTH_SESSION_TTL_MS);
  const userAgentHash = input.userAgent ? hmacSha256(input.userAgent, input.config.sessionSecret) : null;
  const ipHash = input.ip ? hmacSha256(input.ip, input.config.sessionSecret) : null;
  const sql = database();
  try {
    const rows = await sql<Array<{ id: string; createdAt: string; lastSeenAt: string; expiresAt: string }>>`
      INSERT INTO auth_sessions(token_hash,subject,email,display_name,role,csrf_token_hash,user_agent_hash,ip_hash,created_at,last_seen_at,expires_at)
      VALUES(${tokenHash},${input.subject},${input.email.toLowerCase()},${input.displayName},${input.role},${csrfTokenHash},${userAgentHash},${ipHash},${now.toISOString()},${now.toISOString()},${expiresAt.toISOString()})
      RETURNING id::text AS id,created_at::text AS "createdAt",last_seen_at::text AS "lastSeenAt",expires_at::text AS "expiresAt"`;
    const row = rows[0];
    if (!row) throw new Error("auth_session_create_failed");
    return {
      token,
      csrfToken,
      principal: {
        sessionId: row.id,
        subject: input.subject,
        email: input.email.toLowerCase(),
        displayName: input.displayName,
        role: input.role,
        csrfTokenHash,
        issuedAt: row.createdAt,
        lastSeenAt: row.lastSeenAt,
        expiresAt: row.expiresAt,
      },
    };
  } finally {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  }
}

export async function loadAuthSession(token: string, now = new Date()): Promise<AuthPrincipal | null> {
  if (!token) return null;
  const sql = database();
  try {
    const rows = await sql<Array<{
      id: string;
      subject: string;
      email: string;
      displayName: string | null;
      role: AppRole;
      csrfTokenHash: string;
      createdAt: string;
      lastSeenAt: string;
      expiresAt: string;
    }>>`
      SELECT id::text,subject,email,display_name AS "displayName",role,csrf_token_hash AS "csrfTokenHash",created_at::text AS "createdAt",last_seen_at::text AS "lastSeenAt",expires_at::text AS "expiresAt"
      FROM auth_sessions
      WHERE token_hash=${sha256(token)} AND revoked_at IS NULL AND expires_at>${now.toISOString()}::timestamptz
        AND last_seen_at>${new Date(now.getTime() - AUTH_IDLE_TTL_MS).toISOString()}::timestamptz
      LIMIT 1`;
    const row = rows[0];
    if (!row) return null;
    await sql`UPDATE auth_sessions SET last_seen_at=${now.toISOString()} WHERE id=${row.id}::uuid`;
    return {
      sessionId: row.id,
      subject: row.subject,
      email: row.email,
      displayName: row.displayName,
      role: row.role,
      csrfTokenHash: row.csrfTokenHash,
      issuedAt: row.createdAt,
      lastSeenAt: now.toISOString(),
      expiresAt: row.expiresAt,
    };
  } finally {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  }
}

export async function rotateAuthSessionToken(sessionId: string): Promise<string> {
  const token = randomToken(32);
  const sql = database();
  try {
    await sql`UPDATE auth_sessions SET token_hash=${sha256(token)},last_seen_at=now() WHERE id=${sessionId}::uuid AND revoked_at IS NULL`;
    return token;
  } finally {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  }
}

export async function revokeAuthSession(token: string): Promise<void> {
  if (!token) return;
  const sql = database();
  try {
    await sql`UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE token_hash=${sha256(token)}`;
  } finally {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  }
}

export async function writeAuthAudit(input: {
  eventType: string;
  outcome: "success" | "failure" | "denied";
  principal?: AuthPrincipal | null;
  requestId?: string | null;
  ip?: string | null;
  config: AuthConfig;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const sql = database();
  try {
    const ipHash = input.ip && input.config.sessionSecret ? hmacSha256(input.ip, input.config.sessionSecret) : null;
    await sql`
      INSERT INTO auth_audit_events(session_id,subject,email,role,event_type,outcome,request_id,ip_hash,metadata)
      VALUES(${input.principal?.sessionId ?? null}::uuid,${input.principal?.subject ?? null},${input.principal?.email ?? null},${input.principal?.role ?? null},${input.eventType},${input.outcome},${input.requestId ?? null},${ipHash},${sql.json((input.metadata ?? {}) as never)})`;
  } catch {
    // Audit persistence must not leak secrets or turn auth failures into application crashes.
  } finally {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  }
}

export function authCapability(config = loadAuthConfig()) {
  return {
    version: AUTH_VERSION,
    enforcementEnabled: config.enabled,
    configured: config.configured,
    provider: "google_oidc",
    allowlistOnly: true,
    publicRegistrationEnabled: false,
    roles: ["viewer", "operator", "admin"] as const,
    session: {
      storage: "server_side_postgres",
      cookieHttpOnly: true,
      cookieSecureInProduction: true,
      sameSite: "lax",
      absoluteTtlMinutes: AUTH_SESSION_TTL_MS / 60_000,
      idleTtlMinutes: AUTH_IDLE_TTL_MS / 60_000,
      csrfRequiredForUnsafeMethods: true,
    },
    missingConfiguration: config.configured ? [] : [...config.issues],
    secretsExposed: false,
  };
}
