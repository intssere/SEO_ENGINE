import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  bindP88W04IntentToW03,
  projectP88W04ReservationIntent,
} from "./p8-8-reservation-intent.js";
import {
  P8_8_W03_SYNTHETIC_RESERVATION_VERSION,
  buildP88W03PolicyAuthorization,
  buildP88W03ReservationDescriptor,
} from "./p8-8-policy-authorization.js";
import { buildP88W04TestScenario } from "./p8-8-w04-test-fixture.js";

test("W04 reservation intent is deterministic over canonical W01/W02 lineage", () => {
  const scenario = buildP88W04TestScenario();
  const first = projectP88W04ReservationIntent(scenario.intentInput);
  const second = projectP88W04ReservationIntent(scenario.intentInput);

  assert.equal(first.reservationId, second.reservationId);
  assert.equal(first.reservationFingerprint, second.reservationFingerprint);
  assert.match(first.reservationId, /^p88w04-reservation-[0-9a-f]{24}$/);
  assert.match(first.reservationFingerprint, /^[0-9a-f]{64}$/);
  assert.equal(first.reservationClass, "shopify.product.seo.meta_description");
  assert.equal(first.target.provider, "shopify");
  assert.equal(first.target.resourceKind, "product");
  assert.equal(first.target.field, "meta_description");
  assert.notEqual(first.state.beforeFingerprint, first.state.afterFingerprint);
  assert.equal(first.safety.databaseReadPerformed, false);
  assert.equal(first.safety.databaseWritePerformed, false);
  assert.equal(first.safety.providerDispatchAuthorized, false);
  assert.equal(Object.isFrozen(first), true);
});

test("W04 binds only the exact precommitted W03 reservation identity", () => {
  const scenario = buildP88W04TestScenario();
  const binding = bindP88W04IntentToW03(
    scenario.input.intent,
    scenario.input.w03Input,
    scenario.input.w03Authorization,
  );

  assert.equal(binding.reservationId, scenario.input.intent.reservationId);
  assert.equal(
    binding.reservationFingerprint,
    scenario.input.intent.reservationFingerprint,
  );
  assert.equal(binding.durableReservationCreated, false);
  assert.equal(binding.providerDispatchAuthorized, false);
  assert.match(binding.bindingFingerprint, /^[0-9a-f]{64}$/);
});

test("arbitrary W03 reservation precommit is rejected even when W03 itself is canonical", () => {
  const scenario = buildP88W04TestScenario();
  const arbitrary = buildP88W03ReservationDescriptor({
    reservationId: "p88w04-reservation-deadbeefdeadbeefdeadbeef",
    reservationFingerprint: "d".repeat(64),
    reservationState: "reserved_prewrite",
    reservationVersion: P8_8_W03_SYNTHETIC_RESERVATION_VERSION,
    reservationDurable: false,
    reservationSource: "synthetic_test",
  });
  const w03Input = {
    ...scenario.input.w03Input,
    reservation: arbitrary,
  };
  const w03 = buildP88W03PolicyAuthorization(w03Input);

  assert.throws(
    () => bindP88W04IntentToW03(scenario.input.intent, w03Input, w03),
    /p88_w04_w03_precommit_mismatch:reservation_id/,
  );
});

test("tampered W01 or W02 artifacts fail canonical W04 intent rebuild", () => {
  const scenario = buildP88W04TestScenario();

  assert.throws(
    () =>
      projectP88W04ReservationIntent({
        ...scenario.intentInput,
        w01Evaluation: {
          ...scenario.intentInput.w01Evaluation,
          evaluationId: "p88w01-eval-deadbeefdeadbeefdeadbeef",
        },
      }),
    /p88_w04_w01_evaluation_integrity_mismatch/,
  );

  assert.throws(
    () =>
      projectP88W04ReservationIntent({
        ...scenario.intentInput,
        w02Materialization: {
          ...scenario.intentInput.w02Materialization,
          proposalId: "p88w02-proposal-deadbeefdeadbeefdeadbeef",
        },
      }),
    /p88_w04_w02_materialization_integrity_mismatch/,
  );
});

test("material lineage changes create different W04 reservation identities", () => {
  const first = buildP88W04TestScenario({
    proposedValue: "After one",
    subjectSuffix: "one",
  });
  const second = buildP88W04TestScenario({
    proposedValue: "After two",
    subjectSuffix: "two",
  });

  assert.notEqual(
    first.input.intent.reservationFingerprint,
    second.input.intent.reservationFingerprint,
  );
  assert.notEqual(
    first.input.intent.reservationId,
    second.input.intent.reservationId,
  );
});

test("W04 reservation intent source remains pure and runtime-unbound", async () => {
  const source = await readFile(
    new URL("./p8-8-reservation-intent.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /from "postgres"/);
  assert.doesNotMatch(source, /drizzle-orm/);
  assert.doesNotMatch(source, /DATABASE_URL/);
  assert.doesNotMatch(source, /process\.env/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /express\s*\(/);
  assert.doesNotMatch(source, /router\./);
  assert.doesNotMatch(source, /task51-action-renewal/);
  assert.doesNotMatch(source, /task53-read-only-resource-resolver/);
  assert.doesNotMatch(source, /task54-persistent-apply/);
  assert.doesNotMatch(source, /scheduler.*dispatch/i);
  assert.doesNotMatch(source, /worker.*dispatch/i);
});


test("W04 reservation store has explicit PostgreSQL persistence only and no provider/runtime binding", async () => {
  const source = await readFile(
    new URL("./p8-8-reservation-store.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /from "postgres"/);
  assert.doesNotMatch(source, /DATABASE_URL/);
  assert.doesNotMatch(source, /process\.env/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /https?\.request/);
  assert.doesNotMatch(source, /express\s*\(/);
  assert.doesNotMatch(source, /router\./);
  assert.doesNotMatch(source, /task51-action-renewal/);
  assert.doesNotMatch(source, /task53-read-only-resource-resolver/);
  assert.doesNotMatch(source, /task54-persistent-apply/);
  assert.doesNotMatch(source, /scheduler.*dispatch/i);
  assert.doesNotMatch(source, /worker.*dispatch/i);
  assert.doesNotMatch(source, /PUBLIC_SITE_WRITES_ENABLED/);
});
