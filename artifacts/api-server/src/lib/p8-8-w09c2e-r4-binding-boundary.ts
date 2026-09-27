import { createProductionBindingSupplier } from "./p8-8-w09c2e-r2-production-composition.js";

export const P8_8_W09C2E_R4_BINDING_BOUNDARY_VERSION =
  "p8-8-w09c2e-r4-binding-boundary-v1" as const;

/**
 * Side-effect-free Production composition boundary.
 *
 * Reading the already-bound process environment value does not connect to the
 * database, parse the binding, log it, hash it, persist it, or activate any
 * runtime subsystem. Consumers receive only the inert R2 supplier.
 */
const productionDatabaseBinding = process.env["DATABASE_URL"];

export const productionBindingSupplier =
  createProductionBindingSupplier(productionDatabaseBinding);
