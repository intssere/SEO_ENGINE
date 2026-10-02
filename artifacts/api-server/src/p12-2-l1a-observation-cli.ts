import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import {
  runP122L1AE6DisposableRunner,
} from "./lib/p12-2-l1a-e6-disposable-railway-runner.js";
import type {
  P122L1AE3ExecInput,
  P122L1AE3ExecResult,
} from "./lib/p12-2-l1a-e3-credential-runner-contract.js";
import {
  assertP122L1AE9NoCredentialArgv,
  buildP122L1AE9PsqlConnectionEnv,
} from "./lib/p12-2-l1a-e9-runtime-transport.js";

const MAX_OUTPUT_BYTES = 262_144;

async function psqlAvailable(): Promise<boolean> {
  try {
    await access("/usr/bin/psql", constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function boundedAppend(current: string, chunk: Buffer): { value: string; overflow: boolean } {
  const next = current + chunk.toString("utf8");
  if (Buffer.byteLength(next, "utf8") > MAX_OUTPUT_BYTES) {
    return { value: next.slice(0, MAX_OUTPUT_BYTES), overflow: true };
  }
  return { value: next, overflow: false };
}

async function executePsql(input: P122L1AE3ExecInput): Promise<P122L1AE3ExecResult> {
  if (input.executable !== "psql") {
    throw new Error("p12_2_l1a_e6_unexpected_executable");
  }

  assertP122L1AE9NoCredentialArgv(input.args, input.env.DATABASE_URL);
  const connectionEnv = buildP122L1AE9PsqlConnectionEnv(input.env.DATABASE_URL);
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ...connectionEnv,
  };
  delete childEnv.DATABASE_URL;

  return await new Promise((resolve, reject) => {
    const child = spawn("/usr/bin/psql", [...input.args], {
      shell: false,
      env: childEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let overflow = false;

    child.stdout.on("data", (chunk: Buffer) => {
      const next = boundedAppend(stdout, chunk);
      stdout = next.value;
      overflow ||= next.overflow;
      if (overflow) child.kill("SIGTERM");
    });

    child.stderr.on("data", (chunk: Buffer) => {
      const next = boundedAppend(stderr, chunk);
      stderr = next.value;
      overflow ||= next.overflow;
      if (overflow) child.kill("SIGTERM");
    });

    child.once("error", reject);
    child.once("close", (code) => {
      if (overflow) {
        resolve({
          exitCode: 70,
          stdout,
          stderr: `${stderr}\np12_2_l1a_e6_output_limit_exceeded`,
        });
        return;
      }
      resolve({
        exitCode: typeof code === "number" ? code : 71,
        stdout,
        stderr,
      });
    });
  });
}

async function main(): Promise<void> {
  try {
    const receipt = await runP122L1AE6DisposableRunner({
      env: process.env,
      executor: executePsql,
      psqlAvailable: await psqlAvailable(),
    });
    process.stdout.write(`${JSON.stringify(receipt)}\n`);
    // Once E5 returns, the live SQL attempt has crossed the executor boundary.
    // Exit successfully even for a bounded SQL failure so Railway does not
    // replay an already-consumed one-shot attempt because of process status.
    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : "p12_2_l1a_e6_unknown_error";
    process.stderr.write(`${JSON.stringify({
      version: "p12-2-l1a-e6-disposable-railway-runner-v1",
      completed: false,
      error: message,
      credentialMaterialRecorded: false,
    })}\n`);
    process.exitCode = 1;
  }
}

void main();
