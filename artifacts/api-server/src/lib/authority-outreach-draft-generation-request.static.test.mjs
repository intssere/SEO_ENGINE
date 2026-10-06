import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here=dirname(fileURLToPath(import.meta.url));
const source=readFileSync(
  join(here,"authority-outreach-draft-generation-request.ts"),
  "utf8",
);

test("UGP-10.6 contains no model/provider/network/database execution primitive",()=>{
  assert.doesNotMatch(source,/OpenAI|Anthropic|Gemini|chat\.completions|responses\.create/i);
  assert.doesNotMatch(source,/fetch\s*\(|axios|undici|got\s*\(/i);
  assert.doesNotMatch(source,/DATABASE_URL|postgres\s*\(|drizzle|sql\s*\`/i);
  assert.doesNotMatch(source,/process\.env|setTimeout|setInterval|cron|node-cron/i);
  assert.doesNotMatch(source,/worker_threads|child_process|spawn\s*\(|fork\s*\(/i);
});

test("UGP-10.6 capability remains request-only and recipient-free",()=>{
  assert.match(source,/requestEnvelopeOnly:true/);
  assert.match(source,/recipientDataIncluded:false/);
  assert.match(source,/contactDiscoveryAuthorized:false/);
  assert.match(source,/outreachDraftTextGenerationAuthorized:false/);
  assert.match(source,/modelExecutionAuthorized:false/);
  assert.match(source,/performsModelCall:false/);
  assert.match(source,/performsProviderCall:false/);
  assert.match(source,/performsNetworkOperation:false/);
  assert.match(source,/performsPersistence:false/);
  assert.match(source,/outreachSendingAuthorized:false/);
  assert.match(source,/publicSiteWrites:false/);
  assert.match(source,/linkSchemeAutomationAuthorized:false/);
});

test("UGP-10.6 request constraints prohibit contact invention and link-scheme offers",()=>{
  assert.match(source,/doNotInventRecipientIdentity:true/);
  assert.match(source,/doNotInventContactDetails:true/);
  assert.match(source,/doNotUsePrivateOrUnverifiedContactData:true/);
  assert.match(source,/doNotOfferPaymentForLinks:true/);
  assert.match(source,/doNotOfferReciprocalLinks:true/);
  assert.match(source,/humanReviewRequiredBeforeSend:true/);
  assert.match(source,/sendingNotAuthorized:true/);
});
