import { createHash } from "node:crypto";

export const P12_2_L7_2_VERSION = "p12-2-l7-2-0008-apply-v1" as const;
export const P12_2_L7_2_PROJECT_ID = "52265e29-921b-4652-ac0d-9da4e5e69936" as const;
export const P12_2_L7_2_ENVIRONMENT_ID = "7f8d920f-f6c6-44f0-b9fe-252cb4f32298" as const;
export const P12_2_L7_2_POSTGRES_SERVICE_ID = "b69e0633-7ab9-40ab-85f3-c9edd6acb031" as const;
export const P12_2_L7_2_SITE_ID = "eb1da9ee-539c-4200-8f04-f64ccaea7768" as const;
export const P12_2_L7_2_ORIGIN = "https://diamondshelf.us" as const;
export const P12_2_L7_2_MIGRATION_PATH = "lib/db/migrations/0008_first_party_crawl_l2_invocations.sql" as const;
export const P12_2_L7_2_MIGRATION_BLOB_SHA = "1635c7da4cb1deac343b1d6aa73f334e1dd7e15a" as const;
export const P12_2_L7_2_MIGRATION_SHA256 = "a3604fc210374392426e1a75a1dacc3a89651942466ff4b6d76c620e120dd25b" as const;
export const P12_2_L7_2_EXPECTED_PRE_TABLE_COUNT = 37 as const;
export const P12_2_L7_2_EXPECTED_POST_TABLE_COUNT = 38 as const;

export function p122L72AuthorizationFingerprint(): string {
  const stable = JSON.stringify({
    version: P12_2_L7_2_VERSION,
    projectId: P12_2_L7_2_PROJECT_ID,
    environmentId: P12_2_L7_2_ENVIRONMENT_ID,
    postgresServiceId: P12_2_L7_2_POSTGRES_SERVICE_ID,
    siteId: P12_2_L7_2_SITE_ID,
    canonicalOrigin: P12_2_L7_2_ORIGIN,
    migrationPath: P12_2_L7_2_MIGRATION_PATH,
    migrationBlobSha: P12_2_L7_2_MIGRATION_BLOB_SHA,
    migrationSha256: P12_2_L7_2_MIGRATION_SHA256,
    expectedPrePublicBaseTableCount: P12_2_L7_2_EXPECTED_PRE_TABLE_COUNT,
    expectedPreL2InvocationTablePresent: false,
    expectedPostPublicBaseTableCount: P12_2_L7_2_EXPECTED_POST_TABLE_COUNT,
    expectedPostL2InvocationTablePresent: true,
    psqlProcesses: 1,
    attempts: 1,
    retries: 0,
    fallback: false,
  });
  return createHash("sha256").update(stable).digest("hex");
}

export function p122L72AuthorizationLiteral(): string {
  return `AUTHORIZE:P12_2_L7_0008_APPLY:${p122L72AuthorizationFingerprint()}`;
}
