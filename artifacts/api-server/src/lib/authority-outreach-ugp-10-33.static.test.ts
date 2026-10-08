import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname,join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here=dirname(fileURLToPath(import.meta.url));
const cert=readFileSync(
  join(here,"authority-outreach-ugp-10-33-certification.ts"),
  "utf8",
);
const executor=readFileSync(
  join(here,"authority-outreach-ugp-10-33-executor.ts"),
  "utf8",
);
const dbPrep=readFileSync(
  join(here,"authority-outreach-ugp-10-33-db-prepare.ts"),
  "utf8",
);
const runner=readFileSync(
  join(here,"authority-outreach-ugp-10-33-live-runner.ts"),
  "utf8",
);
const route=readFileSync(
  join(here,"../routes/authority-opportunities.ts"),
  "utf8",
);
const receiver=readFileSync(
  fileURLToPath(
    new URL("../../../../ops/ugp-10-33-controlled-receiver.ts",import.meta.url),
  ),
  "utf8",
);
const buildScript=readFileSync(
  fileURLToPath(new URL("../../build.mjs",import.meta.url)),
  "utf8",
);
const packageJson=readFileSync(
  fileURLToPath(new URL("../../package.json",import.meta.url)),
  "utf8",
);
const dockerfile=readFileSync(
  fileURLToPath(new URL("../../../../Dockerfile",import.meta.url)),
  "utf8",
);

test("UGP-10.33 real network primitive exists only behind exact certification authorization",()=>{
  assert.match(cert,/fetchImpl\(input\.plan\.receiverUrl/);
  assert.match(cert,/exact_authorization_literal_required/);
  assert.match(cert,/maxCalls:1 as const/);
  assert.match(cert,/maxAttemptsPerCall:1 as const/);
  assert.match(cert,/automaticRetry:false as const/);
  assert.match(cert,/\.up\.railway\.app/);
  assert.match(cert,/\/ugp-10-33\/receive/);
  assert.doesNotMatch(cert,/setInterval|setTimeout\s*\([^,]+,|Promise\.all\s*\(/);
});

test("UGP-10.33 operational CLIs fail closed for production and non-empty DB",()=>{
  assert.match(dbPrep,/production_db_prepare_forbidden/);
  assert.match(dbPrep,/cert_database_must_be_empty/);
  assert.match(dbPrep,/exact_authorization_literal_required/);
  assert.match(dbPrep,/bootstrapRuntimeDatabase/);
  assert.doesNotMatch(dbPrep,/ensureDiamondShelfIdentity/);
  assert.match(runner,/production_live_certification_forbidden/);
  assert.match(runner,/real_certification_disabled/);
  assert.match(runner,/exact_authorization_literal_required/);
  assert.match(runner,/replayNetworkCalls/);
  assert.match(runner,/suppressionReplay/);
});

test("UGP-10.33 public authority API still exposes no real-send endpoint",()=>{
  assert.doesNotMatch(route,/controlled_https_cert/);
  assert.doesNotMatch(route,/UGP_10_33_REAL_CERT_ENABLED/);
  assert.doesNotMatch(route,/\/authority\/outreach\/single-send\/real/);
});

test("UGP-10.33 receiver is bounded and does not persist or log raw messages",()=>{
  assert.match(receiver,/\/ugp-10-33\/receive/);
  assert.match(receiver,/payload\.subject\.length>120/);
  assert.match(receiver,/payload\.body\.length>3000/);
  assert.match(receiver,/subjectHash/);
  assert.match(receiver,/bodyHash/);
  assert.doesNotMatch(
    receiver,
    /console\.|Bun\.write|Bun\.sql|postgres|database|\bINSERT\s+INTO\b|\bUPDATE\s+[A-Za-z_]|\bDELETE\s+FROM\b/i,
  );
});

test("UGP-10.33 executor preserves no-retry uncertainty fencing",()=>{
  assert.match(executor,/networkCalls:0\|1/);
  assert.match(executor,/automaticRetryPerformed:false/);
  assert.match(executor,/replay_of_claimed_execution_is_uncertain/);
  assert.match(executor,/post_network_state_transition_uncertain/);
  assert.match(executor,/controlled_https_cert_accepted/);
  assert.match(executor,/controlled_https_cert_uncertain/);
});


test("UGP-10.33 one-shot operational runners are compiled into the runtime image",()=>{
  assert.match(buildScript,/ugp-10-33-print-plan/);
  assert.match(buildScript,/ugp-10-33-db-prepare/);
  assert.match(buildScript,/ugp-10-33-live-runner/);
  assert.match(packageJson,/dist\/ugp-10-33-print-plan\.mjs/);
  assert.match(packageJson,/dist\/ugp-10-33-db-prepare\.mjs/);
  assert.match(packageJson,/dist\/ugp-10-33-live-runner\.mjs/);
  assert.match(dockerfile,/\/app\/lib\/db\/migrations \.\/lib\/db\/migrations/);
  assert.match(dbPrep,/process\.cwd\(\)/);
  assert.match(dbPrep,/lib\/db\/migrations/);
});
