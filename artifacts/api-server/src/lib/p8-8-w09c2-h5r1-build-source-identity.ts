import { execFileSync } from "node:child_process";

export type BuildSourceIdentity = {
  canonical_commit_sha: string;
  canonical_tree_sha: string;
  source_branch: string;
  source: "explicit" | "git";
};

export type BuildSourceIdentityResult =
  | { result: "pass"; code: "ok"; identity: BuildSourceIdentity }
  | { result: "fail_closed"; code: "partial_explicit_identity" | "git_identity_unavailable" | "dirty_source_tree" };

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

export function resolveBuildSourceIdentity(
  env: NodeJS.ProcessEnv = process.env,
  gitRead: (args: string[]) => string = git,
): BuildSourceIdentityResult {
  const explicit = [
    env.EXPECTED_CANONICAL_COMMIT,
    env.EXPECTED_CANONICAL_TREE,
    env.EXPECTED_SOURCE_BRANCH,
  ];
  const supplied = explicit.filter(Boolean).length;

  if (supplied > 0 && supplied < 3) {
    return { result: "fail_closed", code: "partial_explicit_identity" };
  }
  if (supplied === 3) {
    return {
      result: "pass",
      code: "ok",
      identity: {
        canonical_commit_sha: explicit[0]!,
        canonical_tree_sha: explicit[1]!,
        source_branch: explicit[2]!,
        source: "explicit",
      },
    };
  }

  try {
    if (gitRead(["status", "--porcelain", "--untracked-files=no"]) !== "") {
      return { result: "fail_closed", code: "dirty_source_tree" };
    }
    const commit = gitRead(["rev-parse", "HEAD"]);
    const tree = gitRead(["rev-parse", "HEAD^{tree}"]);
    const branch = gitRead(["symbolic-ref", "--quiet", "--short", "HEAD"]);
    if (!commit || !tree || !branch) {
      return { result: "fail_closed", code: "git_identity_unavailable" };
    }
    return {
      result: "pass",
      code: "ok",
      identity: {
        canonical_commit_sha: commit,
        canonical_tree_sha: tree,
        source_branch: branch,
        source: "git",
      },
    };
  } catch {
    return { result: "fail_closed", code: "git_identity_unavailable" };
  }
}
