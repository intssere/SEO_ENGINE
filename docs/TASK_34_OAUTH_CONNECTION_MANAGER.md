# Task #34 — OAuth Connection Manager v1

## Purpose
Replace the manual customer-secret onboarding path with a production-style authorization flow for Shopify and Google while preserving the read-only pilot boundary.

## User flow
1. User clicks **Connect Shopify**.
2. SEO ENGINE creates a short-lived state record bound to the permanent `*.myshopify.com` domain.
3. User approves Shopify read-only scopes.
4. SEO ENGINE exchanges the callback code server-side and stores the credential only as encrypted secret material / `secret_ref`.
5. User clicks **Connect Google**.
6. SEO ENGINE uses OAuth 2.0 Authorization Code + PKCE with offline access and read-only Search Console + Analytics scopes.
7. SEO ENGINE exchanges the callback code server-side, securely stores the refresh token, and refreshes access tokens automatically.
8. SEO ENGINE discovers accessible Search Console and GA4 properties and auto-matches Diamond Shelf where unambiguous.
9. If multiple candidate properties exist, the UI must require explicit user selection rather than guessing.
10. Existing Task #31 live probes then verify the resulting connections before a baseline can start.

## Read-only scopes
Shopify V1 requests only:
- `read_products`
- `read_content`

Google V1 requests only:
- `https://www.googleapis.com/auth/webmasters.readonly`
- `https://www.googleapis.com/auth/analytics.readonly`

Task #34 does not request Shopify write scopes and does not enable `PUBLIC_SITE_WRITES_ENABLED`.

## Credential storage contract
The existing `connections` table already separates durable connection metadata from `secret_ref`. Raw tokens must never be stored in `metadata`, logs, browser state, or dashboard payloads.

The package includes an AES-256-GCM envelope helper for deployments that need application-layer encryption. Production deployments may instead use a managed secret/KMS service, with only its opaque reference persisted in `connections.secret_ref`.

The encryption key is runtime/platform configuration and must never be committed to Git.

## OAuth safety
- 256-bit random state values
- 10-minute default state lifetime
- provider binding
- Shopify permanent-domain binding
- Google PKCE S256
- callback state validation before token exchange
- server-side client-secret use only
- HTTPS callback/provider endpoints in production
- access/refresh tokens excluded from sanitized connection metadata

## Automatic discovery
After Google authorization, the manager lists:
- accessible Search Console properties
- accessible GA4 properties

For the Diamond Shelf pilot, `https://diamondshelf.us/` is auto-matched when it is unique. GA4 is auto-matched by an unambiguous `Diamond Shelf` display name; ambiguity requires confirmation.

## Refresh lifecycle
Google access tokens are ephemeral. The refresh token is retained as encrypted secret material and used server-side to obtain fresh access tokens without asking the customer to reconnect each session.

Shopify offline Admin API tokens are retained as encrypted secret material. Revocation or scope errors transition the connection to an error/reconnect state.

## Boundary
This task supplies the OAuth domain logic. It does not yet expose public web callback routes or write connection records to a production database. Those are the next integration step after this package passes CI.

No public-site mutation is authorized or performed by Task #34.
