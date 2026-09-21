# P11.9 — retention/privacy/provider terms and compliance review closeout

## Milestone

Roadmap P11.9 — retention/privacy/provider terms and compliance review.

- issue: #367
- review PR: #368
- review base SHA/tree: `03cd3c7e15ac1bbc804f283c81f2c95a0c5e670d` / `d15b1fcd8e34f8755493b0c170f2b894f16669e0`
- exact reviewed head/tree: `2668467168bb7a272c6fc2873e6c8b80ea7da2b4` / `8176334f53bb166cfbe36cc2ef3eca0d8d9c9ef0`
- exact-head PR CI #650 / run `35621237576`: success
- review merge/tree: `9ed6377963d052a4beccd9a43c102dcddbd798c7` / `8176334f53bb166cfbe36cc2ef3eca0d8d9c9ef0`
- post-merge main CI #651 / run `35621913456`: success
- canonical workspace tests: **1,241 PASS / 0 failures**
- canonical Chromium: **110/110 PASS**
- typecheck: PASS
- build/P11.1 budget: PASS
- JS: 611,156 raw / 175,333 gzip
- CSS: 186,332 raw / 31,020 gzip

## Review status

P11.9 is an engineering/provider-policy review.

It is not:
- legal advice;
- a legal-compliance certification;
- an authorization to activate a provider;
- an authorization to delete or mutate production data;
- an authorization to revoke credentials or rotate secrets.

## Existing controls confirmed

- OAuth access/refresh token bundles are encrypted before persistence.
- Browser-facing connection listing excludes secret refs/token envelopes.
- GSC architecture is profile-isolated and read-only scoped.
- Task #53 Shopify writes require `write_products`.
- Session and CSRF secrets are stored as hashes.
- Auth IP/user-agent values are HMAC-hashed rather than stored raw.
- Application logger redacts Authorization, Cookie and Set-Cookie headers.
- P11.3 structured observability rejects secret-like attribute names.
- P3.3 models retention decisions but keeps archive/prune/destructive execution disabled.

## Data classes reviewed

- account/auth identity;
- auth audit/security telemetry;
- provider credentials and provider account metadata;
- organization/site/business configuration;
- crawl/page snapshot/full-text data;
- search-query/performance data;
- evidence/history/governance records;
- P3.6 observations/evidence;
- AI prompt/response/citation data;
- jobs/errors;
- logs/traces/metrics;
- third-party policy snapshots;
- backups/recovery state.

## Important deletion findings

Core site-owned tables generally benefit from site cascade semantics, but that is not a complete erasure system.

Independent/special handling is required for:
- auth sessions;
- auth audit events;
- external provider grants/tokens;
- P3.6 observation/evidence state;
- backups;
- future telemetry stores;
- global policy history where applicable.

P3.6 is a particularly important future gap:
- `seo_observation.site_id` is a string identity, not an FK to `sites`;
- observation/evidence join FKs use `ON DELETE RESTRICT`;
- deleting a core Site row would not automatically erase persisted P3.6 evidence.

P3.6 production tables were certified empty after migration and application persistence remains disabled, so this review identifies a future activation prerequisite rather than an active deletion incident.

## Dated provider-policy review

Review date: 2026-09-21.

Provider families reviewed:
- Google OAuth / Search Console;
- Shopify;
- DataForSEO;
- SerpApi;
- OpenAI API.

The detailed review file records:
- source documents;
- current provider-side retention themes;
- scope/data-minimization expectations;
- token/credential expectations;
- privacy-policy/disclosure expectations;
- distribution-specific Shopify privacy webhook requirements;
- pre-activation gaps.

Provider terms can change and must be re-reviewed before activation/material scope changes.

## Ten fail-closed pre-production blockers

1. final external privacy policy and contextual provider disclosures;
2. provider disconnect/revoke/permanent-local-token-delete lifecycle;
3. Shopify privacy/data-request/redaction path where required;
4. real retention/archive/prune/delete execution;
5. explicit P3.6 erasure semantics;
6. auth session/audit retention and cleanup;
7. backup deletion/expiry/restoration handling;
8. dated provider/DPA/subprocessor register;
9. outgoing-data classification + provider retention review for live AI/external intelligence;
10. jurisdiction-specific legal review for commercial launch.

P11.9 completion does not clear these blockers.

## Replit

Replit was Git-only reconciled to the exact review merge:
- HEAD `9ed6377963d052a4beccd9a43c102dcddbd798c7`
- tree `8176334f53bb166cfbe36cc2ef3eca0d8d9c9ef0`
- origin/main exact;
- ahead/behind `0/0`;
- tracked/untracked 0;
- clean;
- Git locks 0;
- no active writer.

A first follow-up non-browser validation request bounced because the Replit Agent channel became busy and was not queued. No additional Replit test result is claimed unless a later retry completes.

## Boundaries preserved

P11.9 performed no:
- production archive/prune/delete;
- Production DB/storage read/write/DDL/DML;
- provider token revocation;
- secret rotation/deletion;
- Shopify webhook deployment;
- OAuth/provider request;
- provider-account change;
- new external collection;
- worker/scheduler activation;
- Task #51/#53/#54 execution;
- P9.8 implementation/activation;
- deployment or publication.

## Next safe boundary

P11.10 — load/scale testing for target URL/query volumes.

Generic continuation may use generated/local/synthetic data only to exercise:
- URL inventory volume;
- query volume;
- observations/evidence volume;
- workbench projection size;
- scheduler planning scale;
- memory/time/throughput budgets.

It does not authorize production crawl/load generation, provider traffic, Production DB stress tests, mutation, runtime activation, deployment or publication.

The P11.9 compliance blockers remain independently open.
