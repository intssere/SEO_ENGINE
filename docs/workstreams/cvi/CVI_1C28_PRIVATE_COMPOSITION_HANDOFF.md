# CVI-1C.28 — Private Authorization Composition

Predecessor: PR #1029 at 5d56c42c23b775a541d3a6122295071bd02228e7 (full CI success).

Goal: certify real PostgreSQL-backed private CVI scope and historical readback composition using strictly disposable test data.

Safety: no live Google calls, no production database migration, no public endpoint, no publishing, no merge or deployment.

Test cases: valid synthetic session, active organization membership and site read grant, connected read-only Google connection, matching immutable acquisition lineage; deny revoked memberships, grants, sessions, inactive sites, wrong scopes and mismatched subjects. Success remains untrusted historical review only.

Certification pending. This document alone is not proof of implemented tests.

## Exact-head CI certification
- PR: #1035 (draft, unmerged)
- HEAD: `c33b5208e54efd12eea66d3b10eba293a20a755d`
- Proof branch: `ugp-cvi-1b4e-ci-proof-20261010-ag`
- Workflow: https://github.com/intssere/SEO_ENGINE/actions/runs/38046857836 — completed SUCCESS
- Job: `114198025660` — completed SUCCESS; zero failed steps
- Certification scope: isolated, synthetic private PostgreSQL composition only. Not a production deployment, provider provenance, factual-evidence attestation, or authorization for execution or publishing.
- Next bounded increment: CVI-1C.29 — evaluate runtime private composition trust-boundary hardening and session-versus-permission revocation race cases, based on live source audit.
