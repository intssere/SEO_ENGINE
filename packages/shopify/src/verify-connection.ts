import { verifyReadOnlyShopifyConnection } from "./index.js";

const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION;

if (!shopDomain || !accessToken) {
  console.error("SHOPIFY_SHOP_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN are required.");
  process.exit(1);
}

try {
  const result = await verifyReadOnlyShopifyConnection({
    shopDomain,
    accessToken,
    ...(apiVersion ? { apiVersion } : {}),
  });

  console.log(
    JSON.stringify(
      {
        ok: result.ok,
        mode: result.mode,
        apiVersion: result.apiVersion,
        shop: {
          id: result.shop.id,
          name: result.shop.name,
          myshopifyDomain: result.shop.myshopifyDomain,
          primaryDomain: result.shop.primaryDomain,
        },
        grantedScopes: result.grantedScopes,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
