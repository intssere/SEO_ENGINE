// PILOT-01 GSC-02 / S0: deterministic source-only contract review.
//
// This is deliberately NOT a consent gate, permission evaluator, provider
// transport, runtime readiness check, or grant verifier. Caller-supplied fields
// may be forged. Never wire this helper to a live route, token flow, database,
// scheduler, Task #70, or deployment authorization.
import {
  GSC_READONLY_EXTERNAL_ACCOUNT_ID,
  GSC_READONLY_PROFILE,
  GSC_READONLY_SCOPE,
} from "@seo-engine/oauth-connection-manager/gsc-readonly";

export const GSC_S0_PACKET_VERSION = "pilot-01-gsc02-s0-static-review-v1";
export const GSC_S0_CANONICAL_ORIGIN = "https://diamondshelf.us";
export const GSC_S0_TARGET_PROPERTY = "sc-domain:diamondshelf.us";
// Operator-reported Railway deployment candidate; NOT independently attested.
export const GSC_S0_CANDIDATE_APP_ORIGIN = "https://seo-engine-shadow-production.up.railway.app";
// Historical identifier from committed pilot documents, NOT current DB proof.
export const GSC_S0_HISTORICAL_SITE_ID = "eb1da9ee-539c-4200-8f04-f64ccaea7768";
export const GSC_S0_CALLBACK_PATH = "/api/connections/google/callback";

const ALLOWED_KEYS = new Set([
  "version",
  "environment",
  "siteId",
  "canonicalOrigin",
  "targetProperty",
  "profile",
  "externalAccountId",
  "requestedScopes",
  "includeGrantedScopes",
  "pkce",
  "stateRequired",
  "clientIdConfigKey",
  "clientSecretConfigKey",
  "appOrigin",
  "redirectUri",
]);

/** A source-only shape. It cannot assert the truth of provider or DB facts. */
export type GscStage0StaticPacket = {
  version: typeof GSC_S0_PACKET_VERSION;
  environment: "production_candidate";
  siteId: string;
  canonicalOrigin: typeof GSC_S0_CANONICAL_ORIGIN;
  targetProperty: typeof GSC_S0_TARGET_PROPERTY;
  profile: typeof GSC_READONLY_PROFILE;
  externalAccountId: typeof GSC_READONLY_EXTERNAL_ACCOUNT_ID;
  requestedScopes: readonly [typeof GSC_READONLY_SCOPE];
  includeGrantedScopes: false;
  pkce: "S256";
  stateRequired: true;
  clientIdConfigKey: "GSC_OAUTH_CLIENT_ID";
  clientSecretConfigKey: "GSC_OAUTH_CLIENT_SECRET";
  appOrigin: string;
  redirectUri: string;
};

/**
 * There is NO allowable positive execution result: even a conformant packet
 * needs independent deployed-image, Google client and DB identity attestation,
 * real operator grants, and a review of the later isolated transport.
 */
export type GscStage0StaticReview = {
  kind: "structural_review_only";
  structurallyConformant: boolean;
  findings: readonly string[];
  consentAuthorized: false;
  tokenExchangeAuthorized: false;
  providerReadAuthorized: false;
  credentialWriteAuthorized: false;
  evidenceWriteAuthorized: false;
  runtimeBindingAuthorized: false;
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  try {
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  } catch {
    return false;
  }
}

function isUnverifiedHttpsOrigin(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && url.origin === value
      && !url.username
      && !url.password
      && url.hostname !== "localhost"
      && !url.hostname.endsWith(".localhost")
      && url.hostname !== "127.0.0.1"
      && url.hostname !== "[::1]";
  } catch {
    return false;
  }
}

function isExactReadonlyScopeTuple(value: unknown): boolean {
  try {
    if (!Array.isArray(value)) return false;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== 2 || !keys.includes("0") || !keys.includes("length")) return false;
    const length = Object.getOwnPropertyDescriptor(value, "length");
    const first = Object.getOwnPropertyDescriptor(value, "0");
    return length !== undefined && "value" in length && length.value === 1
      && first !== undefined && "value" in first && first.value === GSC_READONLY_SCOPE;
  } catch {
    return false;
  }
}

export function reviewGscStage0StaticContract(input: unknown): GscStage0StaticReview {
  const findings: string[] = [];
  if (!isPlainRecord(input)) {
    findings.push("packet_must_be_plain_record");
  } else {
    // Snapshot own data DESCRIPTORS instead of reading the caller's object.
    // A Proxy can forge a data descriptor but return unrelated values from a
    // get trap; no access to input[key] is permitted after this point.
    const values: Record<string, unknown> = Object.create(null);
    try {
      const keys = Reflect.ownKeys(input);
      if (keys.some((key) => typeof key !== "string" || !ALLOWED_KEYS.has(key))) {
        findings.push("unexpected_packet_field");
      }
      if ([...ALLOWED_KEYS].some((key) => !keys.includes(key))) {
        findings.push("required_packet_field_missing");
      }
      for (const key of keys) {
        const descriptor = Object.getOwnPropertyDescriptor(input, key);
        if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
          findings.push("packet_requires_enumerable_data_fields");
        } else if (typeof key === "string" && ALLOWED_KEYS.has(key)) {
          values[key] = descriptor.value;
        }
      }
    } catch {
      findings.push("packet_introspection_failed");
    }
    if (findings.length > 0) {
      return {
        kind: "structural_review_only",
        structurallyConformant: false,
        findings,
        consentAuthorized: false,
        tokenExchangeAuthorized: false,
        providerReadAuthorized: false,
        credentialWriteAuthorized: false,
        evidenceWriteAuthorized: false,
        runtimeBindingAuthorized: false,
      };
    }
    if (values.version !== GSC_S0_PACKET_VERSION) findings.push("version_mismatch");
    if (values.environment !== "production_candidate") findings.push("environment_mismatch");
    if (values.siteId !== GSC_S0_HISTORICAL_SITE_ID) findings.push("historical_site_id_mismatch");
    if (values.canonicalOrigin !== GSC_S0_CANONICAL_ORIGIN) findings.push("canonical_origin_mismatch");
    if (values.targetProperty !== GSC_S0_TARGET_PROPERTY) findings.push("target_property_mismatch");
    if (values.profile !== GSC_READONLY_PROFILE) findings.push("profile_mismatch");
    if (values.externalAccountId !== GSC_READONLY_EXTERNAL_ACCOUNT_ID) findings.push("external_account_mismatch");
    if (!isExactReadonlyScopeTuple(values.requestedScopes)) {
      findings.push("scope_must_be_exactly_gsc_readonly");
    }
    if (values.includeGrantedScopes !== false) findings.push("incremental_scope_grants_forbidden");
    if (values.pkce !== "S256") findings.push("pkce_s256_required");
    if (values.stateRequired !== true) findings.push("state_required");
    if (values.clientIdConfigKey !== "GSC_OAUTH_CLIENT_ID") findings.push("dedicated_client_id_slot_required");
    if (values.clientSecretConfigKey !== "GSC_OAUTH_CLIENT_SECRET") findings.push("dedicated_client_secret_slot_required");
    if (!isUnverifiedHttpsOrigin(values.appOrigin)) {
      findings.push("app_origin_must_be_single_https_origin");
    }
    if (values.appOrigin !== GSC_S0_CANDIDATE_APP_ORIGIN) {
      findings.push("operator_reported_origin_candidate_mismatch");
    }
    if (
      !isUnverifiedHttpsOrigin(values.appOrigin)
      || values.redirectUri !== values.appOrigin + GSC_S0_CALLBACK_PATH
    ) {
      findings.push("exact_callback_redirect_required");
    }
  }

  return {
    kind: "structural_review_only",
    structurallyConformant: findings.length === 0,
    findings,
    consentAuthorized: false,
    tokenExchangeAuthorized: false,
    providerReadAuthorized: false,
    credentialWriteAuthorized: false,
    evidenceWriteAuthorized: false,
    runtimeBindingAuthorized: false,
  };
}
