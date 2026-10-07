import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname,join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here=dirname(fileURLToPath(import.meta.url));
const intent=readFileSync(
  join(here,"authority-outreach-outbound-safety-intent.ts"),
  "utf8",
);
const store=readFileSync(
  join(here,"authority-outreach-outbound-safety-store.ts"),
  "utf8",
);

test("UGP-10.31 contains no provider/mail/network execution primitive",()=>{
  const source=intent+"\n"+store;
  assert.doesNotMatch(source,/nodemailer|sendgrid|mailgun|postmark|resend|smtp|resolveMx|dns\.resolve/i);
  assert.doesNotMatch(source,/fetch\s*\(|axios|undici|got\s*\(/i);
  assert.doesNotMatch(source,/accessToken\s*:|refreshToken\s*:|apiKey\s*:|mailboxPassword\s*:|providerSecret\s*:/);
  assert.doesNotMatch(source,/contactValue\s*:|emailAddress\s*:|messageBody\s*:|emailBody\s*:/);
});

test("UGP-10.31 freezes bounded rate and reservation policy with send authority false",()=>{
  assert.match(intent,/contactMaximumReservations: 1/);
  assert.match(intent,/contactWindowSeconds: 604800/);
  assert.match(intent,/domainMaximumReservations: 5/);
  assert.match(intent,/domainWindowSeconds: 86400/);
  assert.match(intent,/reservationTtlSeconds: 900/);
  assert.match(intent,/sendAuthorizationGranted: false/);
  assert.match(intent,/outreachSendingAuthorized: false/);
  assert.match(intent,/performsNetworkOperation: false/);
  assert.match(store,/providerNetworkCallPerformed: false/);
  assert.match(store,/messageTransmissionPerformed: false/);
  assert.match(store,/sendAuthorizationGranted: false/);
  assert.match(store,/productionDdlAuthorized: false/);
});

test("UGP-10.31 store is limited to the three dedicated durable safety tables",()=>{
  assert.match(store,/authority_outreach_suppressions/);
  assert.match(store,/authority_outreach_send_reservations/);
  assert.match(store,/authority_outreach_send_safety_events/);
  assert.doesNotMatch(store,/INSERT INTO approvals|INSERT INTO actions|UPDATE approvals|UPDATE actions/);
});
