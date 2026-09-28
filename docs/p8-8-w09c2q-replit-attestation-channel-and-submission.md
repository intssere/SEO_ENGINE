# P8.8 W09-C2Q — Replit attestation channel research and submission authorization packet

Status: DESIGN/RESEARCH ONLY — NO EXTERNAL REQUEST SUBMITTED
Canonical base: be8d25d5778174d5d022a102336cdf06e4704eb1
Parent: W09-C2P
Tracking issue: #622

## 1. Objective

Determine whether current official Replit material documents a qualifying authoritative, secret-suppressing mechanism that can attest the Production database resource actually bound to an exact successful deployment. If not, freeze the exact support request and acceptance gate needed to ask Replit without weakening W09-C2K/C2M/C2N.

This milestone does not authorize contacting Replit, reading Secrets or DATABASE_URL, inspecting Production environment variables, parsing a connection string, querying Neon candidate resources, opening a database session, executing SQL, deploying, changing configuration, migrating, or activating Stage 0/provider/autonomous execution.

## 2. Current official evidence reviewed

### 2.1 Replit Production database architecture

Replit's December 2025 engineering article, "Building production-ready Apps with Automated Database Migrations on Replit", states that Replit introduced a separate Production database for every deployment and that Replit uses Neon for Production databases. It also describes deployment-time schema comparison/migration and temporary Neon branches for migration testing.

This establishes platform architecture. It does NOT establish which Neon project/branch/database/endpoint/timeline is bound to our exact deployment and therefore cannot satisfy W09-C2N provenance by itself.

Source:
https://replit.com/blog/production-databases-automated-migrations

### 2.2 Deployment isolation

Replit's deployment documentation/blog describes development and Production as separate environments and deployments as explicit Production releases. Historical deployment material also documents deployment-specific properties such as secrets and build history.

These sources establish deployment isolation concepts, not an authoritative sanitized deployment→database resource identity response.

Sources:
https://replit.com/blog/deployments-launch
https://replit.com/blog/introducing-deployment-rollbacks

### 2.3 Current support route

Replit's current pricing/support page states that support is available by signing in to Replit and using the '?' control in the top-right; Pro advertises Premium Support. This is the currently identified official escalation route for the capability question.

Source:
https://replit.com/pricing

## 3. Research result

Result: NO PUBLICLY DOCUMENTED QUALIFYING PRODUCER FOUND.

The reviewed official material establishes:
- Production/development database separation;
- Neon as underlying Production database infrastructure;
- deployment isolation and deployment-specific configuration concepts;
- an authenticated Replit support route.

The reviewed official material does not document a public structured API/control-plane operation, supported integration, or signed immutable deployment manifest that returns the W09-C2N sanitized identity while proving exact deployment→database binding association.

Therefore:
- no live C2N provenance authority is approved;
- Side R remains UNPROVED;
- architectural statements about Neon MUST NOT be substituted for exact binding evidence;
- DATABASE_URL/Secrets remain forbidden as an identity derivation path;
- Neon resource existence remains insufficient without authoritative Replit-side association;
- W09-C2J/C2I and W09-C2H remain blocked.

## 4. Exact support request

Target channel: authenticated Replit in-product support ('?' → help/support). Premium Support may be available according to plan.

Subject:
Authoritative non-secret deployment-to-production-database binding attestation

Message:

We need a read-only, authoritative way to attest which Production database resource is actually bound to a specific successful Replit deployment, without retrieving or inspecting DATABASE_URL, Secrets, or any credential.

Given a Replit application/repl ID and an exact successful deployment ID, can Replit expose a structured control-plane API, supported integration, or Replit-signed deployment manifest that returns only non-secret binding identity such as:

- deployment ID and status;
- binding revision/association ID;
- database provider;
- provider project/resource ID;
- branch ID;
- database name;
- endpoint/compute ID;
- lineage/timeline ID, or an equivalent immutable continuity identifier;
- observation timestamp.

The identity must be resolved by Replit from the deployment's authoritative binding metadata rather than supplied by the application or operator. Missing or ambiguous binding data must fail closed rather than returning a connection string or inferred identity.

Please provide:
1. the official capability/API/integration name and documentation;
2. authentication/scopes required;
3. exact response fields;
4. whether the operation can ever return credentials or secret-bearing environment values;
5. how deployment ID, binding revision, and database resource identity are associated;
6. whether the binding revision changes when the bound Production database resource changes;
7. freshness/observation semantics;
8. behavior for NOT_BOUND, AMBIGUOUS, UNAVAILABLE, UNSUPPORTED, and DEPLOYMENT_NOT_FOUND;
9. if lineage/timeline is not exposed, the immutable resource/binding identifier that proves continuity across endpoint rotation.

We specifically cannot use an approach that returns DATABASE_URL or another credential and asks the caller to parse, redact, hash, fingerprint, or otherwise derive identity from it.

## 5. Information that may accompany the request

The request may identify:
- the exact Replit app/repl ID;
- the exact current successful deployment ID;
- the public deployment URL;
- the requested sanitized schema and governance requirements.

The request MUST NOT include:
- DATABASE_URL;
- any connection string;
- username/password;
- token/API key;
- Secrets contents;
- arbitrary environment maps;
- credential-bearing hostnames copied from a secret;
- hashes/fingerprints/encodings/derivatives of credential material;
- manually asserted Neon project/branch/database/endpoint/timeline IDs as if they were authoritative current binding facts.

Historical/candidate IDs may be discussed only if clearly labeled non-authoritative and only if necessary after Replit supplies a qualifying mechanism. They are not required for the initial request.

## 6. Positive-answer acceptance gate

A Replit response is not itself a C2N PASS. Before any live observation, a proposed mechanism must be certified to satisfy all of the following:

1. Replit/platform authoritative provenance.
2. Exact repl/app and exact deployment input.
3. Exact deployment→Production DB binding association.
4. No credential return path required or exercised.
5. Closed mapping to the W09-C2N allowlisted schema.
6. Binding revision/association semantics are immutable or freshness-bounded.
7. Missing/ambiguous identity fails closed.
8. Deployment change invalidates or changes the receipt as appropriate.
9. No DB/SQL session required.
10. No provider/public-site mutation required.
11. No operator-supplied provider identity substitution.
12. Producer/API version and provenance can be recorded in audit evidence.

If timeline/lineage ID is absent, the alternative continuity identifier must be authoritative and sufficient to prove exact lineage continuity, including endpoint rotation semantics.

## 7. Negative/insufficient answer handling

Remain UNPROVED if Replit:
- points only to Secrets or DATABASE_URL;
- instructs us to parse a connection string;
- provides only an Agent/natural-language assertion;
- provides only operator-visible database names without exact deployment association;
- confirms only that Production databases use Neon;
- provides a Neon lookup that lacks Replit-side deployment association;
- requires application runtime/shell/process environment inspection;
- cannot state whether the mechanism can expose credentials;
- cannot bind the response to the exact deployment/binding revision;
- offers only manual/operator-entered resource IDs.

No fallback inference is authorized.

## 8. Authorization boundary for submission

Creating this document, issue, branch, PR, and performing public documentation research do NOT authorize submission.

A future explicit authorization must name the support request, for example:

AUTHORIZE W09-C2Q REPLIT SUPPORT SUBMISSION — submit exactly the certified no-secret W09-C2Q request through the authenticated official Replit support channel for the current SEO ENGINE Replit application; include only exact app/repl ID, exact successful deployment ID, public URL, and the certified capability questions; do not include or inspect DATABASE_URL, Secrets, credentials, environment maps, candidate Neon resource IDs, or credential derivatives; do not change Replit configuration, deploy/redeploy/restart, mutate Production/Neon/database/schema/data, execute SQL, or activate Stage 0/provider/autonomous execution.

If no authorized tool can submit through Replit support, provide the user the frozen copy-ready message and official navigation path; do not claim submission.

## 9. State after W09-C2Q

Until a qualifying mechanism is returned and separately certified:
- C2N live provenance authority: NOT APPROVED;
- W09-C2I Side R: UNPROVED;
- W09-C2J/C2I retry: BLOCKED;
- Side N candidate comparison as substitute: BLOCKED;
- W09-C2H retry: BLOCKED;
- real Production Stage 0: BLOCKED.

Safe product/UI/read-only work outside these blocked Production gates may continue under its own existing boundaries.
