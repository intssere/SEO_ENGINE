// GSC-02 S0B: legacy all-in-one callback helper RETIRED.
// No live route imports this module. The previous implementation sequenced
// token exchange, GSC discovery and Production credential persistence in one
// invocation. Those steps require separate, independently verified grants.
// Never re-enable this helper as an OAuth transport or credential writer.
import type { GoogleOAuthConfig, TokenBundle } from "@seo-engine/oauth-connection-manager";
import {
  GSC_READONLY_EXTERNAL_ACCOUNT_ID,
  GSC_READONLY_PROFILE,
  type GscDiscoveryResult,
  type GscReadonlyState,
} from "@seo-engine/oauth-connection-manager/gsc-readonly";

// Preserve the existing type surface for source compatibility and review.
// These types are NOT authorization grants or operational interfaces.
export type GscReadonlyPersistenceInput = {
  provider: "google";
  externalAccountId: typeof GSC_READONLY_EXTERNAL_ACCOUNT_ID;
  bundle: TokenBundle;
  metadata: Record<string, unknown>;
  status: "pending";
};

export interface GscReadonlyRuntimeDependencies {
  exchangeCode(config: GoogleOAuthConfig, code: string, state: GscReadonlyState): Promise<TokenBundle>;
  discover(bundle: TokenBundle): Promise<GscDiscoveryResult>;
  persist(input: GscReadonlyPersistenceInput): Promise<void>;
}

export type GscReadonlyCallbackInput = {
  state: GscReadonlyState;
  receivedState: string;
  code: string;
  config: GoogleOAuthConfig;
};

export type GscReadonlyCallbackResult = {
  profile: typeof GSC_READONLY_PROFILE;
  externalAccountId: typeof GSC_READONLY_EXTERNAL_ACCOUNT_ID;
  propertyCount: number;
  hasRefreshToken: boolean;
  connectionState: "authorized_pending_property_selection";
};

/**
 * @deprecated Permanently fail-closed. Do not bind to any route or schedule.
 *
 * GSC-02 does not have a certified, principal/site/client-generation-bound,
 * one-time state transaction, a separately attested credential-write path,
 * or independent provider-discovery authorization. The old helper coupled
 * exchange -> sites.list -> database upsert with no stage authorization.
 *
 * This compatibility function intentionally invokes NONE of its dependencies.
 * A future separately reviewed source-only stage must define distinct handlers;
 * a live binding additionally needs exact operator authorization and #1159.
 */
export async function runGscReadonlyCallback(
  _input: GscReadonlyCallbackInput,
  _dependencies: GscReadonlyRuntimeDependencies,
): Promise<GscReadonlyCallbackResult> {
  throw new Error("gsc_oauth_combined_callback_retired_separate_grants_required");
}
