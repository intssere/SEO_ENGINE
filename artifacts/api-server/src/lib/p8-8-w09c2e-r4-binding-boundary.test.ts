import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

const originalDatabaseUrl = process.env["DATABASE_URL"];
const originalPostgresUrl = process.env["POSTGRES_URL"];
const originalNeonDatabaseUrl = process.env["NEON_DATABASE_URL"];

afterEach(() => {
  if (originalDatabaseUrl === undefined) delete process.env["DATABASE_URL"];
  else process.env["DATABASE_URL"] = originalDatabaseUrl;
  if (originalPostgresUrl === undefined) delete process.env["POSTGRES_URL"];
  else process.env["POSTGRES_URL"] = originalPostgresUrl;
  if (originalNeonDatabaseUrl === undefined) delete process.env["NEON_DATABASE_URL"];
  else process.env["NEON_DATABASE_URL"] = originalNeonDatabaseUrl;
});

test("exports only an inert supplier over the single allowlisted binding source", async () => {
  process.env["DATABASE_URL"] =
    "postgresql://user:secret@example.invalid:5432/db?sslmode=require";

  const mod = await import("./p8-8-w09c2e-r4-binding-boundary.js?case=allowlisted");

  assert.equal(
    mod.P8_8_W09C2E_R4_BINDING_BOUNDARY_VERSION,
    "p8-8-w09c2e-r4-binding-boundary-v1",
  );
  assert.equal(typeof mod.productionBindingSupplier, "function");
  assert.equal(
    mod.productionBindingSupplier(),
    "postgresql://user:secret@example.invalid:5432/db?sslmode=require",
  );
});

test("does not fall back to alternate binding variables", async () => {
  process.env["DATABASE_URL"] = "";
  process.env["POSTGRES_URL"] = "postgresql://forbidden.example/db";
  process.env["NEON_DATABASE_URL"] = "postgresql://forbidden-neon.example/db";

  const mod = await import("./p8-8-w09c2e-r4-binding-boundary.js?case=no-fallback");

  assert.equal(mod.productionBindingSupplier(), "");
});

test("captures the binding once at module composition time", async () => {
  process.env["DATABASE_URL"] = "postgresql://first.example/db";

  const mod = await import("./p8-8-w09c2e-r4-binding-boundary.js?case=capture-once");
  process.env["DATABASE_URL"] = "postgresql://second.example/db";

  assert.equal(mod.productionBindingSupplier(), "postgresql://first.example/db");
});
