import { createHmac, timingSafeEqual } from "node:crypto";
import type { CviNestedSourceIntegrityResult } from "./cvi-ugp-nested-source-integrity.js";

export const CVI_SIGNED_SOURCE_RECEIPT_VERSION = "cvi-1c6-signed-source-receipt-v1" as const;
export type CviSignedSourceReceiptClaims = Readonly<{
  version: typeof CVI_SIGNED_SOURCE_RECEIPT_VERSION;
  tenantId: string;
  siteId: string;
  authenticatedSubject: string;
  authSessionId: string;
  sourceLedgerFingerprint: string;
  nestedIntegrityFingerprint: string;
  acquisitionId: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
}>;
export type CviSignedSourceReceipt = Readonly<{
  claims: CviSignedSourceReceiptClaims;
  signature: string;
  algorithm: "HMAC-SHA256";
}>;
export type CviReceiptVerification = Readonly<{
  status: "DENY" | "PENDING_DURABLE_REPLAY_AND_PROVIDER_ORIGIN_CHECK";
  reasons: readonly string[];
  signatureVerified: boolean;
  providerOriginIndependentlyVerified: false;
  nonceUniquenessIndependentlyVerified: false;
  businessTruthIndependentlyVerified: false;
  humanApprovalAuthenticated: false;
  executionAuthorized: false;
  publicationAuthorized: false;
}>;

const HEX = /^[0-9a-f]{64}$/;
const KEY = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/;
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  const record = value as Record<string, unknown>;
  return "{" + Object.keys(record).sort().map(k => JSON.stringify(k) + ":" + canonical(record[k])).join(",") + "}";
}
function instant(v: string): number {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v))
    throw new Error("cvi_1c6_invalid_time");
  const ms = Date.parse(v);
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== v)
    throw new Error("cvi_1c6_invalid_time");
  return ms;
}
function secret(key: Buffer): Buffer {
  if (!Buffer.isBuffer(key) || key.length < 32)
    throw new Error("cvi_1c6_server_secret_too_short");
  return key;
}
function signed(claims: CviSignedSourceReceiptClaims, key: Buffer): string {
  return createHmac("sha256", secret(key)).update(
    "cvi-source-receipt\0" + canonical(claims), "utf8",
  ).digest("hex");
}
function assertClaims(claims: CviSignedSourceReceiptClaims): void {
  if (!claims || claims.version !== CVI_SIGNED_SOURCE_RECEIPT_VERSION ||
      [claims.tenantId,claims.siteId,claims.authenticatedSubject,claims.authSessionId,
       claims.acquisitionId,claims.nonce].some(x => typeof x !== "string" || !KEY.test(x)) ||
      !HEX.test(claims.sourceLedgerFingerprint) || !HEX.test(claims.nestedIntegrityFingerprint))
    throw new Error("cvi_1c6_claims_invalid");
  const issued = instant(claims.issuedAt), expires = instant(claims.expiresAt);
  if (expires <= issued || expires - issued > 300_000)
    throw new Error("cvi_1c6_receipt_window_invalid");
}

/** Offline cryptographic primitive. Must only be issued after genuine authenticated
 * server transport and account permission checks (NOT implemented here).
 * Caller-controlled secret issuance does not establish real provider origin.
 */
export function signCviSourceReceipt(claims: CviSignedSourceReceiptClaims, serverKey: Buffer): CviSignedSourceReceipt {
  assertClaims(claims);
  return { claims, signature: signed(claims, serverKey), algorithm: "HMAC-SHA256" };
}

/** Signature proves possession of the supplied secret, NOT authentic provider source
 * data or permission to publish. Never accept keys from browser requests.
 */
export function verifyCviSourceReceipt(input: Readonly<{
  receipt: CviSignedSourceReceipt;
  serverKey: Buffer;
  expectedTenantId: string;
  expectedSiteId: string;
  expectedSubject: string;
  expectedAuthSessionId: string;
  expectedAcquisitionId: string;
  expectedNonce: string;
  nestedIntegrity: CviNestedSourceIntegrityResult;
  evaluatedAt: string;
}>): CviReceiptVerification {
  const reasons: string[] = [];
  const deny = (signatureVerified: boolean): CviReceiptVerification => ({
    status: reasons.length ? "DENY" : "PENDING_DURABLE_REPLAY_AND_PROVIDER_ORIGIN_CHECK",
    reasons: [...new Set(reasons)].sort(), signatureVerified,
    providerOriginIndependentlyVerified: false, nonceUniquenessIndependentlyVerified: false,
    businessTruthIndependentlyVerified: false, humanApprovalAuthenticated: false,
    executionAuthorized: false, publicationAuthorized: false,
  });
  // Avoid throwing on malformed untrusted receipts; fail closed.
  try { assertClaims(input.receipt.claims); }
  catch { reasons.push("receipt_claims_invalid"); return deny(false); }
  const c = input.receipt.claims;
  const now = instant(input.evaluatedAt);
  if (input.receipt.algorithm !== "HMAC-SHA256" || !HEX.test(input.receipt.signature)) {
    reasons.push("signature_format_invalid"); return deny(false);
  }
  const expected = Buffer.from(signed(c,input.serverKey),"hex");
  const provided = Buffer.from(input.receipt.signature,"hex");
  const authentic = expected.length === provided.length && timingSafeEqual(expected,provided);
  if (!authentic) reasons.push("signature_invalid");
  if (c.tenantId !== input.expectedTenantId || c.siteId !== input.expectedSiteId ||
      c.authenticatedSubject !== input.expectedSubject ||
      c.authSessionId !== input.expectedAuthSessionId ||
      c.acquisitionId !== input.expectedAcquisitionId || c.nonce !== input.expectedNonce)
    reasons.push("identity_or_nonce_mismatch");
  if (now < instant(c.issuedAt) || now >= instant(c.expiresAt))
    reasons.push("receipt_expired_or_future");
  if (!input.nestedIntegrity || input.nestedIntegrity.status !== "INTEGRITY_REVIEW_ONLY" ||
      input.nestedIntegrity.nestedRecordFingerprintsVerified !== true ||
      input.nestedIntegrity.executionAuthorized !== false ||
      input.nestedIntegrity.publicationAuthorized !== false ||
      c.sourceLedgerFingerprint !== input.nestedIntegrity.ledgerFingerprint ||
      c.nestedIntegrityFingerprint !== input.nestedIntegrity.resultFingerprint)
    reasons.push("nested_source_integrity_binding_failed");
  return deny(authentic);
}
