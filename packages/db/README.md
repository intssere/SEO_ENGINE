# SEO ENGINE Database

This package defines the portable PostgreSQL data contract for SEO ENGINE.

## V1 invariants

- PostgreSQL is the system of record.
- Customer secrets are never stored in database connection rows; `secret_ref` points to an external secret store/runtime secret.
- Page snapshots, search metrics, evidence, policy versions, AI responses, outcomes, and learning signals are historical observations and should be treated as append-oriented data.
- Every customer-owned record is scoped through a site and organization boundary.
- Public website writes are not enabled by this package.
- Action plans must carry a `risk_level` of `auto`, `approval`, or `blocked` before any future deployment path may execute them.
- Deployments and rollbacks are first-class records so write actions remain auditable and reversible.
- AI visibility observations preserve provider, model family, and model version to avoid invalid longitudinal comparisons across model changes.
- Policy sources and versions preserve provenance so inferred rules can be traced back to evidence.

## Migration policy

`migrations/0001_core.sql` is the immutable V1 baseline. Future schema changes must be added as new ordered migrations rather than editing an already-released migration after it reaches `main`.
