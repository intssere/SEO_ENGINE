import { createHmac, timingSafeEqual } from "node:crypto";
import {
  signCviSourceReceipt, verifyCviSourceReceipt,
  type CviSignedSourceReceipt, type CviSignedSourceReceiptClaims,
  type CviReceiptVerification,
} from "./cvi-signed-source-receipt.js";
import type { CviNestedSourceIntegrityResult } from "./cvi-ugp-nested-source-integrity.js";

export const CVI_SERVER_KEYRING_CUSTODY_VERSION = "cvi-1c9-server-keyring-custody-v1" as const;
export type CviKeyState = "issuing" | "verify_only" | "revoked";
export type CviCustodyKeyConfig = Readonly<{
  keyId: string;
  secret: Buffer;
  state: CviKeyState;
}>;
export type CviKeyBoundSourceReceipt = Readonly<{
  custodyVersion: typeof CVI_SERVER_KEYRING_CUSTODY_VERSION;
  keyId: string;
  receipt: CviSignedSourceReceipt;
  keyBindingMac: string;
}>;
export type CviKeyBoundReceiptReview = Readonly<{
  status: "DENY" | "PENDING_DURABLE_REPLAY_AND_PROVIDER_ORIGIN_CHECK";
  reasons: readonly string[];
  signatureVerified: boolean;
  keyIdRecognized: boolean;
  keyNotRevoked: boolean;
  providerOriginIndependentlyVerified: false;
  durableReplayIndependentlyChecked: false;
  humanApprovalAuthenticated: false;
  executionAuthorized: false;
  publicationAuthorized: false;
}>;

type StoredKey = { secret: Buffer; state: CviKeyState };
const KEY_ID = /^[A-Za-z][A-Za-z0-9_.:-]{0,63}$/;
const MAC = /^[a-f0-9]{64}$/;

function bindMac(id: string, signature: string, secret: Buffer): string {
  return createHmac("sha256", secret)
    .update("cvi-1c9-key-id-binding\0" + id + "\0" + signature, "utf8")
    .digest("hex");
}
function denied(reason: string, recognized = false, notRevoked = false): CviKeyBoundReceiptReview {
  return {
    status: "DENY", reasons: [reason], signatureVerified: false,
    keyIdRecognized: recognized, keyNotRevoked: notRevoked,
    providerOriginIndependentlyVerified: false, durableReplayIndependentlyChecked: false,
    humanApprovalAuthenticated: false, executionAuthorized: false, publicationAuthorized: false,
  };
}
/**
 * In-memory offline *boundary*, not runtime secret provisioning. The owner must
 * construct it in trusted server startup from a vetted secret manager. Do not
 * construct from HTTP requests, browser data, repository secrets or tenant input.
 * Secret material is copied; key rotation/revocation must be controlled outside
 * the request path. No provider attestation or DB replay check is performed.
 */
export class CviServerKeyringCustody {
  readonly #keys = new Map<string, StoredKey>();
  constructor(configs: readonly CviCustodyKeyConfig[]) {
    if (!Array.isArray(configs) || configs.length === 0 || configs.length > 8)
      throw new Error("cvi_keyring_invalid_size");
    const fingerprints = new Set<string>();
    for (const config of configs) {
      if (!config || typeof config.keyId !== "string" || !KEY_ID.test(config.keyId) ||
          this.#keys.has(config.keyId) || !Buffer.isBuffer(config.secret) ||
          config.secret.length < 32 || !["issuing","verify_only","revoked"].includes(config.state))
        throw new Error("cvi_keyring_invalid_key_config");
      // Avoid duplicate symmetric secrets across KIDs.
      const fingerprint = createHmac("sha256", config.secret).update("cvi-1c9-unique-key-check").digest("hex");
      if (fingerprints.has(fingerprint)) throw new Error("cvi_keyring_duplicate_key_material");
      fingerprints.add(fingerprint);
      this.#keys.set(config.keyId, { secret: Buffer.from(config.secret), state: config.state });
    }
  }
  issue(keyId: string, claims: CviSignedSourceReceiptClaims): CviKeyBoundSourceReceipt {
    const key = this.#keys.get(keyId);
    if (!key || key.state !== "issuing") throw new Error("cvi_keyring_issuance_not_allowed");
    const receipt = signCviSourceReceipt(claims, key.secret);
    return {
      custodyVersion: CVI_SERVER_KEYRING_CUSTODY_VERSION,
      keyId, receipt, keyBindingMac: bindMac(keyId, receipt.signature, key.secret),
    };
  }
  verify(input: Readonly<{
    boundReceipt: CviKeyBoundSourceReceipt;
    nestedIntegrity: CviNestedSourceIntegrityResult;
    expectedTenantId: string;
    expectedSiteId: string;
    expectedSubject: string;
    expectedAuthSessionId: string;
    expectedAcquisitionId: string;
    expectedNonce: string;
    evaluatedAt: string;
  }>): CviKeyBoundReceiptReview {
    const bound = input.boundReceipt;
    if (!bound || bound.custodyVersion !== CVI_SERVER_KEYRING_CUSTODY_VERSION ||
        typeof bound.keyId !== "string" || !KEY_ID.test(bound.keyId))
      return denied("key_binding_invalid");
    const key = this.#keys.get(bound.keyId);
    if (!key) return denied("key_id_unrecognized");
    if (key.state === "revoked") return denied("key_revoked", true);
    if (!bound.receipt || typeof bound.keyBindingMac !== "string" || !MAC.test(bound.keyBindingMac))
      return denied("key_binding_invalid", true, true);
    const expected = Buffer.from(bindMac(bound.keyId,bound.receipt.signature,key.secret),"hex");
    const actual = Buffer.from(bound.keyBindingMac,"hex");
    if (expected.length !== actual.length || !timingSafeEqual(expected,actual))
      return denied("key_binding_signature_invalid",true,true);
    let verified: CviReceiptVerification;
    try {
      verified = verifyCviSourceReceipt({
        receipt:bound.receipt,serverKey:key.secret,nestedIntegrity:input.nestedIntegrity,
        expectedTenantId:input.expectedTenantId,expectedSiteId:input.expectedSiteId,
        expectedSubject:input.expectedSubject,expectedAuthSessionId:input.expectedAuthSessionId,
        expectedAcquisitionId:input.expectedAcquisitionId,expectedNonce:input.expectedNonce,
        evaluatedAt:input.evaluatedAt,
      });
    } catch {
      return denied("receipt_verification_failed",true,true);
    }
    return {
      status:verified.status, reasons:verified.reasons,
      signatureVerified:verified.signatureVerified,
      keyIdRecognized:true, keyNotRevoked:true,
      providerOriginIndependentlyVerified:false,
      durableReplayIndependentlyChecked:false,
      humanApprovalAuthenticated:false,
      executionAuthorized:false,publicationAuthorized:false,
    };
  }
}
