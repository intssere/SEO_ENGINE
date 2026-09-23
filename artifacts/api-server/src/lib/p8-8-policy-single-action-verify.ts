import { createHash } from "node:crypto";
import {
  p88W02StateFingerprint,
  type P88W02ProductTargetBinding,
} from "./p8-8-governed-proposal-materialization.js";

export const P8_8_W07_VERIFICATION_VERSION =
  "p8-8-w07-independent-verification-v1" as const;

export type P88W07ReadObservationStatus =
  | "observed"
  | "unavailable"
  | "invalid_response"
  | "identity_mismatch";

export type P88W07ProviderReadObservation = Readonly<{
  status: P88W07ReadObservationStatus;
  resourceGid: string;
  field: "meta_description";
  rawValue: string | null;
  requestId: string | null;
  errorCategory: string | null;
}>;

export type P88W07StorefrontReadObservation = Readonly<{
  status: Exclude<P88W07ReadObservationStatus, "identity_mismatch">;
  targetUrl: string;
  field: "meta_description";
  rawValue: string | null;
  statusCode: number | null;
  errorCategory: string | null;
}>;

export type P88W07IndependentVerification = Readonly<{
  version: typeof P8_8_W07_VERIFICATION_VERSION;
  purpose: "after" | "before";
  status: "verified" | "failed" | "unavailable";
  resourceGid: string;
  targetUrl: string;
  field: "meta_description";
  expectedValue: string | null;
  expectedFingerprint: string;
  provider: Readonly<{
    status: P88W07ReadObservationStatus;
    rawValue: string | null;
    observedFingerprint: string | null;
    exactValueMatch: boolean;
    exactFingerprintMatch: boolean;
    requestId: string | null;
  }>;
  storefront: Readonly<{
    status: Exclude<P88W07ReadObservationStatus, "identity_mismatch">;
    rawValue: string | null;
    exactValueMatch: boolean;
    statusCode: number | null;
  }>;
  providerVerified: boolean;
  storefrontVerified: boolean;
  failureCategories: readonly string[];
  resultFingerprint: string;
  providerWritePerformed: false;
  storefrontWritePerformed: false;
  databaseMutationPerformed: false;
}>;

export type P88W07VerificationDependencies = Readonly<{
  readProvider: () => Promise<P88W07ProviderReadObservation>;
  readStorefront: () => Promise<P88W07StorefrontReadObservation>;
}>;

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => JSON.stringify(key) + ":" + stableJson(object[key]))
    .join(",") + "}";
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export async function verifyP88W07IndependentState(input: {
  purpose: "after" | "before";
  target: P88W02ProductTargetBinding;
  expectedValue: string | null;
  expectedFingerprint: string;
  dependencies: P88W07VerificationDependencies;
}): Promise<P88W07IndependentVerification> {
  const failures: string[] = [];
  let provider: P88W07ProviderReadObservation;
  try {
    provider = await input.dependencies.readProvider();
  } catch {
    provider = {
      status: "unavailable",
      resourceGid: input.target.resourceGid,
      field: "meta_description",
      rawValue: null,
      requestId: null,
      errorCategory: "provider_read_threw",
    };
  }

  let storefront: P88W07StorefrontReadObservation;
  try {
    storefront = await input.dependencies.readStorefront();
  } catch {
    storefront = {
      status: "unavailable",
      targetUrl: input.target.targetUrl,
      field: "meta_description",
      rawValue: null,
      statusCode: null,
      errorCategory: "storefront_read_threw",
    };
  }

  const observedFingerprint =
    provider.status === "observed"
      ? p88W02StateFingerprint({
          target: input.target,
          value: provider.rawValue,
          purpose: input.purpose,
        })
      : null;

  const providerIdentityMatch =
    provider.resourceGid === input.target.resourceGid
    && provider.field === "meta_description";
  const providerExactValueMatch =
    provider.status === "observed"
    && providerIdentityMatch
    && provider.rawValue === input.expectedValue;
  const providerExactFingerprintMatch =
    observedFingerprint === input.expectedFingerprint;

  if (provider.status === "unavailable") {
    failures.push(provider.errorCategory ?? "provider_unavailable");
  } else if (provider.status === "invalid_response") {
    failures.push(provider.errorCategory ?? "provider_invalid_response");
  } else if (provider.status === "identity_mismatch" || !providerIdentityMatch) {
    failures.push(provider.errorCategory ?? "provider_identity_mismatch");
  } else {
    if (!providerExactValueMatch) failures.push("provider_exact_value_mismatch");
    if (!providerExactFingerprintMatch) {
      failures.push("provider_w02_fingerprint_mismatch");
    }
  }

  const storefrontIdentityMatch =
    storefront.targetUrl === input.target.targetUrl
    && storefront.field === "meta_description";
  const storefrontExactValueMatch =
    storefront.status === "observed"
    && storefrontIdentityMatch
    && storefront.rawValue === input.expectedValue;

  if (storefront.status === "unavailable") {
    failures.push(storefront.errorCategory ?? "storefront_unavailable");
  } else if (storefront.status === "invalid_response") {
    failures.push(storefront.errorCategory ?? "storefront_invalid_response");
  } else {
    if (!storefrontIdentityMatch) failures.push("storefront_identity_mismatch");
    if (!storefrontExactValueMatch) {
      failures.push("storefront_exact_value_mismatch");
    }
  }

  const providerVerified =
    provider.status === "observed"
    && providerExactValueMatch
    && providerExactFingerprintMatch;
  const storefrontVerified =
    storefront.status === "observed"
    && storefrontIdentityMatch
    && storefrontExactValueMatch;

  const hasUnavailable =
    provider.status === "unavailable" || storefront.status === "unavailable";
  const status: P88W07IndependentVerification["status"] =
    providerVerified && storefrontVerified && failures.length === 0
      ? "verified"
      : hasUnavailable
        ? "unavailable"
        : "failed";

  const base = {
    version: P8_8_W07_VERIFICATION_VERSION,
    purpose: input.purpose,
    status,
    resourceGid: input.target.resourceGid,
    targetUrl: input.target.targetUrl,
    field: "meta_description" as const,
    expectedValue: input.expectedValue,
    expectedFingerprint: input.expectedFingerprint,
    provider: {
      status: provider.status,
      rawValue: provider.rawValue,
      observedFingerprint,
      exactValueMatch: providerExactValueMatch,
      exactFingerprintMatch: providerExactFingerprintMatch,
      requestId: provider.requestId,
    },
    storefront: {
      status: storefront.status,
      rawValue: storefront.rawValue,
      exactValueMatch: storefrontExactValueMatch,
      statusCode: storefront.statusCode,
    },
    providerVerified,
    storefrontVerified,
    failureCategories: [...new Set(failures)].sort((a, b) => a.localeCompare(b)),
    providerWritePerformed: false as const,
    storefrontWritePerformed: false as const,
    databaseMutationPerformed: false as const,
  };
  return Object.freeze({
    ...base,
    resultFingerprint: stableHash({
      fingerprintDomain: "p8.8_w07_independent_verification",
      ...base,
    }),
  });
}

export function p88W07VerificationCapability() {
  return Object.freeze({
    version: P8_8_W07_VERIFICATION_VERSION,
    providerAndStorefrontBothRequired: true,
    exactW02ProviderFingerprintRequired: true,
    exactRawProviderValueRequired: true,
    exactRawStorefrontValueRequired: true,
    mutationReceiptAloneIsSuccess: false,
    boundedReadRetryMayBeLayeredByCaller: true,
    writeRetryAllowed: false,
    providerWritePerformed: false,
    storefrontWritePerformed: false,
    databaseMutationPerformed: false,
  });
}
