import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import {
  P12_2_L10_13C_A_ENVIRONMENT_ID,
  P12_2_L10_13C_A_MIGRATION_BLOB_SHA,
  P12_2_L10_13C_A_MIGRATION_PATH,
  P12_2_L10_13C_A_MIGRATION_SHA256,
  P12_2_L10_13C_A_POSTGRES_SERVICE_ID,
  P12_2_L10_13C_A_PROJECT_ID,
  P12_2_L10_13C_A_QUERIES,
  P12_2_L10_13C_A_VERSION,
  assertP122L1013CAQueryContract,
  p122L1013CAAuthorizationLiteral,
  p122L1013CAQuerySetFingerprint,
} from "./lib/p12-2-l10-13c-a-0010-readonly-certification.js";
import { assertP122L1AE9NoCredentialArgv,buildP122L1AE9PsqlConnectionEnv } from "./lib/p12-2-l1a-e9-runtime-transport.js";
const MAX_OUTPUT_BYTES=262144;
async function psqlAvailable(){try{await access("/usr/bin/psql",constants.X_OK);return true;}catch{return false;}}
function required(name:string){const value=process.env[name]?.trim()??"";if(!value)throw new Error("p12_2_l10_13c_a_missing_env_"+name.toLowerCase());return value;}
function exact(a:string,e:string,c:string){if(a!==e)throw new Error(c);}
function sanitize(v:string,d:string){return v?v.split(d).join("[REDACTED_DATABASE_URL]"):"";}
async function executeQuery(databaseUrl:string,sql:string){const args=["--no-psqlrc","--set","ON_ERROR_STOP=1","--tuples-only","--csv","--command",sql];assertP122L1AE9NoCredentialArgv(args,databaseUrl);const childEnv:NodeJS.ProcessEnv={...process.env,...buildP122L1AE9PsqlConnectionEnv(databaseUrl),PGOPTIONS:"-c default_transaction_read_only=on -c statement_timeout=15000"};delete childEnv.DATABASE_URL;return await new Promise<{exitCode:number;stdout:string;stderr:string}>((resolve,reject)=>{const child=spawn("/usr/bin/psql",args,{shell:false,env:childEnv,stdio:["ignore","pipe","pipe"]});let stdout="",stderr="",overflow=false;const add=(cur:string,ch:Buffer)=>{const next=cur+ch.toString("utf8");if(Buffer.byteLength(next,"utf8")>MAX_OUTPUT_BYTES){overflow=true;return next.slice(0,MAX_OUTPUT_BYTES);}return next;};child.stdout.on("data",(c:Buffer)=>{stdout=add(stdout,c);if(overflow)child.kill("SIGTERM");});child.stderr.on("data",(c:Buffer)=>{stderr=add(stderr,c);if(overflow)child.kill("SIGTERM");});child.once("error",reject);child.once("close",code=>resolve({exitCode:overflow?70:(typeof code==="number"?code:71),stdout:sanitize(stdout,databaseUrl),stderr:sanitize(stderr,databaseUrl)}));});}
async function main(){assertP122L1013CAQueryContract();exact(required("RAILWAY_PROJECT_ID"),P12_2_L10_13C_A_PROJECT_ID,"p12_2_l10_13c_a_project_mismatch");exact(required("RAILWAY_ENVIRONMENT_ID"),P12_2_L10_13C_A_ENVIRONMENT_ID,"p12_2_l10_13c_a_environment_mismatch");exact(required("P12_2_L10_13C_A_POSTGRES_SERVICE_ID"),P12_2_L10_13C_A_POSTGRES_SERVICE_ID,"p12_2_l10_13c_a_postgres_service_mismatch");exact(required("P12_2_L10_13C_A_AUTHORIZATION_LITERAL"),p122L1013CAAuthorizationLiteral(),"p12_2_l10_13c_a_authorization_mismatch");const databaseUrl=required("DATABASE_URL");if(!/^postgres(?:ql)?:\/\//i.test(databaseUrl))throw new Error("p12_2_l10_13c_a_database_url_scheme_invalid");if(!(await psqlAvailable()))throw new Error("p12_2_l10_13c_a_psql_unavailable");const queryReceipts=[];for(let i=0;i<P12_2_L10_13C_A_QUERIES.length;i++){const q=P12_2_L10_13C_A_QUERIES[i]!;const result=await executeQuery(databaseUrl,q.sql);queryReceipts.push({ordinal:i+1,queryId:q.id,...result});if(result.exitCode!==0)break;}const completed=queryReceipts.length===P12_2_L10_13C_A_QUERIES.length&&queryReceipts.every(r=>r.exitCode===0);process.stdout.write(JSON.stringify({version:P12_2_L10_13C_A_VERSION,projectId:P12_2_L10_13C_A_PROJECT_ID,environmentId:P12_2_L10_13C_A_ENVIRONMENT_ID,postgresServiceId:P12_2_L10_13C_A_POSTGRES_SERVICE_ID,migrationPath:P12_2_L10_13C_A_MIGRATION_PATH,migrationBlobSha:P12_2_L10_13C_A_MIGRATION_BLOB_SHA,migrationSha256:P12_2_L10_13C_A_MIGRATION_SHA256,querySetFingerprint:p122L1013CAQuerySetFingerprint(),authorizationLiteral:p122L1013CAAuthorizationLiteral(),completed,queryReceipts,attempts:1,retries:0,fallbackTransportUsed:false,credentialMaterialRecorded:false,sessionReadOnly:true})+"\n");process.exitCode=completed?0:1;}
main().catch(error=>{const message=error instanceof Error&&/^[a-z0-9_:-]+$/.test(error.message)?error.message:"p12_2_l10_13c_a_bounded_failure";process.stderr.write(JSON.stringify({version:P12_2_L10_13C_A_VERSION,completed:false,error:message,credentialMaterialRecorded:false,sessionReadOnly:true})+"\n");process.exitCode=1;});
