import type { AuthorityDashboardProjection } from "./authority-dashboard-projection.js";
import { assertAuthorityDashboardProjectionIntegrity } from "./authority-dashboard-projection.js";

export const UGP_AUTHORITY_DASHBOARD_API_VERSION =
  "ugp-9-2b-authority-dashboard-api-v1" as const;

export type AuthorityDashboardApiState =
  | "available"
  | "partial"
  | "unavailable";

export type AuthorityDashboardReadiness = Readonly<{
  evidence: "available" | "unavailable";
  trend: "available" | "unavailable";
  competitorGap: "available" | "unavailable";
  observedAt: string | null;
  providerKey: string | null;
  providerDataset: string | null;
}>;

export type AuthorityDashboardResponse = Readonly<{
  version: typeof UGP_AUTHORITY_DASHBOARD_API_VERSION;
  state: AuthorityDashboardApiState;
  reason: string | null;
  readiness: AuthorityDashboardReadiness;
  projection: AuthorityDashboardProjection | null;
  semantics: Readonly<{
    authenticatedReadOnly: true;
    syntheticFallback: false;
    persistenceRequired: false;
    liveProviderExecutionAuthorized: false;
    outreachAuthorized: false;
    publicSiteWrites: false;
  }>;
}>;

export type AuthorityDashboardProjectionSource = () =>
  Promise<AuthorityDashboardProjection | null>;

const SEMANTICS = Object.freeze({
  authenticatedReadOnly: true as const,
  syntheticFallback: false as const,
  persistenceRequired: false as const,
  liveProviderExecutionAuthorized: false as const,
  outreachAuthorized: false as const,
  publicSiteWrites: false as const,
});

let projectionSource: AuthorityDashboardProjectionSource | null = null;

export function setAuthorityDashboardProjectionSourceForRuntime(
  source: AuthorityDashboardProjectionSource | null,
): void {
  projectionSource = source;
}

function unavailable(reason: string): AuthorityDashboardResponse {
  return Object.freeze({
    version: UGP_AUTHORITY_DASHBOARD_API_VERSION,
    state: "unavailable",
    reason,
    readiness: Object.freeze({
      evidence: "unavailable",
      trend: "unavailable",
      competitorGap: "unavailable",
      observedAt: null,
      providerKey: null,
      providerDataset: null,
    }),
    projection: null,
    semantics: SEMANTICS,
  });
}

export async function loadAuthorityDashboardData(
  source: AuthorityDashboardProjectionSource | null = projectionSource,
): Promise<AuthorityDashboardResponse> {
  if (!source) {
    return unavailable(
      "No durable authority evidence source is configured. The dashboard will remain unavailable rather than show synthetic backlink data.",
    );
  }

  let projection: AuthorityDashboardProjection | null;
  try {
    projection = await source();
  } catch {
    return unavailable(
      "Authority evidence could not be loaded from the configured source.",
    );
  }

  if (!projection) {
    return unavailable(
      "No normalized backlink evidence snapshot is currently available.",
    );
  }

  try {
    assertAuthorityDashboardProjectionIntegrity(projection);
  } catch {
    return unavailable(
      "Authority evidence failed integrity validation and was not displayed.",
    );
  }

  const trendAvailable =
    projection.previousDatasetFingerprint !== null;
  const competitorGapAvailable =
    projection.competitorGapBundleFingerprint !== null;

  return Object.freeze({
    version: UGP_AUTHORITY_DASHBOARD_API_VERSION,
    state:
      trendAvailable && competitorGapAvailable ? "available" : "partial",
    reason:
      trendAvailable && competitorGapAvailable
        ? null
        : "Authority evidence is available, but one or more optional comparison views are unavailable.",
    readiness: Object.freeze({
      evidence: "available",
      trend: trendAvailable ? "available" : "unavailable",
      competitorGap:
        competitorGapAvailable ? "available" : "unavailable",
      observedAt: projection.generatedFromObservedAt,
      providerKey: projection.provider.providerKey,
      providerDataset: projection.provider.providerDataset,
    }),
    projection,
    semantics: SEMANTICS,
  });
}
