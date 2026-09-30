# UGP-4.8 — Connector-plane exit certification

## Status

**EXIT CERTIFICATION CANDIDATE — MERGE PENDING EXPLICIT AUTHORIZATION**

UGP-4.8 certifies the UGP-4 connector plane from already merged/durable repository evidence. It performs no live provider call and grants no new execution authority.

## Certification baseline

- Initiative baseline: `f251f6412689b7f5d056a26a739c870e91149992`
- UGP-4.7 merge PR: #669
- UGP-4.7 merge commit: `f251f6412689b7f5d056a26a739c870e91149992`
- Exit verifier version: `ugp-4-8-connector-plane-exit-v1`

The UGP-4.7 evidence document itself was authored before PR #669 merged, so its internal status line records the pre-merge candidate state. Its blob is now present on the merged initiative baseline above; UGP-4.8 binds that exact merged blob identity rather than rewriting the historical evidence record.

## Exact evidence bindings

### Controlled connector contracts

- UGP-4.1 MCP contract blob: `d97d65e61b43fff4fb1b465133776a65537c9db6`
- UGP-4.2 OpenAPI contract blob: `54476ab51a8c9184170f86125e95c57c3890743a`
- UGP-4.3 controlled Git contract blob: `e7db6a52919e89d7457673ef494cfaee180df133`
- UGP-4.4 Future Site Agent specification blob: `32b53b8f88375fc6bb66093934e5f3243c7c6355`

### Non-Shopify CMS certification

- WordPress live read-only evidence blob: `971b58464e4f0a7ba7e8bb3bb1d7956959e49ef3`
- Webflow live read-only evidence blob: `3426f2586ca2a77cb1c188c13ffc36c976f0610a`

WordPress and Webflow are independently certified through bounded read-only provider paths and deterministic offline receipt attestation. Their certification does not authorize provider writes.

### Git-backed custom-site certification

- UGP-4.7 durable Git evidence blob: `15841d3965f3f8f54e09bd76ec1a2b6057593bd6`
- Historical fixture PR: #656
- Historical exact fixture/CI head: `438aa79caaeb2b07d38400749b36a500c6695aef`
- PR #656 remains intentionally unmerged.
- UGP-4.7 plan fingerprint: `f56ff7494164b03f209708d65eb781632568591aea03d314e3591b4345b7ba3f`
- UGP-4.7 receipt fingerprint: `de15e9fa35839d46dd16179144aae568760beabadeed71012d00cf653e76a165`

The certified Git path is exact immutable read -> deterministic create/update identity -> non-default branch/commit -> PR -> exact-head CI/status observation. Direct default-branch writes are not certified.

### Shopify regression safety

- Shopify compatibility adapter blob: `1a79d4ed0c7d1995e21cc8a05e756031fcad6c49`
- Shopify compatibility regression-test blob: `7043cb242b3af1ea965b4cbea86252bac13a81a4`

The compatibility adapter remains compatibility-only and explicitly asserts:

- `grantsExecutionAuthorization=false`
- `grantsProviderWrite=false`
- `grantsPublicSiteWrite=false`
- `producesUniversalExecuteRequest=false`
- `preservesExistingShopifyGates=true`

Existing Shopify policy/preflight/verification/rollback gates therefore remain authoritative.

## UGP-4 exit criteria

The roadmap requires:

1. at least WordPress plus one additional non-Shopify CMS certified through common contracts;
2. Git-backed custom-site read/PR path certified;
3. Shopify remains regression-safe;
4. no connector can bypass SEO ENGINE authorization.

The deterministic UGP-4.8 verifier binds the exact evidence above and fails closed if any of these conditions is false.

### Criterion 1 — PASS

WordPress plus Webflow provide two independently certified non-Shopify CMS read-only paths.

### Criterion 2 — PASS

UGP-4.7 provides a certified Git-backed custom-site read/branch/commit/PR/exact-head-CI path with no direct default-branch write.

### Criterion 3 — PASS

The current Shopify universal compatibility adapter preserves existing gates and grants no new execution/provider/public-site authority.

### Criterion 4 — PASS

The certified connector contracts retain deny-by-default authority boundaries:

- MCP arbitrary tool execution: false;
- OpenAPI operation existence grants authorization: false;
- Git direct default-branch write: false;
- Future Site Agent runtime enabled: false;
- Shopify universal adapter grants execution/provider/public-site authority: false.

## Safety boundary

UGP-4.8 is an offline repository certification only:

- network calls: false;
- credentials: false;
- provider writes: false;
- public-site writes: false;
- database/schema mutation: false;
- scheduler/worker activation: false;
- deployment: false;
- publication: false;
- grants authorization: false.

No new WordPress, Webflow, Shopify, GitHub fixture, MCP, OpenAPI, or Site Agent operation is required for this exit certification.

## Exit conclusion

Subject to successful exact-head CI and explicit merge authorization for the UGP-4.8 PR, the **UGP-4 Universal Connector Plane exit criteria are satisfied**.

After that merge and post-merge verification, UGP-4 may be marked COMPLETE and the initiative may proceed to **UGP-5 — Connection broker and multi-site connection UX**.
