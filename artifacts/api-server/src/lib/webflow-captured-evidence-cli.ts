import { readFileSync } from "node:fs";
import { attestCapturedWebflowEvidence, UGP_WEBFLOW_API_ORIGIN, UGP_WEBFLOW_LIVE_SITE_ID } from "./webflow-captured-evidence-attestation.js";

export const UGP_WEBFLOW_OFFLINE_HARNESS_VERSION = "ugp-4-6l-r2-offline-execution-harness-v1" as const;

export function attestCapturedWebflowJson(input:{pagesJson:string;collectionsJson:string}){
 const pages=JSON.parse(input.pagesJson) as unknown;
 const collections=JSON.parse(input.collectionsJson) as unknown;
 return attestCapturedWebflowEvidence({observations:[
  {resource:"pages",effectiveUrl:`${UGP_WEBFLOW_API_ORIGIN}/v2/sites/${UGP_WEBFLOW_LIVE_SITE_ID}/pages`,status:200,contentType:"application/json; charset=utf-8",responseBytes:576,payload:pages},
  {resource:"collections",effectiveUrl:`${UGP_WEBFLOW_API_ORIGIN}/v2/sites/${UGP_WEBFLOW_LIVE_SITE_ID}/collections`,status:200,contentType:"application/json; charset=utf-8",responseBytes:214,payload:collections}
 ]});
}

export function runOfflineWebflowHarness(args:readonly string[],readFile:(path:string)=>string=path=>readFileSync(path,"utf8")):string{
 if(args.length!==2)throw new Error("ugp_webflow_offline_exact_two_capture_paths_required");
 const [pagesPath,collectionsPath]=args;
 if(!pagesPath||!collectionsPath)throw new Error("ugp_webflow_offline_capture_path_required");
 const attestation=attestCapturedWebflowJson({pagesJson:readFile(pagesPath),collectionsJson:readFile(collectionsPath)});
 return JSON.stringify({harnessVersion:UGP_WEBFLOW_OFFLINE_HARNESS_VERSION,...attestation},null,2);
}

if(import.meta.url===`file://${process.argv[1]}`){
 try{process.stdout.write(runOfflineWebflowHarness(process.argv.slice(2))+"\n");}
 catch(error){process.stderr.write(`UGP_WEBFLOW_OFFLINE_ATTESTATION_FAILED: ${error instanceof Error?error.message:"unknown_error"}\n`);process.exitCode=1;}
}
