# P8.8 W09-C3F-A-F5 — Railway deployment-scoped build-input capability certification

## Result

**NATIVE DEPLOYMENT-SCOPED ARBITRARY BUILD INPUT NOT ESTABLISHED / CONTROLLED SOURCE-ARTIFACT PATH SELECTED / FAIL CLOSED FOR LIVE DEPLOYMENT.**

F5 inspected authoritative Railway documentation and the available Railway connector action schemas. No Railway state was mutated.

## Required capability

F4 needs one non-secret value — the exact canonical Git tree SHA — to reach the Docker build for exactly the deployment whose Railway Git commit and branch match the F4 attestation.

A qualifying native mechanism must be:

1. scoped to one exact deployment;
2. non-persistent after that deployment;
3. consumable during Docker build;
4. bound to the exact deployment/source revision;
5. observable without reading secrets;
6. incapable of silently carrying an old tree into a later automatic deployment.

## Authoritative surfaces inspected

### GitHub-source deployment creation

The available Railway `create_deployment` action accepts:

- project ID;
- GitHub repository;
- branch;
- optional environment ID;
- optional service name.

It creates a **new service** and triggers its first deployment. Its schema has no arbitrary build-variable, Docker build-argument, attestation, metadata, commit pin, or tree input.

It is therefore not a mechanism for supplying F4 tree identity to the existing SEO ENGINE service.

### Redeploy

The Railway `redeploy` action accepts only project, service, and environment identity. It exposes no build-input map.

### Service configuration

The Railway service-update surface controls persistent build/deploy configuration such as build command, start/pre-deploy commands, healthcheck, Dockerfile path, root directory, restart policy, cron, and watch patterns. It has no deployment-scoped arbitrary build-input field.

### Variables

Railway's variable-setting surface writes service/environment variables. Affected services redeploy unless redeploy is suppressed.

This is persistent configuration, not a deployment-local argument. It does not satisfy F5 even when the value is non-secret or later removed.

### Docker ARG

Railway documentation establishes that Railway variables can be exposed to Docker builds through matching Docker `ARG` declarations.

This proves **consumption**, not deployment-scoped delivery. The source value still comes from Railway's persistent variable/configuration model unless Railway itself provides the value as a system variable.

Railway provides deployment-scoped Git commit/branch system values for GitHub-triggered deployments, but F2/F4 found no canonical Git tree system variable.

### Config/IaC

Railway configuration-as-code can represent persistent desired state and preserved variables. A plan/apply workflow is not a one-shot arbitrary build-argument channel and remains mutation.

### CLI upload

Railway documents that `railway up` uploads the current directory. This is materially different: the uploaded source artifact itself is the deployment input.

The reviewed surfaces do not establish a CLI flag that adds an arbitrary one-shot Docker build variable to an otherwise GitHub-triggered deployment.

## Connector schema result

The currently available authoritative Railway action schemas reinforce the documentation result:

- `create_deployment`: no build-input map;
- `redeploy`: no build-input map;
- `update_service`: persistent service configuration only;
- `set_variables`: persistent service/environment variables;
- `accept_deploy`: commits staged environment changes and triggers deployment;
- no available deployment action exposes `buildArgs`, `buildVariables`, `ephemeralVariables`, attestation payload, or equivalent deployment-local arbitrary metadata.

Absence from this connector is not proof that Railway's entire private/internal API can never support such a feature. It is sufficient to conclude that no **certified supported mechanism** is currently available to this project through the reviewed authoritative public/tool surfaces.

## Rejected mechanisms

### Persistent `EXPECTED_CANONICAL_TREE`

Rejected. A later GitHub-triggered deployment can inherit a stale value.

### Set variable + deploy + remove variable

Rejected as a native ephemeral mechanism. It is a multi-mutation transaction with race, rollback, and stale-state hazards. Removing the value afterward does not make the original configuration deployment-scoped.

### Build-time GitHub API call

Rejected by F3/F4. It couples build success to network/authenticated evidence acquisition and collapses the evidence/verification boundary.

### Commit SHA as tree SHA

Rejected. Git commit and root tree are distinct Git object identities.

### Branch head as identity

Rejected. Branches are mutable.

### Railway-managed Postgres, DATABASE_URL, host parsing, logs, or secret-derived data

Unrelated to source-tree provenance and prohibited as substitutes.

## Selected fallback: controlled source-artifact deployment

Because Railway CLI upload treats the uploaded directory as the deployment source, the viable next architecture is to make the **artifact** carry verifiable source provenance rather than trying to inject the tree as an evergreen platform variable.

The artifact workflow must be designed so that the upload is produced from an exact canonical Git checkout and carries a detached, non-self-referential provenance envelope generated *outside* the Git tree after the commit is frozen.

Required binding:

`GitHub repository + commit + root tree + branch -> deterministic source artifact -> detached provenance envelope -> Railway upload/deployment identity`

The detached envelope may contain the F4 record because it is not committed back into the Git tree it attests.

The artifact must also have a deterministic content identity independent of filesystem timestamps/order or must be accompanied by a canonical manifest that deterministically binds every uploaded source path/content to the exact Git tree.

## Trust implications

A CLI upload will not automatically have the same Railway GitHub-source metadata semantics as an automatic GitHub deployment.

Therefore the existing F4 context fields named `railwayCommitSha` and `railwaySourceBranch` cannot simply be fabricated for an upload.

The controlled artifact path needs a platform/source-mode discriminator and a separate verifier context that binds:

- expected repository;
- exact GitHub commit;
- exact Git tree;
- expected branch;
- artifact/manifest identity;
- Railway project/environment/service;
- resulting deployment/snapshot identity;
- source mode = controlled artifact upload.

C2G must only receive commit/tree/branch after that source-artifact verifier passes.

## F5 verdict

Native Railway one-shot arbitrary build input: **UNAVAILABLE ON CERTIFIED SURFACES**.

Persistent-variable workaround: **REJECTED**.

Controlled source-artifact deployment: **FEASIBLE IN DESIGN, NOT YET CERTIFIED OR AUTHORIZED**.

Live deployment: **FAIL CLOSED**.

## Next milestone — F6

**W09-C3F-A-F6 — deterministic source-artifact provenance contract + pure verifier.**

F6 should remain repository-only and:

1. define a canonical source manifest for an exact Git tree;
2. define deterministic artifact identity;
3. define a detached provenance envelope containing the F4 attestation;
4. add a source-mode discriminator so GitHub-triggered and controlled-upload provenance cannot be confused;
5. define pure verification before C2G;
6. define exact Railway deployment/snapshot receipt fields required after an eventual upload;
7. define rollback/failure semantics;
8. produce a separate explicit authorization packet for the first disposable/non-production upload test.

F6 must not perform that upload.

## Hard exclusions

No Railway variable/config mutation, no deployment/redeployment/upload, no staged-patch mutation, no IaC apply, no variable values/secrets/logs/shell/Agent, no Neon, no DB/SQL, no provider/public writes, no scheduler/worker activation, no Stage 0, and no cutover.
