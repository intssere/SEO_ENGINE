# Task #34 — OAuth Connection Manager v1

## Purpose
Replace the manual customer-secret onboarding path with a production-style authorization flow for Shopify and Google while preserving the read-only pilot boundary.

## User flow
1. User opens `/connections`.
2. User clicks **Connect Shopify** and supplies only the permanent `*.myshopify.com` store identity, not an Admin API token.
3. SEO ENGINE creates a short-lived signed state record bound to that store and redirects to Shopify authorization.
4. User approves Shopify read-only scopes.
5. SEO ENGINE validates callback state + Shopify HMAC, exchanges the code server-side, encrypts the token, and persists only ciphertext in `connections.secret_ref` plus sanitized metadata.
6. User clicks **Connect Google**.
7. SEO ENGINE uses OAuth 2.0 Authorization Code + PKCE with offline access and read-only Search Console + Analytics scopes.
8. SEO ENGINE validates state, exchanges the callback code server-side, encrypts the access/refresh token bundle, and persists sanitized connection metadata.
9. SEO ENGINE discovers accessible Search Console and GA4 properties and auto-matches Diamond Shelf where unambiguous.
10. If multiple candidate properties exist, `/connections` requires explicit selection from resources actually returned by Google; the server rejects arbitrary property IDs.
11. Existing Task #31 live probes then verify the resulting connections before a baseline can start.

## Read-only scopes
Shopify V1 requests only:
- `read_products`
- `read_content`

Google V1 requests only:
- `https://www.googleapis.com/auth/webmasters.readonly`
- `https://www.googleapis.com/auth/analytics.readonly`

Task #34 does not request Shopify write scopes and does not enable `PUBLIC_SITE_WRITES_ENABLED`.

## Runtime platform configuration
The SaaS operator configures these once for the deployment; customers do not paste raw access tokens:
- `APP_ORIGIN`
- `SHOPIFY_OAUTH_CLIENT_ID`
- `SHOPIFY_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `OAUTH_CREDENTIAL_ENCRYPTION_KEY` — base64 encoding of exactly 32 random bytes
- optional `OAUTH_STATE_SIGNING_SECRET` — otherwise the encryption key is used for state HMAC signing
- `DATABASE_URL`

These are application/platform secrets, not per-customer onboarding fields.

## Credential storage contract
The existing `connections` table separates durable connection metadata from `secret_ref`. Raw tokens are never stored in `metadata`, browser-visible payloads, connection status pages, or logs.

For the current V1 runtime, OAuth token bundles are encrypted with AES-256-GCM and serialized into `connections.secret_ref` with an `enc:v1:` envelope. The 256-bit encryption key remains outside the database in runtime configuration.

A later KMS/managed-secret migration can replace the encrypted envelope with an opaque secret-manager reference without changing the public connection model.

## OAuth safety
- 256-bit random state values
- 10-minute default state lifetime
- signed HttpOnly SameSite=Lax state cookie
- provider binding
- Shopify permanent-domain binding
- Shopify callback HMAC verification
- Google PKCE S256
- callback state validation before token exchange
- server-side client-secret use only
- HTTPS application origin outside localhost
- access/refresh tokens excluded from sanitized connection metadata
- Google property-selection fallback accepts only properties discovered during the authorized session

## Automatic discovery
After Google authorization, the manager lists:
- accessible Search Console properties
- accessible GA4 properties

For the Diamond Shelf pilot, `https://diamondshelf.us/` is auto-matched when it is unique. GA4 is auto-matched by an unambiguous `Diamond Shelf` display name. Ambiguity is shown in the UI and requires confirmation.

## Refresh lifecycle
The package includes `refreshGoogleAccessToken()`. Google access tokens are ephemeral; the retained encrypted refresh token lets the server obtain fresh access without asking the customer to reconnect each session.

Shopify offline Admin API tokens are retained as encrypted secret material. Revocation or scope errors should transition the connection into an error/reconnect state when later live probes detect them.

## Implemented web endpoints
- `GET /api/connections/shopify/start`
- `GET /api/connections/shopify/callback`
- `GET /api/connections/google/start`
- `GET /api/connections/google/callback`
- `POST /api/connections/google/select`
- `GET /connections` connection/status UI

## Boundary
Task #34 creates authorization URLs, exchanges OAuth codes, discovers authorized resources, encrypts credentials, and persists connection records. It still does **not** perform an SEO mutation, request Shopify write scopes, or enable public-site writes.

A green CI run proves the OAuth connection software behaves as designed. Real Diamond Shelf activation still requires registering the OAuth applications/redirect URIs with Shopify and Google and completing the consent flows against the deployed runtime.
