import assert from "node:assert/strict";
import { test } from "node:test";
import {
  P8_8_W09C2E_R4_BINDING_BOUNDARY_VERSION,
  composeProductionBindingSupplier,
} from "./p8-8-w09c2e-r4-binding-boundary.js";

test("exports the certified R4 version and composes an inert supplier over the allowlisted source", () => {
  const supplier = composeProductionBindingSupplier({
    DATABASE_URL: "postgresql://user:secret@example.invalid:5432/db?sslmode=require",
  });

  assert.equal(
    P8_8_W09C2E_R4_BINDING_BOUNDARY_VERSION,
    "p8-8-w09c2e-r4-binding-boundary-v1",
  );
  assert.equal(typeof supplier, "function");
  assert.equal(
    supplier(),
    "postgresql://user:secret@example.invalid:5432/db?sslmode=require",
  );
});

test("does not accept alternate binding variables as fallback inputs", () => {
  const supplier = composeProductionBindingSupplier({ DATABASE_URL: "" });
  assert.equal(supplier(), "");
});

test("captures the binding once at composition time", () => {
  const environment = { DATABASE_URL: "postgresql://first.example/db" };
  const supplier = composeProductionBindingSupplier(environment);
  environment.DATABASE_URL = "postgresql://second.example/db";

  assert.equal(supplier(), "postgresql://first.example/db");
});
