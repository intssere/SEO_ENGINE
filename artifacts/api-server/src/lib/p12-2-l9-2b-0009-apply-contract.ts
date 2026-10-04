import { createHash } from "node:crypto";
export const P12_2_L9_2B_VERSION="p12-2-l9-2b-0009-apply-v1" as const;
export const P12_2_L9_2B_PROJECT_ID="52265e29-921b-4652-ac0d-9da4e5e69936" as const;
export const P12_2_L9_2B_ENVIRONMENT_ID="7f8d920f-f6c6-44f0-b9fe-252cb4f32298" as const;
export const P12_2_L9_2B_POSTGRES_SERVICE_ID="b69e0633-7ab9-40ab-85f3-c9edd6acb031" as const;
export const P12_2_L9_2B_SITE_ID="eb1da9ee-539c-4200-8f04-f64ccaea7768" as const;
export const P12_2_L9_2B_ORIGIN="https://diamondshelf.us" as const;
export const P12_2_L9_2B_MIGRATION_PATH="lib/db/migrations/0009_first_party_crawl_l2_bounded_pilot_phase.sql" as const;
export const P12_2_L9_2B_MIGRATION_BLOB_SHA="50de28599a3d6268e8805423726f0102f2b8e0c9" as const;
export const P12_2_L9_2B_MIGRATION_SHA256="388c444384f9ea268b422a43596ead50d60effc5467c72e50751df6227614191" as const;
export const P12_2_L9_2B_EXPECTED_TABLE_COUNT=38 as const;
export function p122L92BAuthorizationFingerprint():string{return createHash("sha256").update(JSON.stringify({version:P12_2_L9_2B_VERSION,projectId:P12_2_L9_2B_PROJECT_ID,environmentId:P12_2_L9_2B_ENVIRONMENT_ID,postgresServiceId:P12_2_L9_2B_POSTGRES_SERVICE_ID,siteId:P12_2_L9_2B_SITE_ID,canonicalOrigin:P12_2_L9_2B_ORIGIN,migrationPath:P12_2_L9_2B_MIGRATION_PATH,migrationBlobSha:P12_2_L9_2B_MIGRATION_BLOB_SHA,migrationSha256:P12_2_L9_2B_MIGRATION_SHA256,expectedPrePublicBaseTableCount:P12_2_L9_2B_EXPECTED_TABLE_COUNT,expectedPostPublicBaseTableCount:P12_2_L9_2B_EXPECTED_TABLE_COUNT,expectedConstraintName:"first_party_crawl_l2_invocations_phase_check",psqlProcesses:1,attempts:1,retries:0,fallback:false})).digest("hex");}
export function p122L92BAuthorizationLiteral():string{return `AUTHORIZE:P12_2_L9_2_0009_APPLY:${p122L92BAuthorizationFingerprint()}`;}
