import assert from "node:assert/strict";
import test from "node:test";
import type postgres from "postgres";
import type {AuthPrincipal} from "./auth-foundation.js";
import {createCviGscServerScopeResolver,CVI_GSC_SERVER_SCOPE_RESOLVER_SQL} from "./cvi-gsc-server-scope-resolver.js";
const uuid=(c:string)=>c.repeat(8)+"-"+c.repeat(4)+"-4"+c.repeat(3)+"-8"+c.repeat(3)+"-"+c.repeat(12);
const scope={tenantId:uuid("a"),siteId:uuid("b"),connectionId:uuid("c")};
const principal:AuthPrincipal={
 sessionId:uuid("d"),subject:"verified-subject",role:"viewer",
 email:"user@example.test",displayName:null,csrfTokenHash:"e".repeat(64),
 issuedAt:"2026-10-10T00:00:00.000Z",lastSeenAt:"2026-10-10T00:01:00.000Z",
 expiresAt:"2026-10-10T01:00:00.000Z",
};
const base={acquisitionId:"acq-1",principal,now:"2026-10-10T00:03:00.000Z"};
function fake(rows:unknown[],calls:{sql:string;args:unknown[]}[]) {
 return {unsafe:async(sql:string,args:unknown[])=>{calls.push({sql,args});return rows;}} as unknown as postgres.Sql;
}
test("uses only acquisition locator and server subject/session as parameters; exposes scope only",async()=>{
 const calls:{sql:string;args:unknown[]}[]=[];
 const resolver=createCviGscServerScopeResolver(fake([{...scope,token:"should-not-leak"}],calls));
 assert.deepEqual(await resolver(base),scope);
 assert.deepEqual(calls,[{sql:CVI_GSC_SERVER_SCOPE_RESOLVER_SQL,args:["acq-1","verified-subject",principal.sessionId]}]);
 assert.match(CVI_GSC_SERVER_SCOPE_RESOLVER_SQL,/LIMIT 2 FOR SHARE OF s,c,se,m,g/);
 assert.match(CVI_GSC_SERVER_SCOPE_RESOLVER_SQL,/c.provider='google'/);
 assert.match(CVI_GSC_SERVER_SCOPE_RESOLVER_SQL,/se.revoked_at IS NULL/);
 assert.match(CVI_GSC_SERVER_SCOPE_RESOLVER_SQL,/g.permission='read_evidence'/);
 assert.doesNotMatch(CVI_GSC_SERVER_SCOPE_RESOLVER_SQL,/\b(?:INSERT|UPDATE|DELETE|TRUNCATE)\b/i);
});
test("missing and malformed principal fail before database",async()=>{
 const calls:{sql:string;args:unknown[]}[]=[];
 const resolve=createCviGscServerScopeResolver(fake([scope],calls));
 for(const change of [
  {acquisitionId:" "},{principal:{...principal,subject:""}},
  {principal:{...principal,sessionId:"not-uuid"}},
  {principal:{...principal,expiresAt:"2026-10-10T00:01:00.000Z"}},
  {now:"invalid"},
 ])assert.equal(await resolve({...base,...change}),null);
 assert.equal(calls.length,0);
});
test("absent, duplicate or invalid row fails closed",async()=>{
 for(const rows of [[],[{tenantId:"forged",siteId:scope.siteId,connectionId:scope.connectionId}],
  [scope,scope]]) {
  const resolve=createCviGscServerScopeResolver(fake(rows,[]));
  if(rows.length===2||rows.length===1)await assert.rejects(resolve(base),/cvi_1c21_/);
  else assert.equal(await resolve(base),null);
 }
});
