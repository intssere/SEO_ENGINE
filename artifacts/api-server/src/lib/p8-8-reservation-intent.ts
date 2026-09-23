import { createHash } from "node:crypto";
import {
  P8_8_INITIAL_POLICY_CLASS,
  P8_8_W01_POLICY_VERSION,
  assertP88PolicyGrantIntegrity,
  evaluateP88PolicyAdmission,
  type P88PolicyEvaluation,
  type P88PolicyEvaluationInput,
} from "./p8-8-policy-grant-evaluation.js";
import {
  P8_8_W02_INITIAL_MUTATION_CLASS,
  P8_8_W02_MATERIALIZATION_VERSION,
  assertP88W02TargetBindingIntegrity,
  materializeP88W02GovernedProposal,
  type P88W02GovernedProposalMaterialization,
  type P88W02MaterializationInput,
} from "./p8-8-governed-proposal-materialization.js";
import {
  P8_8_W03_POLICY_AUTHORIZATION_VERSION,
  buildP88W03PolicyAuthorization,
  type P88W03PolicyAuthorizationArtifact,
  type P88W03PolicyAuthorizationInput,
} from "./p8-8-policy-authorization.js";

export const P8_8_W04_RESERVATION_INTENT_VERSION =
  "p8-8-w04-reservation-intent-v1" as const;
export const P8_8_W04_DURABLE_RESERVATION_VERSION =
  "p8-8-w04-durable-reservation-v1" as const;
export const P8_8_W04_RESERVATION_CLASS =
  "shopify.product.seo.meta_description" as const;

export type P88W04ReservationIntentInput = {
  w01EvaluationInput: P88PolicyEvaluationInput;
  w01Evaluation: P88PolicyEvaluation;
  w02MaterializationInput: P88W02MaterializationInput;
  w02Materialization: P88W02GovernedProposalMaterialization;
};

export type P88W04ReservationIntent = Readonly<{
  version: typeof P8_8_W04_RESERVATION_INTENT_VERSION;
  reservationClass: typeof P8_8_W04_RESERVATION_CLASS;
  reservationId: string;
  reservationFingerprint: string;
  siteId: string;
  policy: Readonly<{
    policyId: string;
    policyVersion: string;
    policyFingerprint: string;
  }>;
  evaluation: Readonly<{
    evaluationId: string;
    evaluationFingerprint: string;
  }>;
  materialization: Readonly<{
    materializationId: string;
    materializationFingerprint: string;
    materializationIdempotencyFingerprint: string;
  }>;
  proposal: Readonly<{
    proposalId: string;
    proposalFingerprint: string;
  }>;
  recommendation: Readonly<{
    recommendationFingerprint: string;
    recommendationIdempotencyKey: string;
  }>;
  target: Readonly<{
    targetBindingFingerprint: string;
    provider: "shopify";
    domain: "diamondshelf.us";
    resourceKind: "product";
    resourceGid: string;
    targetUrl: string;
    actionType: "update_meta_description";
    field: "meta_description";
    requiredProviderScope: "write_products";
  }>;
  state: Readonly<{
    beforeFingerprint: string;
    afterFingerprint: string;
  }>;
  safety: ReturnType<typeof p88W04ReservationIntentCapability>;
}>;

export type P88W04W03Binding = Readonly<{
  version: "p8-8-w04-w03-precommit-binding-v1";
  reservationId: string;
  reservationFingerprint: string;
  reservationDescriptorFingerprint: string;
  policyAuthorizationId: string;
  policyAuthorizationFingerprint: string;
  policyActionId: string;
  bindingFingerprint: string;
  durableReservationCreated: false;
  providerDispatchAuthorized: false;
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

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}

function canonicalW01(
  input: P88PolicyEvaluationInput,
  supplied: P88PolicyEvaluation,
): P88PolicyEvaluation {
  assertP88PolicyGrantIntegrity(input.grant);
  const rebuilt = evaluateP88PolicyAdmission(input);
  if (stableJson(rebuilt) !== stableJson(supplied)) {
    throw new Error("p88_w04_w01_evaluation_integrity_mismatch");
  }
  if (rebuilt.version !== P8_8_W01_POLICY_VERSION) {
    throw new Error("p88_w04_unsupported_w01_version");
  }
  if (
    rebuilt.policyClass !== P8_8_INITIAL_POLICY_CLASS
    || rebuilt.decision !== "admit"
    || rebuilt.rejectionReasons.length !== 0
  ) {
    throw new Error("p88_w04_w01_not_admitted");
  }
  return rebuilt;
}

function canonicalW02(
  input: P88W02MaterializationInput,
  supplied: P88W02GovernedProposalMaterialization,
): P88W02GovernedProposalMaterialization {
  assertP88W02TargetBindingIntegrity(input.targetBinding);
  const rebuilt = materializeP88W02GovernedProposal(input);
  if (stableJson(rebuilt) !== stableJson(supplied)) {
    throw new Error("p88_w04_w02_materialization_integrity_mismatch");
  }
  if (
    rebuilt.version !== P8_8_W02_MATERIALIZATION_VERSION
    || rebuilt.mutationClass !== P8_8_W02_INITIAL_MUTATION_CLASS
    || rebuilt.proposalLifecycle !== "materialized_unpersisted"
  ) {
    throw new Error("p88_w04_w02_not_eligible");
  }
  return rebuilt;
}

function assertW01W02SharedLineage(
  w01: P88PolicyEvaluation,
  w02: P88W02GovernedProposalMaterialization,
): void {
  const comparisons: Array<[unknown, unknown, string]> = [
    [w01.policyClass, w02.mutationClass, "policy_class"],
    [
      w01.recommendation.recommendationFingerprint,
      w02.recommendation.recommendationFingerprint,
      "recommendation_fingerprint",
    ],
    [
      w01.recommendation.recommendationIdempotencyKey,
      w02.recommendation.idempotencyKey,
      "recommendation_idempotency_key",
    ],
    [
      w01.proposal.proposalFingerprint,
      w02.proposalFingerprint,
      "proposal_fingerprint",
    ],
    [w01.target.provider, w02.target.provider, "provider"],
    [w01.target.domain, w02.target.domain, "domain"],
    [w01.target.resourceKind, w02.target.resourceKind, "resource_kind"],
    [w01.target.resourceGid, w02.target.resourceGid, "resource_gid"],
    [w01.target.targetUrl, w02.target.targetUrl, "target_url"],
    [w01.target.actionType, w02.target.actionType, "action_type"],
    [w01.target.field, w02.target.field, "field"],
    [
      w01.target.requiredProviderScope,
      w02.target.requiredProviderScope,
      "required_provider_scope",
    ],
    [
      w01.target.beforeFingerprint,
      w02.before.fingerprint,
      "before_fingerprint",
    ],
    [
      w01.target.afterFingerprint,
      w02.after.fingerprint,
      "after_fingerprint",
    ],
  ];

  for (const [left, right, name] of comparisons) {
    if (left !== right) {
      throw new Error("p88_w04_cross_lineage_mismatch:" + name);
    }
  }
}

export function p88W04ReservationIntentCapability() {
  return deepFreeze({
    version: P8_8_W04_RESERVATION_INTENT_VERSION,
    deterministicProjectionOnly: true,
    w01RebuiltAndVerified: true,
    w02RebuiltAndVerified: true,
    databaseReadPerformed: false,
    databaseWritePerformed: false,
    persistencePerformed: false,
    providerNetworkReadPerformed: false,
    providerWritePerformed: false,
    publicSiteWritePerformed: false,
    task51ExecutionPerformed: false,
    task53ExecutionPerformed: false,
    task54ExecutionPerformed: false,
    durableReservationCreated: false,
    providerDispatchAuthorized: false,
    schedulerActivated: false,
    workerActivated: false,
  });
}

export function projectP88W04ReservationIntent(
  input: P88W04ReservationIntentInput,
): P88W04ReservationIntent {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("p88_w04_invalid_reservation_intent_input");
  }

  const w01 = canonicalW01(input.w01EvaluationInput, input.w01Evaluation);
  const w02 = canonicalW02(
    input.w02MaterializationInput,
    input.w02Materialization,
  );
  assertW01W02SharedLineage(w01, w02);

  if (input.w01EvaluationInput.grant.siteId !== w02.target.siteId) {
    throw new Error("p88_w04_cross_lineage_mismatch:site_id");
  }

  const base = {
    version: P8_8_W04_RESERVATION_INTENT_VERSION,
    reservationClass: P8_8_W04_RESERVATION_CLASS,
    siteId: w02.target.siteId,
    policy: {
      policyId: w01.policy.policyId,
      policyVersion: w01.policy.policyVersion,
      policyFingerprint: w01.policy.policyFingerprint,
    },
    evaluation: {
      evaluationId: w01.evaluationId,
      evaluationFingerprint: w01.evaluationFingerprint,
    },
    materialization: {
      materializationId: w02.materializationId,
      materializationFingerprint: w02.materializationFingerprint,
      materializationIdempotencyFingerprint:
        w02.materializationIdempotencyFingerprint,
    },
    proposal: {
      proposalId: w02.proposalId,
      proposalFingerprint: w02.proposalFingerprint,
    },
    recommendation: {
      recommendationFingerprint:
        w02.recommendation.recommendationFingerprint,
      recommendationIdempotencyKey: w02.recommendation.idempotencyKey,
    },
    target: {
      targetBindingFingerprint: w02.target.targetBindingFingerprint,
      provider: "shopify" as const,
      domain: "diamondshelf.us" as const,
      resourceKind: "product" as const,
      resourceGid: w02.target.resourceGid,
      targetUrl: w02.target.targetUrl,
      actionType: "update_meta_description" as const,
      field: "meta_description" as const,
      requiredProviderScope: "write_products" as const,
    },
    state: {
      beforeFingerprint: w02.before.fingerprint,
      afterFingerprint: w02.after.fingerprint,
    },
    safety: p88W04ReservationIntentCapability(),
  };

  const reservationFingerprint = stableHash({
    purpose: "p8.8_w04_reservation_intent",
    ...base,
  });

  return deepFreeze({
    ...base,
    reservationId:
      "p88w04-reservation-" + reservationFingerprint.slice(0, 24),
    reservationFingerprint,
  });
}

export function bindP88W04IntentToW03(
  intent: P88W04ReservationIntent,
  w03Input: P88W03PolicyAuthorizationInput,
  suppliedW03: P88W03PolicyAuthorizationArtifact,
): P88W04W03Binding {
  const rebuilt = buildP88W03PolicyAuthorization(w03Input);
  if (stableJson(rebuilt) !== stableJson(suppliedW03)) {
    throw new Error("p88_w04_w03_authorization_integrity_mismatch");
  }
  if (rebuilt.version !== P8_8_W03_POLICY_AUTHORIZATION_VERSION) {
    throw new Error("p88_w04_unsupported_w03_version");
  }
  if (
    rebuilt.authorizationProvenance !== "policy_authorization"
    || rebuilt.authorization.providerDispatchAuthorized !== false
    || rebuilt.authorization.publicSiteWrites !== false
    || rebuilt.authorization.dispatchEligible !== false
  ) {
    throw new Error("p88_w04_w03_authorization_semantics_invalid");
  }

  const comparisons: Array<[unknown, unknown, string]> = [
    [rebuilt.policy.policyId, intent.policy.policyId, "policy_id"],
    [
      rebuilt.policy.policyFingerprint,
      intent.policy.policyFingerprint,
      "policy_fingerprint",
    ],
    [
      rebuilt.evaluation.evaluationFingerprint,
      intent.evaluation.evaluationFingerprint,
      "evaluation_fingerprint",
    ],
    [
      rebuilt.materialization.materializationFingerprint,
      intent.materialization.materializationFingerprint,
      "materialization_fingerprint",
    ],
    [
      rebuilt.proposal.proposalFingerprint,
      intent.proposal.proposalFingerprint,
      "proposal_fingerprint",
    ],
    [rebuilt.target.resourceGid, intent.target.resourceGid, "resource_gid"],
    [rebuilt.target.targetUrl, intent.target.targetUrl, "target_url"],
    [
      rebuilt.state.beforeFingerprint,
      intent.state.beforeFingerprint,
      "before_fingerprint",
    ],
    [
      rebuilt.state.afterFingerprint,
      intent.state.afterFingerprint,
      "after_fingerprint",
    ],
    [rebuilt.reservation.reservationId, intent.reservationId, "reservation_id"],
    [
      rebuilt.reservation.reservationFingerprint,
      intent.reservationFingerprint,
      "reservation_fingerprint",
    ],
  ];

  for (const [left, right, name] of comparisons) {
    if (left !== right) {
      throw new Error("p88_w04_w03_precommit_mismatch:" + name);
    }
  }

  const base = {
    version: "p8-8-w04-w03-precommit-binding-v1" as const,
    reservationId: intent.reservationId,
    reservationFingerprint: intent.reservationFingerprint,
    reservationDescriptorFingerprint:
      rebuilt.reservation.descriptorFingerprint,
    policyAuthorizationId: rebuilt.policyAuthorizationId,
    policyAuthorizationFingerprint: rebuilt.policyAuthorizationFingerprint,
    policyActionId: rebuilt.policyActionId,
    durableReservationCreated: false as const,
    providerDispatchAuthorized: false as const,
  };

  return deepFreeze({
    ...base,
    bindingFingerprint: stableHash({
      purpose: "p8.8_w04_w03_precommit_binding",
      ...base,
    }),
  });
}
