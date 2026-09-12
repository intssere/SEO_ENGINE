import { Router, type IRouter } from "express";
import { GOOGLE_READ_SCOPES } from "@seo-engine/oauth-connection-manager";
import { logger } from "../lib/logger";
import { isSameOriginRequest } from "../lib/pilot-authorization";
import { inspectTask53ShopifyCapability } from "../lib/task53-shopify-credential.js";
import {
  startUrl,
  startTask53ShopifyWriteUrl,
  task53ShopifyWriteExternalAccountId,
  TASK53_SHOPIFY_WRITE_RETURN_TO,
  TASK53_SHOPIFY_WRITE_SCOPE,
  seal,
  open,
  assertOAuthState,
  discoverGoogleResources,
  autoMatchDiamondShelf,
  exchangeGoogleCode,
  exchangeShopifyCode,
  save,
  list,
  selectGoogleProperties,
  GoogleSelectionError,
  GOOGLE_STATE_COOKIE,
  SHOPIFY_STATE_COOKIE,
  origin,
} from "../lib/oauth";

const router: IRouter = Router();
const blocked = () => process.env.PUBLIC_SITE_WRITES_ENABLED?.trim().toLowerCase() === "true";
const shopPattern = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
const shopifyCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 600_000,
  path: "/",
};

type GoogleCallbackStage =
  | "write_gate"
  | "state_cookie"
  | "state_validation"
  | "token_exchange"
  | "scope_validation"
  | "resource_discovery"
  | "credential_persistence";

function providerStatus(error: unknown): number | null {
  const match = error instanceof Error ? error.message.match(/HTTP\s+(\d{3})/) : null;
  return match ? Number(match[1]) : null;
}

function safeGoogleFailure(stage: GoogleCallbackStage, error: unknown) {
  const status = providerStatus(error);
  const category =
    stage === "state_cookie" || stage === "state_validation"
      ? "state"
      : stage === "token_exchange"
        ? status
          ? "token_provider"
          : "token_network"
        : stage === "credential_persistence"
          ? "persistence"
          : stage === "write_gate"
            ? "write_gate"
            : "configuration";
  return { category, providerStatus: status };
}

router.get("/connections/status", async (_req, res) => {
  try {
    const [rows, task53Capability] = await Promise.all([list(), inspectTask53ShopifyCapability()]);
    const latest = (provider: string) => rows.find((row) => row.provider === provider);
    const shop = rows.find((row) => row.provider === "shopify" && row.metadata.connectionMode !== "task53_write_products") ?? latest("shopify");
    const google = latest("google");
    const connectionState = typeof google?.metadata.connectionState === "string" ? google.metadata.connectionState : google?.status;
    const needsConfirmation = google?.status === "pending" && connectionState === "pending_confirmation" && google.metadata.needsConfirmation === true;
    const authorized = Boolean(google && !["revoked", "error"].includes(google.status));
    const needsAttention = connectionState === "authorized" || connectionState === "reauthorization_required";

    return res.json({
      readOnly: !blocked(),
      shopify: {
        connected: shop?.status === "connected",
        ...(typeof shop?.metadata.shopDomain === "string" ? { domain: shop.metadata.shopDomain } : {}),
        task53WriteCapability: {
          connected: task53Capability.connected,
          writeProductsScopePresent: task53Capability.writeProductsScopePresent,
          credentialAvailable: task53Capability.credentialAvailable,
          boundedPilotOnly: true,
        },
      },
      google: {
        connected: google?.status === "connected",
        authorized,
        needsConfirmation,
        needsAttention,
        hasRefreshToken: google?.metadata.hasRefreshToken === true,
        searchConsoleDiscovery: google?.metadata.searchConsoleDiscovery ?? null,
        ga4Discovery: google?.metadata.ga4Discovery ?? null,
        ...(needsConfirmation && Array.isArray(google?.metadata.discoveredSearchConsoleProperties)
          ? { searchConsoleProperties: google.metadata.discoveredSearchConsoleProperties }
          : {}),
        ...(needsConfirmation && Array.isArray(google?.metadata.discoveredGa4Properties)
          ? { ga4Properties: google.metadata.discoveredGa4Properties }
          : {}),
      },
    });
  } catch {
    return res.status(503).json({ error: "Connection status is unavailable." });
  }
});

router.get("/connections/shopify/start", (req, res) => {
  try {
    if (blocked()) throw new Error();
    const shop = String(req.query.shop ?? "").trim().toLowerCase();
    if (!shopPattern.test(shop)) throw new Error();
    const { state, url } = startUrl("shopify", shop);
    res.cookie(SHOPIFY_STATE_COOKIE, seal(state), shopifyCookieOptions);
    return res.redirect(url);
  } catch {
    return res.redirect(`${origin()}/connections?error=shopify_start`);
  }
});

router.get("/connections/shopify/task53-write/start", (req, res) => {
  try {
    if (blocked()) throw new Error("task53_write_scope_authorization_requires_public_writes_disabled");
    if (!isSameOriginRequest(req.get("origin") ?? req.get("referer"), req.get("host"))) throw new Error("task53_write_scope_same_origin_required");
    const shop = String(req.query.shop ?? "").trim().toLowerCase();
    if (!shopPattern.test(shop)) throw new Error("task53_shop_domain_invalid");
    const { state, url } = startTask53ShopifyWriteUrl(shop);
    res.cookie(SHOPIFY_STATE_COOKIE, seal(state), shopifyCookieOptions);
    return res.redirect(url);
  } catch {
    return res.redirect(`${origin()}/connections?error=task53_shopify_write_start`);
  }
});

router.get("/connections/google/start", (_req, res) => {
  try {
    if (blocked()) throw new Error();
    const { state, url } = startUrl("google");
    res.cookie(GOOGLE_STATE_COOKIE, seal(state), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600_000,
      path: "/",
    });
    return res.redirect(url);
  } catch {
    return res.redirect(`${origin()}/connections?error=google_start`);
  }
});

router.get("/connections/shopify/callback", async (req, res) => {
  try {
    if (blocked()) throw new Error("shopify_oauth_requires_public_writes_disabled");
    const shop = String(req.query.shop ?? "").toLowerCase();
    if (!shopPattern.test(shop)) throw new Error("shopify_domain_invalid");
    const state = open(req.cookies[SHOPIFY_STATE_COOKIE]);
    assertOAuthState(state, String(req.query.state ?? ""), "shopify");
    if (state.shopDomain !== shop) throw new Error("shopify_state_domain_mismatch");
    if (!["/connections", TASK53_SHOPIFY_WRITE_RETURN_TO].includes(state.returnTo)) throw new Error("shopify_oauth_profile_invalid");
    const config = {
      clientId: process.env.SHOPIFY_OAUTH_CLIENT_ID!,
      clientSecret: process.env.SHOPIFY_OAUTH_CLIENT_SECRET!,
      redirectUri: `${origin()}/api/connections/shopify/callback`,
      shopDomain: state.shopDomain!,
    };
    const bundle = await exchangeShopifyCode(config, String(req.query.code));
    if (state.returnTo === TASK53_SHOPIFY_WRITE_RETURN_TO) {
      if (!bundle.scopes.includes(TASK53_SHOPIFY_WRITE_SCOPE)) throw new Error("task53_shopify_write_scope_missing");
      await save("shopify", task53ShopifyWriteExternalAccountId(shop), bundle, {
        shopDomain: shop,
        connectionMode: "task53_write_products",
        readOnly: false,
        boundedPilotOnly: true,
        requiredScope: TASK53_SHOPIFY_WRITE_SCOPE,
      });
      res.clearCookie(SHOPIFY_STATE_COOKIE);
      return res.redirect(`${origin()}/connections?success=task53_shopify_write`);
    }
    await save("shopify", state.shopDomain!, bundle, { shopDomain: shop, connectionMode: "read_only", readOnly: true });
    res.clearCookie(SHOPIFY_STATE_COOKIE);
    return res.redirect(`${origin()}/connections?success=shopify`);
  } catch {
    res.clearCookie(SHOPIFY_STATE_COOKIE);
    return res.redirect(`${origin()}/connections?error=shopify_callback`);
  }
});

router.get("/connections/google/callback", async (req, res) => {
  let stage: GoogleCallbackStage = "write_gate";
  try {
    if (blocked()) throw new Error("OAuth is blocked while public-site writes are enabled.");

    stage = "state_cookie";
    const state = open(req.cookies[GOOGLE_STATE_COOKIE]);
    stage = "state_validation";
    assertOAuthState(state, String(req.query.state ?? ""), "google");

    stage = "token_exchange";
    const config = {
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      redirectUri: `${origin()}/api/connections/google/callback`,
    };
    const bundle = await exchangeGoogleCode(config, String(req.query.code), state);

    stage = "scope_validation";
    const missingScopes = GOOGLE_READ_SCOPES.filter((scope) => !bundle.scopes.includes(scope));

    stage = "resource_discovery";
    const discovered = await discoverGoogleResources(bundle.accessToken);
    const match = autoMatchDiamondShelf(discovered);
    const discoveryFailed = !discovered.searchConsoleStatus.ok || !discovered.ga4Status.ok;
    const hasRefreshToken = Boolean(bundle.refreshToken);
    const needsConfirmation = !discoveryFailed && missingScopes.length === 0 && match.needsConfirmation;
    const connectionState =
      !hasRefreshToken || missingScopes.length > 0
        ? "reauthorization_required"
        : discoveryFailed
          ? "authorized"
          : needsConfirmation
            ? "pending_confirmation"
            : "connected";
    const databaseStatus = connectionState === "connected" ? "connected" : "pending";

    logger.info({
      provider: "google",
      stage: "resource_discovery",
      searchConsoleCategory: discovered.searchConsoleStatus.category,
      searchConsoleStatus: discovered.searchConsoleStatus.httpStatus,
      ga4Category: discovered.ga4Status.category,
      ga4Status: discovered.ga4Status.httpStatus,
      searchConsoleResourceCount: discovered.searchConsoleProperties.length,
      ga4ResourceCount: discovered.ga4Properties.length,
      hasRefreshToken,
      scopeComplete: missingScopes.length === 0,
    }, "Google OAuth discovery completed");

    stage = "credential_persistence";
    await save("google", "google", bundle, {
      connectionMode: "oauth",
      readOnly: true,
      discoveredSearchConsoleProperties: discovered.searchConsoleProperties,
      discoveredGa4Properties: discovered.ga4Properties,
      searchConsoleDiscovery: discovered.searchConsoleStatus,
      ga4Discovery: discovered.ga4Status,
      gscSiteUrl: match.gscSiteUrl,
      ga4PropertyId: match.ga4PropertyId,
      needsConfirmation,
      missingRequiredScopeCount: missingScopes.length,
      connectionState,
    }, databaseStatus);

    logger.info({
      provider: "google",
      stage: "credential_persistence",
      status: connectionState,
      hasRefreshToken,
      needsConfirmation,
    }, "Google OAuth connection persisted");

    if (!needsConfirmation) res.clearCookie(GOOGLE_STATE_COOKIE);
    const outcome = connectionState === "connected" ? "google" : connectionState === "pending_confirmation" ? "google_pending" : "google_attention";
    return res.redirect(`${origin()}/connections?success=${outcome}`);
  } catch (error) {
    const failure = safeGoogleFailure(stage, error);
    logger.warn({
      provider: "google",
      stage,
      category: failure.category,
      providerStatus: failure.providerStatus,
    }, "Google OAuth callback failed");
    res.clearCookie(GOOGLE_STATE_COOKIE);
    return res.redirect(`${origin()}/connections?error=google_${failure.category}`);
  }
});

router.post("/connections/google/select", async (req, res) => {
  let stage = "write_gate";
  try {
    if (blocked()) throw new Error();
    stage = "state_cookie";
    const state = open(req.cookies[GOOGLE_STATE_COOKIE]);
    stage = "state_validation";
    assertOAuthState(state, state.state, "google");
    stage = "form_parsing";
    const gsc = String(req.body?.gscSiteUrl ?? "").trim();
    const ga4 = String(req.body?.ga4PropertyId ?? "").trim();
    if (!gsc || !ga4) throw new GoogleSelectionError("form_validation");
    stage = "resource_validation";
    await selectGoogleProperties(gsc, ga4);
    logger.info({ provider: "google", stage: "property_selection", outcome: "connected" }, "Google properties confirmed");
    res.clearCookie(GOOGLE_STATE_COOKIE);
    return res.redirect(`${origin()}/connections?success=google`);
  } catch (error) {
    const category = error instanceof GoogleSelectionError ? error.category : "request";
    logger.warn({ provider: "google", stage, category }, "Google property selection failed");
    return res.redirect(`${origin()}/connections?error=google_selection`);
  }
});

export default router;