# UGP-5.3 — Connections UI

## Status

**IMPLEMENTATION CANDIDATE — MERGE PENDING EXACT-HEAD CI AND EXPLICIT AUTHORIZATION**

UGP-5.3 replaces the legacy provider-centric connections page with a customer-facing connection workspace aligned to the UGP-5 roadmap.

## Customer-facing connection domains

The UI exposes five explicit connection domains:

1. Website
2. Google Search Console
3. Google Analytics
4. CMS
5. Backlink / SERP provider

Search Console and Analytics are shown separately even though both currently use the existing Google authorization flow. This keeps the product model independent from provider implementation details.

## Site scope

The active website scope is shown prominently before provider cards. A provider is not treated as a complete customer connection unless its data can be associated with the current website scope.

In the current implementation, a connected Shopify domain is the only persisted site scope available from the existing status API. The UI does not fabricate a broader site identity when that value is absent; it instead shows `Scope required` and routes the customer to the existing website setup flow.

## Connection state grammar

The deterministic UI model uses:

- `connected`
- `needs_attention`
- `not_connected`
- `scope_required`
- `planned`

Google authorization that is incomplete, stale, or awaiting property confirmation is surfaced as `Needs attention` rather than as connected.

## Recovery behavior

Connection loss is explicit and recoverable where the current backend supports recovery:

- Google authorization/property problems expose `Reconnect Google` or property confirmation;
- OAuth actions remain disabled when the existing safety mode disallows connection changes;
- Backlink/SERP remains visibly planned and has no live connect action;
- no automatic reconnect is introduced.

## Existing behavior preserved

UGP-5.3 does not replace or widen existing connection mechanics.

The page continues to use the existing endpoints:

- `/api/connections/status`
- `/api/connections/google/start`
- `/api/connections/google/select`
- `/api/connections/shopify/start`
- `/api/connections/shopify/task53-write/start`
- `/api/execution` for existing Task #53 capability visibility.

The direct Shopify authorization form and isolated Task #53 write_products credential flow remain available under an advanced provider section so existing certified behavior is not removed.

## Authority boundary

Connection state remains non-authorizing.

The UI explicitly states that connecting a provider makes data available but does not authorize SEO ENGINE to publish or modify the site. The existing write, approval, execution, verification, and public-site gates remain independent.

UGP-5.3 introduces no credential display, credential storage, provider write, public-site write, autonomous reconnect, scheduler/worker activation, or live broker implementation.

## Responsive/accessibility behavior

The workspace uses the existing SEO ENGINE design system and adds responsive rules for:

- three-column desktop connection cards;
- two-column tablet layout;
- one-column mobile layout;
- 44 px minimum interactive targets;
- explicit loading and alert roles;
- responsive property-selection and provider setup forms;
- no horizontal overflow at phone widths.

## Tests

`connections-ui-model.test.ts` verifies:

- all five roadmap-required domains are present;
- site scope is explicit;
- Google loss/recovery is represented correctly;
- OAuth actions fail closed when current safety mode disallows them;
- Backlink/SERP connectivity is not fabricated.

The test is wired into the existing `@workspace/seo-engine` test suite.

## Explicit exclusions

UGP-5.3 does not:

- install or activate Nango;
- create new OAuth/provider endpoints;
- create a Backlink/SERP provider connection;
- add database/schema changes;
- add credentials or secrets;
- change provider scopes;
- make external requests beyond the already-existing browser flows;
- authorize provider/public-site writes;
- deploy or publish anything.

## Exit criteria

UGP-5.3 is complete when:

1. the five connection domains are represented through a common customer-facing state grammar;
2. site scope is explicit;
3. connection loss is understandable and recoverable where supported;
4. provider-specific credential logic remains outside product modules;
5. legacy Shopify/Google safe flows remain regression-safe;
6. responsive and accessibility baselines are preserved;
7. exact-head CI succeeds;
8. merge receives explicit authorization and post-merge verification.

Completion of UGP-5.3 closes UGP-5 when the roadmap exit criteria are satisfied.