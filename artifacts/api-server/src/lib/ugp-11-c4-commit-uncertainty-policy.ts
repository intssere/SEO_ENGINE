/** UGP-11.C4 conservative commit-uncertainty disposition (pure, non-operational).
 * An interrupted COMMIT acknowledgement is never proof of rollback.
 * This module grants no P9, worker, provider, or retry authority.
 */
export type CommitObservation =
  | { kind: "durable_attempt"; attemptId: string; fingerprint: string; outcome: "committed" | "rolled_back"; independentlyVerified: true }
  | { kind: "missing" | "conflicting" | "unavailable" | "writer_ack_only" }
  | { kind: "durable_attempt"; attemptId: string; fingerprint: string; outcome: "committed" | "rolled_back"; independentlyVerified: false };

export type CommitDisposition = Readonly<{
  outcome: "committed" | "rolled_back" | "manual_intervention_required";
  automaticRetryAllowed: false;
  providerDispatchAllowed: false;
  productionAuthority: false;
}>;

/** No fallback from snapshot similarity, writer ACK, or elapsed time to durable proof. */
export function reconcileUncertainCommit(
  expected: Readonly<{ attemptId: string; fingerprint: string }>,
  observation: CommitObservation,
): CommitDisposition {
  const uncertain = {
    outcome: "manual_intervention_required",
    automaticRetryAllowed: false,
    providerDispatchAllowed: false,
    productionAuthority: false,
  } as const;
  if (!expected.attemptId || !/^[0-9a-f]{64}$/.test(expected.fingerprint)) return uncertain;
  if (observation.kind !== "durable_attempt" || !observation.independentlyVerified) return uncertain;
  if (observation.attemptId !== expected.attemptId ||
      observation.fingerprint !== expected.fingerprint) return uncertain;
  return {
    outcome: observation.outcome,
    automaticRetryAllowed: false,
    providerDispatchAllowed: false,
    productionAuthority: false,
  };
}
