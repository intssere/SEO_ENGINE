import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source=readFileSync(new URL("./controlled-git-connector.ts",import.meta.url),"utf8");
test("UGP-4.3 implementation contains no transport, shell, fs mutation, credentials or persistence path",()=>{for(const token of ["fetch(","axios","@octokit","child_process","exec(","spawn(","simple-git","process.env","writeFile","unlink(","drizzle","postgres"])assert.equal(source.includes(token),false,token);assert.match(source,/networkEnabled:false/);assert.match(source,/gitExecutionEnabled:false/);assert.match(source,/directDefaultBranchWrite:false/);});
