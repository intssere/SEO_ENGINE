# P8.8 W09-C3F-A-F9 — Railway controlled-upload receipt/transport evidence contract

## Result

**RAILWAY CLI TRANSPORT SEMANTICS CERTIFIED / DEPLOYMENT+SNAPSHOT RECEIPT AVAILABLE / EXACT UPLOADED-ARTIFACT RECEIPT NOT ESTABLISHED / FAIL CLOSED.**

F9 is repository/research-only. No `railway up`, deployment, configuration, variable, staged-patch, database, Neon, provider, or public-site operation was executed.

## Authoritative Railway documentation findings

Railway's current CLI documentation states that `railway up [PATH]` uploads and deploys the project from the current directory/path. The command compresses and uploads the selected directory.

Documented file-selection behavior is identity-relevant:

- `.gitignore` is respected by default;
- `.railwayignore` is respected;
- `.git` and `node_modules` are ignored;
- `--no-gitignore` disables `.gitignore` filtering;
- `--path-as-root` makes the supplied path the archive root;
- `--service`, `--environment`, and `--project` select the target;
- `--detach` returns once the build is queued;
- `--json` provides machine-readable CLI output.

Therefore a future F8-controlled invocation must explicitly account for ignore semantics. A verified staging inventory cannot be assumed to equal uploaded source merely because it existed before invocation.

## Available Railway control-plane receipt

The currently available Railway deployment listing exposes:

- deployment ID;
- status;
- created/updated timestamps;
- service ID;
- environment ID;
- URL when present;
- snapshot ID when present;
- limited metadata such as reason, commit message/hash, branch, or image.

This is sufficient to bind a resulting deployment to a Railway service/environment and snapshot identifier.

It is **not** sufficient to prove the exact uploaded source bytes because the available receipt does not expose an authoritative uploaded-archive SHA-256, source manifest, file inventory, F7 artifact digest, or F8 inventory digest.

Build/deploy logs are operational evidence, not an exact source archive receipt unless Railway emits a documented authoritative digest there. F9 does not assume such a digest.

## F9 evidence model

The pure verifier accepts a pre-upload transport intent containing the certified F6/F7/F8 identities and target IDs, plus a sanitized post-upload Railway deployment/snapshot receipt.

Even when the target IDs match and deployment/snapshot IDs are present, the verifier deliberately returns:

`artifact_receipt_unproved`.

This prevents deployment success, snapshot existence, matching service IDs, or a user-supplied digest from being upgraded into proof Railway received the exact certified artifact.

Unknown receipt fields and credential-shaped material fail closed.

## Why no PASS branch exists yet

A PASS result would require a Railway-authoritative post-upload field that cryptographically or structurally binds the deployment/snapshot to the exact uploaded source artifact or a manifest that can be reconciled exactly to F8.

No such field has been established in the documented CLI output or currently available Railway deployment receipt surfaces.

Adding an `artifactSha256` field supplied by our own runner would only prove what we intended to upload, not what Railway received. F9 therefore refuses that shortcut.

## Minimum evidence that could unlock the live disposable upload

At least one of these must be established before treating a one-shot upload as provenance-complete:

1. Railway returns a documented cryptographic digest of the uploaded source archive with exact archive canonicalization known and reproducible; or
2. Railway returns an authoritative uploaded-source manifest/file inventory that exactly reconciles to F8; or
3. Railway exposes a documented immutable source-artifact resource ID plus a read-only API that returns digest/manifest evidence for that resource.

Deployment ID + snapshot ID alone remains useful operational evidence but is insufficient for artifact provenance.

## Future disposable observation boundary

A future explicit live authorization may be useful only if its purpose is **bounded capability discovery**, not certification by assumption. It would need:

- a proven disposable/non-production target;
- exact F4/F6/F7/F8 identities;
- exactly one controlled upload maximum;
- explicit ignore/path flags;
- read-only capture of machine-readable CLI result, deployment list, snapshot ID, and bounded build metadata;
- zero persistent config/variables/staged-patch changes;
- zero DB/Neon/provider/public-site operations;
- no retry;
- no cleanup unless separately authorized.

If no authoritative artifact receipt appears, the result must remain FAIL CLOSED.

## F9 verdict

Railway CLI input semantics: **DOCUMENTED**.

Deployment/snapshot target receipt: **AVAILABLE**.

Exact uploaded artifact receipt: **NOT ESTABLISHED**.

F7/F8 -> Railway deployment provenance: **UNPROVED / FAIL CLOSED**.

Live upload authorization: **NOT GRANTED BY F9**.

## Next milestone — F10

**W09-C3F-A-F10 — Railway upload-artifact receipt capability acquisition/review.**

F10 should first pursue authoritative Railway documentation/API/CLI/source evidence for an uploaded-source digest or manifest. Only if that establishes a safe observable receipt should a separate one-shot disposable upload authorization packet be proposed.

## Hard exclusions

No Railway upload/deploy/redeploy/config/variables/staged-patch/IaC mutation; no Neon/DB/SQL; no provider/public writes; no scheduler/worker activation; no Stage 0; no cutover.
