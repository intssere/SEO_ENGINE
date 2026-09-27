import { describe, expect, it, vi } from "vitest";

describe("P8.8 W09-C2E-R4 side-effect-free binding boundary", () => {
  it("exports only an inert supplier over the single allowlisted binding source", async () => {
    vi.resetModules();
    vi.stubEnv("DATABASE_URL", "postgresql://user:secret@example.invalid:5432/db?sslmode=require");

    const mod = await import("./p8-8-w09c2e-r4-binding-boundary.js");

    expect(mod.P8_8_W09C2E_R4_BINDING_BOUNDARY_VERSION)
      .toBe("p8-8-w09c2e-r4-binding-boundary-v1");
    expect(typeof mod.productionBindingSupplier).toBe("function");
    expect(mod.productionBindingSupplier())
      .toBe("postgresql://user:secret@example.invalid:5432/db?sslmode=require");
  });

  it("does not fall back to alternate binding variables", async () => {
    vi.resetModules();
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("POSTGRES_URL", "postgresql://forbidden.example/db");
    vi.stubEnv("NEON_DATABASE_URL", "postgresql://forbidden-neon.example/db");

    const mod = await import("./p8-8-w09c2e-r4-binding-boundary.js");

    expect(mod.productionBindingSupplier()).toBe("");
  });

  it("captures the binding once at module composition time", async () => {
    vi.resetModules();
    vi.stubEnv("DATABASE_URL", "postgresql://first.example/db");

    const mod = await import("./p8-8-w09c2e-r4-binding-boundary.js");
    vi.stubEnv("DATABASE_URL", "postgresql://second.example/db");

    expect(mod.productionBindingSupplier()).toBe("postgresql://first.example/db");
  });
});
