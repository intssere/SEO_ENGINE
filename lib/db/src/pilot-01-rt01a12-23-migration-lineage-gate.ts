/** RT01-A12.23 source-only canonical migration and evidence ledger gate.
 * Does not query operational DBs or execute SQL. A verified source inventory
 * is NOT proof of installed history. */
import {createHash} from "node:crypto";
export type SourceMigration=Readonly<{name:string;sql:string}>;
export type LedgerReceipt=Readonly<{name:string;sha256:string;namespace:"canonical-main"|"legacy-ugp"|"integrated-ugp";witness:string}>;
export type Gate=Readonly<{status:"pass"|"blocked";issues:readonly string[];
  inventory:readonly Readonly<{name:string;sha256:string}>[]}>;
const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
const id=(n:string)=>/^\d{4}_[a-z0-9][a-z0-9_-]*\.sql$/.test(n)?Number(n.slice(0,4)):null;
/** Source shape and duplicate ID gate; never promotes historical claims. */
export function sourceGate(canonical:readonly SourceMigration[],candidates:readonly SourceMigration[]):Gate{
  const issues:string[]=[],seen=new Set<number>(),names=new Set<string>();
  const inventory=canonical.map(x=>({name:x.name,sha256:hash(x.sql)}));
  for(const x of canonical){
    const n=id(x.name);
    if(n===null)issues.push("INVALID_MIGRATION_NAME:"+x.name);
    else {
      if(seen.has(n))issues.push("DUPLICATE_MIGRATION_ID:"+n);
      seen.add(n);
    }
    if(names.has(x.name))issues.push("DUPLICATE_FILENAME:"+x.name);
    names.add(x.name);
    if(!/^\s*BEGIN\s*;/i.test(x.sql)||!/COMMIT\s*;\s*$/i.test(x.sql))
      issues.push("NON_TRANSACTIONAL_CANONICAL:"+x.name);
  }
  for(let n=1;n<=11;n++)if(!seen.has(n))issues.push("MISSING_CANONICAL:"+n);
  for(const x of candidates){
    if(id(x.name)!==null||!x.name.startsWith("rt01-a12-"))
      issues.push("CANDIDATE_ENTERED_MIGRATION_NAMESPACE:"+x.name);
    if(/\b(?:DROP\s+(?:TABLE|SCHEMA|COLUMN|DATABASE)|TRUNCATE\s+TABLE)\b/i.test(x.sql))
      issues.push("DESTRUCTIVE_CANDIDATE:"+x.name);
  }
  return {status:issues.length?"blocked":"pass",issues,inventory};
}
/** Never equate an incoming 0008-0011 UGP receipt with main's same-number SQL.
 * Require separately witnessed, exact name, namespace, checksum and no conflicts.
 * No production receipt is obtained or synthesized by this module. */
export function reconcileEvidence(source:Gate,received:readonly LedgerReceipt[]):Gate{
  const issues=[...source.issues],byName=new Map(source.inventory.map(x=>[x.name,x.sha256]));
  const seen=new Set<string>();
  for(const r of received){
    const k=r.namespace+":"+r.name;
    if(seen.has(k))issues.push("DUPLICATE_LEDGER_RECEIPT:"+k);
    seen.add(k);
    if(r.namespace!=="canonical-main")issues.push("FOREIGN_LINEAGE_REQUIRES_INDEPENDENT_MAPPING:"+k);
    if(!/^[a-f0-9]{64}$/.test(r.sha256)||r.sha256!==byName.get(r.name))
      issues.push("CHECKSUM_OR_NAME_MISMATCH:"+k);
    if(!r.witness||r.witness.trim().length<8)issues.push("MISSING_INDEPENDENT_WITNESS:"+k);
  }
  for(const s of source.inventory){
    if(!received.some(r=>r.namespace==="canonical-main"&&r.name===s.name&&r.sha256===s.sha256))
      issues.push("MISSING_INSTALLED_RECEIPT:"+s.name);
  }
  return {status:issues.length?"blocked":"pass",issues,inventory:source.inventory};
}
/** Source-only verdict must never imply real Production proof. */
export const operationalCompatibility="BLOCKED_UNVERIFIED_INSTALLED_HISTORY" as const;
