import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const PILOT_AUTH_COOKIE = "seo_pilot_run_authorization";
const MAX_AGE_MS = 5 * 60 * 1000;

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createPilotAuthorization(secret: string, now = Date.now()) {
  if (secret.length < 16) throw new Error("pilot_authorization_unavailable");
  const payload = Buffer.from(JSON.stringify({ issuedAt: now, nonce: randomBytes(24).toString("base64url") })).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

export function verifyPilotAuthorization(token: string | undefined, secret: string, now = Date.now()) {
  if (!token || secret.length < 16) return false;
  const [payload, supplied] = token.split(".");
  if (!payload || !supplied) return false;
  const expected = Buffer.from(signature(payload, secret));
  const received = Buffer.from(supplied);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as { issuedAt?: unknown; nonce?: unknown };
    return typeof parsed.issuedAt === "number"
      && typeof parsed.nonce === "string"
      && parsed.nonce.length >= 24
      && now >= parsed.issuedAt
      && now - parsed.issuedAt <= MAX_AGE_MS;
  } catch {
    return false;
  }
}

export function isSameOriginRequest(originHeader: string | undefined, hostHeader: string | undefined) {
  if (!originHeader || !hostHeader) return false;
  try {
    return new URL(originHeader).host.toLowerCase() === hostHeader.toLowerCase();
  } catch {
    return false;
  }
}