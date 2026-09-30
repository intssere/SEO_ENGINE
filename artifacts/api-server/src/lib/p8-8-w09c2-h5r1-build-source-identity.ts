import { execFileSync } from "node:child_process";

export type BuildSourceIdentity = {
  canonical_commit_sha: string;
  canonical_tree_sha: string;
  source_branch: string;
  source: "explicit" | "git";
};

export type BuildSourceIdentityResult =
  | { result: "pass"; code: "ok"; identity: BuildSourceIdentity }
  | { result: "fail_closed"; code: "partial_explicit_identity" | "invalid_explicit_identity" | "git_identity_unavailable" | "dirty_source_tree" };

const SHA40 = /^[0-9a-f]{40}$/;
const BRANCH = /^(?!\/)(?!.*\.\.)(?!.*(?:^|\/)\.)(?!.*[~^:?*\\\[\]\s])(?!.+\/$).+$/;

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
  const supplied = explicit.filter((value) => value !== undefined && value !== "").length;

  if (supplied > 0 && supplied < 3) {
    return { result: "fail_closed", code: "partial_explicit_identity" };
  }
  if (supplied === 3) {
    const [commit, tree, branch] = explicit as [string, string, string];
    if (!SHA40.test(commit) || !SHA40.test(tree) || !BRANCH.test(branch)) {
      return { result: "fail_closed", code: "invalid_explicit_identity" };
    }
    return {
      result: "pass",
      code: "ok",
      identity: {
        canonical_commit_sha: commit,
        canonical_tree_sha: tree,
        source_branch: branch,
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
    if (!SHA40.test(commit) || !SHA40.test(tree) || !BRANCH.test(branch)) {
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
