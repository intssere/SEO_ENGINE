import {
  P12_2_L10_18_POSTGRES_SERVICE_ID,
  executeP122L1018FinalizationRepair,
  p122L1018RepairAuthorizationLiteral,
} from "./lib/p12-2-l10-18-packet-014-finalization-repair.js";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim() ?? "";
  if (!value) throw new Error(`p12_2_l10_18_${name.toLowerCase()}_required`);
  return value;
}

async function main(): Promise<void> {
  const authorizationLiteral = requireEnv("P12_2_L10_18_AUTHORIZATION_LITERAL");
  if (authorizationLiteral !== p122L1018RepairAuthorizationLiteral()) {
    throw new Error("p12_2_l10_18_repair_authorization_required");
  }
  const postgresServiceId = requireEnv("P12_2_L10_18_POSTGRES_SERVICE_ID");
  if (postgresServiceId !== P12_2_L10_18_POSTGRES_SERVICE_ID) {
    throw new Error("p12_2_l10_18_postgres_service_id_mismatch");
  }
  const databaseUrl = requireEnv("DATABASE_URL");

  const result = await executeP122L1018FinalizationRepair({
    authorizationLiteral,
    databaseUrl,
  });

  console.log(JSON.stringify({
    ...result,
    authorizationLiteral,
    postgresServiceId,
    attempts: 1,
    retries: 0,
    networkRequestsPerformed: false,
    crawlReplayPerformed: false,
    credentialMaterialRecorded: false,
  }));
}

main().catch((error) => {
  const raw = error instanceof Error ? error.message : "p12_2_l10_18_unknown_failure";
  const code = /^[a-z0-9_:-]{1,180}$/.test(raw) ? raw : "p12_2_l10_18_bounded_failure";
  console.error(JSON.stringify({
    status: "failed",
    code,
    attempts: 1,
    retries: 0,
    networkRequestsPerformed: false,
    crawlReplayPerformed: false,
    credentialMaterialRecorded: false,
  }));
  process.exitCode = 2;
});
