import { createHash } from "node:crypto";

export type VerificationStatus = "pending" | "verified" | "failed" | "regressed";
export type RollbackStatus = "pending" | "active" | "completed" | "failed" | "cancelled";

export interface DeploymentActionState {
  actionType: string;
  target: Record<string, unknown>;
  beforeState: Record<string, unknown>;
  expectedState: Record<string, unknown>;
}

export interface VerificationInput {
  deploymentId: string;
  pageId?: string | null;
  expectedState: Record<string, unknown>;
  actualState: Record<string, unknown>;
  baselineState?: Record<string, unknown>;
}

export interface StateMismatch {
  path: string;
  expected: unknown;
  actual: unknown;
}

export interface VerificationResult {
  deploymentId: string;
  pageId: string | null;
  status: VerificationStatus;
  expectedState: Record<string, unknown>;
  actualState: Record<string, unknown>;
  mismatches: StateMismatch[];
  regressedPaths: string[];
  dedupeKey: string;
}

export interface RollbackPlan {
  deploymentId: string;
  status: "pending";
  reason: string;
  restoreState: Record<string, unknown>;
  target: Record<string, unknown>;
  actionType: string;
  dedupeKey: string;
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, stable(nested)]),
    );
  }
  return value;
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(stable(a)) === JSON.stringify(stable(b));
}

function compareExpected(
  expected: Record<string, unknown>,
  actual: Record<string, unknown>,
  prefix = "",
): StateMismatch[] {
  const mismatches: StateMismatch[] = [];
  for (const key of Object.keys(expected).sort()) {
    const path = prefix ? `${prefix}.${key}` : key;
    const expectedValue = expected[key];
    const actualValue = actual[key];
    if (isRecord(expectedValue)) {
      if (!isRecord(actualValue)) {
        mismatches.push({ path, expected: expectedValue, actual: actualValue });
      } else {
        mismatches.push(...compareExpected(expectedValue, actualValue, path));
      }
      continue;
    }
    if (!deepEqual(expectedValue, actualValue)) {
      mismatches.push({ path, expected: expectedValue, actual: actualValue });
    }
  }
  return mismatches;
}

function valueAtPath(record: Record<string, unknown>, path: string): unknown {
  let current: unknown = record;
  for (const part of path.split(".")) {
    if (!isRecord(current)) return undefined;
    current = current[part];
  }
  return current;
}

export function verifyDeploymentState(input: VerificationInput): VerificationResult {
  if (!input.deploymentId.trim()) throw new Error("deploymentId is required");
  const mismatches = compareExpected(input.expectedState, input.actualState);
  const regressedPaths = input.baselineState
    ? mismatches
        .filter((item) => {
          const baseline = valueAtPath(input.baselineState ?? {}, item.path);
          return baseline !== undefined && deepEqual(item.expected, baseline) === false && deepEqual(item.actual, baseline) === false;
        })
        .map((item) => item.path)
        .sort()
    : [];

  const status: VerificationStatus =
    mismatches.length === 0 ? "verified" : regressedPaths.length > 0 ? "regressed" : "failed";

  return {
    deploymentId: input.deploymentId,
    pageId: input.pageId ?? null,
    status,
    expectedState: stable(input.expectedState) as Record<string, unknown>,
    actualState: stable(input.actualState) as Record<string, unknown>,
    mismatches,
    regressedPaths,
    dedupeKey: hash([
      input.deploymentId,
      input.pageId ?? null,
      input.expectedState,
      input.actualState,
      input.baselineState ?? null,
    ]),
  };
}

export function buildRollbackPlan(
  deploymentId: string,
  action: DeploymentActionState,
  reason: string,
): RollbackPlan {
  if (!deploymentId.trim()) throw new Error("deploymentId is required");
  if (!action.actionType.trim()) throw new Error("actionType is required");
  if (!reason.trim()) throw new Error("rollback reason is required");
  if (Object.keys(action.beforeState).length === 0) {
    throw new Error("Rollback requires a captured pre-change state and fails closed without it.");
  }
  return {
    deploymentId,
    status: "pending",
    reason: reason.trim(),
    restoreState: stable(action.beforeState) as Record<string, unknown>,
    target: stable(action.target) as Record<string, unknown>,
    actionType: action.actionType,
    dedupeKey: hash([deploymentId, action.actionType, action.target, action.beforeState]),
  };
}

export function shouldRecommendRollback(result: VerificationResult): boolean {
  return result.status === "failed" || result.status === "regressed";
}

export function assertRollbackExecutionAuthorized(input: {
  publicSiteWritesEnabled?: boolean;
  connectorEnabled?: boolean;
  approvalRequired?: boolean;
  approvalGranted?: boolean;
}): void {
  if (process.env.PUBLIC_SITE_WRITES_ENABLED !== "true" || input.publicSiteWritesEnabled !== true) {
    throw new Error("Public site writes are disabled by the global kill switch.");
  }
  if (input.connectorEnabled !== true) {
    throw new Error("Rollback connector is not explicitly enabled.");
  }
  if (input.approvalRequired && input.approvalGranted !== true) {
    throw new Error("Rollback requires explicit approval.");
  }
}

export function toVerificationInsert(result: VerificationResult) {
  return {
    deploymentId: result.deploymentId,
    pageId: result.pageId,
    status: result.status,
    expectedState: result.expectedState,
    actualState: {
      ...result.actualState,
      verificationDedupeKey: result.dedupeKey,
      mismatches: result.mismatches,
      regressedPaths: result.regressedPaths,
    },
    verifiedAt: result.status === "pending" ? null : new Date().toISOString(),
  };
}

export function toRollbackInsert(plan: RollbackPlan) {
  return {
    deploymentId: plan.deploymentId,
    status: plan.status,
    reason: plan.reason,
    restoreState: {
      ...plan.restoreState,
      rollbackDedupeKey: plan.dedupeKey,
      target: plan.target,
      actionType: plan.actionType,
    },
  };
}
