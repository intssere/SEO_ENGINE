# Task #16 — Verification + Rollback v1

## Purpose
Verify deployed SEO changes against the exact expected state and prepare deterministic rollback records from captured pre-change state.

## Verification
- compares only fields present in `expectedState`
- ignores unrelated additional fields in the observed state
- produces stable mismatch paths
- returns `verified`, `failed`, or `regressed`
- regression means an expected field differs from both the intended value and a captured baseline value
- results include deterministic SHA-256 dedupe keys

## Rollback planning
- rollback state must come from a captured pre-change snapshot
- empty pre-change state fails closed
- rollback plans remain `pending`
- rollback records preserve target/action provenance and deterministic dedupe keys
- verification failure can recommend rollback but does not execute rollback

## Execution safety
Rollback execution is not implemented by this package. Any later executor must pass the same fail-closed controls used for public writes:
1. environment `PUBLIC_SITE_WRITES_ENABLED=true`
2. explicit runtime write enablement
3. explicit rollback connector enablement
4. approval when policy requires it

The repository/runtime default remains `PUBLIC_SITE_WRITES_ENABLED=false`.

## Deliberate V1 boundary
This package does not perform Shopify mutations, re-crawls, network requests, or automatic rollback execution. Actual-state acquisition is supplied by the caller so verification stays provider-neutral and testable.
