import type { Task53ProviderState, Task53StorefrontVerification } from "./task53-production-pilot.js";

export const TASK53_ROLLBACK_REVERIFY_DELAYS_MS = [0, 1000, 2500, 5000, 10000] as const;

export type Task53RollbackPropagationAttempt = {
  attempt: number;
  delayMs: number;
  providerVerified: boolean;
  storefrontVerified: boolean;
  providerRequestId: string | null;
  providerFingerprint: string | null;
  storefrontStatusCode: number | null;
  storefrontObservedFingerprint: string | null;
  storefrontErrorCategory: string | null;
};

export type Task53RollbackPropagationResult = {
  verified: boolean;
  providerVerified: boolean;
  storefrontVerified: boolean;
  attemptCount: number;
  totalDelayMs: number;
  attempts: Task53RollbackPropagationAttempt[];
  providerState: Task53ProviderState | null;
  storefront: Task53StorefrontVerification;
};

type Sleep = (ms: number) => Promise<void>;

const defaultSleep: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function verifyTask53RollbackPropagation(input: {
  expectedProviderFingerprint: string;
  readProvider: () => Promise<Task53ProviderState | null>;
  verifyStorefront: () => Promise<Task53StorefrontVerification>;
  delaysMs?: readonly number[];
  sleep?: Sleep;
}): Promise<Task53RollbackPropagationResult> {
  const delays = input.delaysMs?.length ? input.delaysMs : TASK53_ROLLBACK_REVERIFY_DELAYS_MS;
  const sleep = input.sleep ?? defaultSleep;
  const attempts: Task53RollbackPropagationAttempt[] = [];
  let providerState: Task53ProviderState | null = null;
  let storefront: Task53StorefrontVerification | null = null;
  let providerVerified = false;
  let storefrontVerified = false;
  let totalDelayMs = 0;

  for (let index = 0; index < delays.length; index += 1) {
    const delayMs = Math.max(0, Number(delays[index] ?? 0));
    if (delayMs > 0) {
      await sleep(delayMs);
      totalDelayMs += delayMs;
    }

    [providerState, storefront] = await Promise.all([
      input.readProvider(),
      input.verifyStorefront(),
    ]);
    providerVerified = providerState?.fingerprint === input.expectedProviderFingerprint;
    storefrontVerified = storefront.ok;
    attempts.push({
      attempt: index + 1,
      delayMs,
      providerVerified,
      storefrontVerified,
      providerRequestId: providerState?.providerRequestId ?? null,
      providerFingerprint: providerState?.fingerprint ?? null,
      storefrontStatusCode: storefront.statusCode,
      storefrontObservedFingerprint: storefront.observedFingerprint,
      storefrontErrorCategory: storefront.errorCategory,
    });

    if (providerVerified && storefrontVerified) {
      return {
        verified: true,
        providerVerified,
        storefrontVerified,
        attemptCount: attempts.length,
        totalDelayMs,
        attempts,
        providerState,
        storefront,
      };
    }
  }

  if (!storefront) {
    throw new Error("task53_rollback_propagation_schedule_empty");
  }

  return {
    verified: false,
    providerVerified,
    storefrontVerified,
    attemptCount: attempts.length,
    totalDelayMs,
    attempts,
    providerState,
    storefront,
  };
}
