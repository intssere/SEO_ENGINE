export const P8_8_W09C2E_R2_COMPOSITION_VERSION =
  "p8-8-w09c2e-r2-production-composition-v1" as const;

export type ProductionBindingSupplier = () => string | undefined;

export function createProductionBindingSupplier(
  binding: string | undefined,
): ProductionBindingSupplier {
  return () => binding;
}
