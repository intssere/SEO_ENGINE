# P8.8 W09-C3F-A-F21 — staged AUTH_PUBLIC_ORIGIN disposition review

## Verdict

**PATCH DISPOSITION: BLOCKED / FAIL-CLOSED.**

F21 is a repository/read-only review. It performs no Railway mutation.

## Canonical baseline

- repository: `intssere/SEO_ENGINE`
- main: `eca49f4096e82a2f15d8dc2f6871be878e9b8705`

## Production target

- project: `52265e29-921b-4652-ac0d-9da4e5e69936`
- environment: `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`
- service: `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90`
- service name: `seo-engine-shadow`
- Railway public origin: `https://seo-engine-shadow-production.up.railway.app`
- GitHub autodeploy: disabled

## Existing staged patch

Patch:

`5d9ed802-32c2-4d0a-ac8a-b45a010ca535`

Railway exposes:
- patch status: `STAGED`;
- a service `resource.update`;
- a staged `AUTH_PUBLIC_ORIGIN` variable change.

The available Railway read APIs do **not** expose:
- the exact effective `resource.update` diff;
- the current deployed `AUTH_PUBLIC_ORIGIN` value;
- the staged target `AUTH_PUBLIC_ORIGIN` value.

Those values are redacted or unavailable through the current API/MCP surface.

## Operational semantics

The read-only review established:
- applying the staged patch would trigger a new deployment/restart;
- discarding the staged patch would remove the pending changes while leaving the currently deployed runtime unchanged;
- the staged auth-origin change can materially affect OAuth callback/origin validation;
- the exact staged value cannot currently be certified against the Railway public origin or Google OAuth registration.

## Why neither apply nor discard is authorized

Applying is not justified because the exact staged value is not visible.

Discarding is also not justified because F21 cannot prove whether the staged value represents a necessary auth correction.

Therefore F21 deliberately makes no disposition choice.

Current deterministic result:

`blocked_value_unverified`

Blockers:
- `staged_auth_public_origin_value_not_visible`
- `exact_resource_update_diff_not_visible`

## Evidence required before a live disposition

A future live apply/discard authorization packet must be based on operator-visible Railway dashboard evidence proving:
1. the exact staged `AUTH_PUBLIC_ORIGIN` value;
2. the exact service resource diff in the staged change;
3. whether the staged origin equals `https://seo-engine-shadow-production.up.railway.app`;
4. whether the Google OAuth authorized redirect URI corresponds to:
   `https://seo-engine-shadow-production.up.railway.app/api/auth/google/callback`;
5. whether applying or discarding is the intended single-purpose action.

No secret values need to be committed to the repository. The repository should retain only the verified equality/inequality result and provenance of the operator confirmation.

## Hard exclusions

F21 authorizes none of:
- patch apply;
- patch discard;
- source/image mutation;
- deploy/redeploy/restart;
- variable mutation;
- domain mutation;
- Postgres/volume mutation;
- Neon or Production DB access;
- provider/public-site calls or writes;
- scheduler/worker activation;
- Production cutover.

## Next boundary

After F21 is CI-clean and separately merged, the next step is an operator-visible dashboard verification of the exact staged Railway change. Only after that evidence exists may a separate bounded patch-disposition authorization be defined.
