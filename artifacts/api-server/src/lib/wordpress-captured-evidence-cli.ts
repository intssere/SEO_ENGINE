import {readFile,stat} from "node:fs/promises";
import {attestCapturedWordPressEvidence} from "./wordpress-captured-evidence-attestation.js";
async function load(path:string){const raw=await readFile(path,"utf8");return {payload:JSON.parse(raw),bytes:(await stat(path)).size};}
const [pagesPath,postsPath]=process.argv.slice(2);
if(!pagesPath||!postsPath)throw new Error("usage: tsx wordpress-captured-evidence-cli.ts <pages.json> <posts.json>");
const [pages,posts]=await Promise.all([load(pagesPath),load(postsPath)]);
const result=attestCapturedWordPressEvidence({observations:[
 {route:"/wp-json/wp/v2/pages",effectiveUrl:"https://kalkeenwellness.com/wp-json/wp/v2/pages",status:200,contentType:"application/json; charset=UTF-8",responseBytes:pages.bytes,payload:pages.payload},
 {route:"/wp-json/wp/v2/posts",effectiveUrl:"https://kalkeenwellness.com/wp-json/wp/v2/posts",status:200,contentType:"application/json; charset=UTF-8",responseBytes:posts.bytes,payload:posts.payload}
]});
console.log(JSON.stringify({...result,receipts:result.receipts.map(x=>({route:x.route,responseBytes:x.responseBytes,version:x.receipt.version,requestFingerprint:x.receipt.requestFingerprint,effectiveUrl:x.receipt.effectiveUrl,status:x.receipt.status,payloadBytes:x.receipt.payloadBytes,stateFingerprint:x.receipt.stateFingerprint,receiptFingerprint:x.receipt.receiptFingerprint}))},null,2));
