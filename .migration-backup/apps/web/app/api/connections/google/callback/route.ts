import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  assertOAuthState,
  autoMatchDiamondShelf,
  discoverGoogleResources,
  exchangeGoogleCode,
} from "@seo-engine/oauth-connection-manager";
import {
  GOOGLE_STATE_COOKIE,
  googleOAuthRuntimeConfig,
  openOAuthState,
  saveOAuthConnection,
} from "../../../../../lib/oauth-connections";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  try {
    const code = requestUrl.searchParams.get("code")?.trim() ?? "";
    const receivedState = requestUrl.searchParams.get("state")?.trim() ?? "";
    if (!code || !receivedState) throw new Error("Google OAuth callback is incomplete.");

    const cookieStore = await cookies();
    const state = openOAuthState(cookieStore.get(GOOGLE_STATE_COOKIE)?.value);
    assertOAuthState(state, receivedState, "google");

    const config = googleOAuthRuntimeConfig();
    const bundle = await exchangeGoogleCode(config, code, state);
    if (!bundle.refreshToken) throw new Error("Google did not return a refresh token; reconnect and approve offline access.");

    const resources = await discoverGoogleResources(bundle.accessToken);
    const matched = autoMatchDiamondShelf(resources);
    await saveOAuthConnection({
      provider: "google",
      externalAccountId: "google",
      bundle,
      status: matched.needsConfirmation ? "pending" : "connected",
      metadata: {
        connectionMode: "oauth",
        readOnly: true,
        gscSiteUrl: matched.gscSiteUrl,
        ga4PropertyId: matched.ga4PropertyId,
        needsConfirmation: matched.needsConfirmation,
        discoveredSearchConsoleProperties: resources.searchConsoleProperties,
        discoveredGa4Properties: resources.ga4Properties,
      },
    });

    const destination = matched.needsConfirmation ? "/connections?connected=google&confirm=1" : "/connections?connected=google";
    const response = NextResponse.redirect(new URL(destination, request.url));
    response.cookies.delete(GOOGLE_STATE_COOKIE);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google connection failed.";
    const response = NextResponse.redirect(new URL(`/connections?error=${encodeURIComponent(message)}`, request.url));
    response.cookies.delete(GOOGLE_STATE_COOKIE);
    return response;
  }
}
