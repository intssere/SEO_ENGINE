# CVI-1C.28 — Private Authorization Composition

Predecessor: PR #1029 at 5d56c42c23b775a541d3a6122295071bd02228e7 (full CI success).

Goal: certify real PostgreSQL-backed private CVI scope and historical readback composition using strictly disposable test data.

Safety: no live Google calls, no production database migration, no public endpoint, no publishing, no merge or deployment.

Test cases: valid synthetic session, active organization membership and site read grant, connected read-only Google connection, matching immutable acquisition lineage; deny revoked memberships, grants, sessions, inactive sites, wrong scopes and mismatched subjects. Success remains untrusted historical review only.

Certification pending. This document alone is not proof of implemented tests.
