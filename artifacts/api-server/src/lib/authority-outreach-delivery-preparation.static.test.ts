import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here=dirname(fileURLToPath(import.meta.url));
const source=readFileSync(
  join(here,"authority-outreach-delivery-preparation.ts"),
  "utf8",
);

test("UGP-10.10 contains no provider/network/database execution primitive",()=>{
  assert.doesNotMatch(source,/OpenAI|Anthropic|Gemini|chat\.completions|responses\.create/i);
  assert.doesNotMatch(source,/fetch\s*\(|axios|undici|got\s*\(/i);
  assert.doesNotMatch(source,/DATABASE_URL|postgres\s*\(|drizzle|sql\s*\x60/i);
  assert.doesNotMatch(source,/process\.env|setTimeout|setInterval|cron|node-cron/i);
  assert.doesNotMatch(source,/worker_threads|child_process|spawn\s*\(|fork\s*\(/i);
});

test("UGP-10.10 cannot bind a recipient, address, mailbox, provider, send job, or transmission",()=>{
  assert.match(source,/deliveryPreparationSpecificationOnly:true/);
  assert.match(source,/actualRecipientIncluded:false/);
  assert.match(source,/recipientSelectionAuthorized:false/);
  assert.match(source,/contactDiscoveryAuthorized:false/);
  assert.match(source,/contactAddressIncluded:false/);
  assert.match(source,/emailVerificationAuthorized:false/);
  assert.match(source,/mailboxAccessAuthorized:false/);
  assert.match(source,/providerBindingAuthorized:false/);
  assert.match(source,/sendJobConstructionAuthorized:false/);
  assert.match(source,/sendAuthorizationGranted:false/);
  assert.match(source,/outreachSendingAuthorized:false/);
  assert.match(source,/followUpSchedulingAuthorized:false/);
  assert.doesNotMatch(source,/recipientEmail|recipientName|emailAddress|mailboxId|providerId/);
});
