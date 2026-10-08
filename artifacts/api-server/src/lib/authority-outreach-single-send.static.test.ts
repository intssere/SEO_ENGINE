import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname,join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here=dirname(fileURLToPath(import.meta.url));
const files=[
  "authority-outreach-single-send-intent.ts",
  "authority-outreach-single-send-adapter.ts",
  "authority-outreach-single-send-executor.ts",
  "authority-outreach-single-send-store.ts",
  "authority-outreach-single-send-runtime.ts",
].map(name=>readFileSync(join(here,name),"utf8"));
const source=files.join("\n");

test("UGP-10.32 source contains no live provider/network/mail primitive",()=>{
  assert.doesNotMatch(source,/nodemailer|sendgrid|mailgun|postmark|resend|smtp|resolveMx|dns\.resolve/i);
  assert.doesNotMatch(source,/fetch\s*\(|axios|undici|got\s*\(/i);
  assert.doesNotMatch(source,/apiKey\s*:|accessToken\s*:|refreshToken\s*:|mailboxPassword\s*:|providerSecret\s*:/);
});

test("UGP-10.32 explicitly freezes mock-only, one-attempt, no-retry behavior",()=>{
  assert.match(source,/mockAdapterOnly:true/);
  assert.match(source,/realProviderExecutionAuthorized:false/);
  assert.match(source,/networkOperationAuthorized:false/);
  assert.match(source,/automaticRetryAuthorized:false/);
  assert.match(source,/attempt_count/);
  assert.match(source,/automaticRetryPerformed:false/);
  assert.match(source,/realProviderExecutionPerformed:false/);
  assert.match(source,/messageTransmissionPerformed:false/);
});

test("UGP-10.32 durable store persists fingerprints, not raw destination or message fields",()=>{
  const store=files[3];
  assert.match(store,/payload_fingerprint/);
  assert.match(store,/selected_contact_point_fingerprint/);
  assert.match(store,/candidate_fingerprint/);
  assert.doesNotMatch(store,/contact_point_value|message_body|email_body|subject_text|body_text/i);
});
