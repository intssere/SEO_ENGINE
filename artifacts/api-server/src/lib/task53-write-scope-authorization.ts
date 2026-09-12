export const TASK53_WRITE_SCOPE_CONFIRMATION = "AUTHORIZE_SHOPIFY_WRITE_SCOPE:write_products" as const;

const shopPattern = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

export type Task53WriteScopeAuthorizationInput = {
  shop: unknown;
  confirmation: unknown;
  publicWriteGateEnabled: boolean;
};

export type Task53WriteScopeAuthorizationResult =
  | { ok: true; shop: string; confirmation: typeof TASK53_WRITE_SCOPE_CONFIRMATION }
  | { ok: false; category: "public_write_gate_must_remain_disabled" | "explicit_write_scope_confirmation_required" | "shop_domain_invalid" };

export function validateTask53WriteScopeAuthorization(input: Task53WriteScopeAuthorizationInput): Task53WriteScopeAuthorizationResult {
  if (input.publicWriteGateEnabled) return { ok: false, category: "public_write_gate_must_remain_disabled" };
  if (input.confirmation !== TASK53_WRITE_SCOPE_CONFIRMATION) return { ok: false, category: "explicit_write_scope_confirmation_required" };
  const shop = typeof input.shop === "string" ? input.shop.trim().toLowerCase() : "";
  if (!shopPattern.test(shop)) return { ok: false, category: "shop_domain_invalid" };
  return { ok: true, shop, confirmation: TASK53_WRITE_SCOPE_CONFIRMATION };
}
