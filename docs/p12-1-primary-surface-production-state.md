# P12.1 — primary-surface production-state audit and remediation

## Scope

P12.1 is the first bounded engineering task in final production certification.

Its purpose is narrow:

> Every **primary navigation** destination must be a deliberate v1 operational surface. Placeholder-only, planned-only, and synthetic-fixture-only engineering screens must not be presented as primary production product surfaces.

This milestone does not delete engineering work and does not activate any provider or production runtime.

## Audit result

The primary navigation previously exposed eight routes that are not production-bound.

### Informational/placeholder-only

- `/rankings`
- `/internal-links`
- `/experiments`
- `/learning`

The first three render `InformationalPage` with explicit unavailable state. Learning renders `InformationalPage` with `coming_soon`, and its navigation entry was additionally marked `status: "planned"`.

### Synthetic/read-only engineering fixtures

- `/search-intelligence`
- `/ai-visibility`
- `/impact`
- `/reports`

These workspaces are valuable engineering/certification surfaces and are already visibly labeled as synthetic/read-only. However, they do not have production-bound loaders and therefore are not primary production surfaces yet.

## Remediation

All eight routes remain mounted in `App.tsx`.

They continue to receive:
- P11.5 WCAG/accessibility route certification;
- P11.6 route-wide responsive/product-polish certification;
- focused engineering browser tests where applicable.

They are removed only from `navigation.json`, so they are no longer exposed through desktop/mobile primary navigation.

Primary navigation now contains only:

### Command Center
- Overview

### Discover
- Opportunities

### Audit
- Technical SEO

### Execute
- Governance
- Actions
- Approvals
- Deployments

### Measure
- Performance

### System
- Connections
- Settings

## Why routes remain mounted

P12.1 is a product-surface certification, not a deletion milestone.

Keeping the routes mounted preserves:
- engineering evidence;
- deterministic synthetic workspaces;
- accessibility/responsive regression coverage;
- future production binding work;
- direct/internal testing.

A future milestone may return one of these routes to primary navigation only after its production-state contract is deliberately upgraded.

## Production-surface contract

`src/production-surface-contract.test.mjs` locks:

- no `status: "planned"` primary nav item;
- no engineering-only route in primary navigation;
- all engineering-only routes still mounted;
- informational pages explicitly refuse fake generated metrics;
- synthetic workspaces remain visibly disclosed;
- primary routes remain a strict subset of mounted routes.

The navigation contract separately distinguishes:
- primary operational routes;
- engineering-only mounted routes.

## Browser proof

The critical-path suite verifies:

1. the desktop primary nav exposes the operational route set;
2. engineering-only links are absent;
3. direct navigation to `/search-intelligence` still succeeds;
4. the workspace still visibly says `SYNTHETIC READ-ONLY`;
5. no new provider/external request is made.

## Safety boundary

P12.1 performs no:

- provider/OAuth activity;
- production crawl;
- Production DB/storage mutation;
- evidence persistence activation;
- provider/public-site mutation;
- scheduler/worker activation;
- autonomous mutation;
- credential/secret change;
- retention/deletion execution;
- deployment or publication.

## Completion meaning

P12.1 completion means:

> the engineering source has no placeholder-only or fixture-only **primary navigation** screen, and engineering-only surfaces cannot masquerade as normal primary product navigation.

It does **not** mean those hidden engineering routes are production-ready, and it does not complete P12.2–P12.10.

## Next boundary

After P12.1 certification, the next roadmap work is constrained by live-proof dependencies:

- P12.2 requires authorized real full-site crawl proof;
- P12.3 requires live first-party provider activation;
- P12.4 requires live external-intelligence activation.

No live step is authorized by P12.1.
