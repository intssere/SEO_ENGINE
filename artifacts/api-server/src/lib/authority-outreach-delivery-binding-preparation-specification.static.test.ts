import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here=dirname(fileURLToPath(import.meta.url));
const source=readFileSync(
  join(here,"authority-outreach-delivery-binding-preparation-specification.ts"),
  "utf8",
);

test("UGP-10.23 contains no model/provider/network/database execution primitive",()=>{
  assert.doesNotMatch(source,/OpenAI|Anthropic|Gemini|chat\.completions|responses\.create/i);
  assert.doesNotMatch(source,/fetch\s*\(|axios|undici|got\s*\(/i);
  assert.doesNotMatch(source,/DATABASE_URL|postgres\s*\(|drizzle|sql\s*\x60/i);
  assert.doesNotMatch(source,/process\.env|setTimeout|setInterval|cron|node-cron/i);
  assert.doesNotMatch(source,/worker_threads|child_process|spawn\s*\(|fork\s*\(/i);
  assert.doesNotMatch(source,/dns\.resolve|resolveMx|smtp|nodemailer|sendgrid|mailgun|postmark|resend/i);
});

test("UGP-10.23 is specification-only and cannot bind, activate credentials, or send",()=>{
  assert.match(source,/deliveryBindingPreparationSpecificationOnly:true/);
  assert.match(source,/providerMailboxBindingPreparationExecuted:false/);
  assert.match(source,/providerBindingAuthorized:false/);
  assert.match(source,/providerBindingPerformed:false/);
  assert.match(source,/mailboxBindingAuthorized:false/);
  assert.match(source,/mailboxBindingPerformed:false/);
  assert.match(source,/mailboxAccessAuthorized:false/);
  assert.match(source,/mailboxProbeAuthorized:false/);
  assert.match(source,/mailboxProbePerformed:false/);
  assert.match(source,/providerCredentialIncluded:false/);
  assert.match(source,/providerCredentialReferenceIncluded:false/);
  assert.match(source,/providerCredentialActivationAuthorized:false/);
  assert.match(source,/liveProviderIdentifierIncluded:false/);
  assert.match(source,/sendJobConstructionAuthorized:false/);
  assert.match(source,/sendAuthorizationGranted:false/);
  assert.match(source,/outreachSendingAuthorized:false/);
  assert.match(source,/outreachSendingPerformed:false/);
  assert.match(source,/followUpSchedulingAuthorized:false/);
  assert.match(source,/performsProviderCall:false/);
  assert.match(source,/performsNetworkOperation:false/);
  assert.match(source,/performsPersistence:false/);
  assert.match(source,/schedulerEnabled:false/);
  assert.match(source,/workerEnabled:false/);
  assert.match(source,/providerWrites:false/);
  assert.match(source,/publicSiteWrites:false/);
});

test("UGP-10.23 carries requirement classes only and no provider or credential value slots",()=>{
  assert.match(source,/future_provider_credential_reference_required/);
  assert.match(source,/providerCredentialReferenceValueAllowed:false/);
  assert.match(source,/providerCredentialValueAllowed:false/);
  assert.match(source,/liveProviderIdentifierAllowed:false/);
  assert.match(source,/senderMailboxIdentifierAllowed:false/);
  assert.doesNotMatch(source,/apiKey\s*:/);
  assert.doesNotMatch(source,/accessToken\s*:/);
  assert.doesNotMatch(source,/refreshToken\s*:/);
  assert.doesNotMatch(source,/mailboxPassword\s*:/);
  assert.doesNotMatch(source,/providerSecret\s*:/);
  assert.doesNotMatch(source,/providerId\s*:/);
});
