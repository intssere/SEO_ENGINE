import test from "node:test";
import assert from "node:assert/strict";
import {readFile,readdir} from "node:fs/promises";
import {sourceGate,reconcileEvidence,operationalCompatibility,type SourceMigration}
 from "./pilot-01-rt01a12-23-migration-lineage-gate.js";
async function load():Promise<{canonical:SourceMigration[];candidates:SourceMigration[]}>{
  const canonical:SourceMigration[]=[];
  for(const name of (await readdir(new URL("../migrations/",import.meta.url))).filter(n=>/^\d{4}_.*\.sql$/.test(n)).sort())
    canonical.push({name,sql:await readFile(new URL("../migrations/"+name,import.meta.url),"utf8")});
  const candidates:SourceMigration[]=[];
  for(const name of ["rt01-a12-1-pilot01-additive.sql",
    "rt01-a12-14-canonical-membership-issuer-revocation-additive.sql",
    "rt01-a12-16-custody-integrity-enforcement-additive.sql",
    "rt01-a12-21-isolated-role-rls-default-deny.sql"])
    candidates.push({name,sql:await readFile(
      new URL("../../../docs/sql-candidates/"+name,import.meta.url),"utf8")});
  return {canonical,candidates};
}
test("A12.23 canonical repository numbering and isolation of SQL candidates",async()=>{
  const s=await load(),g=sourceGate(s.canonical,s.candidates);
  assert.equal(g.status,"pass",g.issues.join(","));
  assert.deepEqual(g.inventory.map(x=>Number(x.name.slice(0,4))),
    [1,2,3,4,5,6,7,8,9,10,11]);
  assert.ok(g.inventory.every(x=>/^[a-f0-9]{64}$/.test(x.sha256)));
  assert.equal(operationalCompatibility,"BLOCKED_UNVERIFIED_INSTALLED_HISTORY");
  // An unknown database is blocked, not automatically assumed clean.
  const unknown=reconcileEvidence(g,[]);
  assert.equal(unknown.status,"blocked");
  assert.equal(unknown.issues.filter(x=>x.startsWith("MISSING_INSTALLED_RECEIPT")).length,11);
});
test("A12.23 rejects duplicate version, sequence gaps, candidate collision and destructive SQL",async()=>{
  const s=await load(),x=s.canonical[0],dup={...x,name:"0001_conflicting.sql"};
  const g=sourceGate([...s.canonical,dup],s.candidates);
  assert.ok(g.issues.some(x=>x==="DUPLICATE_MIGRATION_ID:1"));
  assert.ok(sourceGate(s.canonical.slice(1),s.candidates).issues.includes("MISSING_CANONICAL:1"));
  const bad=sourceGate(s.canonical,[...s.candidates,
    {name:"0012_accidental.sql",sql:"BEGIN; DROP TABLE public.sites; COMMIT;"}]);
  assert.ok(bad.issues.some(x=>x.startsWith("CANDIDATE_ENTERED_MIGRATION_NAMESPACE")));
  assert.ok(bad.issues.some(x=>x.startsWith("DESTRUCTIVE_CANDIDATE")));
});
test("A12.23 rejects forged and conflicted main/UGP historical receipts",async()=>{
  const s=await load(),g=sourceGate(s.canonical,s.candidates);
  const receipts=g.inventory.map(x=>({...x,namespace:"canonical-main" as const,witness:"untrusted-synthetic-only"}));
  assert.equal(reconcileEvidence(g,receipts).status,"pass");
  assert.ok(reconcileEvidence(g,[...receipts,{...receipts[7],
    namespace:"legacy-ugp"}]).issues.some(x=>x.startsWith("FOREIGN_LINEAGE")));
  assert.ok(reconcileEvidence(g,[...receipts,{...receipts[7],
    namespace:"integrated-ugp"}]).issues.some(x=>x.startsWith("FOREIGN_LINEAGE")));
  assert.ok(reconcileEvidence(g,[...receipts,{...receipts[7]}]).issues.some(x=>x.startsWith("DUPLICATE_LEDGER")));
  assert.ok(reconcileEvidence(g,receipts.map((x,i)=>i===7?{...x,sha256:"f".repeat(64)}:x))
    .issues.some(x=>x.startsWith("CHECKSUM_OR_NAME_MISMATCH")));
  assert.ok(reconcileEvidence(g,receipts.map((x,i)=>i===7?{...x,witness:""}:x))
    .issues.some(x=>x.startsWith("MISSING_INDEPENDENT_WITNESS")));
});
