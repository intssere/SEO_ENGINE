/**
 * P8.8 W09-C3C OFFLINE SCAFFOLD — NOT A RAILWAY IaC AUTHORING FILE.
 *
 * This file intentionally imports no Railway SDK and exports no deployable
 * Railway project. It records the fail-closed adoption boundary until a live
 * `railway config pull` baseline and certified Neon identity are separately
 * authorized and reviewed.
 *
 * DO NOT rename this file to railway.ts and do not install/apply Railway IaC
 * from C3C. C3D+ must first provide an imported baseline, staged-patch
 * reconciliation, certified provider identity, and an explicit mutation
 * authorization.
 */
export const C3C_RAILWAY_IAC_SCAFFOLD = Object.freeze({
  schemaVersion: "p8-8-w09c3c-scaffold-v1",
  applicable: false,
  expectedProjectId: "52265e29-921b-4652-ac0d-9da4e5e69936",
  expectedEnvironmentId: "7f8d920f-f6c6-44f0-b9fe-252cb4f32298",
  expectedEnvironmentName: "production",
  expectedServiceId: "1e8c1e7d-16f7-4c63-8193-1021bcbe6d90",
  expectedServiceName: "seo-engine-shadow",
  credentialCustody: "preserve-only-after-authorized-import",
  externalProvider: "Neon",
  requiresImportedBaseline: true,
  requiresStagedPatchReconciliation: true,
  requiresCertifiedProviderIdentity: true,
  requiresAuthoritativeCrossSideAssociation: true,
  requiresExplicitApplyAuthorization: true,
} as const);
