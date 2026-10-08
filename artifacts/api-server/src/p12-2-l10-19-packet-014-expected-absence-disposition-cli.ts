import {
  P12_2_L10_19_POSTGRES_SERVICE_ID,
  executeP122L1019ExpectedAbsenceDisposition,
  p122L1019Capability,
  p122L1019DispositionAuthorizationLiteral,
} from "./lib/p12-2-l10-19-packet-014-expected-absence-disposition.js";
import { firstPartyLiveFailureDiagnostics } from "./lib/first-party-live-adapters.js";

function required(name: string): string {
  const value = process.env[name]?.trim() ?? "";
  if (!value) throw new Error(`p12_2_l10_19_${name.toLowerCase()}_required`);
  return value;
}

function boundedErrorCode(error: unknown): string {
  const raw = error instanceof Error ? error.message : "p12_2_l10_19_unknown_failure";
  return /^[a-z0-9_:-]{1,180}$/.test(raw)
    ? raw
    : "p12_2_l10_19_bounded_failure";
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const verifierImage = required("P12_2_L10_19_VERIFIER_IMAGE");

  if (args.length === 0) {
    console.log(JSON.stringify({
      status: "inspection_only",
      capability: p122L1019Capability(),
      verifierImage,
      authorizationLiteral: p122L1019DispositionAuthorizationLiteral(verifierImage),
    }));
    return;
  }

  if (args.length !== 1 || args[0] !== "--execute") {
    throw new Error("p12_2_l10_19_cli_argument_invalid");
  }

  const authorizationLiteral = required("P12_2_L10_19_AUTHORIZATION_LITERAL");
  if (authorizationLiteral !== p122L1019DispositionAuthorizationLiteral(verifierImage)) {
    throw new Error("p12_2_l10_19_authorization_required");
  }

  const postgresServiceId = required("P12_2_L10_19_POSTGRES_SERVICE_ID");
  if (postgresServiceId !== P12_2_L10_19_POSTGRES_SERVICE_ID) {
    throw new Error("p12_2_l10_19_postgres_service_binding_invalid");
  }

  const verifierDeploymentId = required("RAILWAY_DEPLOYMENT_ID");
  const databaseUrl = required("DATABASE_URL");

  const result = await executeP122L1019ExpectedAbsenceDisposition({
    authorizationLiteral,
    databaseUrl,
    verifierImage,
    verifierDeploymentId,
  });

  console.log(JSON.stringify({
    ...result,
    postgresServiceId,
    verifierImage,
    verifierDeploymentId,
    authorizationLiteral,
    attempts: 1,
    retries: 0,
    fallbackTransportUsed: false,
    credentialMaterialRecorded: false,
  }));
}

main().catch((error) => {
  console.error(JSON.stringify({
    status: "failed",
    code: boundedErrorCode(error),
    ...firstPartyLiveFailureDiagnostics(error),
    attempts: 1,
    retries: 0,
    crawlReplayPerformed: false,
    recoveryExecutionPerformed: false,
    providerWrites: false,
    publicSiteWrites: false,
    credentialMaterialRecorded: false,
  }));
  process.exitCode = 2;
});
