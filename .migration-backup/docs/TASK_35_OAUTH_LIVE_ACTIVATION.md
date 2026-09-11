# Task #35 — OAuth App Registration + Live Connection Activation v1

## Purpose

Bridge the merged OAuth connection manager into a real deployable activation flow without requiring customer-managed access tokens.

## What this task adds

- Deterministic OAuth registration manifest for the deployed application origin.
- Exact Shopify callback URI.
- Exact Google callback URI.
- Locked read-only Shopify scopes.
- Locked read-only Google Search Console and GA4 scopes.
- Fail-closed runtime readiness validation for platform OAuth credentials.
- Minimum credential-encryption protection.
- OAuth state-signing readiness.
- Mandatory `PUBLIC_SITE_WRITES_ENABLED=false` during activation.

## Operator-managed configuration

These are platform-level values configured once by the SEO ENGINE operator, not by every customer:

- `APP_ORIGIN`
- `SHOPIFY_OAUTH_CLIENT_ID`
- `SHOPIFY_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `OAUTH_CREDENTIAL_ENCRYPTION_KEY`
- optional `OAUTH_STATE_SIGNING_SECRET`
- `PUBLIC_SITE_WRITES_ENABLED=false`

## Generated redirect URIs

For an application origin such as `https://seo.example.com`:

- Shopify: `https://seo.example.com/api/connections/shopify/callback`
- Google: `https://seo.example.com/api/connections/google/callback`

These exact values must be registered in the Shopify and Google developer consoles.

## Customer flow after platform registration

1. Customer opens Connections.
2. Customer clicks Connect Shopify or Connect Google.
3. Provider shows its authorization/consent screen.
4. Provider returns to the exact registered callback.
5. SEO ENGINE validates state/HMAC/PKCE as applicable.
6. SEO ENGINE exchanges the code server-side.
7. Credentials are encrypted before persistence.
8. GSC/GA4 properties are discovered automatically.
9. Diamond Shelf resources are auto-matched when unambiguous.
10. Read-only live probes run before baseline collection.

## Safety boundary

Task #35 does not authorize any public-site mutation and does not create external Shopify or Google developer applications by itself. Creating those provider-side applications still requires an authenticated operator action in the respective provider console. A green CI run proves the readiness logic, not that a real OAuth app has been registered or that a live account has been connected.
