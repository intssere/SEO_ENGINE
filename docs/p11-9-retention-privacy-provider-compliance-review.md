# P11.9 — retention, privacy, provider terms and compliance review

## Purpose and status

P11.9 is an **engineering/provider-policy review**, not legal advice and not a legal-compliance certification.

Review date: **2026-09-21**

Canonical engineering baseline:
- GitHub main SHA: `03cd3c7e15ac1bbc804f283c81f2c95a0c5e670d`
- tree: `d15b1fcd8e34f8755493b0c170f2b894f16669e0`
- P11.8 post-closeout CI #649: success
- Replit: exact Git-only aligned, `0/0`, clean
- published production remains the separately certified Task #73 release.

This review does not authorize deletion, migration, token revocation, webhook deployment, external provider calls, policy/account changes, worker activation, deployment or publication.

## Executive conclusion

SEO ENGINE has a strong engineering foundation for secrecy, scope minimization and auditability, but it is **not yet ready to make a broad commercial privacy/compliance claim**.

The most important current controls are:
- OAuth provider tokens are encrypted before persistence;
- connection-list responses expose sanitized metadata rather than token envelopes;
- GSC is architected around an exact read-only scope;
- Task #53 Shopify mutation scope is narrowly bound to `write_products`;
- session tokens and CSRF tokens are stored as hashes;
- IP/user-agent values stored for auth are HMAC-hashed rather than raw;
- application logging redacts Authorization, Cookie and Set-Cookie headers;
- P11.3 structured observability rejects secret-like attribute keys;
- P3.3 defines explicit retention classes and bounded operational retention policy intent;
- destructive retention execution remains disabled by default.

The principal pre-production gaps are:
1. no end-to-end data-subject/account/merchant erasure workflow;
2. no provider disconnect lifecycle that revokes provider grants and then permanently deletes stored token envelopes;
3. no cleanup executor for expired/revoked auth sessions or auth audit events;
4. no implemented Shopify privacy-compliance webhook handlers/subscriptions;
5. site deletion does not cover P3.6 observation/evidence rows because those tables are not foreign-keyed to `sites`;
6. `evidence_lineage` and `audit_history` have no finite retention horizon and archive/prune execution is disabled;
7. no certified backup-erasure/backup-expiry procedure for deleted personal/merchant data;
8. no production telemetry-retention schedule exists yet;
9. no durable controller/processor/subprocessor register and DPA inventory is maintained in the repository;
10. no finalized external privacy policy/in-product disclosure has been certified against the actual live provider/data flows.

These gaps are **engineering launch blockers** for a general commercial multi-customer release if the affected data flows are activated.

## Data classification inventory

### A. Account/authentication identity

Repository evidence:
- `auth_sessions.subject`
- `auth_sessions.email`
- `auth_sessions.display_name`
- `auth_sessions.role`
- token hash
- CSRF token hash
- HMAC-hashed user-agent
- HMAC-hashed IP
- created/last-seen/expiry/revocation timestamps
- metadata
- `auth_audit_events.subject`
- `auth_audit_events.email`
- role, event type, outcome, request ID, HMAC-hashed IP and metadata.

Classification:
- personal data / pseudonymous personal data;
- authentication/security telemetry.

Current controls:
- 12-hour absolute session TTL;
- 30-minute idle TTL;
- 15-minute token rotation;
- explicit revocation marker;
- HTTP-only/secure-cookie architecture;
- no raw session token persistence;
- IP/user-agent are hashed/HMAC-hashed.

Gap:
- TTL enforcement prevents use of old sessions but does **not delete** expired/revoked rows;
- audit rows retain subject/email independently even if a session row is later removed because the audit FK is `ON DELETE SET NULL`;
- no retention window or purge process is defined for auth audit data.

Required before commercial production:
- define session-row cleanup schedule;
- define audit-event retention period and lawful/business purpose;
- define account deletion/de-identification behavior;
- explicitly decide when security records may be retained after user/account deletion and how they are minimized.

### B. Provider credentials and connection metadata

Repository evidence:
- `connections.provider`
- `connections.external_account_id`
- `connections.secret_ref`
- scopes
- status
- metadata.

Current controls:
- access/refresh tokens are encrypted using `OAUTH_CREDENTIAL_ENCRYPTION_KEY`;
- encrypted token envelope is encoded into `secret_ref`;
- connection list returns provider/status/metadata only;
- logger secret redaction exists;
- GSC profile isolates an exact read-only scope;
- Shopify Task #53 requires `write_products` only.

Classification:
- high-sensitivity authentication credentials;
- merchant/provider account metadata;
- potentially personal or organizational account identifiers.

Gap:
- no generic application disconnect flow was identified that:
  1. revokes the provider-side OAuth grant/token;
  2. marks connection disabled;
  3. removes encrypted token material;
  4. records auditable revocation outcome;
  5. handles revocation failure/retry safely.
- current site cascade can remove the `connections` row but cannot revoke an already-issued provider credential by itself.

Required before live provider scale-up:
- provider-specific disconnect/revoke/delete contract;
- exact retention behavior for connection metadata after credential deletion;
- revocation failure/manual-intervention semantics;
- explicit user/merchant controls or admin procedure.

### C. Merchant/site/business configuration

Examples:
- organization/site name/domain/canonical origin;
- Shopify shop domain;
- selected GSC property;
- GA4 property identifiers if later activated;
- connection/provider metadata;
- action/deployment provider references.

Classification:
- merchant/business data;
- sometimes personal data if a business name, email or sole-proprietor identifier identifies a person.

Current deletion path:
- many core site-owned tables use `ON DELETE CASCADE` from `sites`.

Gap:
- site deletion is not yet exposed as a governed application workflow;
- no commercial account-closure procedure;
- no proof that all external/provider resources are disconnected before local deletion.

### D. Public crawl/page content

Persisted/planned data can include:
- URL and normalized URL;
- title/meta/canonical/H1;
- full `content_text`;
- structured data;
- headings;
- links;
- images;
- raw signals;
- crawl metadata.

Classification:
- primarily public site/business content;
- can incidentally contain personal data, contact information, user-generated content or sensitive content.

Risk:
- retaining full text can retain more personal data than necessary for many SEO use cases.

Recommendation:
- prefer derived/fingerprinted signals where full content is unnecessary;
- define separate retention for full-text snapshots vs structural SEO signals;
- keep authenticated/private crawling out of scope until separately privacy-reviewed;
- never assume “publicly accessible” means “not personal data.”

### E. Search/query/performance data

Examples:
- GSC/search query strings;
- country/device dimensions;
- page associations;
- clicks/impressions/CTR/average position.

Classification:
- property analytics;
- query text can occasionally contain names, emails, IDs, addresses, health/financial terms or other personal/sensitive content.

Required controls:
- request only necessary dimensions;
- avoid forwarding raw query text to downstream providers/AI unless required and disclosed;
- support query-level minimization/redaction where practical;
- treat Google-authorized Search Console data as Google user data governed by applicable Google policies.

### F. Evidence/history/governance data

Examples:
- `evidence.payload`
- provenance
- observations/material values
- findings
- opportunities
- plans/actions
- approvals and `actor_id`
- deployment/rollback/verification state
- outcome/experiment history.

Classification:
- business operational history;
- can contain personal identifiers or copied provider/site content.

P3.3 intended retention:
- `operational_history`: archive after 30 days, prune candidate after 180 days;
- `evidence_lineage`: no automatic archive/prune horizon;
- `audit_history`: no automatic archive/prune horizon.

Important limitation:
- P3.3 is planning only;
- archive/prune/delete execution is explicitly disabled.

Result:
- if future persistence is enabled without a retention executor, intended expiry dates do not actually remove data.

### G. P3.6 observation/evidence schema

Important deletion gap:

`seo_observation.site_id` is a varchar identity, not an FK to `sites.id`.

`seo_evidence` is linked to observations through `seo_observation_evidence`, whose foreign keys are `ON DELETE RESTRICT`.

Implication:
- deleting a `sites` row does not automatically delete P3.6 observations/evidence;
- once P3.6 persistence is activated, account/site erasure requires an explicit ordered erasure planner;
- evidence shared by multiple observations must not be deleted until references are resolved;
- deletion must preserve required legal/security records only under an explicit exception rather than by accidental orphaning.

Current production note:
- P3.6 tables were certified empty immediately after migration;
- application observation/evidence persistence remains disabled.

### H. AI prompt/response/citation data

Schema/foundation can retain:
- prompt text;
- AI answer text;
- provider/model identifiers;
- citations;
- metadata.

Classification:
- business content;
- potentially personal/confidential information if prompts are assembled from pages, queries, tickets, account content or user input.

Current state:
- live AI proposal generation remains default-off;
- OpenAI integration code exists but production AI proposal/evidence activation is not implied.

Required pre-activation rule:
- classify every input source sent to an AI provider;
- do not forward secrets, OAuth tokens, private customer data or unnecessary user identifiers;
- select API endpoint/storage settings deliberately;
- document provider retention/control behavior;
- use ZDR/modified abuse monitoring where the data sensitivity/business requirement justifies it and the organization is eligible.

### I. Logs, traces and observability

Current controls:
- Pino redacts:
  - Authorization header;
  - Cookie header;
  - Set-Cookie header.
- P11.3 rejects secret-like structured attribute keys including token/password/secret/API-key forms.
- P11.3 does not activate a durable production telemetry sink.

Risk:
- message strings, request paths, query strings, provider errors and arbitrary metadata can still contain personal/business-sensitive material even when known secret-key names are blocked.

Required before telemetry activation:
- define allowed event schema;
- strip/normalize URL query strings where not needed;
- avoid raw provider response bodies;
- define log/trace retention horizon;
- restrict access;
- document incident/security retention exceptions.

### J. Jobs/errors

`jobs.payload` and `last_error` are free-form enough to become accidental data sinks.

Required:
- job payload contracts should prohibit credentials and raw personal content unless explicitly required;
- provider errors should be categorized, not blindly stored as raw bodies;
- dead-letter review UI should not expose secrets.

### K. Policy source/version history

`policy_versions.content_text` can retain complete third-party policy/terms text.

Risk:
- not primarily a privacy issue;
- can create unnecessary copyright/licensing/storage obligations.

Recommendation:
- retain source URL, observed time, hash and bounded normalized excerpts/change summaries when sufficient;
- do not assume indefinite full-text reproduction is permitted merely because the policy is public.

### L. Backups/recovery

P11.4 explicitly certifies only synthetic recovery contracts, not real backup retention/deletion.

Privacy implication:
- a data-deletion workflow is incomplete if deleted data can remain indefinitely in recoverable backups without a defined expiry/isolation rule.

Required:
- document real backup/PITR retention by production provider;
- define deletion propagation expectations;
- where immediate backup mutation is unsafe/impossible, document bounded expiry plus no-restoration-without-reapplying-deletion obligations;
- include backup handling in DSAR/account deletion runbook.

## Database deletion/cascade review

### Core schema strengths

Many site-owned records are transitively deleted from `sites`:
- connections;
- crawl runs;
- pages and snapshots;
- search queries and metrics;
- evidence/findings/opportunities;
- plans/actions;
- experiments/cohorts/outcomes;
- AI query/response/citation chains;
- learning signals;
- jobs.

### Important exceptions / independent records

Not safely covered by deleting a site:
- P3.6 `seo_observation` / `seo_evidence` / join table;
- `auth_sessions`;
- `auth_audit_events`;
- global policy sources/versions/changes/rules;
- external provider-side tokens/resources;
- backup copies;
- future telemetry sinks.

### Deletion-order implication

A future erasure engine must be domain-aware rather than one generic `DELETE FROM sites`.

At minimum it needs:
1. identify authorized deletion subject/site/organization;
2. stop new jobs/collection;
3. revoke provider credentials;
4. delete or de-identify provider/account metadata as required;
5. delete P3.6 observation/evidence references in a safe order;
6. delete site-owned core data;
7. handle auth/audit identity separately;
8. record the deletion action without retaining unnecessary deleted content;
9. ensure backup expiry/recovery procedures preserve the deletion outcome;
10. verify no active workers can repopulate deleted data.

P11.9 does not implement or authorize that engine.

## Provider policy review

All provider findings below are dated **2026-09-21** and should be re-reviewed before activation because terms can change.

### Google OAuth / Search Console

Official sources reviewed:
- https://developers.google.com/terms/api-services-user-data-policy
- https://developers.google.com/identity/protocols/oauth2/policies
- https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification

Relevant current requirements:
- accurately identify the app and requested data/use;
- publish and surface an accurate privacy policy;
- request the minimum permissions necessary;
- keep client credentials confidential;
- store user tokens securely/encrypted at rest;
- revoke tokens when access is no longer needed;
- permanently delete revoked token material;
- use Google user data only for disclosed/permitted user-facing purposes;
- production OAuth configuration/homepage/privacy-policy information must accurately represent the application.

Current SEO ENGINE alignment:
- exact isolated GSC read-only scope architecture: positive;
- encrypted token persistence: positive;
- browser token secrecy: positive;
- privacy-policy/in-product disclosure certification: missing;
- token revoke + local permanent delete lifecycle: missing;
- live GSC activation remains separately authorized.

Pre-activation blocker:
- implement/certify disconnect/revocation/deletion behavior and public privacy disclosures before broad production OAuth rollout.

### Shopify

Official sources reviewed:
- https://www.shopify.com/legal/api-terms
- https://shopify.dev/docs/apps/launch/privacy-requirements
- https://shopify.dev/docs/apps/launch/protected-customer-data
- https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance
- https://shopify.dev/docs/api/admin-rest/unstable/resources/webhook

Shopify API License and Terms of Use page reviewed with stated last update **2026-02-27**.

Relevant current themes:
- access only with merchant authorization;
- request only minimum data needed;
- keep API credentials secure;
- maintain an appropriate merchant agreement/privacy policy for applicable apps;
- do not use/store/copy Merchant Data beyond what is necessary for the service;
- delete Merchant Data within 30 days after uninstall/no longer needed/enforceable deletion request, subject to applicable terms/law;
- App Store/public apps require privacy compliance webhook topics such as:
  - `customers/data_request`
  - `customers/redact`
  - `shop/redact`
- `shop/redact` is the store-data erasure event after uninstall under Shopify's privacy-compliance flow.

Current SEO ENGINE alignment:
- Task #53 mutation scope is limited to `write_products`;
- no customer/order scopes are required by the reviewed SEO mutation class;
- credential encryption exists;
- no repository implementation was found for the three exact compliance webhook topics;
- no merchant-data deletion executor was found;
- no general app-uninstall/provider-disconnect cleanup workflow was found.

Important scope decision:
- keep protected customer data/customer/order scopes out of SEO ENGINE unless a future feature demonstrates need and receives a separate privacy/security review.

Pre-production blocker if distributed as a public/App Store app:
- implement the required compliance webhook/configuration + HMAC verification + erasure/data-request workflow;
- document merchant data retention and deletion;
- certify 30-day deletion handling where applicable.

If the integration remains a single-merchant/custom application, distribution-specific Shopify obligations must still be reviewed against the exact app type; P11.9 does not assume App Store distribution.

### DataForSEO

Official sources reviewed:
- https://dataforseo.com/terms-of-service
- https://dataforseo.com/privacy-policy
- https://docs.dataforseo.com/v3/
- https://dataforseo.com/help-center/how-long-do-you-keep-results

Terms page reviewed with stated update **2026-06-12**.

Relevant current themes:
- DPA is incorporated when GDPR applies under DataForSEO terms;
- provider privacy policy states DataForSEO API task data is stored for **365 days**;
- API docs/help state Standard task results are generally retained for **30 days**;
- Live methods have endpoint-specific/non-storage behavior;
- SERP data usage restrictions prohibit use that competes with or adversely affects originating search-engine providers;
- rate limits and result-storage behavior are provider-specific.

Current SEO ENGINE state:
- DataForSEO is selected as an engineering target;
- current adapters remain network-free/default-off;
- no provider enrollment/credential/live source admission is implied.

Pre-activation requirements:
- document exactly which request fields leave SEO ENGINE;
- prohibit secrets/account PII from provider task payloads;
- decide whether user-entered/raw query text may be transmitted;
- record provider-side retention in privacy/subprocessor documentation if personal data could be sent;
- validate intended SERP-data use against current terms;
- re-review terms before live activation.

### SerpApi

Official source reviewed:
- https://serpapi.com/legal

Relevant current themes:
- search data retained **31 days** by default according to current legal page;
- ZeroTrace Mode can prevent storage of search parameters, queries and results;
- deletion lifecycle covers applicable active systems/logs/backups according to provider process.

Current SEO ENGINE state:
- SerpApi is a benchmark/fallback candidate;
- no live source activation is certified.

Pre-activation requirements:
- decide whether default retention is acceptable for transmitted queries;
- prefer ZeroTrace or equivalent no-storage option for sensitive/customer-specific query workflows when available/appropriate;
- document DPA/subprocessor role if personal data is sent;
- re-review current legal terms before enrollment.

### OpenAI API

Official sources reviewed:
- https://openai.com/policies/service-terms/
- https://platform.openai.com/docs/models/default-usage-policies-by-endpoint
- https://openai.com/business-data/

Relevant current themes:
- API/business data is not used to train/improve models by default unless the customer explicitly opts in under applicable settings/terms;
- default API abuse-monitoring logs can retain customer content for up to **30 days**;
- qualifying organizations can use Modified Abuse Monitoring or Zero Data Retention;
- endpoint-specific application-state retention differs;
- some endpoints store state until explicitly deleted and are not ZDR eligible;
- customer is responsible for rights/permissions for submitted content.

Current SEO ENGINE state:
- integration code exists;
- `AI_PROPOSAL_GENERATION_ENABLED=false` remains the default safety gate;
- no P11.9 activation is authorized.

Pre-activation requirements:
- classify all content that may be sent;
- select endpoint(s) intentionally;
- choose `store` behavior explicitly;
- confirm whether ZDR/MAM is required;
- do not send OAuth credentials, secrets or unnecessary personal data;
- document AI provider/subprocessor role and retention in privacy materials;
- preserve human/evidence governance for outputs.

## Provider/subprocessor register gap

Before general commercial release, maintain a dated register containing at least:
- provider/service name;
- role: processor / subprocessor / independent controller / data source, as legally reviewed;
- purpose;
- data categories sent/received;
- authentication mechanism;
- regions/data residency where relevant;
- provider retention;
- DPA/contract reference;
- subprocessors where material;
- deletion/revocation mechanism;
- last terms review date;
- internal owner.

Likely entries include at minimum:
- production database host;
- runtime/deployment host;
- Google identity/OAuth/GSC;
- Shopify;
- DataForSEO if activated;
- SerpApi if activated;
- OpenAI if activated;
- analytics/telemetry provider if later added.

P11.9 does not assign final legal controller/processor status; counsel should validate those classifications.

## Privacy notice / disclosure requirements before commercial launch

The production-facing privacy policy should accurately disclose, as applicable:
- identity/contact details of the application operator;
- account/auth information collected;
- provider accounts connected;
- site/crawl/search/query data collected;
- AI/provider processing;
- logs/security telemetry;
- why each category is used;
- service providers/subprocessors/third-party transfers;
- retention periods or criteria;
- deletion/account closure process;
- international transfers/data residency where relevant;
- user/merchant rights and request channel;
- Google user-data handling;
- Shopify Merchant Data handling;
- whether public site data is crawled/stored;
- whether query text is sent to third-party intelligence or AI providers;
- backup deletion/expiry limitations.

In-product disclosures should appear in context before:
- Google OAuth;
- Shopify OAuth/write-scope consent;
- enabling any external intelligence provider that receives customer-specific query/domain data;
- enabling AI processing of site/query/business content.

## DSAR / deletion / account-closure engineering contract needed

A production DSAR/account deletion system should eventually support:
- identity verification and authorization;
- export/inspection of personal data where applicable;
- site/organization deletion;
- connection/token revocation;
- core-table deletion;
- P3.6 evidence deletion/de-identification;
- auth/audit treatment;
- backup expiry handling;
- legal/security hold exceptions;
- completion receipt/fingerprint without re-storing deleted content.

No such production executor is authorized by P11.9.

## Backup deletion implications

Deletion must be durable across recovery.

Required future rule:
- if backup media cannot be surgically modified safely, deleted records may remain inaccessible in backup until bounded expiry;
- restoring an older backup must reapply all deletion/tombstone events that occurred after the backup point before the restored service is returned to production;
- backup retention horizon must be published internally and reflected in privacy disclosures where required.

P11.4 currently certifies synthetic recovery planning only and does not establish this production deletion behavior.

## Retention schedule required before P12

A future explicit retention schedule should identify:
- auth sessions;
- auth audit events;
- crawl runs;
- page full-text snapshots;
- search queries/metrics;
- observations/evidence;
- opportunities/actions/approvals/deployments;
- AI prompts/responses;
- provider connection metadata;
- encrypted credentials;
- jobs/dead letters;
- observability logs/traces/metrics;
- reports/exports;
- policy-source snapshots;
- backups.

For each class define:
- purpose;
- default retention;
- archive period;
- deletion/de-identification trigger;
- legal/security exception;
- backup expiry;
- responsible owner;
- automated/manual enforcement;
- verification evidence.

## Pre-production blockers

### Blocker P11.9-B1 — external privacy policy and contextual disclosure
No final production privacy policy/in-product disclosure set is certified against the actual provider/data flows.

### Blocker P11.9-B2 — provider credential disconnect/revocation lifecycle
Encrypted storage exists, but provider revocation + permanent local token deletion is not implemented as a general lifecycle.

### Blocker P11.9-B3 — Shopify privacy deletion path
No exact `customers/data_request`, `customers/redact` or `shop/redact` implementation was found.

This becomes a hard blocker for Shopify distribution modes for which those compliance topics are required.

### Blocker P11.9-B4 — retention execution
P3.3 expresses retention decisions but production archive/prune/delete execution remains disabled.

### Blocker P11.9-B5 — P3.6 erasure path
Observation/evidence tables do not cascade from `sites`; explicit deletion semantics are required before persistent evidence is used with account/site deletion obligations.

### Blocker P11.9-B6 — auth/audit retention
Expired/revoked sessions and audit events have no certified cleanup/retention schedule.

### Blocker P11.9-B7 — backup deletion/recovery interaction
No production deletion propagation/backup-expiry certification exists.

### Blocker P11.9-B8 — provider/DPA/subprocessor register
No durable, dated provider-processing register is maintained.

### Blocker P11.9-B9 — live AI/external-provider data classification
Before DataForSEO/SerpApi/OpenAI activation, exact outgoing field classification, provider retention and privacy disclosure must be reviewed.

### Blocker P11.9-B10 — jurisdiction-specific legal review
Engineering review cannot decide all applicable GDPR/UK GDPR/US state privacy/consumer law, contractual, tax, records-management or employment/security obligations.

Counsel should review the final commercial privacy policy, terms, DPA posture, deletion schedule and launch jurisdictions.

## Non-blocking engineering recommendations

- minimize full-text crawl retention;
- hash or derive where raw values are not needed;
- do not treat HMAC-hashed IP as anonymous by default;
- keep customer/order Shopify scopes out of the product unless separately justified;
- prefer provider modes with lower retention when functionally equivalent;
- never place credentials/provider secrets in job payloads, audit metadata or provider error strings;
- maintain terms-review timestamps for every activated provider;
- re-review provider terms before material scope changes;
- make privacy/deletion state visible in the System/Connections UI before multi-customer commercialization.

## P11.9 outcome

**Engineering/provider-policy review: COMPLETE when this document is merged and certified.**

P11.9 does not declare SEO ENGINE legally compliant.

It establishes:
- current data inventory;
- current retention behavior;
- current provider-policy constraints;
- the pre-production compliance blockers that must remain fail-closed;
- the exact separation between safe engineering review and future destructive/provider actions.

## Safety boundary

P11.9 performs no:
- production archive/prune/delete;
- Production DB/storage read/write/DDL/DML;
- token revocation;
- secret rotation/deletion;
- Shopify webhook deployment;
- OAuth/provider request;
- provider-account mutation;
- retention worker/scheduler activation;
- new external collection;
- Task #51/#53/#54 execution;
- P9.8 implementation/activation;
- deployment or publication.

## Next boundary

After P11.9 review certification and durable closeout, the next roadmap stage is:

**P11.10 — load/scale testing for target URL/query volumes.**
