import { createHash } from "node:crypto";
import type { P88W07ExecutionIntent } from "./p8-8-policy-single-action-apply.js";

export const P8_8_W07_VERIFICATION_VERSION =
  "p8-8-w07-independent-verification-v1" as const;

export type P88W07ProviderEvidence = Readonly<{
  status: "observed" | "unavailable" | "identity_mismatch" | "invalid_response";
  rawValue: string | null;
  w02Fingerprint: string | null;
  requestId: string | null;
  evidenceFingerprint: string;
}>;

export type P88W07StorefrontEvidence = Readonly<{
  status: "verified" | "failed" | "unavailable";
  statusCode: number | null;
  evidenceFingerprint: string;
}>;

export type P88W07VerificationResult = Readonly<{
  version: typeof P8_8_W07_VERIFICATION_VERSION;
  expectedState: "before" | "after";
  expectedValue: string | null;
  expectedFingerprint: string;
  provider: P88W07ProviderEvidence;
  storefront: P88W07StorefrontEvidence;
  exactProviderVerified: boolean;
  storefrontVerified: boolean;
  status: "verified" | "failed" | "unavailable";
  failureCategories: readonly string[];
  providerWritePerformed: false;
  databaseMutationPerformed: false;
  automaticTransition: false;
  resultFingerprint: string;
}>;

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stable(nested)]),
    );
  }
  return value;
}

function hash(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(stable(value)))
    .digest("hex");
}

function canonicalCategories(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort((a, b) => a.localeCompare(b)));
}

export function p88W07ProviderMatchesExpected(input: {
  intent: P88W07ExecutionIntent;
  expectedState: "before" | "after";
  provider: P88W07ProviderEvidence;
}): boolean {
  const expectedValue = input.expectedState === "before"
    ? input.intent.state.beforeValue
    : input.intent.state.afterValue;
  const expectedFingerprint = input.expectedState === "before"
    ? input.intent.state.beforeFingerprint
    : input.intent.state.afterFingerprint;
  return (
    input.provider.status === "observed"
    && input.provider.rawValue === expectedValue
    && input.provider.w02Fingerprint === expectedFingerprint
  );
}

export function evaluateP88W07IndependentVerification(input: {
  intent: P88W07ExecutionIntent;
  expectedState: "before" | "after";
  provider: P88W07ProviderEvidence;
  storefront: P88W07StorefrontEvidence;
}): P88W07VerificationResult {
  const expectedValue = input.expectedState === "before"
    ? input.intent.state.beforeValue
    : input.intent.state.afterValue;
  const expectedFingerprint = input.expectedState === "before"
    ? input.intent.state.beforeFingerprint
    : input.intent.state.afterFingerprint;
  const exactProviderVerified = p88W07ProviderMatchesExpected(input);
  const storefrontVerified = input.storefront.status === "verified";
  const failures: string[] = [];

  if (input.provider.status === "unavailable") {
    failures.push("provider_unavailable");
  } else if (input.provider.status === "identity_mismatch") {
    failures.push("provider_identity_mismatch");
  } else if (input.provider.status === "invalid_response") {
    failures.push("provider_invalid_response");
  } else if (!exactProviderVerified) {
    failures.push("provider_exact_state_mismatch");
  }

  if (input.storefront.status === "unavailable") {
    failures.push("storefront_unavailable");
  } else if (input.storefront.status === "failed") {
    failures.push("storefront_verification_failed");
  }

  let status: "verified" | "failed" | "unavailable";
  if (exactProviderVerified && storefrontVerified) {
    status = "verified";
  } else if (
    input.provider.status === "unavailable"
    || input.storefront.status === "unavailable"
  ) {
    status = "unavailable";
  } else {
    status = "failed";
  }

  const base = {
    version: P8_8_W07_VERIFICATION_VERSION,
    expectedState: input.expectedState,
    expectedValue,
    expectedFingerprint,
    provider: input.provider,
    storefront: input.storefront,
    exactProviderVerified,
    storefrontVerified,
    status,
    failureCategories: canonicalCategories(failures),
    providerWritePerformed: false as const,
    databaseMutationPerformed: false as const,
    automaticTransition: false as const,
  };
  return Object.freeze({
    ...base,
    resultFingerprint: hash({
      purpose: "p8.8_w07_independent_verification",
      ...base,
    }),
  });
}

export async function runP88W07IndependentVerification(input: {
  intent: P88W07ExecutionIntent;
  expectedState: "before" | "after";
  readProvider: (input: {
    intent: P88W07ExecutionIntent;
    expectedState: "before" | "after";
  }) => Promise<P88W07ProviderEvidence>;
  verifyStorefront: (input: {
    intent: P88W07ExecutionIntent;
    expectedState: "before" | "after";
  }) => Promise<P88W07StorefrontEvidence>;
}): Promise<P88W07VerificationResult> {
  const provider = await input.readProvider({
    intent: input.intent,
    expectedState: input.expectedState,
  });
  const storefront = await input.verifyStorefront({
    intent: input.intent,
    expectedState: input.expectedState,
  });
  return evaluateP88W07IndependentVerification({
    intent: input.intent,
    expectedState: input.expectedState,
    provider,
    storefront,
  });
}

export function p88W07VerificationCapability() {
  return Object.freeze({
    version: P8_8_W07_VERIFICATION_VERSION,
    exactW02ProviderStateRequired: true,
    independentStorefrontEvidenceRequired: true,
    mutationReceiptIsNotSuccess: true,
    unavailableIsNotSuccess: true,
    providerWritePerformed: false,
    databaseMutationPerformed: false,
    automaticTransition: false,
    networkImplementationInjectedOnly: true,
  });
}
