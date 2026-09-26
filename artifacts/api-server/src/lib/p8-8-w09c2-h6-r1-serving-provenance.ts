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
  const modulePath = fileURLToPath(moduleUrl);
  const moduleDir = path.dirname(modulePath);
  const moduleBase = path.basename(modulePath);

  // Source/test execution: .../src/lib/<module> -> package-owned dist artifact.
  if (path.basename(moduleDir) === "lib" && path.basename(path.dirname(moduleDir)) === "src") {
    return path.resolve(moduleDir, "../../dist/build-provenance.json");
  }

  // Production execution: esbuild bundles this module into .../dist/index.mjs.
  // The provenance artifact is generated into that same dist directory.
  if (path.basename(moduleDir) === "dist" && moduleBase === "index.mjs") {
    return path.join(moduleDir, "build-provenance.json");
  }

  throw new Error("unsupported_serving_provenance_module_layout");
}

export async function loadServingProvenance(
  readArtifact: (path: string, encoding: BufferEncoding) => Promise<string> = readFile,
  artifactPath?: string,
): Promise<ServingProvenanceAttestation> {
  let resolvedArtifactPath: string;
  try {
    resolvedArtifactPath = artifactPath ?? servingProvenanceArtifactPath();
  } catch {
    return {
      result: "fail_closed",
      code: "artifact_unavailable",
      attestation_version: SERVING_PROVENANCE_ATTESTATION_VERSION,
    };
  }

  let serialized: string;
  try {
    serialized = await readArtifact(resolvedArtifactPath, "utf8");
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
