import { createProductionBindingSupplier } from "./p8-8-w09c2e-r2-production-composition.js";

export const P8_8_W09C2E_R4_BINDING_BOUNDARY_VERSION =
  "p8-8-w09c2e-r4-binding-boundary-v1" as const;

/**
 * Side-effect-free Production composition boundary.
 *
 * The caller supplies only the allowlisted DATABASE_URL slot. Composition
 * captures the opaque value without parsing, logging, hashing, persistence,
 * network access, database initialization, or runtime activation.
 */
export function composeProductionBindingSupplier(
  environment: Pick<NodeJS.ProcessEnv, "DATABASE_URL">,
) {
  return createProductionBindingSupplier(environment["DATABASE_URL"]);
}

export const productionBindingSupplier =
  composeProductionBindingSupplier(process.env);
