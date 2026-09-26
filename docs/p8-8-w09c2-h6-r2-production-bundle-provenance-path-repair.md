# P8.8 W09-C2 H6-R2 — Production bundle provenance artifact path/packaging repair

## Trigger

The authorized H6-R1 post-publication request made exactly one `GET /api/provenance` against successful Replit deployment `fbef9788-c08d-475d-a85d-88ede16e92c7`. The route returned HTTP 503 with `result=fail_closed`, `code=artifact_unavailable`, and the expected H6-R1 attestation version. No retry was made.

## Root cause

The API build uses esbuild with `bundle: true` and emits the serving entry as `dist/index.mjs`. Code bundled into that entry observes `import.meta.url` as the bundle URL.

H6-R1 resolved its artifact by taking the module directory and applying `../../dist/build-provenance.json`. That is correct when the module URL is the source location under `src/lib`, but incorrect after bundling: from `dist/index.mjs` it escapes the API package before re-entering a different `dist` path.

The generated provenance artifact is actually a sibling of the production bundle: `dist/build-provenance.json`.

## Repair contract

H6-R2 accepts only two deterministic package-owned layouts:

1. Source/test module: `.../src/lib/<module>` resolves to `.../dist/build-provenance.json`.
2. Production bundle: `.../dist/index.mjs` resolves to the sibling `.../dist/build-provenance.json`.

Any other module layout throws and the serving loader maps path-resolution/read failure to the existing fail-closed `artifact_unavailable` response.

There is no fallback to cwd, environment variables, Git, historical deployment data, Railway, UGP, arbitrary paths, or caller input.

## Regression evidence

The tests retain valid/missing/malformed/fingerprint-invalid artifact coverage and add:

- deterministic source-layout resolution;
- deterministic Production `dist/index.mjs` resolution;
- rejection of unknown module layouts;
- an executable esbuild regression that bundles the real loader to a temporary `dist/index.mjs`, imports that generated bundle, and verifies that its default `import.meta.url` resolves the sibling `build-provenance.json`.

The executable bundle test reproduces the semantic boundary that H6-R1 did not test.

## Security and authority boundaries

The public route, response allowlist, W09-C2F parser, fingerprint validation, and attestation version remain unchanged. H6-R2 grants no runtime authority.

This work performs no Replit synchronization/build/run/restart/deployment/publication, no H6 retry, no Production DB/SQL/catalog/migration/DATABASE_URL access, no provider/public-site action, no persistence, no scheduler/worker activation, no credentials/config/gate changes, no Railway mutation, and no UGP work.

After merge, any Replit source sync, provenance build, publication, and H6 attestation remain separately authorized gates.
