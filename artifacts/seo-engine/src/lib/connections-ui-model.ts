export type ConnectionUiState =
  | "connected"
  | "needs_attention"
  | "not_connected"
  | "scope_required"
  | "planned";

export type ConnectionUiTone =
  | "success"
  | "warning"
  | "neutral"
  | "info";

export type DiscoveryStatus = {
  ok: boolean;
  httpStatus: number | null;
  category: "ok" | "provider_error" | "network_error" | "invalid_response";
};

export type ConnectionsStatus = {
  readOnly?: boolean;
  shopify: { connected: boolean; domain?: string };
  google: {
    connected: boolean;
    authorized?: boolean;
    needsConfirmation?: boolean;
    needsAttention?: boolean;
    hasRefreshToken?: boolean;
    searchConsoleDiscovery?: DiscoveryStatus | null;
    ga4Discovery?: DiscoveryStatus | null;
    searchConsoleProperties?: Array<{ siteUrl?: string; permissionLevel?: string | null }>;
    ga4Properties?: Array<{ propertyId?: string; displayName?: string | null }>;
  };
};

export type ConnectionDomain =
  | "website"
  | "search_console"
  | "analytics"
  | "cms"
  | "backlink_serp";

export type ConnectionCardModel = Readonly<{
  domain: ConnectionDomain;
  title: string;
  description: string;
  state: ConnectionUiState;
  tone: ConnectionUiTone;
  statusLabel: string;
  scopeLabel: string;
  detail: string;
  recoveryLabel: string | null;
  recoveryHref: string | null;
  connectLabel: string | null;
  connectHref: string | null;
  disabled: boolean;
}>;

export type ConnectionsUiModel = Readonly<{
  activeSiteScope: string | null;
  siteScopeLabel: string;
  oauthDisabled: boolean;
  cards: readonly ConnectionCardModel[];
}>;

function googleState(status: ConnectionsStatus["google"]): ConnectionUiState {
  if (status.connected) return "connected";
  if (status.needsAttention || status.needsConfirmation || status.authorized) {
    return "needs_attention";
  }
  return "not_connected";
}

function toneForState(state: ConnectionUiState): ConnectionUiTone {
  switch (state) {
    case "connected":
      return "success";
    case "needs_attention":
    case "scope_required":
      return "warning";
    case "planned":
      return "info";
    default:
      return "neutral";
  }
}

function labelForState(state: ConnectionUiState): string {
  switch (state) {
    case "connected":
      return "Connected";
    case "needs_attention":
      return "Needs attention";
    case "scope_required":
      return "Scope required";
    case "planned":
      return "Planned";
    default:
      return "Not connected";
  }
}

export function buildConnectionsUiModel(
  status: ConnectionsStatus,
): ConnectionsUiModel {
  const activeSiteScope = status.shopify.domain
    ? `https://${status.shopify.domain}`
    : null;
  const oauthDisabled = status.readOnly === false;
  const google = googleState(status.google);
  const googleRecovery = google === "needs_attention" && !oauthDisabled
    ? "/api/connections/google/start"
    : null;
  const googleConnect = google === "not_connected" && !oauthDisabled
    ? "/api/connections/google/start"
    : null;

  const cards: ConnectionCardModel[] = [
    {
      domain: "website",
      title: "Website",
      description: "The site SEO ENGINE analyzes and scopes all connected data to.",
      state: activeSiteScope ? "connected" : "scope_required",
      tone: toneForState(activeSiteScope ? "connected" : "scope_required"),
      statusLabel: labelForState(activeSiteScope ? "connected" : "scope_required"),
      scopeLabel: activeSiteScope ?? "No website scope confirmed",
      detail: activeSiteScope
        ? "This website is the current customer scope shown by the connected CMS."
        : "Add or review a website before connecting provider data so site scope is explicit.",
      recoveryLabel: null,
      recoveryHref: null,
      connectLabel: activeSiteScope ? "Review website setup" : "Add website",
      connectHref: "/settings/add-website",
      disabled: false,
    },
    {
      domain: "search_console",
      title: "Google Search Console",
      description: "Queries, pages, clicks, impressions, position, and indexing context.",
      state: google,
      tone: toneForState(google),
      statusLabel: labelForState(google),
      scopeLabel: activeSiteScope ?? "Website scope must be confirmed",
      detail: google === "connected"
        ? "Read-only search performance access is available for impact measurement."
        : google === "needs_attention"
          ? "Google authorization exists, but property selection or authorization recovery is required."
          : "Connect Google to import Search Console data after the website scope is confirmed.",
      recoveryLabel: googleRecovery ? "Reconnect Google" : null,
      recoveryHref: googleRecovery,
      connectLabel: googleConnect ? "Connect Search Console" : null,
      connectHref: googleConnect,
      disabled: oauthDisabled,
    },
    {
      domain: "analytics",
      title: "Google Analytics",
      description: "Traffic and engagement signals used to validate SEO outcomes.",
      state: google,
      tone: toneForState(google),
      statusLabel: labelForState(google),
      scopeLabel: activeSiteScope ?? "Website scope must be confirmed",
      detail: google === "connected"
        ? "GA4 read access is available through the existing Google connection."
        : google === "needs_attention"
          ? "Google authorization exists, but GA4 property confirmation or reconnection is required."
          : "Connect Google to import GA4 data after the website scope is confirmed.",
      recoveryLabel: googleRecovery ? "Reconnect Google" : null,
      recoveryHref: googleRecovery,
      connectLabel: googleConnect ? "Connect Analytics" : null,
      connectHref: googleConnect,
      disabled: oauthDisabled,
    },
    {
      domain: "cms",
      title: "CMS",
      description: "The content platform used for site-specific reads and governed change workflows.",
      state: status.shopify.connected ? "connected" : "not_connected",
      tone: toneForState(status.shopify.connected ? "connected" : "not_connected"),
      statusLabel: labelForState(status.shopify.connected ? "connected" : "not_connected"),
      scopeLabel: status.shopify.domain ?? "No CMS connected",
      detail: status.shopify.connected
        ? "Shopify is connected. Existing execution and write gates remain separate from connection state."
        : "Connect a CMS through the website setup flow. Provider-specific authorization remains isolated.",
      recoveryLabel: null,
      recoveryHref: null,
      connectLabel: status.shopify.connected ? "Review website setup" : "Connect CMS",
      connectHref: "/settings/add-website",
      disabled: false,
    },
    {
      domain: "backlink_serp",
      title: "Backlink / SERP provider",
      description: "External authority and SERP data for competitive and opportunity intelligence.",
      state: "planned",
      tone: toneForState("planned"),
      statusLabel: labelForState("planned"),
      scopeLabel: activeSiteScope ?? "No website scope confirmed",
      detail: "Provider selection and live credentials are intentionally deferred to the later data-provider milestone.",
      recoveryLabel: null,
      recoveryHref: null,
      connectLabel: null,
      connectHref: null,
      disabled: true,
    },
  ];

  return Object.freeze({
    activeSiteScope,
    siteScopeLabel: activeSiteScope ?? "Website not yet confirmed",
    oauthDisabled,
    cards: Object.freeze(cards.map((card) => Object.freeze(card))),
  });
}
