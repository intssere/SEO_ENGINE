# UGP-5.2 — Broker implementation evaluation

## Status

**IMPLEMENTATION EVALUATION CANDIDATE — MERGE PENDING EXACT-HEAD CI AND EXPLICIT AUTHORIZATION**

UGP-5.2 evaluates Nango behind the UGP-5.1 ConnectionBroker boundary. This milestone does not add the Nango SDK, create credentials, configure OAuth, call Nango, call any provider, change production configuration, or enable live connectivity.

## Decision

- Candidate: Nango.
- Disposition: approved for a bounded pilot only.
- Production adoption: not yet approved.
- Pilot deployment choice: Nango Cloud.
- Preferred production deployment if later adopted: BYOC.
- Free self-hosted edition: not selected for production.

The reason for the split is operational: Cloud is the lowest-friction path for a bounded pilot, while BYOC provides stronger infrastructure/data-location control for production. This decision remains contingent on commercial/license acceptance, data-residency acceptance, credential-storage review, and successful failure/recovery certification.

## License/commercial-use review

Nango's current repository is licensed under Elastic License 2.0 (ELv2). The license allows use, copying, distribution, availability, and derivative works subject to restrictions. A material restriction is that the software may not be provided to third parties as a hosted or managed service where users receive access to a substantial set of Nango functionality.

For SEO ENGINE this means Nango must remain an implementation detail behind ConnectionBroker rather than becoming a separately exposed hosted Nango service. Final production adoption still requires commercial/legal acceptance of the intended deployment and product model.

Evidence checked on 2026-09-30:
- NangoHQ/nango LICENSE, current master.
- NangoHQ/nango README, current master.

## Data residency

Nango's current public platform documentation states that Nango Cloud proxy execution is hosted on AWS in the United States. The same material states that BYOC can run inside the customer's AWS, GCP, or Azure account so requests and data remain in customer infrastructure.

Decision:
- bounded pilot may use Nango Cloud only after explicit environment/config authorization;
- production default, if Nango is adopted, is BYOC;
- production Cloud use requires an explicit residency/privacy decision rather than being inherited from the pilot.

## Token storage and security

Nango's current public materials state that credentials are encrypted at rest and in transit in its managed offering and that OAuth/token refresh and multi-tenant credential storage are handled by the platform.

For self-hosting, the current repository configuration documents `NANGO_ENCRYPTION_KEY` as the database credential-encryption key and warns that it cannot currently be changed after setup without decryption failure. This makes key lifecycle/rotation an explicit production concern.

SEO ENGINE boundary:
- no access token, refresh token, API key, password, cookie, authorization header, or client secret may enter the ConnectionBroker domain artifact;
- product modules receive connection identity/health/lease metadata only;
- provider credentials remain confined to the broker implementation/credential boundary;
- a connection or lease never grants mutation authorization.

## Failure and recovery

Nango's current Auth documentation states that it refreshes expiring credentials, detects broken connections, and can surface connection-broken and recovered events. Its runtime/webhook material also describes retries, rate-limit handling, replay/reconciliation patterns, and asynchronous webhook delivery.

SEO ENGINE will not inherit autonomous recovery behavior blindly. UGP requires:
- broken state mapped into ConnectionBroker health;
- user-visible reconnect state;
- deterministic reconnect planning;
- no automatic reconnect in the UGP broker contract;
- no provider write authorization derived from successful reconnect;
- kill switch and revoke path before live enablement.

## Self-hosted/cloud decision

### Pilot

Use Nango Cloud only for a future bounded non-production pilot, after the live-connectivity gate is separately authorized.

### Production

Prefer BYOC if Nango is adopted. Reasons:
- full-feature product path per current Nango README;
- stronger data-residency/infrastructure control;
- avoids choosing the limited free self-hosted feature set as a production dependency;
- keeps Nango operationally replaceable behind ConnectionBroker.

Enterprise self-hosting remains a fallback for customers/regulatory contexts that specifically require it, but is not the default production target.

## Live-connectivity gate

`enabled=false` remains mandatory in UGP-5.2.

Before any Nango or provider network call is permitted, a later milestone must prove all of:
1. commercial/license acceptance;
2. deployment-mode acceptance;
3. data-residency acceptance;
4. credential-storage review;
5. secret-injection plan;
6. OAuth callback allowlist;
7. least-privilege scope plan;
8. webhook signature verification;
9. connection-loss/recovery test;
10. provider-write authorization-separation test;
11. kill switch and revoke path.

Passing this evaluation does not itself authorize any of those actions.

## Replacement boundary

Nango may implement ConnectionBroker, but must not define SEO ENGINE's public connection model. Provider-specific connection IDs, OAuth parameters, token schemas, webhook payloads, or SDK types must remain inside the Nango adapter. Universal site identity, universal connection identity, health, credential-lease metadata, reconnect planning, and authorization boundaries remain owned by SEO ENGINE.

That boundary allows a future replacement with another broker without rewriting product modules.

## Explicit exclusions

UGP-5.2 does not:
- install `@nangohq/*` packages;
- create a Nango account/project/environment;
- create or store Nango/API/provider secrets;
- create OAuth clients;
- configure callbacks/webhooks;
- make external requests;
- mutate a provider or public site;
- change database schema;
- activate workers/schedulers;
- deploy or publish anything.

## Evidence sources

- NangoHQ/nango `LICENSE` (Elastic License 2.0), current master, checked 2026-09-30.
- NangoHQ/nango `README.md`, current master, checked 2026-09-30.
- NangoHQ/nango `.env.example`, current master, checked 2026-09-30.
- Nango Auth product documentation: https://nango.dev/platform/auth
- Nango Request Proxy documentation: https://nango.dev/platform/request-proxy
- Nango Data Sync documentation: https://nango.dev/platform/data-sync
- Nango Webhooks documentation: https://nango.dev/platform/webhooks
- Nango Enterprise self-hosting overview: https://docs.nango.dev/guides/self-hosting/enterprise-self-hosting

## Exit criteria

UGP-5.2 is complete when:
1. Nango is evaluated against every roadmap-mandated adoption criterion;
2. the pilot/production deployment decision is explicit;
3. the production blockers and live-connectivity gate are explicit;
4. the ConnectionBroker replacement/authority boundary remains intact;
5. no Nango dependency or live connectivity is introduced;
6. exact-head CI succeeds;
7. merge receives explicit authorization and post-merge verification.

Successful completion permits UGP-5.3 Connections UI design/implementation without enabling provider connectivity.