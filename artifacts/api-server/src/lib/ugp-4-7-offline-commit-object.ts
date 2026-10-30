/**
 * UGP-4.7 provider-free Git commit-object byte proof.
 * Matches a self-reported commit claim to an actual supplied Git object preimage.
 * Does not prove repository membership, the referenced tree's contents or provider authenticity.
 */
import { createHash } from "node:crypto";
import { reviewUGP47GitEvidence } from "./ugp-4-7-offline-git-evidence.js";

const MAX_INPUT = 131072, MAX_COMMIT = 65536;
const oid = /^[0-9a-f]{40}$/;
type Obj = Record<string,unknown>;
const exact=(x:unknown,keys:readonly string[]):x is Obj =>
  x!==null && typeof x==="object" && !Array.isArray(x) &&
  Object.keys(x).length===keys.length && keys.every(k=>Object.hasOwn(x,k));
const deny=(reason:string)=>Object.freeze({
  status:"INCOMPLETE_OR_UNSAFE" as const,issues:Object.freeze([reason]),
  gitReadAuthorized:false as const,gitWriteAuthorized:false as const,
  mergeAuthorized:false as const,deploymentAuthorized:false as const,
  independentlyCertified:false as const
});
function parse(x:unknown):Obj{
  if(typeof x!=="string" || x.length===0 || x.length>MAX_INPUT ||
      Buffer.byteLength(x,"utf8")>MAX_INPUT) throw Error("invalid_input_size");
  const v:unknown=JSON.parse(x);
  if(!exact(v,Object.keys(v!==null&&typeof v==="object"&&!Array.isArray(v)?v:{})) ||
     JSON.stringify(v)!==x) throw Error("ambiguous_json");
  return v;
}
function decode(x:unknown):Buffer{
  if(typeof x!=="string" || x.length>Math.ceil(MAX_COMMIT/3)*4 ||
     x.length%4!==0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(x))
    throw Error("invalid_base64");
  const bytes=Buffer.from(x,"base64");
  if(bytes.length===0 || bytes.length>MAX_COMMIT || bytes.toString("base64")!==x)
    throw Error("noncanonical_or_oversized_commit");
  return bytes;
}
const gitOid=(bytes:Buffer)=>createHash("sha1")
  .update(Buffer.concat([Buffer.from("commit "+bytes.length+"\0"),bytes]))
  .digest("hex");

/** Supports regular one-parent UTF-8 fixture commits only; excludes multiline headers and signed commits. */
export function attestUGP47OfflineCommitObject(chainJSON:unknown,objectJSON:unknown){
  try{
    const chainStatus=reviewUGP47GitEvidence(chainJSON);
    if(chainStatus.status!=="STRUCTURALLY_CONSISTENT_UNVERIFIED")
      return deny("invalid_git_chain");
    const chain=parse(chainJSON),receipt=parse(objectJSON);
    if(!exact(receipt,["repositoryId","commitSha","rawCommitBase64"]) ||
       !Number.isSafeInteger(receipt.repositoryId) || (receipt.repositoryId as number)<=0 ||
       typeof receipt.commitSha!=="string" || !oid.test(receipt.commitSha) ||
       !exact(chain.commit,["repositoryId","branch","sha","parentSha","treeSha","path",
         "beforeBlobSha","afterBlobSha","afterDigest"]))
      return deny("invalid_commit_receipt_fields");
    const commit=chain.commit;
    if(receipt.repositoryId!==commit.repositoryId || receipt.commitSha!==commit.sha)
      return deny("commit_identity_mismatch");
    const bytes=decode(receipt.rawCommitBase64);
    if(bytes.includes(0) || !bytes.toString("utf8").length ||
       !Buffer.from(bytes.toString("utf8"),"utf8").equals(bytes))
      return deny("unsupported_commit_encoding");
    const text=bytes.toString("utf8");
    const divider=text.indexOf("\n\n");
    if(divider<0) return deny("invalid_commit_header");
    const header=text.slice(0,divider).split("\n");
    if(header.length!==4 ||
       !header[0]?.startsWith("tree ") || !header[1]?.startsWith("parent ") ||
       !header[2]?.startsWith("author ") || !header[3]?.startsWith("committer ") ||
       !/^tree [0-9a-f]{40}$/.test(header[0]) ||
       !/^parent [0-9a-f]{40}$/.test(header[1]) ||
       !/^author [^\r\n]{1,512}$/.test(header[2]) ||
       !/^committer [^\r\n]{1,512}$/.test(header[3]))
      return deny("unsupported_or_ambiguous_commit_headers");
    if(header[0].slice(5)!==commit.treeSha ||
       header[1].slice(7)!==commit.parentSha ||
       gitOid(bytes)!==commit.sha)
      return deny("commit_preimage_tree_or_parent_mismatch");
    return Object.freeze({
      status:"STRUCTURALLY_CONSISTENT_UNVERIFIED" as const,
      issues:Object.freeze([] as string[]),commitSha:commit.sha as string,
      treeSha:commit.treeSha as string,parentSha:commit.parentSha as string,
      commitBytes:bytes.length,
      gitReadAuthorized:false as const,gitWriteAuthorized:false as const,
      mergeAuthorized:false as const,deploymentAuthorized:false as const,
      independentlyCertified:false as const
    });
  }catch{
    return deny("uninspectable_commit_object_evidence");
  }
}
