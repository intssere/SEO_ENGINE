import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here=dirname(fileURLToPath(import.meta.url));
const source=readFileSync(
  join(here,"authority-outreach-draft-candidate-validation.ts"),
  "utf8",
);

test("UGP-10.7 contains no provider/network/database execution primitive",()=>{
  assert.doesNotMatch(source,/OpenAI|Anthropic|Gemini|chat\.completions|responses\.create/i);
  assert.doesNotMatch(source,/fetch\s*\(|axios|undici|got\s*\(/i);
  assert.doesNotMatch(source,/DATABASE_URL|postgres\s*\(|drizzle|sql\s*\x60/i);
  assert.doesNotMatch(source,/process\.env|setTimeout|setInterval|cron|node-cron/i);
  assert.doesNotMatch(source,/worker_threads|child_process|spawn\s*\(|fork\s*\(/i);
});

test("UGP-10.7 remains validation-only and cannot authorize sending",()=>{
  assert.match(source,/candidateValidationOnly:true/);
  assert.match(source,/providerNeutral:true/);
  assert.match(source,/builtInNetworkTransport:false/);
  assert.match(source,/recipientDataAccepted:false/);
  assert.match(source,/contactDiscoveryAuthorized:false/);
  assert.match(source,/modelExecutionAuthorized:false/);
  assert.match(source,/performsModelCall:false/);
  assert.match(source,/performsProviderCall:false/);
  assert.match(source,/performsNetworkOperation:false/);
  assert.match(source,/performsPersistence:false/);
  assert.match(source,/semanticQualityGatePassed:false/);
  assert.match(source,/requiresUGP108SemanticQualityGate:true/);
  assert.match(source,/outreachSendingAuthorized:false/);
  assert.match(source,/publicSiteWrites:false/);
});
