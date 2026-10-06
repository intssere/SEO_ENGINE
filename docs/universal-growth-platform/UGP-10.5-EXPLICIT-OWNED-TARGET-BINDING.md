# UGP-10.5 — Explicit Verified Owned-Target Binding

Version: `ugp-10-5-owned-target-binding-v1`

## Purpose

UGP-10.5 resolves the bounded `target_binding_required` state introduced by UGP-10.4.

It does not choose a target page automatically.

Instead, it allows an explicit human selection to bind one already-approved outreach prospect to one verified owned resource identity whose canonical URL belongs to the exact target site.

This stage still does not generate outreach prose, discover contacts, or send anything.

## Why the first-party crawl snapshot alone is insufficient

The repository's completed first-party crawl snapshot is authoritative for whole-site inventory and aggregate crawl accounting.

However, the persisted final checkpoint stores aggregate counters rather than durable per-URL terminal outcome identity.

A whole-site certified snapshot may therefore contain a mixture of:

- successful fetches;
- redirects;
- noindex pages;
- robots-excluded URLs.

The snapshot cannot by itself prove that a particular inventory URL was the successful canonical page intended for outreach.

UGP-10.5 therefore does not infer a target from crawl inventory.

## Authoritative target source

UGP-10.5 reuses the existing Universal Site & Resource Identity contract.

A candidate target must be a valid `UniversalResourceIdentity` with:

- a valid resource locator;
- exact resource identity fingerprint;
- exact resource state fingerprint;
- canonical observed timestamp;
- provider identity;
- targetable resource kind;
- non-null canonical URL.

The resource identity is rebuilt and integrity-checked before use.

## Targetable resource kinds

The bounded target set is:

- `homepage`;
- `page`;
- `product`;
- `collection`;
- `category`;
- `article`;
- `blog_post`;
- `landing_page`.

The following resource kinds are not valid outreach destinations:

- templates;
- navigation;
- media;
- structured data;
- source files;
- `other`.

## Exact same-site URL rule

A selected canonical URL must:

- use HTTPS;
- contain no credentials;
- contain no query string;
- contain no fragment;
- have a hostname exactly equal to the qualification target domain.

A resource from another site cannot be bound even if a human supplies its fingerprint.

## Explicit human binding input

Each missing-target binding requires:

- exact UGP-10.4 `preparationFingerprint`;
- exact prospect fingerprint;
- exact verified resource identity fingerprint;
- binder identity;
- canonical binding timestamp.

The binding timestamp may not precede the resource observation timestamp.

Only one binding may exist for a prospect in one deterministic projection.

## No rebinding of existing targets

If UGP-10.4 already has an evidence-bound target and produces `draft_brief_ready`, UGP-10.5 preserves that target unchanged.

It rejects an attempt to replace that target through the UGP-10.5 binding input.

This prevents the target-binding stage from silently overriding evidence already carried by the opportunity.

## Output states

| UGP-10.4 state | Binding supplied | UGP-10.5 state |
| --- | --- | --- |
| `draft_brief_ready` | not applicable | `draft_brief_ready_existing_target` |
| `target_binding_required` | no | `target_binding_required` |
| `target_binding_required` | valid explicit binding | `draft_brief_ready_bound_target` |
| `human_review_required` | not permitted | `human_review_required` |
| `rejected` | not permitted | `rejected` |
| `deferred` | not permitted | `deferred` |
| `qualification_blocked` | not permitted | `qualification_blocked` |

## Immutable binding lineage

A successful bound-target record contains exact:

- UGP-10.5 version;
- UGP-10.4 version;
- UGP-10.4 preparation fingerprint;
- workspace fingerprint;
- workspace item fingerprint;
- qualification fingerprint;
- prospect fingerprint;
- opportunity fingerprint;
- resource identity fingerprint;
- resource locator fingerprint;
- resource state fingerprint;
- resource observation timestamp;
- provider;
- resource kind;
- canonical target URL;
- binder identity;
- binding timestamp.

It receives deterministic:

- `bindingFingerprint`;
- `bindingId`.

The complete projection receives a deterministic:

- `projectionFingerprint`.

## Safety semantics

UGP-10.5 explicitly guarantees:

- deterministic: true;
- evidence bound: true;
- explicit human selection required for a missing target;
- verified owned resource required;
- automatic target selection: false;
- contact discovery authorized/performed: false;
- outreach draft-text generation authorized/performed: false;
- outreach sending authorized/performed: false;
- model calls: false;
- provider calls: false;
- network operations: false;
- persistence: false;
- scheduler enabled: false;
- worker enabled: false;
- provider writes: false;
- public-site writes: false;
- link-scheme automation authorized: false.

## Explicitly out of scope

UGP-10.5 does not add:

- a database migration;
- persistent target-binding storage;
- a target-binding mutation endpoint;
- an automatic page recommender;
- semantic page ranking;
- a model call;
- generated subject lines;
- generated outreach bodies;
- contact/person/email discovery;
- email verification;
- mailbox access;
- sending;
- follow-up scheduling;
- provider HTTP;
- credentials;
- scheduler or worker activation;
- Railway or production changes.

## Regression coverage

The contract tests verify:

1. an approved missing-target prospect remains blocked without explicit binding;
2. a verified same-site resource can be explicitly bound;
3. an existing evidence-bound target cannot be replaced;
4. a cross-site resource is rejected;
5. a stale UGP-10.4 preparation fingerprint is rejected;
6. a binding timestamp cannot precede the resource observation;
7. contact discovery, drafting, sending, persistence and network authorization remain false;
8. identical evidence and binding inputs produce identical fingerprints;
9. tampering is detected by integrity reconstruction.

## Next bounded increment

After UGP-10.5, a later UGP-10 stage may consume either:

- `draft_brief_ready_existing_target`; or
- `draft_brief_ready_bound_target`;

to construct a bounded draft-text generation request.

That future stage must remain separately authorized and must still not imply contact discovery or sending.
