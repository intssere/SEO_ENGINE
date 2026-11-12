import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const manifest = JSON.parse(readFileSync(new URL("./int-02a-ugp-migration-source-map.json", import.meta.url)));
assert.equal(manifest.status, "DESIGN_ONLY_NOT_APPROVED_FOR_EXECUTION");
const ugp = manifest.pinnedUgpHead;
assert.match(ugp, /^[a-f0-9]{40}$/);
const git = (...args) => execFileSync("git", args, {encoding:"utf8"}).trim();
const sourceBytes = (...args) => execFileSync("git", args);
const main = manifest.mainHead;
for(const entry of manifest.entries) {
 const source = "lib/db/migrations/"+entry.original;
 const target = "lib/db/migrations/"+entry.candidate;
 const actualBlob = git("rev-parse",ugp+":"+source);
 assert.equal(actualBlob,entry.gitBlobSha1,source+" blob mismatch");
 const actualHash = createHash("sha256").update(sourceBytes("show",ugp+":"+source)).digest("hex");
 assert.equal(actualHash,entry.rawSha256,source+" SHA256 mismatch");
 const mainFiles = git("ls-tree","-r","--name-only",main,"lib/db/migrations").split("\n");
 assert.ok(!mainFiles.includes(target),target+" collides with main");
 const stagedBytes = readFileSync(new URL("../../lib/db/migrations/"+entry.candidate,import.meta.url));
 assert.equal(createHash("sha256").update(stagedBytes).digest("hex"),entry.rawSha256,target+" staged SHA256 mismatch");
 assert.equal(git("hash-object","lib/db/migrations/"+entry.candidate),entry.gitBlobSha1,target+" staged Git blob mismatch");
 console.log("VERIFIED",entry.original,"->",entry.candidate,actualHash);
}
const mainMigrationPaths = git("ls-tree","-r","--name-only",main,"lib/db/migrations").split("\n");
for (const n of ["0008","0009","0010","0011"]) {
 assert.ok(mainMigrationPaths.some(p=>p.split("/").at(-1).startsWith(n+"_")), "missing main migration "+n);
}
console.log("INT-02A_UPSTREAM_SOURCE_MAPPING_PASS_NO_SQL_EXECUTED");
