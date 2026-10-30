/**
 * UGP-4.7 offline Git tree-path membership check.
 * Inspects bounded caller-supplied raw tree bytes, never contacts GitHub.
 * Git OIDs establish byte consistency, not provider provenance or authority.
 */
import { createHash } from "node:crypto";
import { attestUGP47OfflineCommitObject } from "./ugp-4-7-offline-commit-object.js";
import { reviewUGP47OfflinePatchBytes } from "./ugp-4-7-offline-patch-bytes.js";

const MAX_JSON=262144, MAX_TREE_BYTES=65536;
const oid=/^[0-9a-f]{40}$/;
type Obj=Record<string,unknown>;
const exact=(x:unknown,k:readonly string[]):x is Obj=>
  x!==null && typeof x==="object" && !Array.isArray(x) &&
  Object.keys(x).length===k.length && k.every(key=>Object.hasOwn(x,key));
const deny=(reason:string)=>Object.freeze({
  status:"INCOMPLETE_OR_UNSAFE" as const,issues:Object.freeze([reason]),
  gitReadAuthorized:false as const,gitWriteAuthorized:false as const,
  mergeAuthorized:false as const,deploymentAuthorized:false as const,
  independentlyCertified:false as const
});
function parse(input:unknown):Obj{
  if(typeof input!=="string"||!input.length||input.length>MAX_JSON||
      Buffer.byteLength(input,"utf8")>MAX_JSON)throw Error("invalid_json_size");
  const x:unknown=JSON.parse(input);
  if(!exact(x,Object.keys(x!==null&&typeof x==="object"&&!Array.isArray(x)?x:{}))||
     JSON.stringify(x)!==input)throw Error("ambiguous_json");
  return x;
}
function bytes(encoded:unknown):Buffer{
  if(typeof encoded!=="string"||encoded.length>Math.ceil(MAX_TREE_BYTES/3)*4||
     encoded.length%4!==0||
     !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))
    throw Error("noncanonical_base64");
  const b=Buffer.from(encoded,"base64");
  if(b.length===0||b.length>MAX_TREE_BYTES||b.toString("base64")!==encoded)
    throw Error("invalid_tree_bytes");
  return b;
}
const treeOid=(b:Buffer)=>createHash("sha1")
  .update(Buffer.concat([Buffer.from("tree "+b.length+"\0"),b])).digest("hex");
type Entry={mode:string;name:string;oid:string};
function entries(b:Buffer):Entry[]{
  const out:Entry[]=[],names=new Set<string>();
  let p=0;
  while(p<b.length){
    const space=b.indexOf(0x20,p);
    const nul=space<0?-1:b.indexOf(0,space+1);
    if(space<0||nul<0||nul+21>b.length)throw Error("truncated_tree_entry");
    const mode=b.subarray(p,space).toString("ascii");
    const nameBytes=b.subarray(space+1,nul);
    const name=nameBytes.toString("utf8");
    if(!Buffer.from(name,"utf8").equals(nameBytes)||
       !/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(name)||
       name==="."||name===".."||name===".git"||
       (mode!=="40000"&&mode!=="100644")||names.has(name))
      throw Error("unsupported_or_duplicate_tree_entry");
    names.add(name);
    out.push({mode,name,oid:b.subarray(nul+1,nul+21).toString("hex")});
    if(out.length>1024)throw Error("too_many_entries");
    p=nul+21;
  }
  return out;
}
/**
 * treeJSON: {"repositoryId":positive ID,"path":"a/b.txt",
 * "trees":[{"oid":"40hex","contentBase64":"..."} ...]}.
 * Exactly one root-to-leaf tree per path segment; no skipped levels or extra trees.
 */
export function attestUGP47OfflineTreeMembership(
  chainJSON:unknown,blobJSON:unknown,patchJSON:unknown,
  commitJSON:unknown,treeJSON:unknown
){
  try{
    const commit=attestUGP47OfflineCommitObject(chainJSON,commitJSON);
    const patch=reviewUGP47OfflinePatchBytes(chainJSON,blobJSON,patchJSON);
    if(commit.status!=="STRUCTURALLY_CONSISTENT_UNVERIFIED"||
       patch.status!=="STRUCTURALLY_CONSISTENT_UNVERIFIED")
      return deny("invalid_commit_or_patch_preimage");
    const chain=parse(chainJSON),proof=parse(treeJSON);
    if(!exact(proof,["repositoryId","path","trees"])||
       !exact(chain.commit,["repositoryId","branch","sha","parentSha","treeSha",
         "path","beforeBlobSha","afterBlobSha","afterDigest"])||
       !Array.isArray(proof.trees)||
       proof.repositoryId!==chain.commit.repositoryId||
       proof.path!==chain.commit.path||
       typeof proof.path!=="string")return deny("tree_proof_identity_mismatch");
    const parts=proof.path.split("/");
    if(parts.length<1||parts.length>10||proof.trees.length!==parts.length)
      return deny("unsupported_or_incomplete_tree_depth");
    let expected=commit.treeSha;
    for(let i=0;i<parts.length;i++){
      const node:unknown=proof.trees[i];
      if(!exact(node,["oid","contentBase64"])||
         typeof node.oid!=="string"||!oid.test(node.oid)||
         node.oid!==expected) return deny("tree_chain_oid_mismatch");
      const b=bytes(node.contentBase64);
      if(treeOid(b)!==node.oid) return deny("tree_preimage_digest_mismatch");
      const matches=entries(b).filter(entry=>entry.name===parts[i]);
      if(matches.length!==1)return deny("missing_tree_path_entry");
      const entry=matches[0]!;
      const last=i===parts.length-1;
      if(entry.mode!==(last?"100644":"40000"))
        return deny("tree_path_type_mismatch");
      expected=entry.oid;
    }
    if(expected!==patch.proposedAfterBlobSha||
       expected!==chain.commit.afterBlobSha)return deny("final_blob_membership_mismatch");
    return Object.freeze({
      status:"STRUCTURALLY_CONSISTENT_UNVERIFIED" as const,
      issues:Object.freeze([] as string[]),commitSha:commit.commitSha,
      treeSha:commit.treeSha,path:proof.path as string,
      afterBlobSha:expected,treeDepth:parts.length,
      gitReadAuthorized:false as const,gitWriteAuthorized:false as const,
      mergeAuthorized:false as const,deploymentAuthorized:false as const,
      independentlyCertified:false as const
    });
  }catch{return deny("uninspectable_tree_membership_evidence");}
}
