import {createHash, timingSafeEqual} from "node:crypto";
import {readFileSync} from "node:fs";
import {describeHistoricalLineage} from "./int-02b-historical-lineage-policy.mjs";
const manifest=JSON.parse(readFileSync(new URL("./int-02a-ugp-migration-source-map.json",import.meta.url)));
const hash=x=>createHash("sha256").update(x).digest("hex");
const deny=reason=>({verified:false,reason});
/**
 * Verify a historical receipt envelope against a separately supplied pinned
 * trust anchor. The trust anchor must be created outside of this module from
 * independently witnessed installation evidence, not copied from the envelope.
 * Cryptographic consistency alone does not establish an executed migration.
 * This is read-only evidence validation; there is no installer or DB connection.
 */
export function verifyReceiptEnvelope({envelope,anchor}={}){
 if(!envelope||!anchor||typeof envelope!=="object"||typeof anchor!=="object")return deny("receipt_or_anchor_missing");
 if(envelope.schema!=="int02b-receipt-envelope-v1"||envelope.executionEnvironment!=="disposable_test")return deny("unsupported_receipt_environment");
 if(typeof anchor.expectedDigest!=="string"||!/^[0-9a-f]{64}$/.test(anchor.expectedDigest)||anchor.authority!=="independent_disposable_test_witness")return deny("independent_anchor_missing");
 if(!Array.isArray(envelope.receipts)||!envelope.receipts.length)return deny("receipt_history_missing");
 const history=describeHistoricalLineage(envelope.receipts);
 if(history.classification==="inconsistent"||history.classification==="unknown"||history.classification==="partial")return deny("receipt_history_"+history.classification);
 const input={schema:envelope.schema,executionEnvironment:envelope.executionEnvironment,receipts:envelope.receipts};
 const computed=hash(JSON.stringify(input));
 if(!timingSafeEqual(Buffer.from(computed,"hex"),Buffer.from(anchor.expectedDigest,"hex")))return deny("receipt_witness_mismatch");
 // MAIN 0001-0011 receipts remain independently unverified, even if UGP SQL hashes match.
 return {verified:false,reason:"main_installation_provenance_unverified",diagnostic:history.classification};
}
export function expectedPinnedUgpReceipts(){
 return manifest.entries.map(e=>({filename:e.candidate,sha256:e.rawSha256}));
}
