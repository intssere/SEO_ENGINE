# UGP-10.33 — Controlled Real Non-Production Web-Submission Certification

## Status

**IMPLEMENTATION CANDIDATE — REAL NETWORK EXECUTION STILL SEPARATELY AUTHORIZED**

UGP-10.33 is the first UGP-10 stage that is permitted to cross a real network/message boundary.

The selected initial certification channel is:

`web_contact_form`

The selected certification transport is:

`controlled_https_cert`

No production mailbox, email provider credential, SMTP account, or production database is used.

## Why web-contact-form is the initial real channel

The SEO ENGINE Railway project currently has no configured outbound mail-provider credential.

UGP already supports two contact-point classes:

- `email_address`
- `web_contact_form`

For the first real certification, a disposable Railway HTTPS receiver provides a controlled external submission target without:

- borrowing production secrets;
- inventing an email credential;
- sending to an uncontrolled third party;
- changing production DNS/mailbox state.

This is a real HTTPS network/message transmission to a controlled non-production recipient.

## Exact execution lineage

UGP-10.33 preserves the complete chain:

UGP-9 qualified prospect
→ UGP-10 human draft approval
→ reviewed draft candidate
→ selected recipient role
→ selected public contact point
→ policy/consent approval
→ deliverability/binding evidence decisions
→ UGP-10.29 operational-authorization eligibility
→ UGP-10.31 durable outbound safety reservation
→ UGP-10.32 one-attempt execution claim
→ UGP-10.33 controlled HTTPS certification.

The live certification does not seed a hand-written reservation.

It builds the exact governed UGP-10.29 lineage using the deterministic certification fixture and reserves through the normal UGP-10.31 store.

## Migration 0011

Source:

`lib/db/migrations/0011_ugp_10_33_controlled_https_certification.sql`

Migration 0011:

- creates no tables;
- creates no indexes;
- performs no DML;
- preserves the 49-table UGP-10.32 state;
- replaces only the execution-event `event_reason` CHECK;
- retains all prior reasons;
- adds:
  - `controlled_https_cert_accepted`
  - `controlled_https_cert_rejected`
  - `controlled_https_cert_uncertain`

Migration 0011 is not applied to staging or production by repository CI.

## Controlled certification plan

Version:

`ugp-10-33-controlled-real-web-submission-certification-v1`

The plan binds:

- exact source commit SHA;
- exact receiver URL;
- exact receiver domain;
- exact UGP-10.32 execution fingerprint;
- exact process-local payload fingerprint;
- channel `web_contact_form`;
- adapter class `controlled_https_cert`;
- maximum calls: 1;
- maximum attempts per call: 1;
- concurrency: 1;
- automatic retry: false;
- timeout: 10 seconds;
- maximum response body: 16 KiB;
- production allowed: false;
- scheduler allowed: false;
- worker allowed: false.

Receiver URL constraints:

- HTTPS only;
- Railway `*.up.railway.app` hostname only;
- no username/password;
- no explicit port;
- no query;
- no fragment;
- exact path:
  `/ugp-10-33/receive`

## Exact Railway non-production binding

The controlled certification is hard-bound to the existing empty SEO ENGINE fixture:

- Railway project: `52265e29-921b-4652-ac0d-9da4e5e69936` (`SEO ENGINE`);
- Railway environment: `8b8e54ee-810a-4020-b89d-8397d1fa5ef1` (`p12-2-fixture`).

The project ID, environment ID, and environment name are included in the certification plan fingerprint. The DB preparer, live runner, and controlled receiver all fail closed outside that exact environment. `NODE_ENV` alone is not accepted as proof of non-production isolation.

## Authorization literal

The real adapter cannot be constructed without the exact plan-derived literal:

`AUTHORIZE:UGP_10_33_CONTROLLED_REAL_WEB_SUBMISSION:<SOURCE_COMMIT_SHA>:<PLAN_FINGERPRINT>`

The plan fingerprint includes the exact receiver URL, execution fingerprint, payload fingerprint, and certification limits.

Changing any of those values changes the required authorization literal.

## Offline plan command

Command:

`pnpm --filter @workspace/api-server ugp-10-33:print-plan`

Required environment:

- `UGP_10_33_SOURCE_COMMIT_SHA`
- `UGP_10_33_CERT_RECEIVER_URL`

This command:

- performs no database access;
- performs no network operation;
- performs no send;
- prints the exact reservation/execution/plan fingerprints and authorization literal.

## Disposable database preparation

Command:

`pnpm --filter @workspace/api-server ugp-10-33:prepare-db`

Required gates:

- non-production `NODE_ENV`;
- `UGP_10_33_CERT_DB_PREPARE_ENABLED=true`;
- exact source SHA;
- exact receiver URL;
- exact UGP-10.33 authorization literal;
- explicit `DATABASE_URL`.

Fail-closed condition:

The target database must contain exactly **zero public base tables** before preparation.

The command refuses any non-empty database.

It then applies migrations `0001` through `0011`, establishes the canonical Diamond Shelf site identity, verifies 49 tables, and verifies the controlled HTTPS event reasons.

It performs zero provider calls and zero message sends.

## Disposable receiver

Repository source:

`ops/ugp-10-33-controlled-receiver.ts`

The receiver:

- runs as a disposable Railway Function;
- exposes `GET /healthz`;
- accepts only `POST /ugp-10-33/receive`;
- requires the UGP-10.33 certification version header;
- validates exact fingerprint shapes;
- bounds subject to 120 characters;
- bounds body to 3000 characters;
- performs no database writes;
- performs no file writes;
- emits no raw-message logs;
- returns only execution/payload fingerprints and a receipt fingerprint.

## Live runner

Command:

`pnpm --filter @workspace/api-server ugp-10-33:run-live-cert`

Required gates:

- `NODE_ENV` must not be `production`;
- `UGP_10_33_REAL_CERT_ENABLED=true`;
- exact disposable `DATABASE_URL`;
- exact source commit SHA;
- exact receiver URL;
- exact plan-derived authorization literal.

The runner:

1. verifies the disposable database is at the 49-table state;
2. builds the full approved UGP-10.29 controlled lineage;
3. obtains a UGP-10.31 durable reservation;
4. crosses the controlled HTTPS adapter exactly once;
5. requires an accepted receiver receipt;
6. consumes the UGP-10.31 reservation;
7. records the UGP-10.32 execution as accepted;
8. records `controlled_https_cert_accepted`;
9. replays the exact execution and requires **zero** additional network calls;
10. verifies durable `attempt_count=1`;
11. verifies event history;
12. verifies contact/domain rate state;
13. adds durable suppression;
14. verifies subsequent reservation fails as `suppressed_contact`;
15. prints only sanitized certification evidence.

## Crash and ambiguity behavior

If the network call is ambiguous:

- no retry is attempted;
- the reservation is fenced uncertain;
- the execution is finalized uncertain.

If the network boundary is crossed but later durable state transition fails:

- no second network call is made;
- the result is forced to uncertain;
- the reservation is fenced uncertain when possible.

If a claimed execution is replayed before a terminal result exists:

- the adapter is not called;
- the execution is recovered as uncertain.

## CI boundary

Repository CI:

- applies migration 0011 only to localhost ephemeral PostgreSQL;
- uses an injected fake receiver for the executor test;
- performs zero real external network calls;
- performs zero real sends.

The real network path is therefore present and testable but remains closed until the exact operational authorization is supplied.

## Railway operational plan after merge

The live certification must use disposable non-production resources.

The existing SEO ENGINE `p12-2-fixture` environment is empty and no outbound mail credential exists, so the intended run is:

1. create a disposable Railway project/environment for UGP-10.33;
2. create a disposable controlled receiver Function;
3. generate its Railway HTTPS domain;
4. compute the exact offline plan and authorization literal;
5. receive explicit authorization for that exact literal;
6. provision a disposable Postgres database;
7. deploy/pin the certification runner to the exact merged source commit;
8. prepare the empty database;
9. execute exactly one controlled real submission;
10. capture sanitized runner receipt plus Railway network-flow evidence;
11. verify exact replay emits no second outbound flow;
12. remove/disable the disposable runner/receiver/database resources after evidence capture.

Production SEO ENGINE services and production Postgres are not mutated.

## Explicit exclusions

UGP-10.33 does not authorize:

- production deployment;
- production database migration;
- production provider credential use;
- production mailbox binding;
- SMTP;
- arbitrary destination URLs;
- arbitrary HTTP requests;
- batch sends;
- scheduler sends;
- worker sends;
- automatic retry;
- more than one certification network attempt.

## Completion condition

UGP-10.33 becomes complete only after a separately authorized disposable real-network run produces a PASS receipt proving:

- one accepted controlled submission;
- one durable execution attempt;
- one consumed reservation;
- exact replay with zero second network calls;
- correct rate-state evidence;
- post-send suppression enforcement;
- sanitized receiver/network evidence.

After that, UGP-10.34 may perform the final UGP-10 exit certification.
