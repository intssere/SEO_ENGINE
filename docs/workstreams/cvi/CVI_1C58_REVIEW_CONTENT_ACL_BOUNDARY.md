# CVI-1C.58 — Review-Content ACL Boundary Regression

## Scope
Extends the already isolated CVI-1C.28 disposable PostgreSQL private-composition test, not runtime or production bootstrap. In a synthetic active grant, changes permission from `read_evidence` to `review_content`, verifies that private evidence readback denies, then revokes the content review grant, verifies denial, restores the synthetic `read_evidence` grant and verifies historical review-only admission resumes.

## Source-backed permission boundary
The dormant `0012_cvi_tenant_site_acl_draft.sql` migration enumerates `review_content` and `read_evidence` as separate permissions. This regression specifically verifies a `review_content` grant does **not** accidentally substitute for `read_evidence` in the existing private evidence-composition code. It does **not** establish an API or permission to mutate drafts; `edit_draft` does not exist in this schema. The historical composition continues to report no execution, publication, or future tenant authorization.

## Isolation and proof
The existing `.github/workflows/ci.yml` proof-branch step creates the disposable localhost database, applies dormant migrations only inside that step, runs `cvi-gsc-private-composition.ephemeral.test.ts`, and drops the database. The addition restores the synthetic grant to its initial state to preserve subsequent regression tests. Full exact-head CI pending.

## Restrictions
No production database, schema activation, provider/network execution, CMS publication, runtime handler changes, merge or deployment.

## Implementation certification receipt
Exact implementation HEAD `a5c5da20569ff1a9b9dab857a55fa624908c691e` passed the complete 36-step GitHub Actions workflow https://github.com/intssere/SEO_ENGINE/actions/runs/38150922984 without failures. The documentation-inclusive successor commit requires a separate exact-head proof CI. No runtime activation, merge, or deployment.
