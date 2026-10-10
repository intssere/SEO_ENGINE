import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const base = new URL("../", import.meta.url);
const load = async (relative: string): Promise<string> =>
 readFile(fileURLToPath(new URL(relative, base)), "utf8");
function ordered(source:string, markers:readonly string[],label:string):void {
 let last=-1;
 for(const marker of markers){
  const at=source.indexOf(marker,last+1);
  assert.ok(at>=0,label+": required marker/order changed: "+marker);
  last=at;
 }
}
test("CVI-1C.25 Express mounts cookie parser and auth session before API router",async()=>{
 const source=await load("app.ts");
 ordered(source,[
  "app.use(cookieParser());",
  "app.use(attachAuthSession);",
  'app.use("/api", router);',
 ],"express request authentication");
 assert.match(source,/import\s*\{[\s\S]*attachAuthSession[\s\S]*\}\s*from\s*["']\.\/middlewares\/auth-security\.js["']/);
});
test("CVI-1C.25 general API routes pass auth enforcement before business routers",async()=>{
 const source=await load("routes/index.ts");
 ordered(source,[
  "router.use(authRouter);",
  "router.use(requireApiAuthentication);",
  "router.use(dashboardRouter);",
  "router.use(connectionsRouter);",
  "router.use(executionRouter);",
 ],"API authorization chain");
 assert.doesNotMatch(source,/router\.use\([^;\n]*(?:cvi|gsc)/i,
  "CVI historical-readback is not authorized for public routing");
});
test("CVI-1C.25 optional general auth remains fenced by CVI fail-closed requirement",async()=>{
 const shared=await load("middlewares/auth-security.ts");
 const gate=await load("lib/cvi-gsc-express-auth-gate.ts");
 assert.match(shared,/if\s*\(!config\.enabled\)\s*return next\(\)/,
  "general auth has an intentionally optional mode that CVI must reject");
 assert.match(gate,/input\.config\.enabled!==true\|\|input\.config\.configured!==true/);
 assert.match(gate,/req:input\.req/);
 assert.doesNotMatch(gate,/req\.(?:body|query|headers)\b/,
  "CVI principal must not derive from client-controlled fields");
});
test("CVI-1C.25 private historical pipeline remains without provider request or route mount",async()=>{
 const composition=await load("lib/cvi-gsc-private-express-db-composition.ts");
 const scope=await load("lib/cvi-gsc-server-scope-resolver.ts");
 assert.match(composition,/reviewCviExpressAuthenticatedPrincipal/);
 assert.match(composition,/createCviGscServerScopeResolver/);
 assert.match(composition,/createCviScopedPostgresReadbackStore/);
 assert.match(composition,/reconcileCviGscScopedReadback/);
 assert.doesNotMatch(composition,/\b(?:Router|express\.Router|fetch|axios|request)\s*\(/);
 assert.match(scope,/AND a\.auth_session_id=\$3::uuid/);
 assert.match(scope,/g\.permission='read_evidence'/);
 assert.match(scope,/LIMIT 2 FOR SHARE OF s,c,se,m,g/);
});
