import { Router, type IRouter } from "express";
import { isSameOriginRequest } from "../lib/pilot-authorization";
import { SHOPIFY_STATE_COOKIE, seal, startTask53ShopifyWriteUrl } from "../lib/oauth";
import { validateTask53WriteScopeAuthorization } from "../lib/task53-write-scope-authorization.js";

const router: IRouter = Router();

const shopifyCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 600_000,
  path: "/",
};

router.get("/connections/shopify/task53-write/start", (_req, res) => {
  return res.status(405).json({ error: "task53_write_scope_post_required" });
});

router.post("/connections/shopify/task53-write/start", (req, res) => {
  if (!isSameOriginRequest(req.get("origin"), req.get("host"))) {
    return res.status(403).json({ error: "task53_write_scope_same_origin_required" });
  }

  const authorization = validateTask53WriteScopeAuthorization({
    shop: req.body?.shop,
    confirmation: req.body?.confirmation,
    publicWriteGateEnabled: process.env.PUBLIC_SITE_WRITES_ENABLED?.trim().toLowerCase() === "true",
  });
  if (!authorization.ok) {
    const status = authorization.category === "public_write_gate_must_remain_disabled" ? 409 : 400;
    return res.status(status).json({ error: authorization.category });
  }

  try {
    const { state, url } = startTask53ShopifyWriteUrl(authorization.shop);
    res.cookie(SHOPIFY_STATE_COOKIE, seal(state), shopifyCookieOptions);
    return res.redirect(303, url);
  } catch {
    return res.status(503).json({ error: "task53_write_scope_authorization_unavailable" });
  }
});

export default router;
