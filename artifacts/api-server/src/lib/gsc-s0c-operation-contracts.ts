// GSC-02 S0C: source-only review of five independent OAuth operation shapes.
// This module is NOT an authorization gate or transport. Every decision remains
// false regardless of syntactic conformance. All submitted evidence is untrusted.
// No routes, network, environment reads, secrets, database or crypto operations.
import {
  GSC_READONLY_EXTERNAL_ACCOUNT_ID,
  GSC_READONLY_PROFILE,
  GSC_READONLY_SCOPE,
} from "@seo-engine/oauth-connection-manager/gsc-readonly";
import {
  GSC_S0_CANONICAL_ORIGIN,
  GSC_S0_HISTORICAL_SITE_ID,
  GSC_S0_TARGET_PROPERTY,
} from "./gsc-stage0-static-review.js";

export const GSC_S0C_VERSION = "pilot-01-gsc02-s0c-offline-review-v1" as const;
export type GscS0cOperation =
  | "consent_preflight"
  | "callback_state"
  | "token_exchange"
  | "credential_persistence"
  | "property_discovery";

// Stage descriptors are deliberately non-interchangeable; no stage can
// execute, assert identities, consume state or validate provider evidence.
const EVIDENCE_KEYS: Record<GscS0cOperation, readonly string[]> = {
  consent_preflight: ["storageCandidateFingerprint", "callbackCandidateFingerprint", "proposedWriteBoundary"],
  callback_state: ["stateClaimFingerprint", "pkceMethod", "consumptionClaimFingerprint"],
  token_exchange: ["consumptionClaimFingerprint", "scopeEvidenceFingerprint", "grantedScopes"],
  credential_persistence: ["scopeEvidenceFingerprint", "storageCandidateFingerprint", "credentialAccount", "writeBoundaryClaim"],
  property_discovery: ["storedCredentialClaimFingerprint", "discoveryGrantClaimFingerprint", "maxProperties", "maxAttempts", "retryEnabled"],
};
const PACKET_KEYS = [
  "version", "operation", "profile", "externalAccountId", "siteId", "canonicalOrigin",
  "targetProperty", "organizationFingerprint", "principalFingerprint", "sessionFingerprint",
  "clientGenerationFingerprint", "transactionFingerprint", "requestFingerprint",
  "requestedScopes", "issuedAtUtc", "expiresAtUtc", "boundaryEvidence",
] as const;

export type GscS0cPacket = {
  version: typeof GSC_S0C_VERSION;
  operation: GscS0cOperation;
  profile: typeof GSC_READONLY_PROFILE;
  externalAccountId: typeof GSC_READONLY_EXTERNAL_ACCOUNT_ID;
  siteId: string; // historical candidate, NOT certified Production DB identity
  canonicalOrigin: typeof GSC_S0_CANONICAL_ORIGIN;
  targetProperty: typeof GSC_S0_TARGET_PROPERTY;
  organizationFingerprint: string;
  principalFingerprint: string;
  sessionFingerprint: string;
  clientGenerationFingerprint: string;
  transactionFingerprint: string;
  requestFingerprint: string;
  requestedScopes: readonly [typeof GSC_READONLY_SCOPE];
  issuedAtUtc: string;
  expiresAtUtc: string;
  boundaryEvidence: Record<string, unknown>;
};
export type GscS0cReview = {
  kind: "source_only_structure_not_authority";
  operation: GscS0cOperation | null;
  structurallyConformant: boolean;
  findings: readonly string[];
  consentAuthorized: false;
  stateConsumptionAuthorized: false;
  tokenExchangeAuthorized: false;
  credentialWriteAuthorized: false;
  providerReadAuthorized: false;
  propertySelectionAuthorized: false;
  evidenceWriteAuthorized: false;
  runtimeBindingAuthorized: false;
};

// Avoid untrusted get traps and prototype inheritance: snapshot only exact,
// enumerable, own, data descriptors. Revoked Proxies fail closed.
function snapshot(value: unknown, allowed: readonly string[]): Record<string, unknown> | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== allowed.length || keys.some(k => typeof k !== "string" || !allowed.includes(k))) return null;
    const result: Record<string, unknown> = Object.create(null);
    for (const key of allowed) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) return null;
      result[key] = descriptor.value;
    }
    return result;
  } catch { return null; }
}
function exactScopes(value: unknown): boolean {
  try {
    if (!Array.isArray(value)) return false;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== 2 || !keys.includes("0") || !keys.includes("length")) return false;
    const n = Object.getOwnPropertyDescriptor(value, "length");
    const first = Object.getOwnPropertyDescriptor(value, "0");
    return Boolean(n && "value" in n && n.value === 1 && first && "value" in first && first.value === GSC_READONLY_SCOPE);
  } catch { return false; }
}
const fingerprint = (s: unknown): s is string => typeof s === "string" && /^[0-9a-f]{64}$/.test(s);
function canonicalUtc(s: unknown): number | null {
  if (typeof s !== "string" || s.length !== 24 || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(s)) return null;
  const ms = Date.parse(s);
  return Number.isFinite(ms) && new Date(ms).toISOString() === s ? ms : null;
}
function stageEvidence(operation: GscS0cOperation, value: unknown): boolean {
  const d = snapshot(value, EVIDENCE_KEYS[operation]);
  if (!d) return false;
  switch (operation) {
    case "consent_preflight":
      return fingerprint(d.storageCandidateFingerprint) && fingerprint(d.callbackCandidateFingerprint)
        && d.proposedWriteBoundary === "gsc_only_unattested";
    case "callback_state":
      return fingerprint(d.stateClaimFingerprint) && fingerprint(d.consumptionClaimFingerprint)
        && d.pkceMethod === "S256";
    case "token_exchange":
      return fingerprint(d.consumptionClaimFingerprint) && fingerprint(d.scopeEvidenceFingerprint)
        && exactScopes(d.grantedScopes);
    case "credential_persistence":
      return fingerprint(d.scopeEvidenceFingerprint) && fingerprint(d.storageCandidateFingerprint)
        && d.credentialAccount === GSC_READONLY_EXTERNAL_ACCOUNT_ID
        && d.writeBoundaryClaim === "gsc_only_unattested";
    case "property_discovery":
      return fingerprint(d.storedCredentialClaimFingerprint) && fingerprint(d.discoveryGrantClaimFingerprint)
        && d.maxProperties === 256 && d.maxAttempts === 1 && d.retryEnabled === false;
  }
}
const OPERATIONS: readonly GscS0cOperation[] = [
  "consent_preflight", "callback_state", "token_exchange", "credential_persistence", "property_discovery",
];

/**
 * Syntactic packet inspection ONLY. A true structurallyConformant result is
 * neither evidence of a trusted actor/nonce/database nor a usable grant.
 * No source-only caller claims can authorize OAuth or any stage transition.
 */
export function reviewGscS0cOperation(input: unknown): GscS0cReview {
  const findings: string[] = [];
  const p = snapshot(input, PACKET_KEYS);
  const operation: GscS0cOperation | null = p && OPERATIONS.some(op => op === p.operation)
    ? p.operation as GscS0cOperation : null;
  if (!p) findings.push("packet_requires_exact_own_data_fields");
  else {
    if (p.version !== GSC_S0C_VERSION) findings.push("version_mismatch");
    if (operation === null) findings.push("operation_unknown");
    if (p.profile !== GSC_READONLY_PROFILE || p.externalAccountId !== GSC_READONLY_EXTERNAL_ACCOUNT_ID) findings.push("gsc_profile_mismatch");
    if (p.siteId !== GSC_S0_HISTORICAL_SITE_ID || p.canonicalOrigin !== GSC_S0_CANONICAL_ORIGIN || p.targetProperty !== GSC_S0_TARGET_PROPERTY) findings.push("site_candidate_mismatch");
    if (![p.organizationFingerprint, p.principalFingerprint, p.sessionFingerprint, p.clientGenerationFingerprint, p.transactionFingerprint, p.requestFingerprint].every(fingerprint)) findings.push("identity_fingerprint_invalid");
    if (!exactScopes(p.requestedScopes)) findings.push("scope_must_be_exact_gsc_readonly");
    const issued = canonicalUtc(p.issuedAtUtc);
    const expires = canonicalUtc(p.expiresAtUtc);
    if (issued === null || expires === null || expires <= issued || expires - issued > 600_000) findings.push("timestamp_window_invalid");
    if (operation && !stageEvidence(operation, p.boundaryEvidence)) findings.push("stage_evidence_mismatch");
  }
  return {
    kind: "source_only_structure_not_authority",
    operation,
    structurallyConformant: findings.length === 0,
    findings,
    consentAuthorized: false,
    stateConsumptionAuthorized: false,
    tokenExchangeAuthorized: false,
    credentialWriteAuthorized: false,
    providerReadAuthorized: false,
    propertySelectionAuthorized: false,
    evidenceWriteAuthorized: false,
    runtimeBindingAuthorized: false,
  };
}
