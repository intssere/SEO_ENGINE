import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here=dirname(fileURLToPath(import.meta.url));
const source=readFileSync(
  join(here,"authority-outreach-contact-verification-specification.ts"),
  "utf8",
);

test("UGP-10.15 contains no model/provider/network/database execution primitive",()=>{
  assert.doesNotMatch(source,/OpenAI|Anthropic|Gemini|chat\.completions|responses\.create/i);
  assert.doesNotMatch(source,/fetch\s*\(|axios|undici|got\s*\(/i);
  assert.doesNotMatch(source,/DATABASE_URL|postgres\s*\(|drizzle|sql\s*\x60/i);
  assert.doesNotMatch(source,/process\.env|setTimeout|setInterval|cron|node-cron/i);
  assert.doesNotMatch(source,/worker_threads|child_process|spawn\s*\(|fork\s*\(/i);
});

test("UGP-10.15 is specification-only and cannot collect or verify contact data",()=>{
  assert.match(source,/contactVerificationSpecificationOnly:true/);
  assert.match(source,/actualContactPointIncluded:false/);
  assert.match(source,/contactDiscoveryAuthorized:false/);
  assert.match(source,/contactDiscoveryPerformed:false/);
  assert.match(source,/contactAddressIncluded:false/);
  assert.match(source,/contactAddressCollectionAuthorized:false/);
  assert.match(source,/contactAddressVerificationAuthorized:false/);
  assert.match(source,/contactAddressVerificationPerformed:false/);
  assert.match(source,/emailVerificationAuthorized:false/);
  assert.match(source,/verificationProviderCallAuthorized:false/);
  assert.match(source,/mailboxProbeAuthorized:false/);
  assert.match(source,/mailboxAccessAuthorized:false/);
  assert.match(source,/providerBindingAuthorized:false/);
  assert.match(source,/sendJobConstructionAuthorized:false/);
  assert.match(source,/sendAuthorizationGranted:false/);
  assert.match(source,/outreachSendingAuthorized:false/);
  assert.match(source,/followUpSchedulingAuthorized:false/);
  assert.doesNotMatch(
    source,
    /recipientEmail|emailAddressValue|phoneNumber|socialHandle|contactRecord|mailboxId|providerId/,
  );
});
