import type { GoogleOAuthConfig, TokenBundle } from "@seo-engine/oauth-connection-manager";
import {
  GSC_READONLY_EXTERNAL_ACCOUNT_ID,
  GSC_READONLY_PROFILE,
  assertGscReadonlyState,
  buildGscReadonlyConnectionMetadata,
  hasExactGscReadonlyScope,
  type GscDiscoveryResult,
  type GscReadonlyState,
} from "@seo-engine/oauth-connection-manager/gsc-readonly";

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

export async function runGscReadonlyCallback(
  input: GscReadonlyCallbackInput,
  dependencies: GscReadonlyRuntimeDependencies,
): Promise<GscReadonlyCallbackResult> {
  assertGscReadonlyState(input.state, input.receivedState);
  const code = input.code.trim();
  if (!code) throw new Error("gsc_oauth_code_required");

  const bundle = await dependencies.exchangeCode(input.config, code, input.state);
  if (!hasExactGscReadonlyScope(bundle.scopes)) throw new Error("gsc_oauth_scope_mismatch");

  const discovered = await dependencies.discover(bundle);
  if (!discovered.status.ok) throw new Error(`gsc_oauth_discovery_failed:${discovered.status.category}`);

  const metadata = {
    ...buildGscReadonlyConnectionMetadata(bundle, discovered.properties, null),
    gscDiscovery: discovered.status,
    connectionState: "authorized_pending_property_selection",
    needsPropertySelection: true,
  };

  await dependencies.persist({
    provider: "google",
    externalAccountId: GSC_READONLY_EXTERNAL_ACCOUNT_ID,
    bundle,
    metadata,
    status: "pending",
  });

  return {
    profile: GSC_READONLY_PROFILE,
    externalAccountId: GSC_READONLY_EXTERNAL_ACCOUNT_ID,
    propertyCount: discovered.properties.length,
    hasRefreshToken: Boolean(bundle.refreshToken),
    connectionState: "authorized_pending_property_selection",
  };
}
