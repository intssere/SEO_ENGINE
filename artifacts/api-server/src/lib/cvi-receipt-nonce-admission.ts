import {
  verifyCviSourceReceipt, type CviSignedSourceReceipt,
} from "./cvi-signed-source-receipt.js";
import type { CviNestedSourceIntegrityResult } from "./cvi-ugp-nested-source-integrity.js";

export const CVI_RECEIPT_NONCE_ADMISSION_VERSION =
  "cvi-1c7-receipt-nonce-admission-v1" as const;

/** The only intended backing store is a transactionally authoritative server
 * PostgreSQL connection with dormant CVI migrations 0012-0015 applied.
 * This module does not construct it, open a connection or run a migration.
 */
export interface CviAtomicAcquisitionLedger {
  recordOnce(input: Readonly<{
    acquisitionId: string;
    tenantId: string;
    siteId: string;
    authSubject: string;
    authSessionId: string;
    connectionId: string;
    requestNonce: string;
    requestedResource: string;
    observationFingerprint: string;
    requestedAt: string;
    observedAt: string;
  }>): Promise<"RECORDED" | "DUPLICATE" | "DENIED">;
}
export type CviReceiptNonceAdmission = Readonly<{
  version: typeof CVI_RECEIPT_NONCE_ADMISSION_VERSION;
  status: "DENY" | "REPLAY_OR_COLLISION" | "RECORDED_UNTRUSTED_REVIEW_ONLY";
  reasons: readonly string[];
  receiptSignatureVerified: boolean;
  durableNonceRecorded: boolean;
  providerOriginIndependentlyVerified: false;
  evidenceTruthIndependentlyVerified: false;
  executionAuthorized: false;
  publicationAuthorized: false;
}>;

/** Single atomic database write; NEVER precheck nonce with SELECT THEN INSERT.
 * Verify the HMAC and all expected identities before invoking the write port.
 * Port injection is for offline tests; production MUST create the port inside
 * authenticated server runtime, never accept it from user-controlled data.
 */
export async function admitCviReceiptNonce(input: Readonly<{
  receipt: CviSignedSourceReceipt;
  serverKey: Buffer;
  nestedIntegrity: CviNestedSourceIntegrityResult;
  expectedTenantId: string;
  expectedSiteId: string;
  expectedSubject: string;
  expectedAuthSessionId: string;
  expectedAcquisitionId: string;
  expectedNonce: string;
  connectionId: string;
  requestedResource: string;
  observationFingerprint: string;
  requestedAt: string;
  observedAt: string;
  evaluatedAt: string;
  ledger: CviAtomicAcquisitionLedger;
}>): Promise<CviReceiptNonceAdmission> {
  const result = (status: CviReceiptNonceAdmission["status"], reasons: string[],
    signatureVerified: boolean, recorded = false): CviReceiptNonceAdmission => ({
      version: CVI_RECEIPT_NONCE_ADMISSION_VERSION,
      status, reasons, receiptSignatureVerified: signatureVerified,
      durableNonceRecorded: recorded,
      providerOriginIndependentlyVerified: false,
      evidenceTruthIndependentlyVerified: false,
      executionAuthorized: false, publicationAuthorized: false,
    });
  let verified: ReturnType<typeof verifyCviSourceReceipt>;
  try {
    verified = verifyCviSourceReceipt({
      receipt: input.receipt, serverKey: input.serverKey,
      nestedIntegrity: input.nestedIntegrity, evaluatedAt: input.evaluatedAt,
      expectedTenantId: input.expectedTenantId,
      expectedSiteId: input.expectedSiteId,
      expectedSubject: input.expectedSubject,
      expectedAuthSessionId: input.expectedAuthSessionId,
      expectedAcquisitionId: input.expectedAcquisitionId,
      expectedNonce: input.expectedNonce,
    });
  } catch {
    return result("DENY", ["receipt_verification_failed"], false);
  }
  if (!verified.signatureVerified ||
      verified.status !== "PENDING_DURABLE_REPLAY_AND_PROVIDER_ORIGIN_CHECK") {
    return result("DENY", verified.reasons, verified.signatureVerified);
  }
  const hex = /^[a-f0-9]{64}$/;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const claims = input.receipt.claims;
  if (!uuid.test(input.connectionId) || !uuid.test(input.expectedTenantId) ||
      !uuid.test(input.expectedSiteId) || !uuid.test(input.expectedAuthSessionId) ||
      !hex.test(input.observationFingerprint) ||
      !input.requestedResource || input.requestedResource.length > 2048) {
    return result("DENY", ["ledger_identity_or_resource_invalid"], true);
  }
  const requested = Date.parse(input.requestedAt);
  const observed = Date.parse(input.observedAt);
  const issued = Date.parse(claims.issuedAt);
  if (![requested, observed, issued].every(Number.isFinite) ||
      requested > observed || observed > issued ||
      issued - observed > 30_000 || observed - requested > 60_000) {
    return result("DENY", ["observation_timestamp_invalid"], true);
  }
  let outcome: Awaited<ReturnType<CviAtomicAcquisitionLedger["recordOnce"]>>;
  try {
    outcome = await input.ledger.recordOnce({
      acquisitionId: claims.acquisitionId, tenantId: claims.tenantId,
      siteId: claims.siteId, authSubject: claims.authenticatedSubject,
      authSessionId: claims.authSessionId, connectionId: input.connectionId,
      requestNonce: claims.nonce, requestedResource: input.requestedResource,
      observationFingerprint: input.observationFingerprint,
      requestedAt: input.requestedAt, observedAt: input.observedAt,
    });
  } catch {
    return result("DENY", ["atomic_ledger_write_failed"], true);
  }
  if (outcome === "DUPLICATE")
    return result("REPLAY_OR_COLLISION", ["acquisition_id_or_nonce_reused"], true);
  if (outcome !== "RECORDED")
    return result("DENY", ["ledger_admission_denied"], true);
  return result("RECORDED_UNTRUSTED_REVIEW_ONLY",
    ["provider_origin_and_source_truth_unverified"], true, true);
}

/** Use this parameterized single-statement write ONLY after server-side HMAC
 * verification and while the dormant migrations 0014/0015 are installed.
 * PostgreSQL's unique constraints prevent concurrent duplicate nonce writes.
 * Treat 23505 as DUPLICATE and any trigger/connection error as DENIED.
 * This SQL is not wired into production and confers no provider authorization.
 */
export const CVI_ATOMIC_RECEIPT_LEDGER_SQL = [
  "INSERT INTO cvi_acquisition_nonce_ledger",
  "(acquisition_id,tenant_id,site_id,auth_subject,auth_session_id,",
  "connection_id,request_nonce,requested_resource,observation_fingerprint,requested_at,observed_at)",
  "VALUES ($1,$2::uuid,$3::uuid,$4,$5::uuid,$6::uuid,$7,$8,$9,$10::timestamptz,$11::timestamptz)",
  "ON CONFLICT DO NOTHING RETURNING acquisition_id",
].join(" ") as string;
