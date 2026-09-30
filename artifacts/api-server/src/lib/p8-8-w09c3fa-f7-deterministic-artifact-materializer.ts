import { createHash } from "node:crypto";
import {
  sourceManifestSha256,
  type SourceManifestEntry,
} from "./p8-8-w09c3fa-f6-source-artifact-provenance.js";

export const SOURCE_ARTIFACT_FORMAT = "seo-engine-source-artifact-v1" as const;

export type SourcePayloadEntry = {
  path: string;
  mode: SourceManifestEntry["mode"];
  content: Uint8Array;
};

export type MaterializedSourceArtifact = {
  format: typeof SOURCE_ARTIFACT_FORMAT;
  manifest: SourceManifestEntry[];
  manifestSha256: string;
  artifactBytes: Uint8Array;
  artifactSha256: string;
};

export type MaterializationResult =
  | { result: "pass"; artifact: MaterializedSourceArtifact }
  | {
      result: "fail_closed";
      code:
        | "invalid_payload"
        | "unsafe_path"
        | "unsupported_mode"
        | "duplicate_or_unsorted_path"
        | "content_mismatch"
        | "manifest_invalid";
    };

const ALLOWED_MODES = new Set(["100644", "100755", "120000"]);
const SAFE_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.?\/)(?!.*\\)(?!.*\/\/)[^\0]+$/;
const encoder = new TextEncoder();

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function u32(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value, false);
  return out;
}

function u64(value: number): Uint8Array {
  const out = new Uint8Array(8);
  const view = new DataView(out.buffer);
  view.setBigUint64(0, BigInt(value), false);
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

function encodeEntry(entry: SourcePayloadEntry): Uint8Array {
  const path = encoder.encode(entry.path);
  const mode = encoder.encode(entry.mode);
  return concat([
    u32(path.byteLength),
    path,
    u32(mode.byteLength),
    mode,
    u64(entry.content.byteLength),
    entry.content,
  ]);
}

export function materializeSourceArtifact(payload: unknown): MaterializationResult {
  if (!Array.isArray(payload) || payload.length === 0) {
    return { result: "fail_closed", code: "invalid_payload" };
  }

  const manifest: SourceManifestEntry[] = [];
  const encodedEntries: Uint8Array[] = [];
  let previousPath = "";

  for (const candidate of payload) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      return { result: "fail_closed", code: "invalid_payload" };
    }
    const raw = candidate as Record<string, unknown>;
    if (Object.keys(raw).sort().join(",") !== "content,mode,path" ||
        typeof raw.path !== "string" ||
        typeof raw.mode !== "string" ||
        !(raw.content instanceof Uint8Array)) {
      return { result: "fail_closed", code: "invalid_payload" };
    }
    if (!SAFE_PATH.test(raw.path)) {
      return { result: "fail_closed", code: "unsafe_path" };
    }
    if (!ALLOWED_MODES.has(raw.mode)) {
      return { result: "fail_closed", code: "unsupported_mode" };
    }
    if (raw.path <= previousPath) {
      return { result: "fail_closed", code: "duplicate_or_unsorted_path" };
    }
    previousPath = raw.path;

    const entry = candidate as SourcePayloadEntry;
    manifest.push({
      path: entry.path,
      mode: entry.mode,
      size: entry.content.byteLength,
      contentSha256: sha256(entry.content),
    });
    encodedEntries.push(encodeEntry(entry));
  }

  const manifestSha256 = sourceManifestSha256(manifest);
  if (!manifestSha256) return { result: "fail_closed", code: "manifest_invalid" };

  const header = encoder.encode(SOURCE_ARTIFACT_FORMAT + "\n");
  const artifactBytes = concat([header, u32(encodedEntries.length), ...encodedEntries]);

  return {
    result: "pass",
    artifact: {
      format: SOURCE_ARTIFACT_FORMAT,
      manifest,
      manifestSha256,
      artifactBytes,
      artifactSha256: sha256(artifactBytes),
    },
  };
}

export function verifyMaterializedSourceArtifact(
  payload: unknown,
  expectedManifest: SourceManifestEntry[],
  expectedManifestSha256: string,
  expectedArtifactSha256?: string,
): MaterializationResult {
  const materialized = materializeSourceArtifact(payload);
  if (materialized.result !== "pass") return materialized;

  const actual = materialized.artifact;
  if (
    actual.manifestSha256 !== expectedManifestSha256 ||
    JSON.stringify(actual.manifest) !== JSON.stringify(expectedManifest)
  ) return { result: "fail_closed", code: "content_mismatch" };

  if (expectedArtifactSha256 !== undefined && actual.artifactSha256 !== expectedArtifactSha256) {
    return { result: "fail_closed", code: "content_mismatch" };
  }
  return materialized;
}
