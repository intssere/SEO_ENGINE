import { createHash } from "node:crypto";
import {
  materializeSourceArtifact,
  type SourcePayloadEntry,
} from "./p8-8-w09c3fa-f7-deterministic-artifact-materializer.js";

export const RAILWAY_STAGING_SCHEMA = "p8-8-w09c3fa-f8-v1" as const;
export const RAILWAY_STAGING_MODE = "controlled_artifact_upload" as const;

export type StagingInventoryEntry = {
  path: string;
  kind: "file" | "symlink";
  executable: boolean;
  size: number;
  contentSha256: string;
};

export type RailwayStagingPlan = {
  schema: typeof RAILWAY_STAGING_SCHEMA;
  sourceMode: typeof RAILWAY_STAGING_MODE;
  manifestSha256: string;
  artifactSha256: string;
  entryCount: number;
  inventorySha256: string;
  entries: StagingInventoryEntry[];
};

export type RailwayStagingObservation = {
  schema: typeof RAILWAY_STAGING_SCHEMA;
  sourceMode: typeof RAILWAY_STAGING_MODE;
  entries: StagingInventoryEntry[];
};

export type RailwayStagingResult =
  | { result: "pass"; plan: RailwayStagingPlan }
  | {
      result: "fail_closed";
      code:
        | "invalid_payload"
        | "materialization_failed"
        | "invalid_observation"
        | "staging_mismatch";
    };

const SHA256 = /^[0-9a-f]{64}$/;
const SAFE_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.?\/)(?!.*\\)(?!.*\/\/)[^\0]+$/;

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function inventoryHash(entries: StagingInventoryEntry[]): string {
  return sha256(entries.map((entry) => JSON.stringify([
    entry.path,
    entry.kind,
    entry.executable,
    entry.size,
    entry.contentSha256,
  ])).join("\n") + "\n");
}

function inventoryFromPayload(payload: SourcePayloadEntry[]): StagingInventoryEntry[] {
  return payload.map((entry) => ({
    path: entry.path,
    kind: entry.mode === "120000" ? "symlink" as const : "file" as const,
    executable: entry.mode === "100755",
    size: entry.content.byteLength,
    contentSha256: createHash("sha256").update(entry.content).digest("hex"),
  }));
}

export function planRailwayStaging(payload: unknown): RailwayStagingResult {
  const materialized = materializeSourceArtifact(payload);
  if (materialized.result !== "pass") {
    return { result: "fail_closed", code: "materialization_failed" };
  }
  const entries = inventoryFromPayload(payload as SourcePayloadEntry[]);
  return {
    result: "pass",
    plan: {
      schema: RAILWAY_STAGING_SCHEMA,
      sourceMode: RAILWAY_STAGING_MODE,
      manifestSha256: materialized.artifact.manifestSha256,
      artifactSha256: materialized.artifact.artifactSha256,
      entryCount: entries.length,
      inventorySha256: inventoryHash(entries),
      entries,
    },
  };
}

function validObservation(input: unknown): input is RailwayStagingObservation {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const raw = input as Record<string, unknown>;
  if (Object.keys(raw).sort().join(",") !== "entries,schema,sourceMode" ||
      raw.schema !== RAILWAY_STAGING_SCHEMA ||
      raw.sourceMode !== RAILWAY_STAGING_MODE ||
      !Array.isArray(raw.entries) ||
      raw.entries.length === 0) return false;

  let previous = "";
  for (const candidate of raw.entries) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return false;
    const entry = candidate as Record<string, unknown>;
    if (Object.keys(entry).sort().join(",") !== "contentSha256,executable,kind,path,size" ||
        typeof entry.path !== "string" || !SAFE_PATH.test(entry.path) || entry.path <= previous ||
        (entry.kind !== "file" && entry.kind !== "symlink") ||
        typeof entry.executable !== "boolean" ||
        !Number.isSafeInteger(entry.size) || (entry.size as number) < 0 ||
        typeof entry.contentSha256 !== "string" || !SHA256.test(entry.contentSha256)) return false;
    if (entry.kind === "symlink" && entry.executable !== false) return false;
    previous = entry.path;
  }
  return true;
}

export function verifyRailwayStaging(
  payload: unknown,
  observation: unknown,
  expectedManifestSha256: string,
  expectedArtifactSha256: string,
): RailwayStagingResult {
  const planned = planRailwayStaging(payload);
  if (planned.result !== "pass") return planned;
  if (!validObservation(observation)) {
    return { result: "fail_closed", code: "invalid_observation" };
  }
  const plan = planned.plan;
  if (
    plan.manifestSha256 !== expectedManifestSha256 ||
    plan.artifactSha256 !== expectedArtifactSha256 ||
    observation.entries.length !== plan.entryCount ||
    inventoryHash(observation.entries) !== plan.inventorySha256 ||
    JSON.stringify(observation.entries) !== JSON.stringify(plan.entries)
  ) return { result: "fail_closed", code: "staging_mismatch" };
  return planned;
}
