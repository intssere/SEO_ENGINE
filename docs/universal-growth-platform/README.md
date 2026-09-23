# Universal Growth Platform Initiative

**Branch:** `initiative-universal-growth-platform`  
**Base main SHA:** `2c31f3e4a355ac1bb2715f201a5dc2148a3b99f7`  
**Status:** isolated initiative — not part of canonical `main` until final integration certification and explicit merge authorization.

## Purpose

This initiative evolves SEO ENGINE from a Shopify-centered governed SEO control plane into a universal website growth platform that can:

1. analyze virtually any public website;
2. connect to multiple CMS/API/Git environments through a common connector contract;
3. research, plan, draft, verify, publish and refresh evidence-backed content;
4. perform backlink/authority intelligence, prospect discovery and governed outreach;
5. expose the system through a customer-friendly UX that hides engineering internals by default;
6. preserve SEO ENGINE's existing evidence, authorization, verification, rollback and impact-measurement guarantees.

This is an additive product program. It does not replace the current P1–P12 program and must not weaken its safety invariants.

## Isolation contract

Work on this initiative remains isolated on this branch until the initiative exit gates in `ROADMAP.md` are met.

While isolated:

- canonical `main` continues independently;
- no initiative work is assumed deployed or published;
- no production DB migration is authorized;
- no provider/public-site mutation is authorized;
- no credential/scope expansion is authorized;
- no autonomous scheduler/worker activation is authorized;
- no current P8/P9/P12 safety boundary is weakened or bypassed;
- existing Shopify execution paths remain authoritative for current production behavior;
- reusable code must remain default-off until an initiative work package explicitly certifies it.

The initiative branch should periodically incorporate current `main` after a conflict review so it does not drift from the canonical application.

## Documents

- `ARCHITECTURE.md` — target system architecture and product boundaries.
- `ROADMAP.md` — phased execution plan, dependencies, work-package IDs and merge gates.

## Product domains

The target customer-facing product is organized around:

- Home
- Opportunities
- Content
- Site Audit
- Authority
- Automation
- Performance
- Settings

Engineering concepts such as policy fingerprints, reservation identities, proposal lineage and execution envelopes remain available in advanced/evidence views but are not primary customer navigation concepts.

## Merge philosophy

The initiative should not be merged because a prototype works. Final integration requires:

- connector-neutral core contracts;
- compatibility with current Shopify behavior;
- full relevant tests and CI;
- production-quality UX;
- security and licensing review for every adopted dependency;
- default-off runtime posture for unactivated providers;
- no regression to current evidence, authorization, verification, rollback or audit semantics;
- documented migration path;
- explicit merge authorization.

Until then, this branch is a parallel product-development line only.
