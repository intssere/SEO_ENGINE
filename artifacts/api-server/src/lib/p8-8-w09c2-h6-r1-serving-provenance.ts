import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseBuildProvenance, type BuildProvenanceArtifact } from "./p8-8-w09c2f-build-provenance.js";

export const SERVING_PROVENANCE_ATTESTATION_VERSION = "p8-8-w09c2-h6-r1-serving-provenance-v1" as const;

export type ServingProvenanceAttestation =
  | {
      result: "pass";
      code: "ok";
      attestation_version: typeof SERVING_PROVENANCE_ATTESTATION_VERSION;
      provenance: BuildProvenanceArtifact;
    }
  | {
      result: "fail_closed";
      code: "artifact_unavailable" | "artifact_invalid";
      attestation_version: typeof SERVING_PROVENANCE_ATTESTATION_VERSION;
    };

export function servingProvenanceArtifactPath(moduleUrl = import.meta.url): string {
  const libDir = path.dirname(fileURLToPath(moduleUrl));
  return path.resolve(libDir, "../../dist/build-provenance.json");
}

export async function loadServingProvenance(
  readArtifact: (path: string, encoding: BufferEncoding) => Promise<string> = readFile,
  artifactPath = servingProvenanceArtifactPath(),
): Promise<ServingProvenanceAttestation> {
  let serialized: string;
  try {
    serialized = await readArtifact(artifactPath, "utf8");
  } catch {
    return {
      result: "fail_closed",
      code: "artifact_unavailable",
      attestation_version: SERVING_PROVENANCE_ATTESTATION_VERSION,
    };
  }

  const parsed = parseBuildProvenance(serialized);
  if (parsed.result !== "pass") {
    return {
      result: "fail_closed",
      code: "artifact_invalid",
      attestation_version: SERVING_PROVENANCE_ATTESTATION_VERSION,
    };
  }

  return {
    result: "pass",
    code: "ok",
    attestation_version: SERVING_PROVENANCE_ATTESTATION_VERSION,
    provenance: parsed.artifact,
  };
}
