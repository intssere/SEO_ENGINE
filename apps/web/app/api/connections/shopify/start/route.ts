import { NextResponse } from "next/server";
import { createOAuthState, buildShopifyAuthorizationUrl } from "@seo-engine/oauth-connection-manager";
import { SHOPIFY_STATE_COOKIE, sealOAuthState, shopifyOAuthRuntimeConfig } from "../../../../../lib/oauth-connections";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const shop = requestUrl.searchParams.get("shop")?.trim() ?? "";
    const state = createOAuthState("shopify", { shopDomain: shop, returnTo: "/connections" });
    const authorizationUrl = buildShopifyAuthorizationUrl(shopifyOAuthRuntimeConfig(shop), state);
    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(SHOPIFY_STATE_COOKIE, sealOAuthState(state), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start Shopify connection.";
    return NextResponse.redirect(new URL(`/connections?error=${encodeURIComponent(message)}`, request.url));
  }
}
