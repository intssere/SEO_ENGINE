import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { assertOAuthState, exchangeShopifyCode } from "@seo-engine/oauth-connection-manager";
import {
  SHOPIFY_STATE_COOKIE,
  openOAuthState,
  saveOAuthConnection,
  shopifyOAuthRuntimeConfig,
  verifyShopifyCallbackHmac,
} from "../../../../../lib/oauth-connections";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  try {
    const code = requestUrl.searchParams.get("code")?.trim() ?? "";
    const shop = requestUrl.searchParams.get("shop")?.trim().toLowerCase() ?? "";
    const receivedState = requestUrl.searchParams.get("state")?.trim() ?? "";
    if (!code || !shop || !receivedState) throw new Error("Shopify OAuth callback is incomplete.");

    const cookieStore = await cookies();
    const state = openOAuthState(cookieStore.get(SHOPIFY_STATE_COOKIE)?.value);
    assertOAuthState(state, receivedState, "shopify");
    if (state.shopDomain !== shop) throw new Error("Shopify callback domain does not match the authorization request.");

    const config = shopifyOAuthRuntimeConfig(shop);
    if (!verifyShopifyCallbackHmac(requestUrl.searchParams, config.clientSecret)) throw new Error("Shopify OAuth callback signature is invalid.");
    const bundle = await exchangeShopifyCode(config, code);
    await saveOAuthConnection({
      provider: "shopify",
      externalAccountId: shop,
      bundle,
      metadata: { shopDomain: shop, connectionMode: "oauth", readOnly: true },
    });

    const response = NextResponse.redirect(new URL("/connections?connected=shopify", request.url));
    response.cookies.delete(SHOPIFY_STATE_COOKIE);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Shopify connection failed.";
    const response = NextResponse.redirect(new URL(`/connections?error=${encodeURIComponent(message)}`, request.url));
    response.cookies.delete(SHOPIFY_STATE_COOKIE);
    return response;
  }
}
