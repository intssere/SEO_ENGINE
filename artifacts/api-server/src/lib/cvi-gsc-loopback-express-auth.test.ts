import assert from "node:assert/strict";
import test from "node:test";
import { createServer, type Server } from "node:http";
import express from "express";
import cookieParser from "cookie-parser";
import { attachAuthSession, requireApiAuthentication } from "../middlewares/auth-security.js";
import { loadAuthConfig } from "./auth-foundation.js";
import { reviewCviExpressAuthenticatedPrincipal } from "./cvi-gsc-express-auth-gate.js";

const AUTH_ENV = {
 AUTH_ENFORCEMENT_ENABLED:"true",
 AUTH_PUBLIC_ORIGIN:"https://example.test",
 AUTH_GOOGLE_CLIENT_ID:"offline.apps.googleusercontent.com",
 AUTH_GOOGLE_CLIENT_SECRET:"offline-test-secret",
 AUTH_SESSION_SECRET:"0123456789abcdef0123456789abcdef0123456789abcdef",
 AUTH_ADMIN_EMAILS:"admin@example.test",
} as const;
type HttpResult = {status:number;body:unknown};
async function runLoopback(input:Readonly<{
 enabled:boolean; configured:boolean; headers?:Record<string,string>;
}>):Promise<HttpResult>{
 const changed=new Map<string,string|undefined>();
 for(const key of Object.keys(AUTH_ENV)) {
  changed.set(key,process.env[key]);
  process.env[key]=AUTH_ENV[key as keyof typeof AUTH_ENV];
 }
 if(!input.enabled) process.env.AUTH_ENFORCEMENT_ENABLED="false";
 if(!input.configured) process.env.AUTH_SESSION_SECRET="tiny";
 // For this test, no database URL is needed. Missing/forged cookies never
 // qualify for loadAuthSession database lookup.
 const app=express();
 app.use(cookieParser());
 app.use(attachAuthSession);
 const api=express.Router();
 api.use(requireApiAuthentication);
 api.get("/cvi-offline-probe", (req,res)=>{
  const verdict=reviewCviExpressAuthenticatedPrincipal({
   req,config:loadAuthConfig(),evaluatedAt:new Date().toISOString(),
  });
  return res.status(verdict.status==="DENY"?403:200).json({
   status:verdict.status,
   reason:verdict.status==="DENY"?verdict.reason:null,
  });
 });
 app.use("/api",api);
 const server:Server=createServer(app);
 try {
  await new Promise<void>((resolve,reject)=>{
   server.once("error",reject);
   server.listen(0,"127.0.0.1",resolve);
  });
  const address=server.address();
  assert.ok(address && typeof address!=="string");
  const response=await fetch("http://127.0.0.1:"+address.port+"/api/cvi-offline-probe",{
   headers:input.headers??{},
   signal:AbortSignal.timeout(5000),
  });
  return {status:response.status,body:await response.json()};
 }finally{
  await new Promise<void>(resolve=>server.close(()=>resolve()));
  for(const [key,value] of changed) {
   if(value===undefined) delete process.env[key];
   else process.env[key]=value;
  }
 }
}
test("CVI-1C.26 genuine middleware path denies anonymous browser request",async()=>{
 const result=await runLoopback({enabled:true,configured:true});
 assert.equal(result.status,401);
 assert.deepEqual(result.body,{error:"authentication_required"});
});
test("CVI-1C.26 rejects forged identity headers and forged session cookie",async()=>{
 const result=await runLoopback({
  enabled:true,configured:true,
  headers:{"x-replit-user-id":"admin","x-auth-subject":"forged",
   cookie:"seo_engine_session=forged-session"},
 });
 assert.equal(result.status,401);
 assert.deepEqual(result.body,{error:"authentication_required"});
});
test("CVI-1C.26 optional generic authentication cannot bypass dedicated CVI gate",async()=>{
 const result=await runLoopback({enabled:false,configured:true});
 assert.equal(result.status,403);
 assert.deepEqual(result.body,{
  status:"DENY",reason:"cvi_auth_must_be_enabled_and_configured",
 });
});
test("CVI-1C.26 misconfigured auth fails closed before the probe",async()=>{
 const result=await runLoopback({enabled:true,configured:false});
 assert.equal(result.status,503);
 assert.deepEqual(result.body,{error:"authentication_configuration_invalid"});
});
