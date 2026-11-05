/** RT01-A12.6: offline repo-source audit, no DB clients, network or env credentials. */
import assert from "node:assert/strict";
import {readFile,readdir} from "node:fs/promises";
import test from "node:test";
import {assessCompatibility,type SourceSnapshot}
  from "./pilot-01-rt01a12-6-source-compat-audit.js";

const at=(p:string)=>new URL("../../../"+p,import.meta.url);
async function snapshot():Promise<SourceSnapshot>{
  const paths={
    core:"lib/db/migrations/0001_core.sql",
    auth:"lib/db/migrations/0002_auth.sql",
    candidate:"docs/sql-candidates/rt01-a12-1-pilot01-additive.sql",
    adapter:"lib/db/src/pilot-01-rt01a12-5-disposable-transactional-adapter.ts",
    authFoundation:"artifacts/api-server/src/lib/auth-foundation.ts",
    trustedBoundary:"artifacts/api-server/src/lib/pilot-01-rt01a11-trusted-runtime-boundary.ts",
    trustedSite:"artifacts/api-server/src/lib/pilot-01-trusted-site-context.ts",
    pilotQueue:"artifacts/api-server/src/lib/pilot-orchestration.ts",
    worker:"artifacts/api-server/src/lib/recommendation-generation-worker.ts",
    schemaIndex:"lib/db/src/schema/index.ts",
  } as const;
  const pairs=await Promise.all(Object.entries(paths).map(async([k,p])=>
    [k,await readFile(at(p),"utf8")] as const));
  const migrations=await readdir(at("lib/db/migrations"));
  const sourceFiles=Object.fromEntries(pairs) as Record<keyof typeof paths,string>;
  return {...sourceFiles,migrationPaths:migrations};
}
const byId=(s:SourceSnapshot,id:string)=>
  assessCompatibility(s).find(f=>f.id===id);

test("A12.6 source inventory remains blocked, never declares production ready",async()=>{
  const s=await snapshot();
  const f=assessCompatibility(s);
  assert.equal(f.length,19);
  assert.equal(new Set(f.map(x=>x.id)).size,f.length);
  for(const id of ["SESSION_NOT_MEMBERSHIP","ISSUER_CUSTODY","ROLE_POLICY",
    "LEGACY_QUEUE_ISOLATION","FULL_MIGRATION_DRIFT",
    "WORKER_CREDENTIAL_BOUNDARY","CANDIDATE_NOT_INSTALLED"]){
    assert.ok(f.find(x=>x.id===id)?.blocked,id+" must not be cleared from source-only evidence");
  }
  assert.equal(byId(s,"CANONICAL_UUID")?.blocked,false);
  assert.equal(byId(s,"COMPOSITE_SITE_SCOPE")?.blocked,false);
  assert.equal(byId(s,"OPERATION_DENY")?.blocked,false);
  assert.equal(byId(s,"TRANSACTION_SHAPE")?.blocked,false);
  assert.equal(byId(s,"FENCED_DB_CLOCK")?.blocked,false);
  assert.equal(byId(s,"NO_OUTBOX_DISPATCH")?.blocked,false);
  assert.equal(byId(s,"MIGRATION_LANE")?.blocked,false);
  assert.equal(byId(s,"AUTH_ENFORCEMENT_RUNTIME")?.blocked,false);
  assert.equal(byId(s,"SCHEMA_INDEX")?.blocked,false);
  assert.match(s.pilotQueue,/setImmediate\(/);
  assert.match(s.pilotQueue,/interval '20 minutes'/);
  assert.match(s.worker,/liveWorkerEnabled:\s*false as const/);
});
test("A12.6 mutation checks catch tenant FK and security boundary regressions",async()=>{
  const s=await snapshot();
  const cases:[keyof SourceSnapshot,string,string,string][]=[
    ["candidate","FOREIGN KEY (organization_id,site_id)","FOREIGN KEY (site_id)","COMPOSITE_SITE_SCOPE"],
    ["candidate","operation IN ('analyze','recommend')","operation IN ('site_write')","OPERATION_DENY"],
    ["candidate","ALTER TABLE pilot01.outbox FORCE ROW LEVEL SECURITY;","","FORCE_RLS_SHAPE"],
    ["adapter","lease_expires_at>clock_timestamp()","lease_expires_at IS NOT NULL","FENCED_DB_CLOCK"],
    ["adapter",'kind==="outbox_eligible")return {status:"denied"}','kind==="outbox_eligible")return {status:"applied"}',"NO_OUTBOX_DISPATCH"],
    ["adapter","INSERT INTO pilot01.admissions","INSERT INTO pilot01.orphan_receipts","TRANSACTION_SHAPE"],
    ["trustedBoundary","DISCONNECTED, MOCK-BACKED","fully-live","PRINCIPAL_MARKER_NOT_AUTH"],
  ];
  for(const [file,needle,replacement,id] of cases){
    const original=s[file];
    assert.equal(typeof original,"string");
    assert.ok((original as string).includes(needle),id+": fixture absent");
    const mutated={...s,[file]:(original as string).replace(needle,replacement)};
    assert.equal(byId(mutated,id)?.blocked,true,id+" regression not detected");
  }
});
test("A12.6 migration and runtime-export drift are detected",async()=>{
  const s=await snapshot();
  assert.equal(byId({...s,migrationPaths:[...s.migrationPaths,"0012_pilot01_live.sql"]},"MIGRATION_LANE")?.blocked,true);
  assert.equal(byId({...s,schemaIndex:'export * from "./pilot-runtime.js";'},"SCHEMA_INDEX")?.blocked,true);
  assert.equal(byId({...s,authFoundation:s.authFoundation.replace("AUTH_ENFORCEMENT_ENABLED","AUTH_DISABLED")},"AUTH_ENFORCEMENT_RUNTIME")?.blocked,true);
});
