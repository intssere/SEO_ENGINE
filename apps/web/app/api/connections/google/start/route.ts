import { NextResponse } from "next/server";
import { createOAuthState, buildGoogleAuthorizationUrl } from "@seo-engine/oauth-connection-manager";
import { GOOGLE_STATE_COOKIE, googleOAuthRuntimeConfig, sealOAuthState } from "../../../../../lib/oauth-connections";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const state = createOAuthState("google", { returnTo: "/connections" });
    const authorizationUrl = buildGoogleAuthorizationUrl(googleOAuthRuntimeConfig(), state);
    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(GOOGLE_STATE_COOKIE, sealOAuthState(state), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start Google connection.";
    return NextResponse.redirect(new URL(`/connections?error=${encodeURIComponent(message)}`, request.url));
  }
}
